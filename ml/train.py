"""Step 3 -- fine-tune the student model.

Multi-label classification with per-label positive weighting. Runs in roughly
20 minutes on a free Colab T4 for a 3k-example corpus.

Usage:
    python ml/train.py
    python ml/train.py --base-model microsoft/MiniLM-L12-H384-uncased
"""

import argparse
import json

import numpy as np
import torch
from torch import nn
from datasets import Dataset
from sklearn.metrics import f1_score, precision_recall_fscore_support
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    Trainer,
    TrainingArguments,
    set_seed,
)

from config import (
    ARTIFACTS_DIR,
    BASE_MODEL,
    LABELS,
    MAX_LENGTH,
    NUM_LABELS,
    PROCESSED_DIR,
    SEED,
    TRAIN_ARGS,
)

MODEL_DIR = ARTIFACTS_DIR / "model"


class WeightedTrainer(Trainer):
    """Trainer with per-label pos_weight in the loss.

    Without this the model converges to predicting all-zeros: on a corpus where
    each label is true 5-15% of the time, all-zeros already scores >85%
    accuracy, and unweighted BCE has no reason to leave that minimum.
    """

    def __init__(self, *args, pos_weight=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.pos_weight = pos_weight

    def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
        labels = inputs.pop("labels")
        outputs = model(**inputs)
        loss_fn = nn.BCEWithLogitsLoss(
            pos_weight=self.pos_weight.to(outputs.logits.device)
            if self.pos_weight is not None
            else None
        )
        loss = loss_fn(outputs.logits, labels.float())
        return (loss, outputs) if return_outputs else loss


def load_split(name):
    path = PROCESSED_DIR / f"{name}.jsonl"
    if not path.exists():
        raise SystemExit(f"Missing {path}. Run prepare_dataset.py first.")
    with path.open() as handle:
        rows = [json.loads(line) for line in handle if line.strip()]
    return Dataset.from_dict(
        {"text": [r["text"] for r in rows], "labels": [r["labels"] for r in rows]}
    )


def compute_metrics(eval_prediction):
    logits, labels = eval_prediction
    probabilities = 1 / (1 + np.exp(-logits))
    predictions = (probabilities >= 0.5).astype(int)

    # Macro F1 is the number to watch: micro F1 is dominated by whichever label
    # happens to be most frequent, which hides a rare label being predicted
    # never.
    metrics = {
        "f1_macro": f1_score(labels, predictions, average="macro", zero_division=0),
        "f1_micro": f1_score(labels, predictions, average="micro", zero_division=0),
    }

    precision, recall, f1, _ = precision_recall_fscore_support(
        labels, predictions, average=None, zero_division=0, labels=range(NUM_LABELS)
    )
    for i, label in enumerate(LABELS):
        metrics[f"f1_{label}"] = f1[i]
        metrics[f"precision_{label}"] = precision[i]
        metrics[f"recall_{label}"] = recall[i]

    return metrics


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-model", default=BASE_MODEL)
    parser.add_argument("--epochs", type=float, default=TRAIN_ARGS["num_train_epochs"])
    parser.add_argument("--lr", type=float, default=TRAIN_ARGS["learning_rate"])
    args = parser.parse_args()

    set_seed(SEED)

    tokenizer = AutoTokenizer.from_pretrained(args.base_model)
    model = AutoModelForSequenceClassification.from_pretrained(
        args.base_model,
        num_labels=NUM_LABELS,
        problem_type="multi_label_classification",
        id2label={i: label for i, label in enumerate(LABELS)},
        label2id={label: i for i, label in enumerate(LABELS)},
    )

    def tokenize(batch):
        return tokenizer(
            batch["text"], truncation=True, max_length=MAX_LENGTH, padding="max_length"
        )

    train_ds = load_split("train").map(tokenize, batched=True, remove_columns=["text"])
    val_ds = load_split("val").map(tokenize, batched=True, remove_columns=["text"])

    stats = json.loads((PROCESSED_DIR / "label_stats.json").read_text())
    pos_weight = torch.tensor(stats["pos_weight"], dtype=torch.float)
    print(f"pos_weight per label: {dict(zip(LABELS, stats['pos_weight']))}")

    training_args = TrainingArguments(
        output_dir=str(ARTIFACTS_DIR / "runs"),
        learning_rate=args.lr,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=TRAIN_ARGS["per_device_train_batch_size"],
        per_device_eval_batch_size=TRAIN_ARGS["per_device_eval_batch_size"],
        weight_decay=TRAIN_ARGS["weight_decay"],
        warmup_ratio=TRAIN_ARGS["warmup_ratio"],
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1_macro",
        greater_is_better=True,
        save_total_limit=2,
        logging_steps=25,
        fp16=torch.cuda.is_available(),
        seed=SEED,
        report_to="none",
    )

    trainer = WeightedTrainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        compute_metrics=compute_metrics,
        pos_weight=pos_weight,
    )

    trainer.train()

    results = trainer.evaluate()
    print("\nValidation metrics (weak labels -- NOT the number to report):")
    for key, value in sorted(results.items()):
        if key.startswith("eval_"):
            print(f"  {key[5:]:<35} {value:.4f}")

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    trainer.save_model(str(MODEL_DIR))
    tokenizer.save_pretrained(str(MODEL_DIR))
    print(f"\nSaved model to {MODEL_DIR}")
    print("Next: python ml/calibrate.py")


if __name__ == "__main__":
    main()
