const textExtensions = [
  "txt",
  "md",
  "markdown",
  "json",
  "yaml",
  "yml",
  "xml",
  "html",
  "htm",
  "rtf"
];

const spreadsheetExtensions = ["csv", "tsv", "xlsx", "xls", "ods"];
const docExtensions = ["docx"];
const pdfExtensions = ["pdf"];
const imageExtensions = ["png", "jpg", "jpeg", "webp", "gif", "bmp", "tif", "tiff", "heic", "heif"];

const textMimeSubstrings = [
  "text/",
  "application/json",
  "application/xml",
  "application/yaml",
  "application/x-yaml",
  "text/yaml",
  "text/xml",
  "text/html",
  "application/rtf",
  "text/rtf"
];

const spreadsheetMimeSubstrings = [
  "text/csv",
  "text/tab-separated-values",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.spreadsheet"
];

const docMimeSubstrings = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

const imageMimeSubstrings = ["image/"];
const pdfMimeSubstrings = ["application/pdf"];

export const defaultMaxUploadFileSizeMb = 12;

function hasMimeMatch(fileType: string | undefined, matchers: string[]) {
  const normalized = (fileType || "").toLowerCase();
  return matchers.some((matcher) => normalized.includes(matcher));
}

export function getFileExtension(fileName: string) {
  const normalized = fileName.toLowerCase().trim();
  const parts = normalized.split(".");
  return parts.length > 1 ? parts.pop() || "" : "";
}

export function isTextLikeDocument(fileName: string, fileType?: string) {
  return textExtensions.includes(getFileExtension(fileName)) || hasMimeMatch(fileType, textMimeSubstrings);
}

export function isSpreadsheetDocument(fileName: string, fileType?: string) {
  return spreadsheetExtensions.includes(getFileExtension(fileName)) || hasMimeMatch(fileType, spreadsheetMimeSubstrings);
}

export function isDocxDocument(fileName: string, fileType?: string) {
  return docExtensions.includes(getFileExtension(fileName)) || hasMimeMatch(fileType, docMimeSubstrings);
}

export function isPdfDocument(fileName: string, fileType?: string) {
  return pdfExtensions.includes(getFileExtension(fileName)) || hasMimeMatch(fileType, pdfMimeSubstrings);
}

export function isImageDocument(fileName: string, fileType?: string) {
  return imageExtensions.includes(getFileExtension(fileName)) || hasMimeMatch(fileType, imageMimeSubstrings);
}

export function resolvePreviewKind(fileName: string, fileType?: string, storagePath?: string) {
  if (isPdfDocument(fileName, fileType) && storagePath && !storagePath.startsWith("inline://")) {
    return "pdf" as const;
  }

  if (isImageDocument(fileName, fileType) && storagePath && !storagePath.startsWith("inline://")) {
    return "image" as const;
  }

  if (isSpreadsheetDocument(fileName, fileType)) {
    return "table" as const;
  }

  return "text" as const;
}

export const uploadAcceptAttribute = [
  ".txt",
  ".md",
  ".markdown",
  ".json",
  ".yaml",
  ".yml",
  ".xml",
  ".html",
  ".htm",
  ".rtf",
  ".csv",
  ".tsv",
  ".xlsx",
  ".xls",
  ".ods",
  ".docx",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".bmp",
  ".tif",
  ".tiff",
  "text/plain",
  "text/markdown",
  "application/json",
  "application/xml",
  "text/xml",
  "text/html",
  "text/csv",
  "text/tab-separated-values",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/tiff"
].join(",");
