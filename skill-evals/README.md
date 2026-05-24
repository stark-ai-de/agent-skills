# Skill Evals

`skill-evals/` stores maintainer proof for promoted and incubator skills. These files are public evidence, not default runtime payload.

Use this folder for:

- realistic prompts,
- expected behavior,
- trigger and non-trigger cases,
- grading rubrics,
- run summaries,
- promotion proof.

## Current Proof Folders

- [`codex-memory-curator`](codex-memory-curator/README.md)
- [`codex-spec-interviewer`](codex-spec-interviewer/README.md)

Do not put secrets, customer data, private repository paths, or internal hostnames in eval files.

## Layout

```text
skill-evals/
└── <skill-name>/
    ├── README.md
    ├── cases/
    ├── expected/
    ├── rubric.md
    └── runs/
```

Per ADR-0007, keep evals outside `skills/` by default so installed agents receive only operational skill content. Bundle fixtures inside a skill only when the skill needs them at runtime.
