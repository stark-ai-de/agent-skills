/* Tokens stay in this page's memory; no URL, localStorage or terminal HTML interpolation. */
const status = document.querySelector("#status");
const terminalElement = document.querySelector("#terminal");
const term = new window.Terminal({ cursorBlink: true, scrollback: 1000 });
const fit = new window.FitAddon.FitAddon();
term.loadAddon(fit);
term.open(terminalElement);
fit.fit();
let token,
  actorId,
  sessionId,
  socket,
  cursor = 0,
  polling,
  pulling = false,
  writer = false,
  inputRequested = false,
  writerRequest,
  writerRenewedAt = 0,
  inputQueue = Promise.resolve(),
  queuedInputBytes = 0,
  sessionState,
  recordingPaused = false,
  attached = false,
  generation = 0;
const call = async (name, args) => {
  const response = await fetch("/v1/" + name, {
    method: "POST",
    headers: { authorization: "Bearer " + token, "content-type": "application/json" },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(30000),
  });
  const body = await response.json();
  if (!response.ok) throw Object.assign(new Error(body.error.message), { code: body.error.code });
  return body.data;
};
function updateSession(session, paused = recordingPaused) {
  sessionState = session.state;
  recordingPaused = paused;
  writer = session.state === "running" && !!actorId && session.writer === actorId;
  if (session.state !== "running") inputRequested = false;
  const input = writer
    ? " · input active"
    : session.writer
      ? " · another client has input"
      : inputRequested
        ? " · input paused; type or paste to resume"
        : " · click Acquire input to type";
  status.textContent =
    session.state +
    (session.state === "running" ? input : "") +
    (paused ? " · recording paused (vault locked)" : "");
}
async function acquireWriter(refresh = false) {
  if (
    !inputRequested ||
    !token ||
    !attached ||
    sessionState !== "running" ||
    socket?.readyState !== 1
  )
    return false;
  if (writerRequest) return writerRequest;
  if (!refresh && writer && performance.now() - writerRenewedAt < 10000) return true;
  const current = generation;
  const request = call("ssh_session_writer", { sessionId })
    .then((session) => {
      if (current !== generation || !attached || !inputRequested || socket?.readyState !== 1)
        return false;
      writerRenewedAt = performance.now();
      updateSession(session);
      if (writer && (session.cols !== term.cols || session.rows !== term.rows))
        socket.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
      return writer;
    })
    .catch((error) => {
      if (current === generation) {
        writer = false;
        status.textContent = error.message;
      }
      return false;
    })
    .finally(() => {
      if (writerRequest === request) writerRequest = undefined;
    });
  writerRequest = request;
  return request;
}
async function pull() {
  if (!token || !attached || pulling) return;
  pulling = true;
  const current = generation;
  try {
    const data = await call("ssh_session_attach", { sessionId, cursor });
    if (current !== generation) return;
    if (data.output.gap) {
      term.reset();
      term.write(data.snapshot);
    } else for (const part of data.output.parts) term.write(part.text);
    cursor = data.cursor;
    updateSession(data.session, data.recordingPaused);
  } catch (error) {
    if (current !== generation) return;
    status.textContent = error.message;
    writer = false;
  } finally {
    pulling = false;
  }
}
async function detach() {
  generation++;
  attached = false;
  clearInterval(polling);
  writer = false;
  inputRequested = false;
  actorId = undefined;
  sessionState = undefined;
  writerRequest = undefined;
  inputQueue = Promise.resolve();
  queuedInputBytes = 0;
  socket?.close();
  if (token) {
    try {
      await call("clients/detach", {});
    } catch {
      /* Expiry also releases the writer. */
    }
  }
  token = undefined;
  document.querySelector("#writer").disabled = true;
  document.querySelector("#detach").disabled = true;
}
document.querySelector("#login").addEventListener("submit", async (event) => {
  event.preventDefault();
  await detach();
  sessionId = document.querySelector("#session").value;
  const bootstrap = document.querySelector("#token").value;
  document.querySelector("#token").value = "";
  try {
    const response = await fetch("/v1/clients", {
      method: "POST",
      headers: { authorization: "Bearer " + bootstrap, "content-type": "application/json" },
      body: "{}",
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error.message);
    token = body.data.token;
    actorId = body.data.actor.id;
    socket = new WebSocket(location.origin.replace(/^http/, "ws") + "/v1/events");
    const current = generation;
    socket.onopen = () => socket.send(JSON.stringify({ token, sessionId }));
    socket.onmessage = (event) => {
      if (current !== generation) return;
      const message = JSON.parse(event.data);
      if (message.type === "attached") {
        term.reset();
        term.write(message.data.snapshot);
        cursor = message.data.cursor;
        attached = true;
        updateSession(message.data.session, message.data.recordingPaused);
        document.querySelector("#writer").disabled = false;
      } else if (message.type === "error") {
        status.textContent = message.error.message;
        writer = false;
      } else if (message.type !== "accepted") void pull();
    };
    socket.onclose = () => {
      if (current !== generation) return;
      generation++;
      attached = false;
      writer = false;
      inputRequested = false;
      document.querySelector("#writer").disabled = true;
      status.textContent = "Viewer disconnected; reattach for a current snapshot.";
    };
    document.querySelector("#detach").disabled = false;
    polling = setInterval(pull, 1000);
  } catch (error) {
    status.textContent = error.message;
  }
});
document.querySelector("#writer").onclick = async () => {
  inputRequested = true;
  if (await acquireWriter(true)) term.focus();
};
document.querySelector("#detach").onclick = detach;
term.onData((data) => {
  if (!inputRequested || !attached || socket?.readyState !== 1) return;
  const bytes = new TextEncoder().encode(data).length;
  if (bytes > 16384 || queuedInputBytes + bytes > 65536) {
    status.textContent = "Terminal input is too large or still pending; wait before trying again.";
    return;
  }
  const current = generation;
  queuedInputBytes += bytes;
  // Keep paste/keystroke order while awaiting a renewed lease. Never replay an
  // input message after sending it, and never request a forced writer handoff.
  inputQueue = inputQueue
    .then(async () => {
      if (current !== generation || !(await acquireWriter())) return;
      if (current === generation && attached && socket?.readyState === 1)
        socket.send(JSON.stringify({ type: "input", data }));
    })
    .catch((error) => {
      if (current === generation) status.textContent = error.message;
    })
    .finally(() => {
      if (current === generation) queuedInputBytes -= bytes;
    });
});
function resumeInput() {
  if (inputRequested && attached && !document.hidden && document.hasFocus())
    void acquireWriter(true);
}
window.addEventListener("focus", resumeInput);
document.addEventListener("visibilitychange", resumeInput);
terminalElement.addEventListener("pointerdown", resumeInput);
new ResizeObserver(() => {
  fit.fit();
  // Layout alone must not send privileged messages with an expired lease.
  if (writer && performance.now() - writerRenewedAt < 10000 && socket?.readyState === 1)
    socket.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
}).observe(terminalElement);
window.addEventListener("pagehide", () => {
  generation++;
  attached = false;
  inputRequested = false;
  writer = false;
  clearInterval(polling);
  document.querySelector("#writer").disabled = true;
  status.textContent = "Viewer disconnected; reattach for a current snapshot.";
  socket?.close();
});
