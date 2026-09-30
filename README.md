# ⚡ PromptForge – AI Content Generator

An AI content generator with a reusable **prompt library** and a **prompt optimizer**.
Built by Adriyell Lopis for the CAPACITI programme (Week 2: Content Generation & AI Productivity).

## Features
- 8 content types: blog post, email, LinkedIn post, code, cover letter, study notes, social captions, README
- Tone, audience and length controls, with a preview of the exact prompt sent
- One-click refinement (shorter, more formal, add a hook, translate)
- Prompt Optimizer: scores a rough prompt, rewrites it, explains each change
- History (saved in your browser), copy and download

## Prompt structure
Every template uses: **Role → Context → Task → Format → Constraints**. See the Prompt Library tab.

## Deploy on Vercel (free, no key needed by visitors)
1. Get a free key at aistudio.google.com (Get API key). No card required.
2. Push this repo to GitHub and import it at vercel.com → New Project.
3. Add environment variable `GEMINI_API_KEY` (optionally `MODEL`, e.g. `gemini-2.5-flash-lite`).
4. Deploy. The frontend calls `/api/generate`, which holds the key server-side.

The Gemini free tier is rate-limited (limits are shown in the AI Studio console) and free-tier prompts may be used by Google to improve its products. The function adds a basic per-IP limit.

GitHub Pages cannot run the `/api` function, so host the live version on Vercel and use GitHub for the code.

## Tech
HTML, CSS, vanilla JavaScript, Vercel serverless function, Google Gemini API.
