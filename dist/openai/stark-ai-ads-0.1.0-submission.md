# Ads API by stark AI — v0.1.0 OpenAI submission handoff

Upload the ZIP in this directory unchanged. This is a distribution-only branch, not a source PR or an additional repository release. The source is the verified v0.35.0 release (af1b328c769621d8ee41f47f5331a0cdf3fd4b7f); the archive matches the canonical packager byte for byte.

## Public listing
- Name: Ads API by stark AI
- Short description: OpenAI Ads API integration
- Publisher: servrox solutions UG (independent of OpenAI)
- Category: Business & Operations
- Initial plugin version: 0.1.0
- MCP URL: https://stark-ai-ads-mcp.vercel.app/mcp
- Server URL type: Universal
- OAuth public client ID: stark-ai-ads-chatgpt
- Authorization URL: https://stark-ai-ads-mcp.vercel.app/oauth/authorize
- Token URL: https://stark-ai-ads-mcp.vercel.app/oauth/token
- Exact allowlisted callback: https://chatgpt.com/connector_platform_oauth_redirect
- Public client, authorization code with S256 PKCE; no client secret
- Scopes: ads:read, ads:write (optional), offline_access
- Health: https://stark-ai-ads-mcp.vercel.app/health
- Privacy, terms, support, brand variants and starter prompts are included in the archive manifest. Review the public privacy text against the production deployment before submission.

## Production facts
Vercel Functions in Frankfurt (fra1), Neon PostgreSQL 18 in AWS eu-central-1, dedicated production-only credentials, encrypted Ads API key storage, daily authenticated pruning. Neon history retention at provisioning: 21600 seconds (6 hours). The runtime and vault migration are verified. Operator must confirm additional backup/log retention and support contact for the final published privacy policy. No live advertiser credential was used for these checks.

## Review cases (prepared, not executed against a live reviewer account)
Use a dedicated authorized reviewer Ads account, an Ads Manager Advertiser API key (not a Platform API key), a known paused campaign with available reports, and representative account data. Never include credentials in this public file.

Positive:
1. "Which Ads account is connected?" — ads_get_account; return the verified account ID, currency and timezone.
2. "List all campaigns in the connected account." — ads_get_account, ads_list_campaigns; return account-scoped campaign data and follow pagination.
3. "Summarize performance for last week in the account timezone." — ads_get_account, ads_get_account_insights (and campaign insights as needed); include the requested reporting range, actual currency and complete/partial status.
4. "Show the ad groups in my connected Ads account." — ads_get_account, ads_list_ad_groups; return only that account's ad groups.
5. "Show the configured conversion event settings." — ads_get_account, ads_list_conversion_event_settings; return permitted settings or a clear supported empty result.

Negative:
1. Attempt a resource operation with an expected_account_id that differs from the OAuth-connected account — block with account_mismatch, without dispatching the requested resource operation.
2. Connect with ads:read only, then request a campaign activation — reject for insufficient scope, without changing delivery or spend.
3. Request an undocumented arbitrary Ads endpoint or a Platform API key as an account credential — explain the supported operation or the correct Advertiser API key flow; do not dispatch an arbitrary request or accept the Platform key.

## Portal-only steps
Upload the ZIP as a plugin with MCP. If the portal provides a domain verification challenge, configure that exact token as OPENAI_APPS_CHALLENGE on Vercel Production and redeploy; the deployed route is /.well-known/openai-apps-challenge. The exact token cannot be known before the portal supplies it. Confirm the callback shown by the portal. Supply a dedicated reviewer account/key through the protected connection flow, not the chat or this file; record a real demo if required. Scan tools, confirm all review fields and policy attestations, and submit for review. No OpenAI submission has been performed.

## Release notes
Initial independent integration with 66 typed Advertiser API operations, account-bound OAuth, protected credential downloads, reporting, campaign management, bulk, product feeds, audiences and conversion setup. No installation is advertising-spend authorization.

## Integrity
SHA-256: c3a8206ec3ed9f903fa559b5194b769c84ad4f6472b4da054858952c11bd11d6
Size: 617443 bytes. Canonical validation passed using Node.js 24.22.3 and pnpm 11.24.0. Public health and OAuth metadata, approved callback (200), rejected callback (400), unauthorized MCP and maintenance (401) were verified from a separate sandbox.
