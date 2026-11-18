/*
 * Live smoke test for the study-tool generation endpoint (`/api/ai/generate`).
 *
 * The endpoint requires a signed-in user: study-tool generation is billed to the
 * shared AI budget and is rate-limited per account, so an anonymous request is
 * rejected with 401. A live check therefore needs a real session.
 *
 * Provide one by copying the `Cookie` request header from a signed-in browser
 * session (DevTools → Network → any /api request → Request Headers → Cookie):
 *
 *   SCHOLARMIND_QA_COOKIE="sb-xxxx-auth-token=..." npm run verify:ai-tools
 *
 * Without a cookie the script reports that it is skipping — it does not pretend
 * to have verified anything.
 */

const baseUrl = process.env.SCHOLARMIND_QA_URL || "http://localhost:3000";
const authCookie = (process.env.SCHOLARMIND_QA_COOKIE || "").trim();

const source =
  "Uploaded study source: Biology notes. Photosynthesis uses light energy to convert carbon dioxide and water into glucose and oxygen. Chlorophyll in chloroplasts absorbs light. Limiting factors include light intensity, carbon dioxide concentration, and temperature.";

const checks = [
  {
    action: "quiz",
    prompt: "Use only this source. Generate 3 multiple-choice questions. Return only JSON.",
    shape: /"question"|"options"|photosynthesis|chlorophyll/i
  },
  {
    action: "summary",
    prompt: "Return a concise markdown revision summary from the source.",
    shape: /photosynthesis|chlorophyll|limiting/i
  },
  {
    action: "flashcards",
    prompt: 'Generate 3 flashcards from the source. Return only JSON array [{"front":"...","back":"..."}].',
    shape: /"front"|Q:/i
  },
  {
    action: "notes",
    prompt: "Generate compact AI Notes as valid JSON with title and sections from the source.",
    shape: /"sections"|#/i
  },
  {
    action: "exam",
    prompt: "Generate 3 original exam-style practice questions with marks and a compact mark scheme from the source.",
    shape: /marks?|mark scheme|question/i
  }
];

async function callTool(check) {
  const res = await fetch(`${baseUrl}/api/ai/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 ScholarMindQA",
      Cookie: authCookie
    },
    body: JSON.stringify({
      action: check.action,
      prompt: check.prompt,
      context: source
    })
  });

  const body = await res.text();
  let data = {};
  try {
    data = JSON.parse(body);
  } catch {
    // Keep raw body for the failure preview.
  }

  const text = typeof data.text === "string" ? data.text : body;
  const shapeOk = check.shape.test(text);
  const preview = text.replace(/\s+/g, " ").slice(0, 220);
  console.log(`${check.action}: status=${res.status} provider=${data.provider || "n/a"} shape=${shapeOk ? "ok" : "bad"}`);
  console.log(`  ${preview}`);

  if (res.status === 401) {
    throw new Error(
      "401 Unauthorized — the session cookie is missing, expired, or for the wrong project."
    );
  }

  if (!res.ok || !shapeOk || text.includes("[object Object]")) {
    throw new Error(`${check.action} failed AI tool verification.`);
  }
}

if (!authCookie) {
  console.log("verify:ai-tools SKIPPED — this check needs a signed-in session.");
  console.log("Study tools require an account, so an anonymous request gets a 401.");
  console.log("Re-run with a session cookie from a signed-in browser:");
  console.log('  SCHOLARMIND_QA_COOKIE="sb-xxxx-auth-token=..." npm run verify:ai-tools');
  process.exit(0);
}

try {
  for (const check of checks) {
    await callTool(check);
  }
  console.log("AI tool verification passed.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
