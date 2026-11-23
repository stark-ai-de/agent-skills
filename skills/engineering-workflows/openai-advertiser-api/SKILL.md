---
name: openai-advertiser-api
description: Use when OpenAI Ads work needs an API operation or parameter missing from the Ads Manager plugin, when that plugin is unavailable, or when the user requests direct API access. Covers campaigns, reporting, bulk jobs, product feeds, audiences, and conversion setup with an Ads Manager Advertiser API key.
license: Apache-2.0
compatibility: No ChatGPT plugin required. Live calls need HTTPS access to api.ads.openai.com, current OpenAI Ads documentation, and an account-scoped Advertiser API key from Ads Manager. A Platform OpenAI API key is not a substitute. The account check uses Bash, curl, and jq.
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "0.1.0"
---

# OpenAI Advertiser API

## Goal

Extend the official Ads Manager plugin where its tools lack a documented operation or parameter, or manage supported Ads resources without that plugin through `https://api.ads.openai.com/v1`. Verify the requested result; do not promise full plugin parity.

## When to use

Use for a verified plugin capability gap, plugin absence, or explicit API access. Inspect the currently available tool schemas before claiming a gap. The dated [capability map and recipes](references/capabilities-and-recipes.md) give concrete examples.

## When not to use

Keep supported work in the available plugin unless the user selects the API. Honor plugin-only and API-only requests. A missing tool or parameter can justify the API route; a permission denial, feature gate, or required approval cannot justify bypassing a restriction.

Website Pixel instrumentation and event delivery are separate from Advertiser API resource setup. Use `openai-ads-conversions-setup` when available; otherwise use the official Pixel/CAPI guides linked from the runbook. Neither companion plugin is a dependency.

## Inputs to inspect

Resolve the requested outcome, surface preference, available tools, target account, resource IDs, and fields. For live API calls, use `OPENAI_ADS_API_KEY` from the environment or authorized secret injection. Follow the runbook's [access setup](references/api-operations.md#access-and-credentials) when API credentials or account access are missing. Never substitute a Platform `OPENAI_API_KEY` or a Conversions API key. Plugin calls use the plugin's own account/authentication workflow; do not require an Advertiser key for them. Offline preparation needs neither a key nor a connected plugin.

## Workflow

| Workflow | Use when                                                                                        |
| -------- | ----------------------------------------------------------------------------------------------- |
| Inspect  | Verify Ads access, list resources, troubleshoot, or report without changing ad resources.       |
| Prepare  | Show API options, access requirements, or a proposed request; use placeholders offline.         |
| Apply    | Perform the authorized campaign, bulk, feed, audience, or conversion-setup write and verify it. |

For clear intent, announce the route (plugin or API), selected workflow, and reason, then proceed within scope. For a bare or materially ambiguous invocation, show all three workflows with relevant capability examples and ask for the choice and missing scope. For options-only requests, show the menu and stop without calls. Draft requests authorize preparation only; a local draft does not authorize server-side validation or uploads.

1. Select the route by actual tool/field availability and user intent. For the plugin route, follow its available owning workflow. For the API route, verify methods, fields, and access requirements against current official documentation. If credentials or execution are unavailable, prepare the request and state the missing prerequisite; if the contract is unverified, leave that part unresolved.
2. Before API resource calls, use the runbook's verification mode to match the expected account ID with `GET /v1/ad_account`. Use the verified currency and timezone. For an API account-identification request, use discovery mode, return the account summary, and stop there.
3. Before applying, verify the user authorized the operation, target, and affected fields. Inspect the resource and parent chain. Check for matching resources before creating one. Change only the authorized fields.
4. After applying, re-read the resource or operation status. Distinguish accepted, processed, and serving.

## Safety rules

Keep the key and sensitive responses out of chat, logs, and the repository. Use public endpoints on the fixed API origin. Verify that the user authorized the specific scope for spending, delivery, credentials, and destructive changes.

## References

Use [API operations](references/api-operations.md) for access setup, account verification, feeds, and conversion credentials. Use [capabilities and recipes](references/capabilities-and-recipes.md) for plugin comparison, standalone reporting, field gaps, bulk jobs, and audience changes.

## Scripts

Use the shell request pattern in the reference. The skill has no bundled executable.

## Output format

Report the route and why it fits, account, resource, requested result, and verification. For proposals, distinguish ready requests from placeholders and missing access. Mention pending or unsupported steps.

## Completion criteria

Return the requested read or proposal. For writes, verify each result or state what remains unverified.

## Failure modes

Stop on account mismatch. Reconcile uncertain writes with resource readback or documented job or audit state. If the outcome remains uncertain, report it as pending and withhold the retry. Retry only when evidence establishes the first attempt had no effect or the reference documents an idempotent replay for that request. For unsupported operations, identify the documented UI or account-team route. Avoid internal browser endpoints and account switching.
