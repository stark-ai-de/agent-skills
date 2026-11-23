import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { createAdsClient, AdsClientError, sanitize } from "../src/ads-client.mjs";
import { OPERATION_BY_NAME } from "../src/operations.mjs";

const account = {
  id: "adacct_test",
  name: "Test account",
  currency_code: "EUR",
  timezone: "Europe/Berlin",
};
const key = "test-advertiser-key-never-expose";
function mockClient(responses, options = {}) {
  const calls = [];
  const client = createAdsClient({
    apiKey: key,
    expectedAccountId: account.id,
    ...options,
    fetchImpl: async (url, init) => {
      calls.push({ url: new URL(url), init });
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return response instanceof Response ? response : Response.json(response);
    },
  });
  return { client, calls };
}
const execute = (client, name, args, extra) =>
  client.execute(OPERATION_BY_NAME.get(name), { expected_account_id: account.id, ...args }, extra);

test("credential URL redaction preserves schemes/users and covers multiple or relative URLs", () => {
  assert.equal(
    sanitize(
      "SFTP://user:first-secret@files.example/path https://other:second:secret@web.example/?a=1 //:empty-user-secret@relative.example",
    ),
    "SFTP://user:[REDACTED]@files.example/path https://other:[REDACTED]@web.example/?a=1 //:[REDACTED]@relative.example",
  );
  assert.equal(
    sanitize("custom+scheme://user:percent%2Fencoded@host"),
    "custom+scheme://user:[REDACTED]@host",
  );
  for (const plain of [
    "https://host.example/path:value@example",
    "https://host.example/path",
    "//name:value without an at-sign",
  ])
    assert.equal(sanitize(plain), plain);
});

test("large sanitizer inputs finish within an externally enforced CPU regression budget", () => {
  const source = new URL("../src/ads-client.mjs", import.meta.url).href;
  const script = `
    import assert from 'node:assert/strict';
    import { sanitize } from ${JSON.stringify(source)};
    const plain = 'x'.repeat(1024 * 1024);
    assert.equal(sanitize(plain), plain);
    assert.equal(sanitize('//' + plain), '//' + plain);
    assert.equal(sanitize('sftp://user:' + plain + '@host'), 'sftp://user:[REDACTED]@host');
    assert.equal(sanitize('/'.repeat(1024 * 1024)), '/'.repeat(1024 * 1024));
  `;
  // A node:test timer cannot interrupt a synchronous regex loop. The parent
  // process must kill a regressed child instead of hanging the whole test suite.
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    timeout: 5000,
    encoding: "utf8",
    maxBuffer: 4096,
  });
  assert.equal(result.error, undefined, "Sanitizer subprocess exceeded its external time budget.");
  assert.equal(result.status, 0, result.stderr);
});

test("report serializes canonical fields, inclusive range, attribution and account timezone", async () => {
  const { client, calls } = mockClient([
    account,
    { data: [{ id: "one", campaign_spend: 12.34 }], has_more: true, last_id: "one" },
  ]);
  const result = await execute(client, "ads_get_account_insights", {
    query: {
      fields: ["campaign.id", "campaign.clicks", "campaign.spend"],
      time_ranges: [{ type: "date_range", since: "2026-11-16", until: "2026-11-22" }],
      attribution_window_days: 7,
      view_through_attribution_window_days: 0,
      attribution_time_basis: "conversion_time",
    },
  });
  assert.deepEqual(calls[1].url.searchParams.getAll("fields[]"), [
    "campaign.id",
    "campaign.clicks",
    "campaign.spend",
  ]);
  assert.deepEqual(JSON.parse(calls[1].url.searchParams.get("time_ranges[]")), {
    type: "date_range",
    since: "2026-11-16",
    until: "2026-11-22",
    timezone: "Europe/Berlin",
  });
  assert.equal(calls[1].url.searchParams.get("view_through_attribution_window_days"), "0");
  assert.equal(calls[1].init.headers.Authorization, `Bearer ${key}`);
  assert.equal(calls[1].init.redirect, "error");
  assert.equal(result.pagination.next_after, "one");
  assert.equal(result.pagination.complete, false);
  assert.equal(result.data.data[0].campaign_spend, 12.34);
});

test("account mismatch blocks resource calls and user input cannot switch account", async () => {
  const { client, calls } = mockClient([{ ...account, id: "adacct_other" }]);
  await assert.rejects(
    execute(client, "ads_pause_campaign", { campaign_id: "cmpn_one" }),
    (error) => error.code === "account_mismatch",
  );
  assert.equal(calls.length, 1);
  const second = mockClient([]);
  await assert.rejects(
    second.client.execute(OPERATION_BY_NAME.get("ads_list_campaigns"), {
      expected_account_id: "adacct_other",
    }),
    (error) => error.code === "account_mismatch",
  );
  assert.equal(second.calls.length, 0);
});

test("campaign platform changes preserve existing location/audience siblings and verify readback", async () => {
  const before = {
    id: "cmpn_one",
    targeting: {
      locations: { countries: ["US"] },
      custom_audiences: { ids: ["caud_one"] },
      platforms: { included: ["web"] },
    },
  };
  const after = {
    ...before,
    targeting: { ...before.targeting, platforms: { included: ["desktop_web"] } },
  };
  const { client, calls } = mockClient([account, before, after, after]);
  const result = await execute(client, "ads_update_campaign", {
    campaign_id: "cmpn_one",
    body: { targeting: { platforms: { included: ["desktop_web"] } } },
  });
  assert.deepEqual(JSON.parse(calls[2].init.body).targeting, after.targeting);
  assert.equal(result.verification.status, "read_back");
});

test("timeout during a write is uncertain and is never automatically retried", async () => {
  const { client, calls } = mockClient([account, new Error(`network ${key}`)]);
  await assert.rejects(
    execute(client, "ads_pause_campaign", { campaign_id: "cmpn_one" }),
    (error) => {
      assert.equal(error.uncertain, true);
      assert.equal(error.code, "transport_error");
      assert.ok(!JSON.stringify(error).includes(key));
      return true;
    },
  );
  assert.equal(calls.length, 2);
});

test("API errors preserve status and useful code while redacting credentials", async () => {
  const { client } = mockClient([
    account,
    Response.json(
      {
        error: {
          code: "feed_not_enabled",
          message: `No access for ${key}`,
          api_key: "another-secret",
        },
      },
      { status: 403 },
    ),
  ]);
  await assert.rejects(execute(client, "ads_list_feeds", {}), (error) => {
    assert.ok(error instanceof AdsClientError);
    assert.equal(error.status, 403);
    assert.equal(error.details.error.code, "feed_not_enabled");
    assert.ok(!JSON.stringify(error).includes(key));
    assert.ok(!JSON.stringify(error).includes("another-secret"));
    return true;
  });
});

test("credential provisioning requires destination before any API call and never returns the secret", async () => {
  const first = mockClient([]);
  await assert.rejects(
    execute(first.client, "ads_create_conversion_key", { body: { name: "Server events" } }),
    (error) => error.code === "credential_destination_required",
  );
  assert.equal(first.calls.length, 0);
  const { client } = mockClient([account, { name: "Server events", api_key: "issued-secret" }]);
  let delivered;
  const result = await execute(
    client,
    "ads_create_conversion_key",
    { body: { name: "Server events" } },
    {
      credentialSink: async (value) => {
        delivered = value;
        return { url: "https://ads.example.test/credentials/handoff", expiresAt: 12345 };
      },
    },
  );
  assert.equal(delivered.value.api_key, "issued-secret");
  assert.equal(result.credential.url, "https://ads.example.test/credentials/handoff");
  assert.ok(!JSON.stringify(result).includes("issued-secret"));
});

test("bulk incomplete results never manufacture a pagination cursor", async () => {
  const { client } = mockClient([
    account,
    {
      complete: false,
      has_more: true,
      data: [{ operation_id: "op-one", status: "failed", error: "temporary" }],
    },
  ]);
  const result = await execute(client, "ads_list_bulk_operations", { job_id: "blkmtnjob_one" });
  assert.equal(result.pagination.complete, false);
  assert.equal(result.pagination.next_after, null);
  assert.equal(result.data.data[0].status, "failed");
});

test("Delta updates preserve price minor units and acceptance remains pending", async () => {
  const { client, calls } = mockClient([account, { id: "fd_one", accepted: true }]);
  const result = await execute(client, "ads_update_feed_products", {
    feed_id: "fd_one",
    body: {
      products: [
        { id: "SKU-001", variants: [{ id: "SKU-001", price: { amount: 7999, currency: "USD" } }] },
      ],
    },
  });
  assert.equal(JSON.parse(calls[1].init.body).products[0].variants[0].price.amount, 7999);
  assert.equal(result.outcome, "accepted");
  assert.equal(result.verification.status, "pending");
});

test("response body bounds and redirects stop safely", async () => {
  const { client } = mockClient(
    [account, new Response("x".repeat(1025), { headers: { "content-type": "application/json" } })],
    { maxResponseBytes: 1024 },
  );
  await assert.rejects(
    execute(client, "ads_list_campaigns", {}),
    (error) => error.code === "response_too_large",
  );
});

test("conversion report keeps its exclusive end and validates account-local midnight", async () => {
  const start = Date.parse("2026-11-16T00:00:00+01:00") / 1000;
  const end = Date.parse("2026-11-23T00:00:00+01:00") / 1000;
  const { client, calls } = mockClient([account, { data: [], count: 0, account_currency: "EUR" }]);
  await execute(client, "ads_get_conversion_insights", {
    body: {
      aggregation_level: "campaign",
      entity_ids: ["cmpn_one"],
      time_ranges: [{ type: "unix_range", start, end }],
    },
  });
  assert.deepEqual(JSON.parse(JSON.parse(calls[1].init.body).time_ranges[0]), {
    type: "unix_range",
    start: String(start),
    end: String(end),
  });
  const bad = mockClient([account]);
  await assert.rejects(
    execute(bad.client, "ads_get_conversion_insights", {
      body: {
        aggregation_level: "campaign",
        time_ranges: [{ type: "unix_range", start: start + 1, end }],
      },
    }),
    (error) => error.code === "invalid_arguments",
  );
  assert.equal(bad.calls.length, 1);
});

test("audience file upload uses multipart and exact bytes, without returning audience data", async () => {
  const bytes = Buffer.from("email_sha256\n" + "a".repeat(64) + "\n");
  const { client, calls } = mockClient([account, { file_id: "upload_one" }]);
  const result = await execute(client, "ads_upload_audience_file", {
    filename: "audience.csv",
    mimetype: "text/csv",
    content_base64: bytes.toString("base64"),
  });
  assert.equal(calls[1].init.body.get("purpose"), "custom_audience");
  assert.equal(calls[1].init.body.get("file").size, bytes.length);
  assert.equal(result.data.file_size, bytes.length);
  assert.ok(!JSON.stringify(result).includes(bytes.toString()));
});

test("bulk idempotency request is explicit and HTTP 202 is pending", async () => {
  const operation = {
    operation_id: "pause-one",
    type: "campaign.update",
    target_resource_id: "cmpn_one",
    input: { status: "paused" },
  };
  const body = { validate_only: true, partial_failure: false, operations: [operation] };
  const { client, calls } = mockClient([
    account,
    Response.json({ id: "blkmtnjob_one", status: "pending" }, { status: 202 }),
  ]);
  const result = await execute(client, "ads_submit_bulk_job", {
    idempotency_key: "validate-job-one",
    body,
  });
  assert.equal(calls[1].init.headers["Idempotency-Key"], "validate-job-one");
  assert.deepEqual(JSON.parse(calls[1].init.body), body);
  assert.equal(result.verification.status, "pending");
  assert.equal(result.outcome, "accepted");
});

test("completed bulk and audience operation pages use their documented cursor fields", async () => {
  const bulk = mockClient([
    account,
    { complete: true, has_more: true, data: [{ operation_id: "op-last", status: "updated" }] },
  ]);
  const page = await execute(bulk.client, "ads_list_bulk_operations", { job_id: "job_one" });
  assert.equal(page.pagination.next_after, "op-last");
  assert.equal(page.pagination.cursor_parameter, "after");
  const audience = mockClient([account, { has_more: true, next_cursor: "cursor123", data: [] }]);
  const next = await execute(audience.client, "ads_list_audience_operations", {
    custom_audience_id: "caud_one",
  });
  assert.equal(next.pagination.next_after, "cursor123");
  assert.equal(next.pagination.cursor_parameter, "cursor");
});

test("failed readback does not erase the successful write or authorize a retry", async () => {
  const { client, calls } = mockClient([
    account,
    { id: "cmpn_one", status: "paused" },
    new Error("read failed"),
  ]);
  const result = await execute(client, "ads_pause_campaign", { campaign_id: "cmpn_one" });
  assert.equal(result.outcome, "api_returned_success");
  assert.equal(result.verification.status, "unverified");
  assert.equal(calls.length, 3);
});

test("credential responses and errors never expose unknown future secret fields", async () => {
  const payload = {
    name: "Server events",
    key: "future-issued-secret",
    debug: "future-issued-secret",
  };
  const { client } = mockClient([account, payload]);
  let stored;
  const result = await execute(
    client,
    "ads_create_conversion_key",
    { body: { name: "Server events" } },
    {
      credentialSink: async ({ value }) => {
        stored = value;
        return { url: "https://ads.example.test/credentials/one", expiresAt: 10000 };
      },
    },
  );
  assert.deepEqual(stored, payload);
  assert.deepEqual(result.data, {
    credential_provisioned: true,
    operation: "ads_create_conversion_key",
  });
  assert.equal(result.verification.status, "securely_stored");
  assert.ok(!JSON.stringify(result).includes("future-issued-secret"));
  const failed = mockClient([
    account,
    Response.json(
      { message: "Error with future-issued-secret", key: "future-issued-secret" },
      { status: 500 },
    ),
  ]);
  await assert.rejects(
    execute(
      failed.client,
      "ads_create_conversion_key",
      { body: { name: "Server events" } },
      { credentialSink: async () => {} },
    ),
    (error) => {
      assert.equal(error.status, 500);
      assert.equal(error.details, undefined);
      assert.ok(!JSON.stringify(error).includes("future-issued-secret"));
      return true;
    },
  );
});
