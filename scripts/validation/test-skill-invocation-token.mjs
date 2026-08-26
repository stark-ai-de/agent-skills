import assert from "node:assert/strict";

import { containsKnownSkillInvocationToken } from "../catalog/skill-invocation-token.mjs";

const knownSkillNames = new Set(["architecture-compass", "codex-spec-interviewer"]);

for (const prompt of [
  "$architecture-compass",
  "Use $codex-spec-interviewer to continue.",
  "Open ($architecture-compass), then proceed.",
]) {
  assert.equal(
    containsKnownSkillInvocationToken(prompt, knownSkillNames),
    true,
    `expected a known invocation token to be rejected: ${prompt}`,
  );
}

for (const prompt of [
  "Set a $20 budget.",
  "The budget is $20.00.",
  "Use $unknown-skill to continue.",
  "Treat prefix$architecture-compass as embedded text.",
  "Treat prefix-$architecture-compass as embedded text.",
  "Do not truncate $architecture-compass-plus to a known name.",
  "Do not truncate $architecture-compass2 to a known name.",
  "Do not truncate $architecture-compass_extra to a known name.",
]) {
  assert.equal(
    containsKnownSkillInvocationToken(prompt, knownSkillNames),
    false,
    `expected valid prompt prose not to be rejected: ${prompt}`,
  );
}

console.log("Validated complete known $skill invocation token matching.");
