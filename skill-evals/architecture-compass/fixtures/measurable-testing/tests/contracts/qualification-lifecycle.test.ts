import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, vi } from "vitest";
import { ProcessOwner } from "../../process-owner.ts";
import { withQualificationResources } from "../../qualification-lifecycle.ts";

for (const taskFails of [false, true])
  test(`cleanup failure blocks receipt publication and preserves task failure: ${taskFails}`, async () => {
    let root = "";
    let published = false;
    const remove = fs.rmSync;
    const spy = vi.spyOn(fs, "rmSync").mockImplementation((target, options) => {
      if (target === root) throw new Error("injected removal failure");
      return remove(target, options);
    });
    try {
      await expect(
        withQualificationResources(async (temporary) => {
          root = temporary;
          if (taskFails) throw new Error("injected task failure");
          return { status: "verified" };
        }).then(() => {
          published = true;
        }),
      ).rejects.toSatisfy((error: AggregateError) => {
        expect(error).toBeInstanceOf(AggregateError);
        const causes = error.errors.flatMap((cause) =>
          cause instanceof AggregateError ? cause.errors : [cause],
        );
        expect(causes.map((cause: Error) => cause.message)).toEqual(
          taskFails
            ? ["injected task failure", "injected removal failure"]
            : ["injected removal failure"],
        );
        return true;
      });
      expect(published).toBe(false);
    } finally {
      spy.mockRestore();
      if (root) remove(root, { recursive: true, force: true });
    }
  });

test("early setup failure removes its temporary target and closes ownership", async () => {
  let root = "";
  let owner: ProcessOwner | undefined;
  await expect(
    withQualificationResources(async (temporary, processes) => {
      root = temporary;
      owner = processes;
      fs.writeFileSync(path.join(root, "partial-copy"), "partial");
      throw new Error("injected setup failure");
    }),
  ).rejects.toThrow("injected setup failure");
  expect(fs.existsSync(root)).toBe(false);
  expect(() => owner!.spawn(process.execPath, [], {})).toThrow("owner is closed");
});

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    if (process.platform !== "linux") return true;
    const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
    return !["Z", "X"].includes(stat.slice(stat.lastIndexOf(") ") + 2).split(" ")[0]);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      ["ESRCH", "ENOENT"].includes(String(error.code))
    )
      return false;
    throw error;
  }
}

for (const signal of ["SIGINT", "SIGTERM"] as const)
  test(`qualification ${signal} removes owned targets and detached workers without publishing`, async () => {
    const owner = new ProcessOwner();
    const markerRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ac-cancel-proof-"));
    const receipt = path.join(markerRoot, "receipt.json");
    const lifecycle = fileURLToPath(new URL("../../qualification-lifecycle.ts", import.meta.url));
    const workerCode = "setInterval(()=>{},1000)";
    const leaderCode = `const {spawn}=require("node:child_process");const child=spawn(process.execPath,["-e",${JSON.stringify(workerCode)}],{stdio:"inherit"});console.log(child.pid);setInterval(()=>{},1000);`;
    const code = `
      import fs from "node:fs";
      import { withQualificationResources } from ${JSON.stringify(lifecycle)};
      await withQualificationResources(async (temporary, processes) => {
        const child = processes.spawn(process.execPath, ["-e", ${JSON.stringify(leaderCode)}], {stdio:["ignore","pipe","pipe"]});
        child.stdout.once("data", data => console.log(JSON.stringify({temporary,leader:child.pid,worker:Number(String(data).trim())})));
        await new Promise(() => {});
      });
      fs.writeFileSync(${JSON.stringify(receipt)}, "verified");
    `;
    const child = owner.spawn(process.execPath, ["--input-type=module", "-e", code], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let state: { temporary: string; leader: number; worker: number } | undefined;
    try {
      state = await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("cancellation fixture did not start")),
          2000,
        );
        let output = "";
        child.stdout!.on("data", (data) => {
          output += data;
          if (output.includes("\n")) {
            clearTimeout(timer);
            resolve(JSON.parse(output.split("\n")[0]));
          }
        });
        child.once("error", (error) => {
          clearTimeout(timer);
          reject(error);
        });
      });
      if (!state) throw new Error("missing cancellation fixture state");
      expect(state.worker).toBeGreaterThan(0);
      const closed = new Promise((resolve) =>
        child.once("close", (code, signal) => resolve({ code, signal })),
      );
      child.kill(signal);
      expect(await closed).toEqual({ code: signal === "SIGINT" ? 130 : 143, signal: null });
      await owner.wait(child);
      expect(isRunning(state.leader)).toBe(false);
      expect(isRunning(state.worker)).toBe(false);
      expect(fs.existsSync(state.temporary)).toBe(false);
      expect(fs.existsSync(receipt)).toBe(false);
    } finally {
      await owner.close();
      if (state) {
        try {
          process.kill(-state.leader, "SIGKILL");
        } catch {}
        fs.rmSync(state.temporary, { recursive: true, force: true });
      }
      fs.rmSync(markerRoot, { recursive: true, force: true });
    }
  });
