#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

class ForbiddenXmlError extends Error {}

function usage() {
  return "Usage: node scripts/preflight-drawio-xml.mjs path/to/file.drawio";
}

function rejectForbiddenXml(text, source) {
  if (text.includes("<" + "!--")) {
    throw new ForbiddenXmlError(
      `${source} contains XML comments are forbidden in generated draw.io XML`,
    );
  }
  if (new RegExp("<!" + "DOC" + "TYPE\\b", "i").test(text)) {
    throw new ForbiddenXmlError(
      `${source} contains ${"DOC" + "TYPE"} declarations are forbidden in generated draw.io XML`,
    );
  }
  const withoutXmlDecl = text.replace(/^\uFEFF?\s*<\?xml\s+[^?]*\?>/i, "");
  if (/<\?/.test(withoutXmlDecl)) {
    throw new ForbiddenXmlError(
      `${source} contains processing instructions are forbidden except an XML declaration`,
    );
  }
}

function scanCompressedDiagramPayloads(text) {
  const diagramRe = /<diagram\b[^>]*>([A-Za-z0-9+/=\s%]+)<\/diagram>/g;
  for (const match of text.matchAll(diagramRe)) {
    const payload = match[1].trim();
    if (!payload || payload.includes("<")) continue;
    try {
      const inflated = zlib.inflateRawSync(Buffer.from(payload, "base64")).toString("utf8");
      const xml = decodeURIComponent(inflated);
      rejectForbiddenXml(xml, "compressed diagram payload");
    } catch (error) {
      if (error instanceof ForbiddenXmlError) throw error;
      // The Python validator owns malformed compressed-payload reporting.
      // This preflight only rejects forbidden constructs that can be decoded safely.
    }
  }
}

function main() {
  const input = process.argv[2];
  if (!input || input === "--help" || input === "-h") {
    console.error(usage());
    process.exit(input ? 0 : 2);
  }

  const inputPath = path.resolve(input);
  try {
    const text = fs.readFileSync(inputPath, "utf8");
    rejectForbiddenXml(text, inputPath);
    scanCompressedDiagramPayloads(text);
    console.log(`${inputPath}: strict XML preflight passed`);
  } catch (error) {
    console.error(`FATAL: cannot read or parse ${inputPath}: ${error.message}`);
    process.exit(2);
  }
}

main();
