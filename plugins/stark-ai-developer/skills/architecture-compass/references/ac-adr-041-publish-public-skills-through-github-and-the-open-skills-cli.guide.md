# AC-ADR-041: Publish Public Skills Through GitHub and the Open Skills CLI

ID: AC-ADR-041
Title: Publish Public Skills Through GitHub and the Open Skills CLI
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: github, skills-cli, publishing, installation
Applies when: Choosing or validating the public source, discovery, installation, and release path for a public skill repository.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Keep GitHub as the reviewed source and verify public discovery and installation through the open Skills CLI.

Variants: [Short](ac-adr-041-publish-public-skills-through-github-and-the-open-skills-cli.short.md) · [Long, canonical](ac-adr-041-publish-public-skills-through-github-and-the-open-skills-cli.long.md) · **Guide**

This guide is non-normative. The canonical Long decision controls public source and publication evidence.

## Current CLI flow

Use placeholders until the public owner and repository are confirmed:

```bash
npx skills add <owner>/<repo> --list
npx skills add <owner>/<repo> --skill <skill-name> --agent <host>
```

The first command is a discovery check, not an installation. Choose project or global scope explicitly for the second; avoid `--yes` in user-facing examples unless the exact non-interactive action has already been approved. Verify the resulting skill content and host linkage from a clean environment, then remove temporary test installs when they were created only for release proof.

## Publication ledger

1. Record reviewed branch, commit, versions, changelog, and release intent.
2. Run local and CI gates without promoting them to publication evidence.
3. Obtain separate publication approval and verify the protected revision has not drifted.
4. Verify the GitHub tag/release or equivalent immutable source identity.
5. List from the public repository, install one exact skill, inspect the installed payload and host link, and report every stage.

## Decision lineage

- `adapts`: [ADR-0002](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0002-publish-through-github-and-vercel-skills-cli.long.md).

## Current references

- [Open skills CLI source and command reference](https://github.com/vercel-labs/skills)
- [Skills CLI documentation](https://www.skills.sh/docs/cli)
- [GitHub releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
- [Agent Skills specification](https://agentskills.io/specification)

## Revisit

Create a successor if the canonical source or primary install protocol changes. Re-check CLI flags, telemetry, host targets, and registry behavior before each release-facing documentation update.
