import assert from "node:assert/strict";
let passed = 0;
function test(label, run) {
  try {
    run();
    passed += 1;
  } catch (error) {
    throw new Error(label, { cause: error });
  }
}

import { renderRobots, resolveSiteConfig } from "../site-config.mjs";
import { validatePreviewPage } from "./preview-contract.mjs";

const sha = "0123456789abcdef0123456789abcdef01234567";
const previewEnv = { AGENT_SKILLS_PREVIEW_PR: "90", AGENT_SKILLS_PREVIEW_SHA: sha };
const preview = resolveSiteConfig(previewEnv);
const production = resolveSiteConfig({});
const fixture = `<meta name="robots" content="noindex, nofollow"><meta name="googlebot" content="noindex, nofollow">
<aside data-preview-pr="90" data-preview-sha="${sha}"><strong>Preview</strong><a href="https://github.com/stark-ai-de/agent-skills/pull/90">PR #90</a><a href="https://github.com/stark-ai-de/agent-skills/commit/${sha}">${sha.slice(0, 7)}</a></aside>
<a href="https://github.com/stark-ai-de/agent-skills/blob/${sha}/docs/README.md">Docs</a><a href="https://github.com/stark-ai-de/agent-skills/tree/${sha}/skills">Files</a>`;

test("production defaults and robots stay unchanged", () => {
  assert.deepEqual(production, {
    origin: "https://stark-ai-de.github.io",
    basePath: "/agent-skills",
    isPreview: false,
    previewPr: undefined,
    sourceRef: "main",
  });
  assert.equal(
    renderRobots(production),
    "User-Agent: *\nAllow: /\n\nHost: stark-ai-de.github.io\nSitemap: https://stark-ai-de.github.io/agent-skills/sitemap-index.xml\n# Curated AI index: https://stark-ai-de.github.io/agent-skills/llms.txt\n",
  );
  validatePreviewPage("<main>Production</main>", production);
});

test("preview has a fixed origin, isolated PR path and normalized immutable ref", () => {
  assert.equal(preview.basePath, "/agent-skills-preview/pr-90");
  assert.equal(preview.origin, production.origin);
  assert.equal(
    resolveSiteConfig({ ...previewEnv, AGENT_SKILLS_PREVIEW_SHA: sha.toUpperCase() }).sourceRef,
    sha,
  );
  assert.equal(
    resolveSiteConfig({
      ...previewEnv,
      SITE_ORIGIN: "https://attacker.example",
      SITE_BASE_PATH: "/outside",
    }).basePath,
    preview.basePath,
  );
  assert.equal(renderRobots(preview), "User-Agent: *\nDisallow: /\n");
  validatePreviewPage(fixture, preview);
});

for (const invalidPr of [
  undefined,
  "",
  "0",
  "-1",
  "01",
  "1.5",
  "1e2",
  " 90",
  "90\n",
  "../90",
  "90/x",
  "<script>",
]) {
  test(`reject invalid PR ${JSON.stringify(invalidPr)}`, () => {
    assert.throws(
      () => resolveSiteConfig({ ...previewEnv, AGENT_SKILLS_PREVIEW_PR: invalidPr }),
      /Preview builds require/,
    );
  });
}
for (const invalidSha of [
  undefined,
  "",
  "main",
  "a".repeat(39),
  "a".repeat(41),
  "g".repeat(40),
  `${sha}\n`,
  `../${sha}`,
]) {
  test(`reject invalid SHA ${JSON.stringify(invalidSha)}`, () => {
    assert.throws(
      () => resolveSiteConfig({ ...previewEnv, AGENT_SKILLS_PREVIEW_SHA: invalidSha }),
      /Preview builds require/,
    );
  });
}

for (const [label, mutant] of [
  ["missing banner", fixture.replace(/<aside[\s\S]*?<\/aside>/, "")],
  ["wrong PR", fixture.replace('data-preview-pr="90"', 'data-preview-pr="91"')],
  [
    "wrong SHA",
    fixture.replace(`data-preview-sha="${sha}"`, `data-preview-sha="${"a".repeat(40)}"`),
  ],
  ["wrong PR link", fixture.replace("/pull/90", "/pull/91")],
  ["wrong commit link", fixture.replace(`/commit/${sha}`, "/commit/main")],
  ["missing visible short SHA", fixture.replace(`>${sha.slice(0, 7)}<`, ">commit<")],
  [
    "indexable robots",
    fixture.replace(
      'name="robots" content="noindex, nofollow"',
      'name="robots" content="index, follow"',
    ),
  ],
  [
    "indexable googlebot",
    fixture.replace(
      'name="googlebot" content="noindex, nofollow"',
      'name="googlebot" content="index, follow"',
    ),
  ],
  ["moving source ref", fixture.replace(`/blob/${sha}/`, "/blob/main/")],
  ["wrong file-tree ref", fixture.replace(`/tree/${sha}/`, `/tree/${"b".repeat(40)}/`)],
  ["duplicate banner", fixture + fixture],
]) {
  test(`reject generated preview with ${label}`, () =>
    assert.throws(() => validatePreviewPage(mutant, preview)));
}
test("reject preview banner in production", () =>
  assert.throws(() => validatePreviewPage(fixture, production)));

console.log(`Preview configuration and generated-output contract: ${passed} tests passed.`);
