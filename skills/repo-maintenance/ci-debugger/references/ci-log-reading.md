# CI Log Reading

Prefer targeted extraction:

```bash
tail -n 200 log.txt
rg -n "error|failed|exception|panic|ELIFECYCLE|Traceback" log.txt
sed -n '120,180p' log.txt
```

Read from the first failing command outward. Ignore cleanup failures until the build or test failure is understood.

Common categories:

- Missing dependency or tool version
- Lockfile/package-manager mismatch
- Type or lint error
- Test fixture drift
- Environment variable missing
- Network or registry failure
- Permission or token scope issue
