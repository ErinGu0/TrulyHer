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

Steps 1 and 3 need a GPU and an API budget; the rest run on a laptop in
under a minute.

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
