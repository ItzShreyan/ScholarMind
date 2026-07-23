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
- Study tools now require live remote AI for generated outputs instead of falling back to generic local placeholder text.
- Tool generation no longer opens the generic AI Output tab before the real generated result tab, reducing duplicate tab confusion.
- Workspace generated-output tabs now keep up to 16 recent tabs so new generations do not immediately evict older tabs.
- Tool prompts were tightened so Summary, AI Notes, Flashcards, Quiz, and Exam Generator produce final student-facing material instead of source metadata or AI context dumps.
- Exam Generator now asks for original exam-board-style papers/practice questions and explicitly avoids copying real past-paper questions.
- Tutor-triggered tool requests can run the relevant tool and open the generated output as a Studio tab.
- Add Notes modal is upload-only; web research stays in the Studio workspace search flow instead of being mixed into note uploads.
- Music player no longer shows fake placeholder playlists/tracks; it shows “No music playing” until Spotify is connected.
- YouTube Music and SoundCloud are visibly unavailable/unclickable in the product UI.
- Spotify connect now starts from `/api/music/spotify/login` instead of sending users to the Spotify developer dashboard.
- Dashboard music dock now shares the same no-placeholder/disabled-provider behavior as the Studio music bar.
- Studio workspace has a real fullscreen toggle alongside Tutor Focus.
- Tutor screen-context usage now shows an animated workspace glow/pulse so users can see when screen context is being used.
- The main ScholarMind logo was redesigned from a simple letter mark into a brain/orbit study mark.
- TypeScript verification passed after the latest Studio/music/tool changes.
- Production build passed after the latest Studio/music/tool changes.
- Live production-server AI tool probe passed for Quiz, Summary, Flashcards, AI Notes, and Exam Generator using OpenRouter.
- Added `npm run verify:ai-tools` as a reusable release check for AI tool output shape and `[object Object]` regressions.
- Final production build passed after adding the reusable AI tool verifier and Spotify music routes.
- Canvas mode now has active mouse/text/highlight/draw controls that create visible, removable annotations inside the workspace.
- Canvas annotations are included in tutor screen context so the AI can respond to visible student notes.
- Studio split view now has a visible Split View selector panel with animation, not only a hidden right-click shortcut.
- Studio workspace tabs can be dragged onto animated left/right drop zones to create or rearrange split view.
- AI Tutor now has a Recent chats drawer for restoring and deleting saved chat snapshots in the current studio.
- Added `npm run verify:uploads` to check advertised upload formats, parser hooks, OCR hooks, size limits, ownership checks, and unsafe-file rejection plumbing.
- Upload verification passed for the supported-format plumbing: PDF, image/OCR, DOCX, spreadsheets, CSV/text, and unsafe file checks.
- TypeScript and production build passed after the canvas, split-view, recent-chat, and upload-verification updates.
- Browser/tab identity now uses `public/scholarmind-icon.svg`, wired through Next metadata for favicon/shortcut/apple icon support.
- PPTX and ODP presentations are accepted, signature-checked, parsed through JSZip, cleaned, and included in the upload verifier so AI chat/tools can read slide text.
- Canvas mode now supports freehand pointer strokes for Draw and Highlight, including Apple Pencil/S-Pen-style stylus input through Pointer Events and `touch-action` handling.
- Canvas drawings are included in tutor screen context alongside text annotations.
- Rich AI output now renders common exponent notation like `4^2` as superscript, supports inline formula styling, keeps tables/diagrams, and displays code blocks in a dedicated code panel with the warning “AI Code Output May Make Mistakes.”
- `jszip` is now an explicit dependency for Office/OpenDocument presentation parsing.
- Upload-format verification passed after adding PPTX/ODP support.
- TypeScript verification passed after presentation, favicon, rich-output, and freehand-canvas changes.
- Production build passed after presentation, favicon, rich-output, and freehand-canvas changes.
- Local production-server AI tool verification passed for Quiz, Summary, Flashcards, AI Notes, and Exam Generator using OpenRouter.


## Remaining Product Polish / Manual QA

- Do a signed-in browser QA pass with a real uploaded note to confirm the UI opens exactly one canvas output tab per tool and tutor-triggered tool generation behaves the same way. Local API/tool verification passed, but this still needs a browser click-through.
- Run real sample uploads for PDF, image, DOCX, PPTX, ODP, spreadsheet, CSV/text, and image-heavy PDF files against Supabase storage in the deployed environment.
- Spotify OAuth starts correctly, but full playback needs encrypted token storage and provider playback SDK work before it can browse/play account music inside ScholarMind.
- SEO copy/design can continue improving from Search Console impressions after launch.
- Performance watch item: continue monitoring cold starts and interaction speed on deployed Netlify/Supabase; current production build passes and no longer reported the earlier webpack cache warning in the latest run.
