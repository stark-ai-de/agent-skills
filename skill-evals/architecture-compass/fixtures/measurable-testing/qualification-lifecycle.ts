import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ProcessOwner } from "./process-owner.ts";

// Only the fixture driver owns these process-wide handlers and temporary state.
// Return a receipt to the caller only after every resource has been released.
export async function withQualificationResources<T>(
  task: (temporary: string, processes: ProcessOwner) => Promise<T>,
): Promise<T> {
  const processes = new ProcessOwner();
  let temporary: string | undefined;
  let cleanupPromise: Promise<void> | undefined;
  const cleanup = () =>
    (cleanupPromise ??= (async () => {
      const errors: unknown[] = [];
      try {
        await processes.close();
      } catch (error) {
        errors.push(error);
      }
      try {
        if (temporary) fs.rmSync(temporary, { recursive: true, force: true });
      } catch (error) {
        errors.push(error);
      }
      if (errors.length) throw new AggregateError(errors, "qualification cleanup failed");
    })());
  let shutdown: Promise<never> | undefined;
  const cancel = (signal: "SIGINT" | "SIGTERM") => {
    shutdown ??= (async () => {
      try {
        await cleanup();
      } catch (error) {
        console.error(error);
      }
      process.exit(signal === "SIGINT" ? 130 : 143);
    })();
  };
  const interrupt = () => cancel("SIGINT");
  const terminate = () => cancel("SIGTERM");
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", terminate);
  let failed = false;
  let taskError: unknown;
  let result: T | undefined;
  try {
    temporary = fs.mkdtempSync(path.join(os.tmpdir(), "ac-testing-"));
    result = await task(temporary, processes);
  } catch (error) {
    failed = true;
    taskError = error;
  }
  try {
    // Cancellation remains nonzero even if the interrupted task settles first.
    if (shutdown) await shutdown;
    await cleanup();
  } catch (cleanupError) {
    if (failed)
      throw new AggregateError([taskError, cleanupError], "qualification and cleanup failed");
    throw cleanupError;
  } finally {
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", terminate);
  }
  if (failed) throw taskError;
  return result as T;
}
