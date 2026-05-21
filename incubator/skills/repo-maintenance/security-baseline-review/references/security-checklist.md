# Security Baseline Checklist

- `SECURITY.md` explains private reporting.
- `.env.example` contains placeholders only.
- `.gitignore` excludes local env files and generated secrets.
- CI workflows use least practical permissions.
- Workflows avoid piping remote scripts directly into a shell.
- Pull request workflows do not expose secrets to untrusted code.
- Dependency updates or review policy is documented.
- Release process avoids printing tokens.
- Public docs do not include private paths, internal hostnames, customer data, or credentials.

If a secret may have been committed, recommend revocation and rotation before history cleanup.
