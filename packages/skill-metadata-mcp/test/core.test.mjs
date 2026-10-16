import assert from "node:assert/strict";
import test from "node:test";
import {
  validateSkillMetadata as skill,
  validatePluginManifest as plugin,
  LIMITS,
} from "../src/core.mjs";
const example = {
  frontmatter: "name: example-skill\ndescription: Validate supplied metadata.\n",
  directory_name: "example-skill",
};
test("public skill metadata and optional fields", () => {
  assert.equal(skill(example).valid, true);
  assert.equal(
    skill({
      ...example,
      frontmatter: `${example.frontmatter}license: MIT\ncompatibility: Node.js\nallowed-tools: Read\nmetadata:\n  version: '1.0'\n`,
    }).valid,
    true,
  );
  assert.equal(
    skill({ ...example, frontmatter: example.frontmatter + "category: arbitrary\n" }).valid,
    true,
  );
});
test("required fields, types, directory rules and deterministic findings", () => {
  for (const input of [
    "{}",
    "name: Wrong\ndescription: ok",
    "name: example-skill",
    "name: example-skill\ndescription: 12",
    "name: example-skill\ndescription: ''",
    "name: example--skill\ndescription: ok",
  ]) {
    const a = skill({ ...example, frontmatter: input });
    assert.equal(a.valid, false);
    assert.deepEqual(a, skill({ ...example, frontmatter: input }));
  }
  assert.equal(skill({ ...example, directory_name: "../example-skill" }).valid, false);
  assert.equal(skill({ ...example, directory_name: "other" }).valid, false);
});
test("reject unsafe YAML construction, malformed and multiple documents", () => {
  for (const frontmatter of [
    "[",
    "[]",
    "name: x\nname: y",
    "x: !custom value",
    "x: &a [1]\ny: *a",
    "x: &a [*a]",
    "{}\n---\n{}",
    "x: !!js/function function(){}",
    `x: ${"[".repeat(30)}0${"]".repeat(30)}`,
  ])
    assert.equal(skill({ ...example, frontmatter }).valid, false, frontmatter);
  assert.equal(
    skill({ ...example, frontmatter: `${example.frontmatter}metadata:\n  note: '*literal'\n` })
      .valid,
    true,
  );
});
test("UTF-8 size, nesting and findings are bounded", () => {
  assert.equal(skill({ ...example, frontmatter: "é".repeat(40000) }).issues[0].code, "input.size");
  assert.equal(
    plugin({ format: "openai-native", manifest_json: '{"x":'.repeat(24) + "0" + "}".repeat(24) })
      .issues[0].code,
    "input.depth",
  );
  const findings = skill({
    ...example,
    frontmatter:
      example.frontmatter +
      "metadata:\n" +
      Array.from({ length: 150 }, (_, i) => `  key${i}: 12`).join("\n"),
  });
  assert.equal(findings.issues.length, LIMITS.issues);
  assert.equal(findings.truncated, true);
  assert.equal(findings.valid, false);
  assert.equal(
    JSON.stringify(skill({ ...example, frontmatter: "SECRET_VALUE: [" })).includes("SECRET_VALUE"),
    false,
  );
});
test("portable schema and dated OpenAI metadata rules have explicit boundaries", () => {
  assert.equal(
    plugin({
      format: "agent-plugins-1.0.0",
      manifest_json: JSON.stringify({
        $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
        name: "example",
      }),
    }).valid,
    true,
  );
  assert.equal(
    plugin({
      format: "openai-native",
      manifest_json: JSON.stringify({
        name: "example",
        version: "1.0.0",
        skills: "./skills/",
        mcpServers: "./.mcp.json",
      }),
    }).valid,
    true,
  );
  for (const manifest_json of ["[", "[]", "{}", '{"name":"example","version":12}'])
    assert.equal(plugin({ format: "openai-native", manifest_json }).valid, false);
  assert.equal(plugin({ format: "unknown", manifest_json: "{}" }).valid, false);
});

test("aliases fail at parsing even with otherwise valid skill fields", () => {
  const output = skill({ ...example, frontmatter: example.frontmatter + "a: &a [1]\nb: *a\n" });
  assert.equal(output.valid, false);
  assert.equal(output.issues[0].code, "input.parse");
});
test("OpenAI versions follow complete SemVer prerelease and build rules", () => {
  for (const [version, expected] of [
    ["1.0.0", true],
    ["0.0.0", true],
    ["1.2.3-alpha.1+build.7", true],
    ["1.0.0-0", true],
    ["1.0.0-x-y-z.--", true],
    ["1.2.3+001", true],
    ["01.2.3", false],
    ["1.2.3-01", false],
    ["1.2.3-alpha..1", false],
    ["1.2.3+..", false],
    ["1.2.3+", false],
    ["1.2.3.4", false],
  ])
    assert.equal(
      plugin({
        format: "openai-native",
        manifest_json: JSON.stringify({ name: "example", version }),
      }).valid,
      expected,
      version,
    );
});
