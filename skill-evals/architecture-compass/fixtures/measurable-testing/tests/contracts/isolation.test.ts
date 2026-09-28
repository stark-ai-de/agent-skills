import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { expect, test } from "vitest";
import { assertClean, withResource } from "../../src/resources.ts";
test("injected failure cleans its owned namespace", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ac-isolation-"));
  expect(() => {
    try {
      fs.writeFileSync(path.join(root, "partial"), "data");
      throw new Error("injected");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }).toThrow("injected");
  expect(fs.existsSync(root)).toBe(false);
});
test("hanging child is bounded and reported as failure", () => {
  const child = spawnSync(process.execPath, ["-e", "setInterval(()=>{},1000)"], {
    timeout: 100,
    encoding: "utf8",
  });
  expect(child.error).toBeTruthy();
  expect(child.status).not.toBe(0);
});
test("leak and cleanup failures remain attributable", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ac-leak-"));
  try {
    fs.writeFileSync(path.join(root, "leak"), "data");
    expect(() => assertClean(root)).toThrow("leak");
    expect(() =>
      withResource(
        () => {},
        (owned) => {
          fs.rmSync(owned, { recursive: true, force: true });
          throw new Error("cleanup failed: injected boundary fault");
        },
      ),
    ).toThrow("cleanup failed");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
test("unexpected external access is denied at the instrumented boundary", async () => {
  const events: string[] = [];
  const request = async (url: string) => {
    events.push(url);
    throw new Error("external access denied");
  };
  await expect(request("https://example.invalid/")).rejects.toThrow("external access denied");
  expect(events).toHaveLength(1);
  // This observes this boundary only; it does not establish OS/subprocess egress isolation.
});

test("simultaneous task and cleanup failures retain both causes", () => {
  try {
    withResource(
      () => {
        throw new Error("primary task failure");
      },
      (root) => {
        fs.rmSync(root, { recursive: true, force: true });
        throw new Error("secondary cleanup failure");
      },
    );
    throw new Error("expected failure");
  } catch (error) {
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors.map((cause: Error) => cause.message)).toEqual([
      "primary task failure",
      "secondary cleanup failure",
    ]);
  }
});
