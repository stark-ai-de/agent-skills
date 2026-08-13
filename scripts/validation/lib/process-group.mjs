import { spawnSync } from "node:child_process";

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function releaseChildHandles(child) {
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

export function terminateProcessGroup(
  child,
  {
    signal = "SIGTERM",
    windowsTreeKill = spawnSync,
    validateWindowsTreeKill = false,
    windowsTreeLabel = "Process tree",
  } = {},
) {
  if (!child?.pid) return;
  try {
    if (process.platform === "win32") {
      const result = windowsTreeKill("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
        encoding: "utf8",
        stdio: "ignore",
        windowsHide: true,
      });
      if (validateWindowsTreeKill && result.error) {
        throw new Error(
          `${windowsTreeLabel} ${child.pid} could not start taskkill: ${result.error.message}`,
        );
      }
      if (validateWindowsTreeKill && result.status !== 0) {
        throw new Error(
          `${windowsTreeLabel} ${child.pid} taskkill failed with status ${result.status ?? "unknown"}.`,
        );
      }
    } else {
      process.kill(-child.pid, signal);
    }
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}

async function waitForProcessGroupExit(pid, timeoutMs, pollIntervalMs) {
  const deadline = Date.now() + timeoutMs;
  while (processGroupExists(pid)) {
    if (Date.now() >= deadline) return false;
    await delay(pollIntervalMs);
  }
  return true;
}

async function waitForChildExit(child, timeoutMs, pollIntervalMs) {
  const deadline = Date.now() + timeoutMs;
  while (child.exitCode === null && child.signalCode === null) {
    if (Date.now() >= deadline) return false;
    await delay(pollIntervalMs);
  }
  return true;
}

export async function settleDetachedProcessGroup(
  child,
  {
    naturalExitGraceMs = 250,
    terminationGraceMs = 5000,
    killGraceMs = 1000,
    terminationPollMs = 50,
    killPollMs = terminationPollMs,
    windowsTreeKill = spawnSync,
    validateWindowsTreeKill = false,
    windowsTreeLabel = "Process tree",
    windowsExitLabel = windowsTreeLabel,
    processGroupLabel = "Process group",
    processGroupFailureMessage = (pid) =>
      `${processGroupLabel} ${pid} remained alive ${killGraceMs}ms after SIGKILL.`,
  } = {},
) {
  if (!child?.pid) return { hadSurvivingProcessGroup: false, escalated: false };

  if (process.platform === "win32") {
    const cleanExit = child.exitCode === 0 && child.signalCode === null;
    if (cleanExit) return { hadSurvivingProcessGroup: false, escalated: false };
    terminateProcessGroup(child, {
      signal: "SIGKILL",
      windowsTreeKill,
      validateWindowsTreeKill,
      windowsTreeLabel,
    });
    if (!(await waitForChildExit(child, killGraceMs, killPollMs))) {
      throw new Error(
        `${windowsExitLabel} ${child.pid} remained alive ${killGraceMs}ms after taskkill.`,
      );
    }
    return { hadSurvivingProcessGroup: false, escalated: true };
  }

  if (!processGroupExists(child.pid)) {
    return { hadSurvivingProcessGroup: false, escalated: false };
  }

  const leaderSucceeded = child.exitCode === 0 && child.signalCode === null;
  if (
    leaderSucceeded &&
    naturalExitGraceMs > 0 &&
    (await waitForProcessGroupExit(child.pid, naturalExitGraceMs, terminationPollMs))
  ) {
    return { hadSurvivingProcessGroup: false, escalated: false };
  }

  terminateProcessGroup(child, { signal: "SIGTERM" });
  if (await waitForProcessGroupExit(child.pid, terminationGraceMs, terminationPollMs)) {
    return { hadSurvivingProcessGroup: true, escalated: false };
  }

  terminateProcessGroup(child, { signal: "SIGKILL" });
  if (await waitForProcessGroupExit(child.pid, killGraceMs, killPollMs)) {
    return { hadSurvivingProcessGroup: true, escalated: true };
  }

  throw new Error(processGroupFailureMessage(child.pid));
}
