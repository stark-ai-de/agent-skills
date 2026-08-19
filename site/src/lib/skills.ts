import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";
import matter from "gray-matter";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const REPO_NAME = "stark-ai-de/agent-skills";
const REPO_SOURCE_URL = `https://github.com/${REPO_NAME}`;
const REPO_BLOB_URL = `${REPO_SOURCE_URL}/blob/main`;
const REPO_TREE_URL = `${REPO_SOURCE_URL}/tree/main`;

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
assertMarkdownNormalizationBehavior();
assertSummaryBehavior();

export type SkillKind = "public" | "incubator";
export type SkillInstallHost = "claude-code" | "codex" | "cursor";
export type SkillTargetRuntime = "claude-code" | "codex" | "cursor";

const ALL_INSTALL_HOSTS: readonly SkillInstallHost[] = ["codex", "cursor", "claude-code"];

// Runtime-targeted skills need an explicit cross-host contract; portable categories use every host.
const CROSS_HOST_INSTALL_HOSTS_BY_SKILL: Readonly<Record<string, readonly SkillInstallHost[]>> = {
  "claude-memory-curator": ALL_INSTALL_HOSTS,
  "claude-spec-interviewer": ALL_INSTALL_HOSTS,
  "codex-memory-curator": ["codex", "cursor"],
  "cursor-memory-curator": ALL_INSTALL_HOSTS,
  "cursor-spec-interviewer": ALL_INSTALL_HOSTS,
};

const TARGET_RUNTIME_BY_CATEGORY: Readonly<Partial<Record<string, SkillTargetRuntime>>> = {
  "claude-operations": "claude-code",
  "codex-operations": "codex",
  "cursor-operations": "cursor",
};

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
  defaultInstallHost: SkillInstallHost;
  description: string;
  evalPath?: string;
  evalUrl?: string;
  fileTree: SkillTreeNode;
  hasOpenAiMetadata: boolean;
  html: string;
  installCommands: SkillInstallCommand[];
  kind: SkillKind;
  license: string;
  metadata: SkillMetadata;
  modifiedAt: string;
  name: string;
  openAiMetadataPath?: string;
  openAiMetadataUrl?: string;
  publishedAt: string;
  sourcePath: string;
  sourceUrl: string;
  summary: string;
  supportedInstallHosts: SkillInstallHost[];
  targetRuntime?: SkillTargetRuntime;
  title: string;
  version?: string;
}

export interface SkillInstallCommand {
  command: string;
  host: SkillInstallHost;
}

export interface SkillTreeNode {
  children?: SkillTreeNode[];
  kind: "directory" | "file";
  name: string;
  path: string;
  url: string;
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

export function repoTreeUrl(pathname = "") {
  const cleanPath = pathname.replace(/^\/+/, "");
  return cleanPath ? `${REPO_TREE_URL}/${cleanPath}` : REPO_SOURCE_URL;
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
    .map(([category, groupedSkills]): CategoryGroup => ({
      category,
      label: toTitleCase(category),
      skills: groupedSkills.sort(compareSkillNames),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function sourceRootFor(kind: SkillKind) {
  return kind === "public" ? "skills" : "incubator/skills";
}

export function collectionLabel(kind: SkillKind) {
  return kind === "public" ? "Public catalog" : "Incubator";
}

export function installHostLabel(host: SkillInstallHost) {
  switch (host) {
    case "claude-code":
      return "Claude Code";
    case "codex":
      return "Codex";
    case "cursor":
      return "Cursor";
    default:
      throw new Error(`Unknown install host: ${String(host)}`);
  }
}

async function readSkills(kind: SkillKind) {
  const files = await fg(skillGlobFor(kind), {
    cwd: repoRoot,
    onlyFiles: true,
    dot: false,
  });

  const skills = (await Promise.all(files.sort().map((file) => readSkillFile(kind, file)))).filter(
    (skill): skill is CatalogSkill => Boolean(skill),
  );

  assertUniqueSlugs(kind, skills);
  if (kind === "public") {
    assertCrossHostInstallMatrix(skills);
  }

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

  const folderName = path.basename(path.dirname(sourcePath));
  if (name !== folderName) {
    throw new Error(`Skill name ${name} does not match folder ${folderName}`);
  }

  const description = asString(data.description);
  if (!description) {
    throw new Error(`Missing frontmatter description in ${sourcePath}`);
  }

  const compatibility = asString(data.compatibility);
  const category = metadata.category ?? categoryFromPath(kind, sourcePath);
  const targetRuntime = targetRuntimeForCategory(category);
  const defaultInstallHost = targetRuntime ?? "codex";
  const supportedInstallHosts = supportedInstallHostsFor(name, targetRuntime);
  const skillDir = path.dirname(sourcePath);
  const fileTree = buildSkillTree(skillDir);
  const openAiMetadataPath = normalizePath(path.join(skillDir, "agents/openai.yaml"));
  const hasOpenAiMetadata = existsSync(path.join(repoRoot, openAiMetadataPath));
  const evalPath = publicEvalPath(name);
  const html = sanitizeSkillHtml(
    await marked.parse(normalizeSkillMarkdown(parsed.content, skillDir)),
  );
  const { modifiedAt, publishedAt } = sourceDates(sourcePath);

  return {
    body: parsed.content,
    category,
    categoryLabel: toTitleCase(category),
    compatibility,
    defaultInstallHost,
    description,
    evalPath,
    evalUrl: evalPath ? repoUrl(evalPath) : undefined,
    fileTree,
    hasOpenAiMetadata,
    html,
    installCommands: installCommandsFor(kind, name, defaultInstallHost, supportedInstallHosts),
    kind,
    license: asString(data.license) ?? "Unspecified",
    metadata,
    modifiedAt,
    name,
    openAiMetadataPath: hasOpenAiMetadata ? openAiMetadataPath : undefined,
    openAiMetadataUrl: hasOpenAiMetadata ? repoUrl(openAiMetadataPath) : undefined,
    publishedAt,
    sourcePath,
    sourceUrl: repoUrl(sourcePath),
    summary: summarizeDescription(description),
    supportedInstallHosts,
    targetRuntime,
    title: firstMarkdownHeading(parsed.content) ?? toTitleCase(name),
    version: metadata.version,
  } satisfies CatalogSkill;
}

function sourceDates(sourcePath: string) {
  const fallback = statSync(path.join(repoRoot, sourcePath)).mtime.toISOString();

  try {
    const log = execFileSync("git", ["log", "--format=%cI", "--", sourcePath], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    if (!log) {
      return { modifiedAt: fallback, publishedAt: fallback };
    }

    const dates = log
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    return {
      modifiedAt: dates[0] ?? fallback,
      publishedAt: dates[dates.length - 1] ?? fallback,
    };
  } catch {
    return { modifiedAt: fallback, publishedAt: fallback };
  }
}

function buildSkillTree(relativeDir: string): SkillTreeNode {
  const normalizedDir = normalizePath(relativeDir);
  const absoluteDir = path.join(repoRoot, normalizedDir);
  const children = readdirSync(absoluteDir, { withFileTypes: true })
    .filter((entry) => entry.name !== ".DS_Store")
    .map((entry) => {
      const childPath = normalizePath(path.join(normalizedDir, entry.name));

      if (entry.isDirectory()) {
        return buildSkillTree(childPath);
      }

      return {
        kind: "file",
        name: entry.name,
        path: childPath,
        url: repoUrl(childPath),
      } satisfies SkillTreeNode;
    })
    .sort(compareTreeNodes);

  return {
    children,
    kind: "directory",
    name: path.basename(normalizedDir),
    path: normalizedDir,
    url: repoTreeUrl(normalizedDir),
  } satisfies SkillTreeNode;
}

function compareTreeNodes(a: SkillTreeNode, b: SkillTreeNode) {
  if (a.kind !== b.kind) {
    return a.kind === "directory" ? -1 : 1;
  }

  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
}

function publicEvalPath(name: string) {
  const relativePath = normalizePath(path.join("skill-evals", name, "README.md"));
  const fullPath = path.join(repoRoot, relativePath);

  return existsSync(fullPath) ? relativePath : undefined;
}

function categoryFromPath(kind: SkillKind, sourcePath: string) {
  const segments = sourcePath.split("/");
  return kind === "public" ? segments[1] : segments[2];
}

function targetRuntimeForCategory(category: string) {
  const targetRuntime = TARGET_RUNTIME_BY_CATEGORY[category];

  if (!targetRuntime && category.endsWith("-operations")) {
    throw new Error(`Unknown target runtime category: ${category}`);
  }

  return targetRuntime;
}

function supportedInstallHostsFor(name: string, targetRuntime: SkillTargetRuntime | undefined) {
  if (!targetRuntime) {
    return [...ALL_INSTALL_HOSTS];
  }

  const explicitHosts = CROSS_HOST_INSTALL_HOSTS_BY_SKILL[name];
  if (!explicitHosts) {
    return [targetRuntime];
  }

  if (!explicitHosts.includes(targetRuntime)) {
    throw new Error(`Cross-host install matrix for ${name} omits its target runtime.`);
  }

  return [...explicitHosts];
}

function installCommandsFor(
  kind: SkillKind,
  name: string,
  defaultInstallHost: SkillInstallHost,
  supportedInstallHosts: readonly SkillInstallHost[],
) {
  return orderInstallHosts(defaultInstallHost, supportedInstallHosts).map(
    (host): SkillInstallCommand => ({
      command:
        kind === "public"
          ? `npx skills add https://github.com/${REPO_NAME} --skill ${name} -g -a ${host}`
          : `INSTALL_INTERNAL_SKILLS=1 npx skills add ./incubator/skills --skill ${name} -a ${host} --copy -y`,
      host,
    }),
  );
}

function orderInstallHosts(
  defaultInstallHost: SkillInstallHost,
  supportedInstallHosts: readonly SkillInstallHost[],
) {
  return [
    defaultInstallHost,
    ...supportedInstallHosts.filter((host) => host !== defaultInstallHost),
  ];
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

function normalizeSkillMarkdown(markdown: string, sourceDir = "") {
  let activeFence: { marker: string; length: number } | undefined;

  return stripFirstHeading(markdown)
    .split("\n")
    .map((line) => {
      const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line);

      if (fenceMatch) {
        const fence = fenceMatch[1];

        if (!activeFence) {
          activeFence = { marker: fence[0], length: fence.length };
        } else if (fence[0] === activeFence.marker && fence.length >= activeFence.length) {
          activeFence = undefined;
        }

        return line;
      }

      if (activeFence) {
        return line;
      }

      const withNormalizedHeading = line.replace(/^#\s+/, "## ");
      return withNormalizedHeading.replace(
        /(!?\[[^\]\n]*\]\()([^)\s]+)([^)\n]*\))/g,
        (match, prefix: string, target: string, suffix: string) => {
          if (!sourceDir || /^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(target)) {
            return match;
          }
          const targetMatch = /^([^?#]*)([?#].*)?$/.exec(target);
          const pathPart = targetMatch?.[1] ?? target;
          const targetSuffix = targetMatch?.[2] ?? "";
          const resolved = normalizePath(
            path.posix.normalize(path.posix.join(sourceDir, pathPart)),
          );
          if (resolved === ".." || resolved.startsWith("../")) {
            return match;
          }
          return `${prefix}${repoUrl(resolved)}${targetSuffix}${suffix}`;
        },
      );
    })
    .join("\n");
}

function assertMarkdownNormalizationBehavior() {
  const fixture = [
    "# Page title",
    "",
    "# Section",
    "",
    "[Reference](references/example.md)",
    "",
    "```md",
    "# Example heading",
    "[Literal](references/example.md)",
    "```",
  ].join("\n");
  const normalized = normalizeSkillMarkdown(fixture, "skills/example");

  if (
    !normalized.includes("## Section") ||
    !normalized.includes(`${REPO_BLOB_URL}/skills/example/references/example.md`) ||
    !normalized.includes("```md\n# Example heading\n[Literal](references/example.md)\n```")
  ) {
    throw new Error("Skill Markdown heading normalization changed fenced example content.");
  }
}

function summarizeDescription(value: string, maxLength = 116) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const sentenceMatch = normalized.match(/[.!?](?=\s|$)/);
  const firstSentence =
    sentenceMatch?.index === undefined ? normalized : normalized.slice(0, sentenceMatch.index + 1);

  if (firstSentence.length <= maxLength) {
    return firstSentence;
  }

  const clauseEnds = Array.from(
    firstSentence.slice(0, maxLength).matchAll(/[,;]/g),
    (match) => match.index,
  );
  const clauseEnd = clauseEnds.findLast((index) => index >= Math.floor(maxLength * 0.45));

  if (clauseEnd !== undefined) {
    return `${firstSentence.slice(0, clauseEnd).trimEnd()}.`;
  }

  const candidate = firstSentence.slice(0, maxLength - 1);
  const wordBoundary = candidate.lastIndexOf(" ");
  const summary =
    wordBoundary >= Math.floor(maxLength * 0.65) ? candidate.slice(0, wordBoundary) : candidate;

  return `${summary.trimEnd()}…`;
}

function assertSummaryBehavior() {
  const multiSentence = summarizeDescription(
    "First sentence. A second sentence must not appear in the compact catalog card.",
  );
  const longSentence = summarizeDescription("A ".repeat(90).trim());
  const longClause = summarizeDescription(
    "Build reliable skills from explicit evidence, long templates, and additional implementation details that do not belong in a compact card.",
  );

  if (
    multiSentence !== "First sentence." ||
    longSentence.length > 116 ||
    longClause !== "Build reliable skills from explicit evidence, long templates."
  ) {
    throw new Error("Compact skill summaries must remain one short sentence.");
  }
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

function assertCrossHostInstallMatrix(publicSkills: CatalogSkill[]) {
  const knownHosts = new Set(ALL_INSTALL_HOSTS);
  const skillsByName = new Map(publicSkills.map((skill) => [skill.name, skill]));

  for (const [name, hosts] of Object.entries(CROSS_HOST_INSTALL_HOSTS_BY_SKILL)) {
    const skill = skillsByName.get(name);
    if (!skill || skill.kind !== "public" || !skill.targetRuntime) {
      throw new Error(
        `Cross-host install matrix key ${name} must resolve to a runtime-targeted public skill.`,
      );
    }

    const seenHosts = new Set<SkillInstallHost>();
    for (const host of hosts) {
      if (!knownHosts.has(host)) {
        throw new Error(
          `Cross-host install matrix for ${name} contains unknown host: ${String(host)}`,
        );
      }
      if (seenHosts.has(host)) {
        throw new Error(`Cross-host install matrix for ${name} contains duplicate host: ${host}`);
      }
      seenHosts.add(host);
    }

    if (!seenHosts.has(skill.targetRuntime)) {
      throw new Error(`Cross-host install matrix for ${name} omits its target runtime.`);
    }
    if (seenHosts.size < 2) {
      throw new Error(`Cross-host install matrix for ${name} must include a non-target host.`);
    }
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
