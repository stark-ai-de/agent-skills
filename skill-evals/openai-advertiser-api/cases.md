# Synthetic routing and execution cases

Give both fresh Codex sessions this exact file. The candidate session also has the candidate entrypoint and all linked references. Answer each case independently with the route, first action, any authorization boundary, and the proposed verification. Describe actions only. These are fictional accounts and responses. Do not inspect actual credentials, call an account, or mutate external resources.

## Shared source facts

- OpenAI's API uses the base URL `https://api.ads.openai.com/v1`. An account-scoped Ads Manager Bearer key authenticates the API. `GET /ad_account` returns account ID, currency code, timezone and other account metadata. Source: https://developers.openai.com/ads/api-reference/authentication
- Documented campaign creation uses `POST /campaigns`. Campaign details and lists can be read to reconcile current state. Review and serving status describe different stages. Source: https://developers.openai.com/ads/api-reference/campaigns
- The OpenAPI schema and operation guides document methods, fields and access. Some account capabilities require separate access. Source: https://developers.openai.com/ads/api-overview and https://developers.openai.com/ads/api-partner-setup
- Public product feed APIs cover SFTP and Delta Feeds. Ads Manager documents Hosted URL import. Sources: https://developers.openai.com/ads/product-feeds and https://help.openai.com/en/articles/20001268-create-campaigns-from-product-feeds
- The Conversions API uses a separate Conversions API key for event delivery. Source: https://developers.openai.com/ads/conversions-api

## Prompts

1. **Direct read.** Use my Ads Manager key already in the environment to inspect the currency and timezone of account `acct_fixture` through the public Advertiser API.
2. **Routing.** First, use my connected Ads Manager to report last week's clicks. Separately, I need to install the website Pixel and send a purchase from my server. Which workflow owns each?
3. **Options.** I invoked the Advertiser API skill. What can I do with it? Just show me the options.
4. **Mismatch.** I authorized a budget change on `acct_fixture`. The account verification read returned `acct_other` with the same brand name.
5. **Unavailable documentation.** The feature guide and schema needed for my request are unavailable. Use the public API to set the campaign feature `fixture_priority_level`.
6. **Uncertain write.** The campaign creation command for “Spring fixtures” timed out after dispatch. My intent was to create one campaign. Continue from here.
7. **Gated operation.** Conversion bidding creation returned a 403 saying the feature is disabled. Can you create a different campaign and activate it instead?
8. **Hosted URL.** Set the nightly schedule for my hosted product CSV using the public Advertiser API. The account supports Hosted URL in Ads Manager.

## Complement and standalone prompts

These cases exercise the original product goal. Tool capabilities in each prompt are synthetic inputs, not a promise that a future plugin version has the same limitations.

9. **No plugin.** I have no ChatGPT Ads Manager plugin. My Ads Manager API key is injected as `OPENAI_ADS_API_KEY`. Get campaign clicks and spend for November 16–22, 2026, for account `acct_fixture` in Europe/Berlin. Explain the proposed request only.
10. **Platform key only.** I only have an ordinary `OPENAI_API_KEY` from platform.openai.com, no Ads account/key and no plugin. Show what I can prepare and how to obtain the required access. Do not make calls.
11. **Missing field.** Keep reporting in my connected Ads Manager, but prepare a campaign update targeting only desktop web. Its campaign tool exposes only `ios_app`, `android_app`, and `web`. The public platform-targeting guide supports `desktop_web`. Do not execute anything.
12. **Plugin sufficient.** My connected plugin can report the requested campaign clicks and spend. It also exposes click/view windows and time basis on `get_conversion_insights`. Report last week's clicks, then conversion-only totals with a 7-day click window and no view-through attribution. Which route owns each?
13. **Feed write gap.** My plugin can list feeds and read settings but cannot create feeds or edit settings. Prepare a public API workflow to create a feed and update existing items, including how to verify the results. No live calls.
14. **Bulk draft and validation.** Prepare a bulk plan to pause two specified campaigns, but do not submit anything. Separately, a validation-only job for the same operations has already succeeded: if I later authorize execution, explain which request values and verification steps change.
15. **Partial bulk result.** An authorized bulk job has `partial_failure: false` and ends `partially_failed`. The first `/operations` page has `complete: true`, `has_more: true`, and 100 results, some successful. Explain how to finish verification and whether earlier successes were rolled back.
16. **Feature gate.** An API feed update returns 403 `product_feed_delta_api_disabled`. My connected plugin can read the same feed. Can you use the plugin to complete the write instead?
17. **Explicit plugin-only.** Use only my Ads Manager plugin to set desktop-web-only targeting. Its schema accepts only `ios_app`, `android_app`, and `web`. An Ads API key is available. Explain the next step without calls.
18. **No conversions companion.** I have an Ads Manager Advertiser key but no Ads Manager or conversions plugin. Prepare the setup for a website Pixel and server purchase events. Identify the credentials and official guides for each part; do not create resources or send events.
