"""Step 5 -- evaluate against the hand-labeled gold set.

This is the only script whose numbers are worth putting on a resume or in a
README. Everything upstream is scored against Gemini's labels, which measures
how faithfully the student copied the teacher -- including the teacher's
mistakes. The gold set is human-labeled, held out, and never trained on.

If gold.jsonl also carries `teacher_labels` (Gemini's annotation of those same
rows), this reports the teacher's score too. A student that matches or beats its
teacher on held-out human labels is the result worth having: it means the
distillation removed noise rather than just compressing it.

Usage:
    python ml/evaluate.py
"""

import json

import numpy as np
from sklearn.metrics import (
    average_precision_score,
    classification_report,
    f1_score,
    precision_recall_fscore_support,
)

from calibrate import expected_calibration_error, predict_logits
from config import ARTIFACTS_DIR, GOLD_PATH, LABELS


def load_gold():
    if not GOLD_PATH.exists():
        raise SystemExit(
            f"Missing {GOLD_PATH}.\n\n"
            "Hand-label 300-500 held-out examples first. Without it there is no "
            "trustworthy metric -- see ml/README.md."
        )

    with GOLD_PATH.open() as handle:
        rows = [json.loads(line) for line in handle if line.strip()]

    texts = [r["text"] for r in rows]
    labels = np.array([[int(bool(r["labels"].get(label))) for label in LABELS] for r in rows])

    teacher = None
    if all("teacher_labels" in r for r in rows):
        teacher = np.array(
            [[int(bool(r["teacher_labels"].get(label))) for label in LABELS] for r in rows]
        )

    return texts, labels, teacher


def report(name, y_true, y_pred):
    print(f"\n=== {name} ===")
    print(
        classification_report(
            y_true, y_pred, target_names=LABELS, zero_division=0, digits=3
        )
    )

    # The app's binary gate: does any imposter pattern fire? This is what
    # actually drives the UI, so it deserves its own number.
    any_true = y_true.max(axis=1)
    any_pred = y_pred.max(axis=1)
    precision, recall, f1, _ = precision_recall_fscore_support(
        any_true, any_pred, average="binary", zero_division=0
    )
    print(f"any-label gate:  precision {precision:.3f}  recall {recall:.3f}  F1 {f1:.3f}")

    return {
        "f1_macro": float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
        "f1_micro": float(f1_score(y_true, y_pred, average="micro", zero_division=0)),
        "any_label_f1": float(f1),
    }


def main():
    texts, gold, teacher = load_gold()
    print(f"Evaluating on {len(texts)} hand-labeled examples")

    calibration = json.loads((ARTIFACTS_DIR / "calibration.json").read_text())
    temperatures = np.array(calibration["temperatures"])
    thresholds = np.array(calibration["thresholds"])

    logits = predict_logits(texts)
    probabilities = 1 / (1 + np.exp(-logits / temperatures))
    predictions = (probabilities >= thresholds).astype(int)

    student = report("Student (fine-tuned, calibrated)", gold, predictions)

    # Per-label PR-AUC. Threshold-free, so it separates "the ranking is bad"
    # from "the threshold is wrong" -- worth checking before blaming the model
    # for a label with poor F1.
    print("\nPR-AUC per label (threshold-independent):")
    for i, label in enumerate(LABELS):
        support = int(gold[:, i].sum())
        if support == 0:
            print(f"  {label:<30}      n/a  (0 positives in gold set)")
            continue
        auc = average_precision_score(gold[:, i], probabilities[:, i])
        baseline = support / len(gold)
        print(f"  {label:<30} {auc:>8.3f}  (random baseline {baseline:.3f}, n={support})")

    ece = expected_calibration_error(probabilities.ravel(), gold.ravel())
    print(f"\nECE on gold set: {ece:.4f}")
    print(
        "  (calibrate.py fits temperatures on the weak-label validation split; "
        "this is the honest out-of-distribution check on that fit)"
    )

    results = {"student": student, "gold_ece": round(float(ece), 4), "n": len(texts)}

    if teacher is not None:
        teacher_metrics = report("Teacher (Gemini, zero-shot)", gold, teacher)
        results["teacher"] = teacher_metrics
        delta = student["f1_macro"] - teacher_metrics["f1_macro"]
        print(
            f"\nStudent macro-F1 minus teacher macro-F1: {delta:+.3f}"
            + (
                "  -- distillation denoised the labels"
                if delta >= 0
                else "  -- student is lossy; try more data or a larger backbone"
            )
        )

    path = ARTIFACTS_DIR / "gold_metrics.json"
    path.write_text(json.dumps(results, indent=2))
    print(f"\nWrote {path}")
    print("Next: python ml/export_onnx.py")


if __name__ == "__main__":
    main()
