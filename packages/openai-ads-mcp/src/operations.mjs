import { z } from "zod";
import snapshot from "../references/advertiser-contract.json" with { type: "json" };

// Request shapes are pinned to a reviewed public contract, not downloaded at runtime.
// Dedicated guides supply the explicitly listed corrections below.
export const CONTRACT = Object.freeze({
  source: snapshot.source,
  retrieved: snapshot.retrieved,
  sha256: snapshot.sourceSha256,
  guides: [
    "https://developers.openai.com/ads/bulk-api",
    "https://developers.openai.com/ads/product-feeds",
    "https://developers.openai.com/ads/delta-feeds",
    "https://developers.openai.com/ads/api-reference/insights",
    "https://developers.openai.com/ads/custom-audiences",
  ],
});

const identifier = {
  type: "string",
  minLength: 1,
  maxLength: 256,
  pattern: "^[A-Za-z0-9][A-Za-z0-9_-]*$",
};
const idempotency = {
  type: "string",
  minLength: 1,
  maxLength: 255,
  pattern: "^[^\\r\\n]*\\S[^\\r\\n]*$",
};
const text = (maxLength = 1000) => ({ type: "string", minLength: 1, maxLength });
const list = (items, maxItems = 1000) => ({ type: "array", items, maxItems });
const object = (properties, required = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

function resolve(schema) {
  if (Array.isArray(schema)) return schema.map(resolve);
  if (schema === null || typeof schema !== "object") return schema;
  if (schema.$ref) {
    const name = schema.$ref.split("/").at(-1);
    if (!snapshot.schemas[name]) throw new Error(`Unknown pinned schema: ${name}`);
    return resolve(snapshot.schemas[name]);
  }
  const result = Object.fromEntries(
    Object.entries(schema).map(([key, value]) => [key, resolve(value)]),
  );
  if (result.type === "object" && result.properties) result.additionalProperties = false;
  if (result.type === "integer" && result.maximum === undefined)
    result.maximum = Number.MAX_SAFE_INTEGER;
  if (result.type === "string" && result.maxLength === undefined) result.maxLength = 65536;
  if (result.type === "array" && result.maxItems === undefined) result.maxItems = 5000;
  return result;
}

const readonlyPost = new Set(["ads_query_feed_products", "ads_get_conversion_insights"]);
const credentials = new Set(["ads_create_conversion_key", "ads_configure_feed_sftp_access"]);
const descriptions = {
  ads_get_account:
    "Identify the connected Ads account and its currency/timezone. No caller-supplied key or account switching.",
  ads_update_campaign:
    "Update only authorized campaign fields. Targeting is merged with current targeting by default; replace_targeting=true explicitly replaces it. Budget amounts are integer currency micros.",
  ads_update_feed_settings:
    "Update feed settings. is_full_refresh=true makes omitted products disappear on later full SFTP uploads; only enable for explicitly authorized replacement behavior.",
  ads_update_feed_products:
    "Apply Delta updates to existing product/variant IDs: title, price, availability only. Prices use currency minor units. accepted=true is not propagation or serving; inspect products afterward.",
  ads_configure_feed_sftp_access:
    "Create or replace feed SFTP credentials. Password mode rotates the existing password. Requires a configured secure credential destination; returns a protected browser handoff, never a password.",
  ads_create_conversion_key:
    "Create a separate Conversions API key only when explicitly authorized. Requires a configured secure credential destination; returns a protected browser handoff, never the key.",
  ads_create_pixel:
    "Create a conversion pixel. The returned resource id is for event-setting source_ids; pixel_id is the browser instrumentation identifier.",
  ads_upload_image_url:
    "Upload a creative by public HTTPS image URL through OpenAI. This performs an upload and requires explicit authorization. The MCP service never fetches the URL itself.",
  ads_get_conversion_insights:
    "Read conversion totals and optional attributed events. Provide exactly one unix_range with an exclusive end spanning full days in the verified account timezone, at most 365 days. Unlike GET date_range reports, the end is exclusive. This endpoint does not paginate: reduce/split a report that exceeds its response limits.",
};

const epoch = {
  anyOf: [
    { type: "integer", minimum: 0, maximum: 4102444800 },
    { type: "string", pattern: "^[0-9]{1,10}$", maxLength: 10 },
  ],
};
const unixRange = object(
  { type: { type: "string", const: "unix_range" }, start: epoch, end: epoch },
  ["type", "start", "end"],
);
const dateRange = object(
  {
    type: { type: "string", const: "date_range" },
    since: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    until: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    timezone: text(100),
  },
  ["type", "since", "until"],
);
const hourRange = object(
  {
    type: { type: "string", const: "hour_range" },
    since: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}$" },
    until: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}$" },
    timezone: text(100),
  },
  ["type", "since", "until"],
);

function makeOperation(item) {
  const properties = item.name === "ads_get_account" ? {} : { expected_account_id: identifier };
  const required = item.name === "ads_get_account" ? [] : ["expected_account_id"];
  const queryProperties = {};
  const requiredQuery = [];
  let idempotent = item.method === "GET" || readonlyPost.has(item.name);
  for (const parameter of item.parameters) {
    if (parameter.in === "path") {
      properties[parameter.name] = identifier;
      required.push(parameter.name);
    } else if (parameter.in === "query") {
      queryProperties[parameter.name] = resolve(parameter.schema);
      if (parameter.required) requiredQuery.push(parameter.name);
    } else if (parameter.name === "Idempotency-Key") {
      properties.idempotency_key = idempotency;
      // Require the optional API protection for supported creates as a service contract.
      required.push("idempotency_key");
      idempotent = true;
    }
  }
  if (Object.keys(queryProperties).length) {
    properties.query = object(queryProperties, requiredQuery);
    if (requiredQuery.length) required.push("query");
  }
  if (item.body) {
    properties.body = resolve(item.body);
    required.push("body");
  }
  if (item.name.endsWith("_insights") && item.method === "GET") {
    properties.query.properties.time_ranges = {
      ...list({ anyOf: [dateRange, hourRange, unixRange] }, 1),
      minItems: 1,
    };
    properties.query.properties.fields.minItems = 1;
    properties.query.properties.filters = list(
      object(
        {
          field: text(256),
          operator: { type: "string", enum: ["IN", "GREATER_THAN", "LESS_THAN"] },
          value: { anyOf: [list({ type: "string", maxLength: 1000 }, 1000), { type: "number" }] },
        },
        ["field", "operator", "value"],
      ),
      100,
    );
    properties.query.properties.sort = list(
      object({ field: text(256), direction: { type: "string", enum: ["asc", "desc"] } }, [
        "field",
        "direction",
      ]),
      20,
    );
    properties.query.required = [
      ...new Set([...properties.query.required, "time_ranges", "fields"]),
    ];
    required.push("query");
  }
  if (item.name === "ads_get_conversion_insights")
    properties.body.properties.time_ranges = { ...list(unixRange, 1), minItems: 1 };
  if (item.name === "ads_merge_audiences")
    properties.body.properties.custom_audience_ids.minItems = 2;
  if (item.name === "ads_update_feed_settings")
    properties.body.properties.is_full_refresh = { type: "boolean" };
  if (item.name === "ads_update_campaign")
    properties.replace_targeting = { type: "boolean", default: false };
  if (item.name === "ads_upload_image_url") {
    properties.body = object(
      {
        image_url: { type: "string", format: "uri", maxLength: 2048 },
        purpose: resolve(snapshot.schemas.UploadImagePurposeParam),
      },
      ["image_url"],
    );
  }
  const readOnly = item.method === "GET" || readonlyPost.has(item.name);
  let description = descriptions[item.name] ?? item.name.replace(/^ads_/, "").replaceAll("_", " ");
  if (item.name.endsWith("_insights") && item.method === "GET")
    description +=
      ". GET date_range since/until are inclusive. Defaults each range to the verified account timezone. Spend is in major currency units; use canonical fields such as campaign.clicks and campaign.spend. Follow returned pagination.";
  if (item.path.startsWith("/custom_audiences"))
    description +=
      ". Custom audiences are unavailable for EEA/Switzerland targeting; require first-party data rights, intended-use eligibility, and explicit membership-change authorization. Processing is asynchronous; inspect the operation result.";
  if (!readOnly)
    description +=
      " Requires user authorization for the exact operation, target and fields. Do not automatically retry an uncertain result.";
  return {
    ...item,
    description,
    readOnly,
    credential: credentials.has(item.name),
    inputSchema: object(properties, [...new Set(required)]),
    annotations: {
      readOnlyHint: readOnly,
      destructiveHint: !readOnly,
      idempotentHint: idempotent,
      openWorldHint: true,
    },
  };
}

const bulkCreateStatus = { type: "string", enum: ["active", "paused"] };
const bulkUpdateStatus = { type: "string", enum: ["active", "paused", "archived"] };
const micros = { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER };
const name = { type: "string", minLength: 3, maxLength: 1000, pattern: "\\S" };
const bulkCreative = object(
  {
    title: { type: "string", minLength: 3, maxLength: 50 },
    body: { type: "string", maxLength: 100 },
    target_url: { type: "string", format: "uri", maxLength: 2048 },
    file_id: identifier,
  },
  ["title", "body", "target_url", "file_id"],
);
const bulkInputs = {
  "campaign.create": object(
    {
      name,
      max_budget_micros: { ...micros, minimum: 1000000 },
      billing_event_type: { type: "string", enum: ["click", "impression"] },
      budget_type: { type: "string", enum: ["daily", "lifetime"] },
      status: bulkCreateStatus,
      target_countries: list(text(2), 250),
      location_ids: list(identifier, 2500),
    },
    ["name", "max_budget_micros"],
  ),
  "campaign.update": object({
    name,
    description: text(65536),
    status: bulkUpdateStatus,
    max_budget_micros: { ...micros, minimum: 1000000 },
    budget_type: { type: "string", enum: ["daily", "lifetime"] },
    start_time: { type: "integer", minimum: 946684800, maximum: 4102444800 },
    end_time: { type: "integer", minimum: 946684800, maximum: 4102444800 },
    location_ids: list(identifier, 2500),
  }),
  "ad_group.create": object(
    {
      campaign_idempotency_key: idempotency,
      name,
      context_hints: list(text(), 2000),
      exclusion_hints: list(text(), 2000),
      max_bid_micros: micros,
      max_cpm_bid_micros: micros,
      status: bulkCreateStatus,
    },
    ["campaign_idempotency_key", "name"],
  ),
  "ad_group.update": object({
    name,
    description: text(65536),
    context_hints: list(text(), 2000),
    exclusion_hints: list(text(), 2000),
    max_bid_micros: micros,
    max_cpm_bid_micros: micros,
    status: bulkUpdateStatus,
  }),
  "ad.create": object(
    {
      campaign_idempotency_key: idempotency,
      ad_group_idempotency_key: idempotency,
      title: bulkCreative.properties.title,
      body: bulkCreative.properties.body,
      target_url: bulkCreative.properties.target_url,
      source_image_url: bulkCreative.properties.target_url,
      status: bulkCreateStatus,
    },
    [
      "campaign_idempotency_key",
      "ad_group_idempotency_key",
      "title",
      "body",
      "target_url",
      "source_image_url",
    ],
  ),
  "ad.update": object({ name, status: bulkUpdateStatus, creative: bulkCreative }),
};
const bulkOperations = {
  anyOf: Object.entries(bulkInputs).map(([type, input]) =>
    object(
      {
        operation_id: identifier,
        type: { type: "string", const: type },
        ...(type.endsWith(".create")
          ? { idempotency_key: idempotency }
          : { target_resource_id: identifier }),
        input,
      },
      [
        "operation_id",
        "type",
        type.endsWith(".create") ? "idempotency_key" : "target_resource_id",
        "input",
      ],
    ),
  ),
};

const additional = [
  {
    name: "ads_submit_bulk_job",
    method: "POST",
    path: "/bulk_mutation_jobs",
    parameters: [],
    inputSchema: object(
      {
        expected_account_id: identifier,
        idempotency_key: idempotency,
        body: object(
          {
            validate_only: { type: "boolean" },
            partial_failure: { type: "boolean" },
            operations: { type: "array", minItems: 1, maxItems: 1000, items: bulkOperations },
          },
          ["validate_only", "partial_failure", "operations"],
        ),
      },
      ["expected_account_id", "idempotency_key", "body"],
    ),
    description:
      "Submit an asynchronous Bulk API job (limited preview; requires account enablement). Set validate_only explicitly: validation still creates a server-side job and needs authorization. partial_failure=false stops later operations, never rolls back prior writes. Validation cannot guarantee target existence or execution success. Use a NEW request idempotency key when switching validation to execution; identical uncertain replays retain their original key. HTTP 202 is acceptance only; inspect job and operation results.",
    readOnly: false,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "ads_get_bulk_job",
    method: "GET",
    path: "/bulk_mutation_jobs/{job_id}",
    parameters: [],
    inputSchema: object({ expected_account_id: identifier, job_id: identifier }, [
      "expected_account_id",
      "job_id",
    ]),
    description:
      "Read a bulk job. pending/in_progress are not completion; inspect operation failures for completed, partially_failed, or failed jobs.",
    readOnly: true,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "ads_list_bulk_operations",
    method: "GET",
    path: "/bulk_mutation_jobs/{job_id}/operations",
    parameters: [],
    inputSchema: object(
      {
        expected_account_id: identifier,
        job_id: identifier,
        query: object({ limit: { type: "integer", minimum: 1, maximum: 100 }, after: identifier }),
      },
      ["expected_account_id", "job_id"],
    ),
    description:
      "Read bulk per-operation outcomes. Only paginate when complete=true; while incomplete the API ignores pagination. After completion use the last operation_id as after and follow has_more. Inspect failed/skipped operations individually.",
    readOnly: true,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "ads_upload_audience_file",
    method: "POST",
    path: "/uploads",
    parameters: [],
    inputSchema: object(
      {
        expected_account_id: identifier,
        filename: {
          type: "string",
          minLength: 1,
          maxLength: 255,
          pattern: "^[^/\\\\\\r\\n]+\\.(csv|txt)$",
        },
        mimetype: { type: "string", enum: ["text/csv", "text/plain"] },
        content_base64: {
          type: "string",
          minLength: 4,
          maxLength: 2800000,
          pattern: "^[A-Za-z0-9+/]*={0,2}$",
        },
      },
      ["expected_account_id", "filename", "mimetype", "content_base64"],
    ),
    description:
      "Upload an explicitly authorized first-party audience CSV/TXT as base64, at most 2 MiB decoded. The MCP request contains customer data; prefer normalized hashes and never send more data than authorized. Larger files require the documented direct upload workflow. Returns file ID, exact bytes, filename and MIME type for audience creation.",
    readOnly: false,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
];

export const OPERATIONS = Object.freeze(
  [...snapshot.operations.map(makeOperation), ...additional].map((operation) =>
    Object.freeze({
      ...operation,
      scope: operation.readOnly ? "ads:read" : "ads:write",
      schema: z.fromJSONSchema(operation.inputSchema),
    }),
  ),
);
export const OPERATION_BY_NAME = new Map(
  OPERATIONS.map((operation) => [operation.name, operation]),
);
