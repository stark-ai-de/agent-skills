---
name: openai-advertiser-api
description: Manage OpenAI Ads directly through the public Advertiser API using an account-scoped Ads Manager API key. Use when a user requests direct API reads or changes to accounts, campaigns, budgets, ad groups, ads, creative files, audiences, conversion setup, product feeds, or reporting.
license: Apache-2.0
compatibility: Live calls require HTTPS access to api.ads.openai.com, current OpenAI Ads documentation, and an account-scoped Advertiser API key. The account-check example uses Bash, curl, and jq.
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "0.1.0"
---

# OpenAI Advertiser API

## Goal

Read or change OpenAI Ads resources through `https://api.ads.openai.com/v1` and verify the result.

## When to use

Use for direct access with a key created in Ads Manager settings.

## When not to use

Route connector requests to Ads Manager skills. Route website Pixel and CAPI instrumentation or event delivery to the conversions skill.

## Inputs to inspect

Resolve the target account, resource IDs, operation, and requested fields. For live calls, use `OPENAI_ADS_API_KEY` from the environment or an authorized secret-store injection.

## Workflow

| Workflow | Use when                                                                                                 |
| -------- | -------------------------------------------------------------------------------------------------------- |
| Inspect  | Verify access, list resources, troubleshoot, or report. Use documented operations without write effects. |
| Prepare  | Show a proposed request or change. Read current state when needed.                                       |
| Apply    | Perform the authorized write and verify the result.                                                      |

For clear intent, announce the selected workflow and proceed within the requested scope. For a bare or materially ambiguous invocation, show all three workflows in order, ask the user to choose, and wait for their choice and any missing scope. For an options-only request, show the menu and stop. Draft requests authorize preparation only.

1. Verify the method, path, fields, and access requirements against the current official documentation linked from the runbook. Stop the affected call if its contract cannot be verified.
2. Before resource calls, use the runbook's verification mode to match the expected account ID with `GET /v1/ad_account`. Use the verified currency and timezone. For an account-identification request, use discovery mode, return the account summary, and stop there.
3. Before applying, verify the user authorized the operation, target, and affected fields. Inspect the resource and parent chain. Check for matching resources before creating one. Change only the authorized fields.
4. After applying, re-read the resource or operation status. Distinguish accepted, processed, and serving.

## Safety rules

Keep the key and sensitive responses out of chat, logs, and the repository. Use public endpoints on the fixed API origin. Verify that the user authorized the specific scope for spending, delivery, credentials, and destructive changes.

## References

Use [API operations](references/api-operations.md) for authentication, resource references, feeds, and conversion setup.

## Scripts

Use the shell request pattern in the reference. The skill has no bundled executable.

## Output format

Report the account, resource, change, and verified status. Mention pending or unsupported steps.

## Completion criteria

Return the requested read or proposal. For writes, verify each result or state what remains unverified.

## Failure modes

Stop on account mismatch. Reconcile uncertain writes with resource readback or documented job or audit state. If the outcome remains uncertain, report it as pending and withhold the retry. Retry only when evidence establishes the first attempt had no effect or the reference documents an idempotent replay for that request. For unsupported operations, identify the documented UI or account-team route. Avoid internal browser endpoints and account switching.
