# Independent agent grading receipt

A separate read-only reviewer, which had validated the answer key and did not
produce blind evaluation outputs, approved all 24 retained captures. This is
independent agent grading, not a claim of external human certification.

Every finding's exact source quote and rationale supports the corresponding
reference omission in unchanged content. No false positives, misses, duplicate
findings or unsupported runtime claims were found. All three arms found 2, 2, 2,
and 1 omission in cases 01–04 and none in cases 05–08.

The reviewer checked source/case/snapshot/candidate/protocol identities, prompts,
24 distinct completed contexts, final outputs and event token usage. Every
reported investigated path had a corresponding explicit full-file read. The
confirmed counts are ordinary 59, host workflow 36 and Jev workflow 42.
Case-03's final Jev capture belongs to the valid rerun. There are no held-out
rankings or captures. Host model identity is the declared runner configuration;
the review did not independently inspect provider-side host wire metadata.

The exact sorted capture array before changing the independent-grade flags had
semantic SHA256 `6c28a306130fd1febae1bd76d0cab25a32e06b9f8571828aa851d93dfd2142f1`.
The curator verified that fingerprint before marking `independentlyGraded: true`.
Semantic hashing here means SHA256 of compact, insertion-order-preserving UTF-8
JSON. [Fixture identity](fixture-identity.json) records the data hashes.
Protocol semantic SHA256 is
`00f0a6e211478bbbe9cd668ea2cf044724fc755ce6b44236dd1fba0a9a8f5fb3`.

Grading conclusion: no advancement. Jev adds no findings and has 16.7% more
investigations than host ranking. Complete workflow USD costs are unknown, so
cost savings cannot be established. Keep the held-out cases unused.
