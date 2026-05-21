# Vercel Skills CLI Examples

List a public repo:

```bash
npx skills@latest add <github-owner>/<repo> --list
```

Install all skills globally for Codex:

```bash
npx skills@latest add <github-owner>/<repo> -g -a codex
```

Install one skill globally for Codex:

```bash
npx skills@latest add <github-owner>/<repo> --skill <skill-name> -g -a codex
```

List a local checkout:

```bash
npx skills@latest add . --list
```

List only the public skill catalog when a repo also has project-local helper
skills under `.agents/skills/`:

```bash
npx skills@latest add ./skills --list
```

Install all skills for all supported agents:

```bash
npx skills@latest add <github-owner>/<repo> --all
```

Update installed skills:

```bash
npx skills@latest update
```

Remove a skill:

```bash
npx skills@latest remove <skill-name>
```
