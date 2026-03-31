# ScholarMind

ScholarMind is a production-structured AI study companion built with Next.js App Router, TypeScript, TailwindCSS, Framer Motion, Three.js, Supabase Auth/Postgres/Storage, and multi-provider AI fallback logic.

## Features

- Premium landing page with 3D hero and smooth motion
- Email/password + Google OAuth auth (Supabase)
- Protected dashboard with session-based study workflow
- Upload PDF, text, and image notes
- Document text extraction (PDF parsing + OCR)
- AI summary, flashcards, quiz, insights, ELI10, hard mode, study plans
- Multi-provider inference fallback:
  - Gemini (primary)
  - Groq
  - HuggingFace
  - OpenRouter
  - Together
- Response cache layer to reduce repeated AI cost
- Basic spaced repetition reminder endpoint

## Local Setup

1. Install Node.js 20+ and npm.
2. Copy env file:
   - `cp .env.example .env.local`
3. Fill all required environment variables in `.env.local`.
4. Install dependencies:
   - `npm install`
5. Run dev server:
   - `npm run dev`
6. Open `http://localhost:3000`

## Supabase Setup

1. Create a new Supabase project.
2. In the Supabase SQL Editor, run `supabase/schema.sql`.
   - This creates `study_sessions`, `study_files`, `study_reminders`, the `study-files` storage bucket, and the required RLS policies.
3. In `Authentication -> URL Configuration`, set:
   - Site URL: `http://localhost:3000`
   - Redirect URL: `http://localhost:3000/auth/callback`
   - Redirect URL: `https://<your-vercel-domain>/auth/callback`
4. In `Authentication -> Providers -> Google`, enable Google sign-in and paste your Google OAuth client ID and secret.
5. In Google Cloud, create a Web OAuth client and add:
   - Authorized JavaScript origin: `http://localhost:3000`
   - Authorized JavaScript origin: `https://<your-vercel-domain>`
   - Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`

## AI Provider Setup

At minimum, set `GEMINI_API_KEY`.

For production fallback reliability, also configure:
- `GROQ_API_KEY`
- `HUGGINGFACE_API_KEY`
- `OPENROUTER_API_KEY`
- `TOGETHER_API_KEY`

Control the preferred provider with:
- `AI_PRIMARY_PROVIDER=gemini|groq|huggingface|openrouter|together`

## Deployment (Vercel)

1. Push repository to GitHub.
2. Import project in Vercel.
3. Add all environment variables from `.env.example` to Vercel project settings.
4. Deploy.
5. Add deployed domain to Supabase Auth redirect URLs and OpenRouter app URL.

## Architecture

```text
app/
  dashboard/
  auth/
  api/
components/
lib/
  ai/
    providers/
  db/
  documents/
types/
supabase/
```

This structure keeps AI orchestration, persistence, auth, and UI concerns isolated and scalable.
# ScholarMind
