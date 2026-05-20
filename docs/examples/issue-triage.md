# Issue Triage Example

Prompt:

```text
Use $issue-triage on these five GitHub issues and draft labels only.
```

Expected report shape:

```md
## Triage

| Issue | Classification          | Suggested labels    | Action                             |
| ----- | ----------------------- | ------------------- | ---------------------------------- |
| #12   | bug, needs reproduction | `bug`, `needs-info` | Ask for a minimal repo and version |
| #13   | ready maintenance task  | `good-first-issue`  | Add expected validation command    |
| #14   | support request         | `question`          | Answer and link docs               |

## Notes

No labels were applied. These are draft recommendations for maintainer review.
```
