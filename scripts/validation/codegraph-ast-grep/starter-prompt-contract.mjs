export function starterPromptFindings(prompt) {
  if (typeof prompt !== "string" || !prompt.trim()) return ["default prompt must be a string"];
  const checks = [
    ["must invoke the skill", /\$codegraph-ast-grep\b/],
    [
      "clear intent must include root, scope, and authority",
      /when intent, root, scope, and authority are clear/i,
    ],
    [
      "clear intent must announce only the selected workflow",
      /announce only the selected setup, update, or doctor workflow/i,
    ],
    [
      "clear intent must not enumerate unselected workflows",
      /do not enumerate unselected workflows/i,
    ],
    ["clear intent must proceed", /(?:and proceed|then proceed)/i],
    [
      "bare and ambiguous requests must show the inventory",
      /bare or materially ambiguous request/i,
    ],
    ["explicit options requests must show the inventory", /explicit options request/i],
    ["inventory must be complete and ordered", /show setup, update, and doctor in order/i],
    [
      "options-only requests must not inspect state",
      /options-only request authorizes no repository or tool inspection/i,
    ],
    ["options-only requests must not execute", /options-only request[^.]*no execution/i],
    ["installer provenance must be preserved", /preserve installer provenance/i],
    ["protected state must be preserved", /protected state/i],
    ["doctor must remain non-repairing", /doctor non-repairing/i],
    [
      "graph diagnostics need exact-root approval",
      /exact-root approval before graph diagnostics that may migrate metadata/i,
    ],
    ["setup must persist guidance", /persist repository guidance after setup/i],
  ];
  const findings = checks
    .filter(([, pattern]) => !pattern.test(prompt))
    .map(([message]) => message);
  if (/\bto expose setup, update, and doctor\b/i.test(prompt)) {
    findings.push("unconditional inventory request is forbidden");
  }
  return findings;
}
