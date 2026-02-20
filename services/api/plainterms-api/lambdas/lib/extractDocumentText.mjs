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

function decodePdfString(raw) {
  // Decode common PDF escapes: \( \) \\ \n \r \t \b \f and octal like \123
  return raw
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\f/g, "\f")
    .replace(/\\([()\\])/g, "$1");
}

function decodeUtf16Be(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return "";
  if (buffer.length % 2 !== 0) return buffer.toString("latin1");

  const swapped = Buffer.alloc(buffer.length);
  for (let i = 0; i < buffer.length; i += 2) {
    swapped[i] = buffer[i + 1];
    swapped[i + 1] = buffer[i];
  }
  return swapped.toString("utf16le");
}

function decodeUnicodeHex(hex) {
  const clean = String(hex || "").replace(/[^0-9A-Fa-f]/g, "");
  if (!clean || clean.length % 2 !== 0) return "";
  const buf = Buffer.from(clean, "hex");
  // ToUnicode cmap entries are typically UTF-16BE code units.
  return decodeUtf16Be(buf);
}

function parseToUnicodeCMap(content) {
  const map = new Map();
  if (typeof content !== "string" || !/begincmap/i.test(content)) return map;

  const bfcharBlocks = content.match(/\d+\s+beginbfchar[\s\S]*?endbfchar/gi) || [];
  for (const block of bfcharBlocks) {
    const entries = block.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g);
    for (const entry of entries) {
      const src = entry[1]?.toUpperCase();
      const dst = decodeUnicodeHex(entry[2]);
      if (src && dst) map.set(src, dst);
    }
  }

  const bfrangeBlocks = content.match(/\d+\s+beginbfrange[\s\S]*?endbfrange/gi) || [];
  for (const block of bfrangeBlocks) {
    const lines = block.matchAll(
      /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(<([0-9A-Fa-f]+)>|\[([\s\S]*?)\])/g
    );
    for (const line of lines) {
      const srcStartHex = line[1]?.toUpperCase();
      const srcEndHex = line[2]?.toUpperCase();
      if (!srcStartHex || !srcEndHex) continue;

      const srcStart = parseInt(srcStartHex, 16);
      const srcEnd = parseInt(srcEndHex, 16);
      if (!Number.isFinite(srcStart) || !Number.isFinite(srcEnd) || srcEnd < srcStart) {
        continue;
      }

      if (line[4]) {
        const dstStartHex = line[4].toUpperCase();
        const dstStart = parseInt(dstStartHex, 16);
        if (!Number.isFinite(dstStart)) continue;

        for (let code = srcStart; code <= srcEnd; code += 1) {
          const src = code.toString(16).toUpperCase().padStart(srcStartHex.length, "0");
          const dstHex = (dstStart + (code - srcStart))
            .toString(16)
            .toUpperCase()
            .padStart(dstStartHex.length, "0");
          const dst = decodeUnicodeHex(dstHex);
          if (dst) map.set(src, dst);
        }
        continue;
      }

      if (line[5]) {
        const values = [...line[5].matchAll(/<([0-9A-Fa-f]+)>/g)].map((m) =>
          m[1].toUpperCase()
        );
        for (
          let idx = 0, code = srcStart;
          code <= srcEnd && idx < values.length;
          code += 1, idx += 1
        ) {
          const src = code.toString(16).toUpperCase().padStart(srcStartHex.length, "0");
          const dst = decodeUnicodeHex(values[idx]);
          if (dst) map.set(src, dst);
        }
      }
    }
  }

  return map;
}

function mapKeyLengths(map) {
  const lengths = new Set();
  for (const key of map.keys()) {
    if (typeof key === "string" && key.length > 0) lengths.add(key.length);
  }
  return [...lengths].sort((a, b) => b - a);
}

function decodeHexTextWithMap(hex, toUnicodeMap, keyLengths) {
  const clean = String(hex || "").replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
  if (!clean || clean.length % 2 !== 0) return "";

  if (toUnicodeMap.size > 0 && keyLengths.length > 0) {
    let out = "";
    let i = 0;
    const fallbackStep = keyLengths[keyLengths.length - 1] || 2;
    while (i < clean.length) {
      let matched = false;
      for (const len of keyLengths) {
        if (len <= 0 || i + len > clean.length) continue;
        const key = clean.slice(i, i + len);
        const mapped = toUnicodeMap.get(key);
        if (typeof mapped === "string") {
          out += mapped;
          i += len;
          matched = true;
          break;
        }
      }

      if (!matched) {
        i += fallbackStep;
      }
    }
    return out;
  }

  const buf = Buffer.from(clean, "hex");
  if (buf.length >= 2 && buf.length % 2 === 0) {
    let zeroHighBytes = 0;
    for (let i = 0; i < buf.length; i += 2) {
      if (buf[i] === 0) zeroHighBytes += 1;
    }
    if (zeroHighBytes / (buf.length / 2) > 0.3) {
      return decodeUtf16Be(buf);
    }
  }

  return buf.toString("latin1");
}

function collectTextFromPdfContent(content, toUnicodeMap) {
  if (typeof content !== "string" || !content) return [];

  const blocks = content.match(/BT[\s\S]*?ET/g) || [];
  if (blocks.length === 0) return [];
  const workingBlocks = blocks;
  const keyLengths = mapKeyLengths(toUnicodeMap);
  const lines = [];
  const seen = new Set();

  for (const block of workingBlocks) {
    const opRegex =
      /\[(?:.|\n|\r)*?\]\s*TJ|<([0-9A-Fa-f]+)>\s*(?:Tj|'|")|\((?:\\.|[^()])+\)\s*(?:Tj|'|")/g;
    let match;
    let line = "";
    while ((match = opRegex.exec(block)) !== null) {
      const token = match[0];

      if (token.startsWith("[")) {
        const itemRegex = /\((?:\\.|[^()])+\)|<([0-9A-Fa-f]+)>/g;
        let item;
        while ((item = itemRegex.exec(token)) !== null) {
          const itemToken = item[0];
          if (itemToken.startsWith("(")) {
            line += decodePdfString(itemToken.slice(1, -1));
          } else if (itemToken.startsWith("<")) {
            line += decodeHexTextWithMap(
              itemToken.slice(1, -1),
              toUnicodeMap,
              keyLengths
            );
          }
        }
        continue;
      }

      if (token.startsWith("(")) {
        const start = token.indexOf("(");
        const end = token.lastIndexOf(")");
        if (start >= 0 && end > start) {
          line += decodePdfString(token.slice(start + 1, end));
        }
        continue;
      }

      if (token.startsWith("<")) {
        const start = token.indexOf("<");
        const end = token.indexOf(">", start + 1);
        if (start >= 0 && end > start) {
          line += decodeHexTextWithMap(
            token.slice(start + 1, end),
            toUnicodeMap,
            keyLengths
          );
        }
      }
    }

    const cleaned = line.replace(/\u0000/g, "").trim();
    if (cleaned && !seen.has(cleaned)) {
      seen.add(cleaned);
      lines.push(cleaned);
    }
  }

  return lines;
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
  const contents = [text];

  // Many PDFs compress page content streams. Inflate FlateDecode streams and parse operators there.
  const streamRegex = /stream\r?\n/g;
  let match;
  while ((match = streamRegex.exec(text)) !== null) {
    const streamStart = match.index + match[0].length;
    const endIndex = text.indexOf("endstream", streamStart);
    if (endIndex < 0) break;

    const dictStart = text.lastIndexOf("<<", match.index);
    const dictEnd = text.indexOf(">>", dictStart >= 0 ? dictStart : 0);
    const dict = dictStart >= 0 && dictEnd >= 0 && dictEnd < match.index
      ? text.slice(dictStart, dictEnd + 2)
      : "";
    const hasFlate = /\/Filter\s*\/FlateDecode/.test(dict) || /\/FlateDecode/.test(dict);
    if (!hasFlate) {
      streamRegex.lastIndex = endIndex + "endstream".length;
      continue;
    }

    let raw = buffer.subarray(streamStart, endIndex);
    if (raw.length > 0 && raw[raw.length - 1] === 0x0d) raw = raw.subarray(0, raw.length - 1);
    if (raw.length > 0 && raw[raw.length - 1] === 0x0a) raw = raw.subarray(0, raw.length - 1);

    try {
      const inflated = zlib.inflateSync(raw);
      contents.push(inflated.toString("latin1"));
    } catch {
      try {
        const inflatedRaw = zlib.inflateRawSync(raw);
        contents.push(inflatedRaw.toString("latin1"));
      } catch {
        // Ignore non-inflatable streams.
      }
    }

    streamRegex.lastIndex = endIndex + "endstream".length;
  }

  const toUnicodeMap = new Map();
  for (const content of contents) {
    const parsed = parseToUnicodeCMap(content);
    for (const [src, dst] of parsed.entries()) {
      if (!toUnicodeMap.has(src)) {
        toUnicodeMap.set(src, dst);
      }
    }
  }

  const lines = [];
  for (const content of contents) {
    lines.push(...collectTextFromPdfContent(content, toUnicodeMap));
  }

  return normalizeWhitespace(lines.join("\n"));
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

export async function extractDocumentTextFromUpload(
  { bucket, objectKey, filename, contentType },
  options = {}
) {
  assert(bucket, "Missing upload bucket.");
  assert(objectKey, "Missing object key.");
  const includeRawBuffer = options?.includeRawBuffer === true;

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
      notes.push("extracted_with_pdf_text_operator_parser_v2");
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

  const result = {
    extractedText: normalized,
    extraction: {
      detectedType,
      contentType: contentType || res.ContentType || "",
      byteLength: buffer.length,
      notes,
    },
  };

  if (includeRawBuffer) {
    result.rawBuffer = buffer;
  }

  return result;
}
