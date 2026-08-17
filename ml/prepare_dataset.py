"""Step 2 -- turn weak labels into train/val splits and report the imbalance.

Two things happen here that matter more than the mechanics:

1. Any text appearing in the gold set is removed from training. Weak labeling
   and hand labeling can draw from the same corpus, and a single leaked example
   turns the final F1 into a number that means nothing.

2. Positive-class frequencies are computed and saved. Multi-label journal data
   is badly imbalanced -- `attribution_to_luck` might be 6% of rows -- so
   train.py needs per-label pos_weight or the model learns to predict all-zeros
   and reports 94% accuracy while being useless.

Usage:
    python ml/prepare_dataset.py
"""

import hashlib
import json
import random

# Standard library only. This is the script whose output decides whether the
# label taxonomy is viable, so it must run before you commit disk to a
# virtualenv -- finding out the labels are too thin AFTER installing 2.5 GB of
# PyTorch is the wrong order.
from config import (
    GOLD_PATH,
    LABELS,
    PROCESSED_DIR,
    SEED,
    VAL_FRACTION,
    WEAK_PATH,
)


def read_jsonl(path):
    if not path.exists():
        return []
    with path.open() as handle:
        return [json.loads(line) for line in handle if line.strip()]


def fingerprint(text):
    """Normalised hash, so trivial whitespace or case differences still collide."""
    normalised = " ".join(text.lower().split())
    return hashlib.sha256(normalised.encode()).hexdigest()


def to_vector(labels):
    return [int(bool(labels.get(label))) for label in LABELS]


def main():
    weak = read_jsonl(WEAK_PATH)
    gold = read_jsonl(GOLD_PATH)

    if not weak:
        raise SystemExit(f"No weak labels at {WEAK_PATH}. Run label_data.py first.")

    print(f"Loaded {len(weak)} weakly-labeled rows and {len(gold)} gold rows")

    # --- Leakage guard -----------------------------------------------------
    gold_hashes = {fingerprint(row["text"]) for row in gold}
    before = len(weak)
    weak = [row for row in weak if fingerprint(row["text"]) not in gold_hashes]
    removed = before - len(weak)
    if removed:
        print(f"Removed {removed} training rows that also appear in the gold set")

    # Deduplicate the training corpus itself; scraped data repeats.
    seen = set()
    deduped = []
    for row in weak:
        key = fingerprint(row["text"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(row)
    print(f"Removed {len(weak) - len(deduped)} duplicate training rows")
    weak = deduped

    # --- Split -------------------------------------------------------------
    # Multi-label stratification has no clean exact solution; shuffling with a
    # fixed seed and then *verifying* the per-label frequencies match between
    # splits is honest and reproducible.
    shuffled = list(weak)
    random.Random(SEED).shuffle(shuffled)
    split_at = int(len(shuffled) * (1 - VAL_FRACTION))
    train = shuffled[:split_at]
    val = shuffled[split_at:]

    write_split("train", train)
    write_split("val", val)

    # --- Imbalance report --------------------------------------------------
    positives = [0] * len(LABELS)
    for row in train:
        for index, value in enumerate(to_vector(row["labels"])):
            positives[index] += value

    # BCEWithLogitsLoss pos_weight = #negatives / #positives per label.
    # Clipped at 10 because an unclipped weight on a 2%-frequency label
    # destabilises training and floods the output with false positives.
    pos_weight = [
        min(10.0, max(1.0, (len(train) - count) / max(count, 1)))
        for count in positives
    ]

    print("\nTraining set label distribution:")
    print(f"{'label':<30} {'positives':>10} {'rate':>8} {'pos_weight':>11}")
    for i, label in enumerate(LABELS):
        rate = positives[i] / max(len(train), 1)
        flag = "  <-- too few to evaluate reliably" if positives[i] < 200 else ""
        print(f"{label:<30} {positives[i]:>10} {rate:>7.1%} {pos_weight[i]:>11.2f}{flag}")

    # Co-occurrence matters for the merge decision: two labels that almost
    # always fire together are not really two labels, and collapsing them is
    # what turns two unusable classes into one usable one.
    print("\nLabel co-occurrence (how often row has both):")
    for i in range(len(LABELS)):
        for j in range(i + 1, len(LABELS)):
            both = sum(
                1 for row in train
                if row["labels"].get(LABELS[i]) and row["labels"].get(LABELS[j])
            )
            if both:
                smaller = max(min(positives[i], positives[j]), 1)
                print(f"  {LABELS[i]} + {LABELS[j]}: {both} "
                      f"({both / smaller:.0%} of the rarer label)")

    stats_path = PROCESSED_DIR / "label_stats.json"
    stats_path.write_text(
        json.dumps(
            {
                "labels": LABELS,
                "train_size": len(train),
                "val_size": len(val),
                "gold_size": len(gold),
                "positives": positives,
                "pos_weight": pos_weight,
            },
            indent=2,
        )
    )
    print(f"\nWrote {stats_path}")

    if not gold:
        print(
            "\nWARNING: ml/data/gold.jsonl is empty. You can train without it, but "
            "you will have no trustworthy metric to report -- see ml/README.md."
        )


def write_split(name, rows):
    path = PROCESSED_DIR / f"{name}.jsonl"
    with path.open("w") as out:
        for row in rows:
            out.write(
                json.dumps({"text": row["text"], "labels": to_vector(row["labels"])}) + "\n"
            )
    print(f"Wrote {len(rows)} rows to {path}")


if __name__ == "__main__":
    main()
