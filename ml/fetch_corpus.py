"""Step 0 -- build the raw text corpus that label_data.py will annotate.

Pulls real self-disclosure posts from public HuggingFace datasets over the
datasets-server HTTP API. Deliberately uses only the Python standard library so
this runs before you install torch -- you can build and inspect the corpus
without committing 2.5 GB of disk to the training environment.

Why two sources
---------------
The single most common way a classifier like this fails is learning "sounds
distressed" instead of "doubts their own competence". A corpus of only
imposter-flavoured posts produces a model that fires on any negative affect.

So the mix is deliberate:

  r/careerguidance      career doubt, feeling unqualified, comparing yourself to
                        colleagues -- this is where the POSITIVES live
  mental-health subs    r/ADHD, r/depression, r/OCD, r/ptsd, r/aspergers --
                        genuine distress that is NOT imposter syndrome, written
                        in the same first-person reddit prose

Because both halves read alike, the model cannot separate them on style and is
forced to learn the actual content. Sampling only the first source would give
you a great-looking validation score and a model that flags every bad day.

`--include-emotion` adds short tweet-style statements. Off by default for the
opposite reason: they are so stylistically distinct (lowercase, clipped, no
punctuation) that a model can sort them without reading the meaning at all.

Usage:
    python ml/fetch_corpus.py --limit 3000
    python ml/fetch_corpus.py --limit 4000 --career-fraction 0.7
"""

import argparse
import json
import random
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

from config import RAW_DIR, SEED

# ---------------------------------------------------------------------------
# Enrichment markers
#
# Uniform sampling of r/careerguidance yields roughly a 3% imposter-syndrome
# rate. Across five labels that is ~20 positives each -- far below the ~200 you
# need before per-label F1 means anything, so labeling a uniform sample would
# burn the teacher budget almost entirely on negatives.
#
# These regexes are a cheap, high-recall first pass used only to decide WHICH
# texts are worth paying the teacher to annotate. They never become labels:
# Gemini still reads every selected text, and it catches the implicit cases
# ("everyone on the panel clearly knew more than me") that no keyword matches.
#
# READ THIS BEFORE TRUSTING THE THRESHOLDS: an enriched corpus is not a random
# sample. Probabilities calibrated on it are calibrated to the enriched
# prevalence, not to the real-world base rate. See ml/README.md.
# ---------------------------------------------------------------------------
# Precision matters more than recall here. A loose pattern like `\bfigure out\b`
# matches "figure out which master's program", and every one of those is teacher
# budget spent to confirm a negative. Self-referential context is what separates
# "they'll find out I'm not good enough" from "I need to find out the deadline".
MARKERS = [
    r"\b(imposter|impostor)\b",
    r"\b(a|like a|feel like a) fraud\b",
    r"\b(not|un)\s?qualified\b",
    r"\bfak(e|ing) it\b",
    # exposure -- must be about the writer
    r"\b(find|found|finds|figure|figured|figures) out (that )?(i'?m|i am|im|i don'?t|i can'?t)\b",
    r"\bthey'?(ll| will) (realize|find out|discover|see)\b",
    r"\b(get|be|been) exposed\b",
    # discounting / not deserving
    r"\bdon'?t (deserve|belong)\b",
    r"\bdidn'?t deserve\b",
    r"\bundeserv",
    r"\bnot good enough\b",
    # attribution to luck
    r"\b(got|was|were|were just|got just) lucky\b",
    r"\bjust luck\b",
    r"\blucked out\b",
    r"\bfluke\b",
    r"\bright place at the right time\b",
    # comparison
    r"\b(everyone|everybody) else (is|seems|knows|has|already)\b",
    r"\bfalling behind\b",
    r"\bbehind (my|all my|most of my) (peers|colleagues|classmates|coworkers)\b",
    r"\bcompared to my (peers|colleagues|classmates|coworkers)\b",
    # being out of depth
    r"\bin over my head\b",
    r"\bout of my depth\b",
    # self-doubt, stated
    r"\bself[- ]doubt\b",
    r"\bdoubt my (abilities|skills|competence|self|judgement|judgment)\b",
    # overworking, but only when it is purposive rather than incidental
    r"\bover-?prepar",
    r"\bwork(ing)? (late|weekends|nights|twice as hard) (to|so|because|in order)\b",
]

MARKER_RE = re.compile("|".join(MARKERS), re.IGNORECASE)

SERVER = "https://datasets-server.huggingface.co"
PAGE = 100                    # datasets-server caps a single request at 100 rows

MIN_CHARS = 40                # below this there is no signal to label
MAX_CHARS = 4000              # above this the teacher's context is wasted

# Reddit deletion tombstones and other non-content bodies.
JUNK_BODIES = {"[removed]", "[deleted]", "", ".", "n/a"}

CAREER = {
    "name": "career",
    "dataset": "mb7419/career-guidance-reddit",
    "config": "default",
    "split": "train",
    "title": "title",
    "body": "body",
}

CLINICAL = {
    "name": "clinical",
    "dataset": "solomonk/reddit_mental_health_posts",
    "config": "default",
    "split": "train",
    "title": "title",
    "body": "body",
}

EMOTION = {
    "name": "emotion",
    "dataset": "dair-ai/emotion",
    "config": "split",
    "split": "train",
    "title": None,
    "body": "text",
}


def request_json(path, **params):
    url = f"{SERVER}/{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "trulyher-corpus/1.0"})
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)


def split_size(source):
    """Ask the server how many rows the split has, so random offsets stay in range."""
    try:
        payload = request_json("size", dataset=source["dataset"])
        for entry in payload.get("size", {}).get("splits", []):
            if entry.get("config") == source["config"] and entry.get("split") == source["split"]:
                return int(entry["num_rows"])
        return int(payload["size"]["dataset"]["num_rows"])
    except Exception as error:  # noqa: BLE001
        print(f"  could not read size for {source['dataset']} ({error}); assuming 10000")
        return 10_000


def fetch_page(source, offset, retries=4):
    for attempt in range(retries):
        try:
            return request_json(
                "rows",
                dataset=source["dataset"],
                config=source["config"],
                split=source["split"],
                offset=offset,
                length=PAGE,
            ).get("rows", [])
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as error:
            # The datasets-server rate-limits and occasionally cold-starts;
            # backing off is normal, not a reason to fail the run.
            wait = 2 ** attempt
            print(f"    retry {attempt + 1}/{retries} in {wait}s ({error})", file=sys.stderr)
            time.sleep(wait)
    return []


def clean(text):
    return " ".join((text or "").split())


def extract_text(record, source):
    body = clean(record.get(source["body"]))
    if body.lower() in JUNK_BODIES:
        body = ""
    title = clean(record.get(source["title"])) if source["title"] else ""
    text = f"{title}. {body}".strip(". ").strip() if title else body
    return text if MIN_CHARS <= len(text) <= MAX_CHARS else None


def scan_all(source, rng, seen, rescan=False):
    """Page through an entire split and cache every usable text.

    Only worth doing on a small split. r/careerguidance is ~13.5k rows, which is
    136 requests -- cheap enough to read exhaustively, and exhaustive is what
    makes enrichment possible.

    The cache holds the raw texts, NOT the hot/cold split, so the marker
    patterns can be tuned and the corpus rebuilt without re-hitting the API
    (which rate-limits aggressively).
    """
    cache = RAW_DIR / f"{source['name']}_scan.jsonl"

    if cache.exists() and not rescan:
        with cache.open() as handle:
            texts = [json.loads(line)["text"] for line in handle if line.strip()]
        print(f"  {source['dataset']}: {len(texts)} texts from cache ({cache.name})")
    else:
        total = split_size(source)
        pages = (total + PAGE - 1) // PAGE
        print(f"  {source['dataset']}: scanning all {total} rows ({pages} requests)")

        texts = []
        for index, offset in enumerate(range(0, total, PAGE)):
            for row in fetch_page(source, offset):
                text = extract_text(row.get("row", {}), source)
                if text:
                    texts.append(text)
            if index % 10 == 0:
                print(f"    page {index + 1}/{pages}  kept={len(texts)}", end="\r", flush=True)

        with cache.open("w") as handle:
            for text in texts:
                handle.write(json.dumps({"text": text}) + "\n")
        print(f"    scanned {pages} pages, cached {len(texts)} texts to {cache.name}")

    hot, cold = [], []
    for text in texts:
        key = text.lower()[:200]
        if key in seen:
            continue
        seen.add(key)
        (hot if MARKER_RE.search(text) else cold).append(text)

    print(f"    {len(hot)} marker hits, {len(cold)} misses")
    rng.shuffle(hot)
    rng.shuffle(cold)
    return hot, cold


def harvest(source, target, rng, seen):
    """Sample from random offsets so the corpus is not one contiguous slice of
    whatever happened to be posted in a single week."""
    total = split_size(source)
    print(f"  {source['dataset']}: {total} rows available, want {target}")

    collected = []
    tags = {}
    max_offset = max(total - PAGE, 1)
    # Over-sample offsets: length filtering and dedup both drop rows.
    offsets = rng.sample(range(max_offset), k=min(max_offset, 500))

    for offset in offsets:
        if len(collected) >= target:
            break

        for row in fetch_page(source, offset):
            record = row.get("row", {})

            body = clean(record.get(source["body"]))
            if body.lower() in JUNK_BODIES:
                body = ""
            title = clean(record.get(source["title"])) if source["title"] else ""

            text = f"{title}. {body}".strip(". ").strip() if title else body
            if not (MIN_CHARS <= len(text) <= MAX_CHARS):
                continue

            key = text.lower()[:200]
            if key in seen:
                continue
            seen.add(key)

            collected.append(text)
            tag = record.get("subreddit") or source["name"]
            tags[tag] = tags.get(tag, 0) + 1

            if len(collected) >= target:
                break

        print(f"    {len(collected)}/{target}", end="\r", flush=True)

    print(f"    {len(collected)}/{target} collected")
    return collected, tags


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=3000)
    parser.add_argument("--rescan", action="store_true", help="ignore the cached scan and re-download")
    parser.add_argument(
        "--enrich-rate", type=float, default=0.30,
        help="target share of marker-hit texts (0 disables enrichment)"
    )
    parser.add_argument(
        "--clinical-fraction", type=float, default=0.30,
        help="share drawn from mental-health subs as same-register hard negatives"
    )
    parser.add_argument(
        "--include-emotion", type=int, default=0,
        help="add N short tweet-style statements as extra negatives (see docstring)"
    )
    args = parser.parse_args()

    rng = random.Random(SEED)
    seen = set()
    texts = []
    all_tags = {}

    print(f"Building a {args.limit}-text corpus")

    hot, cold = scan_all(CAREER, rng, seen, rescan=args.rescan)
    baseline_rate = len(hot) / max(len(hot) + len(cold), 1)

    hot_target = int(args.limit * args.enrich_rate)
    clinical_target = int(args.limit * args.clinical_fraction)

    chosen_hot = hot[:hot_target]
    remaining = args.limit - len(chosen_hot) - clinical_target
    chosen_cold = cold[:max(remaining, 0)]

    texts += chosen_hot + chosen_cold
    all_tags["careerguidance (marker hit)"] = len(chosen_hot)
    all_tags["careerguidance (random)"] = len(chosen_cold)

    if clinical_target > 0:
        collected, tags = harvest(CLINICAL, clinical_target, rng, seen)
        texts += collected
        for tag, count in tags.items():
            all_tags[tag] = all_tags.get(tag, 0) + count

    if args.include_emotion:
        collected, tags = harvest(EMOTION, args.include_emotion, rng, seen)
        texts += collected
        all_tags.update(tags)

    rng.shuffle(texts)

    output = RAW_DIR / "corpus.jsonl"
    with output.open("w") as handle:
        for text in texts:
            handle.write(json.dumps({"text": text}) + "\n")

    print(f"\nWrote {len(texts)} texts to {output}")

    print("\nComposition (the spread is what stops the model from learning")
    print("'sounds distressed' instead of 'doubts their own competence'):")
    for name, count in sorted(all_tags.items(), key=lambda kv: -kv[1]):
        print(f"  {name:<32} {count:>5}  ({count / max(len(texts), 1):.1%})")

    achieved = len(chosen_hot) / max(len(texts), 1)
    print(f"\nEnrichment: {baseline_rate:.1%} marker rate in the wild "
          f"-> {achieved:.1%} in this corpus ({achieved / max(baseline_rate, 1e-9):.1f}x)")
    print("\n  !! This corpus is NOT a random sample. Probabilities calibrated on it")
    print("     are calibrated to THIS prevalence, not to real journal entries.")
    print("     ml/README.md explains the prior correction before you trust the")
    print("     thresholds in production.")

    lengths = sorted(len(t) for t in texts)
    if lengths:
        print(f"\nLength: median {lengths[len(lengths) // 2]} chars, "
              f"min {lengths[0]}, max {lengths[-1]}")

    print("\nRead some of it before you spend money labeling it:")
    print(f"  head -3 {output} | python3 -m json.tool")
    print(f"\nThen: python ml/label_data.py --limit {args.limit}")


if __name__ == "__main__":
    main()
