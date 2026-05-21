# Incubator

`incubator/skills/` contains candidate skills that are useful enough to keep in the repository, but not yet promoted into the public catalog.

Incubator skills:

- are not part of the public catalog,
- are not listed by `npm run list`,
- must not be promoted or released through `npx skills`,
- still use valid `SKILL.md` structure,
- must set `metadata.internal: true` so root `npx skills` discovery hides them by default,
- should gather proof in `skill-evals/` before promotion.

Promotion is a folder move into `skills/` after the skill satisfies ADR-0008: quality, activation fit, useful scope, and maintenance ROI.

## Commands

```bash
npm run list:incubator
npm run validate:skills
npm run scaffold:incubator engineering-workflows/my-candidate-skill
```

To test CLI discovery for incubator candidates, opt in explicitly:

```bash
INSTALL_INTERNAL_SKILLS=1 npx skills@latest add ./incubator/skills --list
```

## Categories

- [Engineering workflows](skills/engineering-workflows/README.md)
- [Codex operations](skills/codex-operations/README.md)
- [Productivity](skills/productivity/README.md)
- [Repo maintenance](skills/repo-maintenance/README.md)
- [Skill maintenance](skills/skill-maintenance/README.md)
