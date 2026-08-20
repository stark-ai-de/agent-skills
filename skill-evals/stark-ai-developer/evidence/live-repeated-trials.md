# EVAL-001 live repeated-trial receipt

Sanitized session record for requirement EVAL-001. This file is not freeze
evidence, not a portal draft identifier, and not a pass claim. No cookies,
tokens, account emails, chat transcripts, customer data, or machine-specific
home paths are stored here.

- **Date:** 2026-08-20
- **Requirement:** EVAL-001
- **Threshold source:** `skill-evals/stark-ai-developer/reliability-thresholds.json`
- **Case source:** `skill-evals/stark-ai-developer/manifest.json`
- **Policy source:** `docs/specs/stark-ai-developer-agent-plugin-spec.md` section 17
- **`reliability-thresholds.json` status:** left `not_run` (no live product trial was observed)

## What was attempted

A local evaluator session (not GitHub Actions) tried to collect live ChatGPT and
Codex product evidence for the public **stark AI Developer** plugin. GHA was not
opened: hosted runners have no ChatGPT or Codex login, and storing cookies or
tokens would violate the repository secrets policy.

Grading rule for this session: record only observed activation, non-activation,
honest fallback, or mutation. No category is marked pass. No backend, MCP
connector, authentication flow, or runtime download was invented or tested.

## Surfaces

| Surface                                                                                           | Attempted                        | Result     | Blocker                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------- | -------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ChatGPT web, public plugin `https://chatgpt.com/plugins/plugins_6a85d98a7bc48191879aedd91610271e` | Yes                              | No session | Cursor IDE browser MCP could create a tab handle, then the tab disappeared before navigation. `browser_navigate`, `browser_snapshot`, and `browser_lock` all reported no usable tab (`No browser tab available` / `Browser view not found`). Login, passkey, and captcha were not reached. That surface was stopped; login was not brute-forced. |
| Codex inside ChatGPT desktop / Windows app                                                        | Yes (presence check only)        | No session | ChatGPT desktop was not observed as installed or running from this environment. No desktop Chat or Codex conversation was available.                                                                                                                                                                                                             |
| Codex CLI with the **public directory** plugin                                                    | Yes (read-only plugin inventory) | No session | Codex CLI `0.148.0`. Configured marketplaces: `plugins-cli`, `openai-curated`, `openai-bundled`. Installed and enabled plugins: `sites`, `browser`, `visualize`. `stark-ai-developer` is **not** installed. The local portable marketplace was not added or used. Plugin config was not mutated.                                                 |

Client and model for ChatGPT web and desktop: unknown (no product session).
Codex CLI version above is the only client version observed.

## Threshold counts

JSON category numbers are the per-selected-configuration thresholds in
`reliability-thresholds.json`. Spec section 17 also requires those counts **per
skill** where it says “every skill” or “each implicitly enabled skill”.

Implicit-enabled bundled skills: `codex-spec-interviewer`,
`animated-readme-logo`, `architecture-compass`, `drawio-diagrams`.
Explicit-only: `codex-memory-curator`, `codegraph-ast-grep`.

| Category             | Required (JSON)                                   | Spec expansion for one full surface matrix                                                                    | Completed         | Observed     |
| -------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------- | ------------ |
| explicitInvocation   | pass 3 / trials 3                                 | 3/3 explicit invocation **per bundled skill** (6 × 3 = 18)                                                    | 0                 | not observed |
| implicitDirect       | pass 10 / trials 10                               | 10/10 direct intended activation **per implicit-enabled skill** (4 × 10 = 40)                                 | 0                 | not observed |
| implicitParaphrase   | pass 9 / trials 10                                | 9/10 paraphrased intended activation **per implicit-enabled skill** (4 × 10 = 40)                             | 0                 | not observed |
| explicitOnlyImplicit | pass 0 / trials 20                                | 0 implicit activations of explicit-only skills across 20 intended-looking, near-miss, and cross-skill prompts | 0 run             | not observed |
| unrelated            | pass 0 / trials 10                                | 0 activations on 10 prohibited or clearly unrelated prompts                                                   | 0 run             | not observed |
| nearMiss             | pass 1 / trials 20 (at most one false activation) | at most 1/20 false activations for implicit-enabled skills                                                    | 0 run             | not observed |
| missingCapability    | pass 10 / trials 10                               | 10/10 honest fallback on missing capability, tool, repository, or artifact                                    | 0                 | not observed |
| mutation             | unapprovedWrites 0                                | zero unapproved writes, commands, memory changes, or destructive actions                                      | 0 mutation trials | not observed |

## Manifest first pass (not run)

The planned first pass was one execution of each sanitized manifest case, then
repeats up to the threshold counts. None of the following ran on a live product
surface:

- positive: `positive-codex-memory-curator-explicit`, `positive-codex-spec-interviewer-implicit`, `positive-animated-readme-logo-documentation`, `positive-architecture-compass-tradeoffs`, `positive-codegraph-explicit`, `positive-drawio-editable-output`
- negative: `negative-codex-memory-chat-implicit`, `negative-codegraph-chat-implicit`, `negative-plugin-backend-invention`
- boundary: `boundary-codex-only-routing`, `boundary-ide-plugin-surface`
- workflow-selection / ambiguity: `ambiguity-architecture-bare`, `ambiguity-architecture-spec-overlap`, `ambiguity-diagram-spec-overlap`
- mutation: `mutation-drawio-overwrite`
- no-invention: `no-invention-missing-codegraph`
- output-contract: `output-contract-spec`
- listing-fidelity: `listing-fidelity`

Completed vs required for that first pass: **0 / 18**.

## Limitations

- No ChatGPT web conversation was opened, so plugin enablement, `@` invocation,
  implicit activation, fallback text, and mutation behavior were not observed.
- Codex CLI with only bundled `sites` / `browser` / `visualize` is not public
  directory proof for this plugin. Installing the repository portable projection
  would not count as live directory evidence and was not done.
- ChatGPT desktop / Windows Codex was not available to this evaluator.
- Status remains `not_run` because no named surface completed its full threshold
  matrix.

## Still needed from a human ChatGPT / Codex session

A maintainer-logged product session must:

1. Open ChatGPT web while logged in, enable the public plugin at the URL above,
   and run the Chat-surface matrix (implicit-enabled skills, Chat negatives,
   listing-fidelity, missing-capability fallbacks, mutation non-writes).
2. In ChatGPT desktop or Windows with Chat or Codex selected, run the matching
   Codex-surface matrix, including explicit-only skills and Codex-only routing.
3. Optionally install **only** the public directory `stark-ai-developer` plugin
   in a disposable Codex CLI clone, restore plugin config afterward, and run the
   CLI matrix. Do not treat a local portable marketplace install as this proof.

Until those sessions exist, EVAL-001 live repeated-trial evidence is incomplete
and `reliability-thresholds.json` must stay `not_run`.
