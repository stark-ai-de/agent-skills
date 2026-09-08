import assert from "node:assert/strict";

import { validateReleaseEnvironment } from "../release/check-release-environment.mjs";

const validEnvironment = {
  name: "release",
  can_admins_bypass: false,
  protection_rules: [
    {
      type: "required_reviewers",
      reviewers: [{ type: "User", reviewer: { login: "maintainer" } }],
    },
  ],
  deployment_branch_policy: {
    protected_branches: false,
    custom_branch_policies: true,
  },
};
const protectedMain = { name: "main", protected: true };
const mainOnlyPolicy = {
  total_count: 1,
  branch_policies: [{ id: 1, name: "main", type: "branch" }],
};

assert.deepEqual(validateReleaseEnvironment(validEnvironment, protectedMain, mainOnlyPolicy), []);

for (const [fixture, expected] of [
  [{ ...validEnvironment, protection_rules: [] }, /required reviewer/],
  [{ ...validEnvironment, can_admins_bypass: true }, /bypass/],
  [
    {
      ...validEnvironment,
      deployment_branch_policy: { protected_branches: true, custom_branch_policies: false },
    },
    /custom branch policies/,
  ],
]) {
  assert.match(
    validateReleaseEnvironment(fixture, protectedMain, mainOnlyPolicy).join("; "),
    expected,
  );
}
assert.match(
  validateReleaseEnvironment(
    validEnvironment,
    { name: "main", protected: false },
    mainOnlyPolicy,
  ).join("; "),
  /must exist and be protected/,
);
for (const policies of [
  { total_count: 0, branch_policies: [] },
  { total_count: 1, branch_policies: [{ id: 1, name: "release/*", type: "branch" }] },
  {
    total_count: 2,
    branch_policies: [
      { id: 1, name: "main", type: "branch" },
      { id: 2, name: "release/*", type: "branch" },
    ],
  },
  { total_count: 1, branch_policies: [{ id: 1, name: "main", type: "tag" }] },
]) {
  assert.match(
    validateReleaseEnvironment(validEnvironment, protectedMain, policies).join("; "),
    /exactly one custom branch policy named main/,
  );
}

console.log("Release environment preflight fixtures passed.");
