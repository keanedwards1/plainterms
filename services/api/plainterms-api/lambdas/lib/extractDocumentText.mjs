import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import zlib from "node:zlib";

const s3 = new S3Client({});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function streamToBuffer(body) {
  if (!body) return Buffer.alloc(0);
  if (typeof body.transformToByteArray === "function") {
    const bytes = await body.transformToByteArray();
    return Buffer.from(bytes);
  }

  const chunks = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

function guessType({ contentType, filename }) {
  const ct = (contentType || "").toLowerCase();
  const name = (filename || "").toLowerCase();

  if (ct.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (
    ct.includes("wordprocessingml.document") ||
    name.endsWith(".docx")
  ) {
    return "docx";
  }
  if (ct.includes("msword") || name.endsWith(".doc")) return "doc";
  if (ct.startsWith("text/") || ct.includes("json") || ct.includes("xml") || ct.includes("csv")) {
    return "text";
  }

  return "unknown";
}

function extractTextFromPdf(buffer) {
  const text = buffer.toString("latin1");
  const chunks = [];
  const literalMatches = text.match(/\((?:\\.|[^()])+\)\s*Tj/g) || [];
  for (const m of literalMatches) {
    const start = m.indexOf("(");
    const end = m.lastIndexOf(")");
    if (start >= 0 && end > start) {
      const raw = m.slice(start + 1, end);
      chunks.push(raw.replace(/\\([()\\])/g, "$1"));
    }
  }

  const arrayMatches = text.match(/\[(?:.|\n|\r)*?\]\s*TJ/g) || [];
  for (const m of arrayMatches) {
    const strings = m.match(/\((?:\\.|[^()])+\)/g) || [];
    for (const s of strings) {
      const raw = s.slice(1, -1);
      chunks.push(raw.replace(/\\([()\\])/g, "$1"));
    }
  }

  return normalizeWhitespace(chunks.join(" "));
}

function parseDocxXmlFromZip(buffer) {
  const eocdSig = 0x06054b50;
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= 0; i -= 1) {
    if (buffer.readUInt32LE(i) === eocdSig) {
      eocdOffset = i;
      break;
    }
  }
  assert(eocdOffset >= 0, "DOCX EOCD not found.");

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirOffset = buffer.readUInt32LE(eocdOffset + 16);
  let offset = centralDirOffset;

  for (let i = 0; i < totalEntries; i += 1) {
    assert(buffer.readUInt32LE(offset) === 0x02014b50, "Invalid DOCX central directory header.");
    const compression = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const fileName = buffer.toString("utf8", offset + 46, offset + 46 + fileNameLength);

    if (fileName === "word/document.xml") {
      assert(buffer.readUInt32LE(localHeaderOffset) === 0x04034b50, "Invalid DOCX local file header.");
      const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const compressed = buffer.slice(dataStart, dataStart + compressedSize);

      if (compression === 0) {
        return compressed.toString("utf8");
      }
      if (compression === 8) {
        return zlib.inflateRawSync(compressed).toString("utf8");
      }
      throw new Error(`Unsupported DOCX compression method: ${compression}`);
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  throw new Error("DOCX word/document.xml not found.");
}

function extractTextFromDocx(buffer) {
  const xml = parseDocxXmlFromZip(buffer);
  const withBreaks = xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br\/>/g, "\n")
    .replace(/<w:p[^>]*>/g, "\n");

  const matches = withBreaks.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
  const chunks = matches.map((m) => m.replace(/<\/?w:t[^>]*>/g, ""));
  return normalizeWhitespace(chunks.join(" "));
}

export async function extractDocumentTextFromUpload({ bucket, objectKey, filename, contentType }) {
  assert(bucket, "Missing upload bucket.");
  assert(objectKey, "Missing object key.");

  const cmd = new GetObjectCommand({
    Bucket: bucket,
    Key: objectKey,
  });
  const res = await s3.send(cmd);
  const buffer = await streamToBuffer(res.Body);
  const detectedType = guessType({
    contentType: contentType || res.ContentType || "",
    filename,
  });

  let text = "";
  const notes = [];

  try {
    if (detectedType === "text") {
      text = buffer.toString("utf8");
      notes.push("extracted_with_utf8_text_decoder");
    } else if (detectedType === "pdf") {
      text = extractTextFromPdf(buffer);
      notes.push("extracted_with_pdf_text_operator_parser");
    } else if (detectedType === "docx") {
      text = extractTextFromDocx(buffer);
      notes.push("extracted_with_docx_zip_xml_parser");
    } else if (detectedType === "doc") {
      notes.push("legacy_doc_binary_format_not_supported");
    } else {
      notes.push("unrecognized_content_type_for_text_extraction");
    }
  } catch (err) {
    notes.push(`extract_error:${err instanceof Error ? err.message : String(err)}`);
  }

  const normalized = normalizeWhitespace(text);
  if (!normalized) {
    notes.push("no_text_extracted");
  }

  return {
    extractedText: normalized,
    extraction: {
      detectedType,
      contentType: contentType || res.ContentType || "",
      byteLength: buffer.length,
      notes,
    },
  };
}

