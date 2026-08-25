import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  categoryCatalogUrl,
  categorySlugFromName,
  chatgptPluginIdFromUrl,
  compareCategoryCatalog,
  compareDirectoryIdentity,
  directoryDocumentUrl,
  expectedDirectoryIdentity,
  packageIdentityFromDirectoryDocument,
  pluginIdentityFromListing,
  publicCategoryCatalogUrl,
  sanitizeCatalogCard,
  sanitizeDirectoryDocument,
  verifyListingAgainstCategoryCatalog,
  verifyListingAgainstDirectory,
  verifyOpenAiDirectory,
  CHATGPT_DIRECTORY_DOCUMENT_PREFIX,
} from "../lib/openai-directory.mjs";
import { readOpenAiListing } from "../lib/openai-listing.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const matchingListing = {
  plugin: {
    name: "stark-ai-developer",
    version: "1.0.0",
    displayName: "stark AI Developer",
    developerName: "servrox solutions UG",
    category: "Developer Tools",
    capabilities: ["Turn rough feature ideas into implementation-ready specifications."],
    starterPrompts: ["Turn this feature idea into an implementation-ready specification."],
    urls: {
      chatgptPlugin: "https://chatgpt.com/plugins/plugins_6a85d98a7bc48191879aedd91610271e",
      website: "https://stark-ai-de.github.io/agent-skills/plugins/stark-ai-developer/",
      privacyPolicy: "https://stark-ai-de.github.io/agent-skills/privacy/",
      termsOfService: "https://stark-ai-de.github.io/agent-skills/terms/",
    },
    brandColors: { light: "#0021C7" },
  },
  skills: [
    { name: "beta", portalGlyph: "radar" },
    { name: "alpha", portalGlyph: "bolt" },
  ],
};

const matchingSkillRecords = [
  {
    name: "alpha",
    description: "Alpha skill description.",
    displayName: "Alpha",
    shortDescription: "Alpha short.",
    defaultPrompt: "Do alpha.",
    portalGlyph: "bolt",
  },
  {
    name: "beta",
    description: "Beta skill description.",
    displayName: "Beta",
    shortDescription: "Beta short.",
    defaultPrompt: "Do beta.",
    portalGlyph: "radar",
  },
];

function matchingExpectedIdentity(overrides = {}) {
  return {
    pluginId: "plugins_6a85d98a7bc48191879aedd91610271e",
    ...pluginIdentityFromListing(matchingListing),
    skillRecords: matchingSkillRecords,
    skillsOnly: { mcpServers: [], appManifest: null },
    ...overrides,
  };
}

function matchingDirectory(overrides = {}) {
  return {
    id: "plugins_6a85d98a7bc48191879aedd91610271e",
    name: "stark-ai-developer",
    status: "ENABLED",
    creator_account_user_id: "user-should-never-be-logged",
    release: {
      version: "1.0.0",
      display_name: "stark AI Developer",
      mcp_servers: [],
      app_manifest: null,
      interface: {
        developer_name: "servrox solutions UG",
        category: "Developer Tools",
        capabilities: ["Turn rough feature ideas into implementation-ready specifications."],
        default_prompts: ["Turn this feature idea into an implementation-ready specification."],
        website_url: "https://stark-ai-de.github.io/agent-skills/plugins/stark-ai-developer/",
        privacy_policy_url: "https://stark-ai-de.github.io/agent-skills/privacy/",
        terms_of_service_url: "https://stark-ai-de.github.io/agent-skills/terms/",
        brand_color: "#0021C7",
        short_description: "portal-rewritten-short",
        long_description: "portal-rewritten-long",
      },
      skills: [
        {
          name: "beta",
          description: "Beta skill description.",
          interface: {
            display_name: "Beta",
            short_description: "Beta short.",
            default_prompt: "Do beta.",
            iconography: "radar",
          },
        },
        {
          name: "alpha",
          description: "Alpha skill description.",
          interface: {
            display_name: "Alpha",
            short_description: "Alpha short.",
            default_prompt: "Do alpha.",
            iconography: "bolt",
          },
        },
      ],
    },
    ...overrides,
  };
}

function directoryDocumentFromExpected(expected) {
  return {
    id: expected.pluginId,
    name: expected.name,
    status: "ENABLED",
    creator_account_user_id: "user-should-never-be-logged",
    release: {
      version: expected.version,
      display_name: expected.displayName,
      mcp_servers: [],
      app_manifest: null,
      interface: {
        developer_name: expected.developerName,
        category: expected.category,
        capabilities: expected.capabilities,
        default_prompts: expected.starterPrompts,
        website_url: expected.websiteURL,
        privacy_policy_url: expected.privacyPolicyURL,
        terms_of_service_url: expected.termsOfServiceURL,
        brand_color: expected.brandColor,
        short_description: "portal-rewritten-short",
        long_description: "portal-rewritten-long",
      },
      skills: expected.skillRecords.map((skill) => ({
        name: skill.name,
        description: skill.description,
        interface: {
          display_name: skill.displayName,
          short_description: skill.shortDescription,
          default_prompt: skill.defaultPrompt,
          iconography: skill.portalGlyph,
        },
      })),
    },
  };
}

const liveListing = readOpenAiListing(repositoryRoot);
const livePluginUrl = liveListing.plugin.urls.chatgptPlugin;
const livePluginId = chatgptPluginIdFromUrl(livePluginUrl);
assert.equal(chatgptPluginIdFromUrl(livePluginUrl), livePluginId);
assert.throws(() => chatgptPluginIdFromUrl("https://example.com/plugins/x"), /DIR-001/);
assert.equal(
  directoryDocumentUrl(livePluginId),
  `${CHATGPT_DIRECTORY_DOCUMENT_PREFIX}${livePluginId}`,
);

const listingIdentity = pluginIdentityFromListing(matchingListing);
assert.equal(listingIdentity.category, matchingListing.plugin.category);
assert.equal(listingIdentity.brandColor, matchingListing.plugin.brandColors.light.toLowerCase());

const directoryIdentity = packageIdentityFromDirectoryDocument(matchingDirectory());
assert.deepEqual(
  directoryIdentity.skillRecords.map((skill) => skill.name),
  ["alpha", "beta"],
);
assert.deepEqual(
  compareDirectoryIdentity({
    expectedPluginId: "plugins_6a85d98a7bc48191879aedd91610271e",
    expectedIdentity: matchingExpectedIdentity(),
    directoryIdentity,
  }),
  [],
);

const versionMismatch = packageIdentityFromDirectoryDocument(
  matchingDirectory({
    release: {
      ...matchingDirectory().release,
      version: "1.0.1",
    },
  }),
);
assert.match(
  compareDirectoryIdentity({
    expectedPluginId: "plugins_6a85d98a7bc48191879aedd91610271e",
    expectedIdentity: matchingExpectedIdentity(),
    directoryIdentity: versionMismatch,
  }).join("\n"),
  /version mismatch/,
);

const categoryMismatch = packageIdentityFromDirectoryDocument(
  matchingDirectory({
    release: {
      ...matchingDirectory().release,
      interface: {
        ...matchingDirectory().release.interface,
        category: "Productivity",
      },
    },
  }),
);
assert.match(
  compareDirectoryIdentity({
    expectedPluginId: "plugins_6a85d98a7bc48191879aedd91610271e",
    expectedIdentity: matchingExpectedIdentity(),
    directoryIdentity: categoryMismatch,
  }).join("\n"),
  /category mismatch/,
);

const glyphMismatch = packageIdentityFromDirectoryDocument(
  matchingDirectory({
    release: {
      ...matchingDirectory().release,
      skills: matchingDirectory().release.skills.map((skill) =>
        skill.name === "alpha"
          ? { ...skill, interface: { ...skill.interface, iconography: "code" } }
          : skill,
      ),
    },
  }),
);
assert.match(
  compareDirectoryIdentity({
    expectedPluginId: "plugins_6a85d98a7bc48191879aedd91610271e",
    expectedIdentity: matchingExpectedIdentity(),
    directoryIdentity: glyphMismatch,
  }).join("\n"),
  /skill alpha portalGlyph mismatch/,
);

const descriptionMismatch = packageIdentityFromDirectoryDocument(
  matchingDirectory({
    release: {
      ...matchingDirectory().release,
      skills: matchingDirectory().release.skills.map((skill) =>
        skill.name === "beta" ? { ...skill, description: "rewritten" } : skill,
      ),
    },
  }),
);
assert.match(
  compareDirectoryIdentity({
    expectedPluginId: "plugins_6a85d98a7bc48191879aedd91610271e",
    expectedIdentity: matchingExpectedIdentity(),
    directoryIdentity: descriptionMismatch,
  }).join("\n"),
  /skill beta description mismatch/,
);

const mcpServersPresent = packageIdentityFromDirectoryDocument(
  matchingDirectory({
    release: {
      ...matchingDirectory().release,
      mcp_servers: [{ name: "unexpected" }],
    },
  }),
);
assert.match(
  compareDirectoryIdentity({
    expectedPluginId: "plugins_6a85d98a7bc48191879aedd91610271e",
    expectedIdentity: matchingExpectedIdentity(),
    directoryIdentity: mcpServersPresent,
  }).join("\n"),
  /mcp_servers must be \[\]/,
);

const appManifestPresent = packageIdentityFromDirectoryDocument(
  matchingDirectory({
    release: {
      ...matchingDirectory().release,
      app_manifest: { name: "unexpected" },
    },
  }),
);
assert.match(
  compareDirectoryIdentity({
    expectedPluginId: "plugins_6a85d98a7bc48191879aedd91610271e",
    expectedIdentity: matchingExpectedIdentity(),
    directoryIdentity: appManifestPresent,
  }).join("\n"),
  /app_manifest must be null/,
);

const disabled = packageIdentityFromDirectoryDocument(matchingDirectory({ status: "DISABLED" }));
assert.match(
  compareDirectoryIdentity({
    expectedPluginId: "plugins_6a85d98a7bc48191879aedd91610271e",
    expectedIdentity: matchingExpectedIdentity(),
    directoryIdentity: disabled,
  }).join("\n"),
  /status is "DISABLED"/,
);

const sanitized = JSON.stringify(sanitizeDirectoryDocument(matchingDirectory()));
assert.equal(sanitized.includes("creator_account_user_id"), false);
assert.equal(sanitized.includes("user-should-never-be-logged"), false);
assert.equal(sanitized.includes("portal-rewritten-short"), false);

const expectedFromRepo = expectedDirectoryIdentity(repositoryRoot);
const liveDocument = directoryDocumentFromExpected(expectedFromRepo);
const result = await verifyListingAgainstDirectory({
  root: repositoryRoot,
  fetchImpl: async (url) => {
    assert.equal(
      url,
      "https://chatgpt.com/backend-api/ps/plugins/plugins_6a85d98a7bc48191879aedd91610271e",
    );
    return new Response(JSON.stringify(liveDocument), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  },
});
assert.deepEqual(result.errors, []);
assert.equal(JSON.stringify(result.directory).includes("user-should-never-be-logged"), false);
assert.equal(result.expectedIdentity.skillRecords.length, 6);
assert.equal(
  result.expectedIdentity.skillRecords.find((skill) => skill.name === "codex-spec-interviewer")
    ?.portalGlyph,
  "chat",
);

await assert.rejects(
  () =>
    verifyListingAgainstDirectory({
      root: repositoryRoot,
      fetchImpl: async () =>
        new Response("nope", {
          status: 404,
          headers: { "content-type": "text/plain" },
        }),
    }),
  /HTTP 404/,
);

assert.equal(categorySlugFromName("Developer Tools"), "developer-tools");
assert.equal(categorySlugFromName("Business & Operations"), "business-and-operations");
assert.throws(() => categorySlugFromName("   "), /DIR-002/);
assert.equal(
  publicCategoryCatalogUrl("developer-tools"),
  "https://chatgpt.com/backend-api/ps/plugin-categories/developer-tools/plugins?scope=GLOBAL&limit=50",
);
assert.equal(publicCategoryCatalogUrl("developer-tools").includes("pageToken"), false);
assert.notEqual(
  categoryCatalogUrl("developer-tools", { pageToken: "secret-user-token" }),
  publicCategoryCatalogUrl("developer-tools"),
);
assert.match(
  categoryCatalogUrl("developer-tools", { pageToken: "secret-user-token" }),
  /pageToken=secret-user-token/,
);

const matchingCatalogCard = {
  id: "plugins_6a85d98a7bc48191879aedd91610271e",
  displayName: "stark AI Developer",
  status: "ENABLED",
  installationPolicy: "AVAILABLE",
};
assert.deepEqual(
  compareCategoryCatalog({
    expectedPluginId: "plugins_6a85d98a7bc48191879aedd91610271e",
    expectedDisplayName: "stark AI Developer",
    catalogCard: matchingCatalogCard,
    categorySlug: "developer-tools",
    pagesScanned: 4,
  }),
  [],
);
assert.match(
  compareCategoryCatalog({
    expectedPluginId: "plugins_6a85d98a7bc48191879aedd91610271e",
    expectedDisplayName: "stark AI Developer",
    catalogCard: undefined,
    categorySlug: "developer-tools",
    pagesScanned: 5,
  }).join("\n"),
  /was not found in category "developer-tools" after 5 catalog page/,
);
assert.match(
  compareCategoryCatalog({
    expectedPluginId: "plugins_6a85d98a7bc48191879aedd91610271e",
    expectedDisplayName: "stark AI Developer",
    catalogCard: { ...matchingCatalogCard, status: "DISABLED" },
    categorySlug: "developer-tools",
    pagesScanned: 1,
  }).join("\n"),
  /catalog status is "DISABLED"/,
);
assert.match(
  compareCategoryCatalog({
    expectedPluginId: "plugins_6a85d98a7bc48191879aedd91610271e",
    expectedDisplayName: "stark AI Developer",
    catalogCard: { ...matchingCatalogCard, displayName: "other" },
    categorySlug: "developer-tools",
    pagesScanned: 1,
  }).join("\n"),
  /displayName mismatch/,
);
assert.match(
  compareCategoryCatalog({
    expectedPluginId: "plugins_6a85d98a7bc48191879aedd91610271e",
    expectedDisplayName: "stark AI Developer",
    catalogCard: { ...matchingCatalogCard, installationPolicy: "UNAVAILABLE" },
    categorySlug: "developer-tools",
    pagesScanned: 1,
  }).join("\n"),
  /installationPolicy mismatch/,
);

const secretPageToken = "secret-page-token-user-should-never-be-logged";
const catalogPageOne = {
  plugins: [
    {
      id: "plugin_other",
      display_name: "Other",
      status: "ENABLED",
      installation_policy: "AVAILABLE",
    },
  ],
  pagination: { limit: 50, next_page_token: secretPageToken },
};
const catalogPageTwo = {
  plugins: [
    {
      id: "plugins_6a85d98a7bc48191879aedd91610271e",
      display_name: "stark AI Developer",
      short_description: "Developer workflow toolkit",
      icon_url: "https://files.openai.com/content?id=secret",
      status: "ENABLED",
      installation_policy: "AVAILABLE",
      creator_account_user_id: "user-should-never-be-logged",
    },
  ],
  pagination: { limit: 50, next_page_token: null },
};

const catalogResult = await verifyListingAgainstCategoryCatalog({
  root: repositoryRoot,
  fetchImpl: async (url) => {
    assert.match(url, /\/plugin-categories\/developer-tools\/plugins/);
    assert.doesNotMatch(url, /featured/);
    if (url.includes("pageToken=")) {
      assert.match(url, /pageToken=/);
      return new Response(JSON.stringify(catalogPageTwo), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify(catalogPageOne), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  },
});
assert.deepEqual(catalogResult.errors, []);
assert.equal(catalogResult.pagesScanned, 2);
assert.deepEqual(catalogResult.catalog, sanitizeCatalogCard(matchingCatalogCard));
assert.equal(JSON.stringify(catalogResult).includes("user-should-never-be-logged"), false);
assert.equal(JSON.stringify(catalogResult).includes(secretPageToken), false);
assert.equal(JSON.stringify(catalogResult).includes("files.openai.com"), false);
assert.equal(JSON.stringify(catalogResult).includes("Developer workflow toolkit"), false);

await assert.rejects(
  () =>
    verifyListingAgainstCategoryCatalog({
      root: repositoryRoot,
      fetchImpl: async () =>
        new Response(JSON.stringify({ message: "no_biscuit_no_service" }), {
          status: 451,
          headers: { "content-type": "application/json" },
        }),
    }),
  /\[DIR-002\].*HTTP 451/,
);

const combined = await verifyOpenAiDirectory({
  root: repositoryRoot,
  fetchImpl: async (url) => {
    if (url.includes("/plugin-categories/")) {
      return new Response(JSON.stringify(catalogPageTwo), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    assert.equal(
      url,
      "https://chatgpt.com/backend-api/ps/plugins/plugins_6a85d98a7bc48191879aedd91610271e",
    );
    return new Response(JSON.stringify(liveDocument), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  },
});
assert.deepEqual(combined.errors, []);
assert.equal(combined.categorySlug, "developer-tools");
assert.equal(combined.catalog.status, "ENABLED");

console.log("openai directory identity tests passed");
