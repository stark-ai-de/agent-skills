import { spawn as nodeSpawn } from "node:child_process";
import { SetupError } from "./errors.mjs";

const DEFAULT_TERMINATION_GRACE_MS = 2_000;
const DEFAULT_FORCE_KILL_GRACE_MS = 2_000;

function processTerminal(child) {
  return (
    Number.isInteger(child.exitCode) ||
    (child.signalCode !== null && child.signalCode !== undefined)
  );
}

export async function runBoundedCommand(executable, args, options = {}, dependencies = {}) {
  return await new Promise((resolve, reject) => {
    const displayExecutable = options.displayExecutable ?? executable;
    const failureCode = options.failureCode ?? "command_failed";
    const label = options.label ?? "Command";
    const maxBytes = options.maxBytes ?? 1_048_576;
    const timeoutCode = options.timeoutCode ?? "command_timeout";
    const timeoutMs = options.timeoutMs ?? 300_000;
    const terminationGraceMs = options.terminationGraceMs ?? DEFAULT_TERMINATION_GRACE_MS;
    const forceKillGraceMs = options.forceKillGraceMs ?? DEFAULT_FORCE_KILL_GRACE_MS;
    const deadlineReserveMs = options.deadlineReserveMs ?? 0;
    const deadlineAt = options.deadlineAt;
    const startedAt = Date.now();
    const hasDeadline = deadlineAt !== undefined && deadlineAt !== null;
    const completionDeadlineAt = hasDeadline ? Number(deadlineAt) - deadlineReserveMs : null;
    const timeoutError = () =>
      new SetupError(timeoutCode, `${label} timed out: ${displayExecutable}`);
    if (
      !Number.isFinite(timeoutMs) ||
      timeoutMs < 0 ||
      !Number.isFinite(terminationGraceMs) ||
      terminationGraceMs < 0 ||
      !Number.isFinite(forceKillGraceMs) ||
      forceKillGraceMs < 0 ||
      !Number.isFinite(deadlineReserveMs) ||
      deadlineReserveMs < 0 ||
      (hasDeadline && (!Number.isFinite(completionDeadlineAt) || completionDeadlineAt <= startedAt))
    ) {
      reject(timeoutError());
      return;
    }
    const runtimeDeadlineAt = hasDeadline
      ? Math.min(
          startedAt + timeoutMs,
          completionDeadlineAt - terminationGraceMs - forceKillGraceMs,
        )
      : startedAt + timeoutMs;
    if (!Number.isFinite(runtimeDeadlineAt) || runtimeDeadlineAt <= startedAt) {
      reject(timeoutError());
      return;
    }

    const spawnProcess = dependencies.spawn ?? nodeSpawn;
    let child;
    try {
      child = spawnProcess(executable, args, {
        cwd: options.cwd,
        env: options.env,
        stdio: ["ignore", "pipe", "pipe"],
        windowsVerbatimArguments: options.windowsVerbatimArguments,
        windowsHide: options.windowsHide ?? true,
      });
    } catch (error) {
      reject(error);
      return;
    }

    const stdout = { chunks: [], bytes: 0 };
    const stderr = { chunks: [], bytes: 0 };
    const decode = (capture) => Buffer.concat(capture.chunks).toString("utf8").trim();
    let failure = null;
    let settled = false;
    let timeoutTimer;
    let escalationTimer;
    let confirmationTimer;

    const clearTimers = () => {
      clearTimeout(timeoutTimer);
      clearTimeout(escalationTimer);
      clearTimeout(confirmationTimer);
    };
    const settle = (operation, value) => {
      if (settled) return;
      settled = true;
      clearTimers();
      operation(value);
    };
    const rejectUnconfirmedTermination = () => {
      const error = new SetupError(
        "subprocess_termination_unconfirmed",
        `${label} did not confirm termination after bounded kill escalation: ${displayExecutable}`,
        {
          causeCode: failure?.code ?? failureCode,
          cleanupSafe: false,
          terminalStateObserved: processTerminal(child),
        },
      );
      settle(reject, error);
      child.unref?.();
      child.stdout.destroy?.();
      child.stderr.destroy?.();
    };
    const terminate = (reason) => {
      if (settled || failure) return;
      failure = reason;
      try {
        child.kill("SIGTERM");
      } catch {
        // A bounded SIGKILL attempt and close confirmation still follow.
      }
      if (settled) return;
      const escalationDelay = hasDeadline
        ? Math.max(
            0,
            Math.min(terminationGraceMs, completionDeadlineAt - Date.now() - forceKillGraceMs),
          )
        : terminationGraceMs;
      escalationTimer = setTimeout(() => {
        if (settled) return;
        if (!processTerminal(child)) {
          try {
            child.kill("SIGKILL");
          } catch {
            // The confirmation deadline below turns this into a fail-closed conflict.
          }
        }
        const confirmationDelay = hasDeadline
          ? Math.max(0, Math.min(forceKillGraceMs, completionDeadlineAt - Date.now()))
          : forceKillGraceMs;
        confirmationTimer = setTimeout(rejectUnconfirmedTermination, confirmationDelay);
      }, escalationDelay);
    };
    const collect = (capture, chunk) => {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      if (capture.bytes + bytes.byteLength > maxBytes) {
        terminate(
          new SetupError(
            failureCode,
            `${label} output exceeded its bounded capture: ${displayExecutable}`,
          ),
        );
        return;
      }
      capture.bytes += bytes.byteLength;
      capture.chunks.push(bytes);
    };

    child.stdout.on("data", (chunk) => {
      collect(stdout, chunk);
    });
    child.stderr.on("data", (chunk) => {
      collect(stderr, chunk);
    });
    child.once("error", (error) => {
      if (failure) return;
      if (!Number.isInteger(child.pid)) {
        settle(reject, error);
        return;
      }
      terminate(
        new SetupError(failureCode, `${label} failed: ${displayExecutable}`, {
          reason: error.message,
        }),
      );
    });
    child.once("close", (code, signal) => {
      if (!failure && hasDeadline && Date.now() > completionDeadlineAt) {
        failure = timeoutError();
      }
      if (failure) {
        settle(reject, failure);
        return;
      }
      if (code !== 0) {
        settle(
          reject,
          new SetupError(failureCode, `${label} failed: ${displayExecutable}`, {
            code,
            signal,
            stderr: decode(stderr).slice(0, 4_096),
          }),
        );
        return;
      }
      settle(resolve, { stdout: decode(stdout), stderr: decode(stderr) });
    });
    timeoutTimer = setTimeout(
      () => {
        terminate(timeoutError());
      },
      Math.max(1, runtimeDeadlineAt - Date.now()),
    );
  });
}
