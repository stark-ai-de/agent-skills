import fs from "node:fs";
import path from "node:path";

const ignoredDirectories = new Set([
  ".git",
  ".hg",
  ".svn",
  ".next",
  ".turbo",
  "dist",
  "build",
  "coverage",
  "node_modules",
]);

export function isDirectory(value) {
  try {
    return fs.statSync(value).isDirectory();
  } catch {
    return false;
  }
}

export function isFile(value) {
  try {
    return fs.statSync(value).isFile();
  } catch {
    return false;
  }
}

export function walk(dir, predicate = () => true) {
  const files = [];

  function visit(current) {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) visit(fullPath);
      } else if (entry.isFile() && predicate(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  if (isDirectory(dir)) visit(dir);
  return files.sort();
}

export function collectAncestorAgentFiles(repo) {
  const files = [];
  let directory = path.dirname(path.resolve(repo));

  while (true) {
    const candidate = path.join(directory, "AGENTS.md");
    if (isFile(candidate)) files.push(candidate);

    const parent = path.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }

  return files;
}

export function collectProjectFiles(repo) {
  return [
    ...collectAncestorAgentFiles(repo),
    path.join(repo, "CLAUDE.md"),
    path.join(repo, ".claude", "CLAUDE.md"),
    path.join(repo, "CLAUDE.local.md"),
    path.join(repo, ".claude", "settings.json"),
    path.join(repo, ".claude", "settings.local.json"),
    ...walk(repo, (file) => {
      const name = path.basename(file);
      const relative = path.relative(repo, file).split(path.sep);
      const isProjectRule = relative.some(
        (part, index) => part === ".claude" && relative[index + 1] === "rules",
      );
      return (
        (isProjectRule && file.endsWith(".md")) ||
        name === "CLAUDE.md" ||
        name === "CLAUDE.local.md" ||
        (name === "AGENTS.md" && !path.relative(repo, file).split(path.sep).includes(".agents"))
      );
    }),
  ];
}
