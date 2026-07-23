# ScholarMind Product Requirements & Launch Brief

**Version:** ScholarMind 1.0 public-release brief  
**Generated:** 2026-06-25  
**Positioning:** AI tutor workspace that turns student notes, PDFs, images, slides, spreadsheets, and trusted web sources into grounded explanations, AI Notes, quizzes, flashcards, mock exams, canvas annotations, and revision plans.

## Executive Summary

ScholarMind is a student-first AI study companion for learners who need to move from messy course material into active revision. Unlike generic chatbot workflows, ScholarMind keeps work inside source-grounded Studios: students upload or import notes, then ask a personalised tutor, generate study tools, annotate canvas tabs, and continue revision across devices.

## Market Signals

- Grand View Research reports the global AI in education market was valued at **USD 8.3B in 2025** and projects **USD 57.2B by 2033** at **25.9% CAGR**.
- Grand View Research projects e-learning services to reach **USD 1.485T by 2033** with **19.9% CAGR from 2026 to 2033**.
- Grand View Research reports mobile learning generated **USD 95.3B in 2025** and is expected to reach **USD 392.2B by 2033**.
- Quizlet reported **over 60M monthly users**, showing large demand for digital study tools and active recall workflows.

## Product Pillars

1. Source-grounded learning: every serious answer starts from enabled study sources.
2. Personalised AI tutor: onboarding profile shapes curriculum, country, exam board, tier, subjects, goals, and style.
3. Active revision tools: AI Notes, summaries, quizzes, flashcards, exam practice, schedules, and canvas work.
4. Studio workflow: a notebook-style workspace with tabs, split view, canvas, chat history, and saved outputs.
5. Safety and trust: Supabase auth/RLS, upload validation, usage limits, Mind Security Engine, and optional Arcjet.

## Current Product Scope

- 25 app pages and 24 API routes.
- Supabase-backed auth, studios, files, chat history, reminders, onboarding, usage tracking, subscriptions, telemetry, site settings, and revision plans.
- Upload support: PDF, images, DOCX, PPTX, ODP, spreadsheets, CSV/TSV, markdown, JSON, XML, HTML, RTF, TXT.
- OCR support for images and image-heavy PDFs.
- OpenRouter key rotation with up to 10 keys and live AI-only study tools.
- Canvas mode with text annotations, highlighter/draw tools, stylus support, and AI screen context.
- SEO routes for AI study assistant, study tools, flashcards, quiz maker, revision planner, exam preparation, homework help, study techniques, online learning, and academic success.

## Feature Requirements

### Studio
- Users can create, rename, delete, and switch Studios.
- Each Studio contains notes, source-enabled controls, AI tutor chat, generated outputs, and recent chats.
- Workspace tabs open notes, sources, search results, AI outputs, canvas tabs, quizzes, and exams.
- Split view supports selector, right-click pinning, and drag-to-left/right split placement.

### AI Tutor
- Tutor supports casual greetings but switches to source-grounded step-by-step learning for study questions.
- Tutor can suggest and trigger tools.
- Tutor avoids giving quiz/exam answers too early; it guides with hints and method first.
- Tutor can use visible workspace context, current notes, canvas annotations, and generated outputs.

### Study Tools
- Summary: concise revision-ready markdown.
- AI Notes: long textbook-style notes with sections, formulas, callouts, worked examples, practice questions, diagrams, and science simulations only when useful.
- Flashcards: active-recall cards.
- Quiz: interactive multiple-choice questions with answer/explanation and results table.
- Exam Generator: practice-question mode or longer exam-style mock paper with marks and mark scheme.

### Notes & Uploads
- Uploads are validated for size, file signature, ownership, and unsafe extensions.
- Extracted text is cleaned to remove code junk, metadata, URLs, furniture text, placeholder fragments, and repeated artifacts.
- Users can delete notes and exclude notes from AI/tools/revision.

### Security
- Mind Security Engine adds request scoring, suspicious pattern checks, rate limiting, challenge routing, and security headers.
- Supabase Row Level Security keeps user data account-scoped.
- Host panel is restricted to `shreyanmadi@gmail.com`.

## Differentiation

- NotebookLM-like source grounding plus student-specific active-recall tools.
- Medly-style tutor direction, but with uploaded-source Studio context and canvas annotations.
- Quizlet-like flashcards/quizzes, but generated from personal notes and linked to tutor help.
- Long-form AI Notes and science simulations in the same workspace, not separate exports.
- Built-in launch SEO, security badge, privacy/terms, sitemap, robots, and host analytics.

## Go-To-Market Message

**Tagline:** Turn your notes into a personal AI tutor.  
**Primary promise:** Upload notes once; revise with explanations, AI Notes, quizzes, flashcards, mock exams, and schedules grounded to your material.  
**Audience:** GCSE/A-Level/high-school students, university students, adult learners, online course takers, and exam revisers.

## Advertisement Angles

- “Stop rereading notes. Turn them into quizzes, flashcards, and mock exams.”
- “Ask an AI tutor that actually knows your class notes.”
- “From PDF to practice questions in one Studio.”
- “Revise with a tutor, not a blank chatbot.”
- “For students drowning in notes before exams.”

## KPIs

- Activation: first note uploaded/imported.
- Aha moment: first AI tool generated from a source.
- Retention: return to same Studio within 7 days.
- Learning depth: quiz completion rate, flashcard flips, exam attempts, schedule completions.
- Quality: AI output thumbs-up/down, regenerated output rate, source unreadable rate.
- Growth: SEO impressions, landing conversion, referrals, share/export events.

## Launch Readiness

Passed local release checks:
- TypeScript typecheck.
- Production build.
- Upload verifier.
- Local production AI tool verifier for Quiz, Summary, Flashcards, AI Notes, and Exam Generator.

Remaining manual QA:
- Signed-in browser pass with a real uploaded note.
- Deployed Supabase sample uploads across PDF, image, DOCX, PPTX, ODP, spreadsheet, CSV/text, and image-heavy PDF.
- Spotify full playback requires encrypted token storage, refresh tokens, and Web Playback SDK. Spotify free accounts have limited playback; Premium is generally required for full playback.

## Sources

- Grand View Research, AI in Education Market: https://www.grandviewresearch.com/industry-analysis/artificial-intelligence-ai-education-market-report
- Grand View Research, E-learning Services press release: https://www.grandviewresearch.com/press-release/global-e-learning-services-market
- Grand View Research, Mobile Learning statistics: https://www.grandviewresearch.com/horizon/statistics/e-learning-services-market/learning-method/mobile-learning/global
- PR Newswire, Quizlet AI tools release: https://www.prnewswire.com/news-releases/quizlet-launches-advanced-ai-powered-tools-for-next-gen-studying-301895290.html
