import { expect, test } from "vitest";
import { parseRecord } from "../../../src/domain.ts";
for (let index = 0; index < 64; index++)
  test(`api/documents record ${index}`, () => {
    const value = { name: `api/documents/${index}`, version: index + 1 };
    expect(parseRecord(value)).toEqual(value);
    expect(() => parseRecord({ ...value, version: 0 })).toThrow("positive integer");
  });
