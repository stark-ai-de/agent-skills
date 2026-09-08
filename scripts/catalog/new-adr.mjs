import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const adrDir = path.join(root, "docs", "adrs");
const catalogPath = path.join(root, "docs", "adrs.md");
const variants = ["short", "long", "guide"];
const categories = [
  "governance",
  "agent-lifecycle",
  "repository-architecture",
  "frontend",
  "backend",
  "runtime-platform",
  "security-data",
  "stack-tooling",
  "quality-delivery",
];
const allowedCategories = new Set(categories);

function usage(message) {
  if (message) console.error(message);
  console.error(
    'Usage: pnpm run adr:new -- "Use category-based skill folders" --category governance --tags "adr, taxonomy" --applies-when "Changing skill categories." --gist "Skills use durable workflow categories." [--owner stark-ai-de]',
  );
  process.exit(1);
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function parseArguments(argv) {
  if (!argv.length || argv[0].startsWith("--")) usage("ADR title is required");
  const title = argv[0];
  const options = {};
  const allowed = new Set(["category", "tags", "applies-when", "gist", "owner"]);
  for (let index = 1; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || !allowed.has(flag.slice(2)))
      usage(`Unknown option: ${flag ?? "<missing>"}`);
    if (!value || value.startsWith("--")) usage(`Missing value for ${flag}`);
    const name = flag.slice(2);
    if (Object.hasOwn(options, name)) usage(`Duplicate option: ${flag}`);
    options[name] = value.trim();
  }
  for (const required of ["category", "tags", "applies-when", "gist"]) {
    if (!options[required]) usage(`--${required} is required`);
  }
  return { title: title.trim(), ...options, owner: options.owner || "stark-ai-de" };
}

function field(text, name) {
  return text.match(new RegExp(`^${name}: (.+)$`, "m"))?.[1];
}

function renderMarkdownTable(header, rows) {
  const widths = header.map((cell, index) =>
    Math.max(3, cell.length, ...rows.map((row) => row[index].length)),
  );
  const renderRow = (row) =>
    `| ${row.map((cell, index) => cell.padEnd(widths[index])).join(" | ")} |`;
  return [
    renderRow(header),
    `| ${widths.map((width) => "-".repeat(width)).join(" | ")} |`,
    ...rows.map(renderRow),
  ].join("\n");
}

function renderCatalog(newRecord) {
  const current = fs.readFileSync(catalogPath, "utf8");
  const marker = "## Index by category";
  const markerIndex = current.indexOf(marker);
  if (markerIndex === -1) throw new Error("docs/adrs.md is missing the index marker");
  const prefix = current.slice(0, markerIndex).trimEnd();
  const records = fs
    .readdirSync(adrDir)
    .filter((file) => /^\d{4}-.+\.short\.md$/.test(file))
    .map((file) => {
      const text = fs.readFileSync(path.join(adrDir, file), "utf8");
      return {
        id: file.slice(0, 4),
        stem: file.slice(0, -".short.md".length),
        category: field(text, "Category"),
        status: field(text, "Status"),
        gist: field(text, "Gist"),
      };
    });
  records.push(newRecord);
  records.sort((left, right) => left.id.localeCompare(right.id));

  const sections = categories
    .map((category) => {
      const categoryRecords = records.filter((record) => record.category === category);
      const rows = categoryRecords.length
        ? categoryRecords.map(({ id, stem, status, gist }) => [
            `[ADR-${id}](adrs/${stem}.short.md)`,
            status,
            gist,
            `[Long, canonical](adrs/${stem}.long.md)`,
            `[Guide](adrs/${stem}.guide.md)`,
          ])
        : [["_None_", "—", "—", "—", "—"]];
      return `### ${category}\n\n${renderMarkdownTable(
        ["Short", "Status", "Gist", "Long", "Guide"],
        rows,
      )}`;
    })
    .join("\n\n");
  return `${prefix}\n\n${marker}\n\n${sections}\n`;
}

const {
  title,
  category,
  tags: rawTags,
  "applies-when": appliesWhen,
  gist,
  owner,
} = parseArguments(process.argv.slice(2));

if (!fs.existsSync(adrDir)) usage("docs/adrs directory is missing");
if (!fs.existsSync(catalogPath)) usage("docs/adrs.md is missing");
for (const variant of variants) {
  if (!fs.existsSync(path.join(adrDir, `TEMPLATE.${variant}.md`))) {
    usage(`docs/adrs/TEMPLATE.${variant}.md is missing`);
  }
}
if (!title) usage("ADR title must not be empty");
if (!allowedCategories.has(category)) usage(`Invalid category: ${category}`);
if (!owner) usage("Owner must not be empty");
for (const [name, value] of [
  ["title", title],
  ["owner", owner],
  ["applies-when", appliesWhen],
  ["gist", gist],
]) {
  if (/[\r\n]/.test(value)) usage(`${name} must be a single line`);
}
if (gist.includes("|")) usage("gist must not contain a table separator (|)");

const tags = rawTags
  .split(",")
  .map((tag) => tag.trim())
  .filter(Boolean);
if (!tags.length || tags.some((tag) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag))) {
  usage("Tags must be lower-kebab values separated by commas");
}
if (new Set(tags).size !== tags.length) usage("Tags must be unique");
const normalizedTags = tags.join(", ");

const slug = slugify(title);
if (!slug) usage("ADR title must contain letters or numbers");

const inventory = new Map();
for (const file of fs.readdirSync(adrDir)) {
  const match = file.match(/^(\d{4})-([a-z0-9]+(?:-[a-z0-9]+)*)\.(short|long|guide)\.md$/);
  if (!match) continue;
  const [, id, slug, variant] = match;
  if (!inventory.has(id)) inventory.set(id, { stems: new Set(), variants: new Set() });
  inventory.get(id).stems.add(`${id}-${slug}`);
  inventory.get(id).variants.add(variant);
}
for (const [id, found] of inventory) {
  if (found.stems.size !== 1 || found.variants.size !== variants.length) {
    usage(`Existing ADR-${id} is not one complete triplet`);
  }
}

const nextNumber = (inventory.size ? Math.max(...[...inventory.keys()].map(Number)) : 0) + 1;
const number = String(nextNumber).padStart(4, "0");
const stem = `${number}-${slug}`;
const today = new Date().toISOString().slice(0, 10);
const targets = variants.map((variant) => path.join(adrDir, `${stem}.${variant}.md`));
for (const target of targets) {
  if (fs.existsSync(target))
    usage(`Refusing to overwrite existing ADR: ${path.relative(root, target)}`);
}

const rendered = variants.map((variant) => {
  const template = fs.readFileSync(path.join(adrDir, `TEMPLATE.${variant}.md`), "utf8");
  return template
    .replaceAll("ADR-0000", `ADR-${number}`)
    .replaceAll("0000-short-title", stem)
    .replaceAll("<short title>", title)
    .replaceAll("YYYY-MM-DD", today)
    .replaceAll("<person or team>", owner)
    .replaceAll("<category>", category)
    .replaceAll("<comma-separated-tags>", normalizedTags)
    .replaceAll("<trigger condition>", appliesWhen)
    .replaceAll("<one-sentence summary>", gist);
});
const catalog = renderCatalog({ id: number, stem, category, status: "Proposed", gist });
const temporaryTargets = targets.map((target) => `${target}.${process.pid}.tmp`);
const catalogTemporary = `${catalogPath}.${process.pid}.tmp`;
const created = [];

try {
  for (let index = 0; index < temporaryTargets.length; index += 1) {
    fs.writeFileSync(temporaryTargets[index], rendered[index], { encoding: "utf8", flag: "wx" });
  }
  fs.writeFileSync(catalogTemporary, catalog, { encoding: "utf8", flag: "wx" });
  for (let index = 0; index < targets.length; index += 1) {
    fs.renameSync(temporaryTargets[index], targets[index]);
    created.push(targets[index]);
  }
  fs.renameSync(catalogTemporary, catalogPath);
} catch (error) {
  for (const file of [...temporaryTargets, catalogTemporary, ...created]) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  console.error(`Failed to create ADR triplet: ${error.message}`);
  process.exit(1);
}

for (const target of targets) console.log(`Created ${path.relative(root, target)}`);
console.log("Updated docs/adrs.md");
console.log("Complete every body placeholder before running pnpm run validate:adrs.");
