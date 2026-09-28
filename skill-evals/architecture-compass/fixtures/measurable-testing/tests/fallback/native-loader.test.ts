import { expect, test, vi } from "vitest";
vi.mock("../../src/domain.ts", () => ({ parseRecord: () => ({ name: "mocked", version: 1 }) }));
import { parseRecord } from "../../src/domain.ts";
test("native-loader module mocking", () => expect(parseRecord(null).name).toBe("mocked"));
