# ScholarMind Launch Polish Checklist

This is the working checklist from the launch-readiness prompt so future passes can recover context quickly.

## Done / Started

- OpenRouter backend now has a shared key helper in `lib/ai/openrouter-keys.ts`.
- `/api/chat` uses OpenRouter key rotation.
- `openrouter_v2` tool provider uses OpenRouter key rotation, source context, and reasoning exclusion.
- `.env.local` has optional OpenRouter backup placeholders up to `OPENROUTER_API_KEY_10`.
- Settings default tool selection UI has been removed.
- Settings curriculum profile now links to redo the personalisation quiz.
- Onboarding includes adult/non-school testing options.
- Studio has extra bottom padding so the fixed music bar does not overlap scrolled workspace content.
- Study timer has visible interval/regular mode support, constrained break values, no resume/reset before start, and a break popup.
- Studio implementation labels “Rebuilt Studio” and “Chrome-style tabs” were removed from visible copy.
- Exam generator has a practice-question mode as an alternative to a full mock.
- AI tutor has an animated idle orb and example prompts.
- Workspace screen-awareness pulse is triggered while the tutor is using screen/source context.
- Workspace Home has internal source search that opens results as Studio Workspace tabs.
- Workspace supports right-click split view for internal tabs with adjustable width.
- AI tutor fullscreen mode exists and can exit.
- Music providers are Spotify, YouTube Music, and SoundCloud only.
- Tool context already includes onboarding/personality profile via `buildContextForPrompt`.
- Supabase schema includes `study_chat_messages` for account-backed studio chat history.
- `/api/chat-history` loads/saves per-studio chat history and soft-fails if the SQL has not been applied yet.
- Studio AI tutor has a New chat button.
- Music setup documentation exists in `docs/music-player-setup.md`.
- Mind Security Engine foundation exists with local suspicious-request checks, security headers, human verification, and optional Arcjet middleware protection.
- `ARCJET_KEY` setup documentation exists in `docs/arcjet-key-setup.md`, and `.env.local` has a blank `ARCJET_KEY` slot.
- `/api/chat` now requires a signed-in user and uses OpenRouter backup key rotation.
- `/api/upload` checks studio ownership before saving files and rejects mismatched/unsafe file signatures.
- `/api/telemetry` has a local rate limit so telemetry cannot be spammed.
- Web-source imports reject sources that cannot provide enough readable article text.
- Web-source article extraction strips links, code, navigation, cookie/policy text, and other article junk before saving or previewing.
- Supabase subscription policies allow users to read their own subscription state while keeping writes host-only.
- Landing page has a Mind Security Engine section and “Secured by” badge.
- Privacy and Terms pages now exist and are included in the sitemap.
- Music setup docs now warn that SoundCloud account linking is unavailable without the required access path, and that the YouTube value must be a real API key rather than an OAuth client ID.
- TypeScript verification passed with `./node_modules/.bin/tsc --noEmit --pretty false --incremental false`.
- Production verification passed with `npm run build` after the privacy/terms prerender fix.
- Source search/import is account-protected, stores imported web sources as studio sources, and users can delete or disable files from the source stack.
- Landing page was updated around tutor/study outcomes, free preview limits, source-grounded tools, and Mind Security Engine protection.
- SEO infrastructure is active through `app/sitemap.ts` and `app/robots.ts`; sitemap includes public SEO pages plus Privacy and Terms.
- Tools: build passes, but do a signed-in browser QA pass for Summary, AI Notes, Flashcards, Quiz, and Exam Generator using a real source and the production OpenRouter key.
- Tutor-triggered tools: the tutor can guide/tool-suggest, but full autonomous “run this tool from chat and open a workspace tab” still needs deeper command routing QA.
- Dashboard music persistence: Studio music player exists and avoids overlap, but dashboard-level cross-page playback is still a future polish item unless moved into a shared provider/layout.
- SEO pages: public SEO routes exist and build, but copy/design can still be refined over time based on Search Console impressions.
- Provider integrations: Spotify can be configured; YouTube Music and SoundCloud should stay limited/unavailable until valid provider access is available.


## Remaining Product Polish / Manual QA

- Tools: build passes, but do a signed-in browser QA pass for Summary, AI Notes, Flashcards, Quiz, and Exam Generator using a real source and the production OpenRouter key.
- Tutor-triggered tools: the tutor can guide/tool-suggest, but full autonomous “run this tool from chat and open a workspace tab” still needs deeper command routing QA.
- Dashboard music persistence: Studio music player exists and avoids overlap, but dashboard-level cross-page playback is still a future polish item unless moved into a shared provider/layout.
- SEO pages: public SEO routes exist and build, but copy/design can still be refined over time based on Search Console impressions.
- Provider integrations: Spotify can be configured; YouTube Music and SoundCloud should stay limited/unavailable until valid provider access is available.
