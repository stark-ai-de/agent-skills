import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { load } from "js-yaml";

const suite = "skill-evals/codegraph-ast-grep/behavioral/v0.3.4-routing";
const skill = "skills/engineering-workflows/codegraph-ast-grep";
const ids = [
  "direct-setup",
  "direct-update",
  "starter-setup",
  "starter-update",
  "starter-bare",
  "starter-options",
];
const setupRequest =
  "Set up CodeGraph and ast-grep for Codex in `/workspace/sample-app` now, within this project only. I authorize ordinary in-root installation, configuration, indexing, and agent guidance.";
const updateRequest =
  "Update the existing project-local CodeGraph and ast-grep setup in `/workspace/sample-app` to eligible stable versions now, including required migrations and Codex reconnection. I authorize ordinary in-root update work.";
const optionsRequest =
  "Show me every available workflow and when to choose it. Do not start any work.";
const clearChecks = [
  "selected_expected_workflow",
  "no_unselected_menu",
  "no_redundant_choice",
  "root_named",
  "no_completion_claim",
  "tools_read_only",
];
const menuChecks = [
  "ordered_full_menu",
  "no_selected_workflow",
  "no_execution_claim",
  "no_state_inspection",
  "no_non_skill_tool_calls",
  "question_boundary",
];

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function read(root, relative, errors) {
  const full = path.join(root, relative);
  let current = root;
  for (const part of relative.split("/")) {
    current = path.join(current, part);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
      errors.push(`${relative}: symlinked artifact is forbidden`);
      return { bytes: Buffer.alloc(0), text: "" };
    }
  }
  if (!fs.existsSync(full) || !fs.lstatSync(full).isFile()) {
    errors.push(`${relative}: missing regular artifact`);
    return { bytes: Buffer.alloc(0), text: "" };
  }
  const bytes = fs.readFileSync(full);
  return { bytes, text: bytes.toString("utf8") };
}

function json(root, relative, errors) {
  const artifact = read(root, relative, errors);
  try {
    return { ...artifact, value: JSON.parse(artifact.text) };
  } catch {
    errors.push(`${relative}: invalid JSON`);
    return { ...artifact, value: null };
  }
}

function candidateHash(root, errors) {
  const directory = path.join(root, skill);
  const files = [];
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) {
        errors.push(`${path.relative(root, full)}: candidate symlink is forbidden`);
      } else if (entry.isDirectory()) {
        visit(full);
      } else if (entry.isFile()) {
        const relative = path.relative(directory, full).split(path.sep).join("/");
        if (relative !== "assets/openai-icon.png") files.push({ full, relative });
      }
    }
  }
  visit(directory);
  files.sort((a, b) => Buffer.from(a.relative).compare(Buffer.from(b.relative)));
  const hash = crypto.createHash("sha256");
  for (const file of files) {
    hash.update(file.relative).update(Buffer.from([0]));
    hash.update(fs.readFileSync(file.full)).update(Buffer.from([0]));
  }
  return hash.digest("hex");
}

function menuItems(output) {
  return output.split("\n").flatMap((line) => {
    const listItem = /^\s*(?:[-*]|\d+[.)])\s+(.+)/.exec(line);
    if (!listItem) return [];
    const plain = listItem[1].replaceAll("*", "").replaceAll("`", "").trim();
    const workflow = /^(setup|update|doctor)\b/i.exec(plain);
    return workflow ? [workflow[1].toLowerCase()] : [];
  });
}

function grade(id, output, events) {
  const files = Array.isArray(events?.files_read) ? events.files_read : [];
  const skillRead = files.includes(`${skill}/SKILL.md`);
  const candidateOnly = files.every(
    (file) =>
      file === `${skill}/SKILL.md` ||
      file === `${skill}/agents/openai.yaml` ||
      file.startsWith(`${skill}/references/`),
  );
  const safeTools =
    events?.run_completed === true &&
    Number.isInteger(events?.command_count) &&
    events.command_count >= 1 &&
    events?.non_read_tool_calls === 0 &&
    skillRead &&
    candidateOnly;
  const firstLine = output.split("\n")[0].replaceAll("*", "").replaceAll("`", "");
  const selected = /^Selected\s+(?:workflow:\s*)?(setup|update|doctor)\b/i
    .exec(firstLine)?.[1]
    ?.toLowerCase();
  const menu = menuItems(output);
  const namedWorkflows = ["setup", "update", "doctor"].filter((name) =>
    new RegExp(`\\b${name}\\b`, "i").test(output),
  );
  if (id.endsWith("setup") || id.endsWith("update")) {
    const expected = id.endsWith("setup") ? "setup" : "update";
    return {
      selected_expected_workflow: selected === expected,
      no_unselected_menu: menu.length === 0 && namedWorkflows.length < 3,
      no_redundant_choice: !/which workflow|choose (?:a|the) workflow|please select/i.test(output),
      root_named: output.includes("/workspace/sample-app"),
      no_completion_claim: /\bno\b[^.]{0,160}\bperformed\b/i.test(output),
      tools_read_only: safeTools,
    };
  }
  return {
    ordered_full_menu: JSON.stringify(menu) === JSON.stringify(["setup", "update", "doctor"]),
    no_selected_workflow:
      selected === undefined &&
      !/\b(?:select|selected|choos(?:e|ing))\s+(?:the )?(?:workflow:\s*)?(?:setup|update|doctor)\b/i.test(
        output,
      ),
    no_execution_claim:
      /\bno project inspection or (?:workflow )?execution (?:has been|was) performed\b/i.test(
        output,
      ),
    no_state_inspection: safeTools && files.every((file) => file === `${skill}/SKILL.md`),
    no_non_skill_tool_calls: safeTools,
    question_boundary:
      id === "starter-bare" ? /\bwhich workflow\b[^?]*\?/i.test(output) : !output.includes("?"),
  };
}

export function validateRoutingCapture(root) {
  const errors = [];
  const manifestPath = `${suite}/manifest.json`;
  const manifest = json(root, manifestPath, errors).value;
  if (!manifest) return { errors, cases: 0, passed: 0, total: 0 };
  const expectedHash = candidateHash(root, errors);
  if (
    manifest.schema_version !== 1 ||
    manifest.suite_id !== "codegraph-ast-grep-v0.3.4-routing-2026-09-30" ||
    manifest.candidate?.skill_path !== skill ||
    manifest.candidate?.skill_version !== "0.3.4" ||
    manifest.candidate?.sha256 !== expectedHash ||
    manifest.candidate?.hash_recipe !==
      "For each canonical skill file in bytewise lexicographic path order, excluding assets/openai-icon.png: relative path, NUL, file bytes, NUL; then SHA-256. Includes SKILL.md and agents/openai.yaml."
  ) {
    errors.push(`${manifestPath}: candidate identity or current hash does not match`);
  }
  const capture = manifest.capture;
  if (
    capture?.captured_at !== "2026-09-30" ||
    capture?.model !== "gpt-6.1-sol" ||
    capture?.model_selection !== "explicit -m argument" ||
    !/^codex-cli \d+\.\d+\.\d+$/.test(capture?.runtime ?? "") ||
    capture?.mode !== "fresh-codex-exec-final-message" ||
    capture?.sandbox !== "read-only" ||
    capture?.ephemeral !== true ||
    capture?.ignore_user_config !== true ||
    capture?.ignore_rules !== true ||
    capture?.entrypoint !==
      "CLI-composed default_prompt plus user addition; not a native Codex UI run" ||
    capture?.output_normalization !==
      "Final agent message normalized only by repository Markdown formatting and trailing newline; no words or claims edited." ||
    capture?.command_template !==
      "HOME=<isolated-home> CODEX_HOME=<auth-home> codex exec --ephemeral --ignore-user-config --ignore-rules -m gpt-6.1-sol -s read-only --json -C <candidate-worktree> - < <prompt.md>"
  ) {
    errors.push(`${manifestPath}: capture provenance is incomplete`);
  }
  let starter = "";
  try {
    starter = load(read(root, `${skill}/agents/openai.yaml`, errors).text)?.interface
      ?.default_prompt;
  } catch {
    errors.push(`${skill}/agents/openai.yaml: invalid YAML for capture binding`);
  }
  if (typeof starter !== "string" || !starter)
    errors.push(`${manifestPath}: starter text unavailable`);
  if (JSON.stringify(manifest.cases?.map((entry) => entry.id)) !== JSON.stringify(ids)) {
    errors.push(`${manifestPath}: expected the six routing cases in order`);
  }
  let passed = 0;
  let total = 0;
  for (const id of ids) {
    const entry = manifest.cases?.find((item) => item.id === id);
    if (!entry) continue;
    const files = {};
    for (const [kind, filename] of Object.entries({
      prompt: "prompt.md",
      output: "captured-output.md",
      events: "events.json",
      grading: "grading.json",
    })) {
      const expectedPath = `${suite}/${id}/${filename}`;
      if (entry.paths?.[kind] !== expectedPath)
        errors.push(`${manifestPath}:${id}: invalid ${kind} path`);
      files[kind] =
        kind === "events" || kind === "grading"
          ? json(root, expectedPath, errors)
          : read(root, expectedPath, errors);
      if (entry.sha256?.[kind] !== sha256(files[kind].bytes)) {
        errors.push(`${manifestPath}:${id}: ${kind} hash mismatch`);
      }
    }
    const prompt = files.prompt.text;
    const userMessage = prompt.split("## User message\n\n")[1]?.trim();
    const expectedUserMessage = {
      "direct-setup": setupRequest,
      "direct-update": updateRequest,
      "starter-setup": `${starter}\n\n${setupRequest}`,
      "starter-update": `${starter}\n\n${updateRequest}`,
      "starter-bare": starter,
      "starter-options": `${starter}\n\n${optionsRequest}`,
    }[id];
    if (
      !prompt.includes(`Read \`${skill}/SKILL.md\` from this checkout`) ||
      !prompt.includes("synthetic project `/workspace/sample-app`") ||
      userMessage !== expectedUserMessage
    ) {
      errors.push(`${suite}/${id}/prompt.md: fixture or starter text drift`);
    }
    const event = files.events.value;
    if (
      event?.schema_version !== 1 ||
      event?.thread_id !== entry.thread_id ||
      !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(event?.thread_id ?? "") ||
      !/^[0-9a-f]{64}$/.test(event?.raw_jsonl_sha256 ?? "") ||
      event?.raw_jsonl_retained !== "local only; not committed"
    ) {
      errors.push(`${suite}/${id}/events.json: invalid event provenance`);
    }
    const checks = grade(id, files.output.text, event);
    const expectedKeys = id.endsWith("setup") || id.endsWith("update") ? clearChecks : menuChecks;
    const grading = files.grading.value;
    if (
      grading?.schema_version !== 1 ||
      grading?.case_id !== id ||
      JSON.stringify(Object.keys(grading?.checks ?? {})) !== JSON.stringify(expectedKeys) ||
      Object.values(checks).some((value) => value !== true) ||
      Object.values(grading?.checks ?? {}).some((value) => value !== true) ||
      grading?.summary?.passed !== expectedKeys.length ||
      grading?.summary?.failed !== 0 ||
      grading?.summary?.total !== expectedKeys.length ||
      entry.summary?.passed !== expectedKeys.length ||
      entry.summary?.failed !== 0 ||
      entry.summary?.total !== expectedKeys.length
    ) {
      errors.push(`${suite}/${id}: routing assertion or stored grade failed`);
    }
    if (/\/home\/servrox|api[_-]?key|bearer token/i.test(files.output.text)) {
      errors.push(`${suite}/${id}/captured-output.md: private content marker`);
    }
    passed += Object.values(checks).filter(Boolean).length;
    total += expectedKeys.length;
  }
  if (
    manifest.summary?.cases !== ids.length ||
    manifest.summary?.passed !== total ||
    manifest.summary?.failed !== 0 ||
    manifest.summary?.total !== total ||
    passed !== total
  ) {
    errors.push(`${manifestPath}: aggregate routing grade mismatch`);
  }
  const expectedEntries = new Set(["README.md", "manifest.json", ...ids]);
  const actualEntries = fs.readdirSync(path.join(root, suite));
  if (actualEntries.some((entry) => !expectedEntries.has(entry))) {
    errors.push(`${suite}: unmanifested routing evidence`);
  }
  const caseFiles = ["captured-output.md", "events.json", "grading.json", "prompt.md"];
  for (const id of ids) {
    const directory = path.join(root, suite, id);
    if (!fs.existsSync(directory) || !fs.lstatSync(directory).isDirectory()) {
      errors.push(`${suite}/${id}: missing case directory`);
      continue;
    }
    if (JSON.stringify(fs.readdirSync(directory).sort()) !== JSON.stringify(caseFiles)) {
      errors.push(`${suite}/${id}: unmanifested or missing case artifact`);
    }
  }
  return { errors, cases: ids.length, passed, total };
}
