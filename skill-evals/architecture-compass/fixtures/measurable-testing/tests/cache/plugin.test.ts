import { expect, test } from "vitest";
import { pluginValue } from "../../src/plugin-value.ts";
test("plugin-read input invalidates the transformed module", () =>
  expect(pluginValue).toBe(Number(process.env.EXPECT_PLUGIN_VALUE ?? "7")));
