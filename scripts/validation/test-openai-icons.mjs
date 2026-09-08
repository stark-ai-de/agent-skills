import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { unzipSync } from "fflate";

import { createDirectoryArchive } from "../lib/plugin-projections.mjs";
import { withOpenAiStage } from "../lib/openai-projection.mjs";
import { decodedPngInfo } from "./lib/visual-assertions.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const bundle = JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, "plugins/stark-ai-developer.source.json"), "utf8"),
);
const listing = JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, "docs/listing/openai/stark-ai-developer.json"), "utf8"),
);
const expectedColors = ["0021c7", "7fa0ff"];
const pixelDigests = new Set();

for (const skill of bundle.skills) {
  const sourceRoot = path.join(repositoryRoot, skill.source);
  const iconPath = path.join(sourceRoot, "assets/openai-icon.png");
  const yamlPath = path.join(sourceRoot, "agents/openai.yaml");
  const projectedRoot = path.join(repositoryRoot, "plugins/stark-ai-developer/skills", skill.name);
  const info = decodedPngInfo(iconPath);
  assert.equal(info.width, 1024, `${skill.name} icon width`);
  assert.equal(info.height, 1024, `${skill.name} icon height`);
  assert.equal(info.bitDepth, 8, `${skill.name} icon bit depth`);
  assert.equal(info.colorType, 6, `${skill.name} icon must be RGBA`);
  assert.equal(info.nonblank, true, `${skill.name} icon must have visible content`);
  const pixels = info.canonicalPixels;
  const colors = new Set();
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset + 3] !== 0) colors.add(pixels.subarray(offset, offset + 3).toString("hex"));
  }
  assert.deepEqual([...colors].sort(), expectedColors, `${skill.name} icon palette`);
  const pixelCount = info.width * info.height;
  assert.ok(info.transparentPixelCount / pixelCount >= 0.6, `${skill.name} needs transparency`);
  assert.ok(info.visiblePixelCount / pixelCount >= 0.1, `${skill.name} content is too sparse`);
  assert.ok(
    info.visiblePixelCount / pixelCount <= 0.4,
    `${skill.name} content exceeds safe padding`,
  );
  for (const offset of [
    0,
    (info.width - 1) * 4,
    (pixelCount - info.width) * 4,
    (pixelCount - 1) * 4,
  ]) {
    assert.equal(pixels[offset + 3], 0, `${skill.name} corners must be transparent`);
  }
  assert.equal(pixelDigests.has(info.pixelDigest), false, `${skill.name} icon must be original`);
  pixelDigests.add(info.pixelDigest);

  const yaml = fs.readFileSync(yamlPath, "utf8");
  assert.equal(
    (yaml.match(/^\s+icon_(?:small|large): "\.\/assets\/openai-icon\.png"$/gm) ?? []).length,
    2,
    `${skill.name} must route both OpenAI icon sizes to the canonical PNG`,
  );
  assert.equal(
    Buffer.compare(
      fs.readFileSync(iconPath),
      fs.readFileSync(path.join(projectedRoot, "assets/openai-icon.png")),
    ),
    0,
    `${skill.name} projected icon bytes`,
  );
  assert.equal(
    Buffer.compare(
      fs.readFileSync(yamlPath),
      fs.readFileSync(path.join(projectedRoot, "agents/openai.yaml")),
    ),
    0,
    `${skill.name} projected OpenAI metadata bytes`,
  );
}
assert.equal(pixelDigests.size, 6);

const archiveRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-openai-icons-"));
try {
  withOpenAiStage(repositoryRoot, (staged) => {
    const archivePath = path.join(archiveRoot, "openai.zip");
    createDirectoryArchive({ sourceRoot: staged.stage, output: archivePath });
    const archive = unzipSync(fs.readFileSync(archivePath));
    for (const skill of bundle.skills) {
      const sourceBytes = fs.readFileSync(
        path.join(repositoryRoot, skill.source, "assets/openai-icon.png"),
      );
      const archiveBytes = archive[`skills/${skill.name}/assets/openai-icon.png`];
      assert.ok(archiveBytes, `${skill.name} icon must be present in openai.zip`);
      assert.equal(Buffer.compare(sourceBytes, Buffer.from(archiveBytes)), 0);
    }
    for (const [archiveName, sourceRelative] of [
      ["assets/logo.png", listing.plugin.assets.logo],
      ["assets/composer-icon.png", listing.plugin.assets.composerIcon],
    ]) {
      const sourceBytes = fs.readFileSync(path.join(repositoryRoot, sourceRelative));
      assert.equal(
        Buffer.compare(sourceBytes, fs.readFileSync(path.join(staged.stage, archiveName))),
        0,
        `${archiveName} staged bytes`,
      );
      assert.equal(Buffer.compare(sourceBytes, Buffer.from(archive[archiveName])), 0);
    }
  });
} finally {
  fs.rmSync(archiveRoot, { recursive: true, force: true });
}

console.log("Six OpenAI skill icons and their exact projection/package bytes passed.");
