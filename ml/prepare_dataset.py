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

import numpy as np

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
    rng = np.random.default_rng(SEED)
    indices = rng.permutation(len(weak))
    split_at = int(len(weak) * (1 - VAL_FRACTION))
    train = [weak[i] for i in indices[:split_at]]
    val = [weak[i] for i in indices[split_at:]]

    write_split("train", train)
    write_split("val", val)

    # --- Imbalance report --------------------------------------------------
    train_matrix = np.array([to_vector(row["labels"]) for row in train])
    positives = train_matrix.sum(axis=0)
    negatives = len(train) - positives

    # BCEWithLogitsLoss pos_weight = #negatives / #positives per label.
    # Clipped at 10 because an unclipped weight on a 2%-frequency label
    # destabilises training and floods the output with false positives.
    pos_weight = np.clip(negatives / np.maximum(positives, 1), 1.0, 10.0)

    print("\nTraining set label distribution:")
    print(f"{'label':<30} {'positives':>10} {'rate':>8} {'pos_weight':>11}")
    for i, label in enumerate(LABELS):
        rate = positives[i] / max(len(train), 1)
        flag = "  <-- too few to evaluate reliably" if positives[i] < 200 else ""
        print(f"{label:<30} {positives[i]:>10} {rate:>7.1%} {pos_weight[i]:>11.2f}{flag}")

    stats_path = PROCESSED_DIR / "label_stats.json"
    stats_path.write_text(
        json.dumps(
            {
                "labels": LABELS,
                "train_size": len(train),
                "val_size": len(val),
                "gold_size": len(gold),
                "positives": positives.tolist(),
                "pos_weight": pos_weight.tolist(),
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
