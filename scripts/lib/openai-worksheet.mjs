function publicPublisher(listing) {
  const publisher = listing?.publisher;
  if (!publisher || typeof publisher !== "object" || Array.isArray(publisher)) {
    throw new Error("public OpenAI listing requires a publisher object");
  }
  const privateKeys = Object.keys(publisher).filter((key) => key !== "legalName");
  if (privateKeys.length > 0) {
    throw new Error(
      `public OpenAI listing contains private publisher fields: ${privateKeys.join(", ")}`,
    );
  }
  if (typeof publisher.legalName !== "string" || !publisher.legalName.trim()) {
    throw new Error("public OpenAI listing requires publisher.legalName");
  }
  return publisher;
}

function inline(value) {
  return String(value ?? "")
    .replace(/\r?\n/g, " ")
    .trim();
}

export function openAiIssueMarker(pluginName, pluginVersion) {
  return `<!-- openai-plugin-release:${pluginName}@${pluginVersion} -->`;
}

export function renderOpenAiSubmissionChecklist(
  listing,
  {
    repository = "stark-ai-de/agent-skills",
    tag = `v${listing?.plugin?.version ?? "0.0.0"}`,
    releaseSha = "release-commit",
    releaseUrl = `https://github.com/${repository}/releases/tag/${tag}`,
    openaiAssetUrl = `${releaseUrl}/download/openai.zip`,
    openaiSha256 = "sha256-pending",
    firstPublicationUrl = `https://github.com/${repository}/blob/${releaseSha}/docs/listing/openai/${listing?.plugin?.name ?? "stark-ai-developer"}-first-publication.md#composer-icon-handoff`,
  } = {},
) {
  const { plugin, publisher, releaseNotes, skills } = listing;
  publicPublisher(listing);
  const lines = [
    openAiIssueMarker(plugin.name, plugin.version),
    `# Release OpenAI Plugin: ${plugin.displayName}`,
    "",
    "This issue is the public handoff for a published plugin release.",
    "Complete the checklist manually and close the issue after publication.",
    "It confirms the GitHub release only; it does not assert an OpenAI upload, approval, or public portal state.",
    "",
    "## Release",
    "",
    `- Package name: \`${plugin.name}\``,
    `- Version: \`${plugin.version}\``,
    `- Release: [${tag}](${releaseUrl})`,
    `- Source commit: \`${releaseSha}\``,
    `- OpenAI archive: [openai.zip](${openaiAssetUrl})`,
    `- OpenAI archive SHA-256: \`${openaiSha256}\``,
    "",
    "## Public listing",
    "",
    `- Display name: ${plugin.displayName}`,
    `- Short description: ${plugin.shortDescription}`,
    `- Developer name: ${plugin.developerName}`,
    `- Category: ${plugin.category}`,
    `- Website: ${plugin.urls.website}`,
    `- Privacy: ${plugin.urls.privacyPolicy}`,
    `- Terms: ${plugin.urls.termsOfService}`,
    `- Support: ${plugin.urls.support}`,
    `- Security: ${plugin.urls.security}`,
    `- ChatGPT plugin: ${plugin.urls.chatgptPlugin}`,
    `- Release notes: ${inline(releaseNotes)}`,
    "",
    "## Capabilities",
    "",
    ...plugin.capabilities.map((capability) => `- ${capability}`),
    "",
    "## Starter prompts",
    "",
    ...plugin.starterPrompts.map((prompt, index) => `${index + 1}. ${prompt}`),
    "",
    "## Publisher",
    "",
    `- Legal identity: ${publisher.legalName}`,
    "",
    "## Bundled skill routing",
    "",
    ...skills.map(
      (skill) =>
        `- \`${skill.name}\`: ${skill.products.join(", ")}; implicit invocation ${skill.allowImplicitInvocation ? "enabled" : "disabled"}; portal glyph \`${skill.portalGlyph}\``,
    ),
    "",
    "## Portal asset handoff",
    "",
    "1. Verify the packaged skill icons. If the portal ignores package icon metadata, restore the reviewed portal glyph for each skill.",
    "2. Keep both existing Plugin Info logos unchanged. Restore them only if the ZIP upload reset them.",
    `3. Follow the [Composer icon handoff](${firstPublicationUrl}) to set the separate light and dark PNGs manually; do not use the Plugin Info logos for these fields.`,
    "4. After propagation, verify light and dark rendering plus the public directory identity.",
    "",
    "## Checklist",
    "",
    "- [ ] Confirm the successful exact-tag Post-release Evidence run before uploading anything.",
    "- [ ] Download the published `openai.zip` and verify its SHA-256 against this issue.",
    "- [ ] Upload the exact archive to the OpenAI portal and review listing, skills, glyphs and logos.",
    "- [ ] Complete the portal review and publish the listing manually.",
    "- [ ] Verify public rendering, directory visibility and installation, then close this issue.",
    "",
    "Do not add credentials, cookies, customer data, or private reviewer messages to this issue;",
    "keep them in the private portal workflow.",
    "",
  ];
  return lines.join("\n");
}
