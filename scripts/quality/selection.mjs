import assert from "node:assert/strict";
import { realpathSync, statSync } from "node:fs";
import path from "node:path";

import { runOxlint } from "./oxlint.mjs";
import { sourceRoots } from "./scope.mjs";

const normalizeFile = (input) => {
  assert.ok(!input.startsWith("-"), `Unsupported option: ${input}`);

  const absolute = path.resolve(input);
  const relative = path.relative(process.cwd(), absolute).split(path.sep).join("/");

  assert.ok(
    !relative.startsWith("../") && !path.isAbsolute(relative),
    "Select files inside this repository",
  );
  assert.ok(statSync(absolute).isFile(), `Select explicit files, not directories: ${input}`);
  assert.equal(
    realpathSync(absolute),
    path.join(realpathSync(process.cwd()), relative),
    `Symlink aliases are not supported: ${input}`,
  );
  assert.ok(
    sourceRoots.some((root) => relative === root || relative.startsWith(`${root}/`)),
    `Outside the maintained quality scope: ${input}`,
  );

  return relative;
};

export const selectSourceFiles = (paths) => {
  assert.ok(
    paths.length > 0,
    "Select at least one explicit source file; no repository-wide fix is implied",
  );

  const files = [...new Set(paths.map(normalizeFile))];
  const result = runOxlint(files, { debug: true });

  assert.equal(result.status, 0, `Could not select source files: ${result.stderr}`);

  const selected = new Set(
    result.stdout
      .trim()
      .split(/\r?\n/u)
      .filter(Boolean)
      .map((file) => path.relative(process.cwd(), path.resolve(file)).split(path.sep).join("/")),
  );

  const missing = files.filter((file) => !selected.has(file));

  assert.equal(missing.length, 0, `Ignored or unsupported source files: ${missing.join(", ")}`);
  assert.equal(selected.size, files.length, "Oxlint selected unexpected files");

  return files;
};
