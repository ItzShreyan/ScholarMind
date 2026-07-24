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
const presentationExtensions = ["pptx", "odp"];
const pdfExtensions = ["pdf"];
const imageExtensions = ["png", "jpg", "jpeg", "webp", "gif", "bmp", "tif", "tiff", "heic", "heif"];
const audioExtensions = ["mp3", "wav", "m4a", "ogg", "flac", "aac"];

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
const presentationMimeSubstrings = [
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.presentation"
];

const imageMimeSubstrings = ["image/"];
const pdfMimeSubstrings = ["application/pdf"];
const audioMimeSubstrings = ["audio/"];

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

/**
 * Browsers do not consistently populate File.type (notably for Office files
 * and files restored from a synced device). Persist a canonical MIME type so
 * both Supabase Storage and the preview route can identify the original file.
 */
export function inferFileMimeType(fileName: string, reportedType?: string) {
  const normalized = (reportedType || "").trim().toLowerCase();
  const extension = getFileExtension(fileName);
  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    txt: "text/plain",
    md: "text/markdown",
    markdown: "text/markdown",
    json: "application/json",
    yaml: "application/yaml",
    yml: "application/yaml",
    xml: "application/xml",
    html: "text/html",
    htm: "text/html",
    rtf: "application/rtf",
    csv: "text/csv",
    tsv: "text/tab-separated-values",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ods: "application/vnd.oasis.opendocument.spreadsheet",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    odp: "application/vnd.oasis.opendocument.presentation",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    bmp: "image/bmp",
    tif: "image/tiff",
    tiff: "image/tiff",
    heic: "image/heic",
    heif: "image/heif",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/mp4",
    ogg: "audio/ogg",
    flac: "audio/flac",
    aac: "audio/aac"
  };

  // Prefer the known extension. This normalizes browser-specific values such
  // as audio/x-m4a and makes stored metadata stable across devices.
  if (mimeTypes[extension]) return mimeTypes[extension];

  return normalized || "application/octet-stream";
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

export function isPresentationDocument(fileName: string, fileType?: string) {
  return presentationExtensions.includes(getFileExtension(fileName)) || hasMimeMatch(fileType, presentationMimeSubstrings);
}

export function isPdfDocument(fileName: string, fileType?: string) {
  return pdfExtensions.includes(getFileExtension(fileName)) || hasMimeMatch(fileType, pdfMimeSubstrings);
}

export function isImageDocument(fileName: string, fileType?: string) {
  return imageExtensions.includes(getFileExtension(fileName)) || hasMimeMatch(fileType, imageMimeSubstrings);
}

export function isAudioDocument(fileName: string, fileType?: string) {
  return audioExtensions.includes(getFileExtension(fileName)) || hasMimeMatch(fileType, audioMimeSubstrings);
}

export function resolvePreviewKind(fileName: string, fileType?: string, storagePath?: string) {
  if (isPdfDocument(fileName, fileType) && storagePath && !storagePath.startsWith("inline://")) {
    return "pdf" as const;
  }

  if (isImageDocument(fileName, fileType) && storagePath && !storagePath.startsWith("inline://")) {
    return "image" as const;
  }

  if (isAudioDocument(fileName, fileType) && storagePath && !storagePath.startsWith("inline://")) {
    return "audio" as const;
  }

  if (isDocxDocument(fileName, fileType)) {
    return "word" as const;
  }

  if (isPresentationDocument(fileName, fileType)) {
    return "presentation" as const;
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
  ".pptx",
  ".odp",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".bmp",
  ".tif",
  ".tiff",
  ".mp3",
  ".wav",
  ".m4a",
  ".ogg",
  ".flac",
  ".aac",
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
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.presentation",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/tiff",
  "image/heic",
  "image/heif",
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "audio/ogg",
  "audio/flac",
  "audio/aac"
].join(",");
