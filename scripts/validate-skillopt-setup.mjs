import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const skillRoot = path.join(root, "incubator/skills/skill-maintenance/skillopt-setup");
const assetRoot = path.join(skillRoot, "assets/agent-skills-benchmark");

const helperScripts = [
  "apply-skillopt-best.mjs",
  "audit-skillopt-local-artifacts.mjs",
  "check-skillopt-readiness.mjs",
  "codex-local-openai-chat-gateway.mjs",
  "prepare-local-skillopt-adapter.mjs",
  "prepare-skillopt-split.mjs",
  "probe-codex-cli.mjs",
  "probe-openai-compatible-endpoint.mjs",
  "setup-skillopt-local.mjs",
  "summarize-skillopt-run.mjs",
  "verify-skillopt-run-artifacts.mjs",
];

const pythonTemplates = [
  "adapter.py.template",
  "codex_cli_reflector.py.template",
  "dataloader.py.template",
  "evaluator.py.template",
  "rollout.py.template",
];
const minDeterministicCases = 20;

function fail(message) {
  throw new Error(message);
}

function assertFile(file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    fail(`Missing file: ${path.relative(root, file)}`);
  }
}

function run(name, command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 30000,
    ...options,
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.error) {
    fail(`${name}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`${name}: expected exit 0, got ${result.status}\n${output}`);
  }
  return output;
}

function hasPython3() {
  const probe = spawnSync("python3", ["--version"], {
    cwd: root,
    encoding: "utf8",
    timeout: 30000,
  });
  return !probe.error && probe.status === 0;
}

function assertIncludes(name, text, needle) {
  if (!text.includes(needle)) {
    fail(`${name}: expected output/content to include ${JSON.stringify(needle)}`);
  }
}

function assertNotIncludes(name, text, needle) {
  if (text.includes(needle)) {
    fail(`${name}: unexpected content ${JSON.stringify(needle)}`);
  }
}

function assertNotMatches(name, text, pattern, label) {
  if (pattern.test(text)) {
    fail(`${name}: unexpected ${label}`);
  }
}

function writeFile(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
}

function validateHelp() {
  for (const scriptName of helperScripts) {
    const script = path.join(skillRoot, "scripts", scriptName);
    assertFile(script);
    const output = run(`${scriptName} --help`, "node", [script, "--help"]);
    assertIncludes(`${scriptName} --help`, output, "Usage:");
    assertIncludes(`${scriptName} --help`, output, scriptName);
  }
}

function validatePythonTemplates() {
  const files = pythonTemplates.map((name) => path.join(assetRoot, name));
  for (const file of files) assertFile(file);
  if (!hasPython3()) {
    console.warn("python3 unavailable; skipping SkillOpt Python template parse check");
    return;
  }

  run("SkillOpt Python template parse", "python3", [
    "-c",
    "import ast, pathlib, sys\nfor p in sys.argv[1:]:\n    ast.parse(pathlib.Path(p).read_text(encoding='utf-8'), filename=p)\n",
    ...files,
  ]);

  const evaluator = path.join(assetRoot, "evaluator.py.template");
  run("SkillOpt Markdown-escaped visual glob regression", "python3", [
    "-c",
    "import runpy, sys\nmodule = runpy.run_path(sys.argv[1])\nresult = module['_match_visual_assertion']([{'path': 'result.png'}], r'artifact_exists: \\*.png')\nassert result['passed'], result\n",
    evaluator,
  ]);
  run("SkillOpt hard-gate semantic merge regression", "python3", [
    "-c",
    `import runpy, sys
module = runpy.run_path(sys.argv[1])
evaluator = module['AgentSkillsEvaluator']({'judge_backend': 'heuristic'})
result = evaluator.score(
    {
        'id': 'semantic-after-hard-gates',
        'skill_name': 'test-skill',
        'expected_behavior': ['semantic requirement'],
        'deterministic_assertions': ['contains: hard-token'],
        'visual_assertions': [],
    },
    {'returncode': 0, 'response': 'hard-token only', 'artifacts': []},
)
assert result['hard'] == 0, result
assert result['judge_backend'] == 'deterministic+heuristic', result
assert any(item['text'] == 'Response semantically reflects expected behavior' for item in result['assertion_results']), result

missing = module['_match_visual_assertion'](
    [{'path': 'result.svg', 'kind': 'svg', 'valid': True}],
    'svg_contains: *.svg Visible',
)
assert not missing['passed'] and 'visible-text metadata' in missing['evidence'], missing
metadata_only = module['_match_visual_assertion'](
    [{'path': 'result.svg', 'kind': 'svg', 'valid': True, 'visible_text': ''}],
    'svg_contains: *.svg MetadataOnly',
)
assert not metadata_only['passed'], metadata_only
`,
    evaluator,
  ]);
}

function validateRolloutArtifactPolicy() {
  if (!hasPython3()) {
    console.warn("python3 unavailable; skipping SkillOpt rollout artifact-policy smoke");
    return;
  }
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-artifact-policy-"));
  const template = path.join(assetRoot, "rollout.py.template");
  const python = `
import os
import runpy
import struct
import zlib
from pathlib import Path

module = runpy.run_path(os.environ["ROLLOUT_TEMPLATE"])
root = Path(os.environ["TEST_ROOT"])

def chunk(kind, payload):
    crc = zlib.crc32(kind)
    crc = zlib.crc32(payload, crc) & 0xffffffff
    return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", crc)

def png(width, height, raw, color_type=6, bit_depth=8, interlace=0, before_idat=()):
    ihdr = struct.pack(">IIBBBBB", width, height, bit_depth, color_type, 0, 0, interlace)
    return (
        b"\\x89PNG\\r\\n\\x1a\\n"
        + chunk(b"IHDR", ihdr)
        + b"".join(before_idat)
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )

valid = png(2, 1, b"\\x00\\xff\\x00\\x00\\xff\\x00\\xff\\x00\\xff")
valid_path = root / "valid.png"
valid_path.write_bytes(valid)
metadata = module["png_metadata"](valid_path)
assert metadata["valid"] and metadata["nonblank"], metadata

bad_crc = bytearray(valid)
idat = valid.index(b"IDAT")
length = struct.unpack(">I", valid[idat - 4:idat])[0]
bad_crc[idat + 4 + length] ^= 1
assert not module["png_metadata"](root / "bad-crc.png", bytes(bad_crc))["valid"]
assert not module["png_metadata"](root / "missing-iend.png", valid[:-12])["valid"]
assert not module["png_metadata"](root / "oversized.png", png(20000, 1, b""))["valid"]
assert not module["png_metadata"](root / "inflate-bomb.png", png(1, 1, b"\\x00" * 400))["valid"]

adam7 = module["png_metadata"](
    root / "adam7.png",
    png(1, 1, b"\\x00\\x10\\x20\\x30\\xff", interlace=1),
)
assert adam7["valid"] and adam7["visible_pixel_count"] == 1, adam7

duplicate_palette = module["png_metadata"](
    root / "duplicate-palette.png",
    png(
        2,
        1,
        b"\\x00\\x00\\x01",
        color_type=3,
        before_idat=(chunk(b"PLTE", b"\\xff\\x00\\x00\\xff\\x00\\x00"),),
    ),
)
assert duplicate_palette["valid"] and not duplicate_palette["nonblank"], duplicate_palette

invalid_index = module["png_metadata"](
    root / "invalid-index.png",
    png(
        2,
        1,
        b"\\x00\\x00\\x01",
        color_type=3,
        before_idat=(chunk(b"PLTE", b"\\xff\\x00\\x00"),),
    ),
)
assert not invalid_index["valid"], invalid_index

cross_row_alpha = module["png_metadata"](
    root / "cross-row-alpha.png",
    png(1, 2, b"\\x00\\xff\\x00\\x00\\x00\\x00\\xff\\x00\\x00\\xff"),
)
assert cross_row_alpha["valid"], cross_row_alpha
assert cross_row_alpha["transparent_pixel_count"] == 1, cross_row_alpha
assert cross_row_alpha["visible_pixel_count"] == 1 and cross_row_alpha["nonblank"], cross_row_alpha

late_plte = module["png_metadata"](
    root / "late-plte.png",
    png(
        1,
        1,
        b"\\x00\\xff\\x00\\x00",
        color_type=2,
        before_idat=(
            chunk(b"tRNS", b"\\x00\\x00\\x00\\x00\\x00\\x00"),
            chunk(b"PLTE", b"\\xff\\x00\\x00"),
        ),
    ),
)
assert not late_plte["valid"], late_plte

assert module["svg_metadata"](root / "valid.svg", b'<svg xmlns="http://www.w3.org/2000/svg"><text>visible</text></svg>')["valid"]
assert not module["svg_metadata"](root / "bad-utf8.svg", b'<svg>\\xff</svg>')["valid"]
assert not module["svg_metadata"](root / "dtd.svg", b'<!DOCTYPE svg><svg/>')["valid"]

quota = root / "quota"
quota.mkdir()
(quota / "one.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg"><text>one</text></svg>', encoding="utf-8")
(quota / "two.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg"><text>two</text></svg>', encoding="utf-8")
module["collect_artifacts"].__globals__["MAX_ARTIFACT_TOTAL_BYTES"] = 32
try:
    module["collect_artifacts"](quota)
except module["ArtifactPolicyError"]:
    pass
else:
    raise AssertionError("artifact total-byte quota was not enforced")

count = root / "count"
count.mkdir()
module["collect_artifacts"].__globals__["MAX_ARTIFACT_TOTAL_BYTES"] = 64 * 1024 * 1024
for index in range(module["MAX_ARTIFACT_COUNT"] + 1):
    (count / f"{index:02d}.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg"><text>x</text></svg>', encoding="utf-8")
try:
    module["collect_artifacts"](count)
except module["ArtifactPolicyError"]:
    pass
else:
    raise AssertionError("artifact count quota was not enforced")

outside_dir = root / "outside-dir"
outside_dir.mkdir()
(outside_dir / "outside.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg"><text>outside</text></svg>', encoding="utf-8")
symlink_workspace = root / "symlink-workspace"
symlink_workspace.mkdir()
(symlink_workspace / "linked-dir").symlink_to(outside_dir, target_is_directory=True)
assert module["collect_artifacts"](symlink_workspace) == []
`;
  try {
    run("SkillOpt rollout artifact-policy smoke", "python3", ["-c", python], {
      env: { ...process.env, ROLLOUT_TEMPLATE: template, TEST_ROOT: tempDir },
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function validateProviderTargetRollout() {
  if (!hasPython3()) {
    console.warn("python3 unavailable; skipping provider target rollout smoke");
    return;
  }
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-provider-rollout-"));
  const skillName = "provider-rollout-skill";
  const secret = `sk-provider${"7".repeat(24)}`;
  const errorSecret = `sk-error${"8".repeat(24)}`;
  const template = path.join(assetRoot, "rollout.py.template");
  try {
    writeFile(path.join(tempRepo, "package.json"), "{}\n");
    writeFile(path.join(tempRepo, "AGENTS.md"), "# Test repo\n");
    writeFile(
      path.join(tempRepo, "skills/engineering-workflows", skillName, "SKILL.md"),
      `---
name: ${skillName}
description: Temporary provider rollout skill used only by the SkillOpt validator.
---

# Provider Rollout Skill
`,
    );
    writeFile(
      path.join(tempRepo, "skills/engineering-workflows", skillName, "references/provider-rule.md"),
      `# Provider rule\n\nUse fixture evidence. Synthetic token that must be redacted: ${secret}\n`,
    );
    const fixture = `skill-evals/${skillName}/fixtures/input.txt`;
    const oversized = `skill-evals/${skillName}/fixtures/oversized.txt`;
    const binary = `skill-evals/${skillName}/fixtures/binary.dat`;
    writeFile(path.join(tempRepo, fixture), "fixture evidence is present\n");
    writeFile(path.join(tempRepo, oversized), "x".repeat(64 * 1024 + 1));
    fs.writeFileSync(path.join(tempRepo, binary), Buffer.from([0, 1, 2, 3]));

    const python = `
import json
import runpy
import sys
import types

calls = []
model = types.ModuleType("skillopt.model")
def chat_target(**kwargs):
    calls.append(kwargs)
    return "provider response", {"prompt_tokens": 4, "completion_tokens": 2}
model.chat_target = chat_target
def chat_optimizer(**kwargs):
    return json.dumps({"passed": True, "score": 1.0, "reason": "semantic pass", "assertions": []}), {"prompt_tokens": 3, "completion_tokens": 2}
model.chat_optimizer = chat_optimizer
skillopt = types.ModuleType("skillopt")
skillopt.model = model
sys.modules["skillopt"] = skillopt
sys.modules["skillopt.model"] = model

module = runpy.run_path(sys.argv[1])
evaluator_module = runpy.run_path(sys.argv[2])
rollout = module["AgentSkillsRollout"]({"target_backend": "openai_chat", "exec_timeout": 10})
base = {
    "id": "provider-text",
    "skill_name": ${JSON.stringify(skillName)},
    "prompt": "Use the provider resources.",
    "fixtures": [${JSON.stringify(fixture)}],
    "visual_assertions": [],
}
text = rollout.run(base, "# Test Skill")
visual = rollout.run({**base, "id": "provider-visual", "visual_assertions": ["artifact_exists: *.png"]}, "# Test Skill")
oversized = rollout.run({**base, "id": "provider-oversized", "fixtures": [${JSON.stringify(oversized)}]}, "# Test Skill")
binary = rollout.run({**base, "id": "provider-binary", "fixtures": [${JSON.stringify(binary)}]}, "# Test Skill")

evaluator = evaluator_module["AgentSkillsEvaluator"]({"judge_backend": "provider"})
semantic = evaluator.score(
    {
        "id": "provider-semantic-judge",
        "skill_name": ${JSON.stringify(skillName)},
        "expected_behavior": ["Preserve architecture boundaries exactly"],
    },
    {
        "returncode": 0,
        "response": "The module separation remains intact.",
        "artifacts": [],
    },
)
unsafe_evaluator = evaluator_module["AgentSkillsEvaluator"]({
    "judge_backend": "provider",
    "optimizer_backend": "claude_chat",
})
unsafe_semantic = unsafe_evaluator.score(
    {
        "id": "provider-unsafe-optimizer",
        "skill_name": ${JSON.stringify(skillName)},
        "expected_behavior": ["semantic requirement"],
    },
    {"returncode": 0, "response": "candidate response", "artifacts": []},
)
def failing_chat_optimizer(**kwargs):
    raise RuntimeError(${JSON.stringify(errorSecret)})
model.chat_optimizer = failing_chat_optimizer
semantic_failed = evaluator.score(
    {
        "id": "provider-semantic-error",
        "skill_name": ${JSON.stringify(skillName)},
        "expected_behavior": ["semantic requirement"],
    },
    {"returncode": 0, "response": "candidate response", "artifacts": []},
)

def failing_chat_target(**kwargs):
    raise RuntimeError(${JSON.stringify(errorSecret)})
model.chat_target = failing_chat_target
failed = rollout.run({**base, "id": "provider-failed"}, "# Test Skill")
print(json.dumps({
    "text": text,
    "visual": visual,
    "oversized": oversized,
    "binary": binary,
    "semantic": semantic,
    "unsafe_semantic": unsafe_semantic,
    "semantic_failed": semantic_failed,
    "failed": failed,
    "calls": calls,
}))
`;
    const smoke = spawnSync(
      "python3",
      ["-c", python, template, path.join(assetRoot, "evaluator.py.template")],
      {
        cwd: tempRepo,
        encoding: "utf8",
        timeout: 30000,
      },
    );
    if (smoke.status !== 0) {
      fail(
        `provider target rollout smoke failed: ${smoke.status}\n${smoke.stdout}\n${smoke.stderr}`,
      );
    }
    const parsed = JSON.parse(smoke.stdout);
    if (
      parsed.text.returncode !== 0 ||
      parsed.text.response !== "provider response" ||
      parsed.text.target_backend !== "openai_chat"
    ) {
      fail(`provider target did not use chat_target: ${JSON.stringify(parsed.text)}`);
    }
    const providerPrompt = parsed.calls[0]?.user || "";
    for (const expected of [
      "provider-rule.md",
      "Use fixture evidence",
      "fixtures/input.txt",
      "fixture evidence is present",
    ]) {
      if (!providerPrompt.includes(expected)) {
        fail(`provider target prompt omitted bounded resource content ${expected}`);
      }
    }
    if (providerPrompt.includes(secret) || !providerPrompt.includes("[redacted-token]")) {
      fail("provider target resource snapshot did not redact a secret-like value");
    }
    if (parsed.visual.returncode !== 126 || !parsed.visual.visual_rollout_blocker) {
      fail("provider target did not fail closed for active visual assertions");
    }
    if (parsed.semantic.hard !== 1 || parsed.semantic.judge_backend !== "provider") {
      fail(
        `provider semantic judge did not score a paraphrased response: ${JSON.stringify(parsed.semantic)}`,
      );
    }
    if (
      parsed.unsafe_semantic.hard !== 0 ||
      parsed.unsafe_semantic.judge_backend !== "provider" ||
      !parsed.unsafe_semantic.judge_reason.includes("does not support optimizer_backend") ||
      !parsed.unsafe_semantic.assertion_results?.some(
        (item) => item.text === "Provider semantic judge completed",
      )
    ) {
      fail("provider semantic judge accepted an unsafe local optimizer backend");
    }
    if (
      parsed.semantic_failed.hard !== 0 ||
      parsed.semantic_failed.judge_reason.includes(errorSecret) ||
      !parsed.semantic_failed.judge_reason.includes("[redacted-token]")
    ) {
      fail("provider semantic judge failure diagnostics leaked a secret-like value");
    }
    if (
      parsed.oversized.returncode !== 127 ||
      parsed.binary.returncode !== 127 ||
      !parsed.oversized.resource_snapshot_blocker ||
      !parsed.binary.resource_snapshot_blocker
    ) {
      fail("provider target accepted oversized or binary fixture context");
    }
    if (
      parsed.failed.returncode !== 1 ||
      parsed.failed.stderr.includes(errorSecret) ||
      !parsed.failed.stderr.includes("[redacted-token]")
    ) {
      fail("provider target failure diagnostics leaked a secret-like value");
    }
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

async function validateCodexJudgeAndReflectorIsolation() {
  if (!hasPython3()) {
    console.warn("python3 unavailable; skipping Codex judge/reflector isolation smoke");
    return;
  }
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-codex-analysis-isolation-"));
  const fakeCodex = path.join(tempDir, "fake-codex");
  const reportDir = path.join(tempDir, "reports");
  fs.mkdirSync(reportDir, { recursive: true });
  writeFile(
    fakeCodex,
    `#!/usr/bin/env python3
import json
import os
import pathlib
import subprocess
import sys

args = sys.argv[1:]
output_index = args.index("--output-last-message")
output = pathlib.Path(args[output_index + 1])
kind = "judge" if output.name == "judge.json" else "reflector"
helper = subprocess.Popen(
    [sys.executable, "-c", "import signal,time; signal.signal(signal.SIGTERM, lambda *_: None); time.sleep(3600)"],
)
pathlib.Path(${JSON.stringify(reportDir)}, kind + ".json").write_text(
    json.dumps({"args": args, "environment_keys": sorted(os.environ), "child_pid": helper.pid}),
    encoding="utf-8",
)
payload = (
    {"passed": True, "score": 1.0, "reason": "semantic pass", "assertions": []}
    if kind == "judge"
    else {"raw_patches": [{"source_type": "failure", "patch": {"reasoning": "bounded fix", "edits": [{"op": "replace", "target": "old", "content": "new"}]}}]}
)
output.write_text(json.dumps(payload), encoding="utf-8")
`,
  );
  fs.chmodSync(fakeCodex, 0o755);
  const python = `
import runpy
import sys
from pathlib import Path

evaluator_module = runpy.run_path(sys.argv[1])
reflector_module = runpy.run_path(sys.argv[2])
fake_codex = sys.argv[3]
out_dir = Path(sys.argv[4])

evaluator = evaluator_module["AgentSkillsEvaluator"]({
    "judge_backend": "codex_cli",
    "codex_exec_path": fake_codex,
    "codex_cli_judge_timeout": 10,
})
score = evaluator.score(
    {"id": "judge-isolation", "skill_name": "test", "expected_behavior": ["semantic pass"]},
    {"returncode": 0, "response": "candidate response", "artifacts": []},
)
assert score["hard"] == 1, score

reflector = reflector_module["CodexCliReflector"]({
    "codex_exec_path": fake_codex,
    "codex_cli_reflection_timeout": 10,
    "edit_budget": 2,
})
patches = reflector.reflect(
    [{"id": "failed", "hard": 0, "prediction": "old"}],
    "# Skill\\n\\nold\\n",
    out_dir,
)
assert len(patches) == 1, patches
`;
  try {
    const smoke = spawnSync(
      "python3",
      [
        "-c",
        python,
        path.join(assetRoot, "evaluator.py.template"),
        path.join(assetRoot, "codex_cli_reflector.py.template"),
        fakeCodex,
        path.join(tempDir, "output"),
      ],
      {
        cwd: root,
        env: {
          ...process.env,
          SKILLOPT_SENTINEL_SECRET: "must-not-reach-analysis-child",
        },
        encoding: "utf8",
        timeout: 30000,
      },
    );
    if (smoke.status !== 0) {
      fail(
        `Codex judge/reflector isolation smoke failed: ${smoke.status}\n${smoke.stdout}\n${smoke.stderr}`,
      );
    }
    for (const kind of ["judge", "reflector"]) {
      const report = JSON.parse(fs.readFileSync(path.join(reportDir, `${kind}.json`), "utf8"));
      for (const expected of [
        "--strict-config",
        "permissions.skillopt_",
        "network.enabled=false",
        'shell_environment_policy.inherit="none"',
      ]) {
        if (!report.args.some((arg) => arg.includes(expected))) {
          fail(`${kind} Codex invocation omitted isolation argument ${expected}`);
        }
      }
      if (report.args.includes("--sandbox")) {
        fail(`${kind} Codex invocation retained a host-readable legacy sandbox`);
      }
      if (report.environment_keys.includes("SKILLOPT_SENTINEL_SECRET")) {
        fail(`${kind} Codex invocation inherited an unrelated trainer secret`);
      }
      if (!(await waitForProcessExit(Number(report.child_pid)))) {
        fail(`${kind} Codex invocation left descendant process ${report.child_pid} alive`);
      }
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function validateRolloutWorkspaceSeedingContract() {
  if (!hasPython3()) {
    console.warn("python3 unavailable; skipping SkillOpt rollout workspace seeding smoke");
    return;
  }

  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-rollout-seed-"));
  const workspace = path.join(tempRepo, "rollout-workspace");
  const template = path.join(assetRoot, "rollout.py.template");
  try {
    writeFile(path.join(tempRepo, "package.json"), "{}\n");
    writeFile(path.join(tempRepo, "AGENTS.md"), "# Agent Instructions\n");
    writeFile(
      path.join(tempRepo, "skills/codex-operations/codex-spec-interviewer/SKILL.md"),
      `---
name: codex-spec-interviewer
description: Temporary skill used only by the SkillOpt validator.
---

# Codex Spec Interviewer
`,
    );
    writeFile(
      path.join(
        tempRepo,
        "skills/codex-operations/codex-spec-interviewer/references/spec-rubric.md",
      ),
      "# Spec Rubric\n",
    );
    writeFile(
      path.join(
        tempRepo,
        "skills/codex-operations/codex-spec-interviewer/assets/spec-template.standard.md",
      ),
      "# Standard Spec\n",
    );
    writeFile(
      path.join(tempRepo, "skills/codex-operations/codex-spec-interviewer/agents/spec-agent.md"),
      "# Spec Agent\n",
    );
    writeFile(
      path.join(tempRepo, "skills/codex-operations/codex-spec-interviewer/scripts/helper.mjs"),
      "console.log('helper');\n",
    );
    writeFile(
      path.join(tempRepo, "skill-evals/codex-spec-interviewer/fixtures/input.md"),
      "# Fixture\n",
    );

    const python = `
import json
import os
import runpy
from pathlib import Path

module = runpy.run_path(os.environ["ROLLOUT_TEMPLATE"])
workspace = Path(os.environ["ROLLOUT_WORKSPACE"])
workspace.mkdir(parents=True, exist_ok=True)
note = module["seed_workspace"](
    workspace,
    {"fixtures": ["skill-evals/codex-spec-interviewer/fixtures/input.md"]},
    "codex-spec-interviewer",
)
print(json.dumps({
    "note": note,
    "files": sorted(str(path.relative_to(workspace)) for path in workspace.rglob("*") if path.is_file()),
}))
`;
    const seed = spawnSync("python3", ["-c", python], {
      cwd: tempRepo,
      env: {
        ...process.env,
        ROLLOUT_TEMPLATE: template,
        ROLLOUT_WORKSPACE: workspace,
      },
      encoding: "utf8",
      timeout: 30000,
    });
    if (seed.status !== 0) {
      fail(
        `rollout workspace seeding smoke failed: ${seed.status}\n${seed.stdout}\n${seed.stderr}`,
      );
    }
    const parsed = JSON.parse(seed.stdout);
    for (const file of [
      "agents/spec-agent.md",
      "assets/spec-template.standard.md",
      "fixtures/input.md",
      "references/spec-rubric.md",
      "scripts/helper.mjs",
    ]) {
      if (!parsed.files.includes(file)) {
        fail(`rollout workspace seeding did not copy ${file}: ${seed.stdout}`);
      }
    }
    for (const needle of [
      "./agents/ from the target skill package",
      "./assets/ from the target skill package",
      "./references/ from the target skill package",
      "./scripts/ from the target skill package",
      "./fixtures/input.md copied from skill-evals/codex-spec-interviewer/fixtures/input.md",
    ]) {
      assertIncludes("rollout workspace seeding note", parsed.note, needle);
    }

    const outsideFixture = path.join(
      path.dirname(tempRepo),
      `${path.basename(tempRepo)}-outside.md`,
    );
    writeFile(outsideFixture, "outside\n");
    const symlinkFixture = path.join(
      tempRepo,
      "skill-evals/codex-spec-interviewer/fixtures/symlink.md",
    );
    fs.symlinkSync(outsideFixture, symlinkFixture);
    const fixturePolicyPython = `
import json
import os
import runpy
from pathlib import Path

module = runpy.run_path(os.environ["ROLLOUT_TEMPLATE"])
repo = Path.cwd()
fixtures = [
    str(repo / "skill-evals/codex-spec-interviewer/fixtures/input.md"),
    "../outside.md",
    "skill-evals/codex-spec-interviewer/fixtures/symlink.md",
]
rejected = []
for fixture in fixtures:
    try:
        module["fixture_source"](repo, fixture)
    except ValueError:
        rejected.append(fixture)
print(json.dumps(rejected))
`;
    const fixturePolicy = spawnSync("python3", ["-c", fixturePolicyPython], {
      cwd: tempRepo,
      env: { ...process.env, ROLLOUT_TEMPLATE: template },
      encoding: "utf8",
      timeout: 30000,
    });
    fs.rmSync(outsideFixture, { force: true });
    if (fixturePolicy.status !== 0) {
      fail(
        `rollout fixture containment smoke failed: ${fixturePolicy.status}\n${fixturePolicy.stdout}\n${fixturePolicy.stderr}`,
      );
    }
    const rejectedFixtures = JSON.parse(fixturePolicy.stdout);
    if (rejectedFixtures.length !== 3) {
      fail(
        `rollout fixture containment accepted an absolute, parent, or symlink path: ${fixturePolicy.stdout}`,
      );
    }

    writeFile(
      path.join(tempRepo, "incubator/skills/codex-operations/codex-spec-interviewer/SKILL.md"),
      `---
name: codex-spec-interviewer
description: Duplicate skill used only by the SkillOpt validator.
---

# Duplicate
`,
    );
    const ambiguous = spawnSync("python3", ["-c", python], {
      cwd: tempRepo,
      env: {
        ...process.env,
        ROLLOUT_TEMPLATE: template,
        ROLLOUT_WORKSPACE: path.join(tempRepo, "ambiguous-workspace"),
      },
      encoding: "utf8",
      timeout: 30000,
    });
    if (ambiguous.status !== 0) {
      fail(
        `rollout ambiguous workspace seeding smoke failed: ${ambiguous.status}\n${ambiguous.stdout}\n${ambiguous.stderr}`,
      );
    }
    const ambiguousParsed = JSON.parse(ambiguous.stdout);
    assertIncludes(
      "ambiguous rollout workspace seeding note",
      ambiguousParsed.note,
      "Multiple target skill packages named 'codex-spec-interviewer' were found",
    );
    assertIncludes(
      "ambiguous rollout workspace seeding note",
      ambiguousParsed.note,
      "Cannot seed rollout helpers safely.",
    );
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

async function validateVisualRolloutReadIsolation() {
  if (!hasPython3()) {
    console.warn("python3 unavailable; skipping SkillOpt visual read-isolation smoke");
    return;
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-visual-isolation-"));
  const binDir = path.join(tempDir, "bin");
  const codexPackage = path.join(tempDir, "codex-package");
  const fakeCodex = path.join(codexPackage, "bin", "codex");
  const childPidFile = path.join(codexPackage, "rollout-child.pid");
  const fakeDrawio = path.join(binDir, "drawio");
  const template = path.join(assetRoot, "rollout.py.template");
  try {
    writeFile(
      path.join(codexPackage, "package.json"),
      `${JSON.stringify({ name: "@openai/codex" })}\n`,
    );
    writeFile(
      fakeCodex,
      `#!/usr/bin/env python3
import json
import os
import pathlib
import subprocess
import sys

args = sys.argv[1:]
output_index = args.index("--output-last-message")
pathlib.Path(args[output_index + 1]).write_text("VISUAL_ISOLATION_READY\\n", encoding="utf-8")
helper = subprocess.Popen(
    [sys.executable, "-c", "import signal,time; signal.signal(signal.SIGTERM, lambda *_: None); time.sleep(3600)"],
)
pathlib.Path(${JSON.stringify(childPidFile)}).write_text(str(helper.pid), encoding="utf-8")
print(json.dumps({"args": args, "environment_keys": sorted(os.environ)}))
`,
    );
    writeFile(fakeDrawio, "#!/bin/sh\nexit 0\n");
    fs.chmodSync(fakeCodex, 0o755);
    fs.chmodSync(fakeDrawio, 0o755);

    const python = `
import json
import os
import runpy
from pathlib import Path

module = runpy.run_path(os.environ["ROLLOUT_TEMPLATE"])
artifact_workspace = Path(os.environ["TEST_ROOT"]) / "artifact-workspace"
artifact_workspace.mkdir()
(artifact_workspace / "genuine.svg").write_text(
    '<svg xmlns="http://www.w3.org/2000/svg"><text>safe</text></svg>',
    encoding="utf-8",
)
outside = Path(os.environ["TEST_ROOT"]) / "outside.svg"
outside.write_text('<svg xmlns="http://www.w3.org/2000/svg"><text>outside</text></svg>', encoding="utf-8")
(artifact_workspace / "leak.svg").symlink_to(outside)

rollout = module["AgentSkillsRollout"]({
    "codex_exec_path": os.environ["FAKE_CODEX"],
    "tool_rollout_for_visual_assertions": True,
    "require_drawio_cli_for_visual_rollouts": True,
    "visual_exec_timeout": 10,
})
outcome = rollout.run(
    {
        "id": "visual-isolation-smoke",
        "skill_name": "missing-test-skill",
        "prompt": "Create one visual artifact.",
        "fixtures": [],
        "visual_assertions": ["artifact_exists: *.svg"],
    },
    "# Test Skill",
)
print(json.dumps({
    "outcome": outcome,
    "artifact_paths": [item["path"] for item in module["collect_artifacts"](artifact_workspace)],
}))
`;
    const smokeStarted = Date.now();
    const smoke = spawnSync("python3", ["-c", python], {
      cwd: root,
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH || ""}`,
        ROLLOUT_TEMPLATE: template,
        TEST_ROOT: tempDir,
        FAKE_CODEX: fakeCodex,
        SKILLOPT_SENTINEL_SECRET: "must-not-reach-child",
      },
      encoding: "utf8",
      timeout: 30000,
    });
    if (smoke.status !== 0) {
      fail(
        `visual rollout read-isolation smoke failed: ${smoke.status}\n${smoke.stdout}\n${smoke.stderr}`,
      );
    }
    if (Date.now() - smokeStarted > 5_000) {
      fail("successful visual rollout waited for an inherited helper pipe timeout");
    }
    const parsed = JSON.parse(smoke.stdout);
    const outcome = parsed.outcome;
    if (outcome.returncode !== 0 || outcome.response.trim() !== "VISUAL_ISOLATION_READY") {
      fail(`visual rollout fake Codex failed: ${JSON.stringify(outcome)}`);
    }
    const childReport = JSON.parse(outcome.stdout);
    const codexArgs = childReport.args;
    for (const expected of [
      "--strict-config",
      'default_permissions="skillopt_visual_rollout"',
      "permissions.skillopt_visual_rollout.network.enabled=false",
      'shell_environment_policy.inherit="none"',
    ]) {
      if (!codexArgs.includes(expected)) {
        fail(`visual rollout missing strict read-isolation argument ${expected}`);
      }
    }
    const filesystemArg = codexArgs.find((arg) =>
      arg.startsWith("permissions.skillopt_visual_rollout.filesystem="),
    );
    for (const expected of [
      '":minimal"="read"',
      '":workspace_roots"={"."="write",".skillopt-control"="deny"}',
      `${JSON.stringify(path.resolve(codexPackage))}="read"`,
    ]) {
      if (!filesystemArg?.includes(expected)) {
        fail(`visual rollout filesystem profile omitted ${expected}: ${filesystemArg}`);
      }
    }
    if (codexArgs.includes("--sandbox") || codexArgs.includes("--search")) {
      fail("visual rollout retained a legacy sandbox or web-search argument");
    }
    if (childReport.environment_keys.includes("SKILLOPT_SENTINEL_SECRET")) {
      fail("visual rollout inherited an unrelated trainer secret into the Codex child");
    }
    const outputIndex = codexArgs.indexOf("--output-last-message");
    if (
      outputIndex === -1 ||
      !codexArgs[outputIndex + 1]?.endsWith("/.skillopt-control/final.md")
    ) {
      fail("visual rollout did not protect its final-output control path");
    }
    if (JSON.stringify(parsed.artifact_paths) !== JSON.stringify(["genuine.svg"])) {
      fail(`visual rollout artifact collection followed a symlink: ${smoke.stdout}`);
    }
    await waitForFile(childPidFile);
    const childPid = Number(fs.readFileSync(childPidFile, "utf8"));
    if (!Number.isInteger(childPid) || !(await waitForProcessExit(childPid))) {
      fail(`successful visual rollout left descendant process ${childPid} alive`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function validateConfigContracts() {
  const codexAll = fs.readFileSync(path.join(assetRoot, "config.codex-cli-all.yaml"), "utf8");
  const hybrid = fs.readFileSync(path.join(assetRoot, "config.hybrid-codex-target.yaml"), "utf8");
  const nativeProvider = fs.readFileSync(
    path.join(assetRoot, "config.native-provider.yaml"),
    "utf8",
  );

  assertIncludes("codex-cli-all config", codexAll, "run_profile: exploratory");
  assertIncludes("codex-cli-all config", codexAll, "reflection_backend: codex_cli");
  assertIncludes("codex-cli-all config", codexAll, "judge_backend: codex_cli");
  assertIncludes("codex-cli-all config", codexAll, "target_backend: codex_exec");
  assertIncludes("codex-cli-all config", codexAll, "use_slow_update: false");
  assertIncludes("codex-cli-all config", codexAll, "use_meta_skill: false");
  assertIncludes("codex-cli-all config", codexAll, "codex_exec_approval_policy: never");
  for (const [name, text] of [
    ["codex-cli-all config", codexAll],
    ["hybrid config", hybrid],
    ["native-provider config", nativeProvider],
  ]) {
    assertIncludes(name, text, "split_dir: <split-dir>");
    assertIncludes(name, text, "visual_eval_policy: <visual-eval-policy>");
    assertIncludes(name, text, "tool_rollout_for_visual_assertions: true");
    assertIncludes(name, text, "require_drawio_cli_for_visual_rollouts: true");
    assertIncludes(name, text, "visual_exec_timeout: 120");
  }

  assertIncludes("hybrid config", hybrid, "run_profile: <run-profile>");
  assertIncludes("hybrid config", hybrid, "optimizer_backend: openai_chat");
  assertIncludes("hybrid config", hybrid, "target_backend: codex_exec");
  assertIncludes("hybrid config", hybrid, "use_slow_update: true");
  assertIncludes("hybrid config", hybrid, "use_meta_skill: true");
  assertIncludes("hybrid config", hybrid, "codex_exec_approval_policy: never");

  assertIncludes("native-provider config", nativeProvider, "optimizer_backend: openai_chat");
  assertIncludes("native-provider config", nativeProvider, "target_backend: openai_chat");
  assertIncludes("native-provider config", nativeProvider, "use_slow_update: true");
  assertIncludes("native-provider config", nativeProvider, "use_meta_skill: true");
}

function validateVisualArtifactRolloutContract() {
  const skill = fs.readFileSync(path.join(skillRoot, "SKILL.md"), "utf8");
  const rollout = fs.readFileSync(path.join(assetRoot, "rollout.py.template"), "utf8");
  const adapter = fs.readFileSync(path.join(assetRoot, "adapter.py.template"), "utf8");
  const readiness = fs.readFileSync(
    path.join(skillRoot, "scripts/check-skillopt-readiness.mjs"),
    "utf8",
  );
  const split = fs.readFileSync(path.join(skillRoot, "scripts/prepare-skillopt-split.mjs"), "utf8");
  const setup = fs.readFileSync(path.join(skillRoot, "scripts/setup-skillopt-local.mjs"), "utf8");
  const prepareAdapter = fs.readFileSync(
    path.join(skillRoot, "scripts/prepare-local-skillopt-adapter.mjs"),
    "utf8",
  );
  const codexRunner = fs.readFileSync(
    path.join(skillRoot, "references/codex-cli-runner.md"),
    "utf8",
  );
  const adapterContract = fs.readFileSync(
    path.join(skillRoot, "references/adapter-contract.md"),
    "utf8",
  );
  const troubleshooting = fs.readFileSync(
    path.join(skillRoot, "references/troubleshooting.md"),
    "utf8",
  );
  const evalCase = fs.readFileSync(
    path.join(root, "skill-evals/skillopt-setup/cases/visual-rollout-tool-boundary.md"),
    "utf8",
  );

  for (const [name, text] of [
    ["skill", skill],
    ["rollout template", rollout],
    ["adapter template", adapter],
    ["readiness script", readiness],
    ["codex runner reference", codexRunner],
    ["adapter contract", adapterContract],
    ["troubleshooting reference", troubleshooting],
    ["visual rollout eval", evalCase],
  ]) {
    assertIncludes(name, text, "visual_assertions");
    assertIncludes(name, text, "tool_rollout_for_visual_assertions");
  }

  assertIncludes("rollout template", rollout, "def find_drawio_cli");
  assertIncludes("rollout template", rollout, "visual_rollout_blocker");
  assertIncludes("rollout template", rollout, "Browser tools");
  assertIncludes("rollout template", rollout, "tool_rollout_enabled");
  assertIncludes("rollout template", rollout, "process_alive_after_kill");
  assertIncludes("rollout template", rollout, "VISUAL_ROLLOUT_PERMISSION_PROFILE");
  assertIncludes("rollout template", rollout, "def codex_runtime_read_path");
  assertIncludes("rollout template", rollout, "default_permissions=");
  assertIncludes("rollout template", rollout, '":minimal"="read"');
  assertIncludes("rollout template", rollout, '"."="write"');
  assertIncludes("rollout template", rollout, "ROLLOUT_CONTROL_DIR");
  assertIncludes("rollout template", rollout, "network.enabled=false");
  assertIncludes("rollout template", rollout, "if path.is_symlink()");
  assertIncludes("adapter template", adapter, "require_drawio_cli_for_visual_rollouts");
  assertIncludes("readiness script", readiness, "function visualArtifactReadiness");
  assertIncludes("readiness script", readiness, "function readExistingCodexProbe");
  assertIncludes("readiness script", readiness, "activePositiveCases");
  assertIncludes("readiness script", readiness, "hasVisualAssertionBullets");
  assertIncludes("readiness script", readiness, "detectDrawioCli");
  assertIncludes("readiness script", readiness, "missing_drawio_cli");
  assertIncludes("readiness script", readiness, "text_only_ready");
  assertIncludes("split script", split, "visual_assertions");
  assertIncludes("split script", split, "isNoneAssertion");
  assertIncludes("split script", split, "data-text-only");
  assertIncludes("split script", split, "companion data-text-only split");
  assertIncludes("setup script", setup, "--visual-eval-policy");
  assertIncludes("setup script", setup, "Visual Assertions");
  assertIncludes("setup script", setup, "visualAssertionBullets");
  assertIncludes("setup script", setup, "passed using existing ignored readiness diagnostics");
  assertIncludes("setup script", setup, "trainingSplitDir");
  assertIncludes("adapter preparer", prepareAdapter, "effectiveVisualSplit");
  assertIncludes("adapter preparer", prepareAdapter, "<split-dir>");
  assertIncludes("adapter preparer", prepareAdapter, "<visual-eval-policy>");
  assertIncludes(
    "adapter preparer",
    prepareAdapter,
    "either the target is provider-backed or draw.io Desktop CLI is unavailable",
  );
  assertIncludes(
    "skill",
    skill,
    "Every active Codex target, judge, or reflection role still requires strict isolation",
  );
  assertIncludes("skill", skill, "data-text-only");
  assertIncludes("codex runner reference", codexRunner, "fast-fail with `visual_rollout_blocker`");
  assertIncludes("troubleshooting reference", troubleshooting, "Visual Artifact Rollouts Fail");
  assertIncludes(
    "troubleshooting reference",
    troubleshooting,
    "Strict readiness can reuse an existing successful probe",
  );
}

function validateGatewayTopologyGuidance() {
  const reference = path.join(skillRoot, "references/local-openai-gateway.md");
  const runbook = path.join(skillRoot, "references/runbook.md");
  const evalCase = path.join(
    root,
    "skill-evals/skillopt-setup/cases/local-gateway-deployment-topology.md",
  );
  assertFile(reference);
  assertFile(runbook);
  assertFile(evalCase);

  const referenceText = fs.readFileSync(reference, "utf8");
  const runbookText = fs.readFileSync(runbook, "utf8");
  const evalText = fs.readFileSync(evalCase, "utf8");
  for (const [name, text] of [
    ["local-openai-gateway reference", referenceText],
    ["runbook", runbookText],
    ["gateway topology eval", evalText],
  ]) {
    assertIncludes(name, text, "shared route layer");
    assertIncludes(name, text, "monolithic service");
    assertIncludes(name, text, "separate gateway deployments");
    assertIncludes(name, text, "loopback-only");
    assertIncludes(name, text, "host-read isolation");
  }
  assertIncludes("local-openai-gateway reference", referenceText, "backend and trust boundary");
  assertIncludes("local-openai-gateway reference", referenceText, "/v1/chat/completions");
  assertIncludes("local-openai-gateway reference", referenceText, "infrastructure source of truth");
}

function section(text, heading) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex(
    (line) => line.trim().toLowerCase() === `## ${heading}`.toLowerCase(),
  );
  if (start === -1) return "";
  const collected = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s+/.test(line)) break;
    collected.push(line);
  }
  return collected.join("\n").trim();
}

function bullets(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*[-*]\s+(.+)$/)?.[1]?.trim())
    .filter(Boolean);
}

function shouldTrigger(text) {
  const value = section(text, "Should Trigger")
    .trim()
    .split(/\s+/)[0]
    ?.replace(/[.]/g, "")
    .toLowerCase();
  return value !== "no" && value !== "false";
}

function validateBenchmarkAssertions() {
  const casesDir = path.join(root, "skill-evals/skillopt-setup/cases");
  assertFile(path.join(root, "skill-evals/skillopt-setup/rubric.md"));
  const cases = walk(casesDir).filter((file) => file.endsWith(".md"));
  let positiveCases = 0;
  let deterministicCases = 0;
  for (const file of cases) {
    const text = fs.readFileSync(file, "utf8");
    if (!shouldTrigger(text)) continue;
    positiveCases += 1;
    if (bullets(section(text, "Deterministic Assertions")).length > 0) {
      deterministicCases += 1;
    }
  }
  if (positiveCases < 20) {
    fail(`skillopt-setup benchmark has only ${positiveCases} positive cases; expected at least 20`);
  }
  if (deterministicCases < minDeterministicCases) {
    fail(
      `skillopt-setup benchmark has only ${deterministicCases} positive cases with deterministic assertions; expected at least ${minDeterministicCases}`,
    );
  }
}

function skillBodyText(file) {
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/^---\n[\s\S]*?\n---\n?/);
  return match ? text.slice(match[0].length).trimStart() : text;
}

function runAdoptionPreview(name, candidate, expectedStatus) {
  const script = path.join(skillRoot, "scripts/apply-skillopt-best.mjs");
  const result = spawnSync(
    process.execPath,
    [script, "--skill", "drawio-diagrams", "--best", candidate, "--dry-run", "--summary"],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 30000,
    },
  );
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.error) fail(`${name}: ${result.error.message}`);
  if (result.status !== expectedStatus) {
    fail(`${name}: expected exit ${expectedStatus}, got ${result.status}\n${output}`);
  }
  return output;
}

function validateAdoptionSafety() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-adoption-"));
  try {
    const summary = JSON.stringify(
      { baseline_test_hard: 1, test_hard: 1, test_delta_hard: 0 },
      null,
      2,
    );
    fs.writeFileSync(path.join(tmp, "summary.json"), `${summary}\n`, "utf8");

    const unchangedCandidate = path.join(tmp, "best-unchanged.md");
    fs.writeFileSync(
      unchangedCandidate,
      skillBodyText(path.join(root, "skills/engineering-workflows/drawio-diagrams/SKILL.md")),
      "utf8",
    );
    const unchangedOutput = runAdoptionPreview(
      "drawio unchanged adoption preview",
      unchangedCandidate,
      0,
    );
    assertIncludes("drawio unchanged adoption preview", unchangedOutput, "Safety checks: pass");

    const secretCandidate = path.join(tmp, "best-secret.md");
    const fakeToken = `sk-test${"0".repeat(24)}`;
    fs.writeFileSync(
      secretCandidate,
      `# drawio-diagrams\n\n## Goal\n\nProbe adoption safety.\n\n## Safety rules\n\nNever expose secrets.\n\nExample token: ${fakeToken}\n`,
      "utf8",
    );
    const secretOutput = runAdoptionPreview("secret adoption preview", secretCandidate, 1);
    assertIncludes(
      "secret adoption preview",
      secretOutput,
      "candidate contains a secret-like string",
    );

    const paddedCandidate = path.join(tmp, "best-padded-base64.md");
    const paddedPayload = Buffer.from(
      Array.from({ length: 61 }, (_, index) => (index * 37) % 256),
    ).toString("base64");
    if (!paddedPayload.endsWith("=")) fail("padded Base64 regression fixture is not padded");
    fs.writeFileSync(
      paddedCandidate,
      `# drawio-diagrams\n\n## Goal\n\nProbe padded payload safety.\n\n## Safety rules\n\nNever expose secrets.\n\nEncoded payload: ${paddedPayload}\n`,
      "utf8",
    );
    const paddedOutput = runAdoptionPreview("padded Base64 adoption preview", paddedCandidate, 1);
    assertIncludes(
      "padded Base64 adoption preview",
      paddedOutput,
      "candidate contains a secret-like string",
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function validateNoPrivatePayload() {
  const forbidden = ["sk-tek", "codex-oauth", "agent-system.svc", "refresh_token"];
  const forbiddenPatterns = [
    {
      label: "private Unix home path",
      pattern: /\/home\/[A-Za-z0-9._-]+(?:\/|$)/,
    },
  ];
  const roots = [skillRoot, path.join(root, "skill-evals/skillopt-setup")];
  const files = [];
  for (const dir of roots) {
    files.push(...walk(dir));
  }
  for (const file of files) {
    const rel = path.relative(root, file);
    const text = fs.readFileSync(file, "utf8");
    for (const needle of forbidden) {
      assertNotIncludes(rel, text, needle);
    }
    for (const { pattern, label } of forbiddenPatterns) {
      assertNotMatches(rel, text, pattern, label);
    }
  }
}

function requestJson(port, method, requestPath, payload = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const body =
      payload === null ? null : typeof payload === "string" ? payload : JSON.stringify(payload);
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        method,
        path: requestPath,
        headers: {
          ...extraHeaders,
          ...(body
            ? {
                "content-type": "application/json",
                "content-length": Buffer.byteLength(body),
              }
            : {}),
        },
        timeout: 5000,
      },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          text += chunk;
        });
        res.on("end", () => {
          let parsed = null;
          try {
            parsed = text ? JSON.parse(text) : null;
          } catch {
            parsed = { raw: text };
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      },
    );
    req.on("timeout", () => {
      req.destroy(new Error(`${method} ${requestPath} timed out`));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function waitForGateway(port, child) {
  let lastError = null;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`gateway exited before readiness with code ${child.exitCode}`);
    }
    try {
      const health = await requestJson(port, "GET", "/healthz");
      if (health.status === 200) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`gateway did not become ready: ${lastError?.message || "timeout"}`);
}

async function waitForFile(file, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(file)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  fail(`timed out waiting for ${file}`);
}

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    throw error;
  }
}

async function waitForProcessExit(pid, timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!processIsAlive(pid)) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return !processIsAlive(pid);
}

async function validateGatewaySmoke() {
  const gateway = path.join(skillRoot, "scripts/codex-local-openai-chat-gateway.mjs");
  assertFile(gateway);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-gateway-smoke-"));
  const fakeCodex = path.join(tempDir, "fake-codex.mjs");
  const configPath = path.join(tempDir, "gateway-config.json");
  const workspace = path.join(tempDir, "workspace");
  const sharedWorkspace = path.join(tempDir, "shared-workspace");
  const authHeaders = { authorization: "Bearer smoke-token" };
  fs.mkdirSync(workspace, { recursive: true });
  fs.mkdirSync(sharedWorkspace, { recursive: true });
  fs.writeFileSync(
    fakeCodex,
    `#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
let stdin = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  stdin += chunk;
});
process.stdin.on("end", () => {
  fs.writeFileSync(
    path.join(process.cwd(), "invocation.json"),
    JSON.stringify({ args: process.argv.slice(2), environment_keys: Object.keys(process.env).sort() }),
    "utf8",
  );
  if (stdin.includes("SPAWN_CHILD_SUCCESS")) {
    const helper = spawn(
      process.execPath,
      ["-e", "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000);"],
      { stdio: "inherit" },
    );
    fs.writeFileSync(path.join(process.cwd(), "success-child.pid"), String(helper.pid), "utf8");
    const successOutputIndex = process.argv.indexOf("--output-last-message");
    if (successOutputIndex !== -1) {
      fs.writeFileSync(process.argv[successOutputIndex + 1], "SUCCESS_TREE_REAPED\\n", "utf8");
    }
    process.stdout.write(JSON.stringify({ type: "turn.completed", usage: { input_tokens: 1, output_tokens: 1 } }) + "\\n");
    setTimeout(() => process.exit(0), 20);
    return;
  }
  if (stdin.includes("SPAWN_CHILD_IGNORE_SIGTERM")) {
    const label = stdin.includes("CLIENT_ABORT") ? "abort" : "timeout";
    const helper = spawn(
      process.execPath,
      ["-e", "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000);"],
      { stdio: "ignore" },
    );
    fs.writeFileSync(path.join(process.cwd(), label + "-child.pid"), String(helper.pid), "utf8");
    fs.writeFileSync(path.join(process.cwd(), label + "-parent.pid"), String(process.pid), "utf8");
    process.on("SIGTERM", () => {});
    setInterval(() => {}, 1000);
    return;
  }
  if (stdin.includes("IGNORE_SIGTERM")) {
    process.on("SIGTERM", () => {});
    setInterval(() => {}, 1000);
    return;
  }
	  const outputIndex = process.argv.indexOf("--output-last-message");
	  if (outputIndex !== -1) fs.writeFileSync(process.argv[outputIndex + 1], "SKILLOPT_ENDPOINT_READY\\n", "utf8");
	  if (stdin.includes("SPLIT_JSON_USAGE")) {
	    process.stdout.write('{"type":"turn.completed","usage":');
	    setTimeout(() => {
	      process.stdout.write('{"input_tokens":7,"output_tokens":5}}\\n');
	    }, 5);
	    return;
	  }
	  process.stdout.write(JSON.stringify({ type: "turn.completed", usage: { input_tokens: 3, output_tokens: 2 } }) + "\\n");
	});
	`,
    "utf8",
  );
  fs.chmodSync(fakeCodex, 0o755);
  const port = 15100 + Math.floor(Math.random() * 1000);
  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        server: { host: "127.0.0.1", port, request_body_limit_bytes: 256 },
        codex: {
          binary: fakeCodex,
          include_usage: true,
          default_timeout_seconds: 2,
          max_timeout_seconds: 2,
          kill_grace_seconds: 1,
        },
        workspaces: {
          default: { path: workspace, allow_write: false },
          shared: { path: sharedWorkspace, allow_write: false },
        },
        models: {
          codex: {
            codex_model: "fake-codex",
            workspace: "default",
            sandbox: "read-only",
          },
          "codex-shared": {
            codex_model: "fake-codex",
            workspace: "default",
            allowed_workspaces: ["shared"],
            sandbox: "read-only",
          },
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  const child = spawn(process.execPath, [gateway, "--config", configPath], {
    cwd: root,
    env: {
      ...process.env,
      CODEX_OPENAI_GATEWAY_KEY: "smoke-token",
      SKILLOPT_SENTINEL_SECRET: "must-not-reach-gateway-child",
    },
    stdio: ["ignore", "ignore", "pipe"],
  });
  let stderr = "";
  let cleanupError = null;
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });

  try {
    await waitForGateway(port, child);
    const healthAlias = await requestJson(port, "GET", "/v1/healthz");
    if (healthAlias.status !== 200) {
      fail(
        `gateway smoke /v1/healthz failed: ${healthAlias.status} ${JSON.stringify(healthAlias.body)}`,
      );
    }
    const unauthenticatedModels = await requestJson(port, "GET", "/v1/models");
    if (unauthenticatedModels.status !== 401) {
      fail(
        `gateway smoke unauthenticated models expected 401, got ${unauthenticatedModels.status}`,
      );
    }
    const models = await requestJson(port, "GET", "/v1/models", null, authHeaders);
    if (models.status !== 200 || models.body?.data?.[0]?.id !== "codex") {
      fail(`gateway smoke models failed: ${models.status} ${JSON.stringify(models.body)}`);
    }
    const chat = await requestJson(
      port,
      "POST",
      "/v1/chat/completions",
      {
        model: "codex",
        messages: [{ role: "user", content: "Say SKILLOPT_ENDPOINT_READY." }],
      },
      authHeaders,
    );
    const content = chat.body?.choices?.[0]?.message?.content || "";
    if (chat.status !== 200 || !content.includes("SKILLOPT_ENDPOINT_READY")) {
      fail(`gateway smoke chat failed: ${chat.status} ${JSON.stringify(chat.body)}`);
    }
    const invocation = JSON.parse(fs.readFileSync(path.join(workspace, "invocation.json"), "utf8"));
    for (const expected of [
      "--strict-config",
      'default_permissions="codex_gateway_text"',
      "permissions.codex_gateway_text.network.enabled=false",
      'shell_environment_policy.inherit="none"',
    ]) {
      if (!invocation.args.some((arg) => arg.includes(expected))) {
        fail(`gateway Codex invocation omitted isolation argument ${expected}`);
      }
    }
    const gatewayFilesystem = invocation.args.find((arg) =>
      arg.startsWith("permissions.codex_gateway_text.filesystem="),
    );
    if (
      !gatewayFilesystem?.includes('":minimal"="read"') ||
      !gatewayFilesystem?.includes('":workspace_roots"={"."="deny"}')
    ) {
      fail(`gateway Codex invocation did not deny workspace reads: ${gatewayFilesystem}`);
    }
    if (invocation.args.includes("--sandbox")) {
      fail("gateway Codex invocation retained a host-readable legacy sandbox");
    }
    if (invocation.environment_keys.includes("SKILLOPT_SENTINEL_SECRET")) {
      fail("gateway Codex child inherited an unrelated server secret");
    }
    const deniedWorkspace = await requestJson(
      port,
      "POST",
      "/v1/chat/completions",
      {
        model: "codex",
        metadata: { codex: { workspace: "shared" } },
        messages: [{ role: "user", content: "hello" }],
      },
      authHeaders,
    );
    if (deniedWorkspace.status !== 400) {
      fail(`gateway smoke workspace override expected 400, got ${deniedWorkspace.status}`);
    }
    const deniedProfile = await requestJson(
      port,
      "POST",
      "/v1/chat/completions",
      {
        model: "codex",
        metadata: { codex: { profile: "host-profile" } },
        messages: [{ role: "user", content: "hello" }],
      },
      authHeaders,
    );
    if (
      deniedProfile.status !== 400 ||
      deniedProfile.body?.error?.code !== "unsupported_metadata"
    ) {
      fail(
        `gateway smoke profile override expected unsupported_metadata, got ${JSON.stringify(deniedProfile)}`,
      );
    }
    const allowedWorkspace = await requestJson(
      port,
      "POST",
      "/v1/chat/completions",
      {
        model: "codex-shared",
        metadata: { codex: { workspace: "shared" } },
        messages: [{ role: "user", content: "hello" }],
      },
      authHeaders,
    );
    if (allowedWorkspace.status !== 200) {
      fail(`gateway smoke allowlisted workspace expected 200, got ${allowedWorkspace.status}`);
    }
    const splitJsonUsage = await requestJson(
      port,
      "POST",
      "/v1/chat/completions",
      {
        model: "codex",
        messages: [{ role: "user", content: "SPLIT_JSON_USAGE" }],
      },
      authHeaders,
    );
    if (splitJsonUsage.body?.usage?.total_tokens !== 12) {
      fail(
        `gateway smoke split JSONL usage expected 12 total tokens, got ${JSON.stringify(splitJsonUsage.body?.usage)}`,
      );
    }
    const successfulTreeStarted = Date.now();
    const successfulTree = await requestJson(
      port,
      "POST",
      "/v1/chat/completions",
      {
        model: "codex",
        messages: [{ role: "user", content: "SPAWN_CHILD_SUCCESS" }],
      },
      authHeaders,
    );
    if (
      successfulTree.status !== 200 ||
      !successfulTree.body?.choices?.[0]?.message?.content?.includes("SUCCESS_TREE_REAPED")
    ) {
      fail(`gateway successful process-tree smoke failed: ${JSON.stringify(successfulTree)}`);
    }
    if (Date.now() - successfulTreeStarted > 4_000) {
      fail("gateway successful process-tree cleanup waited for an inherited helper pipe timeout");
    }
    const successChildPidFile = path.join(workspace, "success-child.pid");
    await waitForFile(successChildPidFile);
    const successChildPid = Number(fs.readFileSync(successChildPidFile, "utf8"));
    if (!Number.isInteger(successChildPid) || !(await waitForProcessExit(successChildPid))) {
      fail(`gateway successful request left descendant process ${successChildPid} alive`);
    }
    const invalidCwd = await requestJson(
      port,
      "POST",
      "/v1/chat/completions",
      {
        model: "codex",
        metadata: { codex: { cwd_subdir: "missing" } },
        messages: [{ role: "user", content: "hello" }],
      },
      authHeaders,
    );
    if (invalidCwd.status !== 400) {
      fail(`gateway smoke cwd_subdir expected 400, got ${invalidCwd.status}`);
    }
    const tooLarge = await requestJson(
      port,
      "POST",
      "/v1/chat/completions",
      JSON.stringify({
        model: "codex",
        messages: [{ role: "user", content: "x".repeat(512) }],
      }),
      authHeaders,
    );
    if (tooLarge.status !== 413) {
      fail(`gateway smoke body limit expected 413, got ${tooLarge.status}`);
    }
    const timeout = await requestJson(
      port,
      "POST",
      "/v1/chat/completions",
      {
        model: "codex",
        metadata: { codex: { timeout_seconds: 1 } },
        messages: [{ role: "user", content: "SPAWN_CHILD_IGNORE_SIGTERM" }],
      },
      authHeaders,
    );
    if (timeout.status !== 504) {
      fail(
        `gateway smoke timeout expected 504, got ${timeout.status} ${JSON.stringify(timeout.body)}`,
      );
    }
    const timeoutChildPidFile = path.join(workspace, "timeout-child.pid");
    await waitForFile(timeoutChildPidFile);
    const timeoutChildPid = Number(fs.readFileSync(timeoutChildPidFile, "utf8"));
    if (!Number.isInteger(timeoutChildPid) || !(await waitForProcessExit(timeoutChildPid))) {
      fail(`gateway timeout left descendant process ${timeoutChildPid} alive`);
    }

    const abortBody = JSON.stringify({
      model: "codex",
      messages: [{ role: "user", content: "SPAWN_CHILD_IGNORE_SIGTERM CLIENT_ABORT" }],
    });
    const abortRequest = http.request(
      {
        host: "127.0.0.1",
        port,
        method: "POST",
        path: "/v1/chat/completions",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "content-length": Buffer.byteLength(abortBody),
        },
      },
      (response) => response.resume(),
    );
    abortRequest.on("error", () => {});
    abortRequest.write(abortBody);
    abortRequest.end();
    const abortChildPidFile = path.join(workspace, "abort-child.pid");
    await waitForFile(abortChildPidFile);
    abortRequest.destroy();
    const abortChildPid = Number(fs.readFileSync(abortChildPidFile, "utf8"));
    if (!Number.isInteger(abortChildPid) || !(await waitForProcessExit(abortChildPid))) {
      fail(`gateway client disconnect left descendant process ${abortChildPid} alive`);
    }
    const probeScript = path.join(skillRoot, "scripts/probe-openai-compatible-endpoint.mjs");
    const probe = spawnSync(
      process.execPath,
      [
        probeScript,
        "--base-url",
        `http://127.0.0.1:${port}/v1`,
        "--model",
        "codex",
        "--api-key",
        "smoke-token",
        "--json",
      ],
      { cwd: root, encoding: "utf8", timeout: 10000 },
    );
    if (probe.status !== 0) {
      fail(`endpoint probe smoke failed: ${probe.status}\n${probe.stdout}\n${probe.stderr}`);
    }
    if (probe.stdout.includes("SKILLOPT_ENDPOINT_READY")) {
      fail("endpoint probe JSON leaked raw assistant content");
    }
    const probeResult = JSON.parse(probe.stdout);
    if (!probeResult.ok || probeResult.chat?.payload?.assistant_content_present !== true) {
      fail(`endpoint probe smoke returned unexpected JSON: ${probe.stdout}`);
    }
  } finally {
    for (const name of [
      "success-child.pid",
      "timeout-child.pid",
      "timeout-parent.pid",
      "abort-child.pid",
      "abort-parent.pid",
    ]) {
      const pidFile = path.join(workspace, name);
      if (!fs.existsSync(pidFile)) continue;
      const pid = Number(fs.readFileSync(pidFile, "utf8"));
      if (!Number.isInteger(pid)) continue;
      try {
        process.kill(pid, "SIGKILL");
      } catch (error) {
        if (error?.code !== "ESRCH" && cleanupError === null) cleanupError = error;
      }
    }
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await new Promise((resolve) => child.once("exit", resolve));
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  if (cleanupError) throw cleanupError;

  if (/sk-[A-Za-z0-9_-]{8,}/.test(stderr)) {
    fail("gateway smoke leaked a secret-like token to stderr");
  }
}

async function validateEndpointProbeRedaction() {
  const probeScript = path.join(skillRoot, "scripts/probe-openai-compatible-endpoint.mjs");
  const urlSecrets = [
    "url-user-secret",
    "url-password-secret",
    "query-secret",
    "signature-secret",
    "fragment-secret",
  ];
  const unsafeUrl =
    "http://url-user-secret:url-password-secret@127.0.0.1:1/v1" +
    "?api_key=query-secret&X-Amz-Signature=signature-secret#fragment-secret";
  const unsafeResult = spawnSync(
    process.execPath,
    [
      probeScript,
      "--base-url",
      unsafeUrl,
      "--model",
      "probe-model",
      "--timeout-ms",
      "1000",
      "--json",
    ],
    { cwd: root, encoding: "utf8", timeout: 5000 },
  );
  const unsafeOutput = `${unsafeResult.stdout}${unsafeResult.stderr}`;
  if (unsafeResult.status !== 1) {
    fail(`endpoint probe unsafe-URL smoke exited ${unsafeResult.status}`);
  }
  for (const secret of urlSecrets) {
    assertNotIncludes("endpoint probe unsafe URL", unsafeOutput, secret);
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-endpoint-redaction-"));
  const serverScript = path.join(tempDir, "echo-server.mjs");
  const readyFile = path.join(tempDir, "ready");
  const apiKey = "probe-bearer-secret-value";
  const responseSecret = "provider-response-secret-value";
  writeFile(
    serverScript,
    `import fs from "node:fs";
import http from "node:http";
const server = http.createServer((request, response) => {
  response.writeHead(500, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: {
    type: "provider_error",
    code: "echo_error",
    message: "authorization=" + request.headers.authorization + " response=${responseSecret}",
  }}));
});
server.listen(${15150 + Math.floor(Math.random() * 1000)}, "127.0.0.1", () => {
  fs.writeFileSync(${JSON.stringify(readyFile)}, String(server.address().port));
});
`,
  );
  const server = spawn(process.execPath, [serverScript], {
    cwd: tempDir,
    stdio: ["ignore", "ignore", "pipe"],
  });
  let stderr = "";
  server.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });
  try {
    await waitForFile(readyFile);
    const port = Number(fs.readFileSync(readyFile, "utf8"));
    const echoResult = spawnSync(
      process.execPath,
      [
        probeScript,
        "--base-url",
        `http://127.0.0.1:${port}/v1?token=${responseSecret}`,
        "--api-key",
        apiKey,
        "--model",
        "probe-model",
        "--timeout-ms",
        "2000",
        "--json",
      ],
      { cwd: root, encoding: "utf8", timeout: 5000 },
    );
    const echoOutput = `${echoResult.stdout}${echoResult.stderr}`;
    if (echoResult.status !== 1) {
      fail(`endpoint probe provider-error smoke exited ${echoResult.status}: ${echoOutput}`);
    }
    for (const secret of [apiKey, responseSecret]) {
      assertNotIncludes("endpoint probe provider error", echoOutput, secret);
    }
    assertIncludes("endpoint probe provider error", echoOutput, "[redacted]");
  } finally {
    if (server.exitCode === null) {
      server.kill("SIGTERM");
      await new Promise((resolve) => server.once("close", resolve));
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  if (stderr) fail(`endpoint probe redaction server failed: ${stderr}`);
}

function validateGatewayConfigHardening() {
  const gateway = path.join(skillRoot, "scripts/codex-local-openai-chat-gateway.mjs");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-gateway-config-"));
  try {
    const missingValue = spawnSync(process.execPath, [gateway, "--config"], {
      cwd: root,
      encoding: "utf8",
      timeout: 10000,
    });
    if (
      missingValue.status !== 2 ||
      !`${missingValue.stdout}${missingValue.stderr}`.includes("--config requires a value")
    ) {
      fail("gateway config hardening did not reject missing --config value");
    }

    const protoConfig = path.join(tempDir, "proto.json");
    fs.writeFileSync(
      protoConfig,
      '{"__proto__":{"polluted":true},"auth":{"enabled":false}}\n',
      "utf8",
    );
    const protoResult = spawnSync(process.execPath, [gateway, "--config", protoConfig], {
      cwd: root,
      encoding: "utf8",
      timeout: 10000,
    });
    if (
      protoResult.status !== 2 ||
      !`${protoResult.stdout}${protoResult.stderr}`.includes("Unsupported config key: __proto__")
    ) {
      fail("gateway config hardening did not reject prototype pollution keys");
    }

    const yamlProtoConfig = path.join(tempDir, "proto.yaml");
    fs.writeFileSync(
      yamlProtoConfig,
      "__proto__:\n  polluted: true\nauth:\n  enabled: false\n",
      "utf8",
    );
    const yamlProtoResult = spawnSync(process.execPath, [gateway, "--config", yamlProtoConfig], {
      cwd: root,
      encoding: "utf8",
      timeout: 10000,
    });
    if (
      yamlProtoResult.status !== 2 ||
      !`${yamlProtoResult.stdout}${yamlProtoResult.stderr}`.includes(
        "Unsupported config key: __proto__",
      )
    ) {
      fail("gateway YAML parser accepted a prototype pollution key");
    }

    const numericConfig = path.join(tempDir, "numeric.json");
    fs.writeFileSync(
      numericConfig,
      JSON.stringify({
        server: { host: "127.0.0.1", port: 15090 },
        auth: { enabled: false },
        codex: { max_queue_length: -1 },
      }),
      "utf8",
    );
    const numericResult = spawnSync(process.execPath, [gateway, "--config", numericConfig], {
      cwd: root,
      encoding: "utf8",
      timeout: 10000,
    });
    if (
      numericResult.status !== 2 ||
      !`${numericResult.stdout}${numericResult.stderr}`.includes(
        "codex.max_queue_length must be a non-negative integer",
      )
    ) {
      fail("gateway config hardening did not reject invalid numeric limits");
    }

    const quotedBooleanConfig = path.join(tempDir, "quoted-boolean.json");
    fs.writeFileSync(
      quotedBooleanConfig,
      JSON.stringify({
        server: { host: "127.0.0.1", port: 15092 },
        auth: { enabled: false },
        workspaces: { default: { path: tempDir, allow_write: "false" } },
      }),
      "utf8",
    );
    const quotedBooleanResult = spawnSync(
      process.execPath,
      [gateway, "--config", quotedBooleanConfig],
      { cwd: root, encoding: "utf8", timeout: 10000 },
    );
    if (
      quotedBooleanResult.status !== 2 ||
      !`${quotedBooleanResult.stdout}${quotedBooleanResult.stderr}`.includes(
        "workspaces.default.allow_write must be a boolean",
      )
    ) {
      fail("gateway config hardening accepted quoted false as a truthy write authorization");
    }

    const writableWorkspaceConfig = path.join(tempDir, "writable-workspace.json");
    fs.writeFileSync(
      writableWorkspaceConfig,
      JSON.stringify({
        server: { host: "127.0.0.1", port: 15093 },
        auth: { enabled: false },
        workspaces: { default: { path: tempDir, allow_write: true } },
      }),
      "utf8",
    );
    const writableWorkspaceResult = spawnSync(
      process.execPath,
      [gateway, "--config", writableWorkspaceConfig],
      { cwd: root, encoding: "utf8", timeout: 10000 },
    );
    if (
      writableWorkspaceResult.status !== 2 ||
      !`${writableWorkspaceResult.stdout}${writableWorkspaceResult.stderr}`.includes(
        "allow_write=true is unsupported",
      )
    ) {
      fail("gateway config hardening accepted a writable workspace without OS isolation");
    }

    const workspaceWriteModelConfig = path.join(tempDir, "workspace-write-model.json");
    fs.writeFileSync(
      workspaceWriteModelConfig,
      JSON.stringify({
        server: { host: "127.0.0.1", port: 15094 },
        auth: { enabled: false },
        workspaces: { default: { path: tempDir, allow_write: false } },
        models: {
          codex: {
            codex_model: "test",
            workspace: "default",
            sandbox: "workspace-write",
          },
        },
      }),
      "utf8",
    );
    const workspaceWriteModelResult = spawnSync(
      process.execPath,
      [gateway, "--config", workspaceWriteModelConfig],
      { cwd: root, encoding: "utf8", timeout: 10000 },
    );
    if (
      workspaceWriteModelResult.status !== 2 ||
      !`${workspaceWriteModelResult.stdout}${workspaceWriteModelResult.stderr}`.includes(
        "uses workspace-write",
      )
    ) {
      fail("gateway config hardening accepted a workspace-write model without OS isolation");
    }

    for (const [name, codex, expected] of [
      [
        "user-config",
        { ignore_user_config: false },
        "codex.ignore_user_config=false is unsupported",
      ],
      ["rules", { ignore_rules: false }, "codex.ignore_rules=false is unsupported"],
      ["environment", { inherit_env: true }, "codex.inherit_env=true is unsupported"],
      ["profiles", { allowed_profiles: ["host-profile"] }, "codex.allowed_profiles must be empty"],
    ]) {
      const strictConfig = path.join(tempDir, `strict-${name}.json`);
      fs.writeFileSync(
        strictConfig,
        JSON.stringify({
          server: { host: "127.0.0.1", port: 15095 },
          auth: { enabled: false },
          codex,
        }),
        "utf8",
      );
      const strictResult = spawnSync(process.execPath, [gateway, "--config", strictConfig], {
        cwd: root,
        encoding: "utf8",
        timeout: 10000,
      });
      if (
        strictResult.status !== 2 ||
        !`${strictResult.stdout}${strictResult.stderr}`.includes(expected)
      ) {
        fail(`gateway config hardening accepted insecure ${name} settings`);
      }
    }

    const modelProfileConfig = path.join(tempDir, "model-profile.json");
    fs.writeFileSync(
      modelProfileConfig,
      JSON.stringify({
        server: { host: "127.0.0.1", port: 15096 },
        auth: { enabled: false },
        workspaces: { default: { path: tempDir, allow_write: false } },
        models: {
          codex: {
            codex_model: "test",
            workspace: "default",
            sandbox: "read-only",
            profile: "host-profile",
          },
        },
      }),
      "utf8",
    );
    const modelProfileResult = spawnSync(
      process.execPath,
      [gateway, "--config", modelProfileConfig],
      { cwd: root, encoding: "utf8", timeout: 10000 },
    );
    if (
      modelProfileResult.status !== 2 ||
      !`${modelProfileResult.stdout}${modelProfileResult.stderr}`.includes(
        "profiles are unsupported for the strict gateway",
      )
    ) {
      fail("gateway config hardening accepted a model profile");
    }

    const remoteConfig = path.join(tempDir, "remote.json");
    fs.writeFileSync(
      remoteConfig,
      JSON.stringify({
        server: { host: "0.0.0.0", port: 15091 },
        auth: { enabled: true, bearer_tokens: ["remote-smoke-token"] },
      }),
      "utf8",
    );
    const remoteResult = spawnSync(process.execPath, [gateway, "--config", remoteConfig], {
      cwd: root,
      encoding: "utf8",
      timeout: 10000,
    });
    if (
      remoteResult.status !== 2 ||
      !`${remoteResult.stdout}${remoteResult.stderr}`.includes("Non-loopback bindings are disabled")
    ) {
      fail("gateway config hardening did not reject a non-loopback listener");
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function validateGatewaySpawnFailureRedaction() {
  const gateway = path.join(skillRoot, "scripts/codex-local-openai-chat-gateway.mjs");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-gateway-spawn-"));
  const configPath = path.join(tempDir, "gateway-config.json");
  const workspace = path.join(tempDir, "workspace");
  const missingBinary = path.join(tempDir, "missing-codex-binary");
  const authHeaders = { authorization: "Bearer spawn-token" };
  fs.mkdirSync(workspace, { recursive: true });
  const port = 16100 + Math.floor(Math.random() * 1000);
  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        server: { host: "127.0.0.1", port, request_body_limit_bytes: 1024 },
        codex: { binary: missingBinary },
        workspaces: { default: { path: workspace, allow_write: false } },
        models: {
          codex: {
            codex_model: "fake-codex",
            workspace: "default",
            sandbox: "read-only",
          },
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  const child = spawn(process.execPath, [gateway, "--config", configPath], {
    cwd: root,
    env: { ...process.env, CODEX_GATEWAY_API_KEY: "spawn-token" },
    stdio: ["ignore", "ignore", "pipe"],
  });
  try {
    await waitForGateway(port, child);
    const chat = await requestJson(
      port,
      "POST",
      "/v1/chat/completions",
      {
        model: "codex",
        messages: [{ role: "user", content: "hello" }],
      },
      authHeaders,
    );
    const bodyText = JSON.stringify(chat.body);
    if (chat.status !== 500 || chat.body?.error?.message !== "Codex process failed") {
      fail(`gateway spawn failure expected generic 500, got ${chat.status} ${bodyText}`);
    }
    if (bodyText.includes(missingBinary) || bodyText.includes(tempDir)) {
      fail("gateway spawn failure leaked a local binary path to the client");
    }
    const streamFailure = await requestJson(
      port,
      "POST",
      "/v1/chat/completions",
      {
        model: "codex",
        stream: true,
        messages: [{ role: "user", content: "hello" }],
      },
      authHeaders,
    );
    const streamFailureText = JSON.stringify(streamFailure.body);
    if (
      streamFailure.status !== 500 ||
      streamFailure.body?.error?.message !== "Codex process failed"
    ) {
      fail(
        `gateway streaming spawn failure expected generic 500 before SSE starts, got ${streamFailure.status} ${streamFailureText}`,
      );
    }
    if (
      streamFailureText.includes("chat.completion.chunk") ||
      streamFailureText.includes(missingBinary)
    ) {
      fail("gateway streaming spawn failure leaked SSE success chunks or local paths");
    }
  } finally {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await new Promise((resolve) => child.once("exit", resolve));
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function validateGatewayEarlyExitStdinSafety() {
  const gateway = path.join(skillRoot, "scripts/codex-local-openai-chat-gateway.mjs");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-gateway-epipe-"));
  const fastExit = path.join(tempDir, "fast-exit.mjs");
  const configPath = path.join(tempDir, "gateway-config.json");
  const workspace = path.join(tempDir, "workspace");
  const authHeaders = { authorization: "Bearer epipe-token" };
  fs.mkdirSync(workspace, { recursive: true });
  writeFile(fastExit, "#!/usr/bin/env node\nprocess.exit(0);\n");
  fs.chmodSync(fastExit, 0o755);
  const port = 17100 + Math.floor(Math.random() * 1000);
  writeFile(
    configPath,
    `${JSON.stringify(
      {
        server: {
          host: "127.0.0.1",
          port,
          request_body_limit_bytes: 512 * 1024,
        },
        codex: {
          binary: fastExit,
          default_timeout_seconds: 3,
          max_timeout_seconds: 3,
        },
        workspaces: { default: { path: workspace, allow_write: false } },
        models: {
          codex: {
            codex_model: "fast-exit",
            workspace: "default",
            sandbox: "read-only",
          },
        },
      },
      null,
      2,
    )}\n`,
  );

  const child = spawn(process.execPath, [gateway, "--config", configPath], {
    cwd: root,
    env: { ...process.env, CODEX_GATEWAY_API_KEY: "epipe-token" },
    stdio: ["ignore", "ignore", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });
  try {
    await waitForGateway(port, child);
    const response = await requestJson(
      port,
      "POST",
      "/v1/chat/completions",
      {
        model: "codex",
        messages: [{ role: "user", content: "x".repeat(190_000) }],
      },
      authHeaders,
    );
    if (![500, 502].includes(response.status)) {
      fail(`gateway early-exit smoke expected a generic 5xx, got ${response.status}`);
    }
    if (child.exitCode !== null) {
      fail(`gateway crashed after a child stdin EPIPE with code ${child.exitCode}: ${stderr}`);
    }
    const health = await requestJson(port, "GET", "/healthz");
    if (health.status !== 200) {
      fail(`gateway was not healthy after a child stdin EPIPE: ${health.status}`);
    }
  } finally {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await new Promise((resolve) => child.once("exit", resolve));
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function validateStaleAdapterManifestBlocksTraining() {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-stale-manifest-"));
  const skillName = "stale-skill";
  const installedAdapter = ".agents/tools/SkillOpt/skillopt/envs/agent_skills/adapter.py";
  const installedReflector =
    ".agents/tools/SkillOpt/skillopt/envs/agent_skills/codex_cli_reflector.py";
  const installedEvaluator = ".agents/tools/SkillOpt/skillopt/envs/agent_skills/evaluator.py";
  const sourceTemplate = "templates/adapter.py";
  try {
    writeFile(path.join(tempRepo, "package.json"), "{}\n");
    writeFile(path.join(tempRepo, "AGENTS.md"), "# Agent Instructions\n");
    writeFile(path.join(tempRepo, ".gitignore"), ".agents/\n");
    writeFile(
      path.join(tempRepo, "incubator/skills", skillName, "SKILL.md"),
      `---
name: ${skillName}
description: Temporary skill used only by the SkillOpt validator.
---

# Stale Skill
`,
    );
    writeFile(
      path.join(tempRepo, "skill-evals", skillName, "cases/example.md"),
      `# Example

## Should Trigger

Yes.

## Prompt

Prepare SkillOpt.

## Deterministic Assertions

- contains: SkillOpt
`,
    );

    const adapterText = "# adapter template\n";
    writeFile(path.join(tempRepo, sourceTemplate), adapterText);
    writeFile(path.join(tempRepo, installedAdapter), adapterText);
    writeFile(path.join(tempRepo, installedReflector), "# codex-cli local truncation\n");
    writeFile(path.join(tempRepo, installedEvaluator), "# evaluator\n");
    fs.mkdirSync(path.join(tempRepo, ".agents/tools/SkillOpt/.venv"), {
      recursive: true,
    });

    const configSource = fs
      .readFileSync(path.join(assetRoot, "config.codex-cli-all.yaml"), "utf8")
      .replaceAll("<skill>", skillName)
      .replaceAll("<run-name>", "run-001")
      .replaceAll("<run-profile>", "exploratory");
    writeFile(
      path.join(
        tempRepo,
        ".agents/skillopt-work",
        skillName,
        "configs/agent-skills.codex-cli-all.yaml",
      ),
      configSource,
    );

    writeFile(
      path.join(tempRepo, ".agents/skillopt-work", skillName, "adapter-manifest.json"),
      `${JSON.stringify(
        {
          registry_patch: { status: "ready" },
          installed_files: [installedAdapter, installedReflector, installedEvaluator],
          template_sources: {
            [installedAdapter]: { source: sourceTemplate },
          },
        },
        null,
        2,
      )}\n`,
    );

    const readiness = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/check-skillopt-readiness.mjs"),
        "--skill",
        skillName,
        "--mode",
        "codex-cli-all",
        "--run-profile",
        "exploratory",
        "--strict-training-ready",
        "--no-codex-probe",
        "--json",
      ],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    if (readiness.status === 0) {
      fail("stale adapter manifest strict readiness unexpectedly passed");
    }
    const parsed = JSON.parse(readiness.stdout);
    if (parsed.adapterManifestCheck?.status !== "refresh_required") {
      fail(
        `stale adapter manifest expected refresh_required, got ${parsed.adapterManifestCheck?.status}`,
      );
    }
    for (const needle of [
      "missing target identity",
      "missing mode identity",
      "missing run profile identity",
    ]) {
      if (!parsed.adapterManifestCheck.warnings.some((warning) => warning.includes(needle))) {
        fail(`stale adapter manifest did not warn about ${needle}`);
      }
    }
    if (!parsed.trainingBlockers?.includes("adapter manifest/config refresh required")) {
      fail("stale adapter manifest did not block strict training readiness");
    }
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

function validateActiveSplitDataFloor() {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-active-split-floor-"));
  const skillName = "active-split-skill";
  try {
    writeFile(path.join(tempRepo, "package.json"), "{}\n");
    writeFile(path.join(tempRepo, "AGENTS.md"), "# Agent Instructions\n");
    writeFile(path.join(tempRepo, ".gitignore"), ".agents/\n");
    writeFile(
      path.join(tempRepo, "incubator/skills", skillName, "SKILL.md"),
      `---
name: ${skillName}
description: Temporary skill used only by the SkillOpt validator.
---

# Active Split Skill
`,
    );

    for (let index = 0; index < 25; index += 1) {
      const visualSection =
        index < 10
          ? `
## Visual Assertions

- artifact_exists: *.png
`
          : "";
      writeFile(
        path.join(tempRepo, "skill-evals", skillName, "cases", `case-${index}.md`),
        `# Case ${index}

## Should Trigger

Yes.

## Prompt

Prepare SkillOpt case ${index}.

## Deterministic Assertions

- contains: SkillOpt
${visualSection}`,
      );
    }

    const makeItem = (index, visual = false) => ({
      id: `${skillName}/case-${index}`,
      skill_name: skillName,
      case_path: `skill-evals/${skillName}/cases/case-${index}.md`,
      prompt: `Prepare SkillOpt case ${index}.`,
      deterministic_assertions: ["contains: SkillOpt"],
      visual_assertions: visual ? ["artifact_exists: *.png"] : [],
      expected_behavior: ["uses SkillOpt"],
      rubric_path: null,
      fixtures: [],
      tags: ["positive"],
      should_trigger: true,
      workspace_policy: visual ? "isolated-artifact-write" : "text-only",
      source_hash: `test-source-${index}`,
    });
    const writeItems = (split, items) => {
      writeFile(
        path.join(tempRepo, ".agents/skillopt-work", skillName, "data", split, "items.json"),
        `${JSON.stringify(items, null, 2)}\n`,
      );
    };
    writeItems(
      "train",
      Array.from({ length: 13 }, (_, index) => makeItem(index, index < 5)),
    );
    writeItems(
      "val",
      Array.from({ length: 6 }, (_, index) => makeItem(index + 13, index < 3)),
    );
    writeItems(
      "test",
      Array.from({ length: 6 }, (_, index) => makeItem(index + 19, index < 2)),
    );

    const writeTextOnlyItems = (split, items) => {
      writeFile(
        path.join(
          tempRepo,
          ".agents/skillopt-work",
          skillName,
          "data-text-only",
          split,
          "items.json",
        ),
        `${JSON.stringify(items, null, 2)}\n`,
      );
    };
    writeTextOnlyItems("train", [makeItem(10)]);
    writeTextOnlyItems("val", [makeItem(11)]);
    writeTextOnlyItems("test", [makeItem(12)]);
    writeFile(
      path.join(tempRepo, ".agents/skillopt-work", skillName, "activation/negative-cases.json"),
      "[]\n",
    );

    const configSource = fs
      .readFileSync(path.join(assetRoot, "config.hybrid-codex-target.yaml"), "utf8")
      .replaceAll("<skill>", skillName)
      .replaceAll("<run-name>", "run-001")
      .replaceAll("<run-profile>", "official-parity")
      .replaceAll("<split-dir>", `.agents/skillopt-work/${skillName}/data-text-only`)
      .replaceAll("<visual-eval-policy>", "text-only");
    writeFile(
      path.join(
        tempRepo,
        ".agents/skillopt-work",
        skillName,
        "configs/agent-skills.hybrid-codex-target.yaml",
      ),
      configSource,
    );

    const readiness = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/check-skillopt-readiness.mjs"),
        "--skill",
        skillName,
        "--mode",
        "hybrid-codex-target",
        "--run-profile",
        "official-parity",
        "--no-codex-probe",
        "--json",
      ],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    if (readiness.status !== 0) {
      fail(
        `active split readiness smoke failed unexpectedly: ${readiness.status}\n${readiness.stdout}\n${readiness.stderr}`,
      );
    }
    const parsed = JSON.parse(readiness.stdout);
    if (parsed.benchmarkQuality?.officialFloorMet !== false) {
      fail("active split readiness incorrectly marked official floor as met");
    }
    if (parsed.benchmarkQuality?.activePositiveCases !== 3) {
      fail(
        `active split readiness expected 3 active positives, got ${parsed.benchmarkQuality?.activePositiveCases}`,
      );
    }
    if (!parsed.benchmarkQuality?.splitCounts?.path?.endsWith("/data-text-only")) {
      fail(
        `active split readiness did not score the configured data-text-only split: ${parsed.benchmarkQuality?.splitCounts?.path}`,
      );
    }
    if (!parsed.trainingBlockers?.some((blocker) => blocker.includes("active dataset floor"))) {
      fail("active split readiness did not block official training on active dataset floor");
    }
    for (const needle of [
      "SKILLOPT_OPTIMIZER_MODEL",
      "SKILLOPT_TARGET_MODEL",
      "SKILLOPT_JUDGE_MODEL",
    ]) {
      if (!parsed.trainingBlockers?.some((blocker) => blocker.includes(needle))) {
        fail(`active split readiness did not include model pin blocker ${needle}`);
      }
    }

    const missingSplitConfig = configSource.replaceAll(
      `.agents/skillopt-work/${skillName}/data-text-only`,
      `.agents/skillopt-work/${skillName}/missing-data`,
    );
    writeFile(
      path.join(
        tempRepo,
        ".agents/skillopt-work",
        skillName,
        "configs/agent-skills.hybrid-codex-target.yaml",
      ),
      missingSplitConfig,
    );
    const missingReadiness = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/check-skillopt-readiness.mjs"),
        "--skill",
        skillName,
        "--mode",
        "hybrid-codex-target",
        "--run-profile",
        "official-parity",
        "--no-codex-probe",
        "--json",
      ],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    if (missingReadiness.status !== 0) {
      fail(
        `missing active split readiness smoke failed unexpectedly: ${missingReadiness.status}\n${missingReadiness.stdout}\n${missingReadiness.stderr}`,
      );
    }
    const missingParsed = JSON.parse(missingReadiness.stdout);
    if (missingParsed.benchmarkQuality?.activePositiveCases !== 0) {
      fail(
        `missing active split should score zero active positives, got ${missingParsed.benchmarkQuality?.activePositiveCases}`,
      );
    }
    if (
      !missingParsed.trainingBlockers?.some((blocker) =>
        blocker.includes("configured split_dir is missing"),
      )
    ) {
      fail("missing configured split_dir did not block training readiness");
    }
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

function validateNoneVisualAssertionsIgnored() {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-none-visual-"));
  const skillName = "none-visual-skill";
  try {
    writeFile(path.join(tempRepo, "package.json"), "{}\n");
    writeFile(path.join(tempRepo, ".gitignore"), ".agents/\n");
    writeFile(
      path.join(tempRepo, "incubator/skills", skillName, "SKILL.md"),
      `---
name: ${skillName}
description: Temporary skill used only by the SkillOpt validator.
---

# None Visual Skill
`,
    );
    writeFile(
      path.join(tempRepo, "skill-evals", skillName, "cases/text-only.md"),
      `# Text Only

## Should Trigger

Yes.

## Prompt

Prepare a text-only SkillOpt setup.

## Deterministic Assertions

- contains: SkillOpt

## Visual Assertions

- None.
`,
    );
    writeFile(
      path.join(tempRepo, "skill-evals", skillName, "cases/actual-visual.md"),
      `# Actual Visual

## Should Trigger

Yes.

## Prompt

Prepare a visual SkillOpt setup.

## Deterministic Assertions

- contains: SkillOpt

## Visual Assertions

- artifact_exists: *.png
`,
    );
    const split = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/prepare-skillopt-split.mjs"),
        "--skill",
        skillName,
        "--seed",
        "42",
        "--json",
      ],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    if (split.status !== 0) {
      fail(`none visual split smoke failed: ${split.status}\n${split.stdout}\n${split.stderr}`);
    }
    const metadata = JSON.parse(
      fs.readFileSync(
        path.join(tempRepo, ".agents/skillopt-work", skillName, "dataset-metadata.json"),
        "utf8",
      ),
    );
    if (metadata.positive_with_visual_assertions !== 1) {
      fail(
        `None visual assertion sentinel should not count as visual; got ${metadata.positive_with_visual_assertions}`,
      );
    }
    const textOnlyItems = ["train", "val", "test"].flatMap((splitName) =>
      JSON.parse(
        fs.readFileSync(
          path.join(
            tempRepo,
            ".agents/skillopt-work",
            skillName,
            "data-text-only",
            splitName,
            "items.json",
          ),
          "utf8",
        ),
      ),
    );
    const textOnlyCase = textOnlyItems.find((item) => item.id.endsWith("/text-only"));
    if (!textOnlyCase) {
      fail("None visual assertion sentinel case was incorrectly excluded from data-text-only");
    }
    if (textOnlyCase.visual_assertions.length !== 0) {
      fail(
        `None visual assertion sentinel was persisted as a visual assertion: ${textOnlyCase.visual_assertions.join(", ")}`,
      );
    }
    if (textOnlyCase.workspace_policy !== "text-only") {
      fail(`text-only case advertised unsafe workspace policy ${textOnlyCase.workspace_policy}`);
    }
    const fullItems = ["train", "val", "test"].flatMap((splitName) =>
      JSON.parse(
        fs.readFileSync(
          path.join(tempRepo, ".agents/skillopt-work", skillName, "data", splitName, "items.json"),
          "utf8",
        ),
      ),
    );
    const visualCase = fullItems.find((item) => item.id.endsWith("/actual-visual"));
    if (visualCase?.workspace_policy !== "isolated-artifact-write") {
      fail(`visual case did not declare isolated artifact writes: ${visualCase?.workspace_policy}`);
    }
    if (fullItems.some((item) => item.workspace_policy === "workspace-write")) {
      fail("generated split retained legacy broad workspace-write metadata");
    }
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

function validateTextOnlySplitExistsWithoutVisualAssertions() {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-text-only-no-visual-"));
  const skillName = "no-visual-skill";
  try {
    writeFile(path.join(tempRepo, "package.json"), "{}\n");
    writeFile(path.join(tempRepo, ".gitignore"), ".agents/\n");
    writeFile(
      path.join(tempRepo, "incubator/skills", skillName, "SKILL.md"),
      `---
name: ${skillName}
description: Temporary non-visual skill used only by the SkillOpt validator.
---

# No Visual Skill
`,
    );
    for (let index = 0; index < 4; index += 1) {
      writeFile(
        path.join(tempRepo, "skill-evals", skillName, "cases", `case-${index}.md`),
        `# Case ${index}

## Should Trigger

Yes.

## Prompt

Prepare a non-visual SkillOpt setup.

## Deterministic Assertions

- contains: SkillOpt

## Visual Assertions

- None.
`,
      );
    }

    const split = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/prepare-skillopt-split.mjs"),
        "--skill",
        skillName,
        "--seed",
        "42",
        "--json",
      ],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    if (split.status !== 0) {
      fail(
        `non-visual text-only split smoke failed: ${split.status}\n${split.stdout}\n${split.stderr}`,
      );
    }
    const splitResult = JSON.parse(split.stdout);
    if (splitResult.text_only?.excluded_visual_positive_cases !== 0) {
      fail(
        `non-visual text-only split expected zero excluded visual cases, got ${splitResult.text_only?.excluded_visual_positive_cases}`,
      );
    }
    for (const splitName of ["train", "val", "test"]) {
      assertFile(
        path.join(
          tempRepo,
          ".agents/skillopt-work",
          skillName,
          "data-text-only",
          splitName,
          "items.json",
        ),
      );
    }

    const skillOptPath = path.join(tempRepo, ".agents/tools/SkillOpt");
    writeFile(path.join(skillOptPath, "configs/_base_/default.yaml"), "{}\n");
    const registrySource = [
      "def _register_builtins():",
      "    pass",
      "",
      "",
      "def get_adapter(cfg):",
      "    return None",
      "",
    ].join("\n");
    writeFile(path.join(skillOptPath, "scripts/train.py"), registrySource);
    writeFile(path.join(skillOptPath, "scripts/eval_only.py"), registrySource);
    writeFile(
      path.join(skillOptPath, "skillopt/config.py"),
      [
        "import os",
        "from typing import Any",
        "import yaml",
        "",
        "_STRUCTURED_SECTIONS = frozenset({",
        "})",
        "_ENV_PLACEHOLDER_ALLOWLIST = frozenset()",
        "",
        "# ── YAML loading with _base_ inheritance",
        "def load_config(abs_path):",
        "    with open(abs_path) as f:",
        "        cfg = yaml.safe_load(f) or {}",
        "    return cfg",
        "",
      ].join("\n"),
    );
    writeFile(
      path.join(skillOptPath, "skillopt/engine/trainer.py"),
      [
        "import math",
        "",
        "def _resolve_train_size(cfg, dataloader):",
        "    return 10",
        "",
        "def train(cfg, dataloader):",
        "    num_epochs = 1",
        "    batch_size = 1",
        "    accumulation = 1",
        "        train_size = _resolve_train_size(cfg, dataloader)",
        "        steps_per_epoch = math.ceil(train_size / (batch_size * accumulation))",
        "        batches_per_epoch = steps_per_epoch * accumulation",
        "        total_steps = num_epochs * steps_per_epoch",
        '        print(f"\\n  [config] epochs={num_epochs} steps/epoch={steps_per_epoch} "',
        '              f"(auto) accum={accumulation} batch_size={batch_size}")',
        "        return total_steps, batches_per_epoch",
        "",
      ].join("\n"),
    );

    const adapter = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/prepare-local-skillopt-adapter.mjs"),
        "--skill",
        skillName,
        "--skillopt",
        ".agents/tools/SkillOpt",
        "--mode",
        "hybrid-codex-target",
        "--visual-eval-policy",
        "text-only",
        "--json",
      ],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    if (adapter.status !== 0) {
      fail(
        `non-visual text-only adapter smoke failed: ${adapter.status}\n${adapter.stdout}\n${adapter.stderr}`,
      );
    }
    const manifest = JSON.parse(adapter.stdout);
    if (manifest.visualSplit?.effective_policy !== "text-only") {
      fail(
        `expected explicit text-only policy in manifest, got ${manifest.visualSplit?.effective_policy}`,
      );
    }
    if (!manifest.visualSplit?.text_only?.exists) {
      fail("explicit text-only adapter did not find a generated data-text-only split");
    }
    const configText = fs.readFileSync(
      path.join(
        tempRepo,
        ".agents/skillopt-work",
        skillName,
        "configs/agent-skills.hybrid-codex-target.yaml",
      ),
      "utf8",
    );
    assertIncludes(
      "non-visual text-only generated config",
      configText,
      `.agents/skillopt-work/${skillName}/data-text-only`,
    );
    const patchedConfigText = fs.readFileSync(
      path.join(skillOptPath, "skillopt/config.py"),
      "utf8",
    );
    for (const needle of [
      '"SKILLOPT_OPTIMIZER_MODEL"',
      '"SKILLOPT_TARGET_MODEL"',
      '"SKILLOPT_JUDGE_MODEL"',
      '"SKILLOPT_REFLECTION_MODEL"',
      "def _expand_safe_env_placeholders",
      "cfg = _expand_safe_env_placeholders(cfg)",
    ]) {
      assertIncludes("partial SkillOpt env placeholder patch repair", patchedConfigText, needle);
    }

    writeFile(
      path.join(tempRepo, "skill-evals", skillName, "cases/visual.md"),
      `# Visual Case

## Should Trigger

Yes.

## Prompt

Create a visual result.

## Expected Behavior

- Produce a diagram.

## Deterministic Assertions

- contains: diagram

## Visual Assertions

- artifact_exists: *.png
`,
    );
    const visualSplit = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/prepare-skillopt-split.mjs"),
        "--skill",
        skillName,
        "--seed",
        "42",
        "--json",
      ],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    if (visualSplit.status !== 0) {
      fail(
        `provider auto text-only split preparation failed: ${visualSplit.status}\n${visualSplit.stdout}\n${visualSplit.stderr}`,
      );
    }
    const fakeBin = path.join(tempRepo, "fake-bin");
    writeFile(path.join(fakeBin, "drawio"), "#!/bin/sh\nexit 0\n");
    fs.chmodSync(path.join(fakeBin, "drawio"), 0o755);
    const nativeAuto = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/prepare-local-skillopt-adapter.mjs"),
        "--skill",
        skillName,
        "--skillopt",
        ".agents/tools/SkillOpt",
        "--mode",
        "native-provider",
        "--visual-eval-policy",
        "auto",
        "--json",
      ],
      {
        cwd: tempRepo,
        env: {
          ...process.env,
          PATH: `${fakeBin}${path.delimiter}${process.env.PATH || ""}`,
        },
        encoding: "utf8",
        timeout: 30000,
      },
    );
    if (nativeAuto.status !== 0) {
      fail(
        `native-provider auto split smoke failed: ${nativeAuto.status}\n${nativeAuto.stdout}\n${nativeAuto.stderr}`,
      );
    }
    const nativeManifest = JSON.parse(nativeAuto.stdout);
    if (
      nativeManifest.visualSplit?.effective_policy !== "text-only" ||
      !nativeManifest.visualSplit?.reason?.includes("provider chat targets")
    ) {
      fail(
        `native-provider auto policy selected an artifact split despite drawio availability: ${JSON.stringify(nativeManifest.visualSplit)}`,
      );
    }
    const nativeConfig = fs.readFileSync(
      path.join(
        tempRepo,
        ".agents/skillopt-work",
        skillName,
        "configs/agent-skills.native-provider.yaml",
      ),
      "utf8",
    );
    assertIncludes(
      "native-provider auto generated config",
      nativeConfig,
      `.agents/skillopt-work/${skillName}/data-text-only`,
    );
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

function validateLocalArtifactAudit() {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-artifact-audit-"));
  const skillName = "audit-skill";
  try {
    writeFile(path.join(tempRepo, "package.json"), "{}\n");
    writeFile(path.join(tempRepo, ".gitignore"), ".agents/\n");
    writeFile(
      path.join(tempRepo, ".agents/skills/skillopt-setup/SKILL.md"),
      `---
name: skillopt-setup
description: Installed stale copy used by validator.
---

# SkillOpt Setup
`,
    );
    writeFile(
      path.join(tempRepo, ".agents/tools/SkillOpt/skillopt/envs/agent_skills/rollout.py"),
      "# stale local rollout\n",
    );
    writeFile(
      path.join(tempRepo, ".agents/tools/SkillOpt/configs/agent_skills/codex-cli-all.yaml"),
      "env:\n  name: agent_skills\n",
    );
    writeFile(path.join(tempRepo, "templates/global-rollout.py"), "# stale local rollout\n");
    fs.mkdirSync(path.join(tempRepo, ".agents/tools/SkillOpt/.venv"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(tempRepo, ".agents/tools/SkillOpt/.git"), {
      recursive: true,
    });
    writeFile(
      path.join(tempRepo, ".agents/skillopt-work/_readiness/codex-probe-output.txt"),
      "ignored diagnostic\n",
    );
    writeFile(
      path.join(
        tempRepo,
        ".agents/skillopt-work",
        skillName,
        "configs/agent-skills.codex-cli-all.yaml",
      ),
      "env:\n  name: agent_skills\n",
    );
    writeFile(
      path.join(tempRepo, ".agents/skillopt-work", skillName, "data/train/items.json"),
      "[]\n",
    );
    writeFile(
      path.join(tempRepo, ".agents/skillopt-work", skillName, "outputs/run-001/history.json"),
      "[]\n",
    );
    for (let index = 0; index < 2_050; index += 1) {
      writeFile(
        path.join(
          tempRepo,
          ".agents/skillopt-work",
          skillName,
          "outputs/000-noise",
          `step-${String(index).padStart(4, "0")}.json`,
        ),
        "{}\n",
      );
    }
    writeFile(
      path.join(tempRepo, ".agents/skillopt-work", skillName, "outputs/run-001/summary.json"),
      `${JSON.stringify(
        {
          config: { run_profile: "exploratory" },
          total_steps: 2,
          total_accepts: 1,
          total_rejects: 1,
          baseline_test_hard: 0.75,
          test_hard: 0.5,
          test_delta_hard: -0.25,
        },
        null,
        2,
      )}\n`,
    );
    writeFile(
      path.join(tempRepo, ".agents/skillopt-work", skillName, "adapter-manifest.json"),
      `${JSON.stringify(
        {
          target_skill: skillName,
          mode: "codex-cli-all",
          run_profile: "exploratory",
          registry_patch: { status: "ready" },
          installed_files: [".agents/tools/SkillOpt/skillopt/envs/agent_skills/rollout.py"],
        },
        null,
        2,
      )}\n`,
    );
    writeFile(
      path.join(tempRepo, ".agents/skillopt-work/adapter-manifest.json"),
      `${JSON.stringify(
        {
          target_skill: skillName,
          mode: "codex-cli-all",
          run_profile: "exploratory",
          registry_patch: { status: "ready" },
          installed_files: [".agents/tools/SkillOpt/skillopt/envs/agent_skills/rollout.py"],
          template_sources: {
            ".agents/tools/SkillOpt/skillopt/envs/agent_skills/rollout.py": {
              source: "templates/global-rollout.py",
            },
          },
        },
        null,
        2,
      )}\n`,
    );

    const audit = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/audit-skillopt-local-artifacts.mjs"),
        "--root",
        tempRepo,
        "--skill",
        skillName,
        "--json",
      ],
      { cwd: root, encoding: "utf8", timeout: 30000 },
    );
    if (audit.status !== 0) {
      fail(`local artifact audit smoke failed: ${audit.status}\n${audit.stdout}\n${audit.stderr}`);
    }
    if (audit.stdout.includes(tempRepo)) {
      fail("local artifact audit leaked an absolute temporary path");
    }
    const parsed = JSON.parse(audit.stdout);
    const toolClone = parsed.classifications.find((item) => item.path === ".agents/tools/SkillOpt");
    if (toolClone?.classification !== "local_tooling_do_not_move") {
      fail("local artifact audit did not classify SkillOpt clone as do_not_move");
    }
    const installedCopy = parsed.classifications.find(
      (item) => item.path === ".agents/skills/skillopt-setup",
    );
    if (installedCopy?.classification !== "installed_skill_copy_compare_only") {
      fail("local artifact audit did not classify installed skill copy as comparison-only");
    }
    const workspace = parsed.workspaces.find((item) => item.skill === skillName);
    if (!workspace || workspace.move_action !== "do_not_move_raw_workspace") {
      fail("local artifact audit did not classify generated workspaces as raw local state");
    }
    const globalManifest = parsed.manifests.find(
      (item) => item.path === ".agents/skillopt-work/adapter-manifest.json",
    );
    if (
      globalManifest?.status !== "legacy_compatibility_copy" ||
      globalManifest.target_specific !== false
    ) {
      fail(
        "local artifact audit did not classify a current legacy global manifest as compatibility-only",
      );
    }
    if (!globalManifest.warnings.some((warning) => warning.includes("legacy/global"))) {
      fail("local artifact audit did not warn that the global manifest is legacy");
    }
    if (workspace.run_summaries.regressing_runs !== 1) {
      fail("local artifact audit did not detect the regressing run summary");
    }
    if (workspace.manifest.status !== "refresh_required") {
      fail(
        `local artifact audit expected stale manifest refresh_required, got ${workspace.manifest.status}`,
      );
    }
    if (!parsed.recommendations.some((item) => item.includes("negative held-out test"))) {
      fail("local artifact audit did not recommend blocking negative test-delta adoption");
    }
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

function validateLocalArtifactAuditFreshGlobalCompatibility() {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-artifact-audit-fresh-"));
  const skillName = "fresh-audit-skill";
  const installedAdapter = ".agents/tools/SkillOpt/skillopt/envs/agent_skills/adapter.py";
  const sourceTemplate = "templates/adapter.py";
  try {
    writeFile(path.join(tempRepo, "package.json"), "{}\n");
    writeFile(path.join(tempRepo, ".gitignore"), ".agents/\n");
    writeFile(path.join(tempRepo, sourceTemplate), "# current adapter\n");
    writeFile(path.join(tempRepo, installedAdapter), "# current adapter\n");
    const manifest = {
      target_skill: skillName,
      mode: "codex-cli-all",
      run_profile: "exploratory",
      registry_patch: { status: "ready" },
      installed_files: [installedAdapter],
      template_sources: {
        [installedAdapter]: { source: sourceTemplate },
      },
    };
    writeFile(
      path.join(tempRepo, ".agents/skillopt-work", skillName, "adapter-manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    writeFile(
      path.join(tempRepo, ".agents/skillopt-work/adapter-manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );

    const audit = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/audit-skillopt-local-artifacts.mjs"),
        "--root",
        tempRepo,
        "--skill",
        skillName,
        "--json",
      ],
      { cwd: root, encoding: "utf8", timeout: 30000 },
    );
    if (audit.status !== 0) {
      fail(
        `fresh local artifact audit smoke failed: ${audit.status}\n${audit.stdout}\n${audit.stderr}`,
      );
    }
    const parsed = JSON.parse(audit.stdout);
    const workspace = parsed.workspaces.find((item) => item.skill === skillName);
    if (workspace?.manifest?.status !== "matched") {
      fail(
        `fresh local artifact audit expected target manifest matched, got ${workspace?.manifest?.status}`,
      );
    }
    const globalManifest = parsed.manifests.find(
      (item) => item.path === ".agents/skillopt-work/adapter-manifest.json",
    );
    if (globalManifest?.status !== "legacy_compatibility_copy") {
      fail(
        `fresh local artifact audit expected global manifest compatibility copy, got ${globalManifest?.status}`,
      );
    }
    if (
      parsed.recommendations.some((item) =>
        item.includes("Rerun production setup with reuse/refresh"),
      )
    ) {
      fail(
        "fresh local artifact audit recommended rerunning setup only because a global compatibility manifest exists",
      );
    }
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

function runReadinessJson(tempRepo, skillName, mode, extraArgs = [], env = process.env) {
  const result = spawnSync(
    process.execPath,
    [
      path.join(skillRoot, "scripts/check-skillopt-readiness.mjs"),
      "--skill",
      skillName,
      "--mode",
      mode,
      "--run-profile",
      mode === "codex-cli-all" ? "exploratory" : "official-parity",
      "--no-codex-probe",
      "--json",
      ...extraArgs,
    ],
    { cwd: tempRepo, env, encoding: "utf8", timeout: 30000 },
  );
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    fail(
      `readiness JSON smoke returned invalid JSON: ${result.status}\n${result.stdout}\n${result.stderr}`,
    );
  }
  return { result, parsed };
}

function providerTestEnv(extra = {}) {
  const env = { ...process.env };
  for (const name of Object.keys(env)) {
    if (
      name.includes("OPENAI") ||
      name.includes("ANTHROPIC") ||
      name.includes("MINIMAX") ||
      /^SKILLOPT_(?:OPTIMIZER|TARGET|JUDGE|REFLECTION)_MODEL$/.test(name)
    ) {
      delete env[name];
    }
  }
  return { ...env, ...extra };
}

function validateProviderSpecificReadiness() {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-provider-readiness-"));
  const skillName = "provider-readiness-skill";
  try {
    writeFile(path.join(tempRepo, "package.json"), "{}\n");
    writeFile(path.join(tempRepo, ".gitignore"), ".agents/\n");
    writeFile(
      path.join(tempRepo, "incubator/skills", skillName, "SKILL.md"),
      `---
name: ${skillName}
description: Temporary provider-readiness skill used only by the SkillOpt validator.
---

# Provider Readiness Skill
`,
    );
    writeFile(path.join(tempRepo, "skill-evals", skillName, "README.md"), "# Eval proof\n");
    const config = fs
      .readFileSync(path.join(assetRoot, "config.native-provider.yaml"), "utf8")
      .replaceAll("<skill>", skillName)
      .replaceAll("<run-name>", "run-001")
      .replaceAll("<run-profile>", "official-parity")
      .replaceAll("<split-dir>", `.agents/skillopt-work/${skillName}/data`)
      .replaceAll("<visual-eval-policy>", "text-only");
    writeFile(
      path.join(
        tempRepo,
        ".agents/skillopt-work",
        skillName,
        "configs/agent-skills.native-provider.yaml",
      ),
      config,
    );

    const genericKeyOnly = runReadinessJson(
      tempRepo,
      skillName,
      "native-provider",
      [],
      providerTestEnv({ OPENAI_API_KEY: "generic-key-must-not-authorize" }),
    );
    const roles = genericKeyOnly.parsed.providerReadiness?.roles || [];
    for (const role of ["optimizer", "target"]) {
      const status = roles.find((item) => item.role === role);
      if (
        status?.configured !== false ||
        !status.blockers?.some((blocker) => blocker.includes("openai_chat endpoint is missing"))
      ) {
        fail(`generic OPENAI_API_KEY incorrectly authorized ${role} openai_chat readiness`);
      }
    }

    const endpoint = "http://127.0.0.1:1/v1";
    const apiKey = "dead-endpoint-key-must-not-leak";
    const strict = runReadinessJson(
      tempRepo,
      skillName,
      "native-provider",
      ["--strict-training-ready"],
      providerTestEnv({
        AZURE_OPENAI_ENDPOINT: endpoint,
        AZURE_OPENAI_AUTH_MODE: "openai_compatible",
        AZURE_OPENAI_API_KEY: apiKey,
        SKILLOPT_OPTIMIZER_MODEL: "optimizer-test-model",
        SKILLOPT_TARGET_MODEL: "target-test-model",
      }),
    );
    if (strict.result.status === 0) {
      fail("strict readiness accepted an unreachable OpenAI-compatible endpoint");
    }
    const probes = strict.parsed.providerReadiness?.endpoint_probes || [];
    if (probes.length !== 2 || probes.some((probe) => probe.ok || probe.status !== "failed")) {
      fail(`strict readiness did not record failed endpoint probes: ${JSON.stringify(probes)}`);
    }
    const publicOutput = `${strict.result.stdout}${strict.result.stderr}`;
    if (publicOutput.includes(apiKey) || publicOutput.includes(endpoint)) {
      fail("strict provider readiness leaked an endpoint or API key in diagnostics");
    }

    writeFile(
      path.join(
        tempRepo,
        ".agents/skillopt-work",
        skillName,
        "configs/agent-skills.native-provider.yaml",
      ),
      config.replaceAll("openai_chat", "qwen_chat"),
    );
    const qwenWithoutKey = runReadinessJson(
      tempRepo,
      skillName,
      "native-provider",
      [],
      providerTestEnv({
        QWEN_CHAT_BASE_URL: "https://example.invalid/v1",
        QWEN_CHAT_MODEL: "qwen-test-model",
      }),
    );
    for (const role of ["optimizer", "target"]) {
      const status = qwenWithoutKey.parsed.providerReadiness?.roles?.find(
        (item) => item.role === role,
      );
      if (
        status?.configured !== false ||
        !status.blockers?.some((blocker) => blocker.includes("qwen_chat API key is missing"))
      ) {
        fail(`qwen_chat readiness accepted ${role} without its API key`);
      }
    }

    writeFile(
      path.join(
        tempRepo,
        ".agents/skillopt-work",
        skillName,
        "configs/agent-skills.native-provider.yaml",
      ),
      config.replaceAll("openai_chat", "claude_chat"),
    );
    const claudeCli = runReadinessJson(
      tempRepo,
      skillName,
      "native-provider",
      [],
      providerTestEnv({ ANTHROPIC_API_KEY: "must-not-authorize-local-cli" }),
    );
    for (const role of ["optimizer", "target"]) {
      const status = claudeCli.parsed.providerReadiness?.roles?.find((item) => item.role === role);
      if (
        status?.configured !== false ||
        !status.blockers?.some((blocker) => blocker.includes("local Claude CLI"))
      ) {
        fail(`claude_chat readiness exposed an unisolated local CLI for ${role}`);
      }
    }

    writeFile(
      path.join(
        tempRepo,
        ".agents/skillopt-work",
        skillName,
        "configs/agent-skills.native-provider.yaml",
      ),
      config.replaceAll("openai_chat", "minimax_chat"),
    );
    const minimax = runReadinessJson(
      tempRepo,
      skillName,
      "native-provider",
      [],
      providerTestEnv({
        MINIMAX_BASE_URL: "https://api.example.invalid/v1",
        MINIMAX_API_KEY: "minimax-test-key",
      }),
    );
    const minimaxOptimizer = minimax.parsed.providerReadiness?.roles?.find(
      (item) => item.role === "optimizer",
    );
    const minimaxTarget = minimax.parsed.providerReadiness?.roles?.find(
      (item) => item.role === "target",
    );
    if (
      minimaxOptimizer?.configured !== false ||
      !minimaxOptimizer.blockers?.some((blocker) => blocker.includes("target chat only")) ||
      minimaxTarget?.configured !== true
    ) {
      fail("MiniMax readiness did not enforce its target-only backend contract");
    }

    writeFile(
      path.join(
        tempRepo,
        ".agents/skillopt-work",
        skillName,
        "configs/agent-skills.native-provider.yaml",
      ),
      config.replace("judge_backend: provider", "judge_backend: heuristic"),
    );
    const heuristic = runReadinessJson(
      tempRepo,
      skillName,
      "native-provider",
      [],
      providerTestEnv(),
    );
    if (
      !heuristic.parsed.proofBlockers?.some((blocker) => blocker.includes("semantic judge_backend"))
    ) {
      fail("official-parity readiness accepted literal-substring heuristic judging");
    }
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

function validateGeneratedDataFreshnessAndRunnability() {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-data-freshness-"));
  const skillName = "freshness-skill";
  const skillPath = path.join(tempRepo, "incubator/skills", skillName, "SKILL.md");
  const casesDir = path.join(tempRepo, "skill-evals", skillName, "cases");
  const splitRoot = path.join(tempRepo, ".agents/skillopt-work", skillName, "data");
  const caseText = (index) => `# Case ${index}

## Should Trigger

Yes.

## Prompt

Prepare freshness case ${index}.

## Expected Behavior

- Preserve current proof.

## Deterministic Assertions

- contains: freshness
`;
  const prepare = () => {
    const result = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/prepare-skillopt-split.mjs"),
        "--skill",
        skillName,
        "--seed",
        "42",
        "--json",
      ],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    if (result.status !== 0) {
      fail(
        `freshness split preparation failed: ${result.status}\n${result.stdout}\n${result.stderr}`,
      );
    }
  };
  const readiness = (strict = false) =>
    runReadinessJson(
      tempRepo,
      skillName,
      "codex-cli-all",
      strict ? ["--strict-training-ready"] : [],
      providerTestEnv(),
    );
  try {
    writeFile(path.join(tempRepo, "package.json"), "{}\n");
    writeFile(path.join(tempRepo, ".gitignore"), ".agents/\n");
    const skillText = `---
name: ${skillName}
description: Temporary freshness skill used only by the SkillOpt validator.
---

# Freshness Skill
`;
    writeFile(skillPath, skillText);
    for (let index = 0; index < 8; index += 1) {
      writeFile(path.join(casesDir, `case-${index}.md`), caseText(index));
    }
    prepare();
    const config = fs
      .readFileSync(path.join(assetRoot, "config.codex-cli-all.yaml"), "utf8")
      .replaceAll("<skill>", skillName)
      .replaceAll("<run-name>", "run-001")
      .replaceAll("<run-profile>", "exploratory")
      .replaceAll("<split-dir>", `.agents/skillopt-work/${skillName}/data`)
      .replaceAll("<visual-eval-policy>", "full");
    writeFile(
      path.join(
        tempRepo,
        ".agents/skillopt-work",
        skillName,
        "configs/agent-skills.codex-cli-all.yaml",
      ),
      config,
    );

    if (readiness().parsed.datasetFreshness?.status !== "matched") {
      fail("freshly generated split and initial skill proof did not match source state");
    }

    writeFile(path.join(casesDir, "case-0.md"), `${caseText(0)}\nChanged source.\n`);
    let current = readiness().parsed.datasetFreshness;
    if (
      current?.status !== "refresh_required" ||
      !current.blockers.some((blocker) => blocker.includes("source hash is stale"))
    ) {
      fail("changed eval source hash did not invalidate generated split proof");
    }

    writeFile(path.join(casesDir, "case-0.md"), caseText(0));
    writeFile(path.join(casesDir, "case-added.md"), caseText("added"));
    current = readiness().parsed.datasetFreshness;
    if (!current.blockers.some((blocker) => blocker.includes("missing current positive cases"))) {
      fail("added eval case did not invalidate generated split IDs");
    }
    fs.rmSync(path.join(casesDir, "case-added.md"));
    fs.rmSync(path.join(casesDir, "case-7.md"));
    current = readiness().parsed.datasetFreshness;
    if (!current.blockers.some((blocker) => blocker.includes("stale or unexpected cases"))) {
      fail("removed eval case did not invalidate generated split IDs");
    }
    writeFile(path.join(casesDir, "case-7.md"), caseText(7));
    prepare();

    writeFile(skillPath, `${skillText}\nChanged skill.\n`);
    current = readiness().parsed.datasetFreshness;
    if (!current.blockers.some((blocker) => blocker.includes("initial skill checksum is stale"))) {
      fail("changed SKILL.md did not invalidate the initial skill checksum");
    }
    writeFile(skillPath, skillText);
    prepare();
    writeFile(
      path.join(tempRepo, ".agents/skillopt-work", skillName, "initial/skill-body.md"),
      "tampered body\n",
    );
    current = readiness().parsed.datasetFreshness;
    if (!current.blockers.some((blocker) => blocker.includes("initial skill body is stale"))) {
      fail("tampered initial skill body did not invalidate freshness proof");
    }

    prepare();
    fs.rmSync(path.join(splitRoot, "test/items.json"));
    let strict = readiness(true);
    if (
      strict.result.status === 0 ||
      !strict.parsed.trainingBlockers.some((blocker) => blocker.includes("missing test/items.json"))
    ) {
      fail("strict exploratory readiness accepted a missing test split");
    }

    prepare();
    writeFile(path.join(splitRoot, "val/items.json"), "{not-json}\n");
    strict = readiness(true);
    if (
      strict.result.status === 0 ||
      !strict.parsed.trainingBlockers.some((blocker) =>
        blocker.includes("val/items.json is not a JSON array"),
      )
    ) {
      fail("strict exploratory readiness accepted a malformed validation split");
    }

    prepare();
    for (const name of ["train", "val", "test"]) {
      writeFile(path.join(splitRoot, name, "items.json"), "[]\n");
    }
    strict = readiness(true);
    if (
      strict.result.status === 0 ||
      !strict.parsed.trainingBlockers.includes("active split needs at least one training case")
    ) {
      fail("strict exploratory readiness accepted an empty active split");
    }

    prepare();
    const splitWithItem = ["train", "val", "test"].find((name) => {
      const items = JSON.parse(fs.readFileSync(path.join(splitRoot, name, "items.json"), "utf8"));
      return items.length > 0;
    });
    const itemPath = path.join(splitRoot, splitWithItem, "items.json");
    const items = JSON.parse(fs.readFileSync(itemPath, "utf8"));
    delete items[0].prompt;
    writeFile(itemPath, `${JSON.stringify(items, null, 2)}\n`);
    strict = readiness(true);
    if (
      strict.result.status === 0 ||
      !strict.parsed.trainingBlockers.some((blocker) => blocker.includes("missing required fields"))
    ) {
      fail("strict exploratory readiness accepted an item with missing required fields");
    }
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

function validateLiveAdapterPatchProof() {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-live-patch-"));
  const skillName = "live-patch-skill";
  const clone = path.join(tempRepo, ".agents/tools/SkillOpt");
  const trainPatch = `_ENV_REGISTRY = {}
def _register_builtins():
    try:
        from skillopt.envs.agent_skills.adapter import AgentSkillsAdapter
        _ENV_REGISTRY["agent_skills"] = AgentSkillsAdapter
    except ImportError:
        pass
`;
  const configPatch = `import os
_ENV_PLACEHOLDER_ALLOWLIST = frozenset({"SKILLOPT_OPTIMIZER_MODEL", "SKILLOPT_TARGET_MODEL", "SKILLOPT_JUDGE_MODEL", "SKILLOPT_REFLECTION_MODEL"})
def _expand_safe_env_placeholders(cfg):
    env_name = "SKILLOPT_OPTIMIZER_MODEL"
    if env_name in _ENV_PLACEHOLDER_ALLOWLIST and os.environ.get(env_name):
        return os.environ[env_name]
    return cfg
cfg = _expand_safe_env_placeholders(cfg)
`;
  const trainerPatch = `import math
requested_steps_per_epoch = int(cfg.get("steps_per_epoch", 0) or 0)
auto_steps_per_epoch = math.ceil(train_size / (batch_size * accumulation))
steps_per_epoch = requested_steps_per_epoch if requested_steps_per_epoch > 0 else auto_steps_per_epoch
batches_per_epoch = steps_per_epoch * accumulation
total_steps = num_epochs * steps_per_epoch
steps_source = "configured" if requested_steps_per_epoch > 0 else "auto"
`;
  try {
    writeFile(path.join(tempRepo, "package.json"), "{}\n");
    writeFile(path.join(tempRepo, ".gitignore"), ".agents/\n");
    writeFile(
      path.join(tempRepo, "incubator/skills", skillName, "SKILL.md"),
      `---
name: ${skillName}
description: Temporary live-patch skill used only by the SkillOpt validator.
---

# Live Patch Skill
`,
    );
    writeFile(path.join(tempRepo, "skill-evals", skillName, "README.md"), "# Eval proof\n");
    writeFile(path.join(clone, "scripts/train.py"), trainPatch);
    writeFile(path.join(clone, "scripts/eval_only.py"), trainPatch);
    writeFile(path.join(clone, "skillopt/config.py"), configPatch);
    writeFile(path.join(clone, "skillopt/engine/trainer.py"), trainerPatch);
    run("live patch git init", "git", ["init", "--quiet"], { cwd: clone });
    run("live patch git identity", "git", ["config", "user.name", "SkillOpt Validator"], {
      cwd: clone,
    });
    run(
      "live patch git email",
      "git",
      ["config", "user.email", "skillopt-validator@example.invalid"],
      { cwd: clone },
    );
    run("live patch git add", "git", ["add", "."], { cwd: clone });
    run("live patch git commit", "git", ["commit", "--quiet", "-m", "fixture"], {
      cwd: clone,
    });
    const commit = run("live patch git rev-parse", "git", ["rev-parse", "HEAD"], {
      cwd: clone,
    }).trim();
    const config = fs
      .readFileSync(path.join(assetRoot, "config.codex-cli-all.yaml"), "utf8")
      .replaceAll("<skill>", skillName)
      .replaceAll("<run-name>", "run-001")
      .replaceAll("<run-profile>", "exploratory")
      .replaceAll("<split-dir>", `.agents/skillopt-work/${skillName}/data`)
      .replaceAll("<visual-eval-policy>", "text-only");
    writeFile(
      path.join(
        tempRepo,
        ".agents/skillopt-work",
        skillName,
        "configs/agent-skills.codex-cli-all.yaml",
      ),
      config,
    );
    writeFile(
      path.join(tempRepo, ".agents/skillopt-work", skillName, "adapter-manifest.json"),
      `${JSON.stringify(
        {
          target_skill: skillName,
          mode: "codex-cli-all",
          run_profile: "exploratory",
          skillopt_commit: commit,
          registry_patch: { status: "ready" },
          installed_files: [],
        },
        null,
        2,
      )}\n`,
    );

    let live = runReadinessJson(tempRepo, skillName, "codex-cli-all", [], providerTestEnv()).parsed
      .liveAdapterPatchCheck;
    if (live?.status !== "matched") {
      fail(`valid live SkillOpt patches did not match manifest proof: ${JSON.stringify(live)}`);
    }

    writeFile(
      path.join(clone, "scripts/train.py"),
      `# from skillopt.envs.agent_skills.adapter import AgentSkillsAdapter
# _ENV_REGISTRY["agent_skills"] = AgentSkillsAdapter
`,
    );
    live = runReadinessJson(tempRepo, skillName, "codex-cli-all", [], providerTestEnv()).parsed
      .liveAdapterPatchCheck;
    if (
      live?.status !== "refresh_required" ||
      !live.blockers.some((blocker) => blocker.includes("train.py is missing"))
    ) {
      fail("manifest ready status hid a removed live registry patch");
    }

    writeFile(path.join(clone, "scripts/train.py"), trainPatch);
    writeFile(
      path.join(clone, "skillopt/config.py"),
      `# _ENV_PLACEHOLDER_ALLOWLIST = frozenset({"SKILLOPT_OPTIMIZER_MODEL"})
# def _expand_safe_env_placeholders(cfg): return cfg
# cfg = _expand_safe_env_placeholders(cfg)
`,
    );
    live = runReadinessJson(tempRepo, skillName, "codex-cli-all", [], providerTestEnv()).parsed
      .liveAdapterPatchCheck;
    if (
      live?.status !== "refresh_required" ||
      !live.blockers.some((blocker) => blocker.includes("structural safe model"))
    ) {
      fail("comment-only safe environment markers passed live patch proof");
    }

    writeFile(path.join(clone, "skillopt/config.py"), configPatch);
    writeFile(
      path.join(clone, "skillopt/engine/trainer.py"),
      `# requested_steps_per_epoch = int(cfg.get("steps_per_epoch", 0) or 0)
# steps_per_epoch = requested_steps_per_epoch if requested_steps_per_epoch > 0 else auto_steps_per_epoch
# steps_source = "configured" if requested_steps_per_epoch > 0 else "auto"
`,
    );
    live = runReadinessJson(tempRepo, skillName, "codex-cli-all", [], providerTestEnv()).parsed
      .liveAdapterPatchCheck;
    if (
      live?.status !== "refresh_required" ||
      !live.blockers.some((blocker) => blocker.includes("structural configured steps"))
    ) {
      fail("comment-only trainer markers passed live patch proof");
    }

    writeFile(path.join(clone, "skillopt/engine/trainer.py"), trainerPatch);
    writeFile(path.join(clone, "commit-change.txt"), "new commit\n");
    run("live patch changed commit add", "git", ["add", "."], { cwd: clone });
    run("live patch changed commit", "git", ["commit", "--quiet", "-m", "changed clone"], {
      cwd: clone,
    });
    live = runReadinessJson(tempRepo, skillName, "codex-cli-all", [], providerTestEnv()).parsed
      .liveAdapterPatchCheck;
    if (
      live?.status !== "refresh_required" ||
      !live.blockers.some((blocker) => blocker.includes("commit does not match"))
    ) {
      fail("manifest ready status hid a changed live SkillOpt clone commit");
    }
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

function validateVisualPermissionCapabilityGate() {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-visual-capability-"));
  const skillName = "visual-capability-skill";
  const binDir = path.join(tempRepo, "bin");
  const fakeCodex = path.join(binDir, "codex-without-permissions");
  try {
    writeFile(path.join(tempRepo, "package.json"), "{}\n");
    writeFile(path.join(tempRepo, ".gitignore"), ".agents/\n");
    writeFile(
      path.join(tempRepo, "incubator/skills", skillName, "SKILL.md"),
      `---
name: ${skillName}
description: Temporary visual-capability skill used only by the SkillOpt validator.
---

# Visual Capability Skill
`,
    );
    const evalCase = (name, visual) => `# ${name}

## Should Trigger

Yes.

## Prompt

Prepare ${name}.

## Expected Behavior

- Produce a result.

## Deterministic Assertions

- contains: result
${visual ? "\n## Visual Assertions\n\n- artifact_exists: *.png\n" : ""}`;
    writeFile(
      path.join(tempRepo, "skill-evals", skillName, "cases/text.md"),
      evalCase("Text", false),
    );
    writeFile(
      path.join(tempRepo, "skill-evals", skillName, "cases/visual.md"),
      evalCase("Visual", true),
    );
    const split = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/prepare-skillopt-split.mjs"),
        "--skill",
        skillName,
        "--seed",
        "42",
        "--json",
      ],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    if (split.status !== 0) {
      fail(`visual capability split failed: ${split.status}\n${split.stdout}\n${split.stderr}`);
    }
    writeFile(fakeCodex, "#!/bin/sh\necho 'codex exec help without custom permissions'\n");
    writeFile(path.join(binDir, "drawio"), "#!/bin/sh\nexit 0\n");
    fs.chmodSync(fakeCodex, 0o755);
    fs.chmodSync(path.join(binDir, "drawio"), 0o755);
    const configPath = path.join(
      tempRepo,
      ".agents/skillopt-work",
      skillName,
      "configs/agent-skills.codex-cli-all.yaml",
    );
    const baseConfig = fs
      .readFileSync(path.join(assetRoot, "config.codex-cli-all.yaml"), "utf8")
      .replaceAll("<skill>", skillName)
      .replaceAll("<run-name>", "run-001")
      .replaceAll("<run-profile>", "exploratory")
      .replaceAll("codex_exec_path: codex", `codex_exec_path: ${fakeCodex}`);
    const testEnv = providerTestEnv({
      PATH: `${binDir}${path.delimiter}${process.env.PATH || ""}`,
    });
    const fullConfig = baseConfig
      .replaceAll("<split-dir>", `.agents/skillopt-work/${skillName}/data`)
      .replaceAll("<visual-eval-policy>", "full");
    const textOnlyConfig = baseConfig
      .replaceAll("<split-dir>", `.agents/skillopt-work/${skillName}/data-text-only`)
      .replaceAll("<visual-eval-policy>", "text-only");
    writeFile(configPath, fullConfig);
    let visual = runReadinessJson(tempRepo, skillName, "codex-cli-all", [], testEnv).parsed
      .visualArtifactReadiness;
    if (
      visual?.status !== "unsupported_codex_permission_profile" ||
      visual.codexPermissionProfile?.status !== "unsupported"
    ) {
      fail(
        `full visual readiness ignored missing custom permission support: ${JSON.stringify(visual)}`,
      );
    }

    writeFile(configPath, textOnlyConfig);
    visual = runReadinessJson(tempRepo, skillName, "codex-cli-all", [], testEnv).parsed
      .visualArtifactReadiness;
    if (visual?.status !== "unsupported_codex_permission_profile") {
      fail(
        `text-only Codex rollout ignored missing isolation capability: ${JSON.stringify(visual)}`,
      );
    }

    writeFile(
      fakeCodex,
      `#!/bin/sh
schema=""
invalid=0
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--output-schema" ]; then
    shift
    schema="$1"
  elif [ "$1" = "permissions.skillopt_capability_probe.filesystem=7" ]; then
    invalid=1
  fi
  shift
done
if [ "$invalid" -eq 1 ]; then
  echo "Error loading config.toml: invalid type for permissions filesystem" >&2
  exit 1
fi
echo "Failed to read output schema file: $schema" >&2
exit 1
`,
    );
    fs.chmodSync(fakeCodex, 0o755);
    fs.rmSync(path.join(binDir, "drawio"));
    const supportedEnv = providerTestEnv({
      PATH: `${binDir}${path.delimiter}/bin${path.delimiter}/usr/bin`,
    });
    visual = runReadinessJson(tempRepo, skillName, "codex-cli-all", [], supportedEnv).parsed
      .visualArtifactReadiness;
    if (
      visual?.status !== "text_only_ready" ||
      visual.codexPermissionProfile?.status !== "supported"
    ) {
      fail(`text-only split did not bypass only the renderer gate: ${JSON.stringify(visual)}`);
    }

    writeFile(configPath, fullConfig);
    visual = runReadinessJson(tempRepo, skillName, "codex-cli-all", [], supportedEnv).parsed
      .visualArtifactReadiness;
    if (visual?.status !== "missing_drawio_cli") {
      fail(`full visual split did not require a renderer: ${JSON.stringify(visual)}`);
    }

    const nativeConfigPath = path.join(
      tempRepo,
      ".agents/skillopt-work",
      skillName,
      "configs/agent-skills.native-provider.yaml",
    );
    const nativeBase = fs
      .readFileSync(path.join(assetRoot, "config.native-provider.yaml"), "utf8")
      .replaceAll("<skill>", skillName)
      .replaceAll("<run-name>", "run-001")
      .replaceAll("<run-profile>", "official-parity");
    writeFile(
      nativeConfigPath,
      nativeBase
        .replaceAll("<split-dir>", `.agents/skillopt-work/${skillName}/data`)
        .replaceAll("<visual-eval-policy>", "full"),
    );
    visual = runReadinessJson(tempRepo, skillName, "native-provider", [], providerTestEnv()).parsed
      .visualArtifactReadiness;
    if (visual?.status !== "unsupported_visual_target_backend") {
      fail(`provider-backed full visual split was not blocked: ${JSON.stringify(visual)}`);
    }

    writeFile(
      nativeConfigPath,
      nativeBase
        .replaceAll("<split-dir>", `.agents/skillopt-work/${skillName}/data-text-only`)
        .replaceAll("<visual-eval-policy>", "text-only"),
    );
    visual = runReadinessJson(tempRepo, skillName, "native-provider", [], providerTestEnv()).parsed
      .visualArtifactReadiness;
    if (visual?.status !== "text_only_ready") {
      fail(
        `provider-backed text-only split did not bypass artifact tooling: ${JSON.stringify(visual)}`,
      );
    }
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

validateHelp();
validatePythonTemplates();
validateRolloutArtifactPolicy();
validateProviderTargetRollout();
await validateCodexJudgeAndReflectorIsolation();
validateRolloutWorkspaceSeedingContract();
await validateVisualRolloutReadIsolation();
validateConfigContracts();
validateVisualArtifactRolloutContract();
validateGatewayTopologyGuidance();
validateBenchmarkAssertions();
validateAdoptionSafety();
validateNoPrivatePayload();
validateGatewayConfigHardening();
await validateGatewaySmoke();
await validateEndpointProbeRedaction();
await validateGatewaySpawnFailureRedaction();
await validateGatewayEarlyExitStdinSafety();
validateStaleAdapterManifestBlocksTraining();
validateActiveSplitDataFloor();
validateProviderSpecificReadiness();
validateGeneratedDataFreshnessAndRunnability();
validateLiveAdapterPatchProof();
validateVisualPermissionCapabilityGate();
validateNoneVisualAssertionsIgnored();
validateTextOnlySplitExistsWithoutVisualAssertions();
validateLocalArtifactAudit();
validateLocalArtifactAuditFreshGlobalCompatibility();

console.log("SkillOpt setup payload validated.");
