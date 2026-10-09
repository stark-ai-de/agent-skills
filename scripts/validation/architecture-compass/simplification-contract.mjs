/**
 * Structural instruction-contract checks, not an agent-performance evaluation.
 * One pure owner is shared by the catalog validator and malformed-input tests.
 */
export function simplificationContractErrors({ skill, worksheet, lifecycle, report }) {
  const errors = [];
  const text = (value) => (typeof value === "string" ? value.replace(/\s+/g, " ") : "");
  const requireMatch = (value, pattern, code, message) => {
    if (!pattern.test(text(value))) errors.push(`[${code}] ${message}`);
  };
  const link =
    "ac-adr-006-assign-workspace-ownership-and-source-roles.guide.md#simplification-loop";
  const entry = typeof skill === "string" ? skill.indexOf(link) : -1;
  const setup = typeof skill === "string" ? skill.indexOf("### `setup`") : -1;
  if (entry < 0 || setup < 0 || entry >= setup || skill.indexOf(link, entry + 1) !== -1) {
    errors.push("[SIM-001] Dispatch once to the shared worksheet before route-specific steps.");
  }
  requireMatch(
    lifecycle,
    /ac-adr-006-assign-workspace-ownership-and-source-roles\.guide\.md#simplification-loop/,
    "SIM-002",
    "Planning must link to the same simplification worksheet.",
  );
  requireMatch(
    worksheet,
    /not a new adoptable policy, mandatory optimization pass, or sixth workflow/,
    "SIM-003",
    "The optional worksheet must not introduce another workflow or policy.",
  );
  requireMatch(
    worksheet,
    /An audit reports candidates without writing files; planning does not authorize implementation/,
    "SIM-004",
    "Preserve audit and planning no-write authority.",
  );
  for (const heading of [
    "1. Establish scope and evidence",
    "2. Compare the smallest supported alternatives",
    "3. Keep real boundaries while removing duplication",
    "4. Execute and re-evaluate a bounded slice",
    "5. Report attributable savings and limits",
  ]) {
    if (
      typeof worksheet !== "string" ||
      !worksheet.replaceAll("\r\n", "\n").includes(`### ${heading}\n`)
    ) {
      errors.push(`[SIM-005] Missing worksheet phase: ${heading}.`);
    }
  }
  requireMatch(
    worksheet,
    /tracked and non-ignored untracked files/,
    "SIM-006",
    "Inventory must account for untracked source.",
  );
  requireMatch(
    worksheet,
    /Do not follow symlinks outside the authorized scope/,
    "SIM-007",
    "Inventory must preserve the authorized path boundary.",
  );
  requireMatch(
    worksheet,
    /actual installed version\/runtime matrix/,
    "SIM-008",
    "Library equivalence needs target-version evidence.",
  );
  requireMatch(
    worksheet,
    /required behavior proved/,
    "SIM-009",
    "Reduction claims need behavior proof.",
  );
  requireMatch(
    worksheet,
    /Convergence requires a complete final pass/,
    "SIM-010",
    "Convergence needs complete final-pass evidence.",
  );
  requireMatch(
    worksheet,
    /blocked or bounded stops, not evidence of convergence/,
    "SIM-011",
    "Blocked stops must not be reported as convergence.",
  );
  requireMatch(
    worksheet,
    /Do not stage files to measure savings/,
    "SIM-012",
    "Counting must preserve the Git index.",
  );
  requireMatch(
    worksheet,
    /mark totals incomplete and do not claim a verified net reduction/,
    "SIM-013",
    "Incomplete counts cannot prove a net reduction.",
  );
  requireMatch(
    worksheet,
    /Keep the original cumulative baseline/,
    "SIM-014",
    "Keep cumulative attribution across concurrent changes.",
  );
  requireMatch(
    report,
    /untracked additions/,
    "SIM-015",
    "The report must include untracked support code.",
  );
  requireMatch(
    report,
    /distinguish convergence from blocked or incomplete work/,
    "SIM-016",
    "The report must distinguish complete and bounded outcomes.",
  );
  return errors;
}
