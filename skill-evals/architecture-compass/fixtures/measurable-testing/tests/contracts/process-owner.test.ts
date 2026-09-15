import { expect, test } from "vitest";
import { ProcessOwner } from "../../process-owner.ts";
test("owned cancellation reaps worker processes holding inherited pipes", async () => {
  const owner = new ProcessOwner();
  const code =
    'const {spawn}=require("node:child_process");spawn(process.execPath,["-e","setTimeout(()=>{},10000)"],{stdio:["ignore","inherit","inherit"]});console.log("ready");setTimeout(()=>{},10000);';
  const child = owner.spawn(process.execPath, ["-e", code], { stdio: ["ignore", "pipe", "pipe"] });
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("fixture did not start")), 3000);
      child.once("error", reject);
      child.stdout!.once("data", () => {
        clearTimeout(timer);
        resolve();
      });
    });
    const begin = performance.now();
    await owner.stop(child);
    expect(performance.now() - begin).toBeLessThan(2000);
    expect(owner.active.size).toBe(0);
  } finally {
    await owner.close();
  }
});

test("normal leader exit terminates unreferenced descendants with ignored stdio", async () => {
  const owner = new ProcessOwner();
  const code =
    'const {spawn}=require("node:child_process");const child=spawn(process.execPath,["-e","setTimeout(()=>{},10000)"],{stdio:"ignore"});child.unref();console.log(child.pid);';
  const child = owner.spawn(process.execPath, ["-e", code], { stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout!.on("data", (data) => {
    output += data;
  });
  try {
    await new Promise<void>((resolve, reject) => {
      child.once("close", () => resolve());
      child.once("error", reject);
    });
    await owner.wait(child);
    expect(Number(output.trim())).toBeGreaterThan(0);
    expect(owner.active.size).toBe(0);
  } finally {
    await owner.close();
  }
});
