#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";

const commands = [
  [process.execPath, "scripts/validate-architecture-compass.mjs"],
  [process.execPath, "scripts/validation/architecture-compass/test-validator.mjs"],
];

let activeChild = null;
let receivedSignal = null;
let activeSettlement = null;
let rejectSettlementFailure;
const settlementFailure = new Promise((_, reject) => {
  rejectSettlementFailure = reject;
});

const TERMINATION_GRACE_MS = 5000;
const KILL_GRACE_MS = 5000;
const SETTLEMENT_POLL_MS = 50;

function terminate(child, signal = "SIGTERM") {
  if (!child?.pid) return;
  try {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
    } else process.kill(-child.pid, signal);
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}

function releaseChildHandles(child) {
  child.stdin?.destroy();
  child.stdout?.destroy();
  child.stderr?.destroy();
  child.unref();
}

function processGroupExists(pid) {
  if (process.platform === "win32") return false;
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") return false;
    if (error.code === "EPERM") return true;
    throw error;
  }
}

async function settle(child) {
  if (!child?.pid) return;
  terminate(child);
  if (process.platform === "win32") return;

  let deadline = Date.now() + TERMINATION_GRACE_MS;
  while (processGroupExists(child.pid) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, SETTLEMENT_POLL_MS));
  }
  if (processGroupExists(child.pid)) terminate(child, "SIGKILL");

  deadline = Date.now() + KILL_GRACE_MS;
  while (processGroupExists(child.pid) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, SETTLEMENT_POLL_MS));
  }
  if (processGroupExists(child.pid)) {
    throw new Error(
      `Architecture Compass gate process group ${child.pid} remained alive ${KILL_GRACE_MS}ms after SIGKILL.`,
    );
  }
}

function beginSettlement(child) {
  activeSettlement ??= settle(child);
  activeSettlement.catch(rejectSettlementFailure);
  return activeSettlement;
}

const signalHandlers = new Map(
  ["SIGINT", "SIGTERM"].map((signal) => [
    signal,
    () => {
      receivedSignal ??= signal;
      beginSettlement(activeChild);
    },
  ]),
);
for (const [signal, handler] of signalHandlers) process.once(signal, handler);

try {
  for (const command of commands) {
    if (receivedSignal) break;
    const child = spawn(command[0], command.slice(1), {
      cwd: process.cwd(),
      env: process.env,
      detached: process.platform !== "win32",
      shell: false,
      stdio: "inherit",
    });
    activeSettlement = null;
    activeChild = child;
    if (receivedSignal) beginSettlement(child);
    const completion = new Promise((resolve) => {
      let spawnError = null;
      child.once("error", (error) => {
        spawnError = error;
      });
      child.once("close", (code, signal) => resolve({ code, signal, error: spawnError }));
    });
    const result = await Promise.race([completion, settlementFailure]);
    if (receivedSignal || result.error || result.code !== 0 || result.signal) {
      await beginSettlement(child);
    }
    activeChild = null;
    if (receivedSignal) break;
    if (result.error) throw result.error;
    if (result.code !== 0 || result.signal) {
      throw new Error(
        `Architecture Compass gate command failed: ${result.signal ?? result.code ?? "unknown status"}`,
      );
    }
  }
} catch (error) {
  console.error(`Architecture Compass gate failed: ${error.message}`);
  process.exitCode = 1;
  if (activeChild) {
    releaseChildHandles(activeChild);
    activeChild = null;
  }
} finally {
  if (activeChild) {
    try {
      await beginSettlement(activeChild);
    } catch (error) {
      console.error(`Architecture Compass gate cleanup failed: ${error.message}`);
      process.exitCode = 1;
    }
  }
  for (const [signal, handler] of signalHandlers) process.removeListener(signal, handler);
}

if (receivedSignal) process.kill(process.pid, receivedSignal);
