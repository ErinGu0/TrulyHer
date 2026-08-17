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

import google.generativeai as genai
from tqdm import tqdm

from config import LABELS, LABEL_DESCRIPTIONS, RAW_DIR, WEAK_PATH, SEED

MODEL = "gemini-2.5-flash"

# Sized for Gemini's FREE tier, which as of 2026 allows roughly 10 requests per
# minute and 250-500 per day on 2.5-flash (Google cut these ~50-80% in December
# 2025). At 25 texts per request, a 3,000-text corpus is 120 requests -- one
# sitting, about 12 minutes, comfortably inside the daily cap.
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


def is_quota_error(error):
    text = str(error).lower()
    return "429" in text or "quota" in text or "resource_exhausted" in text


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

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise SystemExit("GEMINI_API_KEY is not set")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(MODEL)

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

    # Append, never truncate: a run cut short by quota must leave its work behind.
    with WEAK_PATH.open("a") as out:
        for batch_index in tqdm(range(batches)):
            start = batch_index * BATCH_SIZE
            batch = texts[start : start + BATCH_SIZE]
            if not batch:
                break

            started = time.time()

            try:
                annotations = label_batch(model, batch)
            except Exception as error:  # noqa: BLE001
                if is_quota_error(error):
                    print(f"\nDaily quota exhausted after {batch_index} requests.")
                    quota_hit = True
                    break
                print(f"\nBatch at {start} failed ({error}); skipping")
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

            out.flush()   # so an interrupted run keeps everything up to here

            elapsed = time.time() - started
            if interval > elapsed and batch_index < batches - 1:
                time.sleep(interval - elapsed)

    print(f"\nWrote {written} rows this run to {WEAK_PATH}")
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
