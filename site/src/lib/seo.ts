import type { StarkAiDeveloperListing } from "./plugin-listing";
import type { CatalogSkill } from "./skills";
import {
  absoluteSiteUrl,
  DEFAULT_OG_IMAGE_PATH,
  GITHUB_ORG_URL,
  GITHUB_REPO_URL,
  LICENSE_URL,
  PLUGIN_PATH,
  PUBLIC_POLICY_PAGES,
  PUBLISHER_COUNTRY_CODE,
  PUBLISHER_LEGAL_NAME_FULL,
  PUBLISHER_LOCALITY,
  PUBLISHER_POSTAL_CODE,
  PUBLISHER_STREET,
  PUBLISHER_VAT_ID,
  SEO_KEYWORDS,
  SITE_DESCRIPTION,
  SITE_TITLE,
  STARK_AI_NAME,
  SUPPORT_EMAIL,
  toSeoDescription,
  withStarkAi,
} from "./site";

export type JsonLdNode = Record<string, unknown>;

const ORGANIZATION_ID = "https://stark-ai.de/#organization";
const WEBSITE_ID = `${absoluteSiteUrl("/")}#website`;

export function skillPageTitle(skill: CatalogSkill) {
  return skill.kind === "incubator"
    ? `${skill.title} Incubator Skill`
    : `${skill.title} Agent Skill`;
}

export function baseStructuredData(description = SITE_DESCRIPTION): JsonLdNode[] {
  return [
    {
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: STARK_AI_NAME,
      legalName: PUBLISHER_LEGAL_NAME_FULL,
      url: "https://stark-ai.de/",
      email: SUPPORT_EMAIL,
      vatID: PUBLISHER_VAT_ID,
      address: {
        "@type": "PostalAddress",
        streetAddress: PUBLISHER_STREET,
        postalCode: PUBLISHER_POSTAL_CODE,
        addressLocality: PUBLISHER_LOCALITY,
        addressCountry: PUBLISHER_COUNTRY_CODE,
      },
      logo: {
        "@type": "ImageObject",
        url: absoluteSiteUrl("/logo-alternative.png"),
        width: 2048,
        height: 2048,
      },
      sameAs: ["https://www.linkedin.com/company/starkai-tech/", GITHUB_ORG_URL],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: SUPPORT_EMAIL,
        url: absoluteSiteUrl("/support/"),
      },
    },
    {
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      name: SITE_TITLE,
      description: toSeoDescription(description),
      url: absoluteSiteUrl("/"),
      image: absoluteSiteUrl(DEFAULT_OG_IMAGE_PATH),
      inLanguage: "en-US",
      publisher: {
        "@id": ORGANIZATION_ID,
      },
    },
  ];
}

export function webPageStructuredData({
  canonicalUrl,
  dateModified,
  datePublished,
  description,
  mainEntityId,
  title,
  type = "WebPage",
}: {
  canonicalUrl: string;
  dateModified?: string;
  datePublished?: string;
  description: string;
  mainEntityId?: string;
  title: string;
  type?: "WebPage" | "CollectionPage";
}): JsonLdNode {
  return {
    "@type": type,
    "@id": `${canonicalUrl}#webpage`,
    name: title,
    headline: title,
    description: toSeoDescription(description),
    url: canonicalUrl,
    image: absoluteSiteUrl(DEFAULT_OG_IMAGE_PATH),
    inLanguage: "en-US",
    isPartOf: {
      "@id": WEBSITE_ID,
    },
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
    ...(mainEntityId
      ? {
          mainEntity: {
            "@id": mainEntityId,
          },
        }
      : {}),
    publisher: {
      "@id": ORGANIZATION_ID,
    },
  };
}

export function breadcrumbStructuredData(items: Array<{ name: string; url: string }>): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function skillListStructuredData(skills: CatalogSkill[], canonicalUrl: string): JsonLdNode {
  return {
    "@type": "ItemList",
    "@id": `${canonicalUrl}#skills`,
    name: "Agent Skills",
    numberOfItems: skills.length,
    itemListElement: skills.map((skill, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: skill.name,
      url: absoluteSiteUrl(
        skill.kind === "public" ? `/skills/${skill.name}/` : `/incubator/${skill.name}/`,
      ),
    })),
  };
}

export function skillStructuredData(skill: CatalogSkill, canonicalUrl: string): JsonLdNode {
  const title = skillPageTitle(skill);

  return {
    "@type": "TechArticle",
    "@id": `${canonicalUrl}#article`,
    headline: title,
    name: title,
    description: toSeoDescription(skill.description),
    url: canonicalUrl,
    image: absoluteSiteUrl(DEFAULT_OG_IMAGE_PATH),
    inLanguage: "en-US",
    keywords: [...SEO_KEYWORDS, skill.name, skill.categoryLabel].join(", "),
    articleSection: skill.categoryLabel,
    datePublished: skill.publishedAt,
    dateModified: skill.modifiedAt,
    isAccessibleForFree: true,
    license: LICENSE_URL,
    author: {
      "@id": ORGANIZATION_ID,
    },
    publisher: {
      "@id": ORGANIZATION_ID,
    },
    isPartOf: {
      "@id": WEBSITE_ID,
    },
    mainEntityOfPage: {
      "@id": `${canonicalUrl}#webpage`,
    },
    mainEntity: {
      "@type": "SoftwareSourceCode",
      name: skill.title,
      description: toSeoDescription(skill.description),
      codeRepository: GITHUB_REPO_URL,
      codeSampleType: "full",
      programmingLanguage: "Markdown",
      runtimePlatform: "Agent Skills",
      license: skill.license,
      version: skill.version,
      url: skill.sourceUrl,
      datePublished: skill.publishedAt,
      dateModified: skill.modifiedAt,
    },
  };
}

export function pluginSoftwareStructuredData({
  canonicalUrl,
  chatgptPluginUrl,
  description,
  name,
  version,
}: {
  canonicalUrl: string;
  chatgptPluginUrl: string;
  description: string;
  name: string;
  version: string;
}): JsonLdNode {
  return {
    "@type": "SoftwareApplication",
    "@id": `${canonicalUrl}#software`,
    name,
    description: toSeoDescription(description),
    url: canonicalUrl,
    sameAs: [chatgptPluginUrl],
    image: absoluteSiteUrl(DEFAULT_OG_IMAGE_PATH),
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Cross-platform",
    softwareVersion: version,
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    author: {
      "@id": ORGANIZATION_ID,
    },
    publisher: {
      "@id": ORGANIZATION_ID,
    },
  };
}

export function howToStructuredData({
  canonicalUrl,
  description,
  name,
  steps,
}: {
  canonicalUrl: string;
  description: string;
  name: string;
  steps: Array<{ name: string; text: string }>;
}): JsonLdNode {
  return {
    "@type": "HowTo",
    "@id": `${canonicalUrl}#howto`,
    name,
    description: toSeoDescription(description),
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

export function faqStructuredData({
  canonicalUrl,
  items,
}: {
  canonicalUrl: string;
  items: Array<{ answer: string; question: string }>;
}): JsonLdNode {
  return {
    "@type": "FAQPage",
    "@id": `${canonicalUrl}#faq`,
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function renderLlmsTxt({
  listing,
  skills,
}: {
  listing: StarkAiDeveloperListing;
  skills: CatalogSkill[];
}) {
  const pluginName = withStarkAi(listing.plugin.displayName);
  const lines = [
    `# ${withStarkAi(SITE_TITLE)}`,
    "",
    `> ${withStarkAi(SITE_DESCRIPTION)}`,
    "",
    "This GitHub Pages catalog is generated from repository SKILL.md files. Public skills are installable. Incubator candidates are omitted here because they are not promoted.",
    "",
    "## Catalog",
    "",
    `- [Catalog home](${absoluteSiteUrl("/")}): Public skills, plugin, and incubator overview.`,
    `- [Public skills](${absoluteSiteUrl("/skills/")}): Promoted, installable Agent Skills.`,
    `- [${pluginName}](${absoluteSiteUrl(PLUGIN_PATH)}): OpenAI harness-first Codex and ChatGPT plugin.`,
    `- [ChatGPT plugin](${listing.plugin.urls.chatgptPlugin}): Install ${pluginName} in ChatGPT.`,
    `- [Support](${absoluteSiteUrl("/support/")}): Install help and issue reporting.`,
    "",
    "## Public skills",
    "",
    ...skills.map(
      (skill) =>
        `- [${skill.title}](${absoluteSiteUrl(`/skills/${skill.name}/`)}): ${toSeoDescription(skill.description)}`,
    ),
    "",
    "## Skill sources",
    "",
    ...skills.map(
      (skill) =>
        `- [${skill.name} SKILL.md](${skill.sourceUrl}): Canonical Markdown source for ${skill.title}.`,
    ),
    "",
    "## Policies",
    "",
    ...PUBLIC_POLICY_PAGES.map(
      (page) =>
        `- [${page.label}](${absoluteSiteUrl(page.path)}): Catalog ${page.label.toLowerCase()} page.`,
    ),
    "",
  ];

  return lines.join("\n");
}
