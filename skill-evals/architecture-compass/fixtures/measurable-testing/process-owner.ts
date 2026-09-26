import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";
import fs from "node:fs";

function groupIsRunning(group: number): boolean {
  try {
    process.kill(-group, 0);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ESRCH") return false;
    throw error;
  }
  if (process.platform !== "linux") return true;
  // A zombie has no executable work or open resources. Linux may retain its PID
  // until the host reaps it; do not confuse that with a surviving worker.
  for (const name of fs.readdirSync("/proc")) {
    if (!/^\d+$/.test(name)) continue;
    let stat: string;
    try {
      stat = fs.readFileSync(`/proc/${name}/stat`, "utf8");
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") continue;
      throw error;
    }
    const fields = stat.slice(stat.lastIndexOf(") ") + 2).split(" ");
    if (Number(fields[2]) === group && fields[0] !== "Z" && fields[0] !== "X") return true;
  }
  return false;
}

export class ProcessOwner {
  active = new Map<ChildProcess, Promise<void>>();
  spawn(executable: string, args: string[], options: SpawnOptions) {
    if (process.platform === "win32")
      throw new Error("Qualification requires POSIX process groups");
    const child = spawn(executable, args, { ...options, detached: true });
    let finishing = false;
    const done = new Promise<void>((resolve, reject) => {
      const finish = () => {
        if (finishing) return;
        finishing = true;
        // Normal leader exit can leave detached-stdio descendants alive too.
        this.signal(child);
        const reap = async () => {
          const deadline = Date.now() + 3000;
          while (child.pid && groupIsRunning(child.pid)) {
            if (Date.now() >= deadline)
              throw new Error("owned worker survived process-group termination");
            await new Promise<void>((ready) => setTimeout(ready, 10));
          }
          this.active.delete(child);
        };
        reap().then(resolve, reject);
      };
      child.once("close", finish);
      child.once("error", finish);
    });
    this.active.set(child, done);
    // The driver awaits the original promise; prevent an earlier event from
    // becoming an unhandled rejection before the command's close callback.
    void done.catch(() => {});
    return child;
  }
  async wait(child: ChildProcess) {
    await this.active.get(child);
  }
  signal(child: ChildProcess) {
    if (!this.active.has(child) || !child.pid) return;
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "ESRCH") throw error;
    }
  }
  async stop(child: ChildProcess) {
    const done = this.active.get(child);
    if (!done) return;
    this.signal(child);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        done,
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("owned process group did not close after cancellation")),
            5000,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
  async close() {
    const results = await Promise.allSettled(
      [...this.active.keys()].map((child) => this.stop(child)),
    );
    const failed = results.find((result) => result.status === "rejected");
    if (failed) throw failed.reason;
  }
}
