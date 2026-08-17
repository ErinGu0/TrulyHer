"""Step 1 -- weak-label a raw text corpus with Gemini (knowledge distillation).

Gemini is the teacher. It is slow and costs money per call, which is exactly why
we do not want it in the request path for every journal entry; instead we spend
it once, offline, to produce training data for a 66M-parameter student that runs
in the user's browser for free.

Input:  ml/data/raw/corpus.jsonl   {"text": "..."} per line
Output: ml/data/raw/weak_labeled.jsonl

Sourcing the corpus is the part that takes judgment, not compute. Options that
have worked:
  - Public self-disclosure datasets (Reddit mental-health corpora on Kaggle /
    HuggingFace; r/cscareerquestions and r/GradSchool dumps via Pushshift
    archives). Check each dataset's license before using it.
  - dair-ai/emotion and go_emotions as a source of NEGATIVE examples -- emotional
    text that is emphatically not imposter syndrome. Without these the model
    learns "sounds sad" rather than "doubts their own competence", which is the
    single most common failure of a classifier like this.

Aim for at least 3,000 examples with meaningful positives on every label. Below
roughly 200 positives for a given label the per-label F1 is too noisy to report.

Usage:
    python ml/label_data.py --limit 3000
"""

import argparse
import json
import os
import random
import time

import google.generativeai as genai
from tqdm import tqdm

from config import LABELS, LABEL_DESCRIPTIONS, RAW_DIR, WEAK_PATH, SEED

MODEL = "gemini-2.5-flash-preview-09-2025"

# Batching cuts the number of round trips by ~10x. Larger batches start to
# degrade label quality as the model loses track of which text it is on.
BATCH_SIZE = 10

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


def label_batch(model, texts):
    numbered = "\n\n".join(f"[{i}] {text}" for i, text in enumerate(texts))
    response = model.generate_content(
        f"{SYSTEM_PROMPT}\n\nTEXTS TO ANNOTATE:\n\n{numbered}",
        generation_config={
            "response_mime_type": "application/json",
            "response_schema": RESPONSE_SCHEMA,
            # Deterministic labeling: we want the same text to get the same
            # label if it appears twice, not creative variation.
            "temperature": 0.0,
        },
    )
    return json.loads(response.text)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=3000)
    parser.add_argument("--min-confidence", type=float, default=0.6)
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise SystemExit("GEMINI_API_KEY is not set")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(MODEL)

    texts = load_corpus(args.limit)
    print(f"Labeling {len(texts)} texts in batches of {BATCH_SIZE}")

    written = 0
    skipped_low_confidence = 0

    with WEAK_PATH.open("w") as out:
        for start in tqdm(range(0, len(texts), BATCH_SIZE)):
            batch = texts[start : start + BATCH_SIZE]

            try:
                annotations = label_batch(model, batch)
            except Exception as error:  # noqa: BLE001 - keep going past transient failures
                print(f"\nBatch at {start} failed ({error}); backing off")
                time.sleep(5)
                continue

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
                        }
                    )
                    + "\n"
                )
                written += 1

    print(f"\nWrote {written} labeled rows to {WEAK_PATH}")
    print(f"Dropped {skipped_low_confidence} rows below confidence {args.min_confidence}")
    print(
        "\nNext: hand-label 300-500 held-out examples into ml/data/gold.jsonl. "
        "Reported metrics come from that file, not from this one."
    )


if __name__ == "__main__":
    main()
