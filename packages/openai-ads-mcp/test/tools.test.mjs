import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { registerTools } from "../src/tools.mjs";
import { OPERATIONS, OPERATION_BY_NAME } from "../src/operations.mjs";
import { createAdsClient } from "../src/ads-client.mjs";
import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import snapshot from "../references/advertiser-contract.json" with { type: "json" };
import { projectContract, projectSchema } from "../scripts/refresh-contract.mjs";

function registered(scopes = ["ads:read"], overrides = {}) {
  const tools = new Map();
  const calls = [];
  registerTools(
    {
      registerTool(name, config, handler) {
        tools.set(name, { config, handler });
      },
    },
    {
      principal: { accountId: "adacct_test", apiKey: "private-key", scopes, grantId: "grant_one" },
      adsClient: {
        execute: async (...args) => {
          calls.push(args);
          return {
            outcome: "read",
            account: { id: "adacct_test", currency_code: "EUR", timezone: "Europe/Berlin" },
            data: {},
            verification: { status: "read" },
          };
        },
      },
      ...overrides,
    },
  );
  return { tools, calls };
}

test("every published tool has a strict serializable schema, explicit scope and behavioral annotations", () => {
  const { tools } = registered();
  assert.equal(tools.size, OPERATIONS.length);
  for (const operation of OPERATIONS) {
    const { config } = tools.get(operation.name);
    const schema = z.toJSONSchema(config.inputSchema);
    assert.equal(schema.additionalProperties, false);
    assert.ok(!Object.hasOwn(schema.properties, "api_key"));
    assert.ok(!Object.hasOwn(schema.properties, "base_url"));
    assert.deepEqual(config._meta.securitySchemes, [{ type: "oauth2", scopes: [operation.scope] }]);
    assert.equal(config.annotations.readOnlyHint, operation.readOnly);
    assert.ok(config.outputSchema);
  }
});

test("read-only connection cannot invoke a write or server-side validation", async () => {
  const { tools, calls } = registered();
  const denied = await tools
    .get("ads_pause_campaign")
    .handler({ expected_account_id: "adacct_test", campaign_id: "cmpn_one" });
  assert.equal(denied.isError, true);
  assert.equal(denied.structuredContent.error.code, "insufficient_scope");
  assert.equal(calls.length, 0);
  const validated = await tools.get("ads_submit_bulk_job").handler({});
  assert.equal(validated.structuredContent.error.code, "insufficient_scope");
  assert.equal(calls.length, 0);
});

test("principal account is enforced independently of caller and API client's identity", async () => {
  const { tools, calls } = registered(["ads:read", "ads:write"]);
  const denied = await tools
    .get("ads_pause_campaign")
    .handler({ expected_account_id: "adacct_other", campaign_id: "cmpn_one" });
  assert.equal(denied.structuredContent.error.code, "account_mismatch");
  assert.equal(calls.length, 0);
});

test("unexpected implementation errors never expose key material", async () => {
  const { tools } = registered(["ads:read"], {
    adsClient: {
      execute: async () => {
        throw new Error("failed private-key");
      },
    },
  });
  const result = await tools.get("ads_get_account").handler({});
  assert.equal(result.isError, true);
  assert.ok(!JSON.stringify(result).includes("private-key"));
});

test("schema rejects path escape, unknown fields and noninteger money before calls", () => {
  const op = OPERATION_BY_NAME.get("ads_create_campaign");
  const good = {
    expected_account_id: "adacct_test",
    idempotency_key: "create-one",
    body: {
      name: "Test campaign",
      status: "paused",
      budget: { daily_spend_limit_micros: 1000000 },
      targeting: { platforms: { included: ["desktop_web", "ios_web", "android_web"] } },
    },
  };
  assert.equal(op.schema.safeParse(good).success, true);
  assert.equal(op.schema.safeParse({ ...good, api_key: "wrong" }).success, false);
  assert.equal(
    op.schema.safeParse({
      ...good,
      body: { ...good.body, budget: { daily_spend_limit_micros: 1.5 } },
    }).success,
    false,
  );
  assert.equal(
    OPERATION_BY_NAME.get("ads_get_campaign").schema.safeParse({
      expected_account_id: "adacct_test",
      campaign_id: "../other",
    }).success,
    false,
  );
});

test("pinned request schemas retain every API field named title or description", () => {
  const expectedProperties = {
    CreateAdCreativeParams: [
      "file_ids",
      "type",
      "title",
      "body",
      "price",
      "target_url",
      "file_id",
      "image_crop",
    ],
    CreateAdGroupBody: [
      "campaign_id",
      "name",
      "description",
      "context_hints",
      "status",
      "bidding_config",
      "product_set",
      "landing_page_configuration",
    ],
    CreateCampaignBody: [
      "name",
      "description",
      "start_time",
      "end_time",
      "status",
      "budget",
      "bidding_type",
      "objective",
      "billing_event_type",
      "mode",
      "product_feed_id",
      "business_agent_id",
      "targeting",
      "landing_page_configuration",
      "conversion_event_setting_ids",
    ],
    CreateCustomAudienceBody: [
      "name",
      "description",
      "file_id",
      "identifier_type",
      "identifier_resolution",
      "filename",
      "mimetype",
      "file_size",
    ],
    ProductFeedDeltaVariantBodyParam: ["id", "title", "price", "availability"],
    UpdateAdCreativeParams: [
      "file_ids",
      "type",
      "title",
      "body",
      "price",
      "target_url",
      "file_id",
      "image_crop",
    ],
    UpdateAdGroupBody: [
      "name",
      "description",
      "context_hints",
      "status",
      "bidding_config",
      "product_set",
      "landing_page_configuration",
    ],
    UpdateCampaignBody: [
      "name",
      "description",
      "start_time",
      "end_time",
      "status",
      "budget",
      "targeting",
      "landing_page_configuration",
      "conversion_event_setting_ids",
    ],
  };
  for (const [name, properties] of Object.entries(expectedProperties))
    assert.deepEqual(Object.keys(snapshot.schemas[name].properties), properties, name);
  for (const [name, schema] of Object.entries(snapshot.schemas))
    for (const required of schema.required ?? [])
      assert.ok(
        Object.hasOwn(schema.properties ?? {}, required),
        `${name}.${required} needs a schema`,
      );
});

test("ad creation and creative updates require and preserve the documented title", () => {
  const creative = {
    type: "chat_card",
    title: "Example ad",
    body: "Example body",
    target_url: "https://example.com/",
    file_id: "file_one",
  };
  const cases = [
    [
      "ads_create_ad",
      {
        expected_account_id: "adacct_test",
        idempotency_key: "create-one",
        body: { name: "Example ad", ad_group_id: "adgrp_one", status: "paused", creative },
      },
    ],
    [
      "ads_update_ad",
      {
        expected_account_id: "adacct_test",
        ad_id: "ad_one",
        body: { creative },
      },
    ],
  ];
  for (const [name, args] of cases) {
    const schema = OPERATION_BY_NAME.get(name).schema;
    assert.equal(schema.parse(args).body.creative.title, creative.title);
    const missingTitle = structuredClone(args);
    delete missingTitle.body.creative.title;
    assert.equal(schema.safeParse(missingTitle).success, false, name);
  }
  assert.equal(
    OPERATION_BY_NAME.get("ads_update_campaign").schema.safeParse({
      expected_account_id: "adacct_test",
      campaign_id: "cmpn_one",
      body: { description: null },
    }).success,
    true,
  );
  assert.equal(
    OPERATION_BY_NAME.get("ads_update_feed_products").schema.safeParse({
      expected_account_id: "adacct_test",
      feed_id: "feed_one",
      body: {
        products: [{ id: "sku_one", variants: [{ id: "sku_one", title: "Updated product" }] }],
      },
    }).success,
    true,
  );
});

test("contract projection distinguishes schema annotations from field names and literal data", () => {
  const names = ["title", "description", "default", "example", "examples", "x-internal"];
  const literal = Object.fromEntries(names.map((name) => [name, `literal ${name}`]));
  const projected = projectSchema({
    type: "object",
    title: "Annotation",
    description: "Annotation",
    example: {},
    "x-internal": {},
    properties: Object.fromEntries(
      names.map((name) => [
        name,
        {
          type: "string",
          title: "Annotation",
          description: "Annotation",
          example: "Sample",
          default: "Default",
        },
      ]),
    ),
    required: names,
    default: literal,
    enum: [literal],
    const: literal,
  });
  assert.deepEqual(Object.keys(projected.properties), names);
  for (const name of names)
    assert.deepEqual(projected.properties[name], { type: "string", default: "Default" });
  assert.equal(projected.title, undefined);
  assert.equal(projected.description, undefined);
  assert.equal(projected.example, undefined);
  assert.equal(projected["x-internal"], undefined);
  assert.deepEqual(projected.default, literal);
  assert.deepEqual(projected.enum, [literal]);
  assert.deepEqual(projected.const, literal);
});

test("contract regeneration keeps the reviewed operation allowlist and follows request references", () => {
  const upstream = {
    paths: {},
    components: {
      schemas: {
        Parent: {
          type: "object",
          properties: { description: { $ref: "#/components/schemas/Child" } },
        },
        Child: { type: "object", properties: { title: { type: "string" } }, required: ["title"] },
        Unused: { type: "string" },
      },
    },
  };
  for (const { method, path } of snapshot.operations)
    (upstream.paths[path] ??= {})[method.toLowerCase()] = { parameters: [] };
  upstream.paths["/campaigns"].post.requestBody = {
    content: { "application/json": { schema: { $ref: "#/components/schemas/Parent" } } },
  };
  upstream.paths["/unreviewed"] = { post: { parameters: [] } };
  const raw = JSON.stringify(upstream);
  const projected = projectContract(raw, "2026-11-23");
  assert.deepEqual(
    projected.operations.map(({ name, method, path }) => ({ name, method, path })),
    snapshot.operations.map(({ name, method, path }) => ({ name, method, path })),
  );
  assert.deepEqual(Object.keys(projected.schemas), ["Child", "Parent"]);
  assert.deepEqual(projected.schemas.Parent.properties.description, {
    $ref: "#/components/schemas/Child",
  });
  assert.deepEqual(projected.schemas.Child.properties.title, { type: "string" });
  assert.deepEqual(projectContract(raw, "2026-11-23"), projected);
});

test("bulk schema models guide-specific operations and rejects duplicate IDs and invalid parents", async () => {
  const client = createAdsClient({
    apiKey: "test-key",
    expectedAccountId: "adacct_test",
    fetchImpl: () => {
      throw new Error("must not call");
    },
  });
  const operation = {
    operation_id: "pause-one",
    type: "campaign.update",
    target_resource_id: "cmpn_one",
    input: { status: "paused" },
  };
  const args = {
    expected_account_id: "adacct_test",
    idempotency_key: "validate-one",
    body: { validate_only: true, partial_failure: false, operations: [operation, operation] },
  };
  await assert.rejects(
    client.execute("ads_submit_bulk_job", args),
    (error) => error.code === "invalid_arguments",
  );
  assert.equal(
    OPERATION_BY_NAME.get("ads_list_bulk_operations").schema.safeParse({
      expected_account_id: "adacct_test",
      job_id: "job_one",
      query: { limit: 101 },
    }).success,
    false,
  );
});

test("real SDK serves discoverable typed tools and a successful tool call", async () => {
  const backwardPage = {
    complete: false,
    snapshot_complete: true,
    has_more: true,
    next_after: null,
    next_before: "cmpn_first",
    cursor_parameter: "before",
  };
  const handler = createMcpHandler(
    () => {
      const server = new McpServer({ name: "ads-test", version: "0.1.0" });
      registerTools(server, {
        principal: { accountId: "adacct_test", scopes: ["ads:read"] },
        adsClient: {
          execute: async (operation) => ({
            outcome: "read",
            account: { id: "adacct_test", currency_code: "EUR", timezone: "Europe/Berlin" },
            data: { id: "adacct_test" },
            verification: { status: "account_verified" },
            ...(operation.name === "ads_list_campaigns" ? { pagination: backwardPage } : {}),
          }),
        },
      });
      return server;
    },
    { legacy: "stateless" },
  );
  try {
    async function rpc(method, params) {
      const result = await handler.fetch(
        new Request("http://localhost/mcp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json, text/event-stream",
            "MCP-Protocol-Version": "2025-11-25",
          },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        }),
      );
      assert.equal(result.status, 200);
      const raw = await result.text();
      return JSON.parse(
        raw.startsWith("event:")
          ? raw
              .split("\n")
              .find((line) => line.startsWith("data: "))
              .slice(6)
          : raw,
      );
    }
    const listed = await rpc("tools/list", {});
    assert.equal(listed.result.tools.length, OPERATIONS.length);
    const account = await rpc("tools/call", { name: "ads_get_account", arguments: {} });
    assert.equal(account.result.structuredContent.ok, true);
    assert.equal(account.result.structuredContent.data.id, "adacct_test");
    const page = await rpc("tools/call", {
      name: "ads_list_campaigns",
      arguments: { expected_account_id: "adacct_test", query: { before: "cmpn_prior" } },
    });
    assert.equal(page.result.structuredContent.ok, true);
    assert.deepEqual(page.result.structuredContent.pagination, backwardPage);
  } finally {
    await handler.close();
  }
});
