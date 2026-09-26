import { expect, test } from "vitest";
import { assertComplete, measurement, type Plan, type Report } from "../../src/evidence.ts";
const identity = {
  subject: "tree-a",
  config: "config-a",
  lock: "lock-a",
  runtime: "runtime-a",
  platform: "linux",
  project: "contracts",
  inputs: "inputs-a",
  run: "run-a",
  attempt: 1,
};
const plan: Plan = {
  identity,
  partitions: [
    { shard: 1, files: ["a.ts"], cases: ["a.ts:works"] },
    { shard: 2, files: ["b.ts"], cases: ["b.ts:works"] },
  ],
};
const valid: Report[] = plan.partitions.map((p) => ({
  ...p,
  identity,
  job: "success",
  exit: 0,
  outcomes: p.cases.map((id) => ({ id, status: "passed" })),
}));
test("complete independent partition passes", () =>
  expect(() => assertComplete(plan, valid)).not.toThrow());
const faults: Record<string, (r: Report[]) => void> = {
  "missing report": (r) => {
    r.pop();
  },
  "extra report": (r) => {
    r.push(r[0]);
  },
  "duplicate shard": (r) => {
    r[1].shard = 1;
  },
  "foreign subject": (r) => {
    r[0].identity.subject = "foreign";
  },
  "foreign config": (r) => {
    r[0].identity.config = "foreign";
  },
  "foreign attempt": (r) => {
    r[0].identity.attempt = 2;
  },
  "missing file": (r) => {
    r[0].files = [];
  },
  "missing case": (r) => {
    r[0].outcomes = [];
  },
  "duplicate case": (r) => {
    r[0].outcomes.push(r[0].outcomes[0]);
  },
  "failed case": (r) => {
    r[0].outcomes[0].status = "failed";
  },
  "skipped case": (r) => {
    r[0].outcomes[0].status = "pending";
  },
  "failed job": (r) => {
    r[0].job = "failure";
  },
  "cancelled job": (r) => {
    r[0].job = "cancelled";
  },
  "skipped job": (r) => {
    r[0].job = "skipped";
  },
  "nonzero exit": (r) => {
    r[0].exit = 1;
  },
};
for (const [name, mutate] of Object.entries(faults))
  test(`rejects ${name}`, () => {
    const r = structuredClone(valid);
    mutate(r);
    expect(() => assertComplete(plan, r)).toThrow();
  });
test("rejects overlap in the independently supplied plan", () => {
  const p = structuredClone(plan);
  p.partitions[1].files = ["a.ts"];
  expect(() => assertComplete(p, valid)).toThrow();
});
test("measurements never invent evidence or turn waivers into met", () => {
  const base = { baseline: 10, denominator: 10, observed: 5, target: 6, now: "2026-09-14" };
  expect(measurement(base)).toBe("met");
  for (const value of [null, NaN, Infinity, -1]) {
    expect(measurement({ ...base, baseline: value })).toBe("unmeasured");
    expect(measurement({ ...base, denominator: value })).toBe("unmeasured");
    expect(measurement({ ...base, observed: value })).toBe("unmeasured");
  }
  expect(measurement({ ...base, target: NaN })).toBe("unmeasured");
  expect(measurement({ ...base, observed: 7 })).toBe("unmet");
  expect(measurement({ ...base, baseline: undefined })).toBe("unmeasured");
  expect(measurement({ ...base, denominator: undefined })).toBe("unmeasured");
  expect(measurement({ ...base, waiverExpiry: "2026-09-13" })).toBe("unmet");
  expect(measurement({ ...base, waiverExpiry: "2026-10-01" })).toBe("waived");
  expect(measurement({ ...base, percentile: 95, samples: 5 })).toBe("unmeasured");
  expect(measurement({ ...base, denominator: 0 })).toBe("unmeasured");
  expect(measurement({ ...base, denominator: 0, notApplicableEvidence: "no transform lane" })).toBe(
    "not-applicable",
  );
});

test("offset waiver timestamps use chronological expiry", () => {
  expect(
    measurement({
      baseline: 10,
      denominator: 10,
      observed: 5,
      target: 6,
      waiverExpiry: "2026-09-14T01:00:00+02:00",
      now: "2026-09-14T00:00:00Z",
    }),
  ).toBe("unmet");
});
