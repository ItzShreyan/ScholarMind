# ScholarMind

ScholarMind is a Open Source production-structured AI study companion Project built with Next.js App Router, TypeScript, TailwindCSS, Framer Motion, Three.js, Supabase Auth/Postgres/Storage, and multi-provider AI fallback logic. It is available for anyone to use and edit with Credit and as an AI Study Companion. The Steps To Use and Edit this are below.

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
  - Providers are wrapped in a 10-second per-provider timeout (`withTimeout` in `lib/ai/fallback.ts`) to prevent any single hanging provider from consuming the full request budget
- Response cache layer to reduce repeated AI cost
- Basic spaced repetition reminder endpoint
- Browse proxy (`/api/browse-proxy`) strips X-Frame-Options/CSP from embedded web pages so they render inside the workspace iframe
- In-app PDF viewer (`components/dashboard/CanvasPdfViewer.tsx`) using pdfjs-dist — renders pages to canvas with zoom and page navigation
- Dedicated Mind Security Engine landing page at `/security`
- Reusable SVG Logo component (`components/ui/Logo.tsx`) in the app's accent gradient palette, used across BrandLink and landing page footer

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

## Deployment (Vercel or Netlify)

1. Push repository to GitHub.
2. Import project in Vercel or Netlify.
3. Add all environment variables from `.env.example` to project settings.
4. Deploy.
5. Add deployed domain to Supabase Auth redirect URLs and OpenRouter app URL.

Note for Netlify (Starter/free plan): synchronous functions are killed at 10 seconds. The `maxDuration` in API routes and per-provider timeouts in `lib/ai/fallback.ts` reflect this limit. Upgrade to Pro for the 60-second ceiling.

## Architecture

```text
app/
  dashboard/
  auth/
  api/
  security/   -- Mind Security Engine landing page
components/
  common/     -- BrandLink, SecurityBadge, GlobalSecurityBadge
  dashboard/  -- StudyWorkspace, CanvasPdfViewer, DynamicIslandMusicPlayer
  ui/         -- Card, Button, Container, Logo, Badge
lib/
  ai/
    providers/   -- gemini, groq, groq_v2, huggingface, openrouter_v2, together, local
    fallback.ts  -- 10s per-provider timeout, bad-response detection, caching
  db/
  documents/
types/
supabase/
```

This structure keeps AI orchestration, persistence, auth, and UI concerns isolated and scalable.
