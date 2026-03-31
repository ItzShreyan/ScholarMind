import pdf from "pdf-parse";
import { createWorker } from "tesseract.js";

export async function extractTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const lower = file.name.toLowerCase();

  if (lower.endsWith(".txt") || file.type === "text/plain") {
    return buffer.toString("utf-8");
  }

  if (lower.endsWith(".pdf") || file.type === "application/pdf") {
    const data = await pdf(buffer);
    return data.text;
  }

  if (file.type.startsWith("image/")) {
    const worker = await createWorker("eng");
    const {
      data: { text }
    } = await worker.recognize(buffer);
    await worker.terminate();
    return text;
  }

  return "";
}
