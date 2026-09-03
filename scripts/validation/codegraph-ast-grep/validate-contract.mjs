import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TextDecoder } from "node:util";

import { validateLegacyCaseLineage } from "../lib/legacy-case-lineage.mjs";

const root = process.cwd();
const skillDir = path.join(root, "skills", "engineering-workflows", "codegraph-ast-grep");
const errors = [];

function fail(message) {
  errors.push(message);
}

function hasSymlinkComponent(file) {
  const relative = path.relative(root, file);
  if (relative === "" || relative === ".") return false;
  let current = root;
  for (const component of relative.split(path.sep)) {
    current = path.join(current, component);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) return true;
  }
  return false;
}

function requireFile(relativePath) {
  const file = path.join(root, relativePath);
  if (!fs.existsSync(file)) {
    fail(`${relativePath}: missing required file`);
    return "";
  }
  if (hasSymlinkComponent(file)) {
    fail(`${relativePath}: symlinked path components are not permitted`);
    return "";
  }
  if (!fs.lstatSync(file).isFile()) {
    fail(`${relativePath}: expected a regular file, not a directory or symlink`);
    return "";
  }
  const bytes = fs.readFileSync(file);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail(`${relativePath}: must be valid UTF-8`);
    return "";
  }
}

function requireJson(relativePath) {
  const text = requireFile(relativePath);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`${relativePath}: invalid JSON (${error.message})`);
    return null;
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function readUtf8Artifact(relativePath) {
  const errorCount = errors.length;
  requireFile(relativePath);
  if (errors.length !== errorCount) return { bytes: Buffer.alloc(0), text: "" };
  const bytes = fs.readFileSync(path.join(root, relativePath));
  try {
    return { bytes, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    fail(`${relativePath}: artifact is not valid UTF-8`);
    return { bytes, text: "" };
  }
}

function readJsonArtifact(relativePath) {
  const artifact = readUtf8Artifact(relativePath);
  try {
    return { ...artifact, value: JSON.parse(artifact.text) };
  } catch (error) {
    fail(`${relativePath}: invalid JSON (${error.message})`);
    return { ...artifact, value: null };
  }
}

function validateRepoPath(label, value, requiredPrefix = "") {
  if (typeof value !== "string" || value.length === 0 || path.isAbsolute(value)) {
    fail(`${label}: expected a repository-relative path`);
    return null;
  }
  const normalized = path.normalize(value);
  if (
    normalized === ".." ||
    normalized.startsWith(`..${path.sep}`) ||
    (requiredPrefix && !normalized.startsWith(path.normalize(requiredPrefix)))
  ) {
    fail(`${label}: path escapes its permitted repository scope`);
    return null;
  }
  return normalized;
}

function requirePattern(label, text, pattern, message) {
  if (!pattern.test(text)) fail(`${label}: ${message}`);
}

function forbidPattern(label, text, pattern, message) {
  if (pattern.test(text)) fail(`${label}: ${message}`);
}

function requireNear(label, text, needle, qualifier, radius, message) {
  const flags = needle.flags.includes("g") ? needle.flags : `${needle.flags}g`;
  const globalNeedle = new RegExp(needle.source, flags);
  let found = false;

  for (const match of text.matchAll(globalNeedle)) {
    found = true;
    const start = Math.max(0, match.index - radius);
    const end = Math.min(text.length, match.index + match[0].length + radius);
    if (!qualifier.test(text.slice(start, end))) {
      fail(`${label}: ${message}`);
    }
  }

  if (!found) fail(`${label}: missing required example matching ${needle}`);
}

function fencedBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let open = null;

  function stripBlockquote(line, depth = null) {
    let value = line;
    let stripped = 0;
    while (depth === null || stripped < depth) {
      const match = /^[ \t]{0,3}>[ \t]?/.exec(value);
      if (!match) break;
      value = value.slice(match[0].length);
      stripped += 1;
    }
    return { value, depth: stripped };
  }

  for (const rawLine of lines) {
    if (!open) {
      const quoted = stripBlockquote(rawLine);
      let candidate = quoted.value;
      let quoteDepth = quoted.depth;
      let match = /^[ \t]*(`{3,}|~{3,})[ \t]*([^\n]*)$/.exec(candidate);
      if (!match) {
        candidate = candidate.replace(/^[ \t]*(?:[-+*]|\d+[.)])[ \t]+(?=`{3,}|~{3,})/, "");
        match = /^[ \t]*(`{3,}|~{3,})[ \t]*([^\n]*)$/.exec(candidate);
      }
      if (match) {
        open = {
          marker: match[1][0],
          length: match[1].length,
          language: match[2].trim().split(/\s+/, 1)[0].toLowerCase(),
          quoteDepth,
          body: [],
        };
      }
      continue;
    }

    const line = open.quoteDepth > 0 ? stripBlockquote(rawLine, open.quoteDepth).value : rawLine;
    const closingFence = new RegExp(`^[ \\t]*[${open.marker}]{${open.length},}[ \\t]*$`);
    if (closingFence.test(line)) {
      blocks.push({ language: open.language, body: open.body.join("\n") });
      open = null;
    } else {
      open.body.push(line);
    }
  }

  if (open) {
    blocks.push({ language: open.language, body: open.body.join("\n"), unclosed: true });
  }

  return blocks;
}

function fencedCode(text) {
  return fencedBlocks(text)
    .map((block) => block.body)
    .join("\n");
}

function normalizeCommandText(text, decodeSerializedEscapes) {
  let normalized = text;
  if (decodeSerializedEscapes) {
    normalized = normalized
      .replace(/\\u([0-9a-f]{4})/gi, (_match, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
      .replace(/\\\//g, "/");
  }
  return normalized
    .replace(/\\\r?\n[ \t]*/g, " ")
    .replace(/`\r?\n[ \t]*/g, " ")
    .replace(/\|&/g, "|")
    .replace(/\|[ \t]*\r?\n[ \t]*/g, "| ");
}

function looksLikeSerializedConfig(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      JSON.parse(trimmed);
      return true;
    } catch {
      // Continue with the lightweight TOML/YAML shape check.
    }
  }
  return /^\s*["']?(?:command|args|env|mcpServers?|mcp_servers)["']?\s*[:=]/m.test(text);
}

function stripShellComment(line) {
  let quote = null;
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\" && quote !== "'") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character === "#" && (index === 0 || /[\s|;&()<>]/.test(line[index - 1]))) {
      return line.slice(0, index);
    }
  }
  return line;
}

function stripSerializedConfigComments(text, language) {
  const slashComments =
    language === "jsonc" || new Set(["", "text", "plaintext", "config", "conf"]).has(language);
  const hashComments = new Set([
    "toml",
    "yaml",
    "yml",
    "",
    "text",
    "plaintext",
    "config",
    "conf",
  ]).has(language);
  return text
    .split(/\r?\n/)
    .map((line) => {
      let quote = null;
      let escaped = false;
      for (let index = 0; index < line.length; index += 1) {
        const character = line[index];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (character === "\\" && quote === '"') {
          escaped = true;
          continue;
        }
        if (quote) {
          if (character === quote) quote = null;
          continue;
        }
        if (character === "'" || character === '"') {
          quote = character;
          continue;
        }
        const atCommentBoundary = index === 0 || /[\s,[\]{}]/.test(line[index - 1]);
        if (
          slashComments &&
          (language === "jsonc" || atCommentBoundary) &&
          line.slice(index, index + 2) === "//"
        ) {
          return line.slice(0, index);
        }
        if (hashComments && (language === "toml" || atCommentBoundary) && character === "#") {
          return line.slice(0, index);
        }
      }
      return line;
    })
    .join("\n");
}

function foldYamlBlockScalars(text) {
  const lines = text.split(/\r?\n/);
  const folded = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = /^(\s*)(?:-\s*|[^:#]+:\s*)>[+-]?\s*$/.exec(line);
    if (!match) {
      folded.push(line);
      continue;
    }
    const baseIndent = match[1].length;
    const body = [];
    let bodyIndex = index + 1;
    for (; bodyIndex < lines.length; bodyIndex += 1) {
      const candidate = lines[bodyIndex];
      if (candidate.trim() && candidate.search(/\S/) <= baseIndent) break;
      body.push(candidate.trim());
    }
    folded.push(`${match[1]}${body.filter(Boolean).join(" ")}`);
    index = bodyIndex - 1;
  }
  return folded.join("\n");
}

function parseHeredocStart(line) {
  line = stripShellComment(line);
  const match = /<<(-)?[ \t]*/.exec(line);
  if (!match || line[match.index + match[0].length] === "<") return null;
  let index = match.index + match[0].length;
  let delimiter = "";
  let quote = null;
  let escaped = false;
  let quoted = false;
  for (; index < line.length; index += 1) {
    const character = line[index];
    if (escaped) {
      delimiter += character;
      escaped = false;
      continue;
    }
    if (character === "\\" && quote !== "'") {
      escaped = true;
      quoted = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      else delimiter += character;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      quoted = true;
      continue;
    }
    if (/\s/.test(character) || /[|;&<>]/.test(character)) break;
    delimiter += character;
  }
  return delimiter.length > 0 && !quote && !escaped
    ? { delimiter, stripTabs: Boolean(match[1]), quoted }
    : null;
}

function heredocExpansionBodies(text) {
  const bodies = [];
  const lines = text.split(/\r?\n/);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const heredoc = parseHeredocStart(lines[lineIndex]);
    if (!heredoc) continue;
    const closingIndex = lines.findIndex((candidate, candidateIndex) => {
      if (candidateIndex <= lineIndex) return false;
      const normalized = heredoc.stripTabs ? candidate.replace(/^\t+/, "") : candidate;
      return normalized === heredoc.delimiter;
    });
    if (closingIndex === -1) continue;
    if (!heredoc.quoted) bodies.push(lines.slice(lineIndex + 1, closingIndex).join("\n"));
    lineIndex = closingIndex;
  }
  return bodies;
}

function stripShellHeredocs(text) {
  const kept = [];
  const lines = text.split(/\r?\n/);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    kept.push(line);
    const heredoc = parseHeredocStart(line);
    const codeLine = stripShellComment(line);
    const stages = splitPipeline(codeLine, true);
    const shells = new Set(["sh", "bash", "zsh", "dash", "ksh"]);
    const bodyIsExecutedByShell =
      stageCommandCandidates(stages[0] ?? "", "sink").some((command) => shells.has(command)) ||
      stages
        .slice(1)
        .some((stage) =>
          stageCommandCandidates(stage, "sink").some((command) => shells.has(command)),
        );
    if (!heredoc || bodyIsExecutedByShell) continue;
    const closingIndex = lines.findIndex((candidate, candidateIndex) => {
      if (candidateIndex <= lineIndex) return false;
      const normalized = heredoc.stripTabs ? candidate.replace(/^\t+/, "") : candidate;
      return normalized === heredoc.delimiter;
    });
    // Malformed or unterminated delimiters must not suppress later command scanning.
    if (closingIndex !== -1) lineIndex = closingIndex;
  }
  return kept.join("\n");
}

function splitPipeline(line, respectQuotes) {
  const stages = [];
  let current = "";
  let quote = null;
  let escaped = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (respectQuotes && character === "\\" && quote !== "'") {
      current += character;
      escaped = true;
      continue;
    }
    if (respectQuotes && quote) {
      current += character;
      if (character === quote) quote = null;
      continue;
    }
    if (respectQuotes && (character === "'" || character === '"')) {
      quote = character;
      current += character;
      continue;
    }
    if (character === "|" && line[index + 1] === "|") {
      current += "||";
      index += 1;
      continue;
    }
    if (character === "|") {
      stages.push(current);
      current = "";
      continue;
    }
    current += character;
  }
  stages.push(current);
  return stages;
}

function shellTokens(text) {
  const tokens = [];
  let current = "";
  let quote = null;
  let escaped = false;
  const pushCurrent = () => {
    if (current.length > 0) tokens.push(current);
    current = "";
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (character === "\\" && quote !== "'") {
      const next = text[index + 1] ?? "";
      const windowsDrivePath = quote === null && /^[A-Za-z]:/.test(current);
      const literalInDoubleQuotes =
        quote === '"' && !new Set(["$", "`", '"', "\\", "\n"]).has(next);
      if (windowsDrivePath || literalInDoubleQuotes) current += character;
      else escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      else current += character;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (/\s/.test(character)) {
      pushCurrent();
      continue;
    }
    if (
      character === ";" ||
      character === "{" ||
      character === "}" ||
      character === "(" ||
      character === ")"
    ) {
      pushCurrent();
      tokens.push(character);
      continue;
    }
    if ((character === "&" || character === "|") && text[index + 1] === character) {
      pushCurrent();
      tokens.push(`${character}${character}`);
      index += 1;
      continue;
    }
    if (character === "&" && (/[<>]$/.test(current) || text[index + 1] === ">")) {
      current += character;
      continue;
    }
    if (character === "&") {
      pushCurrent();
      tokens.push(character);
      continue;
    }
    current += character;
  }
  pushCurrent();
  return tokens;
}

function shellCommandSegments(text) {
  const segments = [[]];
  for (const token of shellTokens(text)) {
    if (new Set([";", "&", "&&", "||"]).has(token)) segments.push([]);
    else segments.at(-1).push(token);
  }
  return segments.filter((segment) => segment.length > 0);
}

function commandBasename(token) {
  const basename = token.replace(/\\/g, "/").split("/").at(-1).toLowerCase();
  return /^(?:curl|wget|pwsh|powershell|sh|bash|zsh|dash|ksh)\.exe$/.test(basename)
    ? basename.slice(0, -4)
    : basename;
}

function optionHasInlineValue(token) {
  return token.includes("=") || /^-[A-Za-z].+/.test(token);
}

function unwrapShellCommand(tokens) {
  let index = 0;
  const skipGroupingAndAssignments = () => {
    while (index < tokens.length) {
      const token = tokens[index];
      if (
        token === "{" ||
        token === "(" ||
        token === "!" ||
        /^[A-Za-z_][A-Za-z0-9_]*=.*/.test(token)
      ) {
        index += 1;
        continue;
      }
      const redirection = /^(?:\d*)?(?:&>>?|>>?|<<?|<>|>&|<&)(.*)$/.exec(token);
      if (redirection) {
        index += 1;
        if (redirection[1].length === 0 && index < tokens.length) index += 1;
        continue;
      }
      break;
    }
  };
  skipGroupingAndAssignments();

  while (index < tokens.length) {
    const wrapper = commandBasename(tokens[index]);
    if (wrapper === "busybox") {
      index += 1;
      while (tokens[index]?.startsWith("-")) index += 1;
      return index < tokens.length ? commandBasename(tokens[index]) : "";
    }
    if (
      !new Set([
        "sudo",
        "doas",
        "env",
        "command",
        "exec",
        "time",
        "nohup",
        "nice",
        "stdbuf",
        "timeout",
      ]).has(wrapper)
    ) {
      return wrapper;
    }
    index += 1;

    if (wrapper === "command") {
      if (tokens.slice(index).some((token) => token === "-v" || token === "-V")) return "";
      while (tokens[index] === "-p" || tokens[index] === "--") index += 1;
    } else if (wrapper === "sudo" || wrapper === "doas") {
      const optionsWithValues = new Set([
        "-C",
        "--close-from",
        "-D",
        "--chdir",
        "-g",
        "--group",
        "-h",
        "--host",
        "-p",
        "--prompt",
        "-r",
        "--role",
        "-R",
        "--chroot",
        "-T",
        "--command-timeout",
        "-t",
        "--type",
        "-u",
        "--user",
        "-C",
        "--config",
      ]);
      while (tokens[index]?.startsWith("-")) {
        const option = tokens[index];
        index += 1;
        if (optionsWithValues.has(option) && !optionHasInlineValue(option)) index += 1;
        if (option === "--") break;
      }
    } else if (wrapper === "env") {
      const optionsWithValues = new Set(["-C", "--chdir", "-S", "--split-string", "-u", "--unset"]);
      let splitString = "";
      while (tokens[index]?.startsWith("-")) {
        const option = tokens[index];
        index += 1;
        if ((option === "-S" || option === "--split-string") && !optionHasInlineValue(option)) {
          splitString = tokens[index] ?? "";
          index += 1;
        } else if (/^-S.+/.test(option)) {
          splitString = option.slice(2);
        } else if (option.startsWith("--split-string=")) {
          splitString = option.slice("--split-string=".length);
        } else if (optionsWithValues.has(option) && !optionHasInlineValue(option)) {
          index += 1;
        }
        if (option === "--") break;
      }
      if (splitString) return unwrapShellCommand(shellTokens(splitString));
      skipGroupingAndAssignments();
    } else if (wrapper === "exec") {
      while (tokens[index]?.startsWith("-")) {
        const option = tokens[index];
        index += 1;
        if (option === "-a" && !optionHasInlineValue(option)) index += 1;
        if (option === "--") break;
      }
    } else if (wrapper === "time") {
      const optionsWithValues = new Set(["-f", "--format", "-o", "--output"]);
      while (tokens[index]?.startsWith("-")) {
        const option = tokens[index];
        index += 1;
        if (optionsWithValues.has(option) && !optionHasInlineValue(option)) index += 1;
        if (option === "--") break;
      }
    } else if (wrapper === "nohup") {
      if (tokens[index] === "--") index += 1;
    } else if (wrapper === "nice") {
      while (tokens[index]?.startsWith("-")) {
        const option = tokens[index];
        index += 1;
        if (new Set(["-n", "--adjustment"]).has(option) && !optionHasInlineValue(option))
          index += 1;
        if (option === "--") break;
      }
    } else if (wrapper === "stdbuf") {
      while (tokens[index]?.startsWith("-")) {
        const option = tokens[index];
        index += 1;
        if (
          new Set(["-i", "--input", "-o", "--output", "-e", "--error"]).has(option) &&
          !optionHasInlineValue(option)
        )
          index += 1;
        if (option === "--") break;
      }
    } else if (wrapper === "timeout") {
      while (tokens[index]?.startsWith("-")) {
        const option = tokens[index];
        index += 1;
        if (
          new Set(["-k", "--kill-after", "-s", "--signal"]).has(option) &&
          !optionHasInlineValue(option)
        )
          index += 1;
        if (option === "--") break;
      }
      if (index < tokens.length) index += 1;
    }
    skipGroupingAndAssignments();
  }
  return "";
}

function stageCommandCandidates(stage, position) {
  const tokens = shellTokens(stage);
  const segments = shellCommandSegments(stage);
  const commands = segments
    .map((segment) => unwrapShellCommand(segment))
    .filter((command) => command && command !== "}" && command !== ")");
  const opening = tokens.find((token) => token !== "&");
  const grouped =
    (opening === "{" && tokens.includes("}")) || (opening === "(" && tokens.includes(")"));
  if (grouped) return commands;
  if (commands.length === 0) return [];
  return [position === "source" ? commands.at(-1) : commands[0]];
}

function splitShellControlCommands(text) {
  const commands = [];
  let current = "";
  let quote = null;
  let escaped = false;
  const pushCurrent = () => {
    if (current.trim()) commands.push(current);
    current = "";
  };
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (character === "\\" && quote !== "'") {
      current += character;
      escaped = true;
      continue;
    }
    if (quote) {
      current += character;
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      current += character;
      continue;
    }
    const pair = text.slice(index, index + 2);
    if (pair === "&&" || pair === "||") {
      pushCurrent();
      index += 1;
      continue;
    }
    if (character === ";" || (character === "&" && !/[<>]$/.test(current))) {
      pushCurrent();
      continue;
    }
    current += character;
  }
  pushCurrent();
  return commands;
}

function commandAfterTokenSequence(tokens, sequences) {
  for (const sequence of sequences) {
    for (let start = 0; start <= tokens.length - sequence.length; start += 1) {
      if (sequence.every((expected, offset) => tokens[start + offset] === expected)) {
        return unwrapShellCommand(tokens.slice(start + sequence.length));
      }
    }
  }
  return "";
}

function readShellWord(text, start) {
  let index = start;
  while (/\s/.test(text[index] ?? "")) index += 1;
  const quote = text[index] === "'" || text[index] === '"' ? text[index] : null;
  const contentStart = quote ? index + 1 : index;
  let escaped = false;
  for (index = contentStart; index < text.length; index += 1) {
    const character = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\" && quote !== "'") {
      escaped = true;
      continue;
    }
    if ((quote && character === quote) || (!quote && /\s/.test(character))) break;
  }
  return { quote, content: text.slice(contentStart, index) };
}

function shellCArgument(commandText) {
  const matches = [...commandText.matchAll(/(?:^|\s)-[A-Za-z]*c[A-Za-z]*(?=\s|$)/g)];
  const match = matches.at(-1);
  if (!match) return null;
  let start = match.index + match[0].length;
  while (/\s/.test(commandText[start] ?? "")) start += 1;
  if (commandText.slice(start).startsWith("--")) {
    start += 2;
    while (/\s/.test(commandText[start] ?? "")) start += 1;
  }
  return readShellWord(commandText, start);
}

function substitutionRunsDownloader(content) {
  return splitShellControlCommands(content).some((commandText) =>
    splitPipeline(commandText, true).some((stage) =>
      stageCommandCandidates(stage, "source").some((command) =>
        new Set(["curl", "wget"]).has(command),
      ),
    ),
  );
}

function downloadSubstitutions(text) {
  const substitutions = [];
  for (const match of text.matchAll(/\$\((?!\()([^\n)]*)\)/g)) {
    if (substitutionRunsDownloader(match[1])) {
      substitutions.push({ index: match.index, text: match[0] });
    }
  }
  for (const match of text.matchAll(/`([^`\n]*)`/g)) {
    if (substitutionRunsDownloader(match[1])) {
      substitutions.push({ index: match.index, text: match[0] });
    }
  }
  return substitutions;
}

function parenthesizedBody(text, openIndex) {
  let depth = 1;
  let quote = null;
  let escaped = false;
  for (let index = openIndex + 1; index < text.length; index += 1) {
    const character = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\" && quote !== "'") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (depth === 0) return { body: text.slice(openIndex + 1, index), end: index };
  }
  return null;
}

function executableSubstitutionBodies(text) {
  const bodies = [];
  let quote = null;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\" && quote !== "'") {
      escaped = true;
      continue;
    }
    if (quote === "'") {
      if (character === "'") quote = null;
      continue;
    }
    if (character === "'" && quote === null) {
      quote = "'";
      continue;
    }
    if (character === '"') {
      quote = quote === '"' ? null : '"';
      continue;
    }
    if (character === "`" && quote !== "'") {
      const closing = text.indexOf("`", index + 1);
      if (closing !== -1) {
        bodies.push(text.slice(index + 1, closing));
        index = closing;
      }
      continue;
    }
    const commandSubstitution =
      character === "$" && text[index + 1] === "(" && text[index + 2] !== "(";
    const processSubstitution =
      quote === null && (character === "<" || character === ">") && text[index + 1] === "(";
    if (commandSubstitution || processSubstitution) {
      const openIndex = index + 1;
      const parsed = parenthesizedBody(text, openIndex);
      if (parsed) {
        bodies.push(parsed.body);
        index = parsed.end;
      }
    }
  }
  return bodies;
}

function substitutionIsUnescaped(text, index) {
  let backslashes = 0;
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor -= 1) {
    backslashes += 1;
  }
  return backslashes % 2 === 0;
}

function commandPositionRunsDownloadSubstitution(text) {
  return splitShellControlCommands(text).some((commandText) => {
    const trimmed = commandText.trim().replace(/^[{(]\s*/, "");
    return downloadSubstitutions(trimmed).some((substitution) => substitution.index === 0);
  });
}

function argumentCanInjectShellCode(argument) {
  const substitutions = downloadSubstitutions(argument.content);
  if (argument.quote === '"') {
    if (
      substitutions.some((substitution) =>
        substitutionIsUnescaped(argument.content, substitution.index),
      )
    ) {
      return true;
    }
    const unescaped = argument.content.replace(/\\([$`"\\])/g, "$1");
    return commandPositionRunsDownloadSubstitution(unescaped);
  }
  if (argument.quote === "'") return commandPositionRunsDownloadSubstitution(argument.content);
  return substitutions.length > 0;
}

function shellScriptHasDirectDownloadExecution(text) {
  const shells = new Set(["sh", "bash", "zsh", "dash", "ksh"]);
  const downloaders = new Set(["curl", "wget"]);
  return text.split(/\r?\n/).some((line) =>
    splitPipeline(line, true).some((pipelineStage) =>
      splitShellControlCommands(pipelineStage).some((commandText) => {
        const commands = stageCommandCandidates(commandText, "sink");
        const command = commands[0] ?? "";
        const tokens = shellTokens(commandText);
        if (shells.has(command)) {
          const commandArgument = shellCArgument(commandText);
          const inputProcessCommand = commandAfterTokenSequence(tokens, [
            ["<", "<", "("],
            ["<", "("],
          ]);
          const hereStringIndex = commandText.indexOf("<<<");
          const hereStringArgument =
            hereStringIndex === -1 ? null : readShellWord(commandText, hereStringIndex + 3);
          return (
            (commandArgument && argumentCanInjectShellCode(commandArgument)) ||
            downloaders.has(inputProcessCommand) ||
            (hereStringArgument && argumentCanInjectShellCode(hereStringArgument))
          );
        }
        if (downloaders.has(command)) {
          const outputProcessCommand = commandAfterTokenSequence(tokens, [
            [">", ">", "("],
            [">", "("],
          ]);
          return shells.has(outputProcessCommand);
        }
        if (command === "eval") {
          const argument = readShellWord(commandText, commandText.indexOf("eval") + 4);
          return argumentCanInjectShellCode(argument);
        }
        if (command === "source" || command === ".") {
          const sourceProcessCommand = commandAfterTokenSequence(tokens, [["<", "("]]);
          return downloaders.has(sourceProcessCommand);
        }
        return false;
      }),
    ),
  );
}

function powerShellScriptHasDirectDownloadExpression(text) {
  const expressions = new Set(["iex", "invoke-expression"]);
  const downloaders = new Set(["irm", "iwr", "invoke-restmethod", "invoke-webrequest"]);
  return text.split(/\r?\n/).some((line) =>
    splitShellControlCommands(line).some((commandText) => {
      const command = stageCommandCandidates(commandText, "sink")[0] ?? "";
      if (!expressions.has(command)) return false;
      const tokens = shellTokens(commandText);
      const nestedCommand = commandAfterTokenSequence(tokens, [["("]]);
      return downloaders.has(nestedCommand);
    }),
  );
}

function pipelineHasCommands(text, sourceCommands, sinkCommands) {
  return text.split(/\r?\n/).some((line) => {
    const stages = splitPipeline(line, true);
    if (stages.length < 2) return false;
    return stages.some((stage, sourceIndex) => {
      const sources = stageCommandCandidates(stage, "source");
      if (!sources.some((source) => sourceCommands.has(source))) return false;
      return stages.slice(sourceIndex + 1).some((sinkStage) => {
        const sinks = stageCommandCandidates(sinkStage, "sink");
        return sinks.some((sink) => sinkCommands.has(sink));
      });
    });
  });
}

function pipelineHas(text, sourcePattern, sinkPattern, respectQuotes) {
  return text.split(/\r?\n/).some((line) => {
    const stages = splitPipeline(line, respectQuotes);
    const sourceIndex = stages.findIndex((stage) => sourcePattern.test(stage));
    return (
      sourceIndex !== -1 && stages.slice(sourceIndex + 1).some((stage) => sinkPattern.test(stage))
    );
  });
}

function removeJsonTrailingCommas(text) {
  let output = "";
  let quote = false;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (escaped) {
      output += character;
      escaped = false;
      continue;
    }
    if (character === "\\" && quote) {
      output += character;
      escaped = true;
      continue;
    }
    if (character === '"') {
      quote = !quote;
      output += character;
      continue;
    }
    if (!quote && character === ",") {
      let lookahead = index + 1;
      while (/\s/.test(text[lookahead] ?? "")) lookahead += 1;
      if (text[lookahead] === "}" || text[lookahead] === "]") continue;
    }
    output += character;
  }
  return output;
}

function parseStructuredJsonConfig(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  try {
    return JSON.parse(removeJsonTrailingCommas(stripSerializedConfigComments(text, "jsonc")));
  } catch {
    return null;
  }
}

function collectJsonCommandSpecs(value, specs = [], sourceValues = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectJsonCommandSpecs(item, specs, sourceValues);
    return { specs, sourceValues };
  }
  if (!value || typeof value !== "object") return { specs, sourceValues };
  if (typeof value.command === "string") {
    specs.push({
      command: value.command,
      args: Array.isArray(value.args)
        ? value.args.filter((argument) => typeof argument === "string")
        : [],
    });
  }
  for (const [key, item] of Object.entries(value)) {
    if ((key === "source" || key === "from") && typeof item === "string") {
      sourceValues.push(item);
    }
    if (key === "args" && Array.isArray(item)) {
      sourceValues.push(...item.filter((argument) => typeof argument === "string"));
    }
    collectJsonCommandSpecs(item, specs, sourceValues);
  }
  return { specs, sourceValues };
}

function unpinnedAstGrepSourceFindings(text) {
  const findings = [];
  const pattern =
    /git\+(?:https?|ssh|git):\/\/(?:git@)?github\.com(?::443)?\/ast-grep\/ast-grep-mcp(?:\.git)?(?:@([^\s"'`,\]}]+))?/gi;
  for (const match of text.matchAll(pattern)) {
    const revision = (match[1] ?? "").split(/[?#]/, 1)[0];
    if (!/^[0-9a-f]{40}$/i.test(revision)) {
      findings.push("unpinned-ast-grep-mcp-git-source");
    }
  }
  return findings;
}

function structuredJsonSafetyFindings(value) {
  const findings = [];
  const { specs, sourceValues } = collectJsonCommandSpecs(value);
  const shells = new Set(["sh", "bash", "zsh", "dash", "ksh"]);
  const powerShells = new Set(["pwsh", "powershell"]);
  for (const spec of specs) {
    const resolvedCommand = unwrapShellCommand([spec.command, ...spec.args]);
    const commandFlagIndex = spec.args.findIndex((argument) =>
      new Set(["-c", "--command", "-command"]).has(argument.toLowerCase()),
    );
    if (commandFlagIndex === -1 || commandFlagIndex + 1 >= spec.args.length) continue;
    const script = spec.args[commandFlagIndex + 1];
    if (shells.has(resolvedCommand)) {
      findings.push(...commandSafetyFindings(script, "bash"));
      if (/^\s*\$\([^\n)]*\b(?:curl|wget)(?:\.exe)?\b[^\n)]*\)\s*(?:;|$)/i.test(script)) {
        findings.push("download-to-shell-execution");
      }
    } else if (powerShells.has(resolvedCommand)) {
      findings.push(...commandSafetyFindings(script, "powershell"));
    }
  }
  findings.push(...unpinnedAstGrepSourceFindings(sourceValues.join("\n")));
  return [...new Set(findings)];
}

function commandSafetyFindings(text, language = "") {
  const findings = [];
  const serializedConfigLanguages = new Set(["json", "jsonc", "toml", "yaml", "yml"]);
  const genericLanguages = new Set(["", "text", "plaintext", "config", "conf"]);
  const configLanguage =
    serializedConfigLanguages.has(language) ||
    (genericLanguages.has(language) && looksLikeSerializedConfig(text));
  if (configLanguage) {
    const structuredJson = parseStructuredJsonConfig(text);
    if (structuredJson !== null) return structuredJsonSafetyFindings(structuredJson);
  }
  let commandText = configLanguage
    ? stripSerializedConfigComments(text, language)
    : stripShellHeredocs(text)
        .split(/\r?\n/)
        .map((line) => stripShellComment(line))
        .join("\n");
  if (language === "yaml" || language === "yml") commandText = foldYamlBlockScalars(commandText);
  const normalized = normalizeCommandText(commandText, configLanguage);
  const nestedExecutableBodies = configLanguage
    ? []
    : [
        ...executableSubstitutionBodies(commandText),
        ...heredocExpansionBodies(text).flatMap((body) => executableSubstitutionBodies(body)),
      ];
  const downloader = /\b(?:curl|wget)\b/i;
  const shellSink = /\b(?:sh|bash|zsh|dash|ksh)\b/i;
  const powerShellSink = /\b(?:pwsh|powershell(?:\.exe)?)\b/i;
  const powerShellDownloader = /\b(?:irm|iwr|Invoke-RestMethod|Invoke-WebRequest)\b/i;
  const expressionSink = /\b(?:iex|Invoke-Expression)\b/i;
  const hasDownloaderToShell = configLanguage
    ? pipelineHas(normalized, downloader, shellSink, false)
    : pipelineHasCommands(
        normalized,
        new Set(["curl", "wget"]),
        new Set(["sh", "bash", "zsh", "dash", "ksh"]),
      );
  const hasDownloaderToPowerShell = configLanguage
    ? pipelineHas(normalized, downloader, powerShellSink, false)
    : pipelineHasCommands(
        normalized,
        new Set(["curl", "wget"]),
        new Set(["pwsh", "powershell", "powershell.exe"]),
      );
  const hasPowerShellDownloadToExpression = configLanguage
    ? pipelineHas(normalized, powerShellDownloader, expressionSink, false)
    : pipelineHasCommands(
        normalized,
        new Set(["irm", "iwr", "invoke-restmethod", "invoke-webrequest"]),
        new Set(["iex", "invoke-expression"]),
      );
  const hasDownloaderToPowerShellExpression =
    !configLanguage &&
    pipelineHasCommands(
      normalized,
      new Set(["curl", "wget"]),
      new Set(["iex", "invoke-expression"]),
    );
  const hasDirectDownloadToShell =
    !configLanguage && shellScriptHasDirectDownloadExecution(normalized);
  const hasDirectPowerShellDownloadToExpression =
    !configLanguage && powerShellScriptHasDirectDownloadExpression(normalized);

  if (hasDownloaderToShell) {
    findings.push("pipe-to-shell");
  }

  if (hasDownloaderToPowerShell) {
    findings.push("pipe-to-powershell");
  }

  if (hasPowerShellDownloadToExpression || hasDownloaderToPowerShellExpression) {
    findings.push("download-to-powershell-expression");
  }

  if (hasDirectDownloadToShell) {
    findings.push("download-to-shell-execution");
  }

  if (hasDirectPowerShellDownloadToExpression) {
    findings.push("download-to-powershell-expression");
  }

  const sourceScanText = configLanguage
    ? normalized
    : normalized
        .split(/\r?\n/)
        .flatMap((line) => shellTokens(line))
        .join(" ");
  findings.push(...unpinnedAstGrepSourceFindings(sourceScanText));
  for (const body of nestedExecutableBodies) {
    findings.push(...commandSafetyFindings(body, "bash"));
  }

  return [...new Set(findings)];
}

function markdownSection(text, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const headingMatch = new RegExp(`^## ${escaped}[ \\t]*$`, "m").exec(text);
  if (!headingMatch) return "";
  const remainder = text.slice(headingMatch.index + headingMatch[0].length).replace(/^\r?\n/, "");
  const nextHeading = remainder.search(/^## /m);
  return (nextHeading === -1 ? remainder : remainder.slice(0, nextHeading)).trim();
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function hashRuntimeCandidate(dir, { excludedRelativePaths = [] } = {}) {
  const hash = crypto.createHash("sha256");
  const excluded = new Set(excludedRelativePaths);
  const files = walk(dir)
    .filter((file) => fs.lstatSync(file).isFile())
    .filter((file) => !excluded.has(path.relative(dir, file).split(path.sep).join("/")))
    .sort((left, right) =>
      Buffer.from(path.relative(dir, left).split(path.sep).join("/"), "utf8").compare(
        Buffer.from(path.relative(dir, right).split(path.sep).join("/"), "utf8"),
      ),
    );
  for (const file of files) {
    const relativePath = path.relative(dir, file).split(path.sep).join("/");
    hash.update(relativePath, "utf8");
    hash.update(Buffer.from([0]));
    hash.update(fs.readFileSync(file));
    hash.update(Buffer.from([0]));
  }
  return hash.digest("hex");
}

function evaluateAssertion(assertion, output) {
  const value = assertion.value;
  switch (assertion.operator) {
    case "contains":
      return typeof value === "string" && value.length > 0 && output.includes(value);
    case "not_contains":
      return typeof value === "string" && value.length > 0 && !output.includes(value);
    case "ordered": {
      if (
        !Array.isArray(value) ||
        value.length < 2 ||
        value.some((item) => typeof item !== "string" || item.length === 0)
      ) {
        return false;
      }
      let offset = 0;
      for (const item of value) {
        const index = output.indexOf(item, offset);
        if (index === -1) return false;
        offset = index + item.length;
      }
      return true;
    }
    case "count_exact":
      return (
        typeof value === "string" &&
        value.length > 0 &&
        Number.isInteger(assertion.expected_count) &&
        assertion.expected_count >= 0 &&
        output.split(value).length - 1 === assertion.expected_count
      );
    default:
      return false;
  }
}

function gradingDefinitionHash(assertions) {
  const definitions = assertions.map(({ id, operator, value, expected_count: expectedCount }) => ({
    id,
    operator,
    value,
    ...(expectedCount === undefined ? {} : { expected_count: expectedCount }),
  }));
  return sha256(JSON.stringify(definitions));
}

function hasUnsafeControlCharacter(text) {
  return [...text].some((character) => {
    const codePoint = character.codePointAt(0);
    return (codePoint <= 0x1f && !new Set([0x09, 0x0a, 0x0d]).has(codePoint)) || codePoint === 0x7f;
  });
}

const expectedCapturedCases = new Map(
  [
    {
      id: "stable-update-consent",
      source_case: "skill-evals/codegraph-ast-grep/cases/stable-update-consent.md",
      source_sha256: "5b459f836add4ac9464d51a93bc4f187be06b5508d3b9ac4f07c71bee069b05b",
      prompt_sha256: "89eff43862f16ea4b4a60241c624db4efe56e7d425b9b3cf1779d9f5cf0329bc",
      grading_definition_sha256: "dd5fca856a947e00518689809d59a327e5ebfbf8d701906c4629e75630dda2f2",
    },
    {
      id: "offline-update-check",
      source_case: "skill-evals/codegraph-ast-grep/cases/offline-update-check.md",
      source_sha256: "508344bcbac80238b34dd9ed24e3b1800b26b634ededddcaa6b4954ff73d70d4",
      prompt_sha256: "dd42ead17553fd6674d8179a58f82e4d4a5c43f54cc22bf0d2e977cdb37ee51e",
      grading_definition_sha256: "c25f7d3d929ffa6c05845c384df5cefadd414bd8262df5121f4e549b76409fba",
    },
    {
      id: "legacy-capability-gate",
      source_case: "skill-evals/codegraph-ast-grep/cases/legacy-codegraph-capability-gate.md",
      source_sha256: "ea5b03c3ff4735f1f44e37e67d285d0a64ab1a51620af985a5dc4fd183a0e5cb",
      prompt_sha256: "aae9a39f98f6245f63932d610e3b5733e629908bad880b07f1fe903f87a6c445",
      grading_definition_sha256: "5345ab0f7cee15bd411bef49d2ea905d63663e16e2eb067ad355319e3a9d2bbb",
    },
    {
      id: "destructive-rewrite-boundary",
      source_case: "skill-evals/codegraph-ast-grep/cases/destructive-rewrite-negative.md",
      source_sha256: "3fa93f283aa188cdbd9e440334fe07cbfa67a71e61c346e800443a99b69660a4",
      prompt_sha256: "471c29adee4d9f002a84ce1ee9921fd306c4687d918c835b31a24b0b5b8b3e4c",
      grading_definition_sha256: "4a99f1c5da9628943991570ba0c1f975951c6f2a2b19b5e45d6b72bb6849c6e3",
    },
  ].map((entry) => [entry.id, entry]),
);

const expectedCurrentContractCases = new Map(
  [
    {
      id: "setup-workflow",
      source_case: "skill-evals/codegraph-ast-grep/cases/clear-setup-intent.md",
      source_sha256: "9b6824951b8620d67bbc8ed6b55ddfd514d2ec8bb58ee33ee5894c3632d913cb",
      prompt_sha256: "9b615b3f963fb5b72bb0b68f7b58ae9fbea27b44a8b8b685b14ab8b76f25328a",
      output_sha256: "561faafef2312dec66d59250f34cdea7996bbca2c02e23f343ac57c17f824f36",
      grading_sha256: "e891e385840909de2dd5efee5e174cca0804df0467b5baf3cd5feef9630bfeb8",
      contract_assertions: [
        "select-setup-without-redundant-choice",
        "announce-root-writes-and-protected-state",
        "preserve-team-pinned-provenance-and-telemetry-boundary",
        "reconcile-codegraph-ast-grep-codex-and-guidance",
        "report-semantic-structural-and-freshness-proof",
        "exclude-experimental-ast-grep-mcp",
        "retain-separate-scope-expansion-approval",
      ],
    },
    {
      id: "update-workflow",
      source_case: "skill-evals/codegraph-ast-grep/cases/clear-update-intent.md",
      source_sha256: "f1587c9c2108030db098d08a3a6b50ac9da9f00feef233d10b13ce82eed29107",
      prompt_sha256: "99c53e183f2935c3b60af90dd8972b9f820b0110e355233f2e4a0ce91d87c71c",
      output_sha256: "9700761e5108b830350a7819c38ab0d6fa5d43222e5871b7ab0a02fb53c6e7c7",
      grading_sha256: "fc8659036ff28b75ef500cf2d51073657b1fdaa18f29fc8135759c9f0f6cb87e",
      contract_assertions: [
        "select-update-without-redundant-choice",
        "announce-root-writes-and-protected-state",
        "preserve-installer-channel-and-scope",
        "update-exact-stable-core-tools",
        "run-required-migrations-and-reconnect",
        "protect-unrelated-work",
        "retain-separate-scope-expansion-approval",
      ],
    },
    {
      id: "doctor-workflow",
      source_case: "skill-evals/codegraph-ast-grep/cases/broken-setup-doctor-routing.md",
      source_sha256: "d04c23c3bfc887e1a694bfc5c5526f15b4f7d0615098bc4244719295fcf55da0",
      prompt_sha256: "60a6a42629fcd8f0d3aa0bdaaf2e4fbc7ed6cd972211cebc205f14697970181f",
      output_sha256: "aa3883675f0db94dd14d99dd7c82a2d19a7471858cd8dbf74a9bf1d40394a3fa",
      grading_sha256: "fde7c6d42cbc8b89036e93bab9572d0e34d09c91ff06a6170ddaea5dd05ed2d0",
      contract_assertions: [
        "select-doctor",
        "perform-only-non-opening-checks-without-extra-authority",
        "diagnose-disconnected-runtime-path",
        "gate-project-opening-on-exact-root-approval",
        "make-no-repair",
        "report-confidence-and-skipped-evidence",
        "recommend-a-separate-follow-up",
      ],
    },
    {
      id: "ambiguous-workflow",
      source_case: "skill-evals/codegraph-ast-grep/cases/ambiguous-workflow-selection.md",
      source_sha256: "28b1c3cf07a400aea2c0663beeb768ced65903e918244ffabe5f4c134777dbee",
      prompt_sha256: "13990ee3777f91660dfa3040b7330b123f308c400d4728b4b1f95158e22c27a7",
      output_sha256: "3cfbc8875a8305277e9620014d3796bd7347552cbb48f4d1da708ae5a356c15c",
      grading_sha256: "7e0d6087750dac90dac4bcc90e31102d169dff3f223ea468e33658d350017d22",
      contract_assertions: [
        "show-exactly-setup-update-doctor",
        "ask-the-user-to-choose",
        "do-not-invent-auto",
        "do-not-inspect-state",
        "do-not-query-update-metadata",
        "do-not-open-the-project",
        "do-not-mutate",
      ],
    },
    {
      id: "unauthorized-mutation",
      source_case: "skill-evals/codegraph-ast-grep/cases/internal-reviewed-rewrite-boundary.md",
      source_sha256: "4ee7462db29375e5bb62b5c0828a8133e9bbbed12c83a5c23ea468ef4c62f956",
      prompt_sha256: "a4347ad045e0fac4598bf0b46c8ade4b4914e0f8229d88d870954ed64e400d3d",
      output_sha256: "46c5a094dd104cfbe60cf1ee5ef102afd773c898b166ba9de6f79471acaad294",
      grading_sha256: "8de14ecf0b7d7bf89d9b2344a8d7b2660aefd2944e01a9b5a183835dff59a2a1",
      contract_assertions: [
        "do-not-invent-a-public-rewrite-workflow",
        "refuse-immediate-repository-wide-rewrite",
        "protect-existing-staged-and-unstaged-work",
        "inventory-variants-before-rewrite",
        "require-positive-and-negative-rule-tests",
        "preview-and-bound-the-exact-scope",
        "require-separate-mutation-approval-and-validation",
      ],
    },
  ].map((entry) => [entry.id, entry]),
);

const forbiddenBehavioralOutputPatterns = new Map([
  [
    "stable-update-consent",
    /(?:^|\n)\s*(?:now|next|then|please)\s+(?:run|execute|install|update|apply|change)\b|\bI(?:\s+(?:will|would)|['’]ll)\s+(?!not\b)(?:run|execute|install|update|apply|change)\b|\b(?:I|we)\s+(?:ran|executed|installed|updated|applied|changed)\b/im,
  ],
  [
    "offline-update-check",
    /(?:^|\n)\s*(?:now|next|then|please)\s+(?:run|execute|contact|query|initialize|sync|rebuild|edit|write|modify)\b|\bI(?:\s+(?:will|would)|['’]ll)\s+(?!not\b)(?:run|execute|contact|query|initialize|sync|rebuild|edit|write|modify)\b/im,
  ],
  [
    "legacy-capability-gate",
    /(?:^|\n)\s*(?:now|next|then|please)\s+(?:run|execute|query|upgrade|initialize|sync|write|modify)\b|\bI(?:\s+(?:will|would)|['’]ll)\s+(?!not\b)(?:run|execute|query|upgrade|initialize|sync|write|modify)\b/im,
  ],
  [
    "destructive-rewrite-boundary",
    /(?:^|\n)\s*(?:now|next|then|please)\s+(?:run|execute|rewrite|apply|edit|write|modify|change)\b|\bI(?:\s+(?:will|would)|['’]ll)\s+(?!not\b)(?:run|execute|rewrite|apply|edit|write|modify|change)\b|\b(?:I|we)\s+(?:ran|executed|rewrote|applied|edited|wrote|modified|changed)\b/im,
  ],
]);

const runtimePaths = [
  "skills/engineering-workflows/codegraph-ast-grep/SKILL.md",
  "skills/engineering-workflows/codegraph-ast-grep/agents/openai.yaml",
  "skills/engineering-workflows/codegraph-ast-grep/references/setup-and-mcp-config.md",
  "skills/engineering-workflows/codegraph-ast-grep/references/update-and-provenance.md",
  "skills/engineering-workflows/codegraph-ast-grep/references/codegraph-capability-guide.md",
  "skills/engineering-workflows/codegraph-ast-grep/references/usage-playbook.md",
  "skills/engineering-workflows/codegraph-ast-grep/references/ast-grep-rule-recipes.md",
  "skills/engineering-workflows/codegraph-ast-grep/references/extensions-and-escalation.md",
  "skills/engineering-workflows/codegraph-ast-grep/references/troubleshooting.md",
];
const runtimeAssetPaths = [
  "skills/engineering-workflows/codegraph-ast-grep/assets/openai-icon.png",
];

const runtime = new Map(
  runtimePaths.map((relativePath) => [relativePath, requireFile(relativePath)]),
);
const currentContractHashRecipe =
  "For each behavioral runtime file in bytewise lexicographic path order, excluding host routing and visual metadata: relative path, NUL, file bytes, NUL; then SHA-256.";
const combinedRuntime = [...runtime.values()].join("\n");
const executableSnippets = [...runtime.values()].flatMap((text) => fencedBlocks(text));
const commands = executableSnippets.map((block) => block.body).join("\n");

const skillPath = runtimePaths[0];
const skill = runtime.get(skillPath);
const setupPath = runtimePaths[2];
const setup = runtime.get(setupPath);
const updatePath = runtimePaths[3];
const update = runtime.get(updatePath);
const capabilityPath = runtimePaths[4];
const capability = runtime.get(capabilityPath);
const usagePath = runtimePaths[5];
const usage = runtime.get(usagePath);
const astGrepPath = runtimePaths[6];
const astGrep = runtime.get(astGrepPath);
const extensionPath = runtimePaths[7];
const extensions = runtime.get(extensionPath);
const openAiPath = runtimePaths[1];
const openAi = runtime.get(openAiPath);

requirePattern(skillPath, skill, /version:\s*"0\.3\.3"/, "metadata.version must be 0.3.3");
const workflowSection = /## Workflow selection([\s\S]*?)(?=\n## Inputs to inspect)/.exec(skill);
const expectedWorkflows = ["setup", "update", "doctor"];
const listedWorkflows = workflowSection
  ? [...workflowSection[1].matchAll(/^- `([^`]+)`:/gm)].map((match) => match[1])
  : [];
if (JSON.stringify(listedWorkflows) !== JSON.stringify(expectedWorkflows)) {
  fail(`${skillPath}: workflow selection must contain exactly setup, update, and doctor in order`);
}
requirePattern(
  skillPath,
  skill,
  /expose these finite workflows in plain, benefit-first language/i,
  "direct workflow disclosure must be plain and benefit-first",
);
requirePattern(
  skillPath,
  skill,
  /setup[\s\S]*semantic (?:code )?intelligence/i,
  "setup disclosure must state the semantic-analysis benefit",
);
requirePattern(
  skillPath,
  skill,
  /setup[\s\S]*(?:structural (?:code )?search|structural syntax|ast-grep)/i,
  "setup disclosure must state the structural-search benefit",
);
requirePattern(
  skillPath,
  skill,
  /setup[\s\S]*(?:faster|fewer tool calls|efficien)/i,
  "setup disclosure must state an efficiency benefit",
);
requirePattern(
  skillPath,
  skill,
  /update[\s\S]*current stable versions/i,
  "update disclosure must state the stable-version target",
);
requirePattern(
  skillPath,
  skill,
  /update[\s\S]*(?:without changing how it was installed|preserv(?:e|es)[\s\S]*(?:install|provenance)|installer provenance)/i,
  "update disclosure must preserve installation provenance",
);
requirePattern(
  skillPath,
  skill,
  /update[\s\S]*(?:migrat|reconnect|verify[\s\S]*work)/i,
  "update disclosure must state migrations, reconnection, or readiness verification",
);
requirePattern(
  skillPath,
  skill,
  /There is no `auto` workflow/i,
  "the finite workflow contract must not introduce a recursive auto mode",
);
requirePattern(
  skillPath,
  skill,
  /bare invocation or ambiguous intent.*showing all three workflows and asking/is,
  "bare or ambiguous invocation must expose workflows and ask",
);
requirePattern(
  skillPath,
  skill,
  /clear direct intent.*selected workflow, rationale.*then proceed/is,
  "clear direct intent must announce the selected workflow and proceed",
);
requirePattern(
  skillPath,
  skill,
  /Agent-initiated activation may select and announce only `doctor`/i,
  "agent-initiated activation must be limited to doctor",
);
requirePattern(
  skillPath,
  skill,
  /explicit update request authorizes ordinary in-root update and required migration work/i,
  "update intent must cover ordinary in-root updates and migrations",
);
requirePattern(
  skillPath,
  skill,
  /default-on (?:state|telemetry).*not (?:affirmative )?consent/is,
  "CodeGraph default-on telemetry must not count as consent",
);
requirePattern(
  skillPath,
  skill,
  /runtime-native LSP/i,
  "native LSP fallback must remain in the core workflow",
);
requirePattern(
  skillPath,
  skill,
  /routine semantic exploration, structural search, impact analysis, rule authoring, and reviewed rewrites are internal coding behaviors/is,
  "analysis and rewrite activities must be internal coding behaviors",
);
requirePattern(
  skillPath,
  skill,
  /use CodeGraph for semantic symbols, callers, call paths, and impact; use ast-grep CLI for structural syntax evidence; reconcile both before broad edits/i,
  "setup must persist concise target-repository guidance",
);
requirePattern(
  skillPath,
  skill,
  /doctor[\s\S]*Do not install, update, reconnect by writing config, initialize\/rebuild\/sync, repair, or rewrite source/i,
  "doctor must diagnose without repair",
);
requirePattern(
  skillPath,
  skill,
  /experimental ast-grep MCP server.*excluded from normal setup/i,
  "normal setup must exclude experimental ast-grep MCP",
);
requirePattern(skillPath, skill, /No runtime scripts/i, "installed skill must remain content-only");

requirePattern(
  setupPath,
  setup,
  /Team-pinned[\s\S]*node_modules\/\.bin\/codegraph[\s\S]*codegraph\.cmd/is,
  "Team-pinned CodeGraph setup must use exact POSIX and Windows project-local shims",
);
requirePattern(
  setupPath,
  setup,
  /node_modules\/\.bin\/ast-grep[\s\S]*ast-grep\.cmd/is,
  "project-local ast-grep verification must use exact POSIX and Windows shims",
);
forbidPattern(
  `${setupPath} command blocks`,
  fencedCode(setup),
  /\b(?:npm|pnpm)\s+exec\b[^\n]*\bast-grep\b/i,
  "project-local ast-grep verification must not fall through a package runner",
);
requirePattern(
  setupPath,
  setup,
  /CODEGRAPH_DIR[\s\S]*\.codegraph-win[\s\S]*\.codegraph-wsl[\s\S]*git check-ignore/is,
  "effective CodeGraph state-directory selection and ignore checks must stay connected",
);
requirePattern(
  setupPath,
  setup,
  /Invalid CODEGRAPH_DIR[\s\S]{0,120}(?:\bfalse\b|\bexit 1\b)/,
  "invalid CODEGRAPH_DIR values must fail closed",
);

const guardedPosixGraphOperations = [];
const guardedWindowsGraphOperations = [];
for (const [blockIndex, block] of fencedBlocks(setup).entries()) {
  for (const match of block.body.matchAll(
    /(?:"\$(?:\{codegraph_bin\}|codegraph_bin)"|\$(?:\{codegraph_bin\}|codegraph_bin))\s+(init|status)\b/g,
  )) {
    guardedPosixGraphOperations.push(match[1].toLowerCase());
    const preamble = block.body.slice(0, match.index);
    if (
      !preamble.includes('case "$codegraph_dir" in') ||
      !preamble.includes('""|"."') ||
      !preamble.includes("exit 1") ||
      !preamble.includes('project_root="<approved-project-root>"') ||
      !preamble.includes('codegraph_bin="$project_root/node_modules/.bin/codegraph"') ||
      !preamble.includes("-x") ||
      !new RegExp(
        `CODEGRAPH_TELEMETRY=0 CODEGRAPH_DIR="\\$codegraph_dir"[\\s\\S]{0,120}"\\$codegraph_bin" ${match[1]}`,
      ).test(block.body)
    ) {
      fail(
        `${setupPath}: code block ${blockIndex + 1} project-local ${match[1]} must validate state/shim and pass the exact environment before execution`,
      );
    }
  }

  for (const match of block.body.matchAll(/&\s+\$codegraphBin\s+(init|status)\b/gi)) {
    guardedWindowsGraphOperations.push(match[1].toLowerCase());
    const preamble = block.body.slice(0, match.index);
    const suffix = block.body.slice(match.index);
    if (
      !preamble.includes("IsNullOrWhiteSpace($codegraphDir)") ||
      !preamble.includes('$projectRoot = "<approved-project-root>"') ||
      !preamble.includes(
        '$codegraphBin = Join-Path $projectRoot "node_modules\\.bin\\codegraph.cmd"',
      ) ||
      !preamble.includes("Test-Path") ||
      !preamble.includes("$env:CODEGRAPH_DIR = $codegraphDir") ||
      !preamble.includes('$env:CODEGRAPH_TELEMETRY = "0"') ||
      !suffix.includes("$LASTEXITCODE -ne 0")
    ) {
      fail(
        `${setupPath}: code block ${blockIndex + 1} Windows project-local ${match[1]} must validate state/shim, set the exact environment, and check exit status`,
      );
    }
  }
}
const hasExactInitStatusPair = (operations) =>
  operations.length === 2 &&
  new Set(operations).size === 2 &&
  operations.includes("init") &&
  operations.includes("status");
if (
  !hasExactInitStatusPair(guardedPosixGraphOperations) ||
  !hasExactInitStatusPair(guardedWindowsGraphOperations)
) {
  fail(
    `${setupPath}: expected exactly one guarded init and one guarded status example for both POSIX and Windows`,
  );
}
forbidPattern(
  `${setupPath} command blocks`,
  fencedCode(setup),
  /node_modules[\\/]\.bin[\\/]codegraph(?:\.cmd)?["']?\s+(?:init|status)\b/i,
  "project-local init/status examples must use the validated shim binding",
);

requirePattern(
  updatePath,
  update,
  /at most once per core tool in the update workflow/i,
  "stable lookup must be bounded to once per core tool in update",
);
requirePattern(
  updatePath,
  update,
  /Component.*Installed.*Stable target\/source.*Exact action.*Scope and expected mutation.*Rollback/is,
  "checkpoint must expose versions, source, command, scope, mutation, and rollback",
);
requirePattern(
  updatePath,
  update,
  /every selected core-tool update is itemized/i,
  "the update execution manifest must itemize each selected core tool",
);
requirePattern(
  updatePath,
  update,
  /declining or excluding one item does not block diagnosis/i,
  "excluding an update item must preserve degraded operation",
);
requirePattern(
  updatePath,
  update,
  /includes configuration\/index\/schema migration and client reconnect/i,
  "update must include required migrations and client reconnect",
);
requirePattern(
  updatePath,
  update,
  /execution receipt/i,
  "update must record migrations in an execution receipt",
);
requirePattern(
  updatePath,
  update,
  /DO_NOT_TRACK.*CODEGRAPH_NO_UPDATE_CHECK/is,
  "offline/update-check opt-outs must be explicit",
);
requirePattern(
  updatePath,
  update,
  /CODEGRAPH_TELEMETRY=0[\s\S]*CODEGRAPH_NO_INSTALL_REFRESH=1[\s\S]*CODEGRAPH_NO_PROMPT_HOOK=1/,
  "binary-only CodeGraph upgrade must suppress default telemetry, config refresh, and prompt hooks",
);
requirePattern(
  updatePath,
  update,
  /Native Windows equivalent[\s\S]*\$env:CODEGRAPH_TELEMETRY = "0"[\s\S]*upgrade --check[\s\S]*\$LASTEXITCODE -ne 0/,
  "native Windows stable checks must suppress telemetry and propagate command failure",
);
requirePattern(
  updatePath,
  update,
  /\$previousTelemetry[\s\S]*try \{[\s\S]*finally \{[\s\S]*SetEnvironmentVariable\("CODEGRAPH_TELEMETRY", \$previousTelemetry, "Process"\)/,
  "native Windows examples must restore the prior process telemetry state",
);
requirePattern(
  updatePath,
  update,
  /\$previousRefresh[\s\S]*\$previousPromptHook[\s\S]*finally \{[\s\S]*SetEnvironmentVariable\("CODEGRAPH_NO_INSTALL_REFRESH", \$previousRefresh, "Process"\)[\s\S]*SetEnvironmentVariable\("CODEGRAPH_NO_PROMPT_HOOK", \$previousPromptHook, "Process"\)/,
  "native Windows upgrades must restore prior refresh and prompt-hook state",
);
requirePattern(
  updatePath,
  update,
  /Team-pinned project dependency[\s\S]*npm install --save-dev --save-exact @colbymchenry\/codegraph@<version>[\s\S]*pnpm add --save-dev --save-exact @colbymchenry\/codegraph@<version>[\s\S]*Never substitute a global command/i,
  "CodeGraph npm-family updates must preserve approved Team-pinned project scope",
);
requirePattern(
  updatePath,
  fencedCode(update),
  /CODEGRAPH_TELEMETRY=0\s+codegraph upgrade --check/,
  "CodeGraph stable check must not flush default-on telemetry",
);
requirePattern(
  updatePath,
  update,
  /Do not run `codegraph status` as binary-only verification/i,
  "binary-only verification must not open or migrate graph state",
);
forbidPattern(
  `${updatePath} command blocks`,
  fencedCode(update),
  /\bcodegraph status\b/,
  "binary-update command blocks must not open graph state",
);
forbidPattern(
  `${updatePath} command blocks`,
  fencedCode(update),
  /update all/i,
  "do not document blanket update-all behavior",
);

requireNear(
  capabilityPath,
  capability,
  /codegraph_explore/,
  /exposed|discover|enumerate|available/i,
  220,
  "codegraph_explore must be conditional on exposed capabilities",
);
requirePattern(
  capabilityPath,
  capability,
  /affirmative approval[\s\S]{0,240}approved disposable/is,
  "project-opening diagnostics must require affirmative approval or an approved disposable copy",
);
requireNear(
  capabilityPath,
  capability,
  /codegraph explore/,
  /help|discover|when/i,
  240,
  "CLI explore must be conditional on installed help",
);
requireNear(
  capabilityPath,
  capability,
  /codegraph init -i/,
  /legacy|help-confirmed/i,
  200,
  "init -i must be explicitly legacy/help-confirmed",
);
requirePattern(
  capabilityPath,
  capability,
  /Auto-sync is conditional on an active supported watcher/i,
  "auto-sync must remain watcher-scoped",
);
requirePattern(
  capabilityPath,
  capability,
  /Manual sync remains valid for CLI-only workflows/i,
  "manual sync must remain valid for CLI-only/disabled-watcher use",
);
requirePattern(
  capabilityPath,
  capability,
  /Do not infer support from version alone/i,
  "capability discovery must not become a rigid version gate",
);

requirePattern(
  usagePath,
  usage,
  /Ownership:[\s\S]*Exact inventory:[\s\S]*Disagreement check:/,
  "refactor flow must combine semantic, structural, and disagreement evidence",
);
requirePattern(
  astGrepPath,
  astGrep,
  /Match inventory:[\s\S]*Positive\/negative test:[\s\S]*Preview:[\s\S]*Exact bounded scope:[\s\S]*Explicit consent:[\s\S]*Apply:[\s\S]*Diff review:[\s\S]*Repository-native validation:/,
  "rewrite flow must preserve the full reviewed sequence",
);
requirePattern(
  astGrepPath,
  astGrep,
  /outline only when installed help exposes it/i,
  "outline must remain capability-gated",
);

requirePattern(
  extensionPath,
  extensions,
  /runtime-native language-server.*before adding/i,
  "native language tooling/LSP must be first",
);
requirePattern(
  extensionPath,
  extensions,
  /Serena.*optional/i,
  "Serena must remain an optional semantic backend",
);
requirePattern(
  extensionPath,
  extensions,
  /Codemod CLI with JSSG is the preferred optional advanced extension/i,
  "Codemod/JSSG must be the preferred optional advanced migration extension",
);
requirePattern(
  extensionPath,
  extensions,
  /Semgrep.*security\/policy/is,
  "Semgrep must remain security/policy-only",
);
requirePattern(
  extensionPath,
  extensions,
  /jscodeshift.*ts-morph.*LibCST.*OpenRewrite/is,
  "language-specific specialist choices must be documented",
);
requirePattern(
  extensionPath,
  extensions,
  /Sourcegraph\/SCIP and Grit.*already/i,
  "Sourcegraph/SCIP and Grit must remain existing-adoption-only",
);
requirePattern(
  extensionPath,
  extensions,
  /CodeGraph and ast-grep are the only core tools/i,
  "optional tools must not become required dependencies",
);
requirePattern(
  extensionPath,
  extensions,
  /Do not turn optional-extension evaluation into a stable-version lookup for unrelated tools/i,
  "optional extension evaluation must not broaden version lookup",
);

requirePattern(
  openAiPath,
  openAi,
  /default_prompt:\s*"[^"]*\$codegraph-ast-grep[^"]*"/,
  "default prompt must mention the skill",
);
requirePattern(
  openAiPath,
  openAi,
  /products:\s*\n\s+- CODEX/m,
  "OpenAI metadata must declare Codex routing",
);
requirePattern(
  openAiPath,
  openAi,
  /allow_implicit_invocation:\s*false/m,
  "OpenAI metadata must keep invocation explicit",
);
forbidPattern(
  openAiPath,
  openAi,
  /^dependencies:/m,
  "OpenAI metadata must omit dependencies when no external tools are required",
);
forbidPattern(
  openAiPath,
  openAi,
  /Serena|Codemod|Semgrep|OpenRewrite/,
  "default UI metadata must not imply an optional tool dependency",
);

for (const [index, block] of executableSnippets.entries()) {
  if (block.unclosed) {
    fail(
      `runtime code block ${index + 1}${block.language ? ` (${block.language})` : ""}: unclosed Markdown fence`,
    );
  }
  for (const finding of commandSafetyFindings(block.body, block.language)) {
    fail(
      `runtime code block ${index + 1}${block.language ? ` (${block.language})` : ""}: unsafe command pattern ${finding}`,
    );
  }
}

const commandFixturePath = "skill-evals/codegraph-ast-grep/validator-fixtures/command-safety.json";
const commandFixtures = requireJson(commandFixturePath);
if (commandFixtures) {
  if (!Array.isArray(commandFixtures.unsafe) || !Array.isArray(commandFixtures.safe)) {
    fail(`${commandFixturePath}: expected unsafe and safe arrays`);
  } else if (commandFixtures.unsafe.length === 0 || commandFixtures.safe.length === 0) {
    fail(`${commandFixturePath}: unsafe and safe fixture arrays must both be non-empty`);
  } else {
    const fixtureNames = new Set();
    const coveredFindings = new Set();
    for (const fixture of commandFixtures.unsafe) {
      const blocks = fencedBlocks(String(fixture.snippet ?? ""));
      const findings = blocks.flatMap((block) => commandSafetyFindings(block.body, block.language));
      if (!fixture.name || !fixture.finding || !findings.includes(fixture.finding)) {
        fail(
          `${commandFixturePath}: unsafe fixture ${fixture.name || "<unnamed>"} did not produce ${fixture.finding || "a named finding"}`,
        );
      }
      if (fixtureNames.has(fixture.name)) {
        fail(`${commandFixturePath}: duplicate fixture name ${fixture.name}`);
      }
      fixtureNames.add(fixture.name);
      if (fixture.finding) coveredFindings.add(fixture.finding);
    }
    for (const fixture of commandFixtures.safe) {
      const blocks = fencedBlocks(String(fixture.snippet ?? ""));
      const findings = blocks.flatMap((block) => commandSafetyFindings(block.body, block.language));
      if (!fixture.name || blocks.length === 0 || findings.length > 0) {
        fail(
          `${commandFixturePath}: safe fixture ${fixture.name || "<unnamed>"} produced ${findings.join(", ") || "no fenced block"}`,
        );
      }
      if (fixtureNames.has(fixture.name)) {
        fail(`${commandFixturePath}: duplicate fixture name ${fixture.name}`);
      }
      fixtureNames.add(fixture.name);
    }
    for (const finding of [
      "pipe-to-shell",
      "pipe-to-powershell",
      "download-to-powershell-expression",
      "download-to-shell-execution",
      "unpinned-ast-grep-mcp-git-source",
    ]) {
      if (!coveredFindings.has(finding)) {
        fail(`${commandFixturePath}: missing unsafe fixture coverage for ${finding}`);
      }
    }
  }
}
forbidPattern(
  "runtime command blocks",
  commands,
  /\bcodegraph_trace\b/,
  "stale CodeGraph MCP tools must not appear as executable commands",
);
forbidPattern(
  "runtime command blocks",
  commands,
  /\.codegraph\/config\.json/,
  "invented CodeGraph config paths must not appear in commands",
);
forbidPattern(
  "runtime command blocks",
  commands,
  /ast-grep\s+test[^\n]*(?:\s-U\b|--update-all\b)/,
  "snapshot update-all must not appear in executable examples",
);

forbidPattern(
  "runtime payload",
  combinedRuntime,
  /Microsoft SkillOpt|SkillOpt run/i,
  "SkillOpt optimization must remain outside this skill",
);
requirePattern(
  runtimePaths[2],
  runtime.get(runtimePaths[2]),
  /set -euo pipefail[\s\S]*mktemp -d[\s\S]*sha256sum -c -[\s\S]*tar -tzf/,
  "standalone checksum example must fail closed in a temporary directory",
);

const allowedRuntimeFiles = new Set(
  [...runtimePaths, ...runtimeAssetPaths].map((file) => path.normalize(file)),
);
const unexpectedRuntimeFiles = walk(skillDir).filter(
  (file) =>
    !fs.lstatSync(file).isFile() ||
    !allowedRuntimeFiles.has(path.normalize(path.relative(root, file))),
);
if (unexpectedRuntimeFiles.length > 0) {
  fail(
    `runtime payload: files outside the explicit runtime allowlist: ${unexpectedRuntimeFiles
      .map((file) => path.relative(root, file))
      .join(", ")}`,
  );
}

const requiredEvalCases = [
  "clear-setup-intent.md",
  "clear-update-intent.md",
  "broken-setup-doctor-routing.md",
  "ambiguous-workflow-selection.md",
  "agent-initiated-doctor-only.md",
  "doctor-project-opening-authority.md",
  "setup-target-guidance.md",
  "update-migrations-and-reconnect.md",
  "setup-idempotence.md",
  "analysis-is-internal-behavior.md",
  "internal-reviewed-rewrite-boundary.md",
  "experimental-ast-grep-mcp-negative.md",
  "typecheck-only-negative.md",
];

const legacyCaseSourceCommit = "1d454f06375f3b74ba506fef54b664a2517674c0";
const legacyCaseSources = [
  {
    path: "skill-evals/codegraph-ast-grep/cases/advanced-migration-extension.md",
    sha256: "8cfbb48314c1968805531ba40d3e8bbbf54b972ec03720826afd9b2ab33e8f4d",
  },
  {
    path: "skill-evals/codegraph-ast-grep/cases/ast-grep-structural-search.md",
    sha256: "bba4838338cc6993dd7019052e83daa090c341e42cec824e6baa248a02d2dbac",
  },
  {
    path: "skill-evals/codegraph-ast-grep/cases/bounded-rewrite-after-approval.md",
    sha256: "dbb38811675a6d2e0a4fcd378e18a05dfe3469c1b42b43aa271f1f7411788768",
  },
  {
    path: "skill-evals/codegraph-ast-grep/cases/codegraph-mcp-setup.md",
    sha256: "9fb75009ab6a2215842423d079d1297f82d866e9bc3e86205f1268b99ed75b10",
  },
  {
    path: "skill-evals/codegraph-ast-grep/cases/cross-runtime-setup-boundaries.md",
    sha256: "b49fa5b07de1865a2b216497715b4832ddbfe90a3e68b91170316fe573019e1d",
  },
  {
    path: "skill-evals/codegraph-ast-grep/cases/native-lsp-first.md",
    sha256: "78cc90a4cc4824865fc252a74d49072fb1125656a8930b56b5c6382f85ab7c21",
  },
  {
    path: "skill-evals/codegraph-ast-grep/cases/refactor-planning.md",
    sha256: "f39bd2c511cf51a2ae34b03fa6fc5922fc0c5abfb134c297c49b4725702ddb82",
  },
  {
    path: "skill-evals/codegraph-ast-grep/cases/repo-exploration-and-impact.md",
    sha256: "38f791475128eac1688f008037af7e41305a46ba92f185bef3d9f4c390557fb9",
  },
  {
    path: "skill-evals/codegraph-ast-grep/cases/security-policy-tool-boundary.md",
    sha256: "524920a8a0db30d4b811118ff2b28381171af53bc056610f01713dff0f6dea7d",
  },
];

const historicalCapturedSourceCases = [
  "stable-update-consent.md",
  "offline-update-check.md",
  "legacy-codegraph-capability-gate.md",
  "destructive-rewrite-negative.md",
];

for (const name of requiredEvalCases) {
  const relativePath = path.join("skill-evals", "codegraph-ast-grep", "cases", name);
  const text = requireFile(relativePath);
  requirePattern(relativePath, text, /^## Should Trigger$/m, "missing Should Trigger section");
  requirePattern(relativePath, text, /^## Prompt$/m, "missing Prompt section");
  requirePattern(
    relativePath,
    text,
    /^## Expected Behavior$/m,
    "missing Expected Behavior section",
  );

  const shouldTrigger = markdownSection(text, "Should Trigger");
  const prompt = markdownSection(text, "Prompt");
  const expectedBehavior = markdownSection(text, "Expected Behavior");
  if (!/^(?:Yes|No|Boundary case)\.?$/i.test(shouldTrigger)) {
    fail(`${relativePath}: Should Trigger must contain exactly Yes, No, or Boundary case`);
  }
  if (prompt.length < 20) {
    fail(`${relativePath}: Prompt must contain a non-trivial user request`);
  }
  if (expectedBehavior.length < 40 || !/^[-*] /m.test(expectedBehavior)) {
    fail(`${relativePath}: Expected Behavior must contain actionable bullet assertions`);
  }
}

const legacyCaseLineage = validateLegacyCaseLineage({
  root,
  manifestRelative: "skill-evals/codegraph-ast-grep/legacy-case-lineage.json",
  expectedSourceCommit: legacyCaseSourceCommit,
  expectedSources: legacyCaseSources,
  expectedBaselineDirectory: `skill-evals/codegraph-ast-grep/legacy-case-baseline/${legacyCaseSourceCommit}`,
  runtimeDirectory: "skills/engineering-workflows/codegraph-ast-grep",
  activeTargetRoots: [
    "skills/engineering-workflows/codegraph-ast-grep",
    "skill-evals/codegraph-ast-grep/cases",
  ],
  forbiddenEvidenceRoots: [
    "skill-evals/codegraph-ast-grep/behavioral",
    "skill-evals/codegraph-ast-grep/runs",
    "skill-evals/codegraph-ast-grep/validator-fixtures",
    "skill-evals/codegraph-ast-grep/README.md",
    "skill-evals/codegraph-ast-grep/rubric.md",
  ],
});
errors.push(...legacyCaseLineage.errors);

const behavioralRoot = "skill-evals/codegraph-ast-grep/behavioral";
const currentContractRoot = `${behavioralRoot}/current-contract`;
const currentContractManifestPath = `${currentContractRoot}/manifest.json`;
const currentContractManifest = requireJson(currentContractManifestPath);
const currentRuntimeCandidateHash = hashRuntimeCandidate(skillDir, {
  excludedRelativePaths: ["agents/openai.yaml", "assets/openai-icon.png"],
});
let currentContractCases = 0;
let currentContractPassed = 0;
let currentContractFailed = 0;

if (currentContractManifest) {
  if (
    currentContractManifest.schema_version !== 2 ||
    currentContractManifest.suite_id !== "codegraph-ast-grep-v0.3.3-current-contract-2026-08-26" ||
    currentContractManifest.evidence_mode !== "hash-bound-internal-reviewer-capture" ||
    !isValidIsoDate(currentContractManifest.reviewed_at)
  ) {
    fail(`${currentContractManifestPath}: invalid current-contract identity or evidence mode`);
  }
  if (
    currentContractManifest.candidate?.skill_path !==
      "skills/engineering-workflows/codegraph-ast-grep" ||
    currentContractManifest.candidate?.skill_version !== "0.3.3" ||
    currentContractManifest.candidate?.sha256 !== currentRuntimeCandidateHash ||
    currentContractManifest.candidate?.hash_recipe !== currentContractHashRecipe
  ) {
    fail(
      `${currentContractManifestPath}: current contract is not bound to runtime payload ${currentRuntimeCandidateHash}`,
    );
  }

  const captureProvenancePath = validateRepoPath(
    `${currentContractManifestPath}:capture.provenance_path`,
    currentContractManifest.capture?.provenance_path,
    `${currentContractRoot}${path.sep}`,
  );
  const gradeProvenancePath = validateRepoPath(
    `${currentContractManifestPath}:grading.provenance_path`,
    currentContractManifest.grading?.provenance_path,
    `${currentContractRoot}${path.sep}`,
  );
  if (
    currentContractManifest.capture?.mode !== "local-nonbehavioral-refresh" ||
    captureProvenancePath !== `${currentContractRoot}/capture-provenance.json` ||
    currentContractManifest.grading?.mode !== "independent-collaboration-reviewer" ||
    gradeProvenancePath !== `${currentContractRoot}/grade-provenance.json`
  ) {
    fail(`${currentContractManifestPath}: capture and grading provenance modes are incomplete`);
  }

  const captureProvenanceArtifact = captureProvenancePath
    ? readJsonArtifact(captureProvenancePath)
    : { bytes: Buffer.alloc(0), text: "", value: null };
  const gradeProvenanceArtifact = gradeProvenancePath
    ? readJsonArtifact(gradeProvenancePath)
    : { bytes: Buffer.alloc(0), text: "", value: null };
  const captureProvenance = captureProvenanceArtifact.value;
  const gradeProvenance = gradeProvenanceArtifact.value;
  if (
    currentContractManifest.capture?.sha256 !== sha256(captureProvenanceArtifact.bytes) ||
    currentContractManifest.grading?.sha256 !== sha256(gradeProvenanceArtifact.bytes)
  ) {
    fail(`${currentContractManifestPath}: provenance hashes do not match their artifacts`);
  }
  if (
    captureProvenance?.schema_version !== 1 ||
    captureProvenance?.captured_at !== currentContractManifest.reviewed_at ||
    captureProvenance?.capture_kind !== "local-nonbehavioral-refresh" ||
    captureProvenance?.reviewer_role !== "repository-maintainer-authorized-receipt-refresh" ||
    captureProvenance?.candidate_sha256 !== currentRuntimeCandidateHash ||
    captureProvenance?.network !== false ||
    captureProvenance?.tools_executed !== false ||
    captureProvenance?.output_normalization !==
      "Captured words and claims are unchanged; only repository Markdown formatting is normalized." ||
    !Array.isArray(captureProvenance?.runtime_files_read) ||
    !Array.isArray(captureProvenance?.limitations) ||
    !captureProvenance.limitations.some((value) => /not an external codex-exec run/i.test(value))
  ) {
    fail(`${captureProvenancePath}: invalid internal capture provenance or evidence boundary`);
  }
  if (
    gradeProvenance?.schema_version !== 1 ||
    (gradeProvenance?.graded_at !== currentContractManifest.reviewed_at &&
      !(
        currentContractManifest.capture?.mode === "local-nonbehavioral-refresh" &&
        gradeProvenance?.graded_at === "2026-08-10"
      )) ||
    gradeProvenance?.grade_kind !== "independent-collaboration-reviewer" ||
    gradeProvenance?.reviewer_role !== "independent-internal-contract-grader" ||
    gradeProvenance?.cases !== 5 ||
    gradeProvenance?.passed !== 35 ||
    gradeProvenance?.failed !== 0 ||
    gradeProvenance?.network !== false ||
    !/not external model, CI, hosted, or production proof/i.test(gradeProvenance?.limitation ?? "")
  ) {
    fail(`${gradeProvenancePath}: invalid independent grading provenance or evidence boundary`);
  }

  const manifestCases = currentContractManifest.cases;
  if (
    !Array.isArray(manifestCases) ||
    manifestCases.length !== expectedCurrentContractCases.size ||
    JSON.stringify(manifestCases.map((entry) => entry.id)) !==
      JSON.stringify([...expectedCurrentContractCases.keys()])
  ) {
    fail(`${currentContractManifestPath}: expected the five captured v0.3.3 contract cases`);
  } else {
    const seenSources = new Set();
    const seenPrompts = new Set();
    const seenOutputs = new Set();
    const seenGradings = new Set();
    for (const entry of manifestCases) {
      const caseLabel = `${currentContractManifestPath}:${entry.id || "<missing-id>"}`;
      const expected = expectedCurrentContractCases.get(entry.id);
      if (!expected) {
        fail(`${caseLabel}: case is outside the reviewed v0.3.3 contract`);
        continue;
      }
      if (entry.source_case !== expected.source_case) {
        fail(`${caseLabel}: source_case does not match the reviewed scenario`);
      }
      const expectedPromptPath = `${currentContractRoot}/${entry.id}/prompt.md`;
      const expectedOutputPath = `${currentContractRoot}/${entry.id}/captured-output.md`;
      const expectedGradingPath = `${currentContractRoot}/${entry.id}/grading.json`;
      if (
        entry.prompt_path !== expectedPromptPath ||
        entry.output_path !== expectedOutputPath ||
        entry.grading_path !== expectedGradingPath
      ) {
        fail(`${caseLabel}: artifacts must use the canonical current-contract layout`);
      }
      const sourcePath = validateRepoPath(`${caseLabel}:source_case`, entry.source_case);
      const promptPath = validateRepoPath(
        `${caseLabel}:prompt_path`,
        entry.prompt_path,
        `${currentContractRoot}${path.sep}`,
      );
      const outputPath = validateRepoPath(
        `${caseLabel}:output_path`,
        entry.output_path,
        `${currentContractRoot}${path.sep}`,
      );
      const gradingPath = validateRepoPath(
        `${caseLabel}:grading_path`,
        entry.grading_path,
        `${currentContractRoot}${path.sep}`,
      );
      if (!sourcePath || !promptPath || !outputPath || !gradingPath) continue;
      if (seenSources.has(sourcePath)) {
        fail(`${caseLabel}: source_case is duplicated`);
      }
      if (seenPrompts.has(promptPath)) {
        fail(`${caseLabel}: prompt_path is duplicated`);
      }
      if (seenOutputs.has(outputPath)) {
        fail(`${caseLabel}: output_path is duplicated`);
      }
      if (seenGradings.has(gradingPath)) {
        fail(`${caseLabel}: grading_path is duplicated`);
      }
      seenSources.add(sourcePath);
      seenPrompts.add(promptPath);
      seenOutputs.add(outputPath);
      seenGradings.add(gradingPath);

      const sourceArtifact = readUtf8Artifact(sourcePath);
      const promptArtifact = readUtf8Artifact(promptPath);
      const outputArtifact = readUtf8Artifact(outputPath);
      const gradingArtifact = readJsonArtifact(gradingPath);
      const sourceHash = sha256(sourceArtifact.bytes);
      const promptHash = sha256(promptArtifact.bytes);
      const outputHash = sha256(outputArtifact.bytes);
      const gradingHash = sha256(gradingArtifact.bytes);
      if (sourceHash !== expected.source_sha256 || entry.sha256?.source_case !== sourceHash) {
        fail(`${caseLabel}: source-case hash does not match the reviewed contract`);
      }
      if (promptHash !== expected.prompt_sha256 || entry.sha256?.prompt !== promptHash) {
        fail(`${caseLabel}: prompt hash does not match the reviewed contract`);
      }
      if (outputHash !== expected.output_sha256 || entry.sha256?.output !== outputHash) {
        fail(`${caseLabel}: captured-output hash does not match the reviewed capture`);
      }
      if (gradingHash !== expected.grading_sha256 || entry.sha256?.grading !== gradingHash) {
        fail(`${caseLabel}: grading hash does not match the independent review`);
      }
      const publicEvidence = [
        [promptPath, promptArtifact.text],
        [outputPath, outputArtifact.text],
        [gradingPath, gradingArtifact.text],
      ];
      for (const [artifactPath, text] of publicEvidence) {
        if (
          hasUnsafeControlCharacter(text) ||
          /(?:\/home\/|\/root\/|[A-Za-z]:\\Users\\|internal hostname|customer data|Bearer\s+[A-Za-z0-9._-]+)/i.test(
            text,
          )
        ) {
          fail(`${artifactPath}: current behavioral evidence is not public-safe`);
        }
      }
      if (
        promptArtifact.text.length < 300 ||
        !/^## Synthetic fixture facts$/m.test(promptArtifact.text) ||
        !/^## User prompt$/m.test(promptArtifact.text) ||
        !promptArtifact.text.includes("skills/engineering-workflows/codegraph-ast-grep/SKILL.md")
      ) {
        fail(`${caseLabel}: prompt is incomplete`);
      }
      if (outputArtifact.text.trim().length < 200) {
        fail(`${caseLabel}: captured output is empty or trivial`);
      }
      if (
        !Array.isArray(entry.contract_assertions) ||
        JSON.stringify(entry.contract_assertions) !== JSON.stringify(expected.contract_assertions)
      ) {
        fail(`${caseLabel}: contract assertions differ from the reviewed scenario`);
        continue;
      }

      const grading = gradingArtifact.value;
      if (
        grading?.schema_version !== 1 ||
        grading?.case_id !== entry.id ||
        !Array.isArray(grading?.assertions) ||
        JSON.stringify(grading.assertions.map((assertion) => assertion.id)) !==
          JSON.stringify(expected.contract_assertions)
      ) {
        fail(`${gradingPath}: grading IDs do not match the manifest contract in order`);
        continue;
      }
      let passed = 0;
      for (const assertion of grading.assertions) {
        if (
          assertion.passed !== true ||
          assertion.failure_reason !== null ||
          typeof assertion.evidence !== "string" ||
          assertion.evidence.trim().length < 10
        ) {
          fail(`${gradingPath}:${assertion.id}: assertion lacks a passing independent review`);
        } else {
          passed += 1;
        }
      }
      const failed = grading.assertions.length - passed;
      if (
        grading.summary?.passed !== passed ||
        grading.summary?.failed !== failed ||
        grading.summary?.total !== grading.assertions.length ||
        entry.summary?.passed !== passed ||
        entry.summary?.failed !== failed ||
        entry.summary?.total !== grading.assertions.length
      ) {
        fail(`${caseLabel}: manifest and grading summaries do not reconcile`);
      }
      currentContractCases += 1;
      currentContractPassed += passed;
      currentContractFailed += failed;
    }
  }

  if (
    currentContractCases !== 5 ||
    currentContractPassed !== 35 ||
    currentContractFailed !== 0 ||
    currentContractManifest.summary?.cases !== currentContractCases ||
    currentContractManifest.summary?.passed !== currentContractPassed ||
    currentContractManifest.summary?.failed !== currentContractFailed ||
    currentContractManifest.summary?.total !== currentContractPassed + currentContractFailed ||
    !Array.isArray(currentContractManifest.limitations) ||
    !currentContractManifest.limitations.some((value) =>
      /clean-context internal collaboration-reviewer captures, not external codex-exec runs/i.test(
        value,
      ),
    ) ||
    !currentContractManifest.limitations.some((value) =>
      /not.*live CodeGraph, ast-grep, CI, hosted, or production behavior/i.test(value),
    )
  ) {
    fail(`${currentContractManifestPath}: current-contract summary or limitations are incomplete`);
  }

  const expectedCurrentContractFiles = new Set([
    `${currentContractRoot}/README.md`,
    currentContractManifestPath,
    `${currentContractRoot}/capture-provenance.json`,
    `${currentContractRoot}/grade-provenance.json`,
    ...[...expectedCurrentContractCases.keys()].flatMap((caseId) => [
      `${currentContractRoot}/${caseId}/prompt.md`,
      `${currentContractRoot}/${caseId}/captured-output.md`,
      `${currentContractRoot}/${caseId}/grading.json`,
    ]),
  ]);
  const actualCurrentContractFiles = new Set(
    walk(path.join(root, currentContractRoot)).map((file) =>
      path.relative(root, file).split(path.sep).join("/"),
    ),
  );
  const missingCurrentContractFiles = [...expectedCurrentContractFiles].filter(
    (file) => !actualCurrentContractFiles.has(file),
  );
  const unexpectedCurrentContractFiles = [...actualCurrentContractFiles].filter(
    (file) => !expectedCurrentContractFiles.has(file),
  );
  if (missingCurrentContractFiles.length > 0 || unexpectedCurrentContractFiles.length > 0) {
    fail(
      `${currentContractRoot}: exact captured artifact set mismatch; missing=${missingCurrentContractFiles.join(", ") || "none"}; unexpected=${unexpectedCurrentContractFiles.join(", ") || "none"}`,
    );
  }

  for (const [artifactPath, text] of [
    [captureProvenancePath, captureProvenanceArtifact.text],
    [gradeProvenancePath, gradeProvenanceArtifact.text],
  ]) {
    if (
      artifactPath &&
      (hasUnsafeControlCharacter(text) ||
        /(?:\/home\/|\/root\/|[A-Za-z]:\\Users\\|internal hostname|customer data|Bearer\s+[A-Za-z0-9._-]+)/i.test(
          text,
        ))
    ) {
      fail(`${artifactPath}: reviewer provenance is not public-safe`);
    }
  }

  const currentContractReadmePath = `${currentContractRoot}/README.md`;
  const currentContractReadme = requireFile(currentContractReadmePath);
  requirePattern(
    currentContractReadmePath,
    currentContractReadme,
    /internal clean-context collaboration reviewer/i,
    "current contract must identify the internal capture source",
  );
  requirePattern(
    currentContractReadmePath,
    currentContractReadme,
    /exact runtime hash/i,
    "current contract must describe runtime-payload binding",
  );
  requirePattern(
    currentContractReadmePath,
    currentContractReadme,
    /not.*external codex-exec.*CI.*hosted.*production/is,
    "current contract must state the bounded evidence stages",
  );

  const currentContractRunPath =
    "skill-evals/codegraph-ast-grep/runs/2026-08-26-v0.3.3-local-nonbehavioral-refresh.md";
  const currentContractRun = requireFile(currentContractRunPath);
  for (const marker of [
    currentRuntimeCandidateHash,
    `${currentContractRoot}/capture-provenance.json`,
    `${currentContractRoot}/grade-provenance.json`,
    "35 passed, 0 failed",
  ]) {
    if (!currentContractRun.includes(marker)) {
      fail(`${currentContractRunPath}: missing current capture marker ${marker}`);
    }
  }
  requirePattern(
    currentContractRunPath,
    currentContractRun,
    /Five clean-context internal collaboration-reviewer captures/i,
    "run record must state the exact capture count and mode",
  );
  requirePattern(
    currentContractRunPath,
    currentContractRun,
    /no network.*no CodeGraph or ast-grep tool/is,
    "run record must state the execution boundary",
  );
  requirePattern(
    currentContractRunPath,
    currentContractRun,
    /not an external codex-exec run.*CI result.*hosted result.*production proof/is,
    "run record must not overclaim evidence stages",
  );
}

const behavioralManifestPath = `${behavioralRoot}/manifest.json`;
const behavioralManifest = requireJson(behavioralManifestPath);
let capturedBehaviorCases = 0;
let capturedBehaviorAssertions = 0;

if (behavioralManifest) {
  if (behavioralManifest.schema_version !== 1) {
    fail(`${behavioralManifestPath}: unsupported schema_version`);
  }
  const suiteIdMatch = /^codegraph-ast-grep-(\d{4}-\d{2}-\d{2})-codex$/.exec(
    behavioralManifest.suite_id ?? "",
  );
  if (!suiteIdMatch) {
    fail(`${behavioralManifestPath}: suite_id must identify the skill, date, and runtime`);
  }
  if (
    behavioralManifest.candidate?.skill_path !==
      "skills/engineering-workflows/codegraph-ast-grep" ||
    !new Set(["0.2.0", "0.3.0"]).has(behavioralManifest.candidate?.skill_version)
  ) {
    fail(
      `${behavioralManifestPath}: candidate path/version is not an approved current or historical skill payload`,
    );
  }
  if (
    behavioralManifest.candidate?.hash_recipe !==
    "For each runtime file in bytewise lexicographic path order: relative path, NUL, file bytes, NUL; then SHA-256."
  ) {
    fail(`${behavioralManifestPath}: candidate hash recipe is missing or unsupported`);
  }
  if (
    behavioralManifest.candidate?.skill_version === "0.3.0" &&
    behavioralManifest.candidate?.sha256 !== currentRuntimeCandidateHash
  ) {
    fail(
      `${behavioralManifestPath}: captured candidate hash ${behavioralManifest.candidate?.sha256 || "<missing>"} does not match current runtime payload ${currentRuntimeCandidateHash}`,
    );
  }
  if (
    behavioralManifest.capture?.mode !== "fresh-codex-exec-final-message" ||
    typeof behavioralManifest.capture?.runtime !== "string" ||
    behavioralManifest.capture.runtime.trim().length < 3 ||
    typeof behavioralManifest.capture?.model !== "string" ||
    behavioralManifest.capture.model.trim().length < 3 ||
    !/^[A-Za-z0-9._:-]+$/.test(behavioralManifest.capture.model) ||
    behavioralManifest.capture?.sandbox !== "read-only" ||
    behavioralManifest.capture?.ephemeral !== true ||
    behavioralManifest.capture?.user_config_loaded !== false ||
    behavioralManifest.capture?.output_normalization !==
      "Final message normalized only by repository Markdown formatting; progress and tool-event JSON removed; no words or claims edited."
  ) {
    fail(
      `${behavioralManifestPath}: capture provenance must describe a fresh isolated read-only run`,
    );
  }
  if (!isValidIsoDate(behavioralManifest.captured_at)) {
    fail(`${behavioralManifestPath}: captured_at must be an explicit ISO date`);
  } else if (suiteIdMatch && suiteIdMatch[1] !== behavioralManifest.captured_at) {
    fail(`${behavioralManifestPath}: suite_id date must match captured_at`);
  }
  const captureCommand = behavioralManifest.capture?.command_template;
  const expectedCaptureCommand = `HOME="<isolated-home>" CODEX_HOME="<codex-home>" codex exec --ephemeral --ignore-user-config --ignore-rules -m ${behavioralManifest.capture?.model ?? "<model>"} -s read-only --json - < "<prompt_path>"`;
  if (captureCommand !== expectedCaptureCommand) {
    fail(`${behavioralManifestPath}: capture command template omits required isolation flags`);
  }

  const manifestCases = behavioralManifest.cases;
  if (!Array.isArray(manifestCases) || manifestCases.length !== expectedCapturedCases.size) {
    fail(`${behavioralManifestPath}: expected exactly four reviewed behavioral cases`);
  } else {
    const knownSources = new Set(
      [...requiredEvalCases, ...historicalCapturedSourceCases].map((name) =>
        path.normalize(path.join("skill-evals", "codegraph-ast-grep", "cases", name)),
      ),
    );
    const seenCaseIds = new Set();
    const seenSourceCases = new Set();
    const seenArtifactPaths = new Set();
    const seenThreadIds = new Set();
    const seenPromptHashes = new Set();
    const seenOutputHashes = new Set();

    for (const entry of manifestCases) {
      const caseLabel = `${behavioralManifestPath}:${entry.id || "<missing-id>"}`;
      const expectedCase = expectedCapturedCases.get(entry.id);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id ?? "") || seenCaseIds.has(entry.id)) {
        fail(`${caseLabel}: case id must be unique kebab-case`);
      }
      seenCaseIds.add(entry.id);
      if (!expectedCase) {
        fail(`${caseLabel}: case id is outside the reviewed behavioral suite`);
      } else if (entry.source_case !== expectedCase.source_case) {
        fail(`${caseLabel}: source_case does not match the reviewed case mapping`);
      }

      const sourcePath = validateRepoPath(`${caseLabel}:source_case`, entry.source_case);
      const promptPath = validateRepoPath(
        `${caseLabel}:prompt_path`,
        entry.prompt_path,
        `${behavioralRoot}${path.sep}`,
      );
      const outputPath = validateRepoPath(
        `${caseLabel}:output_path`,
        entry.output_path,
        `${behavioralRoot}${path.sep}`,
      );
      const gradingPath = validateRepoPath(
        `${caseLabel}:grading_path`,
        entry.grading_path,
        `${behavioralRoot}${path.sep}`,
      );
      const expectedCaseRoot = path.normalize(path.join(behavioralRoot, entry.id ?? ""));
      for (const [kind, actualPath, expectedName] of [
        ["prompt", promptPath, "prompt.md"],
        ["output", outputPath, "captured-output.md"],
        ["grading", gradingPath, "grading.json"],
      ]) {
        if (actualPath && actualPath !== path.join(expectedCaseRoot, expectedName)) {
          fail(`${caseLabel}: ${kind} artifact must use the canonical per-case layout`);
        }
      }
      if (!sourcePath || !knownSources.has(sourcePath)) {
        fail(`${caseLabel}: source_case is not a registered scenario case`);
      } else if (seenSourceCases.has(sourcePath)) {
        fail(`${caseLabel}: source_case is duplicated in the captured suite`);
      } else {
        seenSourceCases.add(sourcePath);
      }
      if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(entry.thread_id ?? "")) {
        fail(`${caseLabel}: capture thread identifier must be a canonical lowercase UUID`);
      } else if (seenThreadIds.has(entry.thread_id)) {
        fail(`${caseLabel}: capture thread identifier is duplicated`);
      } else {
        seenThreadIds.add(entry.thread_id);
      }
      for (const artifactPath of [promptPath, outputPath, gradingPath].filter(Boolean)) {
        if (seenArtifactPaths.has(artifactPath)) {
          fail(`${caseLabel}: behavioral artifact path is reused: ${artifactPath}`);
        } else {
          seenArtifactPaths.add(artifactPath);
        }
      }
      if (!promptPath || !outputPath || !gradingPath) continue;

      const sourceArtifact =
        sourcePath && knownSources.has(sourcePath)
          ? readUtf8Artifact(sourcePath)
          : { bytes: Buffer.alloc(0), text: "" };
      const promptArtifact = readUtf8Artifact(promptPath);
      const outputArtifact = readUtf8Artifact(outputPath);
      const gradingArtifact = readUtf8Artifact(gradingPath);
      const prompt = promptArtifact.text;
      const output = outputArtifact.text;
      const gradingText = gradingArtifact.text;
      let grading;
      try {
        grading = JSON.parse(gradingText);
      } catch (error) {
        fail(`${gradingPath}: invalid JSON (${error.message})`);
        continue;
      }

      if (expectedCase) {
        if (sha256(sourceArtifact.bytes) !== expectedCase.source_sha256) {
          fail(`${caseLabel}: reviewed source-case content changed`);
        }
        if (sha256(promptArtifact.bytes) !== expectedCase.prompt_sha256) {
          fail(`${caseLabel}: reviewed capture prompt content changed`);
        }
      }

      for (const [kind, value, expectedHash] of [
        ["source_case", sourceArtifact.bytes, entry.sha256?.source_case],
        ["prompt", promptArtifact.bytes, entry.sha256?.prompt],
        ["output", outputArtifact.bytes, entry.sha256?.output],
        ["grading", gradingArtifact.bytes, entry.sha256?.grading],
      ]) {
        const actualHash = sha256(value);
        if (expectedHash !== actualHash) {
          fail(`${caseLabel}: ${kind} hash ${expectedHash || "<missing>"} != ${actualHash}`);
        }
      }
      const promptHash = sha256(promptArtifact.bytes);
      const outputHash = sha256(outputArtifact.bytes);
      if (seenPromptHashes.has(promptHash)) {
        fail(`${caseLabel}: prompt content duplicates another captured case`);
      }
      if (seenOutputHashes.has(outputHash)) {
        fail(`${caseLabel}: output content duplicates another captured case`);
      }
      seenPromptHashes.add(promptHash);
      seenOutputHashes.add(outputHash);
      if (prompt.length < 200 || !/^## User prompt$/m.test(prompt)) {
        fail(
          `${promptPath}: capture prompt must include fixture context and a User prompt section`,
        );
      }
      if (output.trim().length < 100) {
        fail(`${outputPath}: captured final response is empty or trivial`);
      }
      if (/<!--[\s\S]*?-->/.test(output) || hasUnsafeControlCharacter(output)) {
        fail(`${outputPath}: captured final response contains hidden comments or control bytes`);
      }
      const forbiddenOutput = forbiddenBehavioralOutputPatterns.get(entry.id);
      if (forbiddenOutput?.test(output)) {
        fail(`${outputPath}: captured response contradicts the reviewed approval boundary`);
      }
      if (
        grading.schema_version !== 1 ||
        grading.case_id !== entry.id ||
        !Array.isArray(grading.assertions) ||
        grading.assertions.length === 0
      ) {
        fail(`${gradingPath}: invalid grading schema or case linkage`);
        continue;
      }
      if (
        grading.assertions.length !== 7 ||
        (expectedCase &&
          gradingDefinitionHash(grading.assertions) !== expectedCase.grading_definition_sha256)
      ) {
        fail(`${gradingPath}: assertion definitions differ from the reviewed seven-item schema`);
      }

      const seenAssertionIds = new Set();
      let passed = 0;
      for (const assertion of grading.assertions) {
        const assertionLabel = `${gradingPath}:${assertion.id || "<missing-id>"}`;
        if (
          !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(assertion.id ?? "") ||
          seenAssertionIds.has(assertion.id)
        ) {
          fail(`${assertionLabel}: assertion id must be unique kebab-case`);
        }
        seenAssertionIds.add(assertion.id);
        if (typeof assertion.evidence !== "string" || assertion.evidence.trim().length < 10) {
          fail(`${assertionLabel}: stored review evidence is missing`);
        }
        const computed = evaluateAssertion(assertion, output);
        if (assertion.passed !== computed) {
          fail(`${assertionLabel}: stored passed=${assertion.passed} but regrade=${computed}`);
        }
        if (computed) passed += 1;
      }

      const total = grading.assertions.length;
      const failed = total - passed;
      for (const [label, summary] of [
        [gradingPath, grading.summary],
        [caseLabel, entry.summary],
      ]) {
        if (summary?.passed !== passed || summary?.failed !== failed || summary?.total !== total) {
          fail(`${label}: summary does not match machine-regraded totals ${passed}/${total}`);
        }
      }
      if (failed > 0) fail(`${gradingPath}: ${failed} behavioral assertion(s) failed`);
      capturedBehaviorCases += 1;
      capturedBehaviorAssertions += total;
    }
  }

  if (
    capturedBehaviorCases !== 4 ||
    capturedBehaviorAssertions !== 28 ||
    behavioralManifest.summary?.cases !== capturedBehaviorCases ||
    behavioralManifest.summary?.passed !== capturedBehaviorAssertions ||
    behavioralManifest.summary?.failed !== 0 ||
    behavioralManifest.summary?.total !== capturedBehaviorAssertions
  ) {
    fail(`${behavioralManifestPath}: aggregate summary does not match captured regrade totals`);
  }

  const allowedBehavioralEntries = new Set([
    "README.md",
    "manifest.json",
    "current-contract",
    ...expectedCapturedCases.keys(),
  ]);
  const unexpectedBehavioralEntries = fs
    .readdirSync(path.join(root, behavioralRoot))
    .filter((entry) => !allowedBehavioralEntries.has(entry));
  if (unexpectedBehavioralEntries.length > 0) {
    fail(
      `${behavioralRoot}: unmanifested behavioral artifacts: ${unexpectedBehavioralEntries.join(", ")}`,
    );
  }

  const behavioralRunPath = "skill-evals/codegraph-ast-grep/runs/2026-07-12-reliability-refresh.md";
  const behavioralRun = requireFile(behavioralRunPath);
  const behavioralReadmePath = `${behavioralRoot}/README.md`;
  const behavioralReadme = requireFile(behavioralReadmePath);
  const runtimeVersion = behavioralManifest.capture?.runtime?.split(/\s+/).at(-1) ?? "";
  if (!behavioralRun.includes(behavioralManifest.candidate?.sha256 ?? "<missing>")) {
    fail(`${behavioralRunPath}: narrative candidate hash does not match the capture manifest`);
  }
  if (
    !runtimeVersion ||
    !behavioralRun.includes(runtimeVersion) ||
    !behavioralRun.includes(behavioralManifest.capture?.model ?? "<missing>")
  ) {
    fail(`${behavioralRunPath}: narrative runtime/model does not match the capture manifest`);
  }
  requirePattern(
    behavioralRunPath,
    behavioralRun,
    /four fresh/i,
    "narrative capture count must match the manifest",
  );
  requirePattern(
    behavioralRunPath,
    behavioralRun,
    /28\/28/,
    "narrative regrade total must match the manifest",
  );
  if (!behavioralReadme.includes(`-m ${behavioralManifest.capture?.model}`)) {
    fail(`${behavioralReadmePath}: capture command model does not match the manifest`);
  }
}

const rubricPath = "skill-evals/codegraph-ast-grep/rubric.md";
const rubric = requireFile(rubricPath);
requirePattern(
  rubricPath,
  rubric,
  /stable channels once/i,
  "rubric must grade update-check frequency",
);
requirePattern(
  rubricPath,
  rubric,
  /installer provenance/i,
  "rubric must grade provenance preservation",
);
requirePattern(
  rubricPath,
  rubric,
  /exact root/i,
  "rubric must grade doctor project-opening authority",
);
requirePattern(rubricPath, rubric, /installed help/i, "rubric must grade capability discovery");
requirePattern(rubricPath, rubric, /native LSP/i, "rubric must grade native LSP fallback");
requirePattern(rubricPath, rubric, /positive and negative/i, "rubric must grade rule fixtures");

const packagePath = "package.json";
const packageText = requireFile(packagePath);
requirePattern(
  packagePath,
  packageText,
  /"validate:codegraph-ast-grep":\s*"bun --bun scripts\/validation\/codegraph-ast-grep\/validate-contract\.mjs"/,
  "missing dedicated contract-validation script",
);
requirePattern(
  packagePath,
  packageText,
  /"validate"[^\n]*validate:codegraph-ast-grep/,
  "pnpm run validate must execute the contract validator",
);

export const validationErrors = [...new Set(errors)].sort();
export const validationSummary = `Validated CodeGraph + ast-grep runtime contract, ${requiredEvalCases.length} scenario schemas, ${legacyCaseLineage.summary.cases} legacy-case dispositions covering ${legacyCaseLineage.summary.sourceUnits} material units, ${currentContractPassed}/${currentContractPassed + currentContractFailed} assertions across ${currentContractCases} hash-bound v0.3.3 local nonbehavioral refresh captures, and ${capturedBehaviorAssertions} assertions across ${capturedBehaviorCases} historical captured v0.2 cases.`;

const entrypoint = process.argv[1] ? path.resolve(process.argv[1]) : "";
const isMain = entrypoint === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  if (validationErrors.length > 0) {
    console.error("CodeGraph + ast-grep contract validation failed:");
    for (const error of validationErrors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(validationSummary);
}
