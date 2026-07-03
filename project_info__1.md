# ScholarMind — Codebase Overview

## Summary

ScholarMind is a production-structured AI study companion built with the Next.js 15 App Router. It allows students to upload notes, PDFs, and screenshots, then generate AI-grounded study tools — summaries, quizzes, flashcards, mock exams, AI notes, revision plans, and a tutor chat — all tied to their own materials. The app uses Supabase for auth, storage, and persistence, and routes AI inference across multiple provider backends (Gemini, Groq, HuggingFace, OpenRouter, Together) with automatic fallback.

## Architecture

**Primary pattern**: Server-rendered pages (RSC) + client-side interactivity (React 19) with API routes for AI generation, file operations, and Supabase data access. The middleware layer handles security screening and route protection synchronously.

**Major subsystems**:
1. **Next.js App Router** — Server components for data fetching, client components for the workspace UI
2. **AI inference layer** (`lib/ai/`) — Multi-provider routing with fallback chain, response caching, usage rate-limiting, and prompt construction
3. **Security engine** (`lib/security/`, `middleware.ts`) — Multi-layered: Arcjet (bot/shield/rate-limit) + custom Mind Security Engine (local pattern matching, in-memory rate limiting, human verification challenges)
4. **Supabase data layer** (`lib/supabase/`, `lib/db/`) — Auth, Postgres tables for sessions/files/chat/usage/preferences/onboarding/revision plans, Storage bucket for uploaded files
5. **Document processing** (`lib/documents/`) — PDF parsing (pdf-parse, pdfjs-dist), OCR (tesseract.js), format extraction (mammoth for .docx, xlsx for spreadsheets, jszip)
6. **Web source system** (`lib/sources/web.ts`) — Multi-engine search (scholar via OpenAlex/Crossref/SemanticScholar/arXiv/Wikipedia/trusted learning sites, Google Custom Search, DuckDuckGo fallback) with Readability-based text extraction
7. **Landing page** (`app/page.tsx`) — Premium marketing page with Three.js 3D hero, Framer Motion animations, scroll-based parallax

**Technology stack**:
- **Runtime**: Node.js 20+ (Next.js 15.1.2, React 19)
- **Language**: TypeScript 5.7
- **Styling**: Tailwind CSS 3.4
- **Database/Auth/Storage**: Supabase (Postgres + Auth + Storage)
- **AI Providers**: Google Gemini, Groq, HuggingFace, OpenRouter, Together (with local/fallback)
- **Security**: Arcjet (shield, bot detection, sliding window rate-limit) + custom in-memory engine
- **Frontend animation**: Framer Motion 11, Three.js 0.171
- **Document parsing**: pdf-parse, pdfjs-dist, mammoth, tesseract.js, xlsx, jszip
- **Web scraping**: @mozilla/readability, jsdom
- **Math rendering**: KaTeX, rehype-katex, remark-math
- **Diagram support**: mermaid 11

**Entry point / execution start**:
- Next.js starts with `next.config.ts` (configures CSP headers, server externals for heavy packages, image remote patterns for Supabase)
- `middleware.ts` runs on every request (except static assets) — handles security assessment (Mind Security Engine + Arcjet) and Supabase auth-based route protection
- The root layout (`app/layout.tsx`) is an async RSC that injects a boot script for theme/motion preferences, wraps children in `AuthProvider` + `TelemetryTracker` + `GlobalSecurityBadge`

## Directory Structure

```
scholarmind/
├── app/                          # Next.js App Router pages and API routes
│   ├── layout.tsx                # Root layout — AuthProvider, TelemetryTracker, boot script
│   ├── page.tsx                  # Landing page — Three.js hero, ScrollShowcase, feature cards
│   ├── globals.css               # Global styles, CSS variables, glass/noise effects
│   ├── auth/                     # Auth page (login/signup), callback, signout
│   ├── dashboard/                # Protected dashboard — overview with sessions/files count
│   │   ├── page.tsx              # Dashboard overview (RSC) — redirects to auth if not logged in
│   │   ├── workspace/            # Main study workspace — the largest and most complex page
│   │   │   └── page.tsx          # Workspace entry (RSC) — redirects, creates first session, renders StudyWorkspace
│   │   │   └── [sessionId]/      # Session-specific workspace redirect
│   │   └── loading.tsx           # Route loading skeleton
│   ├── studio/                   # Alias for workspace (same component, different path)
│   │   └── page.tsx              # Identical logic to dashboard/workspace/page.tsx
│   ├── api/                      # API route handlers
│   │   ├── ai/generate/          # POST — main AI generation endpoint (tools: summary, quiz, flashcards, etc.)
│   │   ├── chat/                 # POST — streaming chat endpoint (OpenRouter SSE)
│   │   ├── chat-history/         # GET/POST — persist and retrieve chat messages per session
│   │   ├── files/                # File manipulation (preview, delete, toggle source_enabled)
│   │   ├── sessions/             # CRUD for study sessions (list, create, rename, delete, copy sources)
│   │   ├── sources/              # Web source search (scholar/google/duckduckgo) and import
│   │   ├── upload/               # File upload to Supabase Storage + extraction + DB insert
│   │   ├── preferences/          # User preferences CRUD
│   │   ├── onboarding/           # Onboarding wizard data CRUD
│   │   ├── reminders/            # Spaced-repetition reminder creation
│   │   ├── revision-plans/       # Revision plan CRUD
│   │   ├── flashcards/           # Flashcard CRUD
│   │   ├── quiz/                 # Quiz data endpoints
│   │   ├── insights/             # Study insights endpoints
│   │   ├── study-plan/           # Study plan endpoints
│   │   ├── music/                # Spotify OAuth login/status integration
│   │   ├── telemetry/            # Site events tracking
│   │   └── host/                 # Host-only admin endpoints
│   ├── schedule/                 # Revision schedule page (separate from workspace)
│   ├── settings/                 # User settings page
│   ├── onboarding/               # Onboarding wizard page
│   ├── host/                     # Host/admin panel page
│   └── ...static pages           # privacy, terms, security-check, feature-specific pages
├── components/                   # React components
│   ├── ui/                       # Primitive UI: Badge, Button, Card, Container, cn utility
│   ├── common/                   # BrandLink, ThemeToggle, SecurityBadge, GlobalSecurityBadge, Section
│   ├── landing/                  # Landing page: ThreeHero, ScrollShowcase, SeoStudyPage
│   ├── dashboard/                # Workspace UI — StudyWorkspace, DashboardHeader, AINotesConsole, etc.
│   │   ├── StudyWorkspace.tsx    # ** The single most complex component (~3900 lines) — entire workspace UI
│   │   ├── AINotesConsole.tsx    # Rich display for "AI Notes" structured output
│   │   ├── RichStudyText.tsx     # Markdown renderer with mermaid, KaTeX, custom styling
│   │   ├── DashboardHeader.tsx   # Top navigation bar
│   │   ├── DynamicIslandMusicPlayer.tsx  # Floating music player UI
│   │   ├── SpotifyPlaybackPanel.tsx      # Spotify song search/playback
│   │   ├── FocusMusicDock.tsx    # Compact music dock
│   │   ├── RevisionScheduleWorkspace.tsx # Revision schedule view
│   │   ├── WorkspaceBrowser.tsx  # Workspace file/source browser
│   │   └── StudioShelf.tsx       # Studio shelf component
│   ├── providers/                # AuthProvider (Supabase session), TelemetryTracker
│   ├── host/                     # HostPanel
│   ├── settings/                 # SettingsPanel
│   └── onboarding/               # OnboardingWizard
├── lib/                          # Server-side logic and utilities
│   ├── ai/                       # ** AI orchestration core **
│   │   ├── types.ts              # AIProvider interface, AIProviderName union, AIResult type
│   │   ├── router.ts             # selectProvider() — decides which provider to try first
│   │   ├── fallback.ts           # generateWithFallback() — primary provider + fallback chain + response validation
│   │   ├── prompt.ts             # buildPrompt() — constructs system prompt per action type
│   │   ├── limits.ts             # Rate-limiting: in-memory + Supabase-persisted usage tracking per scope
│   │   ├── preview.ts            # Default limit constants (hourly/daily/weekly)
│   │   ├── cache.ts              # In-memory LRU-style response cache (30-min TTL)
│   │   ├── source-context.ts     # buildStudyContext() — chunked, scored, query-relevant source extraction
│   │   ├── strip-reasoning.ts    # Post-process: strip model reasoning/planning, extract JSON
│   │   ├── parse.ts              # Parse flashcards from text (JSON first, Q:/A: fallback)
│   │   ├── util.ts               # normalizeAIText(), normalizeErrorMessage()
│   │   ├── openrouter-keys.ts    # Multi-key rotation for OpenRouter (up to 10 keys)
│   │   └── providers/            # Individual provider implementations (gemini, groq, groq_v2, huggingface, local, openrouter_v2, together)
│   ├── security/                 # Mind Security Engine
│   │   └── mind-security.ts      # assessRequest(), checkLocalRateLimit(), securityHeaders()
│   ├── supabase/                 # Supabase client factories
│   │   ├── client.ts             # Browser client (createBrowserClient)
│   │   ├── server.ts             # Server client (createServerClient with cookie handling)
│   │   └── setup.ts              # Setup error formatter
│   ├── db/queries.ts             # Database query helpers (getUserSessions, getSessionFiles, getUserPreferences, getRevisionPlans)
│   ├── auth/guards.ts            # requireUser() — redirect if not authenticated
│   ├── documents/                # Document parsing pipeline
│   │   ├── parser.ts             # Main file extraction (text parsing, OCR, format handlers)
│   │   ├── formats.ts            # MIME type resolution, preview kind, upload accept attribute
│   │   ├── clean.ts              # cleanStudySourceText() — normalize whitespace, remove artifacts
│   │   └── ocr.ts                # OCR with tesseract.js
│   ├── sources/web.ts            # ** Web source search system ** — 6 engines (OpenAlex, Crossref, SemanticScholar, arXiv, Wikipedia, trusted learning sites), Bing RSS fallback, Readability extraction, Jina.ai reader fallback
│   ├── music/                    # Spotify catalog search and playback proxy
│   ├── preferences/defaults.ts   # UserPreferences type and defaults
│   ├── onboarding*.ts            # Onboarding profile, options, summary
│   ├── host.ts                   # Host owner email check
│   ├── site-settings.ts          # Site-wide settings (limits, maintenance, research mode) — cached with unstable_cache
│   ├── site-url.ts               # Canonical site URL resolution
│   ├── performance.ts            # Client-side performance utilities (debounce, throttle, virtualization, FPS monitoring)
│   ├── animations.ts             # Animation helpers
│   └── cache.ts                  # Global in-memory cache (shared between AI cache and general cache)
├── types/index.ts                # Shared TypeScript types (AIAction, AIRequest, StudySession, StudyFile, ChatHistoryItem)
├── supabase/schema.sql           # Full Supabase schema: tables, RLS policies, indexes, storage bucket
├── middleware.ts                  # ** Request pipeline ** — security assessment, Arcjet, auth redirects
├── next.config.ts                # CSP headers, server externals, image patterns, 10MB body limit
├── tailwind.config.ts            # Custom colors, glass shadow, hero-glow gradient
└── docs/                         # PRD brief, launch checklist, Arcjet/music player setup guides
```

## Key Abstractions

### 1. `middleware.ts` — Security + Auth Pipeline
- **File**: `middleware.ts` (1-105)
- **Responsibility**: Runs on every non-static request. Assesses the request with Mind Security Engine (local pattern matching against SQLi/XSS/path traversal/bot patterns, in-memory rate limiting), then checks with Arcjet (shield, bot detection, sliding window 220/min). If the local engine flags suspicious behavior, it either returns 403/429 or redirects to `/security-check` for a human challenge. Then handles Supabase auth — redirects unauthenticated users away from protected routes, and redirects authenticated users away from `/auth` and `/`.
- **Key behavior**: The security check runs even on API routes. Static assets (`/_next`, `/favicon`, `/robots`, `/sitemap`, file extensions) are exempt from security checks. The Arcjet protection is only active when `ARCJET_KEY` is set.
- **Used by**: All requests (Next.js middleware matcher excludes `_next/static`, `_next/image`, favicon, and common image/css/js extensions)

### 2. `StudyWorkspace` — Main Workspace Component
- **File**: `components/dashboard/StudyWorkspace.tsx` (~3900 lines)
- **Responsibility**: The entire client-side workspace UI. Contains state for sessions, files, chat, tools, timer, music, canvas annotations, study metrics, workspace tabs, split view, source modals, tool modals, file previews, and desktop layout resizing.
- **Key methods**: `runAI()` (calls `/api/ai/generate`), `submitChatQuestion()` (streaming chat via `/api/chat`), `uploadFiles()`, `importWebSource()`, `startStudyTimer()`, `exportCurrentResultAsJson/Pdf()`, canvas drawing/crud operations.
- **Lifecycle**: Mounted after auth+onboarding check on `/dashboard/workspace` and `/studio`. Loads preferences on mount, restores last studio if `rememberLastStudio` is true, auto-creates "My First Studio" if none exist.
- **Used by**: `app/dashboard/workspace/page.tsx` and `app/studio/page.tsx` (server components pass initial data)

### 3. `generateWithFallback()` — AI Inference
- **File**: `lib/ai/fallback.ts`
- **Responsibility**: Core AI orchestration. Takes an `AIRequest`, normalizes it, checks the in-memory cache (30-min TTL, keyed by mode + message + context hash), then routes to the selected primary provider. If the primary fails or returns a bad/empty response, iterates through a fallback chain (order depends on whether a remote provider is required). Validates responses for "badness" — empty, `[object object]`, reasoning leaks, ungrounded summaries. Caches successful responses.
- **Key behavior**: Uses `extractStructuredOutput()` to strip reasoning preamble and extract JSON payloads. Tracks failures per provider for error reporting. For tool actions (summary, quiz, flashcards, etc.), a remote provider is strictly required.
- **Used by**: `app/api/ai/generate/route.ts` (the POST endpoint)

### 4. `buildStudyContext()` — Source Selection
- **File**: `lib/ai/source-context.ts`
- **Responsibility**: Given an array of source files and a query, selects the most relevant chunks to feed as context to the AI. Sanitizes text, splits into ~520-char chunks, scores each chunk against query terms (with question-number bonus for exam queries), then picks the top-scoring chunks up to `maxCharacters`/`maxChunks` limits (varies by action — notes get more context). Falls back to concatenating first 1200 chars of up to 4 files if no chunks are relevant.
- **Key invariants**: No more than 4 chunks per file. First chunk of each file gets a +1 score bonus. Question references (Q4, question 12b) get +9 score. English stop words are filtered from query tokens.
- **Used by**: `StudyWorkspace` (`buildContextForPrompt()` → `buildStudyContext()`)

### 5. `buildPrompt()` — Prompt Construction
- **File**: `lib/ai/prompt.ts`
- **Responsibility**: Builds the system prompt for each AI action type. Clips context to action-specific limits (notes: 24k chars, exam: 14k, others: 9k). Provides action-specific style hints — flashcards must return JSON, notes return structured JSON with optional science simulation spec, chat replies like a patient tutor with specific behaviors (don't reveal answers for quiz help, use markdown tables, mermaid diagrams, KaTeX math). Global rules enforce conciseness, grounding, no reasoning traces, no mention of instructions.
- **Used by**: The provider implementations (via `generateWithFallback` → provider's `generate()` method)

### 6. `searchWebSources()` — Web Source Search
- **File**: `lib/sources/web.ts`
- **Responsibility**: Multi-engine academic search. The "scholar" engine simultaneously queries: OpenAlex, Crossref, Semantic Scholar, arXiv, Wikipedia, and a curated list of trusted learning hosts (OpenStax, Khan Academy, BBC, Britannica, etc.). Results are deduplicated, scored by trust label and relevance, then enriched via Readability extraction or Jina.ai reader fallback. Falls back through Google Custom Search → DuckDuckGo → Bing RSS if preferred engines fail.
- **Key behavior**: Trust labels are assigned based on domain: `.edu`/`.gov`/Wikipedia/etc. = "Verified", open-access academic = "Scholar", `.org` = "Trusted", everything else = "Web". This labeling is used in the workspace UI to surface source quality.
- **Used by**: `app/api/sources/search/route.ts`

### 7. `assessRequest()` — Mind Security Engine
- **File**: `lib/security/mind-security.ts`
- **Responsibility**: Local security evaluation before requests reach app routes. Scores requests based on missing user-agent (+25), known scanner/bot user agents (sqlmap, nikto, acunetix, curl, wget — +35), SQLi/XSS/path traversal/credential-exposure patterns in URL (+55). If score ≥ 70, blocks immediately (403). If score ≥ 35, issues a human verification challenge (redirects to `/security-check`). Also includes in-memory token-bucket rate limiting (220 req/min).
- **Key behavior**: Uses a rolling in-memory `Map<string, number[]>` for rate limit tracking. The challenge cookie (`mse_verified`) bypasses the challenge tier. The cookie is only set after completing `/security-check`.
- **Used by**: `middleware.ts`

### 8. `reserveAiUsage()` / `reserveChatUsage()` / `reserveExamUsage()` — Usage Rate-Limiting
- **File**: `lib/ai/limits.ts`
- **Responsibility**: Two-tier rate limiting: (1) in-memory `Map` for stateless quick checks, (2) Supabase `study_ai_usage` table for persisted per-user limits. Supports multiple scopes: `general`, `chat`, `tool`, `exam`, `exam_practice`. Hourly/daily/windowed (weekly for exams) limits. Reservation-based — a token is created on allocation and released on error. Limits fall back to in-memory only if Supabase is unavailable.
- **Key behavior**: The in-memory store is a simple `Map<string, UsageEntry[]>` with pruning. Persisted mode uses Supabase `INSERT` + `SELECT` with `DELETE` for release. Releases are best-effort (catch-and-ignore on failure).
- **Used by**: `app/api/ai/generate/route.ts`, `app/api/chat/route.ts`

### 9. `RichStudyText` — Markdown Renderer
- **File**: `components/dashboard/RichStudyText.tsx`
- **Responsibility**: Renders AI-generated markdown content with KaTeX math ($...$ and $$...$$), mermaid diagrams (```mermaid code blocks), and GFM tables. Uses `react-markdown`, `remark-math`, `rehype-katex`, `remark-gfm`. Mermaid blocks are rendered client-side via the mermaid library. KaTeX CSS is imported at the component level.
- **Context**: This is a thin rendering layer — it doesn't process or transform content, just displays it.

### 10. `app/api/chat/route.ts` — Streaming Chat
- **File**: `app/api/chat/route.ts`
- **Responsibility**: The only real-time streaming endpoint. Uses OpenRouter exclusively (not the multi-provider fallback chain of `/api/ai/generate`). Accepts a message with context and screen context, constructs a system prompt (tutor behavior rules, quiz/exam guidance protocol), sends to OpenRouter with key rotation (up to 10 keys), and streams SSE responses. Includes rate-limit check per user.
- **Key behavior**: Appends `reasoning: { exclude: true }` and `include_reasoning: false` to suppress model reasoning traces. Uses `nvidia/nemotron-3-super-120b-a12b:free` as default model. If a key hits rate/credit limits, rotates to the next key.
- **Used by**: `StudyWorkspace.submitChatQuestion()`

## Data Flow

### Primary flow: User generates a study tool (e.g., "Summary")

1. User clicks "Summary" in workspace → `openTool("summary")` → sets action, opens tool modal
2. User clicks "Generate" → `generateSelectedTool()` → calls `runAI("summary", toolPrompt)`
3. `runAI()` calls `buildContextForPrompt()` which calls `buildStudyContext()` to select ~6500 chars of source context
4. `runAI()` calls `buildToolPrompt()` to construct the action-specific prompt with source list and focus
5. `runAI()` POSTs to `/api/ai/generate`:
   - Request validated with Zod schema
   - Supabase auth check (requires user)
   - Rate limit reservation (`reserveAiUsage()` with scope "tool")
   - Calls `generateWithFallback()`:
     - Normalizes input
     - Checks in-memory cache (keyed by v:9, mode, examMode, message, contextHash)
     - Routes to provider via `selectProvider()` (prefers OpenRouter v2 for most tools, then Groq v2, then Gemini, etc.)
     - Falls through chain if response is bad/empty
     - Validates: not empty, not `[object object]`, no reasoning leaks, grounded in context for summaries
     - Caches and returns
   - On success: telemetry event logged, response returned with remaining usage counts
   - On failure: releases reservation token, throws error
6. `runAI()` processes response: `extractStructuredOutput()`, saves to state, saves to tool history, opens workspace tab, updates study metrics

### Secondary flow: Chat (streaming)

1. User types message in workspace chat → `submitChatQuestion()`:
2. Command detection first: timer commands, music commands, workspace navigation (`executeWorkspaceNavigation`), canvas assist (`applyCanvasAssist`), tool requests from chat (`detectChatToolRequest` → `runAI()`)
3. For actual tutor questions: builds enriched prompt with conversation history, study performance summary, student profile, source context, screen context
4. POSTs to `/api/chat`:
   - Auth check, rate limit, builds system prompt with context/screenContext
   - Sends to OpenRouter with all available keys (rotation on rate/credit errors)
   - Returns SSE stream
5. Client reads SSE chunks, parses `data: {choices: [{delta: {content}}]}` lines, accumulates text, updates chat message state in real-time
6. Chat history is persisted to Supabase via debounced POST to `/api/chat-history`

### Secondary flow: File Upload

1. User drags files or clicks "Add notes" → `uploadFiles()`:
   - Validates: max 50MB per file, supported types (PDF, text, markdown, images)
   - Creates session if none exists
   - POSTs to `/api/upload` with FormData (sessionId + files)
   - Server: uploads to Supabase Storage (`study-files` bucket, `{userId}/{fileName}`), runs extraction pipeline (pdf-parse/mammoth/xlsx for text, tesseract.js for OCR), inserts `study_files` record
   - Response: updated file list, rejection warnings
   - Client: updates `filesBySession` state, closes source modal if successful

## Non-Obvious Behaviors & Design Decisions

### Hidden Invariants

1. **A workspace requires at least one source-enabled file** to generate tools or chat. If `sourceEnabledCount === 0`, the source modal auto-opens after 450ms delay (per session). Tools/generate buttons are visually "locked" but still clickable — clicking them opens the source modal instead.

2. **The in-memory AI cache** (`lib/cache.ts`) has a 30-minute TTL and is keyed by `v:9, mode, examMode, message, contextHash`. The context hash is an MD5 of the source context — this means if a user uploads new files and regenerates, the hash changes and the cache misses. But identical prompts with identical context will hit cache, even across users. This is a potential cross-user leak (content-based, not user-based). Cache key version `v:9` implies multiple format migrations have occurred.

3. **All rate limits are enforced via reservation tokens** — a token is created before the AI call and released on failure. This prevents race conditions but means failed calls still "reserve" a slot until released. Supabase-backed reservations survive server restarts; in-memory ones do not.

4. **The Mind Security Engine is always active** (even without Arcjet) — it runs before Arcjet and can block/challenge requests independently. The `mse_verified` cookie bypasses challenges but not blocks.

5. **The `/studio` and `/dashboard/workspace` routes are duplicate entry points** to the same `StudyWorkspace` component with identical data-fetching logic. Both redirect to `/onboarding` if onboarding is incomplete, create "My First Studio" if no sessions exist.

### Design Decisions

1. **Why a separate `/api/chat` endpoint instead of using the multi-provider fallback**: The chat endpoint needs SSE streaming for real-time token delivery, which only OpenRouter supports reliably among the configured providers. The tool generation endpoints (`/api/ai/generate`) don't need streaming and benefit from the fallback chain.

2. **Why in-memory rate limits with Supabase fallback**: The in-memory `Map` provides zero-latency checks for quick requests. The Supabase table provides durability across deploys and scales with user base. The two are not synchronized — a user could be denied by in-memory (if process has seen their requests) but allowed by Supabase (empty DB), or vice versa. The effective limit is the lower of the two.

3. **Why OpenRouter key rotation**: OpenRouter's free-tier models have strict rate limits and can return 402/429 errors. Rotating through up to 10 keys provides resilience without exposing paid rate limits. The `isOpenRouterKeyLimitError()` function checks for 401/402/403/429 and key-related error messages.

4. **Why scholar-first search**: The default search engine is "scholar" which queries academic APIs (OpenAlex, Crossref, Semantic Scholar, arXiv) plus trusted learning sites. Google Custom Search is a fallback. This prioritizes source quality over breadth for academic reliability. The trust label system (Verified → Scholar → Trusted → Web) is displayed in the UI to help students assess source quality.

5. **Canvas + annotation layer**: The workspace includes an SVG overlay for freehand drawing and positioned text annotations. This is hidden behind canvas tabs and is primarily useful for stylus/Apple Pencil/S-Pen users. Annotations and strokes are included in the screen context sent to the AI tutor, making them visible to chat.

6. **The massive single component (`StudyWorkspace.tsx`)**: At ~3900 lines, this file handles everything — chat, tools, files, timer, music, canvas, split view, modals, preferences, keyboard shortcuts, drag-and-drop, study metrics, exports, revision schedule integration. This is a significant technical debt. It was likely built rapidly to ship features without refactoring into sub-components.

### State Management

- **No global state library** (no Redux, Zustand, Jotai) — all state is local `useState` / `useCallback` / `useMemo` inside `StudyWorkspace`. This means:
  - Props drilling: 4-6 layers deep for some callbacks
  - Large re-render surface: any state change can re-render the entire component
  - `useMemo`/`useCallback` is used extensively to mitigate this

- **localStorage as persistence** for: chat threads (per session), recent websites, music state, theme/motion preferences, last studio ID, panel widths, source clipboard, focus music state. This creates a "local-first" feel but can diverge from server state.

- **Session-scoped state**: Files, tool history, metrics, preferences are all keyed by `activeSessionId` in their respective state objects (`filesBySession`, `toolHistoryBySession`, `metricsBySession`). Switching sessions resets chat and output but preserves per-session data.

### Error Propagation

- **AI errors** are caught at the API route level, normalized via `normalizeErrorMessage()`, and returned as JSON with a `400`/`429` status. The client displays them in a `statusNote` bar.
- **Supabase errors** are caught and formatted through `formatSupabaseSetupError()` which detects missing schema/storage setup and gives setup instructions.
- **Unreachable providers** cascade through `generateWithFallback()`'s fallback chain. If all fail, the final error includes the first 3 failure reasons.
- **Rate limit errors** (429) return specific `formatAiLimitMessage()` / `formatChatLimitMessage()` / `formatExamLimitMessage()` strings.

### Performance-Sensitive Paths

- **Image loading**: `lib/performance.ts` provides device-aware quality reduction (low-end: 40%, medium: 60%, high: 80%) and lazy loading via intersection observer.
- **CSS containment**: The `containmentStyles` and `willChangeStyles` objects are exported but not used in any component — they appear to be utilities awaiting integration.
- **Canvas rendering**: The SVG canvas re-renders on every pointer move during drawing (`setActiveCanvasStroke` → re-render). With ~120 strokes × hundreds of points, this could be a perf concern. The component truncates strokes to 120 and points aren't capped.
- **Chat viewport scrolling**: `scrollTo({ behavior: "smooth" })` is called on every message update, which can be expensive for long conversations.

## Module Reference

| File | Purpose |
|------|---------|
| `middleware.ts` | Security + auth middleware — runs on all non-static requests |
| `app/layout.tsx` | Root layout — injects theme/motion boot script, wraps providers |
| `app/page.tsx` | Landing page — Three.js hero, feature showcase, FAQ, CTA |
| `app/dashboard/workspace/page.tsx` | RSC that creates session, fetches files/settings/onboarding, renders StudyWorkspace |
| `app/studio/page.tsx` | Identical to dashboard/workspace (separate route alias) |
| `components/dashboard/StudyWorkspace.tsx` | The entire workspace UI (~3900 lines) |
| `components/dashboard/RichStudyText.tsx` | Markdown renderer with KaTeX + mermaid |
| `components/dashboard/AINotesConsole.tsx` | Structured AI Notes display |
| `lib/ai/fallback.ts` | Core AI orchestration — primary + fallback chain + caching + validation |
| `lib/ai/router.ts` | Provider selection logic |
| `lib/ai/prompt.ts` | System prompt builder per action type |
| `lib/ai/limits.ts` | Two-tier rate limiting (memory + Supabase) |
| `lib/ai/preview.ts` | Default limit constants |
| `lib/ai/cache.ts` | In-memory response cache (30-min TTL) |
| `lib/ai/source-context.ts` | Chunked, scored source context selection |
| `lib/ai/strip-reasoning.ts` | Post-process: strip reasoning, extract JSON |
| `lib/ai/parse.ts` | Flashcard parsing (JSON → Q:/A: fallback) |
| `lib/ai/util.ts` | Text/error normalization utilities |
| `lib/ai/openrouter-keys.ts` | Multi-key rotation for OpenRouter |
| `lib/security/mind-security.ts` | Local security assessment engine |
| `lib/sources/web.ts` | Multi-engine web source search + extraction |
| `lib/db/queries.ts` | Supabase query helpers |
| `lib/supabase/server.ts` | Server Supabase client factory |
| `lib/site-settings.ts` | Dynamically configurable site-wide settings (limits, maintenance) |
| `lib/documents/parser.ts` | Document text extraction pipeline |
| `lib/cache.ts` | Shared in-memory cache (used by AI and general) |
| `types/index.ts` | Shared types (AIAction, AIRequest, StudySession, StudyFile) |
| `supabase/schema.sql` | Full database schema + RLS + storage bucket |
| `next.config.ts` | Next.js config with security headers and server externals |

## Suggested Reading Order

1. **`middleware.ts`** — Start here to understand the security and auth pipeline. Everything flows through this.
2. **`lib/ai/types.ts` + `lib/ai/router.ts` + `lib/ai/fallback.ts`** — Core AI orchestration architecture. Understand provider selection and fallback before diving into prompts.
3. **`lib/ai/prompt.ts`** — Prompt construction. This defines what each tool does and how the AI is instructed. Critical for understanding study tool behavior.
4. **`lib/ai/limits.ts`** — Rate limiting architecture. Essential for understanding the usage guardrails.
5. **`app/api/ai/generate/route.ts` + `app/api/chat/route.ts`** — The two primary API endpoints. See how rate limits, auth, and AI orchestration connect.
6. **`components/dashboard/StudyWorkspace.tsx`** — The big one. Read sections: tool generation flow, chat submission, file upload, and state management patterns. This is where everything comes together.
7. **`lib/sources/web.ts`** — Web source search system. Understanding the scholar-first search and trust labeling helps with the workspace source modal.
8. **`lib/security/mind-security.ts`** — Local security engine. Complements what middleware.ts does.
9. **`supabase/schema.sql`** — Database schema with RLS policies. Essential for understanding data ownership and query patterns.
10. **`lib/documents/parser.ts` + `lib/documents/formats.ts`** — Document parsing pipeline. Important for the upload flow.
