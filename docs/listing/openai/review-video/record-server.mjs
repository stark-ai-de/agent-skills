import http from "node:http";
import fs from "node:fs";
const cases = JSON.parse(fs.readFileSync("recording-cases.json", "utf8"));
const events = [];
const page = `<!doctype html><html lang="en"><meta charset="utf-8"><title>stark AI Developer Tools — live MCP walkthrough</title><style>
*{box-sizing:border-box}body{margin:0;background:#10151f;color:#ecf1f8;font:21px system-ui;padding:42px 52px}header{display:flex;justify-content:space-between;border-bottom:1px solid #465164;padding-bottom:22px}small{color:#aebcd1;font-size:17px}h1{font-size:32px;margin:0 0 6px}h2{font-size:30px;margin:20px 0}p{line-height:1.5}code{font-size:18px;color:#b2d3ff}.grid{display:grid;grid-template-columns:1fr 1fr;gap:25px}section{background:#1a2331;padding:22px;border:1px solid #435168;border-radius:12px;height:410px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:17px/1.35 monospace;margin:12px 0;max-height:326px;overflow:hidden}label{font-size:15px;color:#adbed4;text-transform:uppercase;letter-spacing:2px}#status{color:#91e7b0}button{padding:16px 25px;background:#c5dbff;border:0;border-radius:6px;color:#10213c;font:20px system-ui}footer{position:fixed;bottom:24px;font-size:16px;color:#aebcd1}#subtitle{min-height:60px;margin:12px 0}#caption{margin-top:18px;color:#d5e3f8}</style>
<header><div><h1>stark AI Developer Tools</h1><small>Publisher review walkthrough · plugin 1.0.0 · recorded live</small></div><div id="status">Ready</div></header>
<h2 id="title">Two read-only tools. Explicitly supplied metadata.</h2><p id="subtitle">A standalone MCP review client calling the production endpoint. This is not the OpenAI portal or a ChatGPT session.</p>
<div class="grid"><section><label id="leftLabel">What this recording covers</label><pre id="request">1. No-auth MCP initialization and tool discovery\n2. Five positive review scenarios\n3. Three negative review scenarios\n4. Actual requests and server responses\n\nTen bundled skills remain unchanged.\nThis video focuses on the new MCP integration.</pre></section><section><label>Live server response</label><pre id="response">No fabricated results or simulated chat responses.\n\nThe service validates metadata only.\nIt cannot read files, fetch URLs or run shell commands.\n\nNo repository contents, credentials or user data are used.</pre></section></div>
<p id="caption">Endpoint: <code>https://skills-mcp.stark-ai.de/mcp</code> · No auth · No app UI</p><button id="start">Start live walkthrough</button>
<footer id="foot">Synthetic review inputs only · Video demonstrates tool behavior; client/model refusal and installation are separate checks.</footer>
<script>
const cases=${JSON.stringify(cases)};let id=0;window.finished=false;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function call(method,params){const req={jsonrpc:'2.0',id:++id,method,params};document.querySelector('#request').textContent=JSON.stringify(req,null,2);document.querySelector('#response').textContent='Request in progress…';const r=await fetch('/rpc',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(req)});const x=await r.json();if(!r.ok)throw Error(JSON.stringify(x));const value=x.result?.structuredContent??x;document.querySelector('#response').textContent=JSON.stringify(value,null,2);return x;}
function heading(title,sub){document.querySelector('#title').textContent=title;document.querySelector('#subtitle').textContent=sub;document.querySelector('#leftLabel').textContent='JSON-RPC request';}
document.querySelector('#start').onclick=async()=>{document.querySelector('#start').hidden=true;try{
await sleep(3500);document.querySelector('#status').textContent='LIVE · production MCP';
heading('Connect without authentication','Initialize over Streamable HTTP. No account, API key or OAuth flow is required.');
await call('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'publisher-review-walkthrough',version:'1.0.0'}});await sleep(6500);
heading('Discover both validation tools','The server declares read-only, non-destructive tools. It exposes no file, URL or shell operations.');
const tools=await call('tools/list',{});document.querySelector('#response').textContent=JSON.stringify(tools.result.tools.map(t=>({name:t.name,annotations:t.annotations})),null,2);await sleep(8000);
for(const c of cases){heading(c.id+' · '+c.description,c.expected_behavior);document.querySelector('#status').textContent='LIVE · '+c.id+' / 8';for(const tc of c.calls){const x=await call('tools/call',{name:tc.name,arguments:tc.arguments});const okay=tc.parameterError?!!(x.error||x.result?.isError):x.result?.structuredContent?.valid===tc.valid;if(!okay)throw Error('Unexpected result for '+c.id);document.querySelector('#caption').textContent='Observed: '+(tc.parameterError?'unsupported arguments rejected':tc.valid?'valid metadata accepted':'invalid metadata reported')+' · Production response received';await sleep(c.calls.length>1?6500:8500);}}
heading('All eight live scenarios completed','Five positive and three negative scenarios; 13 tool calls. Results checked against the expected contract.');document.querySelector('#status').textContent='COMPLETED';document.querySelector('#request').textContent='✓ Minimal skill metadata\\n✓ Optional skill fields\\n✓ Portable plugin manifest\\n✓ OpenAI manifest\\n✓ Correct and revalidate\\n✓ Missing name / directory mismatch\\n✓ Malformed JSON / schema errors\\n✓ Unsupported path / URL / command arguments';document.querySelector('#response').textContent='Scope and limits\\n\\nOnly explicitly supplied metadata is processed.\\nNo user-file access, outbound URL fetches or shell actions.\\nNo authentication and no payment flow.\\n\\nMetadata validation is not a ZIP audit, security certification or publication approval.\\n\\nThis standalone client does not demonstrate ChatGPT model refusal or native plugin installation.';document.querySelector('#caption').textContent='Privacy: stark-ai-de.github.io/agent-skills/privacy/ · Support: stark-ai-de.github.io/agent-skills/support/';await sleep(10000);window.finished=true;
}catch(e){document.querySelector('#status').textContent='FAILED';document.querySelector('#response').textContent=String(e);window.failed=String(e);window.finished=true;}};
</script></html>`;
http
  .createServer(async (req, res) => {
    try {
      if (req.url === "/" && req.method === "GET") {
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.end(page);
        return;
      }
      if (req.url === "/evidence" && req.method === "GET") {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(events));
        return;
      }
      if (req.url !== "/rpc" || req.method !== "POST") {
        res.writeHead(404).end();
        return;
      }
      let body = "";
      for await (const b of req) {
        body += b;
        if (body.length > 131072) throw Error("Too large");
      }
      const request = JSON.parse(body);
      const start = Date.now();
      const upstream = await fetch("https://skills-mcp.stark-ai.de/mcp", {
        method: "POST",
        redirect: "error",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          "mcp-protocol-version": "2025-06-18",
        },
        body,
        signal: AbortSignal.timeout(20000),
      });
      const text = await upstream.text();
      const response = JSON.parse(
        text.startsWith("{")
          ? text
          : text
              .split("\n")
              .find((l) => l.startsWith("data:"))
              .slice(5)
              .trim(),
      );
      events.push({
        time: new Date().toISOString(),
        durationMs: Date.now() - start,
        status: upstream.status,
        request,
        response,
      });
      fs.writeFileSync("recorded-mcp-responses-new.json", JSON.stringify(events, null, 2) + "\n");
      res
        .writeHead(upstream.status, { "content-type": "application/json" })
        .end(JSON.stringify(response));
    } catch (e) {
      res
        .writeHead(500, { "content-type": "application/json" })
        .end(JSON.stringify({ error: String(e) }));
    }
  })
  .listen(8799, "127.0.0.1", () => console.log("Review client ready on http://127.0.0.1:8799"));
