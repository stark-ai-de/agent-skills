import metadata from "../package.json" with { type: "json" };
import { z } from "zod";
import { validateSkillMetadata, validatePluginManifest } from "./core.mjs";

export const SERVER_INFO = Object.freeze({
  name: "stark-ai-metadata-validator",
  version: metadata.version,
});
const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
  idempotentHint: true,
};
const outputSchema = z.object({
  valid: z.boolean(),
  ruleset: z.string(),
  issues: z.array(z.object({ code: z.string(), path: z.string(), message: z.string() })),
  truncated: z.boolean(),
});
export function registerTools(server) {
  for (const [name, title, description, inputSchema, validate] of [
    [
      "validate_skill_metadata",
      "Validate skill metadata",
      "Check explicitly supplied YAML skill metadata and its directory name against pinned public rules. Metadata only; no files, URLs, shell actions, security audit or publication approval. Send only metadata you intend to share with this service.",
      z.object({ frontmatter: z.string().max(65536), directory_name: z.string().min(1) }).strict(),
      validateSkillMetadata,
    ],
    [
      "validate_plugin_manifest",
      "Validate plugin manifest",
      "Check explicitly supplied JSON plugin metadata against Agent Plugins 1.0.0 or the dated OpenAI-native metadata rules. Does not inspect ZIP contents, fetch references or establish release eligibility. Send only metadata you intend to share with this service.",
      z
        .object({
          manifest_json: z.string().max(65536),
          format: z.enum(["agent-plugins-1.0.0", "openai-native"]),
        })
        .strict(),
      validatePluginManifest,
    ],
  ])
    server.registerTool(
      name,
      { title, description, inputSchema, outputSchema, annotations },
      async (input) => {
        const output = validate(input);
        return {
          structuredContent: output,
          content: [{ type: "text", text: JSON.stringify(output) }],
        };
      },
    );
}
