import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";
import matter from "gray-matter";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const REPO_NAME = "stark-ai-de/agent-skills";
const REPO_SOURCE_URL = `https://github.com/${REPO_NAME}`;
const REPO_BLOB_URL = `${REPO_SOURCE_URL}/blob/main`;

const EXCLUDED_SKILL_NAMES = new Set(["skillopt-setup"]);
const EXCLUDED_GLOB_PATHS = [
  "incubator/skills/skill-maintenance/skillopt-setup/**",
  "skill-evals/skillopt-setup/**",
];

const repoRoot = findRepoRoot();

marked.use({
  gfm: true,
});

const skillHtmlSanitizerOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    "a",
    "blockquote",
    "br",
    "code",
    "del",
    "em",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "img",
    "li",
    "ol",
    "p",
    "pre",
    "strong",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "ul",
  ],
  allowedAttributes: {
    a: ["href", "title"],
    img: ["alt", "height", "src", "title", "width"],
    th: ["align"],
    td: ["align"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
};

assertSanitizerBehavior();

export type SkillKind = "public" | "incubator";

export interface SkillMetadata {
  author?: string;
  category?: string;
  internal?: boolean;
  version?: string;
  [key: string]: unknown;
}

export interface CatalogSkill {
  body: string;
  category: string;
  categoryLabel: string;
  compatibility?: string;
  description: string;
  evalPath?: string;
  evalUrl?: string;
  hasOpenAiMetadata: boolean;
  html: string;
  installCommand?: string;
  kind: SkillKind;
  license: string;
  localUsageCommand?: string;
  metadata: SkillMetadata;
  name: string;
  openAiMetadataPath?: string;
  openAiMetadataUrl?: string;
  sourcePath: string;
  sourceUrl: string;
  title: string;
  version?: string;
}

export interface CategoryGroup {
  category: string;
  label: string;
  skills: CatalogSkill[];
}

export function repoUrl(pathname = "") {
  const cleanPath = pathname.replace(/^\/+/, "");
  return cleanPath ? `${REPO_BLOB_URL}/${cleanPath}` : REPO_SOURCE_URL;
}

export async function getPublicSkills() {
  return readSkills("public");
}

export async function getIncubatorSkills() {
  return readSkills("incubator");
}

export async function getAllSkills() {
  const [publicSkills, incubatorSkills] = await Promise.all([
    getPublicSkills(),
    getIncubatorSkills(),
  ]);

  return [...publicSkills, ...incubatorSkills];
}

export function groupByCategory(skills: CatalogSkill[]) {
  const groups = new Map<string, CatalogSkill[]>();

  for (const skill of skills) {
    const group = groups.get(skill.category) ?? [];
    group.push(skill);
    groups.set(skill.category, group);
  }

  return [...groups.entries()]
    .map(
      ([category, groupedSkills]): CategoryGroup => ({
        category,
        label: toTitleCase(category),
        skills: groupedSkills.sort(compareSkillNames),
      }),
    )
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function sourceRootFor(kind: SkillKind) {
  return kind === "public" ? "skills" : "incubator/skills";
}

export function collectionLabel(kind: SkillKind) {
  return kind === "public" ? "Public catalog" : "Incubator";
}

async function readSkills(kind: SkillKind) {
  const files = await fg(skillGlobFor(kind), {
    cwd: repoRoot,
    onlyFiles: true,
    dot: false,
    ignore: EXCLUDED_GLOB_PATHS,
  });

  const skills = (await Promise.all(files.sort().map((file) => readSkillFile(kind, file)))).filter(
    (skill): skill is CatalogSkill => Boolean(skill),
  );

  assertUniqueSlugs(kind, skills);

  return skills.sort(compareSkillNames);
}

function skillGlobFor(kind: SkillKind) {
  return kind === "public" ? "skills/**/SKILL.md" : "incubator/skills/**/SKILL.md";
}

async function readSkillFile(kind: SkillKind, relativePath: string) {
  const sourcePath = normalizePath(relativePath);
  const fullPath = path.join(repoRoot, sourcePath);
  const raw = await readFile(fullPath, "utf8");
  const parsed = matter(raw);
  const data = parsed.data;
  const metadata = normalizeMetadata(data.metadata);
  const name = asString(data.name);

  if (!name) {
    throw new Error(`Missing frontmatter name in ${sourcePath}`);
  }

  if (EXCLUDED_SKILL_NAMES.has(name)) {
    return undefined;
  }

  const folderName = path.basename(path.dirname(sourcePath));
  if (name !== folderName) {
    throw new Error(`Skill name ${name} does not match folder ${folderName}`);
  }

  const description = asString(data.description);
  if (!description) {
    throw new Error(`Missing frontmatter description in ${sourcePath}`);
  }

  const category = metadata.category ?? categoryFromPath(kind, sourcePath);
  const skillDir = path.dirname(sourcePath);
  const openAiMetadataPath = normalizePath(path.join(skillDir, "agents/openai.yaml"));
  const hasOpenAiMetadata = existsSync(path.join(repoRoot, openAiMetadataPath));
  const evalPath = publicEvalPath(name);
  const html = sanitizeSkillHtml(await marked.parse(stripFirstHeading(parsed.content)));

  return {
    body: parsed.content,
    category,
    categoryLabel: toTitleCase(category),
    compatibility: asString(data.compatibility),
    description,
    evalPath,
    evalUrl: evalPath ? repoUrl(evalPath) : undefined,
    hasOpenAiMetadata,
    html,
    installCommand:
      kind === "public"
        ? `npx skills add https://github.com/${REPO_NAME} --skill ${name} -g -a codex`
        : undefined,
    kind,
    license: asString(data.license) ?? "Unspecified",
    localUsageCommand:
      kind === "incubator"
        ? `INSTALL_INTERNAL_SKILLS=1 npx skills add ./incubator/skills --skill ${name} -a codex --copy -y`
        : `npx skills add ./skills --skill ${name} -a codex --copy -y`,
    metadata,
    name,
    openAiMetadataPath: hasOpenAiMetadata ? openAiMetadataPath : undefined,
    openAiMetadataUrl: hasOpenAiMetadata ? repoUrl(openAiMetadataPath) : undefined,
    sourcePath,
    sourceUrl: repoUrl(sourcePath),
    title: firstMarkdownHeading(parsed.content) ?? toTitleCase(name),
    version: metadata.version,
  } satisfies CatalogSkill;
}

function publicEvalPath(name: string) {
  if (EXCLUDED_SKILL_NAMES.has(name)) {
    return undefined;
  }

  const relativePath = normalizePath(path.join("skill-evals", name, "README.md"));
  const fullPath = path.join(repoRoot, relativePath);

  return existsSync(fullPath) ? relativePath : undefined;
}

function categoryFromPath(kind: SkillKind, sourcePath: string) {
  const segments = sourcePath.split("/");
  return kind === "public" ? segments[1] : segments[2];
}

function normalizeMetadata(value: unknown): SkillMetadata {
  if (!isRecord(value)) {
    return {};
  }

  return {
    ...value,
    author: asString(value.author),
    category: asString(value.category),
    internal: Boolean(value.internal),
    version: asString(value.version),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function firstMarkdownHeading(markdown: string) {
  const match = /^#\s+(.+)$/m.exec(markdown);
  return match?.[1]?.trim();
}

function stripFirstHeading(markdown: string) {
  return markdown.trimStart().replace(/^#\s+.+(?:\n+|$)/, "");
}

function sanitizeSkillHtml(html: string) {
  return sanitizeHtml(html, skillHtmlSanitizerOptions);
}

function assertSanitizerBehavior() {
  const sanitized = sanitizeSkillHtml(
    '<script>alert(1)</script><a href="javascript:alert(1)" onclick="alert(1)">x</a><img src="https://example.com/x.png" onerror="alert(1)">',
  );

  if (/(<script|javascript:|onerror=|onclick=)/i.test(sanitized)) {
    throw new Error("Skill HTML sanitizer did not remove unsafe markup.");
  }
}

function compareSkillNames(a: CatalogSkill, b: CatalogSkill) {
  return a.name.localeCompare(b.name);
}

function toTitleCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function assertUniqueSlugs(kind: SkillKind, skills: CatalogSkill[]) {
  const seen = new Set<string>();

  for (const skill of skills) {
    if (seen.has(skill.name)) {
      throw new Error(`Duplicate ${kind} skill route for ${skill.name}`);
    }
    seen.add(skill.name);
  }
}

function normalizePath(value: string) {
  return value.split(path.sep).join("/");
}

function findRepoRoot() {
  const cwd = process.cwd();

  if (existsSync(path.join(cwd, "skills")) && existsSync(path.join(cwd, "incubator"))) {
    return cwd;
  }

  return path.resolve(cwd, "..");
}
