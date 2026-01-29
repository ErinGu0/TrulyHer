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
- Visual insights and charts to show trends over time
- Export personal insights into motivational poster (using html2canvas)


## Tech stack 

- React (frontend)
- Tailwind CSS for styling
- Node.js for local development
- Uses Create React App (react-scripts) as configured in package.json
- Optional AI integrations (Gemini API key used via environment variable)


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

Create a .env file in the project root (or copy the provided .env) and add your Gemini API key:

```bash
REACT_APP_GEMINI_API_KEY=your_gemini_api_key_here
```

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

- By default, data is stored locally in the browser/session (confirm exact behavior in the code before deploying).
- If you add remote sync or server-side storage, make sure to disclose how data is stored and secured.
- This app is not a substitute for professional mental health care. If you or someone else is in crisis, seek immediate professional help.

## Helpful resources (global)
- International OCD Foundation: https://iocdf.org
- MentalHealth.gov: https://www.mentalhealth.gov
- If you need immediate help, contact local emergency services or a crisis hotline in your country.

## Troubleshooting
- If the app doesn’t start, ensure Node and npm versions are compatible and run npm install again.
- If AI calls fail, check your REACT_APP_GEMINI_API_KEY and network connectivity.
- For build errors, try removing node_modules and reinstalling:

``` bash
rm -rf node_modules package-lock.json
npm install
```

Contact
Maintainer: ErinGu0 (https://github.com/ErinGu0)


Last updated: 2026-01-05
