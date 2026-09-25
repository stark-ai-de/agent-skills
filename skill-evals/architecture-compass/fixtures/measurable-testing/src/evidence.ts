export interface Identity {
  subject: string;
  config: string;
  lock: string;
  runtime: string;
  platform: string;
  project: string;
  inputs: string;
  run: string;
  attempt: number;
}
export interface Partition {
  shard: number;
  files: string[];
  cases: string[];
}
export interface Plan {
  identity: Identity;
  partitions: Partition[];
}
export interface Report extends Partition {
  identity: Identity;
  job: string;
  exit: number;
  outcomes: { id: string; status: string }[];
}
const sorted = (xs: string[]) => [...xs].sort();
const sameSet = (a: string[], b: string[]) =>
  new Set(a).size === a.length &&
  new Set(b).size === b.length &&
  JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
export function assertComplete(plan: Plan, reports: Report[]): void {
  if (!plan.partitions.length || reports.length !== plan.partitions.length)
    throw new Error("missing or extra report");
  const allFiles: string[] = [],
    allCases: string[] = [],
    shards = new Set<number>();
  for (const part of plan.partitions) {
    if (shards.has(part.shard) || !part.files.length || !part.cases.length)
      throw new Error("invalid expected partition");
    shards.add(part.shard);
    allFiles.push(...part.files);
    allCases.push(...part.cases);
    const matches = reports.filter((r) => r.shard === part.shard);
    if (matches.length !== 1) throw new Error("missing or duplicate shard");
    const report = matches[0];
    const identityKeys = Object.keys(plan.identity) as (keyof Identity)[];
    if (
      Object.keys(report.identity).length !== identityKeys.length ||
      identityKeys.some((k) => plan.identity[k] !== report.identity[k])
    )
      throw new Error("foreign identity");
    if (report.job !== "success" || report.exit !== 0)
      throw new Error("required predecessor failed or incomplete");
    if (
      !sameSet(part.files, report.files) ||
      !sameSet(part.cases, report.cases) ||
      !sameSet(
        part.cases,
        report.outcomes.map((o) => o.id),
      )
    )
      throw new Error("inventory mismatch");
    if (report.outcomes.some((o) => o.status !== "passed")) throw new Error("case not passed");
  }
  if (new Set(allFiles).size !== allFiles.length || new Set(allCases).size !== allCases.length)
    throw new Error("overlapping partition");
}
export function measurement(input: {
  baseline?: number | null;
  denominator?: number | null;
  observed?: number | null;
  target: number;
  waiverExpiry?: string;
  now: string;
  percentile?: number;
  samples?: number;
  notApplicableEvidence?: string;
}): string {
  if (
    input.waiverExpiry &&
    (!Number.isFinite(Date.parse(input.waiverExpiry)) || !Number.isFinite(Date.parse(input.now)))
  )
    return "unmeasured";
  if (input.waiverExpiry)
    return Date.parse(input.waiverExpiry) > Date.parse(input.now) ? "waived" : "unmet";
  if (input.denominator === 0) return input.notApplicableEvidence ? "not-applicable" : "unmeasured";
  if (
    ![input.baseline, input.denominator, input.observed, input.target].every(
      (value) => typeof value === "number" && Number.isFinite(value) && value >= 0,
    ) ||
    (input.percentile && (input.samples ?? 0) < 100)
  )
    return "unmeasured";
  return input.observed! <= input.target ? "met" : "unmet";
}
