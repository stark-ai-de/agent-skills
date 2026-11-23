# Connected Advertiser API tools

The independent Ads API by stark AI plugin can provide authenticated `ads_*` tools for this skill. Inspect the tools actually available in the conversation; installing skill instructions alone does not create an API connection. These tools call the public Advertiser API and are a valid API-only route. The official Ads Manager remains a separate connection and workflow.

## Connect and identify

Use the host's connection flow when a tool requires authentication. The account owner enters the account-scoped Advertiser API key on the operator's protected HTTPS page, reviews the verified account, and selects read or read/write access. Do not ask for a key in chat, substitute a Platform key, or extract the server's key into the executor environment.

Use `ads_get_account` to identify the connection. Match its account ID against the user's target before resource work. Every resource tool requires `expected_account_id`; never substitute another account because its name is similar. Connection consent grants API permissions, not standing authorization to change budgets, delivery or resources.

If a write returns `insufficient_scope`, explain that the connection has insufficient permission and use the connection flow to request the needed scope. Do not fall back to a local key, another plugin or another account to bypass the denied access. An options or draft request still authorizes no tool calls, including `validate_only` bulk submission.

## Select and execute tools

| Outcome                            | Tool family and constraints                                                                                                                                                                                                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account, campaigns, ad groups, ads | `ads_get_*`, `ads_list_*`, documented create/update/status tools. Use currency micros for budgets and bids. Creation can have review or serving consequences even when delivery is paused.                                                                                 |
| Performance reporting              | `ads_get_*_insights` with the exposed canonical fields, time ranges and attribution controls. GET report date-range `until` is inclusive. Conversion reporting exposes a separate POST range contract; follow its schema and timezone instructions.                        |
| Granular targeting                 | `ads_update_campaign` supports the public platform fields. Its default merge preserves current targeting siblings; use `replace_targeting` only for explicitly requested replacement.                                                                                      |
| Bulk changes                       | `ads_submit_bulk_job`, `ads_get_bulk_job`, `ads_list_bulk_operations`. Account feature access still applies. Validate and execute are separate mutations with different request-level idempotency keys.                                                                    |
| Product feeds                      | Feed create/settings/access/diagnostic/product tools and Delta updates. Full catalog ingestion uses the provisioned SFTP connection and an external SFTP client. Confirm omitted-product replacement before enabling `is_full_refresh`.                                    |
| Audiences                          | Inventory, create/member changes/archive and the bounded audience-file upload. Uploads accept at most 2 MiB decoded content; larger files need the documented direct upload route and authorized execution. Account/region eligibility and data authorization still apply. |
| Conversion setup                   | Pixel and event-setting inventory/setup plus protected CAPI-key provisioning. The resource `id` and browser `pixel_id` have different uses. Instrumentation and sending conversion events remain separate work.                                                            |

Read the tool schema before constructing arguments. Supply only requested fields and preserve an execution idempotency key for the same uncertain request. Do not reuse a key for a different body. The service never automatically retries a write.

## Verify results and pagination

Treat `outcome: accepted` and `verification.status: pending` as unfinished. Poll the documented resource/job status within the user's task, or report the pending state. A readback proves the current returned state, not ad serving or successful processing of every nested operation.

When `pagination.has_more` is true, follow `cursor_parameter`: use `next_before` as `before` when paging backward, and otherwise pass `next_after` as the named `after` or `cursor` parameter. Preserve the request's direction and filters, and do not claim a complete inventory from one page. For bulk operation results, wait for `snapshot_complete: true` before paginating and reconcile each operation, including earlier successes. `partial_failure: false` stops later operations; it does not roll back earlier successful changes. If no reliable cursor is returned, report the incomplete result.

On `error.uncertain: true` or a failed readback, inspect resource/job/audit state before considering a retry. A timeout or HTTP error after dispatch can leave a successful write. Do not turn an API permission or feature denial into a workaround through another surface.

## Generated credentials

SFTP password configuration and CAPI-key creation return a protected `credential.url` and expiry. Give the account owner that link and explain that it is a one-time download, available for up to ten minutes. The download requires the original authorized browser session or reauthentication with the same Advertiser key. Never retrieve the URL with agent HTTP/browser tools, echo downloaded values, or add generated credentials to chat, logs or source files.

If secure delivery fails after the API call, report the uncertain provisioning state and reconcile in Ads Manager. Repeating SFTP provisioning can invalidate an existing password. An expired or consumed download is not permission to create another credential.

## Scope and fallback

Use the tool list as the executable contract. This version covers a reviewed allowlist; it does not provide billing/onboarding, Business Agent authoring, partner-data/hotel APIs, browser Pixel instrumentation or conversion-event delivery. Prepare unsupported requests from current official guides, or use an independently authorized compatible surface. Offline preparation remains useful without either plugin.
