"""Shared configuration for the imposter-syndrome classifier pipeline.

Every script in this directory imports from here so the label taxonomy, paths,
and thresholds cannot drift apart between training, calibration, and export.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = ROOT.parent

DATA_DIR = ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
ARTIFACTS_DIR = ROOT / "artifacts"

# The gold set is hand-labeled and version-controlled. It is the only thing the
# reported metrics are computed against -- scoring the student against the
# teacher's labels would just measure how well we copied Gemini, including its
# mistakes.
GOLD_PATH = DATA_DIR / "gold.jsonl"
WEAK_PATH = RAW_DIR / "weak_labeled.jsonl"

# Where export_onnx.py writes the browser bundle.
WEB_MODEL_DIR = PROJECT_ROOT / "public" / "models" / "imposter-clf"

# ---------------------------------------------------------------------------
# Label taxonomy
#
# Multi-label, not binary. "Imposter syndrome: yes/no" is close to useless for
# writing a helpful response -- someone attributing a promotion to luck needs a
# different reply than someone working 70-hour weeks so nobody discovers they
# are behind. These five are the components most consistently identified in the
# Clance IP Scale and the follow-up literature.
# ---------------------------------------------------------------------------
LABELS = [
    "attribution_to_luck",
    "fear_of_exposure",
    "discounting_praise",
    "overworking_to_compensate",
    "comparison_to_peers",
]

LABEL_DESCRIPTIONS = {
    "attribution_to_luck": (
        "Credits their success to luck, timing, an easy problem, or other people "
        "rather than to their own ability."
    ),
    "fear_of_exposure": (
        "Fears being found out as not good enough, unqualified, or a fraud."
    ),
    "discounting_praise": (
        "Dismisses, deflects, or explains away positive feedback and "
        "recognition they received."
    ),
    "overworking_to_compensate": (
        "Over-prepares, overworks, or cannot stop working, driven by a fear "
        "that anything less will reveal inadequacy."
    ),
    "comparison_to_peers": (
        "Measures themselves against colleagues or classmates and concludes "
        "they are behind or do not belong."
    ),
}

NUM_LABELS = len(LABELS)
LABEL_TO_ID = {label: i for i, label in enumerate(LABELS)}

# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------
# distilbert-base-uncased: 66M params, ~67 MB after INT8 dynamic quantization.
# That is downloaded once and cached by the browser, which is acceptable for a
# lazily-loaded model but is the main cost of running client-side.
#
# Smaller alternative if the download matters more than a couple of F1 points:
#   microsoft/MiniLM-L12-H384-uncased   33M params, ~34 MB int8
# Larger alternative if you drop the browser requirement and serve it instead:
#   microsoft/deberta-v3-small          142M params, best accuracy of the three
BASE_MODEL = "distilbert-base-uncased"

MAX_LENGTH = 256          # journal entries are short; 256 tokens covers ~99% of them
SEED = 42

TRAIN_ARGS = {
    "learning_rate": 3e-5,
    "num_train_epochs": 5,
    "per_device_train_batch_size": 16,
    "per_device_eval_batch_size": 32,
    "weight_decay": 0.01,
    "warmup_ratio": 0.1,
}

# Split proportions for the weakly-labeled corpus. The gold set is never split;
# it is held out entirely for the final evaluation.
VAL_FRACTION = 0.15

# Fallback decision threshold. calibrate.py tunes one threshold per label on the
# validation split and writes the tuned values into artifacts/calibration.json;
# this value is only used if that file is missing a threshold.
DEFAULT_THRESHOLD = 0.5

for directory in (DATA_DIR, RAW_DIR, PROCESSED_DIR, ARTIFACTS_DIR):
    directory.mkdir(parents=True, exist_ok=True)
