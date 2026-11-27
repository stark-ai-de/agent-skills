import assert from "node:assert/strict";
import test from "node:test";

import { createBaseline, findRegressions } from "@servrox/code-quality/baseline";

import { describeReportFailure, locateFindings } from "./diagnostics.mjs";

test("parser failures remain visible after more than twenty classified findings", () => {
  const diagnostics = Array.from({ length: 30 }, (_, index) => ({
    filename: "scripts/legacy.mjs",
    code: "eslint(no-debugger)",
    message: "`debugger` statement is not allowed",
    labels: [{ span: { line: index + 1, column: 1 } }],
  }));

  diagnostics.push({
    filename: "scripts/broken.mjs",
    code: undefined,
    message: "Unexpected token",
    labels: [{ span: { line: 1, column: 14 } }],
  });

  const output = describeReportFailure({ diagnostics, number_of_files: 2 });

  assert.match(output, /scripts\/broken\.mjs:1:14:/u);
  assert.match(output, /Unexpected token/u);
});

test("numeric regressions keep their original source location after budget sorting", () => {
  const group = {
    file: "scripts/example.mjs",
    rule: "eslint(complexity)",
    message: "function has a complexity of <value>. Maximum allowed is 8.",
  };

  const findings = [
    { ...group, value: 9 },
    { ...group, value: 12 },
  ];

  const baseline = createBaseline([
    { ...group, value: 10 },
    { ...group, value: 9 },
  ]);

  const diagnostics = [
    {
      filename: group.file,
      code: group.rule,
      message: "function has a complexity of 9. Maximum allowed is 8.",
      labels: [{ span: { line: 2, column: 4 } }],
    },
    {
      filename: group.file,
      code: group.rule,
      message: "function has a complexity of 12. Maximum allowed is 8.",
      labels: [{ span: { line: 30, column: 6 } }],
    },
  ];

  const regressions = findRegressions(findings, baseline);
  const output = locateFindings(regressions, { findings, diagnostics });

  assert.equal(output.length, 1);
  assert.match(output[0], /^scripts\/example\.mjs:30:6:/u);
  assert.match(output[0], /complexity of 12/u);
  assert.equal(regressions[0].allowed, 10);
});
