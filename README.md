# TrulyHer

An AI-powered journaling companion that helps women in STEM notice, understand, and gently overcome imposter syndrome.


## About

TrulyHer is an empathetic AI journal built to support women in tech who feel overwhelmed, self-doubting, or unsure whether what they’re feeling is normal—or even imposter syndrome. It listens to daily reflections, tracks stress and mood patterns, and translates those signals into compassionate, personalized insights and micro-actions. The goal isn’t perfection. It’s small, steady steps toward better self-understanding, reduced procrastination, and a calmer relationship with work and learning.

Key things TrulyHer does:
- Flags patterns that often show up with imposter syndrome and explains them in plain, non-judgmental language so users can name what’s happening.
- Sends tailored, supportive messages and short, actionable nudges to break procrastination cycles and rebuild confidence.
- Visualizes trends (stress, mood, behavioral patterns) to help users see progress and identify realistic, focused areas to improve.

Built with empathy-first design: TrulyHer treats progress as a series of tiny wins and focuses on safety, privacy, and encouragement.


## Features

- Daily reflection journal with stress and mood tracking
- AI-generated, personalized encouragement and suggested micro-actions
- Pattern detection that highlights signs of imposter syndrome with plain explanations
- **Semantic memory** — each analysis is grounded in the entries you actually wrote before, retrieved by meaning rather than keyword
- **Semantic search** over your own history: "times I felt like a fraud in code review" finds the entry that never used those words
- **On-device imposter-syndrome classifier** — a fine-tuned model runs in your browser, so that classification never leaves your device
- Visual insights and charts to show trends over time
- Export personal insights into motivational poster (using html2canvas)


## Tech stack

**Frontend** — React 19, Tailwind CSS, Recharts, Framer Motion, Create React App

**Backend** — Vercel serverless functions (`api/`), Gemini for language generation

**Memory** — Postgres + [pgvector](https://github.com/pgvector/pgvector), HNSW index over
`text-embedding-004` vectors. See [db/README.md](db/README.md).

**ML** — DistilBERT fine-tuned for multi-label imposter-syndrome detection,
distilled from Gemini, temperature-calibrated, INT8-quantized to ONNX, and run
in the browser via transformers.js / onnxruntime-web. See [ml/README.md](ml/README.md).


## Architecture

```
browser                            serverless                       data
───────                            ──────────                       ────
imposterClassifier.js  ──signals──▶ /api/analyze  ──embed──▶  Gemini embeddings
 (ONNX, INT8, local)                    │                            │
                                        ├──retrieve top-k────▶  Postgres + pgvector
                                        ├──generate──────────▶  Gemini
                                        ├──reject repeat suggestions (cosine)
                                        └──persist entry + vectors ──▶ Postgres

journalService.js  ◀──── localStorage mirror (offline / no DATABASE_URL)
```

Three things are worth calling out:

**The prompt no longer begs the model to stop repeating itself.** It used to —
about fifty lines of it — because a stateless call has no idea what it said last
week. The server now retrieves the nearest past entries, shows the model the
advice already given, and rejects paraphrases by cosine distance. Prompt
engineering was standing in for memory.

**The classifier decides, the LLM writes.** `imposter_confidence` used to be a
number Gemini invented, uncalibrated against anything. Now a fine-tuned model
runs locally and its calibrated probability is what gets stored and shown;
Gemini's job is the warm, specific language it is actually good at.

**Everything degrades instead of breaking.** No `DATABASE_URL` → localStorage.
No model bundle → server falls back to Gemini's judgment. Offline → entries
still save. Losing something someone just wrote about a hard day is the worst
failure this app can have.


## Getting started (local)

Prerequisites:
- Node.js (LTS recommended)
- npm (comes with Node.js) or yarn

Clone the repo:

```bash
git clone https://github.com/ErinGu0/TrulyHer.git
cd TrulyHer
```

Install dependencies:
```bash
npm install
# or
# yarn
```

Copy `.env.example` to `.env` and fill it in:

```bash
cp .env.example .env
```

```bash
GEMINI_API_KEY=your_server_side_gemini_api_key_here
DATABASE_URL=postgresql://...        # optional; enables semantic memory
```

> **No `REACT_APP_` secrets.** Create React App inlines every `REACT_APP_*`
> variable into the public JS bundle, so a `REACT_APP_GEMINI_API_KEY` is
> readable by anyone who opens the deployed site. All Gemini and database
> traffic goes through the serverless functions in `api/`; the browser learns
> what is configured from `GET /api/health`, which returns booleans only.

For Vercel, set the same variables in the project environment settings.

To enable the semantic memory layer, provision Postgres with pgvector (Neon and
Supabase both ship it free), put the **pooled** connection string in
`DATABASE_URL`, then — see [db/README.md](db/README.md):

```bash
npm run db:migrate   # applies db/migrations/*.sql, each in a transaction
npm run db:check     # verifies structure AND does a real vector-search round trip
```

No `psql` needed; both use the `pg` package the app already depends on.

To build the on-device classifier, follow [ml/README.md](ml/README.md). Without
it the app runs fine; the imposter-syndrome fields just fall back to Gemini's
own (uncalibrated) judgment.

Start the app:
```bash
npm start
```

Build for production:
``` bash
npm run build
```

Run tests:
``` bash
npm test
```

How to use
Open the app at http://localhost:3000 after running npm start.
Write short daily reflections in the journal area (the AI is optimized for brief, honest entries).
Track your AI‑detected mood and stress levels from each entry, and view them to spot trends and patterns over time.
Review the personalized messages and suggested micro-actions. Try one small action each day and track how it feels.
Use the Insights page to see charts and trends that help you understand patterns over time.

## Why this helps with impostor syndrome

Imposter syndrome often thrives in silence and uncertainty. TrulyHer reduces that silence by:

- Helping you give a name to what you’re experiencing (normalizing the feeling and reducing its power).
- Translating emotions and behavior into clear, evidence-based observations instead of vague self-criticism.
- Recommending tiny, doable steps that interrupt procrastination and build confidence through repeatable wins.
- Reminding you that growth is non-linear — tracking progress over time shows real gains you may not notice day to day.
- Language and tone are intentionally supportive and non-technical; the app focuses on clarity, kindness, and agency.

Contribution (you belong here)
Thank you for caring about this project. Whether you’re filing a bug, suggesting a feature, writing documentation, or opening your first PR — you’re welcome.

## A few ways to help:

Fix typos or improve copy — accessible language matters here.
- Add small UI improvements or accessibility fixes.
- Add tests or improve existing ones.
- Create issues labeled good-first-issue if you want to make it easier for beginners.

## Guidelines for contributors:

Be kind and assume good intent.
If you’re anxious about making your first contribution: open an issue first describing what you want to change and someone will help you.
If a task sounds too big, break it into smaller PRs — small changes are easier to review and land faster.

## Privacy & Safety
TrulyHer is designed as a personal, private journaling tool. Notes on privacy:

- **With `DATABASE_URL` unset**, entries live only in this browser's localStorage.
- **With it set**, entries and their embeddings are stored in your Postgres instance,
  partitioned per device id, with row level security enabled. Read the
  [caveat about the table owner bypassing RLS](db/README.md#schema-notes) before
  treating that as a hard boundary — and note that the current `x-user-id` header
  is a partition key, not authentication.
- **The imposter-syndrome classification runs entirely in the browser.** The entry
  text is still sent to Gemini for the written response, but the scoring of it is
  local. If you want the text to never leave the device at all, run with
  `GEMINI_API_KEY` unset — the local classifier and the journal keep working.
- **Free-tier Gemini keys let Google use the request content to improve their
  products** ([terms](https://ai.google.dev/gemini-api/terms)). Paid tiers do
  not. For a journaling app this is the single most important line in this
  section: on a free key, entries sent for the written response are covered by
  that. The on-device classifier is unaffected — it never leaves the browser
  either way. Disclose this, use a paid key, or run with `GEMINI_API_KEY` unset.
- This app is not a substitute for professional mental health care. If you or someone else is in crisis, seek immediate professional help.

## Helpful resources (global)
- International OCD Foundation: https://iocdf.org
- MentalHealth.gov: https://www.mentalhealth.gov
- If you need immediate help, contact local emergency services or a crisis hotline in your country.

## Troubleshooting
- If the app doesn’t start, ensure Node and npm versions are compatible and run npm install again.
- If AI calls fail, check `GEMINI_API_KEY` on the server and hit `/api/health` to see what the server thinks is configured.
- If semantic memory seems off, confirm `DATABASE_URL` points at a **pooled** connection string and that the migration ran (`\dx` in psql should list `vector`).
- If the local classifier never loads, check the browser console — it logs once and then defers to the server. Most often `public/models/imposter-clf/` is missing; run `python ml/export_onnx.py`.
- For build errors, try removing node_modules and reinstalling:

``` bash
rm -rf node_modules package-lock.json
npm install
```

Contact
Maintainer: ErinGu0 (https://github.com/ErinGu0)


Last updated: 2026-01-05
