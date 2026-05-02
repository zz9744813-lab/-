import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_TEXT_CHARS = 10_000;

export async function extractAttachment(file: File): Promise<{
  name: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  kind: 'text' | 'pdf' | 'spreadsheet' | 'docx' | 'unsupported';
  extractedText: string | null;
  warnings: string[];
}> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const sizeBytes = file.size;
  const name = file.name;
  const mimeType = file.type || "application/octet-stream";
  const warnings: string[] = [];

  let kind: 'text' | 'pdf' | 'spreadsheet' | 'docx' | 'unsupported' = 'unsupported';
  let extractedText: string | null = null;

  if (mimeType.startsWith("image/")) {
    warnings.push("本系统不处理图片附件");
    return { name, mimeType, sizeBytes, sha256, kind, extractedText, warnings };
  }

  if (mimeType === "application/pdf" || name.toLowerCase().endsWith(".pdf")) {
    kind = 'pdf';
    extractedText = await extractPdfText(buffer);
    if (!extractedText) warnings.push("PDF 可能是扫描件或使用了压缩编码。");
  } else if (name.toLowerCase().endsWith(".docx")) {
    kind = 'docx';
    extractedText = await extractDocxText(buffer);
  } else if (name.toLowerCase().endsWith(".xlsx") || name.toLowerCase().endsWith(".csv")) {
    kind = 'spreadsheet';
    extractedText = await extractTextHeuristic(buffer); // For now just heuristic
  } else if (mimeType.startsWith("text/") || name.toLowerCase().endsWith(".md")) {
    kind = 'text';
    extractedText = buffer.toString("utf8");
  } else {
    warnings.push("暂未识别此文件类型");
  }

  if (extractedText && extractedText.length > MAX_TEXT_CHARS) {
    extractedText = extractedText.substring(0, MAX_TEXT_CHARS) + "\n[TRUNCATED]";
  }

  return { name, mimeType, sizeBytes, sha256, kind, extractedText, warnings };
}

async function extractDocxText(buffer: Buffer): Promise<string | null> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch {
    return null;
  }
}

async function extractPdfText(buffer: Buffer): Promise<string | null> {
  const dir = await mkdtemp(path.join(tmpdir(), "compass-pdf-"));
  const filePath = path.join(dir, "input.pdf");
  await writeFile(filePath, buffer);

  try {
    return await new Promise<string | null>((resolve) => {
      const child = spawn("pdftotext", ["-layout", "-enc", "UTF-8", filePath, "-"], {
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      child.stdout.on("data", (chunk) => stdout += chunk.toString("utf8"));
      child.once("close", (code) => {
        if (code === 0 && stdout.trim()) resolve(stdout.trim());
        else resolve(null);
      });
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function extractTextHeuristic(buffer: Buffer): Promise<string | null> {
  return buffer.toString("utf8");
}
