# Browser model bundle

`imposter-clf/` is a **build artifact**, not source. It is gitignored and
produced by:

```bash
python ml/export_onnx.py
```

Expected layout (what `@huggingface/transformers` looks for):

```
public/models/imposter-clf/
├── config.json
├── tokenizer.json
├── tokenizer_config.json
├── special_tokens_map.json
├── vocab.txt
├── calibration.json          # temperatures + per-label thresholds
└── onnx/
    └── model_quantized.onnx  # INT8, ~67 MB
```

Without this directory the app still works. `src/services/imposterClassifier.js`
latches the missing bundle, logs once, and returns `null`, and the server falls
back to the generative model's own judgment for the imposter-syndrome fields.
That path is a real fallback, not a broken state — but the confidence numbers it
produces are uncalibrated, which is why `ImposterSignals` refuses to render a
breakdown unless `imposter_source === 'onnx-local'`.

## Deploying it

67 MB is too large for a git repo and past some hosts' per-file limits. Two
options:

1. **Ship it with the static build** (simplest): keep it in `public/`, let the
   host serve it, and set a long `Cache-Control` — the file is immutable per
   model version.
2. **Host it separately** on the HF Hub or object storage, and point
   `env.remoteHost` / `env.localModelPath` at it in `imposterClassifier.js`.
   If you do this, re-enable `env.allowRemoteModels` and pin the revision —
   loading an unpinned remote model means the calibration in `calibration.json`
   may no longer correspond to the weights that produced it.
