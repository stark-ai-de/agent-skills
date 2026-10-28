import fs from "node:fs";
import { isIP } from "node:net";
import path from "node:path";

import { load as parseYaml } from "js-yaml";

import { loadValidatedBundle } from "./bundle-contract.mjs";
import { loadActiveSnapshotFacts } from "./contract-snapshots.mjs";
import { packageAuthorName, pluginIdentity, readRepoPackage } from "./release-descriptor.mjs";
import { assertInside } from "./plugin-projections.mjs";
import { readOpenAiListing } from "./openai-projection.mjs";
import { PORTAL_GLYPHS } from "./openai-directory.mjs";

const SAFE_HEX = /^#[0-9A-Fa-f]{6}$/;
const CHATGPT_PLUGIN_BADGE_PATH = "docs/assets/chatgpt-plugin-badge.svg";
const SAFE_RELATIVE_PATH = /^(?!\/)(?!.*\\)(?!.*(?:^|\/)\.{1,2}(?:\/|$)).+$/;
const ALLOWED_INTERFACE_KEYS = new Set([
  "display_name",
  "short_description",
  "icon_small",
  "icon_large",
  "brand_color",
  "default_prompt",
]);
const ALLOWED_POLICY_KEYS = new Set(["products", "allow_implicit_invocation"]);
// ISO 3166-1 alpha-2 assignments. Intl.DisplayNames also accepts regions such
// as EU and returns "Unknown Region" for ZZ, so it cannot validate countries.
const ISO_3166_ALPHA_2 = new Set(
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " ",
  ),
);

function isMapping(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function relativePathIsSafe(value) {
  return typeof value === "string" && SAFE_RELATIVE_PATH.test(value);
}

export function allowedCategories(root) {
  const facts = loadActiveSnapshotFacts(root, "openaiSubmission");
  if (!Array.isArray(facts.allowedCategories) || facts.allowedCategories.length === 0) {
    throw new Error("[FOUND-001] submission snapshot is missing allowedCategories");
  }
  return new Set(facts.allowedCategories);
}

function parseHex(value) {
  return [
    Number.parseInt(value.slice(1, 3), 16) / 255,
    Number.parseInt(value.slice(3, 5), 16) / 255,
    Number.parseInt(value.slice(5, 7), 16) / 255,
  ].map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
}

function luminance(value) {
  const [red, green, blue] = parseHex(value);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first, second) {
  const lighter = Math.max(luminance(first), luminance(second));
  const darker = Math.min(luminance(first), luminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

function validateReadmeListingShield(root, version, errors) {
  const badgePath = path.join(root, CHATGPT_PLUGIN_BADGE_PATH);
  let badge;
  try {
    badge = fs.readFileSync(badgePath, "utf8");
  } catch {
    errors.push(`${CHATGPT_PLUGIN_BADGE_PATH} is missing`);
    return;
  }
  const labels = [...badge.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map((match) => match[1]);
  const accessibleName = `ChatGPT plugin ${version}`;
  if (
    !labels.includes("ChatGPT") ||
    !labels.includes(version) ||
    !badge.includes(`aria-label="${accessibleName}"`) ||
    !badge.includes(`<title>${accessibleName}</title>`)
  ) {
    errors.push(
      `${CHATGPT_PLUGIN_BADGE_PATH} must show ChatGPT and listing.plugin.version ${version}`,
    );
  }
}

function isPrivateAddress(hostname) {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const version = isIP(host);
  if (version === 4) {
    const octets = host.split(".").map(Number);
    return (
      octets[0] === 0 ||
      octets[0] === 10 ||
      octets[0] === 127 ||
      (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) ||
      (octets[0] === 169 && octets[1] === 254) ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168) ||
      (octets[0] === 198 && octets[1] >= 18 && octets[1] <= 19) ||
      octets[0] >= 224
    );
  }
  if (version === 6) {
    return (
      host === "::" ||
      host === "::1" ||
      host.startsWith("fc") ||
      host.startsWith("fd") ||
      host.startsWith("fe8") ||
      host.startsWith("fe9") ||
      host.startsWith("fea") ||
      host.startsWith("feb")
    );
  }
  return (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".intranet") ||
    host.endsWith(".home.arpa")
  );
}

function validateUrl(value, label, errors) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    errors.push(`${label} must be a valid HTTPS URL`);
    return;
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    !parsed.hostname ||
    isPrivateAddress(parsed.hostname)
  ) {
    errors.push(`${label} must be a public HTTPS URL without credentials, query, or fragment`);
  }
}

function validatePngAsset(root, relativePath, label, errors) {
  if (!relativePathIsSafe(relativePath)) {
    errors.push(`${label} must be a safe repository-relative path`);
    return;
  }
  const assetPath = path.resolve(root, relativePath);
  try {
    assertInside(root, assetPath);
  } catch {
    errors.push(`${label} escapes the repository root or contains a symlinked component`);
    return;
  }
  let stat;
  try {
    stat = fs.lstatSync(assetPath);
  } catch {
    errors.push(`${label} does not exist: ${relativePath}`);
    return;
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    errors.push(`${label} must be a regular file: ${relativePath}`);
    return;
  }
  if (stat.size > 5 * 1024 * 1024) {
    errors.push(`${label} exceeds 5 MiB`);
  }
  const bytes = fs.readFileSync(assetPath);
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!bytes.subarray(0, 8).equals(pngSignature) || bytes.length < 24) {
    errors.push(`${label} must be a PNG`);
    return;
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width !== height || width < 48 || width > 4096) {
    errors.push(`${label} must be square and between 48 and 4096 pixels`);
  }
}

export function validateOpenAiYaml(root, entry) {
  const errors = [];
  const metadataPath = path.join(root, entry.source, "agents", "openai.yaml");
  let metadata;
  try {
    metadata = parseYaml(fs.readFileSync(metadataPath, "utf8"));
  } catch (error) {
    return [`${entry.source}/agents/openai.yaml: ${error.message}`];
  }
  if (!isMapping(metadata)) {
    return [`${entry.source}/agents/openai.yaml must be a mapping`];
  }
  for (const key of Object.keys(metadata)) {
    if (!["interface", "policy", "dependencies"].includes(key)) {
      errors.push(`${entry.source}/agents/openai.yaml has unsupported key ${key}`);
    }
  }
  if (!isMapping(metadata.interface)) {
    errors.push(`${entry.source}/agents/openai.yaml interface must be a mapping`);
  } else {
    for (const key of Object.keys(metadata.interface)) {
      if (!ALLOWED_INTERFACE_KEYS.has(key)) {
        errors.push(`${entry.source}/agents/openai.yaml interface has unsupported key ${key}`);
      }
    }
    if (
      typeof metadata.interface.display_name !== "string" ||
      !metadata.interface.display_name.trim()
    ) {
      errors.push(`${entry.source}/agents/openai.yaml interface.display_name is required`);
    }
    if (
      typeof metadata.interface.short_description !== "string" ||
      metadata.interface.short_description.length < 25 ||
      metadata.interface.short_description.length > 64
    ) {
      errors.push(
        `${entry.source}/agents/openai.yaml interface.short_description must be 25-64 characters`,
      );
    }
    if (
      typeof metadata.interface.default_prompt !== "string" ||
      !metadata.interface.default_prompt.trim()
    ) {
      errors.push(`${entry.source}/agents/openai.yaml interface.default_prompt is required`);
    }
  }
  if (!isMapping(metadata.policy)) {
    errors.push(`${entry.source}/agents/openai.yaml policy must be a mapping`);
  } else {
    for (const key of Object.keys(metadata.policy)) {
      if (!ALLOWED_POLICY_KEYS.has(key)) {
        errors.push(`${entry.source}/agents/openai.yaml policy has unsupported key ${key}`);
      }
    }
    if (
      !Array.isArray(metadata.policy.products) ||
      metadata.policy.products.length === 0 ||
      metadata.policy.products.some((product) => !["CHAT", "CODEX"].includes(product)) ||
      new Set(metadata.policy.products).size !== metadata.policy.products.length
    ) {
      errors.push(
        `${entry.source}/agents/openai.yaml policy.products must contain unique CHAT/CODEX values`,
      );
    }
    if (typeof metadata.policy.allow_implicit_invocation !== "boolean") {
      errors.push(
        `${entry.source}/agents/openai.yaml policy.allow_implicit_invocation must be boolean`,
      );
    }
  }
  if (metadata.dependencies !== undefined) {
    if (!isMapping(metadata.dependencies) || !Array.isArray(metadata.dependencies.tools)) {
      errors.push(`${entry.source}/agents/openai.yaml dependencies.tools must be an array`);
    }
    if (isMapping(metadata.dependencies)) {
      for (const key of Object.keys(metadata.dependencies)) {
        if (key !== "tools") {
          errors.push(`${entry.source}/agents/openai.yaml dependencies has unsupported key ${key}`);
        }
      }
    }
  }
  if (JSON.stringify(metadata).includes("Narrow trigger")) {
    errors.push(`${entry.source}/agents/openai.yaml contains unsupported Narrow trigger policy`);
  }
  return errors;
}

function validateMcpSubmission(submission, errors) {
  if (!isMapping(submission)) {
    errors.push("listing.mcpSubmission must be a mapping");
    return;
  }
  const review = submission.review;
  const publication = submission.publication;
  if (!isMapping(review) || !isMapping(review.test_cases)) {
    errors.push("listing.mcpSubmission.review.test_cases must be a mapping");
  } else {
    for (const kind of ["positive", "negative"]) {
      const cases = review.test_cases[kind];
      if (!Array.isArray(cases) || cases.length === 0) {
        errors.push(`listing.mcpSubmission.review.test_cases.${kind} must be a nonempty array`);
        continue;
      }
      for (const entry of cases) {
        const fields =
          kind === "positive"
            ? ["description", "prompt", "tools_triggered", "expected_behavior"]
            : ["description", "prompt", "expected_behavior"];
        if (
          !isMapping(entry) ||
          fields.some((field) => typeof entry[field] !== "string" || !entry[field].trim())
        ) {
          errors.push(`listing.mcpSubmission.review.test_cases.${kind} contains an invalid case`);
        }
      }
    }
    if (
      typeof review.commerce !== "boolean" ||
      typeof review.commerce_description !== "string" ||
      !review.commerce_description.trim()
    )
      errors.push("listing.mcpSubmission.review commerce fields are invalid");
    validateUrl(
      review.demo_recording_url,
      "listing.mcpSubmission.review.demo_recording_url",
      errors,
    );
  }
  if (!isMapping(publication)) {
    errors.push("listing.mcpSubmission.publication must be a mapping");
    return;
  }
  if (typeof publication.release_notes !== "string" || !publication.release_notes.trim())
    errors.push("listing.mcpSubmission.publication.release_notes is required");
  if (
    "countries" in publication &&
    (!Array.isArray(publication.countries) ||
      publication.countries.some(
        (country) => typeof country !== "string" || !ISO_3166_ALPHA_2.has(country),
      ))
  )
    errors.push("listing.mcpSubmission.publication.countries must contain ISO country codes");
  if (
    !isMapping(publication.translations) ||
    !isMapping(publication.translations["de-DE"]) ||
    typeof publication.translations["de-DE"].subtitle !== "string" ||
    !publication.translations["de-DE"].subtitle.trim() ||
    publication.translations["de-DE"].subtitle.length > 30 ||
    typeof publication.translations["de-DE"].description !== "string" ||
    !publication.translations["de-DE"].description.trim() ||
    publication.translations["de-DE"].description.length > 4000
  )
    errors.push("listing.mcpSubmission.publication.translations.de-DE is invalid");
}

export function validateOpenAiListing(root) {
  const errors = [];
  const bundle = loadValidatedBundle(root);
  let listing;
  try {
    listing = readOpenAiListing(root);
  } catch (error) {
    return { bundle, listing: null, errors: [error.message] };
  }
  if (listing.mcpSubmission !== undefined) validateMcpSubmission(listing.mcpSubmission, errors);
  const plugin = listing.plugin;
  if (!isMapping(plugin)) {
    errors.push("listing.plugin must be a mapping");
    return { bundle, listing, errors };
  }
  // The base listing is anchored to listingId below; projections apply the selected OpenAI identity.
  let identity;
  try {
    identity = pluginIdentity(root);
  } catch (error) {
    errors.push(error.message);
  }
  if (identity) {
    if (plugin.version !== identity.version) {
      errors.push("[REL-001] listing.plugin.version must match the release descriptor");
    }
    if (typeof plugin.version === "string") {
      validateReadmeListingShield(root, plugin.version, errors);
    }
    if (plugin.name !== identity.listingId) {
      errors.push("[REL-001] listing.plugin.name must match the release listingId");
    }
    if (
      identity.publicListingStrategy === "single-plugin-six-bundled-skills" &&
      bundle.skills.length !== 6
    ) {
      errors.push("[REL-001] one-listing strategy requires exactly six bundled skills");
    }
  }
  if (typeof plugin.displayName !== "string" || plugin.displayName.length > 30) {
    errors.push("listing.plugin.displayName must be at most 30 characters");
  }
  if (typeof plugin.shortDescription !== "string" || plugin.shortDescription.length > 30) {
    errors.push("listing.plugin.shortDescription must be at most 30 characters");
  }
  if (typeof plugin.longDescription !== "string" || plugin.longDescription.length > 4000) {
    errors.push("listing.plugin.longDescription must be at most 4000 characters");
  }
  if (typeof plugin.developerName !== "string" || plugin.developerName.length > 80) {
    errors.push("listing.plugin.developerName must be at most 80 characters");
  }
  try {
    if (!allowedCategories(root).has(plugin.category)) {
      errors.push(`listing.plugin.category is unsupported: ${plugin.category}`);
    }
  } catch (error) {
    errors.push(error.message);
  }
  if (
    !Array.isArray(plugin.capabilities) ||
    plugin.capabilities.length > 20 ||
    plugin.capabilities.some(
      (capability) => typeof capability !== "string" || capability.length > 120,
    )
  ) {
    errors.push(
      "listing.plugin.capabilities must contain at most 20 strings of at most 120 characters",
    );
  }
  if (
    !Array.isArray(plugin.starterPrompts) ||
    plugin.starterPrompts.length > 3 ||
    new Set(plugin.starterPrompts).size !== plugin.starterPrompts.length ||
    plugin.starterPrompts.some(
      (prompt) =>
        typeof prompt !== "string" ||
        prompt.length > 128 ||
        prompt.includes("\n") ||
        prompt.includes("@"),
    )
  ) {
    errors.push(
      "listing.plugin.starterPrompts must contain at most three unique one-line prompts of at most 128 characters",
    );
  }
  if (typeof plugin.longDescription === "string" && plugin.longDescription.length > 1024) {
    errors.push("listing.plugin.longDescription exceeds the top-level description limit");
  }

  for (const [key, value] of Object.entries(plugin.urls ?? {})) {
    validateUrl(value, `listing.plugin.urls.${key}`, errors);
  }
  for (const requiredUrl of [
    "website",
    "privacyPolicy",
    "termsOfService",
    "support",
    "security",
    "chatgptPlugin",
  ]) {
    if (!plugin.urls?.[requiredUrl]) errors.push(`listing.plugin.urls.${requiredUrl} is required`);
  }
  if (
    !isMapping(plugin.brandColors) ||
    !SAFE_HEX.test(plugin.brandColors.light) ||
    !SAFE_HEX.test(plugin.brandColors.dark)
  ) {
    errors.push("listing.plugin.brandColors must contain six-digit light and dark hex values");
  } else {
    if (contrastRatio(plugin.brandColors.light, "#FFFFFF") < 2) {
      errors.push("listing.plugin.brandColors.light does not meet white contrast");
    }
    if (contrastRatio(plugin.brandColors.dark, "#212121") < 2) {
      errors.push("listing.plugin.brandColors.dark does not meet dark contrast");
    }
  }
  const assets = isMapping(plugin.assets) ? plugin.assets : {};
  for (const requiredAsset of ["logo", "composerIcon"]) {
    if (typeof assets[requiredAsset] !== "string" || !assets[requiredAsset].trim()) {
      errors.push(`listing.plugin.assets.${requiredAsset} is required`);
    }
  }
  for (const [label, asset] of Object.entries(assets)) {
    validatePngAsset(root, asset, `listing.plugin.assets.${label}`, errors);
  }

  if (!isMapping(listing.publisher) || typeof listing.publisher.legalName !== "string") {
    errors.push("listing.publisher.legalName is required");
  } else {
    const privatePublisherFields = Object.keys(listing.publisher).filter(
      (key) => key !== "legalName",
    );
    if (privatePublisherFields.length > 0) {
      errors.push(
        `[PRV-001] listing.publisher contains private fields: ${privatePublisherFields.join(", ")}`,
      );
    }
    const authorName = packageAuthorName(readRepoPackage(root));
    if (!authorName || listing.publisher.legalName !== authorName) {
      errors.push("listing.publisher.legalName must match package.json author.name");
    }
    if (listing.plugin.developerName !== listing.publisher.legalName) {
      errors.push("listing.plugin.developerName must match listing.publisher.legalName");
    }
  }
  if ("availability" in listing) {
    errors.push("listing.availability is not a portal field; omit it");
  }

  const expectedNames = bundle.skills.map((entry) => entry.name);
  const listedNames = Array.isArray(listing.skills)
    ? listing.skills.map((entry) => entry.name)
    : [];
  if (JSON.stringify(listedNames) !== JSON.stringify(expectedNames)) {
    errors.push("listing.skills must match the ordered bundle membership");
  }
  for (const [index, entry] of bundle.skills.entries()) {
    const listed = listing.skills?.[index];
    if (!listed || listed.name !== entry.name) continue;
    if (
      !Array.isArray(listed.products) ||
      listed.products.some((product) => !["CHAT", "CODEX"].includes(product)) ||
      typeof listed.allowImplicitInvocation !== "boolean"
    ) {
      errors.push(`listing.skills.${entry.name} has invalid routing`);
    }
    if (!PORTAL_GLYPHS.includes(listed.portalGlyph) || listed.portalGlyph === "cursor") {
      errors.push(
        `listing.skills.${entry.name} portalGlyph must be a reviewed Apps Management glyph other than cursor`,
      );
    }
    errors.push(...validateOpenAiYaml(root, entry));
    try {
      const metadata = parseYaml(
        fs.readFileSync(path.join(root, entry.source, "agents", "openai.yaml"), "utf8"),
      );
      if (
        JSON.stringify(metadata.policy?.products) !== JSON.stringify(listed.products) ||
        metadata.policy?.allow_implicit_invocation !== listed.allowImplicitInvocation
      ) {
        errors.push(`listing.skills.${entry.name} routing does not match agents/openai.yaml`);
      }
    } catch {
      // The detailed metadata error is emitted by validateOpenAiYaml.
    }
    const identity = `${bundle.distributions.openaiPlugin}:${entry.name}`;
    if (identity.length > 64)
      errors.push(`combined OpenAI identity exceeds 64 characters: ${identity}`);
  }
  const portalGlyphs = Array.isArray(listing.skills)
    ? listing.skills.map((skill) => skill.portalGlyph).filter(Boolean)
    : [];
  if (new Set(portalGlyphs).size !== portalGlyphs.length) {
    errors.push("listing.skills portalGlyph values must be unique");
  }

  const serialized = JSON.stringify(listing);
  if (
    /(?:\/home\/(?!<)[^/\s]+\/|\/Users\/(?!<)[^/\s]+\/|BEGIN (?:RSA|OPENSSH) PRIVATE KEY|ghp_|(?:^|[^A-Za-z0-9])sk-[A-Za-z0-9])/.test(
      serialized,
    )
  ) {
    errors.push("listing contains a private path, credential, or token-like value");
  }
  return { bundle, listing, errors: [...new Set(errors)] };
}

export { contrastRatio };
