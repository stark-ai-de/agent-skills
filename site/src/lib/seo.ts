import type { CatalogSkill } from "./skills";
import {
  absoluteSiteUrl,
  DEFAULT_OG_IMAGE_PATH,
  GITHUB_REPO_URL,
  SEO_KEYWORDS,
  SITE_DESCRIPTION,
  SITE_TITLE,
  toSeoDescription,
} from "./site";

export type JsonLdNode = Record<string, unknown>;

const ORGANIZATION_ID = "https://stark-ai.de/#organization";
const WEBSITE_ID = `${absoluteSiteUrl("/")}#website`;

export function baseStructuredData(description = SITE_DESCRIPTION): JsonLdNode[] {
  return [
    {
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: "stark AI",
      url: "https://stark-ai.de/",
      logo: {
        "@type": "ImageObject",
        url: "https://stark-ai.de/logo-alternative.png",
        width: 2048,
        height: 2048,
      },
      sameAs: ["https://www.linkedin.com/company/starkai-tech/"],
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
  description,
  mainEntityId,
  title,
  type = "WebPage",
}: {
  canonicalUrl: string;
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
  const title = `${skill.title} Agent Skill`;

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
    },
  };
}
