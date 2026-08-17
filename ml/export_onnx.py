"""Step 6 -- export to ONNX, quantize to INT8, and assemble the browser bundle.

The point of this step is that the imposter-syndrome classification never leaves
the user's device. The app asks people to write down the thing they are most
afraid is true about themselves; the less of that which crosses a network, the
better. After this runs, the browser downloads ~67 MB once, caches it, and does
the classification locally -- for free, with no per-inference API cost.

Quantization is not free accuracy-wise, so this script measures the damage
instead of assuming it is negligible: it runs the FP32 and INT8 models over the
validation split and reports the probability drift and the macro-F1 delta. If
F1 drops more than a point, ship FP16 instead.

Output: public/models/imposter-clf/  (gitignored -- it is a build artifact)

Usage:
    python ml/export_onnx.py
"""

import json
import shutil

import numpy as np
import onnxruntime as ort
from onnxruntime.quantization import QuantType, quantize_dynamic
from sklearn.metrics import f1_score
from transformers import AutoTokenizer

from calibrate import predict_logits
from config import ARTIFACTS_DIR, LABELS, MAX_LENGTH, PROCESSED_DIR, WEB_MODEL_DIR

MODEL_DIR = ARTIFACTS_DIR / "model"
ONNX_DIR = ARTIFACTS_DIR / "onnx"

# transformers.js expects the graph at <model>/onnx/model_quantized.onnx when
# loaded with dtype 'q8'.
FP32_NAME = "model.onnx"
INT8_NAME = "model_quantized.onnx"

TOKENIZER_FILES = [
    "tokenizer.json",
    "tokenizer_config.json",
    "special_tokens_map.json",
    "vocab.txt",
    "config.json",
]


def export_fp32():
    from optimum.onnxruntime import ORTModelForSequenceClassification

    ONNX_DIR.mkdir(parents=True, exist_ok=True)
    print("Exporting FP32 ONNX graph…")
    model = ORTModelForSequenceClassification.from_pretrained(str(MODEL_DIR), export=True)
    model.save_pretrained(str(ONNX_DIR))

    # optimum names the file model.onnx; normalise in case that changes.
    candidates = list(ONNX_DIR.glob("*.onnx"))
    if not candidates:
        raise SystemExit("Export produced no .onnx file")
    exported = candidates[0]
    if exported.name != FP32_NAME:
        exported.rename(ONNX_DIR / FP32_NAME)
    return ONNX_DIR / FP32_NAME


def quantize(fp32_path):
    int8_path = ONNX_DIR / INT8_NAME
    print("Quantizing to INT8 (dynamic, per-tensor)…")
    quantize_dynamic(
        model_input=str(fp32_path),
        model_output=str(int8_path),
        weight_type=QuantType.QUInt8,
        # per_channel and reduce_range off: this is what transformers.js's own
        # conversion uses, and onnxruntime-web's WASM backend is the target.
        per_channel=False,
        reduce_range=False,
    )

    fp32_mb = fp32_path.stat().st_size / 1e6
    int8_mb = int8_path.stat().st_size / 1e6
    print(f"  {fp32_mb:.1f} MB -> {int8_mb:.1f} MB  ({fp32_mb / int8_mb:.1f}x smaller)")
    return int8_path


def onnx_logits(session, tokenizer, texts, batch_size=16):
    outputs = []
    input_names = {i.name for i in session.get_inputs()}

    for start in range(0, len(texts), batch_size):
        encoded = tokenizer(
            texts[start : start + batch_size],
            truncation=True,
            max_length=MAX_LENGTH,
            padding="max_length",
            return_tensors="np",
        )
        feed = {
            name: encoded[name].astype(np.int64)
            for name in ("input_ids", "attention_mask", "token_type_ids")
            if name in input_names and name in encoded
        }
        outputs.append(session.run(None, feed)[0])

    return np.concatenate(outputs)


def verify(int8_path, sample_size=300):
    """Compare INT8 ONNX against the FP32 PyTorch model on real validation text."""
    path = PROCESSED_DIR / "val.jsonl"
    with path.open() as handle:
        rows = [json.loads(line) for line in handle if line.strip()][:sample_size]

    texts = [r["text"] for r in rows]
    labels = np.array([r["labels"] for r in rows])

    tokenizer = AutoTokenizer.from_pretrained(str(MODEL_DIR))
    session = ort.InferenceSession(str(int8_path), providers=["CPUExecutionProvider"])

    torch_probabilities = 1 / (1 + np.exp(-predict_logits(texts)))
    onnx_probabilities = 1 / (1 + np.exp(-onnx_logits(session, tokenizer, texts)))

    max_drift = float(np.abs(torch_probabilities - onnx_probabilities).max())
    mean_drift = float(np.abs(torch_probabilities - onnx_probabilities).mean())

    torch_f1 = f1_score(labels, (torch_probabilities >= 0.5).astype(int), average="macro", zero_division=0)
    onnx_f1 = f1_score(labels, (onnx_probabilities >= 0.5).astype(int), average="macro", zero_division=0)

    print(f"\nQuantization check on {len(texts)} examples:")
    print(f"  max probability drift   {max_drift:.4f}")
    print(f"  mean probability drift  {mean_drift:.4f}")
    print(f"  macro-F1  FP32 {torch_f1:.4f} -> INT8 {onnx_f1:.4f}  ({onnx_f1 - torch_f1:+.4f})")

    if torch_f1 - onnx_f1 > 0.01:
        print(
            "  WARNING: INT8 cost more than 1 F1 point. Export FP16 instead "
            "(weight_type=QuantType.QFloat16) and load it with dtype: 'fp16'."
        )

    return {
        "max_drift": round(max_drift, 4),
        "mean_drift": round(mean_drift, 4),
        "f1_fp32": round(float(torch_f1), 4),
        "f1_int8": round(float(onnx_f1), 4),
    }


def assemble_bundle(int8_path, quantization_report):
    WEB_MODEL_DIR.mkdir(parents=True, exist_ok=True)
    (WEB_MODEL_DIR / "onnx").mkdir(exist_ok=True)

    shutil.copy(int8_path, WEB_MODEL_DIR / "onnx" / INT8_NAME)

    for name in TOKENIZER_FILES:
        source = MODEL_DIR / name
        if source.exists():
            shutil.copy(source, WEB_MODEL_DIR / name)

    # The browser needs the temperatures and thresholds too -- an uncalibrated
    # probability is exactly what this whole pipeline exists to avoid shipping.
    calibration = json.loads((ARTIFACTS_DIR / "calibration.json").read_text())
    calibration["quantization"] = quantization_report
    calibration["labels"] = LABELS
    (WEB_MODEL_DIR / "calibration.json").write_text(json.dumps(calibration, indent=2))

    total_mb = sum(p.stat().st_size for p in WEB_MODEL_DIR.rglob("*") if p.is_file()) / 1e6
    print(f"\nBundle written to {WEB_MODEL_DIR} ({total_mb:.1f} MB total)")
    print("The app loads it lazily on the journal page; the browser caches it after the first visit.")


def main():
    if not MODEL_DIR.exists():
        raise SystemExit(f"No trained model at {MODEL_DIR}. Run train.py first.")
    if not (ARTIFACTS_DIR / "calibration.json").exists():
        raise SystemExit("No calibration.json. Run calibrate.py first.")

    fp32_path = export_fp32()
    int8_path = quantize(fp32_path)
    quantization_report = verify(int8_path)
    assemble_bundle(int8_path, quantization_report)


if __name__ == "__main__":
    main()
