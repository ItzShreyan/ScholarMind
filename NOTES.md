# ScholarMind — implementation notes

Branch: `redesign/learning-world` (off `main`, HEAD `2ab3648`).

This file records what was built, why each decision was taken, and what is
deliberately left undone. It is updated as the work proceeds, not written at the
end.

---

## 1. Starting point

Measured before any change, so every later number has a baseline:

| Check | Baseline |
| --- | --- |
| `npm run typecheck` | clean |
| `npm run build` | succeeded |
| Shared First Load JS | 103 kB |
| `/studio` page | 152 B wrapper, 447 kB total |
| `/dashboard` | 158 kB |
| Routes | 71 |

Two pre-existing build warnings were noted and **not** introduced here:

- `./lib/security/mind-security.ts` — "Critical dependency: the request of a
  dependency is an expression".
- Unused variables in `app/dashboard/page.tsx` (`checkSpotifyConnected`),
  `app/security/page.tsx` (`ExternalLink`),
  `components/dashboard/BeatReactiveBorder.tsx` (`glowId`),
  `components/dashboard/DynamicIslandMusicPlayer.tsx`, plus an
  exhaustive-deps warning on `playNextByRef`.

### A real bug found during reconnaissance

`openai/gpt-oss-20b:free` was the repo's default study model. That model **no
longer exists on OpenRouter**, so AI Notes, quizzes, flashcards and exam
generation would have failed with a 400 for every user. Verified against
`GET https://openrouter.ai/api/v1/models`. Fixed as part of the model registry
below — every model id now lives in exactly one place.

---

## 2. Foundations

### `lib/motion.ts` — one source of truth for motion

`duration` (instant / fast / base / slow / cinematic), `easing` (standard,
cinematic, exit, as bezier tuples), `spring` (gentle, snappy), `transition`,
`distance`, `stagger`, and `Variants` (`fadeUp`, `fadeIn`, `scaleIn`,
`staggerContainer`, `panelSwap`, `listItem`).

Hard rule recorded in the header comment: animate **`transform` and `opacity`
only**, and gate every animation through `useMotionTier()`.

### `lib/motion-tier.ts` — capability detection, React-free

React-free so `app/layout.tsx` can inline the same logic in a boot script that
runs before first paint.

- `MotionTier = "full" | "reduced" | "off"`
- `MotionPreference = "auto" | "reduced" | "off"`, key
  `scholarmind_motion_preference`
- `NARROW_VIEWPORT_PX = 768`, `LOW_CORE_COUNT = 4`, `LOW_MEMORY_GB = 4`
- `prefersReducedMotion()`, `readMotionPreference()`, `writeMotionPreference()`,
  `detectMotionTier()`, `applyMotionTier()`
- Reads `navigator.deviceMemory` and `navigator.connection.saveData` through a
  `NavigatorWithHints` cast, because neither is in the standard DOM lib.

`canRender3D` requires tier `full` **and** viewport ≥ 768px.

### `hooks/useMotionTier.ts` and `components/providers/MotionTierProvider.tsx`

The hook exposes context that defaults to the conservative value
(`tier: "reduced"`, `canRender3D: false`), so before hydration nothing heavy is
assumed. The provider owns the live tier, resolves the stored preference,
subscribes to `(prefers-reduced-motion: reduce)` change and to resize with an
rAF-throttled handler, and keeps `data-motion` on `<html>` in sync with the boot
script.

**Why `data-motion` and not a React class:** the CSS must be correct on the very
first paint. A boot script writes the attribute before hydration, mirroring the
theme boot script this repo already used.

### `app/globals.css`

Rewrote `:root` and `html.light` to the new palette and appended the design-token
layer: three surfaces, three text levels, amber primary accent (`--accent-coral`
`#DCA566`), cool blue secondary (`--accent-sky` `#88B7CE`), status tokens, radii,
spacing, type scale, `--editorial-*` tokens, block/step/tile/pill classes, and a
`data-motion` block that kills `backdrop-filter`, `blur-3xl/2xl`, infinite
decorative animations and `will-change` outside `full`.

Because the token **names** are unchanged, existing pages inherit the new palette
without being touched. That was deliberate: it kept the diff honest.

---

## 3. Models

### `lib/ai/models.ts` — the only place a model id may appear

- `ChatModelTier = "pro" | "flash"`, `ChatModelChoice = "auto" | ChatModelTier`
- `CHAT_MODELS` registry, `getModelChain`, `normalizeModelChoice`,
  `resolveChatModel`, `classifyChatPrompt`

Chosen from live OpenRouter data (free tier):

| Tier | Model | Env override |
| --- | --- | --- |
| Pro | `nvidia/nemotron-3-ultra-550b-a55b:free` | `OPENROUTER_PRO_MODEL` |
| Flash | `google/gemma-4-26b-a4b-it:free` | — |
| Vision | `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | — |

Study generation (notes, quizzes, flashcards, exams) always uses Pro: it is
heavy, structured-output work where a small model produces malformed JSON.
Conversation honours the Pro / Flash / Auto choice.

**Auto-routing is a pure function, `classifyChatPrompt`, that the client also
imports.** That is the key design decision: the picker's preview of what Auto is
about to do is computed by the same code the server uses, so the preview and the
decision can never disagree. Auto prefers Flash and escalates to Pro only for
heavy maths, proofs, code, multi-step reasoning, exam requests or long-context
note generation.

### `lib/ai/thinking.ts`

`ThinkingPhase`, `ThinkingStage`, `THINKING_STAGES` (reading → searching →
recalling → calculating → reasoning → checking → drafting),
`extractThoughtTagline(reasoning)`, `pickWaitingStage(elapsedMs)`. Pure
functions shared by the server route and the client, so the waiting label is
derived from real model output when reasoning is available.

### `lib/ai/openrouter-stream.ts`

Real token streaming with model **and** key fallback. `ProviderMessage`,
`ChatStreamEvent` (`{ type: "model" | "delta" | "error" }`), `StreamChatOptions`,
`streamChatCompletion`, `OPENROUTER_URL`, `DEFAULT_IDLE_TIMEOUT_MS = 45_000`.
`readDelta` handles both `delta.reasoning` and `delta.reasoning_details[].text`,
because providers differ.

### `app/api/chat/route.ts`

Rewritten. Accepts `modelChoice`, resolves the tier through the registry,
reserves and releases usage, and emits SSE frames with a `scholarMind` field
alongside `choices[0].delta` — the exact shape the existing client already
parsed, so no client parsing change was required for streaming to work.

Two deliberate choices:

1. **Peek the first event before constructing the `Response`.** If the first
   event is an error, we can still return a proper non-200 JSON error and
   release the reserved usage, instead of opening a 200 stream that immediately
   dies. This preserves the client's existing `response.ok` handling.
2. **Gemini is a last resort, and only before anything has been streamed.** It
   can never restart an answer the student is already reading.

---

## 4. Answer formatting

The old system prompt allowed ASCII-art diagrams in replies. Both are fixed.

### `lib/ai/prompts/chat-system.ts`

`CHAT_BLOCK_LANGUAGE` and the system prompt, including an explicit contract for
five fenced block languages and an instruction never to draw a diagram in ASCII.

### `components/dashboard/chat-blocks/`

| File | Purpose |
| --- | --- |
| `parse.ts` | Tolerant parsers — `parseSteps`, `parseAnswer`, `parsePractice`, `parseCheck`, `parseTerms`, `MAX_ROWS = 40`. Contract: **never throw**, return `null` so the caller falls back to a plain code block. |
| `InlineMarkdown.tsx` | Memoised ReactMarkdown + remarkGfm + remarkMath + rehypeKatex for short fragments. Unwraps `p`. No `dangerouslySetInnerHTML`. |
| `StepsBlock.tsx` | `ol` of numbered step rows, `m.li` fade-up stagger gated by motion tier. |
| `AnswerBlock.tsx` | Labelled "Final answer" pill. |
| `CheckBlock.tsx` | Verification card. |
| `TermsBlock.tsx` | Key vocabulary as `dl` / `dt` / `dd`. |
| `PracticeBlock.tsx` | Interactive practice question — real input and "Check my answer" **only** when an `onAction` handler exists; otherwise a static question with no dead buttons. |
| `BlockActionContext.tsx` | `BlockActionContext` + `useBlockAction()`, null outside the chat message render. |
| `index.tsx` | `CHAT_BLOCK_LANGUAGES`, `readBlockLanguage`, `renderChatBlock` returning `null` on parse failure. |

`components/dashboard/RichStudyText.tsx` was rewired to route those five
languages to these blocks, wrap output in `BlockActionContext.Provider`, and
override `pre` so block content is not trapped in a code frame. `onAction` is
passed **only** from the chat message render — a saved study output tab renders
the same blocks without controls, because a button that silently does nothing is
worse than no button.

---

## 5. The learning world

The requirement was that the spaces "connect to the real functionality of the
application". So the spaces are not illustrations: each one is a link to a route
that already works, defined in one file.

### `components/world/worldSpaces.ts`

| Space | Route | Auth |
| --- | --- | --- |
| Learning hub | `/dashboard` | yes |
| Library | `/studio` | yes |
| Observatory | `/ai-study-assistant` | no |
| Practice hall | `/quiz-maker` | no |
| Revision garden | `/revision-planner` | no |

The two auth-gated spaces link to their real route; the repo's existing
middleware sends a signed-out visitor through the normal sign-in flow. **Access
control is never bypassed** — no route was made public to make the world work.

`WORLD_TOUR` orders the introduction so the first thing a visitor understands is
that this is a place you study in. `SPACE_ACCENT_VAR` maps each space's accent to
a CSS custom property so the DOM overlay and the 3D lighting cannot drift apart.

### `components/world/buildCampus.ts`

The campus is generated at runtime from primitives. **No model files, no
textures, no external assets** — nothing can fail to load or disappear from a
CDN, and there is nothing to 404. Flat PBR materials; the sense of place comes
from silhouette, lighting and fog rather than surface detail. Roughly a few
thousand triangles.

Distinct silhouettes per space, so they are identifiable at a glance:

- **Hub** — hexagonal pavilion with a colonnade and a lit ring under the roof;
  the brightest thing in the scene, because someone is studying there.
- **Library** — rotunda with a hemisphere dome, cupola, ten columns and eight
  alternating lit windows.
- **Observatory** — slim drum with an open dome slit and a tilted telescope.
- **Practice hall** — stepped amphitheatre seating under a twelve-column
  colonnade.
- **Revision garden** — terraced beds, trellis arches, trees and a lamp.

Lighting is restrained on purpose: low ambient, hemisphere fill, one warm key
directional, one cool rim, one mint fill, plus a small warm point light inside
each building. `dispose()` walks the graph and releases every geometry, material
and the motes object.

### `components/world/WorldScene.ts`

Owns the renderer, camera and input. Deliberately **imperative, not a React
render loop**: hotspot labels are moved by writing `transform` directly onto
their DOM nodes, so orbiting the world does not trigger a single React
re-render.

- `alpha: true` renderer with `setClearAlpha(0)`, so the CSS gradient stage
  shows through and there is no "black box" while the scene builds.
- ACES Filmic tone mapping, exposure 1.18, `SRGBColorSpace`.
- `setPixelRatio(min(dpr, 1.6))` — full-retina 3D is not worth the cost here.
- Pointer orbit + wheel zoom + **pinch zoom**, clamped on radius and polar angle.
- Arrow keys orbit for keyboard users.
- Idle drift after 7s so the world feels alive without demanding attention;
  disabled under reduced motion.
- Frame-rate-independent easing via `1 - pow(0.0016, delta)`, so the camera
  behaves the same at 30fps and 120fps.
- Animation loop **stops** when the tab is hidden and when the canvas leaves the
  viewport (`IntersectionObserver`).
- `webglcontextlost` is caught and reported through `onFailure`, never thrown at
  the user.

### `components/world/LearningWorld.tsx`

Three states, all of them complete:

1. The interactive campus — wide screen, capable device, WebGL present, motion
   allowed.
2. A CSS poster — the same `.world-stage` gradient, before we know which of 1 or
   3 applies. No layout shift, and no flash of the wrong thing.
3. The plain list of the same five destinations.

The list is always one click away through a World / List toggle, and the choice
is remembered (`hooks/useWorldView.ts`). Every destination is additionally
exposed as a real link in a screen-reader-only list while the world is showing,
so nothing is reachable *only* through a canvas. Hotspots are real `<button>`
elements with `aria-pressed` state, and they are 44px tall.

### `components/world/WorldFallback.tsx`

Not a degraded error state — it is the first-class experience for a narrow
phone, a reduced-motion visitor, a low-power device or anyone without WebGL, and
it lists the same five destinations with the same copy and the same links.

### Integrating it

`components/landing/DeferredLearningWorld.tsx` lazy-loads the world with
`ssr: false` and reserves its exact footprint, so three.js stays out of the
initial bundle and nothing shifts when it arrives.

`app/page.tsx` was rewritten around the world. The five space cards are
generated from `WORLD_SPACES`, and the model section from `CHAT_MODELS`, so the
landing page cannot describe a different product from the one that exists.
## 6. Live web research for the tutor

Until now the tutor could only answer from what the student had uploaded. That
is the right default — it is what makes answers citable — but it left two real
gaps: a question about something *recent* had nothing to stand on, and a studio
with no source-enabled files yet gave the model an empty evidence base and no
honest alternative to guessing.

The tutor now performs its own web research when a question genuinely warrants
it, and says so.

### The decision — `lib/ai/research-intent.ts`

A dependency-free module, deliberately split out from the search itself. It is
imported by **both** the API route and the chat UI, so the stage the student
sees while waiting ("Searching the web") is produced by the exact same function
that decides whether a search runs. The label can never describe work that was
skipped.

The rule is deliberately narrow — a wrong "yes" costs the student seconds and
adds noise to a grounded answer — so every cheap reason to say no is taken
first:

| Check | Result |
| --- | --- |
| Under 12 characters | no |
| Greeting / acknowledgement | no |
| Refers to "my notes", "the PDF", "this source"… | no |
| "make me a quiz / flashcards / exam / summary" | no — that is a study tool |
| Explicitly time-sensitive ("latest", "2026", "current", "news"…) | **yes** |
| No uploaded sources *and* a real question | **yes** |

A short `WEB_RESEARCH_STAGE_LABEL` constant keeps the wording in one place.

### The search — `lib/ai/web-research.ts`

Server-only, because it pulls in the document parsers. It reuses the existing
`searchWebSources(query, "scholar")` path that the Studio's source modal already
depends on — the one that prioritises OpenAlex, Crossref, arXiv, Wikipedia and
a trusted-learning-host list — rather than adding a second search stack.

- The whole step is bounded by `WEB_RESEARCH_DEADLINE_MS` (9 s) via
  `Promise.race`, so a hanging upstream can never hold a chat answer open.
- Any failure, timeout or empty result returns an empty research object. The
  route never has to handle an error case, and chat proceeds exactly as it did
  before this feature existed.
- Snippets are clipped per source and the whole block per turn
  (`MAX_SUMMARY_CHARS`), so research cannot blow up the prompt.
- It returns structured `WebCitation[]` alongside the prompt block, so the UI
  lists real, clickable citations.

### The prompt — `lib/ai/prompts/chat-system.ts`

`buildChatSystemPrompt()` gained an optional third argument. When research
actually ran, a `WEB_RESEARCH_RULES` block is appended:

- uploaded material outranks a web source, and a disagreement must be stated;
- cite inline as `[1]`, `[2]`, matching the numbers given — never invent one;
- if the sources do not answer the question, say what is missing.

When no research ran the block is absent entirely, so the prompt never
advertises a capability the turn did not use.

### The route — `app/api/chat/route.ts`

Research runs after model resolution and before the provider is contacted (the
system prompt has to carry the findings). The first SSE frame's `scholarMind`
meta now optionally carries `sources`, and the client uses its presence as the
signal that the answer was web-assisted. Nothing else about the streaming
contract changed: same event shape, same `delta.content` / `delta.reasoning`
keys, same usage reservation and provider fallback.

### The UI

- `components/dashboard/StudyWorkspace.tsx` sets the stage label optimistically
  using `shouldResearchWeb` with the studio's real source count, and clears it
  in the request's `finally`. It renders the citations as a numbered list of
  real links under the answer.
- `components/dashboard/ChatThinkingIndicator.tsx` gained an optional
  `stageLabel`. Priority is unchanged: the model's own reasoning tagline still
  wins, because that describes work that is definitely happening; the external
  stage is used only before any reasoning exists.

## 7. Repo hygiene

- Removed from tracking: `sixth_task_*.md` (×5), `project_info__*.md` (×2) and
  `summary.md` — none were imported, linked or built.
- `pnpm-lock.yaml` deleted. `README.md`, `netlify.toml` and the build command all
  standardise on npm, and two lockfiles is a recipe for a deploy that resolves
  different trees to the one that was tested.
- `tsconfig.tsbuildinfo` added to `.gitignore` (it was already untracked).
- **History secret scan.** `git log --all -p` was searched for `sk-or-`, `gsk_`,
  `hf_`, `AIza` and `SERVICE_ROLE`, plus a value-shaped regex for each key
  family and for JWTs. The only hit is an empty `SUPABASE_SERVICE_ROLE_KEY=` line
  in `.env.example`. No `.env` file was ever committed, and no real key value
  appears anywhere in history. **No rotation is required.** History was not
  rewritten.

## 8. Studio bundle work

- `components/dashboard/FileViewer.tsx` no longer imports `xlsx` at module
  scope. It was ~800 KB of parser sitting in the studio's shared chunk for every
  document open, including the PDFs, images and DOCX files that can never use
  it. It is now a cached dynamic import, triggered only when a sheet is actually
  parsed, and rows for the active sheet are computed in their own effect so
  switching tabs never re-parses the workbook.
- `components/dashboard/ChatThinkingIndicator.tsx` was reworked to accept the
  external stage described in §6 without changing its existing behaviour.
- `lib/confetti.ts` now types `CELEBRATION_OPTIONS` as `canvas-confetti`'s own
  `Options` instead of `as const`. The `as const` made `colors` a readonly tuple,
  which `Options.colors: string[]` rejects — a standing `tsc --noEmit` failure
  that predated this work. Typing against the library's own type is both the
  fix and the guard against the next drift.
