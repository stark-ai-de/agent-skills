export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const securityHeaders = Object.freeze({
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "content-security-policy":
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  "x-frame-options": "DENY",
});

// Browser form POSTs under no-referrer serialize Origin as null. Preserve the
// same-origin POST Origin without exposing referrers to other origins.
export const browserFormSecurityHeaders = Object.freeze({
  ...securityHeaders,
  "referrer-policy": "same-origin",
});

export function textResponse(message, status = 200, headers = {}) {
  return new Response(message, {
    status,
    headers: { ...securityHeaders, "content-type": "text/plain; charset=utf-8", ...headers },
  });
}

export async function readBoundedBody(request, limit = 2097152) {
  const encoding = request.headers.get("content-encoding");
  if (encoding && encoding !== "identity")
    throw new HttpError(415, "Content encoding is not supported.");
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > limit))
    throw new HttpError(413, "Request body exceeds the allowed size.");
  const reader = request.body?.getReader();
  if (!reader) return "";
  let timer;
  const chunks = [];
  let size = 0;
  try {
    await Promise.race([
      (async () => {
        while (true) {
          const next = await reader.read();
          if (next.done) break;
          size += next.value.byteLength;
          if (size > limit) throw new HttpError(413, "Request body exceeds the allowed size.");
          chunks.push(next.value);
        }
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new HttpError(408, "Request body timed out.")), 10000);
        timer.unref?.();
      }),
    ]);
    return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks, size));
  } catch (error) {
    void reader.cancel().catch(() => {});
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Invalid request body.");
  } finally {
    clearTimeout(timer);
  }
}

export function withinDepth(value, maximum = 48) {
  const remaining = [[value, 0]];
  while (remaining.length) {
    const [item, depth] = remaining.pop();
    if (!item || typeof item !== "object") continue;
    if (depth > maximum) return false;
    for (const child of Object.values(item)) remaining.push([child, depth + 1]);
  }
  return true;
}

export function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character],
  );
}
