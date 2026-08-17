# Imposter-syndrome classifier

A fine-tuned multi-label text classifier, distilled from Gemini, calibrated, and
quantized to run in the browser.

## Why this replaced a Gemini field

`imposter_syndrome_detected` and `imposter_confidence` used to come straight out
of the generative model. Two problems with that:

1. **The confidence meant nothing.** An LLM's self-reported certainty is not
   calibrated against any outcome. `0.87` and `0.62` did not correspond to
   different real-world hit rates. The app displayed that number to someone at a
   low moment and stored it as if it were data.
2. **The journal text had to leave the device** for a classification that a
   66M-parameter model can do locally.

The pipeline here fixes both. Gemini stays — it is much better at writing a
warm, specific response than any small model — but it no longer decides *whether*
this is imposter syndrome. The local classifier does, and its output is fed into
the prompt as ground truth.

## Label taxonomy

Multi-label, not binary. "Imposter syndrome: yes" does not tell you what to say
back; someone attributing a promotion to headcount needs a different response
than someone writing 400 lines of tests so no reviewer finds a gap.

| label | what it captures |
| --- | --- |
| `attribution_to_luck` | success credited to luck, timing, or other people |
| `fear_of_exposure` | fear of being found out as unqualified |
| `discounting_praise` | deflecting or explaining away recognition |
| `overworking_to_compensate` | over-preparing driven by fear of inadequacy |
| `comparison_to_peers` | measuring against colleagues, concluding they don't belong |

## Pipeline

```bash
# Step 0 needs no dependencies at all -- standard library only
python3 ml/fetch_corpus.py --limit 3000   # 0. build the raw corpus

python -m venv ml/.venv && source ml/.venv/bin/activate
pip install -r ml/requirements.txt
export GEMINI_API_KEY=...

python ml/label_data.py --limit 3000   # 1. distill labels from the teacher
python ml/prepare_dataset.py           # 2. split, dedupe, guard against leakage
python ml/train.py                     # 3. fine-tune  (~20 min on a free Colab T4)
python ml/calibrate.py                 # 4. temperature scaling + threshold tuning
python ml/evaluate.py                  # 5. score against hand-labeled gold
python ml/export_onnx.py               # 6. INT8 ONNX -> public/models/imposter-clf/
```

Step 1 needs an API budget and step 3 wants a GPU; the rest run on a laptop in
under a minute.

## What the corpus actually looks like (measured, not assumed)

`fetch_corpus.py` has been run against the real sources. The findings matter
before you spend anything on labeling:

| | |
| --- | --- |
| r/careerguidance, full scan | 12,625 usable posts |
| ...containing a high-precision imposter marker | **249 (2.0%)** |
| default corpus composition | 3,000 texts, ~8% marker-hit after enrichment |

**2% is the honest signal rate**, and it is the central problem with this data.
r/careerguidance is an *advice* subreddit ("should I take this offer", "how do I
negotiate"), not a *confession* subreddit. Imposter syndrome shows up, but
sparsely.

Two things follow.

**The markers are a selection tool, never a label.** They are tuned for
precision, not recall — an early loose version matched "figure out which
master's program" and would have spent the teacher budget confirming negatives.
Gemini still reads all 3,000 texts and will find the implicit cases no regex
catches ("everyone on the panel clearly knew more than me"), so the true
positive rate after labeling will be meaningfully higher than 2%.

**You will not know if it is high enough until step 2.** `prepare_dataset.py`
prints per-label positive counts and flags anything under 200 as too few to
evaluate reliably. Read that table before training. If labels are thin:

- **Merge labels.** Five is a design choice, not a requirement. Collapsing to
  two or three (say `fear_of_exposure` + `discounting_praise` into one
  `self-doubt` label) multiplies the positives per class and is far more
  defensible than reporting an F1 computed on 30 examples.
- **Find a better source.** Pushshift archives of r/ImposterSyndrome and
  r/cscareerquestions are the right corpus; they need a bulk download rather
  than the datasets-server API.
- **Do not synthesise positives with an LLM and quietly mix them in.** If you
  augment, say so, and keep the gold set 100% real text — otherwise you are
  measuring how well the model reproduces Gemini's writing style.

## Prior correction: why the thresholds will be wrong at first

The corpus is **enriched**, not a random sample: marker-hit texts are
oversampled roughly 4x so the teacher budget lands on informative examples.
That is standard practice for a rare class, and it has a consequence people
routinely miss.

A model trained and calibrated on a corpus where the positive rate is 8% will
output probabilities calibrated to *that* 8%. Real journal entries have a
different base rate. Feed them in and the model will look over-confident across
the board — not because it is broken, but because it is answering a question
about a different population.

The fix is a prior correction on the log-odds. For a label with training
prevalence `π_train` and true prevalence `π_true`:

```
logit_corrected = logit_raw - ln(π_train / (1 - π_train)) + ln(π_true / (1 - π_true))
```

You need an estimate of `π_true`, which means hand-labeling a *random*
(un-enriched) sample — `fetch_corpus.py --enrich-rate 0` produces exactly that.
Until you do, treat the thresholds in `calibration.json` as relative rankings
rather than absolute probabilities, and say so if you write the numbers up.

## The gold set is the whole ballgame

`ml/data/gold.jsonl` is hand-labeled and is the **only** source of reportable
metrics. Scoring the student against Gemini's labels measures how faithfully it
copied the teacher, mistakes included — that number will look great and mean
nothing.

`gold.example.jsonl` shows the format and, more importantly, the kinds of
examples that matter. Note that four of the twelve are all-negative: tired,
sad, proud, and content entries that a naive model will flag simply because they
carry negative affect. **Distinguishing "having a hard time" from "doubting my
own competence" is the actual task.** A gold set made only of clear positives
will hide the failure that matters most.

Target 300–500 rows, and label them before looking at model predictions.

```bash
cp ml/data/gold.example.jsonl ml/data/gold.jsonl   # then extend it
```

If you also record Gemini's zero-shot labels on those same rows as
`teacher_labels`, `evaluate.py` scores the teacher too — and a student that
matches or beats its teacher on held-out human labels is the result worth
reporting, because it means the distillation removed label noise instead of
just compressing it.

## Design decisions worth defending in an interview

**Weighted loss.** Each label is true 5–15% of the time. Unweighted BCE
converges to predicting all-zeros, which scores >85% accuracy and is useless.
`prepare_dataset.py` computes `pos_weight = negatives/positives` per label,
clipped at 10 — unclipped, a 2%-frequency label destabilises training and floods
the output with false positives.

**Macro-F1, not accuracy or micro-F1.** Micro-F1 is dominated by the most
frequent label and will happily hide a rare one being predicted never.

**Temperature scaling, not retraining.** One scalar per label, fitted on the
validation split by minimising NLL. It is monotonic, so it cannot change the
ranking or PR-AUC — it only fixes the magnitude. That is precisely why it is
safe to bolt on after training. `calibrate.py` reports ECE before and after and
writes a reliability diagram to `artifacts/reliability.png`.

**Tuned thresholds.** 0.5 is only optimal for a balanced problem with an
unweighted loss. Neither holds here, so thresholds are tuned per label for F1 on
the validation split and shipped in `calibration.json`.

**Measured quantization, not assumed.** `export_onnx.py` runs FP32 and INT8 over
the same validation text and reports probability drift and the macro-F1 delta.
If INT8 costs more than one F1 point, the message says so and points at FP16.

**Where it runs.** INT8 dynamic quantization gets DistilBERT to ~67 MB, which
the browser downloads once and caches. `config.py` documents the two
alternatives — MiniLM-L12 at ~34 MB if the download is the binding constraint,
DeBERTa-v3-small if you give up the browser requirement and serve it instead.

## Artifacts

Everything under `artifacts/` and `public/models/` is gitignored — regenerate it
by rerunning the pipeline. The two files worth committing are
`artifacts/calibration.json` and `artifacts/gold_metrics.json`, which are small
and are the record of what the reported numbers actually were.
