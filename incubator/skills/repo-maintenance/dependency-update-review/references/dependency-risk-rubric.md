# Dependency Risk Rubric

Higher risk:

- Major version upgrades
- Runtime, bundler, compiler, framework, auth, crypto, database, or HTTP client changes
- Native binaries or postinstall scripts
- Package manager or lockfile format changes
- Large lockfile churn unrelated to manifest edits
- Dependencies with broad transitive trees

Lower risk:

- Patch updates with small lockfile diffs
- Dev-only tooling with targeted validation
- Documented compatibility fixes

Always recommend tests that exercise the code paths using the updated package.
