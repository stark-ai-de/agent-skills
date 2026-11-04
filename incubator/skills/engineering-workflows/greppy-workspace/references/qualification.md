# Qualification gates

Record versions, source hashes, timestamps and exact commands privately. Use three real representative roots without editing their source. Keep fixture roots, their workspace, collection and state separate from production.

1. Semantic query: relevant results in multiple registered repositories, independently confirm actual file and one-based start/end lines. Initial indexing complete and watcher alive are different checks.
2. Ignore fixture: normal source is indexed; `.env`/key files, dependencies/builds, generated index state and existing external symlinks are absent from actual vector payloads. Do not use real secrets as markers.
3. Source lifecycle: change a fixture and wait for its new chunk; rename it and verify both the new path and disappearance of the old path; then delete it and verify disappearance. Discover a new Git root through the actual scheduled service; move/remove it and confirm registry identity and exact stale-namespace removal. Exercise equal basenames, nested roots, gitfiles, symlink aliases and linked-worktree exclusion deterministically.
4. MCP: initialize/list/call grepai from two working directories. Query CodeGraph with an explicit freshly indexed `projectPath`; corroborate with ast-grep. Read a saved record through the official Karakeep MCP.
5. Writer: create and read back a record, rerun with zero mutation, add an outside manual note, change and commit fixture source and verify the same bookmark plus note. Deleted/invalid ranges must not remain source-checked. Verify sanitized origin, current branch and license-file hash (or explicit unknown), a branch switch, and visible retirement after a rename. Rebinding a verified renamed selection must preserve the stable component/bookmark ID. Agent technical qualification and human review are separate; manual human decisions remain outside the managed section. Owner tests cover conflicts, source drift, serialization and uncertain responses; synthetic tests are not live account evidence.
6. Triggers: a real fresh Codex completion enqueues only ID/time, an actual timer fires, a bounded Codex assessment succeeds or reports a specific unresolved provider gate, and the owner records a verified result. Do not fake callback JSON and call it a real completion.
7. Idempotence: rerun setup with the same config; unchanged generated config hashes and watcher PID, no duplicate units/MCP entries/skill installs/records.
8. Fresh-agent usability: a new agent receives only the skill path and config location, discovers supported commands, runs doctor and performs a scoped search without previous chat context. Record its actual observations and fix unclear instructions.
9. Full rollout: remove pilot selection only after these checks; inventory every admitted/excluded root and show ongoing/full initial index coverage honestly. Reference source and instruction diffs must remain unchanged. Inspect the current invocation for framework/compiler warnings as well as fatal errors. A fallback may produce searchable chunks while omitting template relationships. After any compiler repair, require regenerated affected chunks and a fresh complete watchloop; a standalone compiler probe is insufficient. Check actual stored and returned ranges against the original file; warning-free compilation can still yield invalid source lines. If the qualified raw-Vue mode is selected, retain semantic source coverage and explicitly leave compiled-template relationships unqualified.

Repository checks for this skill: `python3 -B -m unittest discover -s skill-evals/greppy-workspace -p 'test_*.py' -v`, catalog/incubator discovery checks, and the Karakeep owner's `pnpm run validate:karakeep` when its contract changed. Sync generated plugin projections only through repository scripts.

The local inference pilot adds ten predeclared known-target cases, top-5 retrieval
and actual returned-line checks, digest/dimension consistency, finite batch
vectors, cold/warm/batch timings, cgroup versus model/GPU memory and indexing
wall time. Measure the server restart and a newly launched WSL development
process without shutting down an active distribution. Keep a Windows reboot
explicitly untested unless actually authorized and observed. A NixOS activation
can restart a user manager and re-enable owned units: recheck that maintenance
stays paused throughout a staged model migration.
