// Read-only session-owned loopback preview. SPDX-License-Identifier: Apache-2.0
import http from "node:http";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { currentRevision, history, readRevision } from "./report-store.mjs";
export async function serveReport(directory, { port = 0 } = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw new TypeError("Invalid preview port");
  if (!(await currentRevision(directory)))
    throw new Error("Create a managed report before previewing it");
  const runtime = await readFile(new URL("../../assets/preview.js", import.meta.url), "utf8");
  const digest = createHash("sha256").update(runtime).digest("base64");
  const page = `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Visual Reports · Vorschau</title><style>html,body{margin:0;height:100%;font:15px system-ui;background:#202124;color:#e7e7e5}body{display:flex;flex-direction:column}header{padding:.7rem 1rem;display:flex;gap:.6rem;flex-wrap:wrap;align-items:center;border-bottom:1px solid #666}button,select{font:inherit;color:inherit;background:#292b2f;border:1px solid #888;padding:.4rem}a{color:#a9d9cf}iframe{flex:1;width:100%;border:0;min-height:0}#notice{flex-basis:100%;margin:0}button:focus-visible,select:focus-visible,a:focus-visible{outline:2px solid #a9d9cf}label{display:flex;gap:.4rem;align-items:center}</style><header><strong>Report</strong><label>Version <select id="versions" aria-label="Version"></select></label><button id="apply">Übernehmen</button><button id="draft">Entwurf exportieren</button><label><input id="discard" type="checkbox">Ungesicherten Entwurf verwerfen</label><a id="html" target="_blank" rel="noopener">HTML einzeln öffnen</a><a id="md">Markdown</a><a id="json">JSON</a><p id="notice" role="status" aria-live="polite">Wird geladen …</p></header><iframe id="report" title="Vollständiger Report"></iframe><script>${runtime}</script></html>`;
  const server = http.createServer(async (req, res) => {
    const headers = {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    };
    try {
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405, headers);
        res.end();
        return;
      }
      if (!/^(?:localhost|127\.0\.0\.1):\d+$/.test(req.headers.host ?? "")) {
        res.writeHead(403, headers);
        res.end("Loopback Host required");
        return;
      }
      const url = new URL(req.url, "http://localhost");
      let body, type;
      if (url.pathname === "/") {
        body = page;
        type = "text/html; charset=utf-8";
        headers["Content-Security-Policy"] =
          `default-src 'none'; script-src 'sha256-${digest}'; style-src 'unsafe-inline'; frame-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'`;
      } else if (url.pathname === "/current") {
        const current = await currentRevision(directory);
        // History derives from the same pointer; a concurrent update appears next poll.
        const entries = await history(directory, { head: current?.revision ?? null });
        body = JSON.stringify({ ...current, history: entries });
        type = "application/json";
      } else {
        const match = url.pathname.match(
          /^\/revision\/(\d{13}-[a-f0-9-]{36})\/report\.(html|md|json)$/,
        );
        if (!match) {
          res.writeHead(404, headers);
          res.end("Not found");
          return;
        }
        const output = await readRevision(directory, match[1]);
        body = output[match[2]];
        type = {
          html: "text/html; charset=utf-8",
          md: "text/plain; charset=utf-8",
          json: "application/json",
        }[match[2]];
      }
      res.writeHead(200, { ...headers, "Content-Type": type });
      res.end(req.method === "HEAD" ? undefined : body);
    } catch (e) {
      res.writeHead(500, { ...headers, "Content-Type": "text/plain" });
      res.end(
        `Preview unavailable: ${e.code ?? e.name}. Inspect the local CLI for the store state.`,
      );
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return {
    server,
    url: `http://localhost:${server.address().port}/`,
    close: () => new Promise((resolve, reject) => server.close((e) => (e ? reject(e) : resolve()))),
  };
}
