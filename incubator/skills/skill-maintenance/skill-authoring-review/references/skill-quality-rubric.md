# Skill Quality Rubric

Use this rubric for review reports. Score each area from 0 to 3.

| Area                   | 0                              | 1                           | 2                              | 3                                                |
| ---------------------- | ------------------------------ | --------------------------- | ------------------------------ | ------------------------------------------------ |
| Routing                | Missing or vague description   | Has trigger words but broad | Clear triggers and scope       | Clear triggers, exclusions, and object           |
| Focus                  | Multiple unrelated workflows   | Mostly focused but bloated  | One workflow with minor extras | One tight workflow                               |
| Progressive disclosure | Everything in `SKILL.md`       | Some references but unclear | References are linked by need  | Core body is lean and references are precise     |
| Safety                 | Unsafe or undocumented scripts | Safety mentioned vaguely    | Safe defaults and script notes | Safe defaults, approval gates, and risk handling |
| Output                 | No artifact                    | Generic summary             | Concrete report or decision    | Concrete artifact with acceptance criteria       |
| Installability         | Invalid structure              | Valid but untested          | Valid and locally checked      | Valid, cataloged, and smoke-tested               |

Blocking issues include invalid frontmatter, name mismatch, missing description, destructive scripts without approval gates, secret exposure, and copied proprietary text.
