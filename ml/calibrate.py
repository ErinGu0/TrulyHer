"""Step 4 -- calibrate the probabilities and tune per-label thresholds.

Why this step exists at all:

A fine-tuned classifier's sigmoid output is a score, not a probability. Trained
with pos_weight to fight class imbalance, it is systematically over-confident --
it will happily emit 0.94 on entries where it is right about 70% of the time.
The app shows that number to someone in a vulnerable moment and stores it in the
database, so it needs to mean what it says.

Per-label temperature scaling fits one scalar T per label on the validation set
and divides the logit by it. It is monotonic, so it cannot change the ranking,
AUC, or which examples are ranked most confidently -- it only fixes the
*magnitude*. That property is what makes it safe to apply after the fact.

Outputs:
    ml/artifacts/calibration.json   temperatures + tuned thresholds
    ml/artifacts/reliability.png    before/after reliability diagram

Usage:
    python ml/calibrate.py
"""

import json

import numpy as np
import torch
from torch import nn
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

from config import ARTIFACTS_DIR, LABELS, MAX_LENGTH, PROCESSED_DIR  # noqa: E402
from transformers import AutoModelForSequenceClassification, AutoTokenizer  # noqa: E402

MODEL_DIR = ARTIFACTS_DIR / "model"
N_BINS = 10


def load_val():
    path = PROCESSED_DIR / "val.jsonl"
    with path.open() as handle:
        rows = [json.loads(line) for line in handle if line.strip()]
    return [r["text"] for r in rows], np.array([r["labels"] for r in rows])


@torch.no_grad()
def predict_logits(texts, batch_size=32):
    tokenizer = AutoTokenizer.from_pretrained(str(MODEL_DIR))
    model = AutoModelForSequenceClassification.from_pretrained(str(MODEL_DIR)).eval()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device)

    all_logits = []
    for start in range(0, len(texts), batch_size):
        batch = texts[start : start + batch_size]
        encoded = tokenizer(
            batch, truncation=True, max_length=MAX_LENGTH, padding=True, return_tensors="pt"
        ).to(device)
        all_logits.append(model(**encoded).logits.cpu().numpy())

    return np.concatenate(all_logits)


def fit_temperatures(logits, labels):
    """One temperature per label, fitted by minimising BCE with LBFGS."""
    temperatures = []

    for i in range(logits.shape[1]):
        logit_column = torch.tensor(logits[:, i], dtype=torch.float)
        label_column = torch.tensor(labels[:, i], dtype=torch.float)

        # Optimise log(T) so T stays strictly positive without a constraint.
        log_t = torch.zeros(1, requires_grad=True)
        optimizer = torch.optim.LBFGS([log_t], lr=0.05, max_iter=200)
        criterion = nn.BCEWithLogitsLoss()

        def closure():
            optimizer.zero_grad()
            loss = criterion(logit_column / torch.exp(log_t), label_column)
            loss.backward()
            return loss

        optimizer.step(closure)
        temperatures.append(float(torch.exp(log_t).item()))

    return np.array(temperatures)


def expected_calibration_error(probabilities, labels, n_bins=N_BINS):
    """Average gap between confidence and accuracy, weighted by bin population."""
    edges = np.linspace(0.0, 1.0, n_bins + 1)
    error = 0.0

    for lower, upper in zip(edges[:-1], edges[1:]):
        in_bin = (probabilities > lower) & (probabilities <= upper)
        count = in_bin.sum()
        if count == 0:
            continue
        confidence = probabilities[in_bin].mean()
        accuracy = labels[in_bin].mean()
        error += (count / len(probabilities)) * abs(confidence - accuracy)

    return float(error)


def tune_thresholds(probabilities, labels):
    """Per-label threshold maximising F1 on the validation set.

    0.5 is only optimal when the classes are balanced and the loss is
    unweighted; neither holds here, so a fixed 0.5 leaves real F1 on the table.
    """
    thresholds = []
    for i in range(probabilities.shape[1]):
        best_threshold, best_f1 = 0.5, -1.0
        for candidate in np.arange(0.05, 0.96, 0.01):
            predicted = (probabilities[:, i] >= candidate).astype(int)
            true_positive = int(((predicted == 1) & (labels[:, i] == 1)).sum())
            false_positive = int(((predicted == 1) & (labels[:, i] == 0)).sum())
            false_negative = int(((predicted == 0) & (labels[:, i] == 1)).sum())
            if true_positive == 0:
                continue
            precision = true_positive / (true_positive + false_positive)
            recall = true_positive / (true_positive + false_negative)
            f1 = 2 * precision * recall / (precision + recall)
            if f1 > best_f1:
                best_threshold, best_f1 = float(candidate), f1
        thresholds.append(round(best_threshold, 2))
    return np.array(thresholds)


def plot_reliability(raw, calibrated, labels, path):
    edges = np.linspace(0, 1, N_BINS + 1)
    centers = (edges[:-1] + edges[1:]) / 2

    def bin_accuracy(probabilities):
        accuracies = []
        for lower, upper in zip(edges[:-1], edges[1:]):
            in_bin = (probabilities > lower) & (probabilities <= upper)
            accuracies.append(labels[in_bin].mean() if in_bin.sum() else np.nan)
        return accuracies

    plt.figure(figsize=(5.5, 5.5))
    plt.plot([0, 1], [0, 1], "k--", linewidth=1, label="perfectly calibrated")
    plt.plot(centers, bin_accuracy(raw.ravel()), "o-", label="before scaling")
    plt.plot(centers, bin_accuracy(calibrated.ravel()), "s-", label="after scaling")
    plt.xlabel("predicted probability")
    plt.ylabel("observed frequency")
    plt.title("Reliability diagram (all labels pooled)")
    plt.legend()
    plt.tight_layout()
    plt.savefig(path, dpi=150)
    print(f"Wrote {path}")


def main():
    texts, labels = load_val()
    print(f"Calibrating on {len(texts)} validation examples")

    logits = predict_logits(texts)
    raw_probabilities = 1 / (1 + np.exp(-logits))

    temperatures = fit_temperatures(logits, labels)
    calibrated_probabilities = 1 / (1 + np.exp(-logits / temperatures))

    thresholds = tune_thresholds(calibrated_probabilities, labels)

    print(f"\n{'label':<30} {'T':>6} {'thresh':>8} {'ECE before':>12} {'ECE after':>11}")
    for i, label in enumerate(LABELS):
        ece_before = expected_calibration_error(raw_probabilities[:, i], labels[:, i])
        ece_after = expected_calibration_error(calibrated_probabilities[:, i], labels[:, i])
        print(
            f"{label:<30} {temperatures[i]:>6.3f} {thresholds[i]:>8.2f} "
            f"{ece_before:>12.4f} {ece_after:>11.4f}"
        )

    pooled_before = expected_calibration_error(raw_probabilities.ravel(), labels.ravel())
    pooled_after = expected_calibration_error(calibrated_probabilities.ravel(), labels.ravel())
    print(f"\nPooled ECE: {pooled_before:.4f} -> {pooled_after:.4f}")

    # T > 1 means the model was over-confident and is being softened; T < 1 the
    # opposite. Over-confidence is the overwhelmingly common case here.
    if pooled_after > pooled_before:
        print(
            "WARNING: calibration made ECE worse. Usually means the validation "
            "split is too small or too different from training."
        )

    output = {
        "labels": LABELS,
        "temperatures": temperatures.round(4).tolist(),
        "thresholds": thresholds.tolist(),
        "ece_before": round(pooled_before, 4),
        "ece_after": round(pooled_after, 4),
        "calibrated_on": "validation split (weak labels)",
    }
    path = ARTIFACTS_DIR / "calibration.json"
    path.write_text(json.dumps(output, indent=2))
    print(f"Wrote {path}")

    plot_reliability(
        raw_probabilities, calibrated_probabilities, labels, ARTIFACTS_DIR / "reliability.png"
    )
    print("\nNext: python ml/evaluate.py")


if __name__ == "__main__":
    main()
