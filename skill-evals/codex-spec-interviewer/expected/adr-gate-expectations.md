# ADR Gate Expectations

The ADR gate result should state:

- whether an ADR is required,
- the reason,
- existing ADRs consulted,
- any new ADR draft or path,
- whether implementation is blocked until the ADR is accepted.
- where a required ADR was persisted.

An ADR is expected for durable changes to package boundaries, runtime choices, public contracts, data ownership, security model, repo-wide validation, publishing, or release policy.

An ADR is not expected for tiny edits, feature-specific behavior under existing architecture, test cases, validation commands, or temporary experiments.

When a required ADR folder is missing, the skill should ask before creating `docs/adrs/` or choosing another path.
