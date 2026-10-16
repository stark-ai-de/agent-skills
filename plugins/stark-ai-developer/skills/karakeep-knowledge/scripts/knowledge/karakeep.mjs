import { readPrivate, requireThat, KnowledgeError, hash } from "./state.mjs";

export function origin(value) {
  let u;
  try {
    u = new URL(value);
  } catch {
    throw new KnowledgeError("connection", "Invalid service origin.");
  }
  requireThat(
    ["http:", "https:"].includes(u.protocol) &&
      ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname) &&
      !u.username &&
      !u.password &&
      u.pathname === "/" &&
      !u.search &&
      !u.hash &&
      !/\s/u.test(value),
    "connection",
    "Use the configured loopback HTTP(S) origin.",
  );
  return u.origin;
}
export function literal(raw) {
  let result = "",
    quote = null,
    token = false,
    ended = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (!quote && c === "#") break;
    if (!quote && /\s/u.test(c)) {
      if (token) ended = true;
      continue;
    }
    requireThat(!ended, "credentials", "Expected one literal credential value.");
    token = true;
    if (c === quote) {
      quote = null;
      continue;
    }
    if (!quote && (c === '"' || c === "'")) {
      quote = c;
      continue;
    }
    if (c === "\\" && quote !== "'") {
      requireThat(i + 1 < raw.length, "credentials", "Invalid credential quoting.");
      if (quote === '"' && !['"', "\\"].includes(raw[i + 1])) {
        result += c;
        continue;
      }
      result += raw[++i];
      continue;
    }
    result += c;
  }
  requireThat(
    !quote && result && !/[\x00-\x1f]/u.test(result),
    "credentials",
    "Invalid credential value.",
  );
  return result;
}
export async function credentials(connection) {
  let address, key;
  if (connection.credentialFile) {
    const values = {};
    for (const line of (await readPrivate(connection.credentialFile, 16384)).split(/\r?\n/u)) {
      if (!line.trim() || line.trimStart().startsWith("#")) continue;
      const offset = line.indexOf("="),
        name = line.slice(0, offset);
      requireThat(
        offset > 0 &&
          ["KARAKEEP_API_ADDR", "KARAKEEP_API_KEY"].includes(name) &&
          !Object.hasOwn(values, name),
        "credentials",
        "Expected exactly two literal credential assignments.",
      );
      values[name] = literal(line.slice(offset + 1));
    }
    requireThat(
      Object.keys(values).length === 2,
      "credentials",
      "Both credential references are required.",
    );
    address = values.KARAKEEP_API_ADDR;
    key = values.KARAKEEP_API_KEY;
  } else {
    address = process.env[connection.credentialEnv.address];
    key = process.env[connection.credentialEnv.key];
  }
  requireThat(
    typeof key === "string" && key.length > 0 && !/[\x00-\x20]/u.test(key),
    "credentials",
    "Missing or invalid private API key.",
  );
  requireThat(
    origin(address) === origin(connection.address),
    "connection",
    "Credential origin differs from the policy.",
  );
  return { address: origin(address), key };
}
export function remoteId(id) {
  requireThat(
    typeof id === "string" && /^[a-zA-Z0-9_-]+$/u.test(id),
    "api",
    "Invalid server identifier.",
  );
  return encodeURIComponent(id);
}
export class Karakeep {
  constructor(auth, { deadlineMs = 20000, maxBytes = 64 * 1024 * 1024 } = {}) {
    this.address = origin(auth.address);
    this.key = auth.key;
    this.deadlineMs = deadlineMs;
    this.maxBytes = maxBytes;
  }
  async request(route, { method = "GET", body } = {}) {
    requireThat(
      route.startsWith("/api/v1/") && !route.includes("..") && !process.env.NODE_USE_ENV_PROXY,
      "connection",
      "Unsupported route or proxy-enabled Node runtime.",
    );
    const abort = new AbortController(),
      timer = setTimeout(() => abort.abort(), this.deadlineMs);
    try {
      const response = await fetch(this.address + route, {
        method,
        redirect: "manual",
        signal: abort.signal,
        headers: {
          Accept: "application/json",
          Authorization: "Bearer " + this.key,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new KnowledgeError(
          "http_" + response.status,
          "Karakeep request failed with HTTP " + response.status + ".",
        );
      }
      if (response.status === 204) return null;
      let size = 0;
      const chunks = [];
      for await (const chunk of response.body) {
        size += chunk.length;
        requireThat(
          size <= this.maxBytes,
          "response_size",
          "Karakeep response exceeded its configured bound.",
        );
        chunks.push(chunk);
      }
      try {
        return JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        throw new KnowledgeError("api", "Karakeep returned invalid JSON.");
      }
    } catch (e) {
      if (e instanceof KnowledgeError) throw e;
      throw new KnowledgeError(
        "unreachable",
        "Karakeep connection failed or exceeded its deadline.",
      );
    } finally {
      clearTimeout(timer);
    }
  }
  async account(expected) {
    const user = await this.request("/api/v1/users/me");
    requireThat(user?.id === expected, "account", "The credential belongs to a different account.");
    return user.id;
  }
  async inventory() {
    const bookmarks = [],
      seen = new Set();
    let cursor = null;
    do {
      const page = await this.request(
        "/api/v1/bookmarks?limit=100&includeContent=false" +
          (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
      );
      requireThat(
        Array.isArray(page.bookmarks) && Object.hasOwn(page, "nextCursor"),
        "api",
        "Unsupported bookmark pagination response.",
      );
      bookmarks.push(...page.bookmarks);
      cursor = page.nextCursor;
      if (cursor) {
        requireThat(
          typeof cursor === "string" && !seen.has(cursor),
          "api",
          "Invalid or repeated cursor.",
        );
        seen.add(cursor);
      }
    } while (cursor);
    return bookmarks;
  }
  get(id) {
    return this.request("/api/v1/bookmarks/" + remoteId(id) + "?includeContent=true");
  }
  create(body) {
    return this.request("/api/v1/bookmarks", { method: "POST", body });
  }
  update(id, body) {
    return this.request("/api/v1/bookmarks/" + remoteId(id), { method: "PATCH", body });
  }
  async content(id) {
    let cursor = null,
      text = "",
      version = null;
    const seen = new Set();
    do {
      const page = await this.request(
        "/api/v1/bookmarks/" +
          remoteId(id) +
          "/content?format=markdown&maxChars=50000" +
          (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
      );
      requireThat(
        typeof page.content === "string" && typeof page.contentVersion === "string",
        "api",
        "Unsupported readable-content response.",
      );
      requireThat(
        !version || version === page.contentVersion,
        "changed_input",
        "Captured content changed during retrieval.",
      );
      version = page.contentVersion;
      text += page.content;
      requireThat(
        Buffer.byteLength(text) <= this.maxBytes,
        "response_size",
        "Readable content exceeds the configured bound.",
      );
      cursor = page.nextCursor ?? null;
      if (cursor) {
        requireThat(
          typeof cursor === "string" && !seen.has(cursor),
          "api",
          "Invalid content cursor.",
        );
        seen.add(cursor);
      }
      requireThat(
        !page.truncated || cursor,
        "incomplete_content",
        "Readable content is truncated without a continuation.",
      );
    } while (cursor);
    return { text, contentHash: hash(text), version, available: text.trim().length > 0 };
  }
  async validateLists(ids) {
    for (const id of ids) {
      const list = await this.request("/api/v1/lists/" + remoteId(id));
      requireThat(
        list.id === id && list.type === "manual" && list.public === false,
        "list",
        "Policy list must be an accessible private manual list.",
      );
    }
  }
  async memberships(id) {
    const result = await this.request("/api/v1/bookmarks/" + remoteId(id) + "/lists");
    requireThat(Array.isArray(result.lists), "api", "Unsupported membership response.");
    return result.lists.map((x) => x.id);
  }
  async attach(id, listIds, tags, operations) {
    const existing = await this.memberships(id);
    for (const list of listIds.filter((x) => !existing.includes(x))) {
      requireThat(
        operations.includes("membership"),
        "policy",
        "List membership is not authorized.",
      );
      await this.request("/api/v1/lists/" + remoteId(list) + "/bookmarks/" + remoteId(id), {
        method: "PUT",
      });
    }
    const bookmark = await this.get(id),
      names = (bookmark.tags || []).map((t) => t.name);
    const missing = tags.filter((t) => !names.includes(t));
    if (missing.length) {
      requireThat(operations.includes("tag"), "policy", "Tag attachment is not authorized.");
      await this.request("/api/v1/bookmarks/" + remoteId(id) + "/tags", {
        method: "POST",
        body: { tags: missing.map((tagName) => ({ tagName })) },
      });
    }
    const lists = await this.memberships(id),
      after = await this.get(id);
    requireThat(
      listIds.every((id) => lists.includes(id)) &&
        tags.every((t) => (after.tags || []).some((x) => x.name === t)),
      "readback",
      "Membership or tag readback did not match.",
    );
  }
}
export async function connect(p) {
  const api = new Karakeep(await credentials(p.connection));
  await api.account(p.connection.accountId);
  return api;
}
