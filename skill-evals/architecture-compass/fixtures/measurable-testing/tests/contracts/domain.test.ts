import { expect, test } from "vitest";
import { parseRecord } from "../../src/domain.ts";
test("public production parser retains positive and negative behavior", () => {
  expect(parseRecord({ name: "package", version: 1 })).toEqual({ name: "package", version: 1 });
  for (const value of [
    null,
    {},
    { name: "", version: 1 },
    { name: "x", version: 0 },
    { name: "x", version: "1" },
  ])
    expect(() => parseRecord(value)).toThrow("record requires");
});
