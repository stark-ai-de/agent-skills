# Confirming a forgotten follow-up

A finding needs an observed old/new behavior change and an exact current excerpt
that still depends on the old behavior. The host confirms that both concern the
same feature and explains the actual consequence. A missing new test alone is
not a stale assumption; an existing assertion expecting obsolete behavior is.

For example, changing project-name uniqueness to be per organization can leave
an importer deduplicating globally and an onboarding guide requesting a name no
other customer has used. The relevant strings and symbol names need not match.

Before confirming, check:

- Historical release notes can correctly describe old behavior.
- A generated file points to its canonical template or source. Do not recommend
  editing only the generated copy.
- Identical terms can belong to separate domains, such as HTTP versus SMTP retry
  defaults, or a page size versus a CSS pixel value.
- A changed input unit does not establish an unchanged output unit. Find the
  output contract before alleging a missing conversion.
- Counts, arithmetic and dates belong in deterministic checks. Jev's semantic
  classifications are advisory, including high-confidence answers.
- Inspect enclosing context and known dependencies even when snippet ranking is
  low. The collection scope, excluded files and unreviewed candidates limit recall.

When targeting commits, read source with `git show <revision>:<path>`; the current
working files may differ. A WORKTREE packet fingerprints collected current files,
including untracked additions and deletions. Recollection is required on change.
Successful helper revalidation establishes snapshot identity, not test execution.
