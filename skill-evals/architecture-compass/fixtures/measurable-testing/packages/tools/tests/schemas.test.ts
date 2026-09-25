import { expect, test } from "vitest";
import { parseRecord } from "../../../src/domain.ts";
for (let index = 0; index < 64; index++)
  test(`tools/schemas record ${index}`, () => {
    const value = { name: `tools/schemas/${index}`, version: index + 1 };
    expect(parseRecord(value)).toEqual(value);
    expect(() => parseRecord({ ...value, version: 0 })).toThrow("positive integer");
  });
