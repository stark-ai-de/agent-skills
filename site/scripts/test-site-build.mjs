import assert from "node:assert/strict";
import { resolveSiteBuild } from "../src/lib/site-build.mjs";

assert.deepEqual(resolveSiteBuild({}), { basePath: "/agent-skills", isPreview: false });
const valid = { AGENT_SKILLS_PREVIEW_PR: "95", AGENT_SKILLS_PREVIEW_SHA: "a".repeat(40) };
assert.deepEqual(resolveSiteBuild(valid), {
  basePath: "/agent-skills-preview/pr-95",
  isPreview: true,
  pr: "95",
  sha: "a".repeat(40),
});
for (const pr of [
  undefined,
  "",
  "0",
  "-1",
  "01",
  "95/../../agent-skills",
  "95\n",
  "https://example.test",
]) {
  assert.throws(
    () => resolveSiteBuild({ ...valid, AGENT_SKILLS_PREVIEW_PR: pr }),
    /Preview builds require/,
  );
}
for (const sha of [
  undefined,
  "",
  "main",
  "A".repeat(40),
  "a".repeat(39),
  "a".repeat(41),
  "a".repeat(40) + "\n",
]) {
  assert.throws(
    () => resolveSiteBuild({ ...valid, AGENT_SKILLS_PREVIEW_SHA: sha }),
    /Preview builds require/,
  );
}
console.log(
  "Site build target: production default, isolated PR path and invalid/partial configuration checks passed.",
);
