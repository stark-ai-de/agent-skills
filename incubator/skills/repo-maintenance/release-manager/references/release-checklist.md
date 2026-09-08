# Release Checklist

- Confirm Feature-PR component versions reflect the intended impact.
- Confirm Release Please is the sole root manifest/package/changelog PR generator.
- Confirm `autorelease: pending` and `autorelease: tagged` exist before the first
  Release Please dispatch.
- Verify Hosted Validate is green for the exact release SHA.
- Verify `release` has required reviewers, exactly one custom `main` deployment-branch policy, protected `main`, and no admin bypass.
- Verify `openai.zip`, `portable.zip`, and `release-subject.json` are direct hosted assets.
- Verify only the two ZIPs are attested and the stable release is observed as latest.
- Verify Post-release Evidence is green for the exact tag.
- Keep OpenAI upload and light/dark portal assets as a separately verified handoff.
