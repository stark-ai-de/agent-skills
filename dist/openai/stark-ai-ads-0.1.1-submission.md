# Ads API by stark AI v0.1.1 — public submission handoff

## Verified evidence

- Source: merged main commit 2267cbcab9605e5f0612abde34d83ec7a85ecbce; OAuth PRs #206 and #209 merged.
- Production Vercel deployment dpl_A7CwA4HbjJ5mA6p6MDRu6KMwNpL6 reported READY on the same commit.
- OpenAI Platform draft v0.1.0: domain verified, authentication Authorized, MCP Configured, tools and server instructions discovered; latest MCP scan reports no findings. Skill checks passed. Metadata automated check was unable to complete, not a reported violation; retry in the portal.
- The production vault has issued access and refresh tokens. No credentials or account identifiers are included here.
- Canonical v0.1.1 packager, archive validation, ten package tests and two OAuth UI tests passed.
- SHA-256: 6c1dd74b7af5444cc9c52c34d2de885b511c97e5f36b236c958c831138162d74; 623001 bytes.
- The uploaded v0.1.0 draft is not yet submitted. This distribution-only branch contains the new archive from merged main; it does not change the production deployment, main or any release tag.

## Upload and review

Open the existing Ads API by stark AI plugin at https://platform.openai.com/plugins/manage/plugin_asdk_app_6b04be26aea48191a33042130a6fd0d7 . Upload the ZIP as a new version, not a new plugin. The same production MCP URL, client identity and OAuth scopes are preserved. v0.1.1 imports the five positive and three negative review cases, release notes and commerce disclosure; the OAuth authorization server issuer is explicit.

Verify the imported version, retry metadata checks, and confirm that authorization, domain verification and the no-findings MCP scan are preserved; reconnect or rescan if the portal requests it. Review case descriptions and expected results are embedded in the package. They are proposed reviewer tests, not claims that all eight have been run live.

## Secure reviewer access and demo

Provide a dedicated Ads account with representative non-sensitive data, an account-scoped Advertiser API key from Ads Manager and a paused campaign named Review Fixture for the name-only write/readback case. Grant write consent only for the review fixture account. Enter reviewer credentials and instructions privately in the Platform review form, never in a ZIP, repo, chat or public video. Do not share a live production account's write key. Reset the paused fixture name after the authorized review test without activating delivery or changing spend.

Suggested reviewer instructions: Select Connect, enter the supplied Advertiser API key on the protected connection page, verify the reviewer account, review permissions, authorize requested changes for the paused fixture, and return to OpenAI. Run the embedded positive and negative cases. Use a read-only connection for permission denial. Disconnect at /connections if required.

Record a real walkthrough of the authenticated test plugin (not fabricated or replayed mock results): demonstrate connection and account consent without displaying the key, inspect the test account and list campaigns, summarize a reporting range, demonstrate the paused name-only write/readback, show the rejection of out-of-account access and a prepare-only request, and explain revocation. Redact account identifiers and sensitive data. Use a reviewer-accessible video URL if the portal requires one. No recording or private reviewer account credentials have been fabricated or supplied by this build.

Confirm country availability, verified publisher identity, applicable policy attestations, and all review materials. Submit for review only when these are accurate and complete. Publication is a later separate action after approval.

