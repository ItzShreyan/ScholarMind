#!/usr/bin/env node
/**
 * Model routing verification.
 *
 * The Auto classifier is the one piece of AI logic a student can actually see a
 * decision from, so it is tested rather than trusted. `lib/ai/models.ts` is the
 * single source of truth; this script compiles exactly that file and exercises
 * the compiled output, so the assertions can never drift from the code that
 * runs in production.
 *
 *   npm run verify:model-routing
 */

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);

/*
 * Prefer the project's own compiler. `npx` re-resolves the registry on a cold
 * cache, which turns a two-second check into a twenty-second one.
 */
const localTsc = join(process.cwd(), "node_modules", ".bin", "tsc");
const tscBin = existsSync(localTsc) ? localTsc : "tsc";

let passed = 0;
let failed = 0;

function check(label, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${label}`);
    return;
  }
  failed += 1;
  console.log(`  FAIL  ${label}${detail ? `\n        ${detail}` : ""}`);
}

function section(title) {
  console.log(`\n${title}`);
}

/* Compile the real module to a throwaway directory. */
const outDir = mkdtempSync(join(tmpdir(), "scholarmind-models-"));
let models;

try {
  execFileSync(
    tscBin,
    [
      "lib/ai/models.ts",
      "--outDir",
      outDir,
      "--module",
      "commonjs",
      "--target",
      "es2022",
      "--moduleResolution",
      "node",
      "--skipLibCheck"
    ],
    { stdio: "pipe" }
  );
  models = require(join(outDir, "models.js"));
} catch (error) {
  console.error("Could not compile lib/ai/models.ts:");
  console.error(error.stdout?.toString() || error.message);
  process.exit(1);
}

const {
  CHAT_MODELS,
  TIER_FALLBACKS,
  classifyChatPrompt,
  describeDecision,
  describeRespondingModel,
  getModelChain,
  normalizeModelChoice,
  resolveChatModel
} = models;

/* ------------------------------------------------------------------ */
section("Registry integrity");
/* ------------------------------------------------------------------ */

check(
  "pro and flash have distinct model ids",
  CHAT_MODELS.pro.id !== CHAT_MODELS.flash.id,
  `${CHAT_MODELS.pro.id} vs ${CHAT_MODELS.flash.id}`
);

check(
  "every id is an OpenRouter id",
  [...getModelChain("pro"), ...getModelChain("flash"), ...getModelChain("vision")].every(
    (id) => id.includes("/")
  )
);

check(
  "the retired super-120b id is gone from every chain",
  ![...getModelChain("pro"), ...getModelChain("flash"), ...getModelChain("vision"), ...getModelChain("study")].some(
    (id) => id.includes("nemotron-3-super-120b")
  )
);

check(
  "chains contain no duplicates",
  (["pro", "flash", "vision", "study"]).every((purpose) => {
    const chain = getModelChain(purpose);
    return new Set(chain).size === chain.length;
  })
);

check(
  "the primary tier id is first in its own chain",
  TIER_FALLBACKS.pro[0] === CHAT_MODELS.pro.id && TIER_FALLBACKS.flash[0] === CHAT_MODELS.flash.id
);

check(
  "vision has at least two candidates so it can fall back",
  getModelChain("vision").length >= 2
);

check(
  "pro and flash are both labelled",
  CHAT_MODELS.pro.label === "Pro" && CHAT_MODELS.flash.label === "Flash"
);

/* ------------------------------------------------------------------ */
section("Auto routing — must choose Flash");
/* ------------------------------------------------------------------ */

const flashCases = [
  ["simple lookup", "What is photosynthesis?"],
  ["short definition", "Define osmosis"],
  ["casual message", "hey"],
  ["quick translation", "Translate 'where is the library' into French"],
  ["short factual question", "Who was Rosalind Franklin?"],
  ["ordinary revision question", "Give me three ways to reduce heat loss in a house."],
  [
    "long but simple prompt",
    `${"Here are my notes on the water cycle, copied from the textbook. ".repeat(20)}Summarise the main stages.`
  ],
  ["single follow-up", "Can you give me an example of that?"]
];

for (const [label, prompt] of flashCases) {
  const decision = classifyChatPrompt(prompt);
  check(
    `${label} → flash (score ${decision.score})`,
    decision.tier === "flash",
    `got ${decision.tier} with signals: ${decision.signals.join(", ") || "none"}`
  );
}

/* ------------------------------------------------------------------ */
section("Auto routing — must escalate to Pro");
/* ------------------------------------------------------------------ */

const proCases = [
  [
    "multi-step mathematics",
    "Solve for x and show your working at each stage: 3x^2 + 2x - 5 = 0, then find the coordinates of the vertex."
  ],
  ["a proof", "Prove by induction that the sum of the first n odd numbers is n squared."],
  [
    "complex programming",
    "Write a TypeScript function that debounces an async call, explain how the closure captures the timer, and give the time complexity."
  ],
  [
    "debugging an architecture",
    "My React effect refetches on every render and I get an infinite loop. Here is the component. Explain the dependency array problem and refactor it."
  ],
  ["a derivation", "Derive the expression for the time period of a simple pendulum for small angles."],
  [
    "critical analysis",
    "Critically evaluate the extent to which the Treaty of Versailles caused the Second World War."
  ],
  [
    "a multi-part exam question",
    "Answer all parts:\n1. State the function of the mitochondria.\n2. Explain why aerobic respiration releases more ATP.\n3. Calculate the ATP yield from 2 glucose molecules."
  ],
  [
    "a generated long document",
    "Build me a full mock exam paper with a mark scheme on cell biology."
  ]
];

for (const [label, prompt] of proCases) {
  const decision = classifyChatPrompt(prompt);
  check(
    `${label} → pro (score ${decision.score})`,
    decision.tier === "pro",
    `got ${decision.tier} with signals: ${decision.signals.join(", ") || "none"}`
  );
}

/* ------------------------------------------------------------------ */
section("Auto must not over-escalate");
/* ------------------------------------------------------------------ */

const longButSimple = `Chapter 4 revision notes. ${"The cell membrane is selectively permeable and controls what enters and leaves the cell. ".repeat(
  14
)}Please summarise this in five bullet points.`;

check(
  "a long prompt does not become Pro just for being long",
  classifyChatPrompt(longButSimple).tier === "flash",
  `score ${classifyChatPrompt(longButSimple).score}`
);

check(
  "explaining a simple why stays on Flash",
  classifyChatPrompt("Explain why the sky is blue").tier === "flash"
);

check(
  "an empty prompt routes to Flash",
  classifyChatPrompt("   ").tier === "flash"
);

/* ------------------------------------------------------------------ */
section("Explicit choices are respected");
/* ------------------------------------------------------------------ */

check(
  "manual Pro stays Pro even for a trivial prompt",
  resolveChatModel("pro", "hi").tier === "pro"
);

check(
  "manual Flash stays Flash even for a hard prompt",
  resolveChatModel("flash", "Prove the fundamental theorem of calculus.").tier === "flash"
);

check(
  "manual Pro returns the Pro model id",
  resolveChatModel("pro", "hi").modelId === CHAT_MODELS.pro.id
);

check(
  "manual Flash returns the Flash model id",
  resolveChatModel("flash", "hi").modelId === CHAT_MODELS.flash.id
);

check(
  "Auto attaches its decision so the UI can explain it",
  Boolean(resolveChatModel("auto", "What is mitosis?").decision?.auto)
);

check(
  "explicit choice attaches no Auto decision",
  resolveChatModel("pro", "What is mitosis?").decision === undefined
);

/* ------------------------------------------------------------------ */
section("Vision is a separate route");
/* ------------------------------------------------------------------ */

const vision = resolveChatModel("pro", "Read this diagram", true);
check("an image request routes to vision, not the chosen tier", vision.tier === "vision");
check(
  "an image never routes to the text-only Flash model",
  vision.modelId !== CHAT_MODELS.flash.id,
  `got ${vision.modelId}`
);
check(
  "vision routes natively to multimodal Nemotron Super VL",
  vision.modelId === "nvidia/nemotron-3.5-super-vl:free",
  `got ${vision.modelId}`
);
check("vision works even when auto was chosen", resolveChatModel("auto", "hi", true).tier === "vision");

/* ------------------------------------------------------------------ */
section("Client input is normalised");
/* ------------------------------------------------------------------ */

check("'pro' survives", normalizeModelChoice("pro") === "pro");
check("'flash' survives", normalizeModelChoice("flash") === "flash");
check("'auto' survives", normalizeModelChoice("auto") === "auto");
check("garbage becomes auto", normalizeModelChoice("gpt-5-ultra") === "auto");
check("null becomes auto", normalizeModelChoice(null) === "auto");
check("numbers become auto", normalizeModelChoice(42) === "auto");
check("prototype keys becomes auto", normalizeModelChoice("__proto__") === "auto");

/* ------------------------------------------------------------------ */
section("Fallbacks are reported honestly");
/* ------------------------------------------------------------------ */

const primaryPro = describeRespondingModel(CHAT_MODELS.pro.id, "pro");
check("the primary model is not called a fallback", primaryPro.isFallback === false);
check("the primary model keeps its tier label", primaryPro.label === "Pro");

const fallbackPro = describeRespondingModel("google/gemma-4-31b-it:free", "pro");
check("a fallback is flagged as a fallback", fallbackPro.isFallback === true);
check(
  "a fallback names the model that actually answered",
  fallbackPro.label.includes("gemma-4-31b-it"),
  `got ${fallbackPro.label}`
);
check(
  "a fallback does not claim to be the requested tier by name alone",
  fallbackPro.label !== "Pro",
  `got ${fallbackPro.label}`
);

const gemini = describeRespondingModel("gemini-fallback", "flash");
check("the Gemini fallback is labelled as such", gemini.label.includes("Gemini") && gemini.isFallback);

/* ------------------------------------------------------------------ */
section("Auto explanations are human readable");
/* ------------------------------------------------------------------ */

const proDecision = { ...classifyChatPrompt("Prove that root 2 is irrational."), auto: true };
const proExplanation = describeDecision(proDecision);
check("the Pro explanation names Pro", proExplanation.includes("Pro"), proExplanation);
check("the Pro explanation gives a reason", proExplanation.includes("because"), proExplanation);
check("the Pro explanation is a full sentence", proExplanation.endsWith("."));

const flashDecision = { ...classifyChatPrompt("What is mitosis?"), auto: true };
const flashExplanation = describeDecision(flashDecision);
check("the Flash explanation names Flash", flashExplanation.includes("Flash"), flashExplanation);

check("no explanation for an explicit choice", describeDecision(undefined) === "");

/* ------------------------------------------------------------------ */
console.log(`\n${passed} passed, ${failed} failed`);
rmSync(outDir, { recursive: true, force: true });
process.exit(failed === 0 ? 0 : 1);
