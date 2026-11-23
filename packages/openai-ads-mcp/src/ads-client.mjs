import { OPERATION_BY_NAME } from "./operations.mjs";

const API_ORIGIN = "https://api.ads.openai.com";
const secretField = /(^|_)(api_?key|password|secret|token|authorization|cookie)(_|$)/i;
const identityPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,255}$/;

export class AdsClientError extends Error {
  constructor(code, message, { status, uncertain = false, details } = {}) {
    super(message);
    this.name = "AdsClientError";
    this.code = code;
    this.status = status;
    this.uncertain = uncertain;
    this.details = details;
  }
}

export function sanitize(value, secrets = [], depth = 0) {
  if (depth > 40) return "[depth limit]";
  if (typeof value === "string") {
    let output = value;
    for (const secret of secrets) if (secret) output = output.replaceAll(secret, "[REDACTED]");
    output = output.replace(/\b(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, "$1[REDACTED]");
    // Start at the authority delimiter, not an unbounded scheme prefix. Each
    // slash-delimited segment is scanned at most once even for large plain text.
    // This also covers protocol-relative URLs and an empty username.
    output = output.replace(/(\/\/[^/@\s:]*:)[^/@\s]*@/g, "$1[REDACTED]@");
    return output;
  }
  if (Array.isArray(value)) return value.map((item) => sanitize(item, secrets, depth + 1));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([name, item]) => [
        name,
        secretField.test(name) ? "[REDACTED]" : sanitize(item, secrets, depth + 1),
      ]),
    );
  return value;
}

function checkSemanticInput(operation, args) {
  if (operation.name.startsWith("ads_update_") && args.body && Object.keys(args.body).length === 0)
    throw new AdsClientError("invalid_arguments", "An update needs at least one changed field.");
  if (args.query?.after && args.query?.before)
    throw new AdsClientError(
      "invalid_arguments",
      "Select either forward or backward pagination, not both.",
    );
  if (operation.name === "ads_upload_image_url") {
    const url = new URL(args.body.image_url);
    if (url.protocol !== "https:" || url.username || url.password)
      throw new AdsClientError(
        "invalid_arguments",
        "The image URL must be public HTTPS without embedded credentials.",
      );
  }
  if (operation.name === "ads_configure_feed_sftp_access") {
    if (args.body.authentication_method === "ssh_key" && !args.body.ssh_public_key)
      throw new AdsClientError(
        "invalid_arguments",
        "SSH-key authentication requires ssh_public_key.",
      );
    if (args.body.ssh_public_key?.includes("PRIVATE KEY"))
      throw new AdsClientError(
        "invalid_arguments",
        "Supply an SSH public key, never a private key.",
      );
  }
  if (["ads_add_audience_members", "ads_remove_audience_members"].includes(operation.name)) {
    const body = args.body;
    if (Boolean(body.file_id) === Boolean(body.identifiers?.length))
      throw new AdsClientError(
        "invalid_arguments",
        "Provide either a file_id or nonempty inline identifiers.",
      );
  }
  if (operation.name === "ads_create_audience") {
    const fileFields = ["filename", "mimetype", "file_size"];
    if (args.body.file_id && fileFields.some((key) => args.body[key] === undefined))
      throw new AdsClientError(
        "invalid_arguments",
        "File audience creation requires filename, mimetype and exact file_size.",
      );
    if (!args.body.file_id && fileFields.some((key) => args.body[key] !== undefined))
      throw new AdsClientError("invalid_arguments", "File metadata requires a file_id.");
  }
  if (operation.name !== "ads_submit_bulk_job") return;
  const ids = new Set();
  const keys = new Map();
  const targets = new Set();
  for (const item of args.body.operations) {
    if (Buffer.byteLength(JSON.stringify(item)) > 512 * 1024)
      throw new AdsClientError(
        "invalid_arguments",
        "A serialized bulk operation cannot exceed 512 KiB.",
      );
    if (ids.has(item.operation_id))
      throw new AdsClientError("invalid_arguments", "Bulk operation IDs must be unique.");
    ids.add(item.operation_id);
    if (item.type.endsWith(".create")) {
      if (keys.has(item.idempotency_key))
        throw new AdsClientError(
          "invalid_arguments",
          "Bulk create idempotency keys must be unique.",
        );
      keys.set(item.idempotency_key, item);
    } else {
      const target = `${item.type}:${item.target_resource_id}`;
      if (targets.has(target) || Object.keys(item.input).length === 0)
        throw new AdsClientError(
          "invalid_arguments",
          "Each bulk update target must occur once and include a changed field.",
        );
      targets.add(target);
    }
    if (item.input.max_bid_micros !== undefined && item.input.max_cpm_bid_micros !== undefined)
      throw new AdsClientError(
        "invalid_arguments",
        "Choose one bid matching the parent campaign billing event.",
      );
  }
  for (const item of args.body.operations) {
    if (
      ["ad_group.create", "ad.create"].includes(item.type) &&
      keys.get(item.input.campaign_idempotency_key)?.type !== "campaign.create"
    )
      throw new AdsClientError(
        "invalid_arguments",
        "Bulk creates must reference a campaign.create in this job.",
      );
    if (item.type === "ad.create") {
      const parent = keys.get(item.input.ad_group_idempotency_key);
      if (
        parent?.type !== "ad_group.create" ||
        parent.input.campaign_idempotency_key !== item.input.campaign_idempotency_key
      )
        throw new AdsClientError(
          "invalid_arguments",
          "Bulk ad parent references must point to the same campaign.",
        );
    }
  }
}

function checkReportRange(range, timezone) {
  if (range.type === "unix_range") {
    if (Number(range.start) >= Number(range.end))
      throw new AdsClientError("invalid_arguments", "Exclusive end must be later than start.");
    return range;
  }
  for (const name of ["since", "until"]) {
    const hour = range.type === "hour_range";
    const stamp = new Date(hour ? `${range[name]}:00:00Z` : `${range[name]}T00:00:00Z`);
    if (
      !Number.isFinite(stamp.getTime()) ||
      stamp.toISOString().slice(0, hour ? 13 : 10) !== range[name]
    )
      throw new AdsClientError(
        "invalid_arguments",
        "Report bounds must be valid calendar dates or hours.",
      );
  }
  if (range.until < range.since)
    throw new AdsClientError("invalid_arguments", "Inclusive until must be on or after since.");
  try {
    new Intl.DateTimeFormat("en", { timeZone: range.timezone ?? timezone });
  } catch {
    throw new AdsClientError("invalid_arguments", "Report timezone is not supported.");
  }
  return { ...range, timezone: range.timezone ?? timezone };
}

function conversionRange(range, timezone) {
  checkReportRange(range, timezone);
  const start = Number(range.start);
  const end = Number(range.end);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const dates = [start, end].map((stamp) => {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(stamp * 1000)).map((part) => [part.type, part.value]),
    );
    if (parts.hour !== "00" || parts.minute !== "00" || parts.second !== "00")
      throw new AdsClientError(
        "invalid_arguments",
        "Conversion report bounds must be full days in the account timezone.",
      );
    return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  });
  if ((dates[1] - dates[0]) / 86400000 > 365)
    throw new AdsClientError(
      "invalid_arguments",
      "A conversion report can span at most 365 account-local days.",
    );
  return JSON.stringify({ type: "unix_range", start: String(start), end: String(end) });
}

function mergeFields(current, update) {
  if (!update || typeof update !== "object" || Array.isArray(update)) return update;
  return Object.fromEntries(
    Object.entries({ ...current, ...update }).map(([key, value]) => [
      key,
      Object.hasOwn(update, key) ? mergeFields(current?.[key], value) : value,
    ]),
  );
}

function writableTargeting(current) {
  const result = structuredClone(current ?? {});
  for (const name of ["locations", "excluded_locations"]) {
    for (const location of result[name]?.include ?? []) {
      // Read resources represent absent region metadata as null; the write schema
      // accepts omission. The stable geo ID and all targeting rules stay intact.
      if (location.region_code === null) delete location.region_code;
    }
  }
  return result;
}

function pagination(operation, data, args) {
  if (typeof data?.has_more !== "boolean") return undefined;
  const complete = operation.name === "ads_list_bulk_operations" ? data.complete === true : true;
  const backward = Boolean(args.query?.before);
  const first = Array.isArray(data.data) ? data.data[0] : null;
  const last = Array.isArray(data.data) ? data.data.at(-1) : null;
  const next =
    complete && data.has_more
      ? operation.name === "ads_list_bulk_operations"
        ? last?.operation_id
        : backward
          ? (data.first_id ?? first?.id)
          : (data.last_id ?? data.next_cursor ?? last?.id)
      : null;
  return {
    complete: complete && !data.has_more,
    snapshot_complete: complete,
    has_more: data.has_more,
    next_after: backward ? null : (next ?? null),
    ...(backward ? { next_before: next ?? null } : {}),
    cursor_parameter:
      operation.name === "ads_list_audience_operations" ? "cursor" : backward ? "before" : "after",
    ...(data.has_more && complete && !next
      ? {
          warning:
            "The response has more results without a usable cursor; do not claim the list is complete.",
        }
      : {}),
  };
}

function verificationPath(operation, args, data) {
  for (const [singular, plural, idField] of [
    ["campaign", "campaigns", "campaign_id"],
    ["ad_group", "ad_groups", "ad_group_id"],
    ["ad", "ads", "ad_id"],
  ]) {
    if (
      new RegExp(`^ads_(create|update|activate|pause|archive)_${singular}$`).test(operation.name)
    ) {
      const id = args[idField] ?? data.id;
      return typeof id === "string" && identityPattern.test(id) ? `/${plural}/${id}` : null;
    }
  }
  if (operation.name === "ads_update_feed_settings") return `/feeds/${args.feed_id}/settings`;
  if (["ads_create_audience", "ads_archive_audience"].includes(operation.name)) {
    const id = args.custom_audience_id ?? data.id;
    return typeof id === "string" && identityPattern.test(id) ? `/custom_audiences/${id}` : null;
  }
  return null;
}

export function createAdsClient({
  apiKey,
  expectedAccountId,
  fetchImpl = fetch,
  timeoutMs = 30000,
  maxResponseBytes = 8 * 1024 * 1024,
} = {}) {
  if (typeof apiKey !== "string" || !apiKey.trim() || /[\r\n]/.test(apiKey))
    throw new AdsClientError("invalid_credentials", "A valid Advertiser API key is required.");
  if (expectedAccountId !== undefined && !identityPattern.test(expectedAccountId))
    throw new AdsClientError("invalid_account", "Invalid expected Ads account ID.");
  if (
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > 120000 ||
    !Number.isSafeInteger(maxResponseBytes) ||
    maxResponseBytes < 1 ||
    maxResponseBytes > 16 * 1024 * 1024
  )
    throw new Error("Invalid Ads client limits.");

  async function request(
    method,
    path,
    { query, body, idempotencyKey, readOnly = method === "GET", sensitiveResponse = false } = {},
  ) {
    // Only private code reaches this function; public tools are an explicit allowlist.
    if (!path.startsWith("/") || path.includes("..") || path.includes("?") || path.includes("#"))
      throw new AdsClientError("invalid_path", "Unsupported Ads API path.");
    const url = new URL(`/v1${path}`, API_ORIGIN);
    for (const [name, value] of Object.entries(query ?? {})) {
      if (value === undefined) continue;
      if (Array.isArray(value))
        for (const entry of value)
          url.searchParams.append(
            `${name}[]`,
            typeof entry === "object" ? JSON.stringify(entry) : String(entry),
          );
      else url.searchParams.set(name, String(value));
    }
    const headers = { Authorization: `Bearer ${apiKey}`, Accept: "application/json" };
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
    const form = body instanceof FormData;
    if (body !== undefined && !form) headers["Content-Type"] = "application/json";
    const encodedBody = body === undefined ? undefined : form ? body : JSON.stringify(body);
    if (typeof encodedBody === "string" && Buffer.byteLength(encodedBody) > 16 * 1024 * 1024)
      throw new AdsClientError(
        "request_too_large",
        "The serialized Ads API request cannot exceed 16 MiB.",
      );
    let response;
    try {
      response = await fetchImpl(url, {
        method,
        headers,
        body: encodedBody,
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new AdsClientError(
        "transport_error",
        readOnly
          ? "Ads API request failed in transit."
          : "Ads API write outcome is unknown. Inspect resource/job state before any retry.",
        { uncertain: !readOnly },
      );
    }
    let payload;
    const reader = response.body?.getReader();
    const chunks = [];
    let length = 0;
    try {
      if (Number(response.headers.get("content-length")) > maxResponseBytes) {
        await reader?.cancel();
        throw new AdsClientError(
          "response_too_large",
          "Ads API response exceeded the configured limit. Reduce the query or page size.",
          { status: response.status, uncertain: !readOnly },
        );
      }
      if (reader)
        while (true) {
          const item = await reader.read();
          if (item.done) break;
          length += item.value.length;
          if (length > maxResponseBytes) {
            await reader.cancel();
            throw new AdsClientError(
              "response_too_large",
              "Ads API response exceeded the configured limit. Reduce the query or page size.",
              { status: response.status, uncertain: !readOnly },
            );
          }
          chunks.push(item.value);
        }
      const raw = Buffer.concat(chunks, length).toString("utf8");
      payload = raw ? JSON.parse(raw) : {};
    } catch (error) {
      if (error instanceof AdsClientError) throw error;
      throw new AdsClientError(
        "invalid_response",
        "Ads API did not return a complete JSON response.",
        { status: response.status, uncertain: !readOnly },
      );
    }
    if (!response.ok) {
      const details = sensitiveResponse ? undefined : sanitize(payload, [apiKey]);
      throw new AdsClientError("upstream_error", `Ads API returned HTTP ${response.status}.`, {
        status: response.status,
        uncertain: !readOnly && response.status >= 500,
        details,
      });
    }
    if (payload === null || typeof payload !== "object" || Array.isArray(payload))
      throw new AdsClientError(
        "invalid_response",
        "Ads API returned an unexpected response shape.",
        { status: response.status, uncertain: !readOnly },
      );
    return { data: payload, status: response.status };
  }

  async function getAccount() {
    const { data } = await request("GET", "/ad_account");
    if (
      !identityPattern.test(data.id ?? "") ||
      typeof data.currency_code !== "string" ||
      typeof data.timezone !== "string" ||
      !data.currency_code ||
      !data.timezone
    )
      throw new AdsClientError(
        "invalid_account_response",
        "Ads account response must include id, currency_code and timezone.",
      );
    if (expectedAccountId !== undefined && data.id !== expectedAccountId)
      throw new AdsClientError(
        "account_mismatch",
        "The Ads key belongs to a different account; resource calls were blocked.",
      );
    return sanitize(data, [apiKey]);
  }

  async function execute(operationOrName, input, { credentialSink } = {}) {
    const operation =
      typeof operationOrName === "string"
        ? OPERATION_BY_NAME.get(operationOrName)
        : operationOrName;
    if (!operation || OPERATION_BY_NAME.get(operation.name) !== operation)
      throw new AdsClientError("unknown_operation", "Unsupported Ads operation.");
    const parsed = operation.schema.safeParse(input);
    if (!parsed.success)
      throw new AdsClientError(
        "invalid_arguments",
        "Arguments do not match the tool's documented schema.",
        {
          details: {
            issues: parsed.error.issues.map((issue) => ({
              path: issue.path.join("."),
              code: issue.code,
            })),
          },
        },
      );
    const args = parsed.data;
    if (
      operation.name !== "ads_get_account" &&
      (!expectedAccountId || args.expected_account_id !== expectedAccountId)
    )
      throw new AdsClientError(
        "account_mismatch",
        "expected_account_id must match the connected account; account switching is unavailable.",
      );
    if (operation.credential && typeof credentialSink !== "function")
      throw new AdsClientError(
        "credential_destination_required",
        "Configure a secure credential destination before creating or rotating credentials.",
      );
    checkSemanticInput(operation, args);
    const account = await getAccount();
    if (operation.name === "ads_get_account")
      return {
        account: {
          id: account.id,
          currency_code: account.currency_code,
          timezone: account.timezone,
        },
        data: account,
        outcome: "read",
        verification: { status: "account_verified" },
      };
    const path = operation.path.replace(/\{([^}]+)\}/g, (_, field) =>
      encodeURIComponent(args[field]),
    );
    const query = args.query ? structuredClone(args.query) : undefined;
    if (operation.name.endsWith("_insights") && operation.method === "GET")
      query.time_ranges = query.time_ranges.map((range) =>
        checkReportRange(range, account.timezone),
      );
    let body = args.body ? structuredClone(args.body) : undefined;
    if (operation.name === "ads_get_conversion_insights")
      body.time_ranges = body.time_ranges.map((range) => conversionRange(range, account.timezone));
    if (operation.name === "ads_update_campaign" && body.targeting && !args.replace_targeting) {
      const current = (await request("GET", path)).data;
      body.targeting = mergeFields(writableTargeting(current.targeting), body.targeting);
      // Provider-added read-only fields are never copied into a write request.
      const targetingSchema = operation.schema.shape.body.shape.targeting;
      const allowed = targetingSchema.safeParse(body.targeting);
      if (!allowed.success)
        throw new AdsClientError(
          "targeting_merge_unverified",
          "Current targeting cannot be safely merged with the pinned write schema. Inspect the account and current API contract before replacing targeting.",
        );
      body.targeting = allowed.data;
    }
    let uploadDetails;
    if (operation.name === "ads_upload_audience_file") {
      const bytes = Buffer.from(args.content_base64, "base64");
      if (
        !bytes.length ||
        bytes.length > 2 * 1024 * 1024 ||
        bytes.toString("base64") !== args.content_base64
      )
        throw new AdsClientError(
          "invalid_arguments",
          "Audience content must be canonical base64 containing at most 2 MiB.",
        );
      body = new FormData();
      body.set("purpose", "custom_audience");
      body.set("file", new Blob([bytes], { type: args.mimetype }), args.filename);
      uploadDetails = { filename: args.filename, mimetype: args.mimetype, file_size: bytes.length };
    }
    const result = await request(operation.method, path, {
      query,
      body,
      idempotencyKey: args.idempotency_key,
      readOnly: operation.readOnly,
      sensitiveResponse: operation.credential === true,
    });
    if (operation.name === "ads_update_feed_products" && result.data.accepted !== true) {
      if (result.data.accepted === false)
        throw new AdsClientError(
          "upstream_rejected",
          "The Ads API did not accept the Delta update. Inspect the feed before submitting another update.",
          { status: result.status, details: sanitize(result.data, [apiKey]) },
        );
      throw new AdsClientError(
        "invalid_response",
        "The Ads API did not return a valid Delta acceptance result. Inspect feed state before any retry.",
        { status: result.status, uncertain: true },
      );
    }
    let credential;
    if (operation.credential) {
      try {
        credential = await credentialSink({ operation: operation.name, value: result.data });
        if (!credential || typeof credential.url !== "string" || credential.expiresAt === undefined)
          throw new Error("Invalid credential handoff");
      } catch {
        throw new AdsClientError(
          "credential_storage_failed",
          "The API may have issued or rotated credentials, but secure delivery failed. Do not repeat automatically; reconcile in Ads Manager.",
          { uncertain: true },
        );
      }
    }
    // Credential responses are forward-compatible secret containers. Even an
    // unfamiliar field name must remain exclusively in the encrypted sink.
    const data = operation.credential
      ? { credential_provisioned: true, operation: operation.name }
      : sanitize(result.data, [apiKey]);
    const pending =
      result.status === 202 ||
      data.accepted === true ||
      ["pending", "processing", "in_progress"].includes(data.status) ||
      (operation.name === "ads_create_audience" &&
        ["upload_pending", "rockset_ingest_pending", "publishing"].includes(data.status));
    let verification = {
      status: operation.credential
        ? "securely_stored"
        : operation.readOnly
          ? "read"
          : pending
            ? "pending"
            : "api_response_only",
    };
    const readbackPath = !operation.readOnly && !pending && verificationPath(operation, args, data);
    if (readbackPath) {
      try {
        verification = {
          status: "read_back",
          resource: sanitize((await request("GET", readbackPath)).data, [apiKey]),
        };
      } catch (error) {
        verification = {
          status: "unverified",
          error: error.code ?? "readback_failed",
          message:
            "The write returned success, but readback failed. Inspect state before retrying.",
        };
      }
    }
    const page = pagination(operation, data, args);
    return {
      account: { id: account.id, currency_code: account.currency_code, timezone: account.timezone },
      outcome: operation.readOnly ? "read" : pending ? "accepted" : "api_returned_success",
      data: uploadDetails ? { ...data, ...uploadDetails } : data,
      verification,
      ...(page ? { pagination: page } : {}),
      ...(credential ? { credential } : {}),
    };
  }
  return Object.freeze({ getAccount, execute });
}
