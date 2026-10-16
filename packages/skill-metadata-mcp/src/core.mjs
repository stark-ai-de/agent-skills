import Ajv2020 from "ajv/dist/2020.js";
import { load, JSON_SCHEMA } from "js-yaml";
import portableSchema from "../../../scripts/vendor/agent-plugins/1.0.0/plugin.schema.json" with { type: "json" };
import nativeSchema from "../rules/openai-native-2026-10-16.schema.json" with { type: "json" };

export const LIMITS = Object.freeze({
  documentBytes: 65536,
  requestBytes: 131072,
  depth: 20,
  issues: 100,
});
export const RULESETS = Object.freeze({
  skill: "agent-skills-metadata-2026-10-16",
  "agent-plugins-1.0.0": "agent-plugins-1.0.0",
  "openai-native": "openai-native-metadata-2026-10-16",
});
const validators = Object.fromEntries(
  Object.entries({ "agent-plugins-1.0.0": portableSchema, "openai-native": nativeSchema }).map(
    ([format, schema]) => [format, new Ajv2020({ allErrors: true, strict: true }).compile(schema)],
  ),
);
const pointer = (key) => String(key).replaceAll("~", "~0").replaceAll("/", "~1");
const issue = (code, path, message) => ({ code, path, message });
const mapping = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
function result(ruleset, issues) {
  issues.sort((a, b) =>
    a.path < b.path
      ? -1
      : a.path > b.path
        ? 1
        : a.code < b.code
          ? -1
          : a.code > b.code
            ? 1
            : a.message < b.message
              ? -1
              : a.message > b.message
                ? 1
                : 0,
  );
  return {
    valid: issues.length === 0,
    ruleset,
    issues: issues.slice(0, LIMITS.issues),
    truncated: issues.length > LIMITS.issues,
  };
}
function parseDocument(text, kind) {
  if (typeof text !== "string")
    return { error: issue("input.type", "/", "Document must be a string.") };
  if (Buffer.byteLength(text, "utf8") > LIMITS.documentBytes)
    return { error: issue("input.size", "/", "Document exceeds 64 KiB UTF-8.") };
  let value;
  try {
    value =
      kind === "yaml"
        ? load(text, { schema: JSON_SCHEMA, maxAliases: 0, maxDepth: LIMITS.depth })
        : JSON.parse(text);
  } catch {
    return {
      error: issue(
        "input.parse",
        "/",
        kind === "yaml"
          ? "Expected one YAML document without aliases or custom tags, within the nesting limit."
          : "Expected valid JSON.",
      ),
    };
  }
  if (!mapping(value))
    return { error: issue("input.mapping", "/", "Document must be an object mapping.") };
  if (!withinDepth(value))
    return { error: issue("input.depth", "/", "Document exceeds the nesting limit.") };
  return { value };
}
export function withinDepth(value) {
  const pending = [[value, 0]];
  while (pending.length) {
    const [node, depth] = pending.pop();
    if (node !== null && typeof node === "object") {
      if (depth > LIMITS.depth) return false;
      for (const child of Object.values(node)) pending.push([child, depth + 1]);
    }
  }
  return true;
}
export function validateSkillMetadata({ frontmatter, directory_name }) {
  const { value, error } = parseDocument(frontmatter, "yaml");
  if (error) return result(RULESETS.skill, [error]);
  const issues = [];
  if (
    typeof value.name !== "string" ||
    value.name.length < 1 ||
    value.name.length > 64 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.name)
  )
    issues.push(
      issue(
        "skill.name",
        "/name",
        "Use 1–64 lowercase ASCII letters, digits and single separating hyphens.",
      ),
    );
  if (
    typeof directory_name !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(directory_name) ||
    directory_name.length > 64
  )
    issues.push(
      issue("skill.directory", "/directory_name", "Provide one skill directory name, not a path."),
    );
  if (typeof value.name === "string" && value.name !== directory_name)
    issues.push(
      issue("skill.directory_mismatch", "/name", "Skill name must equal its directory name."),
    );
  if (
    typeof value.description !== "string" ||
    !value.description.trim() ||
    [...value.description].length > 1024
  )
    issues.push(
      issue(
        "skill.description",
        "/description",
        "Description must be a non-empty string of at most 1024 characters.",
      ),
    );
  for (const key of ["license", "compatibility", "allowed-tools"]) {
    if (
      Object.hasOwn(value, key) &&
      (typeof value[key] !== "string" ||
        !value[key].trim() ||
        (key === "compatibility" && [...value[key]].length > 500))
    )
      issues.push(
        issue(
          "skill.field",
          `/${key}`,
          key === "compatibility"
            ? "Compatibility must be a non-empty string of at most 500 characters."
            : "Optional field must be a non-empty string.",
        ),
      );
  }
  if (Object.hasOwn(value, "metadata")) {
    if (!mapping(value.metadata))
      issues.push(
        issue("skill.metadata", "/metadata", "Metadata must map string keys to string values."),
      );
    else
      for (const [key, child] of Object.entries(value.metadata))
        if (typeof child !== "string")
          issues.push(
            issue(
              "skill.metadata_value",
              `/metadata/${pointer(key)}`,
              "Metadata values must be strings.",
            ),
          );
  }
  return result(RULESETS.skill, issues);
}
export function validatePluginManifest({ manifest_json, format }) {
  if (!Object.hasOwn(validators, format))
    return result("unsupported", [
      issue("manifest.format", "/format", "Select agent-plugins-1.0.0 or openai-native."),
    ]);
  const { value, error } = parseDocument(manifest_json, "json");
  if (error) return result(RULESETS[format], [error]);
  const validate = validators[format];
  validate(value);
  const issues = (validate.errors ?? []).map((error) =>
    issue(`schema.${error.keyword}`, error.instancePath || "/", error.message),
  );
  return result(RULESETS[format], issues);
}
