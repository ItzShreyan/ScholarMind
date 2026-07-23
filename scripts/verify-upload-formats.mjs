import fs from "node:fs";

const formatsSource = fs.readFileSync("lib/documents/formats.ts", "utf8");
const uploadRoute = fs.readFileSync("app/api/upload/route.ts", "utf8");
const parserSource = fs.readFileSync("lib/documents/parser.ts", "utf8");

const requiredAccepts = [
  ".pdf",
  ".docx",
  ".xlsx",
  ".pptx",
  ".odp",
  ".csv",
  ".txt",
  ".md",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".tiff"
];

const requiredParserHooks = [
  "extractPdfDocument",
  "extractDocxDocument",
  "extractPresentationDocument",
  "extractSpreadsheetDocument",
  "recognizeImage",
  "extractPdfDocumentByOcr"
];

const requiredSafetyChecks = [
  "blockedExtensions",
  "validateFileSignature",
  "maxUploadFileSizeMb",
  "study_sessions",
  "user_id",
  "pptx",
  "odp"
];

const missingAccepts = requiredAccepts.filter((item) => !formatsSource.includes(`\"${item}\"`) && !formatsSource.includes(`'${item}'`));
const missingParserHooks = requiredParserHooks.filter((item) => !parserSource.includes(item));
const missingSafetyChecks = requiredSafetyChecks.filter((item) => !uploadRoute.includes(item));

if (missingAccepts.length || missingParserHooks.length || missingSafetyChecks.length) {
  console.error("Upload format verification failed.");
  if (missingAccepts.length) console.error("Missing accepted formats:", missingAccepts.join(", "));
  if (missingParserHooks.length) console.error("Missing parser hooks:", missingParserHooks.join(", "));
  if (missingSafetyChecks.length) console.error("Missing upload safety checks:", missingSafetyChecks.join(", "));
  process.exit(1);
}

console.log("Upload format verification passed.");
