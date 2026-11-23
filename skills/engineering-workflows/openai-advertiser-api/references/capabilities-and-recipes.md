# Capabilities and recipes

Contents: [Choose a route](#choose-a-route) · [Capability map](#capability-map) · [Reporting](#standalone-reporting) · [Field gaps](#a-parameter-the-plugin-does-not-expose) · [Bulk](#bulk-preparation-and-execution) · [Audiences](#audience-changes).

## Choose a route

1. Honor an explicit API-only or plugin-only request. For plugin-only work with a missing capability, explain the gap and propose the API option without switching silently.
2. Otherwise inspect the available plugin's relevant tool and input schema. Use it when it can express the requested outcome. A tool name alone does not prove field support.
3. Use the public API when the plugin is unavailable or lacks a required documented operation/parameter. Confirm Ads credentials and same-account access independently. For mixed requests, keep supported reporting in the plugin and send only the unsupported portion through the API.
4. A tool/schema gap is different from denied permission, missing account entitlement, or unavailable public functionality. Stop the affected operation on those blockers; changing surfaces cannot grant access. If execution prerequisites are missing, still prepare useful offline requests without claiming they ran.

## Capability map

Snapshot: **2026-11-23**, checked against the official Ads Manager tools exposed in the review session and current public OpenAI docs. This is a discovery aid, not a permanent exclusion list or proof of account access. Recheck current tools and the linked contract before use.

| Requested outcome                                                 | Observed plugin coverage                                                                            | Public API opportunity and source                                                                                                                                                                                                  |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Campaign/ad management, images, ordinary reports, audits          | Already available                                                                                   | Standalone alternative when the plugin is absent or API access is requested; not inherently API-exclusive. [Overview](https://developers.openai.com/ads/api-overview).                                                             |
| Target desktop, iOS web, or Android web separately                | Campaign tools expose `ios_app`, `android_app`, and `web`                                           | Use the additional `desktop_web`, `ios_web`, or `android_web` values. [Platform targeting](https://developers.openai.com/ads/platform-targeting).                                                                                  |
| Set attribution windows/time basis on general performance reports | The four general Insights tools omit these controls; `get_conversion_insights` already exposes them | Use GET Insights when the requested combined performance report needs those parameters. [Insights](https://developers.openai.com/ads/api-reference/insights).                                                                      |
| Validate/process many entity changes as one asynchronous job      | No bulk-job tool exposed                                                                            | Bulk job validation, submission and operation results; limited preview, absent from downloadable OpenAPI. [Bulk API](https://developers.openai.com/ads/bulk-api).                                                                  |
| Create feeds, change feed settings, ingest or update products     | Feed listing, health/settings reads, upload diagnostics and product queries exist                   | Feed writes, SFTP management and Delta updates. [Product feeds](https://developers.openai.com/ads/product-feeds), [Delta](https://developers.openai.com/ads/delta-feeds); use the [feed runbook](api-operations.md#product-feeds). |
| Create/change audience membership                                 | Audience inventory, eligibility checks and operation reads exist                                    | Audience creation and Add/Remove/Replace/Merge operations. [Custom audiences](https://developers.openai.com/ads/custom-audiences). Geography, data rights and intended-use rules still apply.                                      |
| Create a Pixel, conversion event setting or CAPI credential       | Conversion inventory, reporting and event diagnostics exist                                         | Provision setup resources with account enablement. [Conversion setup](https://developers.openai.com/ads/api-reference/conversion-setup); use the [credential runbook](api-operations.md#conversion-setup).                         |

Do not advertise a full replacement: account onboarding, billing, Business Agent workflows, UI-only controls and gated features need their own documented surface. Never infer a public endpoint from an internal plugin operation.

## Standalone reporting

For campaign clicks/spend without a plugin, first verify the Ads key's account. Follow [Reporting](https://developers.openai.com/ads/reporting) and [Insights](https://developers.openai.com/ads/api-reference/insights):

- Use `GET /v1/ad_account/insights`, `aggregation_level=campaign`, `time_granularity=none` for totals, and repeated `fields[]` for `campaign.id`, `campaign.name`, `campaign.clicks`, and `campaign.spend`. Request canonical field names from the API reference, not flattened response keys.
- URL-encode `time_ranges[]` as JSON with `type: "date_range"`, `since`, `until`, and `timezone`. For GET `date_range`, both dates are inclusive. For a last completed week of November 16–22, use `since=2026-11-16`, `until=2026-11-22`; derive dates for the actual request. Do not copy the plugin's exclusive-end interval or conversion-report shape into this request.
- Default to the verified account timezone. If the user requests another timezone, verify support for that metric/range combination and report the actual basis; do not silently relabel it. Sales reports have stricter account-local range requirements.
- Follow pagination to completion. Reporting `spend` uses major currency units; budget micros and Delta price minor units are different. Preserve unavailable values and disclose data freshness.

For general-report attribution overrides, verify `attribution_window_days`, `view_through_attribution_window_days`, and `attribution_time_basis` in the current Insights contract. These select reporting semantics; they do not update campaign goals.

## A parameter the plugin does not expose

Example: prepare a desktop-browser-only update. Inspect the actual campaign tool schema; if it still cannot express `desktop_web`, verify [platform targeting](https://developers.openai.com/ads/platform-targeting), then prepare:

```text
POST /v1/campaigns/{verified_campaign_id}
```

```json
{ "targeting": { "platforms": { "included": ["desktop_web"] } } }
```

Use the protected request pattern in the runbook after scope authorization. Read the campaign before and after. This platform-only update preserves location and audience settings; do not clear all `targeting` or broaden to `web`. Do not also change budgets, bids, or delivery status.

## Bulk preparation and execution

Use the dedicated [Bulk guide](https://developers.openai.com/ads/bulk-api); verify preview access, ownership, dependencies and unique operation IDs. Example local draft:

```json
{
  "validate_only": true,
  "partial_failure": false,
  "operations": [
    {
      "operation_id": "pause-campaign",
      "type": "campaign.update",
      "target_resource_id": "<verified_campaign_id>",
      "input": { "status": "paused" }
    }
  ]
}
```

Submit `POST /v1/bulk_mutation_jobs` only when server validation is requested. Validation cannot prove target existence, image fetching or execution success. For authorized execution, set `validate_only: false` and use a new request `Idempotency-Key` because the body changed; retain that execution body/key for documented replay. `partial_failure: false` stops later work after errors without rollback.

Poll `GET /v1/bulk_mutation_jobs/{job_id}`, then retrieve `/operations`. Once `complete` is true, follow `has_more` using the last returned `operation_id` as `after`. Classify every operation and read back changes; HTTP 202 is not completion. Reconcile uncertain writes before retrying. Keep create-operation idempotency keys and dependencies consistent. Access-related 404 requires the account-team route.

## Audience changes

Follow [Custom audiences](https://developers.openai.com/ads/custom-audiences). Check intended geography first: custom audiences are unsupported for EEA/Switzerland targeting. Verify first-party data rights and the guide's privacy prerequisites before any upload.

Select Create, Add, Remove, Replace, or Merge from the intended change; Replace requires the complete desired membership. Resolve the documented method/body rather than treating these operations as interchangeable. File workflows use `POST /v1/uploads` with `purpose=custom_audience`; creative images use a different upload contract. Keep identifiers out of chat and logs.

After an authorized mutation, poll the returned audience/operation and inspect readiness and errors. Revalidate eligibility for inclusion, exclusion, or bid adjustment before attachment. Account access or readiness alone is insufficient. Preserve operation-specific idempotency semantics; audience creation does not inherit the membership replay contract.
