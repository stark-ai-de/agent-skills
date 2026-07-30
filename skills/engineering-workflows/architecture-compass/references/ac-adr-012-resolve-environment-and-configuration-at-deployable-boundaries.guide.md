# AC-ADR-012: Resolve Environment and Configuration at Deployable Boundaries

ID: AC-ADR-012
Title: Resolve Environment and Configuration at Deployable Boundaries
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: runtime-platform
Tags: environment, configuration, secrets, deployables, validation, bootstrap
Applies when: A deployable app reads environment variables, secrets, ports, URLs, feature configuration, or runtime configuration.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-30
Gist: Resolve environment-source policy before application bootstrap, then validate once into explicit typed configuration.

Variants: [Short](ac-adr-012-resolve-environment-and-configuration-at-deployable-boundaries.short.md) · [Long, canonical](ac-adr-012-resolve-environment-and-configuration-at-deployable-boundaries.long.md) · **Guide**

## Implementation guide

This guide is non-normative. Runtime and platform loading rules are version-sensitive.

### Select sources outside `main`

Bun automatically reads conventional `.env` files unless disabled and supports `--env-file` for an explicit file. A repository that needs strict selection can use `--no-env-file` and inject values through the launcher or deployment platform. Do not add `dotenv.config()` to `main.ts` on top of that policy.

Node supports environment-file loading through its command-line API in supported releases. Next.js has its own environment loading and client-prefix behavior. Treat each deployable's command and host as the source of truth; do not assume one runtime's precedence applies to another.

After a Bun deployable has selected explicit environment-file handling, keep that choice at its launcher boundary, for example:

```json
{
  "scripts": {
    "dev": "bun --env-file=.env.development.local --watch src/main.ts",
    "start": "bun --no-env-file src/main.ts"
  }
}
```

This is conditional Bun syntax, not a repository-wide runtime default. Use the equivalent launcher or deployment setting for the runtime and host that the deployable actually selected.

### Parse an explicit object

Use the repository's adopted schema library, such as Zod 4, in an app-local `config.ts`. Export a pure `parseConfig(env)` and its inferred result type. For Next.js, `@t3-oss/env-nextjs` can help enforce server/client separation when its build-time model fits; `@t3-oss/env-core` is an optional convenience for non-Next processes. Neither replaces deployment-source policy.

Normalize aliases and empty strings before schema parsing:

```ts
const configSchema = z
  .object({
    port: z.coerce.number().int().min(1).max(65_535),
    databaseUrl: z.url(),
  })
  .readonly();

const nonEmpty = (value: string | undefined) => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

export function parseConfig(env: Record<string, string | undefined>) {
  return configSchema.parse({
    port: nonEmpty(env.SERVICE_PORT) ?? nonEmpty(env.PORT),
    databaseUrl: nonEmpty(env.DATABASE_URL),
  });
}
```

This makes `SERVICE_PORT` the explicit alias winner only when it is non-empty; an empty alias can fall back to `PORT`. If both non-empty values must instead be rejected, encode that as a schema refinement and test it. Keep `parseConfig` pure: it receives an object, reads no ambient environment, and has no logging or client-construction side effect.

Prefer explicit boolean and numeric parsing, URL validation, and discriminated configuration for mutually exclusive modes. Freeze or treat the result as readonly. Pass narrow sections such as `databaseConfig` to the code that owns them.

### Suggested tests and checks

- Table-test canonical values, aliases, both-set precedence, empty strings, invalid URLs, ranges, and production-only requirements.
- Execute the real package script from a production-like environment with runtime auto-loading intentionally enabled or disabled.
- Search built client output for representative server-only key names, never secret values.
- Report secret names or configuration paths, not values, in validation output.

## Official sources

- [Bun: Environment variables](https://bun.sh/docs/runtime/environment-variables)
- [Node.js: Environment variables](https://nodejs.org/api/environment_variables.html)
- [Node.js CLI: `--env-file`](https://nodejs.org/api/cli.html#--env-filefile)
- [Next.js: Environment variables](https://nextjs.org/docs/app/guides/environment-variables)
- [Zod documentation](https://zod.dev/)
- [T3 Env core](https://env.t3.gg/docs/core)
- [T3 Env documentation](https://env.t3.gg/docs/introduction)
