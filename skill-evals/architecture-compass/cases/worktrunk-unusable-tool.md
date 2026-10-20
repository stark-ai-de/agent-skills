# Worktrunk Failure and Executable Identity

## Should Trigger

Yes.

## Prompt

The target adopted the revised AC-ADR-054. Worktrunk is installed but a required
operation fails with an observed error. Explain how the agent proceeds. Compare
that with an older usable release whose optional plugin and shell integration
are absent, and with a native Windows host where `wt` names Windows Terminal
while Worktrunk is available as `git-wt`.

## Deterministic Assertions

- contains: failure
- contains: repair
- contains: fallback
- contains: installed
- contains: git-wt

## Expected Behavior

- Report the actual failure without relabeling a broken installation as an
  absent executable. Agree on repair or fallback rather than silently switching.
- Do not treat a missing optional skill, shell integration or newest release as
  proof that Worktrunk is unavailable; inspect only capabilities actually needed.
- Distinguish the OS-native Worktrunk executable from an unrelated alias.
- Do not cross from WSL to a Windows executable or install a duplicate toolchain
  as an unannounced workaround.
- Preserve the same external placement, ownership and authorization contract
  when an explicit fallback is selected.
