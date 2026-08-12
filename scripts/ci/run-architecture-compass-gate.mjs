#!/usr/bin/env node
import { spawn } from "node:child_process";

import {
  releaseChildHandles,
  settleDetachedProcessGroup,
} from "../validation/lib/process-group.mjs";

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

async function settle(child) {
  return await settleDetachedProcessGroup(child, {
    terminationGraceMs: TERMINATION_GRACE_MS,
    killGraceMs: KILL_GRACE_MS,
    terminationPollMs: SETTLEMENT_POLL_MS,
    killPollMs: SETTLEMENT_POLL_MS,
    processGroupLabel: "Architecture Compass gate process group",
  });
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
    const settlement = await beginSettlement(child);
    activeChild = null;
    if (receivedSignal) break;
    if (result.error) throw result.error;
    if (result.code !== 0 || result.signal) {
      throw new Error(
        `Architecture Compass gate command failed: ${result.signal ?? result.code ?? "unknown status"}`,
      );
    }
    if (settlement.hadSurvivingProcessGroup) {
      throw new Error(
        "Architecture Compass gate command left its process group active after successful leader exit.",
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
