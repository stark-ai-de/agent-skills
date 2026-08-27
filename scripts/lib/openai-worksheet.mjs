import { pluginArtifactPaths } from "./release-descriptor.mjs";

export function openaiWorksheetPath(root) {
  return pluginArtifactPaths(root).worksheet;
}

export const OPENAI_WORKSHEET_PATH = openaiWorksheetPath();

function publisherReviewValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "unset";
}

function verifiedIdentityLabel(publisher) {
  if (
    publisher?.verifiedIdentity === true &&
    typeof publisher.verifiedIdentityKind === "string" &&
    typeof publisher.verifiedIdentityName === "string" &&
    publisher.verifiedIdentityKind.trim() &&
    publisher.verifiedIdentityName.trim()
  ) {
    return `${publisher.verifiedIdentityKind.trim()}, ${publisher.verifiedIdentityName.trim()}`;
  }
  return "unset";
}

export function renderOpenAiSubmissionWorksheet(listing, paths = pluginArtifactPaths()) {
  const { plugin, publisher, releaseNotes, skills } = listing;
  const listingFile = paths.listing;
  const firstPublication = paths.firstPublication;
  const lines = [
    `# OpenAI submission worksheet: ${plugin.displayName}`,
    "",
    `Generated from \`${listingFile}\`. This worksheet is`,
    "portal field copy only. First-publication observations live in",
    `\`${firstPublication}\`. This file is not`,
    "freeze evidence or a portal draft identifier.",
    "",
    "## Listing",
    "",
    `- Package name: \`${plugin.name}\``,
    `- Version: \`${plugin.version}\``,
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
    `- Release notes: ${releaseNotes}`,
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
    `- Identity source: ${publisher.identitySource}`,
    `- Verified identity: ${verifiedIdentityLabel(publisher)}`,
    `- OpenAI organization ID: ${publisherReviewValue(publisher.openaiOrganizationId)}`,
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
    "1. Verify the six packaged skill icons. If the portal ignores package icon metadata, restore the existing reviewed portal glyph for each skill.",
    `2. Upload \`${plugin.assets.logo}\` as the light Plugin Info logo.`,
    `3. Upload \`${plugin.assets.composerIcon}\` as the dark Plugin Info logo and Composer icon.`,
    "4. After propagation, verify light and dark rendering plus the public directory identity.",
    "",
    "## Archive and portal evidence to attach",
    "",
    "- Submission ZIP SHA-256 and complete entry inventory from `npm run package:openai-plugin`.",
    "- Live ChatGPT directory identity versus listing JSON, skill interface, skills-only invariants, and public category-catalog membership from `npm run verify:openai-directory`.",
    "- Source commit and release tag.",
    "- Clean/dirty source state and deterministic release-input tree digest.",
    "- Generated `.codex-plugin/plugin.json` from the submitted ZIP.",
    "- Positive/negative evaluations.",
    "- Portal draft ID, review result, and remaining sanitized publication evidence.",
    `- First-publication observations from \`${firstPublication}\`.`,
    "",
    "Do not add credentials, cookies, private reviewer messages, customer data,",
    "or machine-specific paths to this worksheet.",
    "",
  ];
  return lines.join("\n");
}
