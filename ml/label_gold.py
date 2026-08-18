"""Interactive terminal tool for hand-labeling the gold set.

The gold set is the only source of trustworthy metrics, and building it is the
one part of this pipeline nobody can automate -- if an LLM labels it, you are
measuring agreement with that LLM, not accuracy. So the goal here is to make
the unavoidable manual work as fast and as unambiguous as possible.

Stratified sampling
-------------------
A uniformly random gold set is useless at this base rate: 400 rows at ~2%
prevalence gives you about 8 positives, and per-label F1 on 8 examples is noise.

So rows are served from two strata in alternation:

  marker   texts matching the imposter regexes in fetch_corpus.py
  random   everything else

and each saved row records which stratum it came from. That matters: it means
you can compute BOTH the enriched metrics (usable per-label F1, because there
are enough positives) AND an estimate of real-world performance, by reweighting
each stratum by its true frequency in the corpus. Throwing away the stratum
label is what makes an enriched test set misleading; keeping it makes it
rigorous. The weights are written to gold_strata.json.

Usage:
    python3 ml/label_gold.py              # start or resume
    python3 ml/label_gold.py --target 400
"""

import argparse
import json
import os
import shutil
import sys
import textwrap

from config import DATA_DIR, GOLD_PATH, LABELS, LABEL_DESCRIPTIONS, RAW_DIR, SEED
from fetch_corpus import MARKER_RE

STRATA_PATH = DATA_DIR / "gold_strata.json"

KEYS = {str(i + 1): label for i, label in enumerate(LABELS)}

HELP = f"""
{"".join(f"  [{k}] {v}{chr(10)}" for k, v in KEYS.items())}
  [enter] save and continue      [n] save as all-negative
  [s] skip this text             [u] undo last saved row
  [?] show label definitions     [q] save and quit
"""


def load_jsonl(path):
    if not path.exists():
        return []
    with path.open() as handle:
        return [json.loads(line) for line in handle if line.strip()]


def fingerprint(text):
    return " ".join(text.lower().split())[:200]


def build_queue(target):
    """Alternate strata so positives show up steadily rather than in one clump.

    Draws from synthetic.jsonl, NOT the Reddit corpora. The model is trained on
    journal register, so a gold set of forum prose would measure domain transfer
    rather than accuracy -- two different questions, and the transfer one is
    already answered separately by processed/ood.jsonl.

    Labeling text whose labels are known by construction is not circular, which
    is the obvious objection. The generator was ASKED for a pattern; whether it
    actually expressed one is an open question, and a human reading it is the
    only real way to find out. Disagreements you find here are generation
    defects, and they are exactly what the metric needs to account for.
    """
    texts = []
    synthetic = RAW_DIR / "synthetic.jsonl"
    if synthetic.exists():
        texts += [row["text"] for row in load_jsonl(synthetic)]

    if not texts:
        raise SystemExit(
            "No synthetic corpus found. Run:  python3 ml/synthesize.py --target 1500"
        )

    done = {fingerprint(row["text"]) for row in load_jsonl(GOLD_PATH)}

    seen = set()
    marker, random_pool = [], []
    for text in texts:
        key = fingerprint(text)
        if key in seen or key in done:
            continue
        seen.add(key)
        (marker if MARKER_RE.search(text) else random_pool).append(text)

    import random as _random

    rng = _random.Random(SEED)
    rng.shuffle(marker)
    rng.shuffle(random_pool)

    # Record the true stratum frequencies BEFORE sampling -- these are the
    # weights that let enriched metrics be reweighted back to reality.
    total = len(marker) + len(random_pool)
    STRATA_PATH.write_text(
        json.dumps(
            {
                "marker_population": len(marker),
                "random_population": len(random_pool),
                "marker_frequency": round(len(marker) / max(total, 1), 5),
                "random_frequency": round(len(random_pool) / max(total, 1), 5),
                "note": (
                    "Reweight per-stratum metrics by these frequencies to estimate "
                    "real-world performance. Enriched metrics alone overstate it."
                ),
            },
            indent=2,
        )
    )

    queue = []
    half = target // 2
    for i in range(max(half, target - half)):
        if i < len(marker) and len(queue) < target:
            queue.append((marker[i], "marker"))
        if i < len(random_pool) and len(queue) < target:
            queue.append((random_pool[i], "random"))
    return queue


# Short names for the status line. The full descriptions live behind `?`.
SHORT = ["luck", "fear", "praise", "overwork", "compare"]


def render(text, index, total, counts):
    """One screen, one decision, one keystroke sequence.

    The previous version redrew the whole screen after every single toggle, so
    labeling two patterns cost three round trips. Reading the entry is the only
    part that should take time; the input should not.
    """
    os.system("cls" if os.name == "nt" else "clear")
    width = min(shutil.get_terminal_size((100, 30)).columns, 100)

    tally = "  ".join(f"{SHORT[i]} {counts.get(label, 0)}"
                      for i, label in enumerate(LABELS))
    print(f"{index}/{total}   {tally}")
    print("-" * width)
    for line in textwrap.wrap(text, width=width - 2):
        print(line)
    print("-" * width)
    print("  " + "  ".join(f"{i + 1}={SHORT[i]}" for i in range(len(LABELS))))
    print("  type digits then enter (e.g. 25) | enter=none | s=skip | u=undo | ?=help | q=quit")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", type=int, default=400)
    args = parser.parse_args()

    existing = load_jsonl(GOLD_PATH)
    counts = {label: 0 for label in LABELS}
    for row in existing:
        for label in LABELS:
            if row.get("labels", {}).get(label):
                counts[label] += 1

    queue = build_queue(args.target)
    if not queue:
        print(f"Nothing left to label. {len(existing)} rows already in {GOLD_PATH}")
        return

    print(f"{len(existing)} rows already labeled. {len(queue)} queued.")
    print("Tip: label what the text ACTUALLY says. Being sad, tired, or stuck is")
    print("not imposter syndrome unless the writer doubts their own competence.")
    input("\nPress enter to begin…")

    labeled = len(existing)
    saved_this_session = []

    total = labeled + len(queue)

    for text, stratum in queue:
        while True:
            render(text, labeled, total, counts)
            choice = input("> ").strip().lower()

            if choice == "?":
                print("\n" + "\n".join(
                    f"  {i + 1}. {label}\n     {LABEL_DESCRIPTIONS[label]}"
                    for i, label in enumerate(LABELS)))
                input("\nenter to continue…")
                continue

            if choice == "q":
                finish(labeled, counts)
                return

            if choice == "s":
                break

            if choice == "u":
                if not saved_this_session:
                    input("Nothing to undo in this session. enter…")
                    continue
                removed = saved_this_session.pop()
                rows = load_jsonl(GOLD_PATH)[:-1]
                with GOLD_PATH.open("w") as handle:
                    for row in rows:
                        handle.write(json.dumps(row) + "\n")
                for label in LABELS:
                    if removed["labels"][label]:
                        counts[label] -= 1
                labeled -= 1
                continue

            # Digits (or empty) is the common path: set every named label and
            # save in a single keystroke sequence. Empty means all-negative,
            # which is the most frequent answer and so costs the fewest keys.
            if choice and not choice.isdigit():
                continue
            picked = {KEYS[c] for c in choice if c in KEYS}
            if choice and not picked:
                continue

            row = {
                "text": text,
                "labels": {label: (label in picked) for label in LABELS},
                "stratum": stratum,
            }
            with GOLD_PATH.open("a") as handle:
                handle.write(json.dumps(row) + "\n")
            saved_this_session.append(row)
            for label in picked:
                counts[label] += 1
            labeled += 1
            break

    finish(labeled, counts)


def finish(labeled, counts):
    print(f"\n\n{labeled} rows in {GOLD_PATH}")
    print(f"Stratum weights written to {STRATA_PATH}")
    print("\nPositives per label:")
    for label, count in counts.items():
        flag = "  <-- thin; consider merging this label" if count < 30 else ""
        print(f"  {label:<30} {count:>4}{flag}")
    print("\nRun `python3 ml/prepare_dataset.py` next -- it excludes every gold")
    print("row from training automatically, so there is no leakage to worry about.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nStopped. Everything labeled so far is saved.")
        sys.exit(0)
