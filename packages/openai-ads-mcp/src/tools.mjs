import { z } from "zod";
import metadata from "../package.json" with { type: "json" };
import { AdsClientError, sanitize } from "./ads-client.mjs";
import { OPERATIONS } from "./operations.mjs";

export const SERVER_INFO = Object.freeze({ name: "stark-ai-ads", version: metadata.version });
const resultSchema = z
  .object({
    ok: z.boolean(),
    account: z
      .object({ id: z.string(), currency_code: z.string(), timezone: z.string() })
      .optional(),
    outcome: z.enum(["read", "accepted", "api_returned_success"]).optional(),
    data: z.record(z.string(), z.unknown()).optional(),
    verification: z
      .object({
        status: z.string(),
        resource: z.record(z.string(), z.unknown()).optional(),
        error: z.string().optional(),
        message: z.string().optional(),
      })
      .optional(),
    pagination: z
      .object({
        complete: z.boolean(),
        snapshot_complete: z.boolean(),
        has_more: z.boolean(),
        next_after: z.string().nullable(),
        next_before: z.string().nullable().optional(),
        cursor_parameter: z.enum(["cursor", "after", "before"]),
        warning: z.string().optional(),
      })
      .optional(),
    credential: z
      .object({ url: z.string(), expiresAt: z.union([z.number(), z.string()]) })
      .optional(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        status: z.number().optional(),
        uncertain: z.boolean(),
        details: z.unknown().optional(),
      })
      .optional(),
  })
  .strict();

function response(output, isError = false, extra = {}) {
  return {
    structuredContent: output,
    content: [{ type: "text", text: JSON.stringify(output) }],
    ...(isError ? { isError: true } : {}),
    ...extra,
  };
}

export function registerTools(
  server,
  { principal, adsClient, credentialSink, resourceMetadataUrl } = {},
) {
  if (!adsClient || typeof adsClient.execute !== "function")
    throw new Error("An Ads client is required.");
  for (const operation of OPERATIONS) {
    server.registerTool(
      operation.name,
      {
        title: operation.name
          .slice(4)
          .replaceAll("_", " ")
          .replace(/^./, (letter) => letter.toUpperCase()),
        description: operation.description,
        inputSchema: operation.schema,
        outputSchema: resultSchema,
        annotations: operation.annotations,
        _meta: { securitySchemes: [{ type: "oauth2", scopes: [operation.scope] }] },
      },
      async (input) => {
        try {
          const scopes = new Set(principal?.scopes ?? []);
          if (!principal?.accountId || !scopes.has(operation.scope)) {
            const challenge = `Bearer ${resourceMetadataUrl ? `resource_metadata="${resourceMetadataUrl}", ` : ""}error="insufficient_scope", error_description="Connect an Ads account with the required permission", scope="${operation.scope}"`;
            return response(
              {
                ok: false,
                error: {
                  code: "insufficient_scope",
                  message: `This tool requires ${operation.scope}. Reconnect with the required permission.`,
                  uncertain: false,
                },
              },
              true,
              { _meta: { "mcp/www_authenticate": [challenge] } },
            );
          }
          if (
            operation.name !== "ads_get_account" &&
            input.expected_account_id !== principal.accountId
          )
            throw new AdsClientError(
              "account_mismatch",
              "expected_account_id must match the OAuth-connected account.",
            );
          const result = await adsClient.execute(operation, input, { credentialSink });
          return response(sanitize({ ok: true, ...result }, [principal.apiKey]));
        } catch (error) {
          const details =
            error instanceof AdsClientError
              ? {
                  code: error.code,
                  message: error.message,
                  ...(error.status !== undefined ? { status: error.status } : {}),
                  uncertain: error.uncertain,
                  ...(error.details !== undefined ? { details: error.details } : {}),
                }
              : {
                  code: "internal_error",
                  message:
                    "The Ads operation could not be completed. Inspect state before retrying a write.",
                  uncertain: !operation.readOnly,
                };
          return response(sanitize({ ok: false, error: details }, [principal?.apiKey]), true);
        }
      },
    );
  }
}
