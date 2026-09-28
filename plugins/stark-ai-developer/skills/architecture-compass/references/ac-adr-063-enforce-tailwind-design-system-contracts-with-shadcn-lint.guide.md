# AC-ADR-063: Enforce Tailwind Design-System Contracts with shadcn lint

ID: AC-ADR-063
Title: Enforce Tailwind Design-System Contracts with shadcn lint
Status: Accepted
Date: 2026-09-16
Owner: stark-ai-de
Scope: target-repository
Category: stack-tooling
Tags: tailwind, shadcn, design-system, lint, components, adoption
Applies when: A Tailwind v4 repository adopts or changes mechanical enforcement of design-system usage in supported source files.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-09-16
Gist: Enable the reviewed shadcn lint rule set by default, adapt upstream examples to real component ownership, and qualify staged enforcement.

Variants: [Short](ac-adr-063-enforce-tailwind-design-system-contracts-with-shadcn-lint.short.md) · [Long, canonical](ac-adr-063-enforce-tailwind-design-system-contracts-with-shadcn-lint.long.md) · **Guide**

This Guide is non-normative. The canonical Long decision controls.

## Verified upstream and compatibility

Source inspected on 2026-09-16 at commit
`53de86f0e7dcc341a9cb45c383a9f2c454d1e958`, package `@shadcn/lint` 0.1.0.
These are source-backed recipes, not an executed qualification of a target.
Refresh the upstream contract and run the target checks before adoption.

The documented integration targets Tailwind v4 and supported JS/TS/JSX/TSX
source. shadcn/ui is optional. The package requires Node >=20.19; documented
integrations require ESLint >=9.30 or Oxlint >=1.80. Oxlint's JavaScript plugin
API is currently alpha. Preserve the target's adopted runtime: `engines.node`
alone does not prove Bun incompatibility. Test the actual command and parser
path; record a scoped fallback only with representative failure or an
authoritative limitation. A transitive parser's peer range may lag the compiler;
do not downgrade the compiler or suppress the warning without resolving which
parser actually executes and what remains unsupported.

The package exports a plugin, not a standalone CLI or shared recommended preset.
Invoke the installed owning linter. Upstream SETUP registers the plugin without
enabling rules; the full profile below is the separately adopted policy.
Architecture Compass setup still establishes governance, not tooling installation.

## Select the owner and dependency scope

1. Identify the existing lint command, framework parser, source paths, ignores,
   package-manager policy, and CI entrypoint. Reuse one owning linter.
2. Under authorized tooling implementation, add the reviewed plugin version as
   a development dependency at that owner. For a pnpm workspace root, the dated
   example is `pnpm add -Dw @shadcn/lint@0.1.0`; for a single package, omit `-w`.
   Follow existing supply-chain policy and frozen-install verification.
3. Preserve a compatible existing linter/parser. Do not install a second linter
   simply to follow an example. Resolve missing or incompatible tooling through
   AC-ADR-013 and the local decision, with a bounded migration or deferral.
4. Inspect each app's nearest `components.json`, TypeScript paths, and shared
   package exports. Declare CSS imports such as Tailwind, animation utilities,
   and shadcn styles at the package owning that stylesheet. Do not depend on
   hoisting or transitive resolution to make theme discovery work.

## Shared all-rules profile

This example assumes a root lint owner and primitive definitions under
`packages/ui/src/components/`. Replace that override with the verified definition
path; a single-app setup might use `src/components/ui/`. Keep consuming features
outside the override. Save this optional shared policy as
`design-system.lint.json`; both integrations below consume it.

```json
{
  "rules": {
    "shadcn/no-restyle": [
      "error",
      {
        "allow": ["layout"],
        "contracts": [
          {
            "pattern": "^CardTitle$",
            "allow": ["layout", "typography"],
            "deny": ["font-*"]
          },
          {
            "pattern": "^Card$|(Content|Header|Footer|Group|Panel)$",
            "allow": ["layout", "spacing"]
          },
          { "pattern": "^Avatar$", "allow": ["size-*"] }
        ]
      }
    ],
    "shadcn/no-raw-colors": "error",
    "shadcn/no-arbitrary-values": ["error", { "allow": ["layout"] }],
    "shadcn/no-inline-styles": "error",
    "shadcn/no-unknown-classes": "error",
    "shadcn/require-static-classes": "error"
  },
  "overrides": [
    {
      "files": ["packages/ui/src/components/**"],
      "rules": {
        "shadcn/no-restyle": "off",
        "shadcn/no-arbitrary-values": "off",
        "shadcn/require-static-classes": "off"
      }
    }
  ]
}
```

All six checks apply to consumers. Inside definitions, color, inline-style, and
unknown-class checks remain active. Confirm the broad container-name pattern
matches only components whose callers really own spacing; replace it with
specific component names when that assumption does not hold.

Contracts replace the keys they specify; only the last matching contract wins.
Retain `layout` explicitly when a contract should allow placement. Avatar's
size-only contract intentionally does not retain ordinary margins/widths.
Padding/gap belong to spacing, not layout. A contract in one rule never bypasses
another rule. Prefer component variants for reusable appearances and contracts
for legitimate caller customization.

### Oxlint integration

Merge these fields into the existing root `.oxlintrc.json`, preserving its
other settings, extends, rules, and overrides:

```json
{
  "jsPlugins": ["@shadcn/lint"],
  "extends": ["./design-system.lint.json"],
  "settings": {
    "shadcn": {
      "note": "See docs/design-system.md for component policy and approved exceptions."
    }
  }
}
```

Point the note at the target's actual policy document. Oxlint does not inherit
`settings` through `extends`; keep them at the root. If existing root rules or
overrides supersede the profile, reconcile that precedence and test the effective
result instead of assuming that the extended file wins.

### ESLint integration

For an existing framework flat config, retain its parser and configuration and
add the plugin, shared rules, note, and narrow override in the correct order.
The following is a complete standalone example for an already compatible
`@typescript-eslint/parser`, not a replacement for framework-owned parsing:

```js
import { defineConfig } from "eslint/config";
import tsParser from "@typescript-eslint/parser";
import { plugin as shadcn } from "@shadcn/lint";
import policy from "./design-system.lint.json" with { type: "json" };

export default defineConfig([
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { shadcn },
    settings: {
      shadcn: {
        note: "See docs/design-system.md for component policy and approved exceptions.",
      },
    },
    rules: policy.rules,
  },
  ...policy.overrides,
]);
```

### Monorepo discovery

For an app consuming `@workspace/ui`, align its existing `components.json`
UI alias with `@workspace/ui/components` and its CSS path with the actual shared
stylesheet, for example `../../packages/ui/src/styles/globals.css`. The UI package
exports its component modules and stylesheet and owns their direct dependencies.
Keep app-local theme differences discoverable; do not overwrite all apps with
one workspace-wide theme assumption.

When nearest-app metadata already resolves components, omit unnecessary shared
recognition settings. A custom component setup can add
`settings.shadcn.ui: "@workspace/ui/components"` or bounded `componentImports`
patterns using the upstream settings contract. Verify the resolved theme and
components in either case. An import recognition setting does not itself prove
theme loading. Do not invent a theme-setting key or install shadcn/ui solely for
this lint plugin.

### Preserve the existing command

Keep runtime selection inside the owning package script. In a pnpm/Bun-adopted
workspace, an existing root Oxlint command may look like:

```json
{
  "scripts": {
    "lint": "bun --no-env-file --no-install --bun oxlint --deny-warnings apps packages scripts"
  }
}
```

Invoke `pnpm run lint` from that root and keep its existing validation/CI wiring.
Do not invent an app-specific lint script when the root already owns it. Retain
unrelated flags and source coverage. Under AC-ADR-058, JavaScript CLI execution
uses Bun unless scoped evidence justifies a fallback; native executables retain
their native launcher. The example is not evidence that every plugin/runtime
combination is compatible.

## Migration using the adoption guide

The complete profile is the qualified target. Upstream's incremental starting
point can be used as a migration stage, not as an undocumented permanent subset.

- Inventory current findings and keep qualified new/clean scopes at `error`.
  Give legacy rules/scopes an owner, cleanup criteria, and revisit trigger.
- A `warn` setting is not automatically report-only: `--deny-warnings`,
  `--max-warnings=0`, wrappers, or task-runner policy may still fail. Use a
  separately scoped report invocation when needed while preserving existing
  mandatory gates. Record the actual observed process result.
- If using a warning ceiling, measure it rather than copying a sample count.
  Reduce it as findings are resolved. A total ceiling does not prove per-file
  or per-rule non-regression; use scoped evidence when that is required.
- Qualify `no-unknown-classes` against the loaded theme and legitimate external
  CSS before promotion. An explicit `allow: ["editor-root"]` uses a class name
  without a leading dot; verify the stylesheet really supplies it. Avoid broad
  allowances that can hide invalid utilities/variants.
- Prefer existing variants/tokens. A new token, appearance, contract, suppression,
  or disabled check needs review, scope, owner, and a revisit condition.
- Promote qualified rules to errors once their cleanup and negative-fixture
  criteria pass. Do not leave an unowned indefinite warning stage.

`no-inline-styles: "error"` already allows readable CSS custom properties with
appropriate dynamic/non-color values or theme variable references. Do not add
`allow: ["--*"]` as a blanket shortcut: that bypasses raw-color checking within
those properties. Ordinary inline padding and style elements remain distinct
from permitted custom-property values.

## Target qualification checklist

Run small fixtures through the real selected command and configuration. Keep
them isolated from user changes and dispose only fixtures owned by the check.
Use actual imports, existing components, theme values, and known class-function
names rather than assuming that an unresolved component was checked.

| Obligation               | Permitted example                                       | Forbidden example or fault                                                     |
| ------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Caller ownership         | Button with `className="mt-4 w-full"`                   | Button with `className="p-4"`                                                  |
| Component contracts      | CardTitle `text-lg`, CardContent `p-6`, Avatar `size-8` | CardTitle `font-bold`, Avatar `w-full`                                         |
| Theme colors             | A declared semantic color such as `bg-primary`          | An unapproved palette color such as `bg-pink-500`                              |
| Appearance values        | `p-4` and caller-owned `w-[320px]`                      | `p-[13px]`                                                                     |
| Inline styling           | Readable permitted custom-property value                | `style={{ padding: 12 }}`                                                      |
| Known classes            | A utility generated by the actual theme                 | `rounded-huge` or a misspelled variant such as `hovr:flex`                     |
| Static component classes | A supported helper with literal class alternatives      | Button classes built as `` `bg-${color}` ``                                    |
| Definition boundary      | The three documented exceptions inside a primitive      | Raw color, inline padding, or unknown utility still fails there                |
| Discovery and freshness  | Resolved per-app theme/shared imports                   | Missing component path, failed theme load, changed theme with cached consumers |

Choose examples that isolate each rule. Record expected rule IDs and process
outcomes; account for report-only versus blocking stages. A print-config result
or successful plugin import is not behavioral proof. A fixture that never
resolves its component cannot establish component enforcement.

## Limits and troubleshooting

The plugin does not lint plain CSS declarations or `@apply`, and it cannot fully
trace every imported class value, unreadable prop spread, or parent selector.
Color suggestions use light-mode token information and are not contrast,
dark-mode, or visual-quality proof. Inspect changes instead of assuming a
suggested token preserves intent.

At the inspected revision none of the six rules advertises automatic fixes;
some offer editor suggestions. Do not promise that `--fix` repairs the findings.
Fixing source remains an explicitly authorized implementation step.

Theme-loading failure can reduce unknown-class analysis to grammar checks. Treat
that fallback or missing component discovery as limited evidence even with a
zero exit. Fix dependency ownership, paths, and imports, then rerun the proof.
Do not hide warnings with a broad allowlist or a package-manager hoisting change.

ESLint file caching can retain unchanged consumers after components, variants,
or theme files change. Inspect the script and rerun affected consumers without
`--cache`, preserving config and file arguments. Restart long-running processes
after imported styling plugin/config-module changes when module state is stale.
Keep package caches distinct from lint-result evidence.

## Sources

All links below identify the inspected upstream revision; refresh them during
compatibility maintenance without turning a dated version into a permanent pin.

- [Setup and operational boundary](https://github.com/shadcn-ui/lint/blob/53de86f0e7dcc341a9cb45c383a9f2c454d1e958/SETUP.md).
- [Package and compatibility](https://github.com/shadcn-ui/lint/blob/53de86f0e7dcc341a9cb45c383a9f2c454d1e958/packages/lint/package.json).
- [Integration and discovery](https://github.com/shadcn-ui/lint/blob/53de86f0e7dcc341a9cb45c383a9f2c454d1e958/README.md).
- [Staged adoption and definition overrides](https://github.com/shadcn-ui/lint/blob/53de86f0e7dcc341a9cb45c383a9f2c454d1e958/docs/adoption.md).
- [Variants, contracts, diagnostics, shared policy](https://github.com/shadcn-ui/lint/blob/53de86f0e7dcc341a9cb45c383a9f2c454d1e958/docs/design-systems.md).
- [Policy matching and inheritance](https://github.com/shadcn-ui/lint/blob/53de86f0e7dcc341a9cb45c383a9f2c454d1e958/docs/rules.md).
- [Unknown-class qualification](https://github.com/shadcn-ui/lint/blob/53de86f0e7dcc341a9cb45c383a9f2c454d1e958/docs/rules/no-unknown-classes.md).
- [Inline styles and custom properties](https://github.com/shadcn-ui/lint/blob/53de86f0e7dcc341a9cb45c383a9f2c454d1e958/docs/rules/no-inline-styles.md).
- [Cache freshness and discovery recovery](https://github.com/shadcn-ui/lint/blob/53de86f0e7dcc341a9cb45c383a9f2c454d1e958/docs/troubleshooting.md).
