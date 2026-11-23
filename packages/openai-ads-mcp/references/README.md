# Advertiser API contract

`advertiser-contract.json` records the selected public request paths, methods,
parameters and request schemas from the official OpenAPI document retrieved on
2026-11-23. Its `sourceSha256` identifies the complete upstream download. Only
schemas needed by the selected operations are retained; descriptive prose and
provider-internal implementation metadata are omitted. The server does not fetch
or execute a changed schema at runtime.

`src/operations.mjs` resolves these pinned schemas into strict MCP inputs. It adds
account binding, requires idempotency keys for API-supported create operations,
caps unbounded input sizes, and applies these reviewed guide-specific additions:

- Bulk job creation, state, and paginated operation results are defined in the
  [Bulk guide](https://developers.openai.com/ads/bulk-api), not the current OpenAPI
  download. A result page is at most 100 operations. A job contains at most 1,000
  operations, each at most 512 KiB, within a 16 MiB serialized request.
- `is_full_refresh` comes from the
  [product feed guide](https://developers.openai.com/ads/product-feeds). The
  downloadable feed-settings schema currently omits it.
- The [Insights guide](https://developers.openai.com/ads/api-reference/insights)
  defines JSON-encoded query objects. MCP exposes these as typed objects and the
  client encodes them as repeated bracketed query parameters. GET `date_range`
  ends are inclusive; conversion POST `unix_range` ends are exclusive, using
  full account-local days. Each report accepts one time range.
- Audience file upload uses the documented multipart `purpose=custom_audience`
  contract from the
  [audience guide](https://developers.openai.com/ads/custom-audiences). This
  service accepts at most 2 MiB decoded file content. Larger uploads use the
  documented direct API workflow; the upstream limit is larger.

## Updating the contract

Fetch the official OpenAPI document and compare the selected operations and
transitively referenced request schemas with the snapshot. Review dedicated
guides before removing an override. Keep the operation allowlist explicit;
do not replace it with an arbitrary URL/method proxy. Update the source digest
and retrieval date only for the reviewed upstream document, then run the client,
tool-schema, and actual MCP transport tests.

After saving the complete official document locally, generate a candidate with
the dependency-free helper. It makes no network requests and writes only the
explicit output path; use a temporary candidate for review before replacing the
canonical snapshot:

```sh
node packages/openai-ads-mcp/scripts/refresh-contract.mjs \
  /tmp/ads-openapi.json /tmp/advertiser-contract.json YYYY-MM-DD
```

The existing snapshot supplies the fixed operation name/method/path allowlist.
The helper traverses only those requests and their transitive schema references,
retains validation constraints and literal defaults, and strips prose only from
schema annotation positions. Field maps preserve every API property name,
including `title` and `description`; those names are not removable metadata when
they occur under `properties`. Review field maps and required-field consistency
as well as the source digest. Formatting the candidate with the repository
formatter does not change its contract.

The upstream source is
<https://developers.openai.com/ads/openapi.json>. The current guide URLs are
also exported as `CONTRACT.guides`.

## Delivery boundaries

The 66 tools cover account inspection, campaign/ad-group/ad management, creative
URL uploads and previews, reporting, audits, location lookup, bulk jobs, product
feed configuration and Delta updates, custom audiences, and conversion setup.
Account billing/onboarding, management API-key issuance, Business Agent setup,
partner data ingestion, and hotel beta APIs are outside this tool allowlist.

Full product-catalog uploads use the SFTP connection provisioned by the service
and an external SFTP client. Feed Delta tools only update existing products.
The MCP service does not transfer a complete catalog or change replacement
settings implicitly. It does not send Pixel/CAPI events or install website
instrumentation.

SFTP credentials and new Conversions API keys require an encrypted, grant-bound
credential sink before the upstream call is attempted. The model receives a
protected browser handoff URL and an explicit non-secret receipt. Unknown response
fields and upstream error payloads from credential operations are never returned. A destination failure after
issuance is reported as an uncertain result, never automatically retried.

Feature enablement and Ads permissions remain enforced by OpenAI. In particular,
Bulk is a limited preview and audiences are unsupported for EEA/Switzerland
targeting. OAuth permission to this service does not grant those entitlements.
