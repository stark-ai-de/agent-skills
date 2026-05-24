import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const adrDir = path.join(root, "docs", "adrs");
const errors = [];
const warnings = [];
const allowedStatuses = new Set(["Proposed", "Accepted", "Superseded", "Deprecated", "Rejected"]);

function words(text) {
  return text.trim().split(/\s+/).filter(Boolean);
}

function sectionText(text, heading) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return "";

  const collected = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("## ")) break;
    collected.push(line);
  }

  return collected.join("\n").trim();
}

if (!fs.existsSync(adrDir)) {
  errors.push("docs/adrs directory is missing");
} else {
  for (const required of ["README.md", "TEMPLATE.md"]) {
    if (!fs.existsSync(path.join(adrDir, required))) {
      errors.push(`docs/adrs/${required} is missing`);
    }
  }

  const allMarkdown = fs.readdirSync(adrDir).filter((file) => file.endsWith(".md"));
  const files = allMarkdown.filter((file) => file !== "README.md" && file !== "TEMPLATE.md").sort();

  if (files.length === 0) {
    warnings.push("No ADR files found");
  }

  for (const file of files) {
    const full = path.join(adrDir, file);
    const rel = path.relative(root, full);

    if (!/^\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(file)) {
      errors.push(`${rel}: filename must match NNNN-kebab-title.md`);
      continue;
    }

    const text = fs.readFileSync(full, "utf8");

    if (!/^# ADR-\d{4}: .+/m.test(text)) {
      errors.push(`${rel}: missing title like "# ADR-0001: Title"`);
    }

    const status = text.match(/^Status:\s*(.+)$/m)?.[1]?.trim();
    const normalizedStatus = status?.replace(/\s+by\s+ADR-\d+$/i, "");

    if (!status) {
      errors.push(`${rel}: missing Status`);
    } else if (!allowedStatuses.has(normalizedStatus)) {
      errors.push(`${rel}: invalid Status "${status}"`);
    }

    for (const field of ["Date", "Owner", "Gist"]) {
      if (!new RegExp(`^${field}:\\s+.+$`, "m").test(text)) {
        errors.push(`${rel}: missing ${field}`);
      }
    }

    const decision = sectionText(text, "Decision");
    if (!decision) {
      errors.push(`${rel}: missing Decision section`);
    } else if (words(decision).length > 55) {
      errors.push(`${rel}: Decision section exceeds 55 words`);
    }

    const body = text
      .replace(/^# .+$/m, "")
      .replace(/^Status:.+$/m, "")
      .replace(/^Date:.+$/m, "")
      .replace(/^Owner:.+$/m, "")
      .replace(/^Gist:.+$/m, "");

    const count = words(body).length;
    if (count > 250) errors.push(`${rel}: ADR body has ${count} words; limit is 250`);
    if (count > 180) warnings.push(`${rel}: ADR body has ${count} words; target is 120-180`);

    const sections = [...body.matchAll(/^##\s+.+$/gm)];
    if (sections.length > 6) {
      errors.push(`${rel}: ADR has ${sections.length} sections; limit is 6`);
    }

    const paragraphs = body
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.replace(/^[-*]\s+/gm, "").trim())
      .filter((paragraph) => paragraph && !paragraph.startsWith("##"));

    for (const paragraph of paragraphs) {
      const paragraphWordCount = words(paragraph).length;
      if (paragraphWordCount > 55) {
        errors.push(`${rel}: paragraph has ${paragraphWordCount} words; limit is 55`);
      }
    }
  }

  const numbered = files
    .filter((file) => /^\d{4}-/.test(file))
    .map((file) => Number(file.slice(0, 4)))
    .sort((a, b) => a - b);

  numbered.forEach((number, index) => {
    const expected = index + 1;
    if (number !== expected) {
      errors.push(
        `docs/adrs: expected ADR number ${String(expected).padStart(4, "0")}, found ${String(number).padStart(4, "0")}`,
      );
    }
  });
}

if (warnings.length) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
  console.log("");
}

if (errors.length) {
  console.error("Errors:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("ADRs validated.");
