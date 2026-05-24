import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const adrDir = path.join(root, "docs", "adrs");
const templatePath = path.join(adrDir, "TEMPLATE.md");
const [title] = process.argv.slice(2);

function usage() {
  console.error('Usage: npm run adr:new -- "Use category-based skill folders"');
  process.exit(1);
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

if (!title) usage();

if (!fs.existsSync(adrDir)) {
  console.error("docs/adrs directory is missing");
  process.exit(1);
}

if (!fs.existsSync(templatePath)) {
  console.error("docs/adrs/TEMPLATE.md is missing");
  process.exit(1);
}

const slug = slugify(title);
if (!slug) {
  console.error("ADR title must contain letters or numbers");
  process.exit(1);
}

const numbers = fs
  .readdirSync(adrDir)
  .map((file) => file.match(/^(\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/)?.[1])
  .filter(Boolean)
  .map(Number);

const nextNumber = (numbers.length ? Math.max(...numbers) : 0) + 1;
const number = String(nextNumber).padStart(4, "0");
const filename = `${number}-${slug}.md`;
const target = path.join(adrDir, filename);

if (fs.existsSync(target)) {
  console.error(`Refusing to overwrite existing ADR: ${path.relative(root, target)}`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const content = fs
  .readFileSync(templatePath, "utf8")
  .replace("ADR-0000", `ADR-${number}`)
  .replace("<short title>", title)
  .replace("Date: YYYY-MM-DD", `Date: ${today}`)
  .replace("Owner: <person or team>", "Owner: stark-ai-de");

fs.writeFileSync(target, content, "utf8");
console.log(`Created ${path.relative(root, target)}`);
