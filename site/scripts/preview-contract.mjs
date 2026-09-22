import assert from "node:assert/strict";

// Validate the generated output, not just the configuration used to request it.
export function validatePreviewPage(html, config, label = "HTML page") {
  const banners = [
    ...html.matchAll(
      /<aside\b[^>]*data-preview-pr="([^"]*)"[^>]*data-preview-sha="([^"]*)"[^>]*>([\s\S]*?)<\/aside>/g,
    ),
  ];
  if (!config.isPreview) {
    assert.equal(banners.length, 0, `${label}: production must not contain a preview banner`);
    return;
  }
  assert.equal(banners.length, 1, `${label}: missing unique preview banner`);
  assert.equal(banners[0][1], config.previewPr, `${label}: wrong preview PR`);
  assert.equal(banners[0][2], config.sourceRef, `${label}: wrong preview SHA`);
  const banner = banners[0][3];
  assert(
    banner.includes(`href="https://github.com/stark-ai-de/agent-skills/pull/${config.previewPr}"`),
    `${label}: missing PR link`,
  );
  assert(
    banner.includes(
      `href="https://github.com/stark-ai-de/agent-skills/commit/${config.sourceRef}"`,
    ),
    `${label}: missing commit link`,
  );
  assert(
    banner.replace(/<[^>]*>/g, "").includes(config.sourceRef.slice(0, 7)),
    `${label}: missing visible short SHA`,
  );
  for (const directive of ["robots", "googlebot"]) {
    assert(
      new RegExp(`<meta\\s+name="${directive}"\\s+content="noindex, nofollow"`).test(html),
      `${label}: preview must set ${directive} noindex, nofollow`,
    );
  }
  for (const [, kind, ref] of html.matchAll(
    /href="https:\/\/github\.com\/stark-ai-de\/agent-skills\/(blob|tree)\/([^/]+)\//g,
  )) {
    assert.equal(ref, config.sourceRef, `${label}: unpinned ${kind} source link`);
  }
}
