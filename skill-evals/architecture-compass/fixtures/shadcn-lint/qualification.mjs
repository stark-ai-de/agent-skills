import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fixture = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(fixture, "../../../..");
const guidePath =
  "skills/engineering-workflows/architecture-compass/references/ac-adr-063-enforce-tailwind-design-system-contracts-with-shadcn-lint.guide.md";
const guide = fs.readFileSync(path.join(repository, guidePath), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(fixture, "package.json"), "utf8"));
const jsonBlocks = [...guide.matchAll(/```json\n([\s\S]*?)\n```/g)].map((match) =>
  JSON.parse(match[1]),
);
const policy = jsonBlocks.find((block) => block.rules?.["shadcn/no-restyle"]);
const oxlintConfig = jsonBlocks.find((block) => block.jsPlugins);
const eslintConfig = [...guide.matchAll(/```js\n([\s\S]*?)\n```/g)].find((match) =>
  match[1].includes("eslint/config"),
)?.[1];
assert.ok(
  policy && oxlintConfig && eslintConfig,
  "Guide must provide both complete linter examples",
);
const ruleIds = [
  "no-restyle",
  "no-raw-colors",
  "no-arbitrary-values",
  "no-inline-styles",
  "no-unknown-classes",
  "require-static-classes",
];
assert.deepEqual(Object.keys(policy.rules).sort(), ruleIds.map((id) => `shadcn/${id}`).sort());

const args = process.argv.slice(2);
assert.ok(
  args.length === 0 || (args.length === 2 && args[0] === "--output"),
  "Usage: qualify [--output new-receipt.json]",
);
const output = args[1] && path.resolve(args[1]);
const rows = [];
const hash = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const versions = {};
const receipt = {
  schemaVersion: 1,
  stage: "plugin-runtime",
  executionEnvironment: process.env.GITHUB_ACTIONS === "true" ? "github-actions" : "local",
  observedAt: new Date().toISOString(),
  hostedRun:
    process.env.GITHUB_ACTIONS === "true"
      ? {
          id: process.env.GITHUB_RUN_ID,
          attempt: process.env.GITHUB_RUN_ATTEMPT,
          sha: process.env.GITHUB_SHA,
        }
      : null,
  status: "failed",
  revision: spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: repository,
    encoding: "utf8",
  }).stdout.trim(),
  inputs: Object.fromEntries(
    [
      guidePath,
      ...["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "qualification.mjs"].map(
        (name) => path.relative(repository, path.join(fixture, name)),
      ),
    ].map((name) => [name, hash(path.join(repository, name))]),
  ),
  runtime: {
    name: process.versions.bun ? "bun" : "node",
    version: process.versions.bun ?? process.versions.node,
    platform: process.platform,
    architecture: process.arch,
  },
  dependencies: versions,
  results: rows,
  limits: [
    "Synthetic TSX fixtures; no consumer repository adoption claim.",
    "No browser, accessibility, compiler, or agent-behavior qualification.",
    "Fresh processes and ESLint file cache tested; persistent editor module caches are not tested.",
  ],
};

function write(relative, value) {
  const file = path.join(temporary, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
}
function linkDependency(name, destination = `node_modules/${name}`) {
  const source = path.join(fixture, "node_modules", name);
  assert.ok(fs.existsSync(source), `Install the isolated fixture first: missing ${name}`);
  const target = path.join(temporary, destination);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.symlinkSync(source, target, "junction");
}
function execute(linter, file, flags = []) {
  const entry = linter === "eslint" ? "eslint/bin/eslint.js" : "oxlint/bin/oxlint";
  const result = spawnSync(
    process.execPath,
    [
      ...(process.versions.bun ? ["--bun"] : []),
      path.join(fixture, "node_modules", entry),
      "--format",
      "json",
      ...flags,
      file,
    ],
    { cwd: temporary, encoding: "utf8", timeout: 30000 },
  );
  assert.ifError(result.error);
  assert.equal(result.signal, null, `${linter} terminated by a signal`);
  const parsed = JSON.parse(result.stdout);
  const diagnostics =
    linter === "eslint" ? parsed.flatMap((item) => item.messages) : parsed.diagnostics;
  const rules = diagnostics
    .map((item) => item.ruleId ?? item.code?.replace(/^shadcn\((.+)\)$/, "shadcn/$1"))
    .sort();
  return {
    exit: result.status,
    rules,
    warnings: /\[@shadcn\/lint\]/.test(result.stderr) ? 1 : 0,
    stderr: result.stderr,
  };
}
function check(
  linter,
  name,
  file,
  expectedRules = [],
  exit = expectedRules.length ? 1 : 0,
  flags = [],
  limited = false,
) {
  const result = execute(linter, file, flags);
  const row = {
    linter,
    name,
    expectedExit: exit,
    exit: result.exit,
    rules: result.rules,
    discoveryLimited: limited,
    status: "failed",
  };
  rows.push(row);
  assert.equal(result.exit, exit, `${linter}/${name}: process outcome`);
  assert.deepEqual(
    result.rules,
    expectedRules.map((id) => `shadcn/${id}`).sort(),
    `${linter}/${name}: diagnostic ownership`,
  );
  if (limited)
    assert.match(
      result.stderr,
      /\[@shadcn\/lint\]/,
      `${linter}/${name}: missing discovery warning`,
    );
  else
    assert.equal(
      result.warnings,
      0,
      `${linter}/${name}: unexpected reduced-analysis warning: ${result.stderr}`,
    );
  row.status = "passed";
}

const theme = '@import "tailwindcss";\n@theme { --color-primary: #234567; }\n';
const utility = "@utility qualification-grid { display: grid; }\n";
const imports =
  'import { Button } from "@workspace/ui/components/button";\nimport { CardTitle } from "@workspace/ui/components/cardtitle";\nimport { CardContent } from "@workspace/ui/components/cardcontent";\nimport { Avatar } from "@workspace/ui/components/avatar";\n';
const cases = [
  [
    "consumer-positive",
    '<><Button className="mt-4 w-full"/><CardTitle className="text-lg"/><CardContent className="p-6"/><Avatar className="size-8"/><div className="bg-primary w-[320px]" style={{"--progress": progress}}/></>',
    [],
  ],
  ["restyle", '<Button className="p-4"/>', ["no-restyle"]],
  ["raw-color", '<div className="bg-pink-500"/>', ["no-raw-colors"]],
  ["arbitrary", '<div className="p-[13px]"/>', ["no-arbitrary-values"]],
  ["inline", "<div style={{padding:12}}/>", ["no-inline-styles"]],
  ["unknown", '<div className="rounded-huge"/>', ["no-unknown-classes"]],
  ["unknown-variant", '<div className="hovr:flex"/>', ["no-unknown-classes"]],
  ["dynamic-component", "<Button className={`bg-${color}`}/>", ["require-static-classes"]],
  ["dynamic-dom-scope-limit", "<div className={`bg-${color}`}/>", []],
  ["title-font", '<CardTitle className="font-bold"/>', ["no-restyle"]],
  ["avatar-layout", '<Avatar className="w-full"/>', ["no-restyle"]],
  [
    "definition-positive",
    '<><Button className="p-4"/><div className="p-[13px]"/><Button className={`bg-${color}`}/></>',
    [],
    true,
  ],
  ["definition-raw", '<div className="bg-pink-500"/>', ["no-raw-colors"], true],
  ["definition-inline", "<div style={{padding:12}}/>", ["no-inline-styles"], true],
  ["definition-unknown", '<div className="rounded-huge"/>', ["no-unknown-classes"], true],
];

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "shadcn-qualification-"));
try {
  for (const [name, expected] of Object.entries(manifest.devDependencies)) {
    const installed = JSON.parse(
      fs.readFileSync(path.join(fixture, "node_modules", name, "package.json"), "utf8"),
    );
    assert.equal(installed.version, expected, `${name}: installed version differs from fixture`);
    versions[name] = installed.version;
    if (name !== "tailwindcss") linkDependency(name);
  }
  // The stylesheet package owns Tailwind directly; consumers cannot borrow a root copy.
  linkDependency("tailwindcss", "packages/ui/node_modules/tailwindcss");
  write("package.json", { private: true, type: "module" });
  write("design-system.lint.json", policy);
  write(".oxlintrc.json", oxlintConfig);
  write("eslint.config.mjs", eslintConfig);
  write("tsconfig.json", { compilerOptions: { jsx: "react-jsx", moduleResolution: "bundler" } });
  write("components.json", {
    tailwind: { css: "packages/ui/src/styles/globals.css" },
    aliases: { ui: "@workspace/ui/components" },
  });
  write("packages/ui/package.json", {
    name: "@workspace/ui",
    private: true,
    type: "module",
    exports: {
      "./components": "./src/components",
      "./components/*": "./src/components/*.tsx",
      "./globals.css": "./src/styles/globals.css",
    },
    dependencies: { tailwindcss: versions.tailwindcss },
  });
  fs.mkdirSync(path.join(temporary, "node_modules/@workspace"), { recursive: true });
  fs.symlinkSync(
    path.join(temporary, "packages/ui"),
    path.join(temporary, "node_modules/@workspace/ui"),
    "junction",
  );
  for (const [name, tag] of [
    ["Button", "button"],
    ["CardTitle", "h3"],
    ["CardContent", "div"],
    ["Avatar", "span"],
  ]) {
    write(
      `packages/ui/src/components/${name.toLowerCase()}.tsx`,
      `export function ${name}({className}: {className?: string}) { return <${tag} className={className}/>; }\n`,
    );
  }
  for (const [name, jsx, , definition] of cases) {
    const usedImports = imports
      .split("\n")
      .filter((line) => line && jsx.includes(`<${line.match(/\{ (\w+) \}/)[1]}`))
      .join("\n");
    const parameters = ["color", "progress"].filter((name) => jsx.includes(name));
    const argument = parameters.length
      ? `{${parameters.join(",")}}: {${parameters.map((name) => `${name}:${name === "color" ? "string" : "number"}`).join(";")}}`
      : "";
    write(
      `${definition ? "packages/ui/src/components" : "apps"}/${name}.tsx`,
      `${usedImports}\nexport const Example = (${argument}) => ${jsx};\n`,
    );
  }
  write("apps/theme.tsx", 'export const Example = () => <div className="qualification-grid"/>;\n');
  for (const linter of ["eslint", "oxlint"]) {
    write("packages/ui/src/styles/globals.css", theme + utility);
    for (const [name, , rules, definition] of cases)
      check(
        linter,
        name,
        `${definition ? "packages/ui/src/components" : "apps"}/${name}.tsx`,
        rules,
      );
    const warningPolicy = structuredClone(policy);
    warningPolicy.rules["shadcn/no-restyle"][0] = "warn";
    write("design-system.lint.json", warningPolicy);
    check(linter, "report-only", "apps/restyle.tsx", ["no-restyle"], 0);
    check(linter, "warnings-blocked-by-command", "apps/restyle.tsx", ["no-restyle"], 1, [
      "--max-warnings",
      "0",
    ]);
    write("design-system.lint.json", policy);
    write("components.json", {
      tailwind: { css: "packages/ui/src/styles/globals.css" },
      aliases: { ui: "@missing/ui" },
    });
    check(
      linter,
      "unresolved-components-are-limited-evidence",
      "apps/restyle.tsx",
      [],
      0,
      [],
      true,
    );
    write("components.json", {
      tailwind: { css: "packages/ui/src/styles/globals.css" },
      aliases: { ui: "@workspace/ui/components" },
    });
    check(linter, "discovery-restored", "apps/restyle.tsx", ["no-restyle"]);
    // A grammar-valid undeclared utility only fails while real theme analysis works.
    check(linter, "theme-present", "apps/theme.tsx");
    if (linter === "eslint")
      check(linter, "populate-file-cache", "apps/theme.tsx", [], 0, ["--cache"]);
    write("packages/ui/src/styles/globals.css", theme);
    if (linter === "eslint")
      check(linter, "file-cache-does-not-track-theme", "apps/theme.tsx", [], 0, ["--cache"]);
    check(linter, "uncached-theme-change", "apps/theme.tsx", ["no-unknown-classes"]);
    write("packages/ui/src/styles/globals.css", theme + utility);
    check(linter, "theme-restored", "apps/theme.tsx");
    fs.unlinkSync(path.join(temporary, "packages/ui/node_modules/tailwindcss"));
    check(
      linter,
      "missing-stylesheet-dependency-is-limited-evidence",
      "apps/theme.tsx",
      [],
      0,
      [],
      true,
    );
    linkDependency("tailwindcss", "packages/ui/node_modules/tailwindcss");
    check(linter, "stylesheet-dependency-restored", "apps/theme.tsx");
  }
  receipt.status = "passed";
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
  if (output) fs.writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx" });
}

console.log(
  `Shadcn lint qualification passed: ${rows.length} exact-outcome checks, both linters, six rules, definition boundaries, discovery and freshness.`,
);
