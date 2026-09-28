import { expect, test } from "vitest";
import { restoreTrustedCache } from "../../src/cache.ts";
test("cache admission rejects mismatched trust or inputs before consumption", () => {
  let consumed = 0;
  const expected = { trust: "release", inputs: "digest-a" };
  expect(
    restoreTrustedCache({ trust: "pull-request", inputs: "digest-a" }, expected, () => {
      consumed++;
    }),
  ).toBe(false);
  expect(
    restoreTrustedCache({ trust: "release", inputs: "digest-b" }, expected, () => {
      consumed++;
    }),
  ).toBe(false);
  expect(consumed).toBe(0);
  expect(
    restoreTrustedCache(expected, expected, () => {
      consumed++;
    }),
  ).toBe(true);
  expect(consumed).toBe(1);
});
