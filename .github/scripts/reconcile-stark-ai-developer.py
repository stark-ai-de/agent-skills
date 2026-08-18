from __future__ import annotations

import json
from pathlib import Path

ROOT = Path.cwd()


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one occurrence, found {count}: {old!r}")
    write(path, text.replace(old, new, 1))


# Reconcile focused validator versions and hash-bound CodeGraph evidence.
replace_once(
    "scripts/validation/memory-curators/validate.mjs",
    '''  if (version !== "0.2.0")
    fail(`${skillRelative}: expected version 0.2.0; found ${version ?? "none"}`);''',
    '''  const expectedVersion = curator.name === "codex-memory-curator" ? "0.2.1" : "0.2.0";
  if (version !== expectedVersion)
    fail(
      `${skillRelative}: expected version ${expectedVersion}; found ${version ?? "none"}`,
    );''',
)

captured_codegraph_hash = "dcb0f310d003ec6bcd4f3218f9519361e7bd95916a1714afbedeb5ca1c663bc0"
adapted_codegraph_hash = "3b3818d4c3a121a842533b395a6a2315a0bab8e9f45b8992b02157a1af492786"
codegraph_changed_contracts = [
    "SKILL.md: metadata.version 0.3.1 -> 0.3.2",
    "SKILL.md: OpenAI product compatibility boundary",
    "agents/openai.yaml: policy.products -> CODEX",
    "agents/openai.yaml: policy.allow_implicit_invocation true -> false",
]
codegraph_adaptation = {
    "schema_version": 1,
    "adapted_at": "2026-08-18",
    "adaptation_kind": "openai-product-routing-and-surface-boundary",
    "from": {
        "skill_version": "0.3.1",
        "candidate_sha256": captured_codegraph_hash,
    },
    "to": {
        "skill_version": "0.3.2",
        "candidate_sha256": adapted_codegraph_hash,
    },
    "evidence_reuse": "captured-workflow-behavior-only",
    "changed_contracts": codegraph_changed_contracts,
    "separate_validation": [
        "OpenAI package product routing and explicit invocation are checked by plugin:validate.",
        "Plugin-level positive, negative, incomplete-input, boundary, and approval cases are checked by plugin:test.",
    ],
    "limitations": [
        "No new collaboration-reviewer or external model capture was created for v0.3.2.",
        "The v0.3.1 capture is reused only for unchanged setup, update, doctor, ambiguity, and unauthorized-mutation workflow behavior.",
        "This adaptation is not live CodeGraph, ast-grep, CI, hosted, or production behavior evidence.",
    ],
}
write(
    "skill-evals/codegraph-ast-grep/behavioral/current-contract/openai-routing-adaptation.json",
    json.dumps(codegraph_adaptation, indent=2) + "\n",
)

codegraph_validator_path = "scripts/validation/codegraph-ast-grep/validate-contract.mjs"
replace_once(
    codegraph_validator_path,
    r'''requirePattern(skillPath, skill, /version:\s*"0\.3\.1"/, "metadata.version must be 0.3.1");''',
    r'''requirePattern(skillPath, skill, /version:\s*"0\.3\.2"/, "metadata.version must be 0.3.2");''',
)
replace_once(
    codegraph_validator_path,
    '''const currentRuntimeCandidateHash = hashRuntimeCandidate(skillDir);
let currentContractCases = 0;''',
    f'''const currentRuntimeCandidateHash = hashRuntimeCandidate(skillDir);
const capturedRuntimeCandidateHash = "{captured_codegraph_hash}";
const currentContractAdaptationPath = `${{currentContractRoot}}/openai-routing-adaptation.json`;
const currentContractAdaptation = requireJson(currentContractAdaptationPath);
let currentContractCases = 0;''',
)
replace_once(
    codegraph_validator_path,
    '''  if (
    currentContractManifest.candidate?.skill_path !==
      "skills/engineering-workflows/codegraph-ast-grep" ||
    currentContractManifest.candidate?.skill_version !== "0.3.1" ||
    currentContractManifest.candidate?.sha256 !== currentRuntimeCandidateHash ||
    currentContractManifest.candidate?.hash_recipe !==
      "For each runtime file in bytewise lexicographic path order: relative path, NUL, file bytes, NUL; then SHA-256."
  ) {
    fail(
      `${currentContractManifestPath}: current contract is not bound to runtime payload ${currentRuntimeCandidateHash}`,
    );
  }
''',
    f'''  if (
    currentContractManifest.candidate?.skill_path !==
      "skills/engineering-workflows/codegraph-ast-grep" ||
    currentContractManifest.candidate?.skill_version !== "0.3.1" ||
    currentContractManifest.candidate?.sha256 !== capturedRuntimeCandidateHash ||
    currentContractManifest.candidate?.hash_recipe !==
      "For each runtime file in bytewise lexicographic path order: relative path, NUL, file bytes, NUL; then SHA-256."
  ) {{
    fail(`${{currentContractManifestPath}}: captured v0.3.1 contract identity is invalid`);
  }}
  if (
    currentContractAdaptation?.schema_version !== 1 ||
    currentContractAdaptation?.adapted_at !== "2026-08-18" ||
    currentContractAdaptation?.adaptation_kind !==
      "openai-product-routing-and-surface-boundary" ||
    currentContractAdaptation?.from?.skill_version !== "0.3.1" ||
    currentContractAdaptation?.from?.candidate_sha256 !== capturedRuntimeCandidateHash ||
    currentContractAdaptation?.to?.skill_version !== "0.3.2" ||
    currentContractAdaptation?.to?.candidate_sha256 !== currentRuntimeCandidateHash ||
    currentContractAdaptation?.evidence_reuse !== "captured-workflow-behavior-only" ||
    JSON.stringify(currentContractAdaptation?.changed_contracts) !==
      JSON.stringify(["SKILL.md: metadata.version 0.3.1 -> 0.3.2", "SKILL.md: OpenAI product compatibility boundary", "agents/openai.yaml: policy.products -> CODEX", "agents/openai.yaml: policy.allow_implicit_invocation true -> false"]) ||
    !Array.isArray(currentContractAdaptation?.separate_validation) ||
    !Array.isArray(currentContractAdaptation?.limitations) ||
    !currentContractAdaptation.limitations.some((value) =>
      /No new collaboration-reviewer or external model capture/i.test(value),
    ) ||
    !currentContractAdaptation.limitations.some((value) =>
      /reused only for unchanged setup, update, doctor, ambiguity, and unauthorized-mutation/i.test(
        value,
      ),
    )
  ) {{
    fail(
      `${{currentContractAdaptationPath}}: invalid v0.3.2 product-routing adaptation or evidence boundary`,
    );
  }}
''',
)
replace_once(
    codegraph_validator_path,
    '''    captureProvenance?.candidate_sha256 !== currentRuntimeCandidateHash ||''',
    '''    captureProvenance?.candidate_sha256 !== capturedRuntimeCandidateHash ||''',
)
replace_once(
    codegraph_validator_path,
    '''  const expectedCurrentContractFiles = new Set([
    `${currentContractRoot}/README.md`,
    currentContractManifestPath,
    `${currentContractRoot}/capture-provenance.json`,''',
    '''  const expectedCurrentContractFiles = new Set([
    `${currentContractRoot}/README.md`,
    currentContractManifestPath,
    currentContractAdaptationPath,
    `${currentContractRoot}/capture-provenance.json`,''',
)
replace_once(
    codegraph_validator_path,
    '''  for (const marker of [
    currentRuntimeCandidateHash,
    `${currentContractRoot}/capture-provenance.json`,''',
    '''  for (const marker of [
    capturedRuntimeCandidateHash,
    `${currentContractRoot}/capture-provenance.json`,''',
)
