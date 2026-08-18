"""Step 1 -- weak-label a raw text corpus with Gemini (knowledge distillation).

Gemini is the teacher. It is slow and rate-limited, which is exactly why we do
not want it in the request path for every journal entry; instead we spend the
quota once, offline, to produce training data for a 66M-parameter student that
runs in the user's browser for free.

Input:  ml/data/raw/corpus.jsonl   built by ml/fetch_corpus.py
Output: ml/data/raw/weak_labeled.jsonl

Free tier
---------
This is sized to run entirely inside Gemini's free tier: 25 texts per request
and a 10 req/min throttle, so a 3,000-text corpus is ~120 requests and ~12
minutes. No billing account needed.

If the daily quota does run out, the run stops cleanly and says so. Output is
appended, never truncated, and re-running the same command tomorrow resumes
from where it stopped rather than re-spending quota on annotated text.

  !! Free-tier requests may be used by Google to improve their products. That is
     fine here -- this corpus is public Reddit data. It is NOT fine for real
     user journal entries; see the privacy note in README.md before deploying
     with a free-tier key.

Usage:
    python ml/label_data.py --limit 3000
    python ml/label_data.py --limit 3000 --max-requests 200   # stay under a daily cap
"""

import argparse
import hashlib
import json
import os
import random
import time
import urllib.error
import urllib.request

from config import LABELS, LABEL_DESCRIPTIONS, PROJECT_ROOT, RAW_DIR, WEAK_PATH, SEED

# Standard library only -- no google-generativeai, no tqdm. The whole point of
# distillation here is to avoid a heavy runtime; making step 1 need a 200 MB SDK
# to make plain HTTPS POSTs would be self-defeating, and it means this runs on a
# machine with no room left for a virtualenv.
API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

# Free-tier quotas are PER MODEL, and the newest models have the tightest caps
# -- gemini-3.7-flash runs out after roughly 13 requests a day. Rolling to the
# next model when one is exhausted turns a ten-day labeling schedule into a
# single sitting, using nothing but the free tier as offered.
#
# The tradeoff is real and worth stating: different teachers disagree at the
# margins, so this introduces label noise. Every row records which model
# produced it (`teacher_model`) so that noise can be measured rather than
# assumed away -- and if one model turns out to be an outlier, its rows can be
# dropped without re-labeling everything.
MODEL_CHAIN = [
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
]

# Sized for Gemini's FREE tier, which as of 2026 allows roughly 10 requests per
# minute and 250-500 per day on flash models (Google cut these ~50-80% in
# December 2025). At 25 texts per request, a 3,000-text corpus is 120 requests
# -- one sitting, about 12 minutes, comfortably inside the daily cap.
#
# Going much above 25 starts to degrade label quality: the model loses track of
# which text it is annotating and the index field drifts.
BATCH_SIZE = 25

# Stay under the free-tier RPM. The sleep is cheap insurance against burning the
# daily quota on 429s that return nothing.
DEFAULT_RPM = 10

SYSTEM_PROMPT = f"""You are annotating text for a research dataset on imposter syndrome.

For each numbered text, decide independently whether each of these patterns is present:

{chr(10).join(f'- {label}: {description}' for label, description in LABEL_DESCRIPTIONS.items())}

Rules:
- Judge ONLY what the text actually says. Do not infer patterns from tone alone.
- Sadness, burnout, frustration, and anxiety are NOT imposter syndrome unless the
  text specifically questions the author's own competence or legitimacy.
- Multiple labels can be true for one text. Zero labels is a common and correct answer.
- confidence is your certainty about the whole annotation, 0.0 to 1.0. Use values
  below 0.6 freely for ambiguous text; those rows get filtered out later.

Return ONLY a JSON array with one object per input text, in the same order."""

RESPONSE_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "index": {"type": "integer"},
            **{label: {"type": "boolean"} for label in LABELS},
            "confidence": {"type": "number"},
        },
        "required": ["index", *LABELS, "confidence"],
    },
}


def load_corpus(limit):
    corpus_path = RAW_DIR / "corpus.jsonl"
    if not corpus_path.exists():
        raise SystemExit(
            f"Missing {corpus_path}. Create it with one JSON object per line: "
            '{"text": "..."}  See this file\'s docstring for corpus suggestions.'
        )

    rows = []
    with corpus_path.open() as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            record = json.loads(line)
            text = (record.get("text") or "").strip()
            # Very short texts carry no signal and very long ones blow the
            # teacher's context for marginal benefit.
            if 40 <= len(text) <= 4000:
                rows.append(text)

    random.Random(SEED).shuffle(rows)
    return rows[:limit]


def fingerprint(text):
    """Stable id for resume, tolerant of whitespace differences."""
    return hashlib.sha256(" ".join(text.lower().split()).encode()).hexdigest()[:16]


def already_labeled():
    """Read whatever a previous (possibly quota-killed) run produced.

    Free-tier quotas are a daily budget, so a 3,000-text corpus may span two
    sittings. Resuming beats restarting: restarting would re-spend quota on
    texts that are already annotated.
    """
    if not WEAK_PATH.exists():
        return set()
    done = set()
    with WEAK_PATH.open() as handle:
        for line in handle:
            if line.strip():
                try:
                    done.add(fingerprint(json.loads(line)["text"]))
                except (json.JSONDecodeError, KeyError):
                    continue
    return done


def load_api_key():
    """Prefer the shell, fall back to .env so `python3 ml/label_data.py` just works."""
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key

    env_path = PROJECT_ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line.startswith("GEMINI_API_KEY=") and not line.startswith("#"):
                return line.split("=", 1)[1].strip()
    return None


class QuotaExceeded(Exception):
    pass


def label_batch(api_key, texts, model):
    numbered = "\n\n".join(f"[{i}] {text}" for i, text in enumerate(texts))

    body = {
        "contents": [{"parts": [{"text": f"{SYSTEM_PROMPT}\n\nTEXTS TO ANNOTATE:\n\n{numbered}"}]}],
        "generationConfig": {
            "response_mime_type": "application/json",
            "response_schema": RESPONSE_SCHEMA,
            # Deterministic labeling: the same text should get the same label if
            # it appears twice, not creative variation.
            "temperature": 0.0,
        },
    }

    request = urllib.request.Request(
        f"{API_BASE}/{model}:generateContent?key={api_key}",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
    )

    # 503 "high demand" is common on the free tier and is transient. Retrying in
    # place beats deferring to the next run: the texts are already batched, and
    # a skipped batch costs a whole request's worth of quota for nothing.
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                payload = json.load(response)
            break
        except urllib.error.HTTPError as error:
            if error.code == 429:
                raise QuotaExceeded(error.read().decode()[:200]) from error
            if error.code >= 500 and attempt < 3:
                time.sleep(5 * (attempt + 1))
                continue
            raise RuntimeError(f"HTTP {error.code}: {error.read().decode()[:200]}") from error
        except (urllib.error.URLError, TimeoutError):
            if attempt < 3:
                time.sleep(5 * (attempt + 1))
                continue
            raise
    else:
        raise RuntimeError("exhausted retries")

    text = payload["candidates"][0]["content"]["parts"][0]["text"]
    return json.loads(text)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=3000)
    parser.add_argument("--min-confidence", type=float, default=0.6)
    parser.add_argument("--rpm", type=float, default=DEFAULT_RPM,
                        help="requests per minute; keep at or below your tier's limit")
    parser.add_argument("--max-requests", type=int, default=0,
                        help="stop after N requests (0 = no cap). Use to stay inside a daily quota.")
    parser.add_argument("--restart", action="store_true",
                        help="discard previous output instead of resuming")
    args = parser.parse_args()

    api_key = load_api_key()
    if not api_key:
        raise SystemExit("GEMINI_API_KEY is not set (checked the environment and .env)")

    if args.restart and WEAK_PATH.exists():
        WEAK_PATH.unlink()

    done = already_labeled()
    texts = [t for t in load_corpus(args.limit) if fingerprint(t) not in done]

    if done:
        print(f"Resuming: {len(done)} already labeled, {len(texts)} remaining")
    if not texts:
        print("Nothing left to label.")
        return

    batches = (len(texts) + BATCH_SIZE - 1) // BATCH_SIZE
    if args.max_requests:
        batches = min(batches, args.max_requests)

    interval = 60.0 / args.rpm if args.rpm > 0 else 0
    print(f"Labeling {len(texts)} texts in {batches} requests of {BATCH_SIZE} "
          f"at {args.rpm} req/min (~{batches * interval / 60:.0f} min)")

    written = 0
    skipped_low_confidence = 0
    quota_hit = False
    model_index = 0
    model_usage = {}

    # Append, never truncate: a run cut short by quota must leave its work behind.
    with WEAK_PATH.open("a") as out:
        for batch_index in range(batches):
            start = batch_index * BATCH_SIZE
            batch = texts[start : start + BATCH_SIZE]
            if not batch:
                break

            started = time.time()
            annotations = None

            # Try the current teacher; on quota exhaustion roll forward through
            # the chain. Only when every model is spent do we stop for the day.
            while model_index < len(MODEL_CHAIN):
                try:
                    annotations = label_batch(api_key, batch, MODEL_CHAIN[model_index])
                    break
                except QuotaExceeded:
                    print(f"\n  {MODEL_CHAIN[model_index]} quota exhausted; "
                          f"switching teacher", flush=True)
                    model_index += 1
                except Exception as error:  # noqa: BLE001
                    # Advance the teacher on persistent failure too. A model
                    # returning 503 "high demand" stays that way for hours, and
                    # retrying only it would stall the entire run.
                    print(f"\n  {MODEL_CHAIN[model_index]} failing ({error}); "
                          f"switching teacher", flush=True)
                    model_index += 1

            if model_index >= len(MODEL_CHAIN):
                print("\nEvery model in the chain is out of quota for today.")
                quota_hit = True
                break

            if annotations is None:
                continue

            teacher = MODEL_CHAIN[model_index]
            model_usage[teacher] = model_usage.get(teacher, 0) + 1

            print(f"  {batch_index + 1}/{batches} requests, {written} rows, "
                  f"teacher={teacher}", end="\r", flush=True)

            for annotation in annotations:
                index = annotation.get("index")
                if not isinstance(index, int) or not 0 <= index < len(batch):
                    continue

                # Low-confidence teacher labels are noise. Training on them
                # teaches the student the teacher's uncertainty, which is the
                # opposite of what distillation is for.
                if annotation.get("confidence", 0) < args.min_confidence:
                    skipped_low_confidence += 1
                    continue

                out.write(
                    json.dumps(
                        {
                            "text": batch[index],
                            "labels": {label: bool(annotation.get(label)) for label in LABELS},
                            "teacher_confidence": annotation["confidence"],
                            "teacher_model": teacher,
                        }
                    )
                    + "\n"
                )
                written += 1

            out.flush()   # so an interrupted run keeps everything up to here

            elapsed = time.time() - started
            if interval > elapsed and batch_index < batches - 1:
                time.sleep(interval - elapsed)

    print(f"\nWrote {written} rows this run to {WEAK_PATH}")
    if model_usage:
        print("Teacher mix: " + ", ".join(f"{m}={n}" for m, n in model_usage.items()))
    print(f"Dropped {skipped_low_confidence} rows below confidence {args.min_confidence}")

    if quota_hit:
        print(
            "\nFree-tier quotas reset every 24 hours. Re-run the SAME command "
            "tomorrow -- it resumes where it stopped and will not re-spend quota "
            "on texts already labeled."
        )
    else:
        print(
            "\nNext: hand-label 300-500 held-out examples into ml/data/gold.jsonl. "
            "Reported metrics come from that file, not from this one."
        )


if __name__ == "__main__":
    main()
