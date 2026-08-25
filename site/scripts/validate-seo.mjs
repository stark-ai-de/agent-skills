import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  listingArtifactPaths,
  listingIdentityFromSource,
} from "../../scripts/lib/listing-identity.mjs";

const SITE_ORIGIN = "https://stark-ai-de.github.io";
const SITE_BASE_PATH = "/agent-skills";
const SITE_URL_PREFIX = `${SITE_ORIGIN}${SITE_BASE_PATH}/`;
const LOOPLATCH_URL = "https://loop-latch-opal.vercel.app/";
const dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(dirname, "..");
const repoRoot = path.resolve(siteRoot, "..");
const distRoot = path.join(siteRoot, "dist");
const pluginSource = JSON.parse(
  readFileSync(path.join(repoRoot, "plugins/stark-ai-developer.source.json"), "utf8"),
);
const listingRelativePath = listingArtifactPaths(listingIdentityFromSource(pluginSource)).listing;
const listingSource = JSON.parse(readFileSync(path.join(repoRoot, listingRelativePath), "utf8"));
const htmlCache = new Map();
const titleOwners = new Map();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function walkHtmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return walkHtmlFiles(entryPath);
    }

    return entry.isFile() && (entry.name === "index.html" || entry.name === "404.html")
      ? [entryPath]
      : [];
  });
}

function walkSkillFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return walkSkillFiles(entryPath);
    }

    return entry.isFile() && entry.name === "SKILL.md" ? [entryPath] : [];
  });
}

function normalizeRelativePath(filePath) {
  return path.relative(distRoot, filePath).split(path.sep).join("/");
}

function parseAttributes(tag) {
  const attributes = {};
  const attrPattern = /([\w:-]+)\s*=\s*"([^"]*)"/g;
  let match;

  while ((match = attrPattern.exec(tag)) !== null) {
    attributes[match[1]] = match[2];
  }

  return attributes;
}

function getTags(html, tagName) {
  return Array.from(html.matchAll(new RegExp(`<${tagName}\\s+[^>]*>`, "gi")), (match) =>
    parseAttributes(match[0]),
  );
}

function readCached(filePath) {
  const cached = htmlCache.get(filePath);
  if (cached) {
    return cached;
  }

  const content = readFileSync(filePath, "utf8");
  htmlCache.set(filePath, content);
  return content;
}

function getMetaContent(metaTags, key, value) {
  const tag = metaTags.find((candidate) => candidate[key] === value);
  return tag?.content;
}

function getLinkHref(linkTags, rel) {
  const tag = linkTags.find((candidate) => candidate.rel === rel);
  return tag?.href;
}

function getJsonLdBlocks(html) {
  return Array.from(
    html.matchAll(/<script\s+[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi),
    (match) => JSON.parse(match[1]),
  );
}

function resolveReference(value, fromFilePath) {
  if (!value || value.startsWith("mailto:") || value.startsWith("tel:")) {
    return undefined;
  }

  assert(
    !/^javascript:/i.test(value),
    `${normalizeRelativePath(fromFilePath)}: unsafe URL ${value}`,
  );

  if (value.startsWith("#")) {
    const fromRelative = normalizeRelativePath(fromFilePath);
    const fromDirectory = path.posix.dirname(fromRelative);
    const pathname = `${SITE_BASE_PATH}/${fromDirectory === "." ? "" : `${fromDirectory}/`}`;
    return new URL(value, `${SITE_ORIGIN}${pathname}`);
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    const url = new URL(value);

    if (url.origin !== SITE_ORIGIN) {
      return undefined;
    }

    assert(
      url.pathname === SITE_BASE_PATH || url.pathname.startsWith(`${SITE_BASE_PATH}/`),
      `${normalizeRelativePath(fromFilePath)}: internal URL is missing ${SITE_BASE_PATH} base path: ${value}`,
    );

    return url;
  }

  if (value.startsWith("/")) {
    assert(
      value === SITE_BASE_PATH || value.startsWith(`${SITE_BASE_PATH}/`),
      `${normalizeRelativePath(fromFilePath)}: root URL is missing ${SITE_BASE_PATH} base path: ${value}`,
    );

    return new URL(value, SITE_ORIGIN);
  }

  const fromRelative = normalizeRelativePath(fromFilePath);
  const fromDirectory = path.posix.dirname(fromRelative);
  const basePath = `${SITE_BASE_PATH}/${fromDirectory === "." ? "" : `${fromDirectory}/`}`;
  return new URL(value, `${SITE_ORIGIN}${basePath}`);
}

function filePathForSiteUrl(url) {
  const pathname = decodeURIComponent(url.pathname);
  const withoutBase =
    pathname === SITE_BASE_PATH ? "" : pathname.replace(new RegExp(`^${SITE_BASE_PATH}/?`), "");
  const relativePath = withoutBase.replace(/^\/+/, "");
  const directPath = path.join(distRoot, relativePath);

  if (existsSync(directPath) && statSync(directPath).isFile()) {
    return directPath;
  }

  const indexPath = path.join(directPath, "index.html");
  if (existsSync(indexPath)) {
    return indexPath;
  }

  return undefined;
}

function assertHashTarget(filePath, hash, context) {
  if (!hash || path.basename(filePath) !== "index.html") {
    return;
  }

  const target = decodeURIComponent(hash.slice(1));
  const html = readCached(filePath);
  const escapedTarget = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  assert(
    new RegExp(`\\s(?:id|name)="${escapedTarget}"(?:\\s|>)`).test(html),
    `${context}: missing hash target #${target}`,
  );
}

function validateSiteReference(value, fromFilePath, context) {
  const url = resolveReference(value, fromFilePath);
  if (!url) {
    return;
  }

  const targetPath = filePathForSiteUrl(url);
  assert(targetPath, `${context}: missing generated target for ${value}`);
  assertHashTarget(targetPath, url.hash, context);
}

function validateLocalReferences(filePath, html, linkTags, metaTags) {
  const relativePath = normalizeRelativePath(filePath);
  const linkedAttributes = [
    ...getTags(html, "a").map((attrs) => ["a", "href", attrs.href]),
    ...getTags(html, "img").map((attrs) => ["img", "src", attrs.src]),
    ...getTags(html, "script").map((attrs) => ["script", "src", attrs.src]),
    ...linkTags.map((attrs) => ["link", "href", attrs.href]),
  ];

  for (const [tagName, attributeName, value] of linkedAttributes) {
    if (value) {
      validateSiteReference(value, filePath, `${relativePath}: <${tagName}> ${attributeName}`);
    }
  }

  for (const imageMeta of ["og:image", "og:image:secure_url"]) {
    const imageUrl = getMetaContent(metaTags, "property", imageMeta);
    if (imageUrl) {
      validateSiteReference(imageUrl, filePath, `${relativePath}: ${imageMeta}`);
    }
  }

  const twitterImage = getMetaContent(metaTags, "name", "twitter:image");
  if (twitterImage) {
    validateSiteReference(twitterImage, filePath, `${relativePath}: twitter:image`);
  }
}

function validateRenderedMarkdown(html, relativePath) {
  const markdownMatch = html.match(/<div class="markdown">([\s\S]*?)<\/div>\s*<\/article>/);

  if (!markdownMatch) {
    return;
  }

  assert(
    !/(<script|javascript:|\son[a-z]+\s*=)/i.test(markdownMatch[1]),
    `${relativePath}: unsafe markup leaked into rendered Markdown`,
  );
  assert(
    !/<h1\b/i.test(markdownMatch[1]),
    `${relativePath}: rendered Markdown must not include h1`,
  );
}

function validateHtmlPage(filePath) {
  const html = readCached(filePath);
  const relativePath = normalizeRelativePath(filePath);
  const metaTags = getTags(html, "meta");
  const linkTags = getTags(html, "link");
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const description = getMetaContent(metaTags, "name", "description");
  const canonicalUrl = getLinkHref(linkTags, "canonical");
  const jsonLdBlocks = getJsonLdBlocks(html);
  const title = titleMatch?.[1]?.trim();

  assert(title, `${relativePath}: missing <title>`);
  assert(title.length <= 65, `${relativePath}: title exceeds 65 characters`);
  assert(
    !titleOwners.has(title),
    `${relativePath}: duplicate title also used by ${titleOwners.get(title)}`,
  );
  titleOwners.set(title, relativePath);
  assert(
    (html.match(/<h1\b/gi) ?? []).length === 1,
    `${relativePath}: page must contain exactly one h1`,
  );
  for (const image of getTags(html, "img")) {
    assert(Object.hasOwn(image, "alt"), `${relativePath}: image is missing alt text`);
  }
  assert(description, `${relativePath}: missing meta description`);
  assert(description.length <= 160, `${relativePath}: meta description exceeds 160 characters`);
  assert(canonicalUrl?.startsWith(SITE_URL_PREFIX), `${relativePath}: invalid canonical URL`);
  assert(
    getLinkHref(linkTags, "icon") === "/agent-skills/favicon.svg",
    `${relativePath}: missing SVG favicon link`,
  );
  assert(
    getLinkHref(linkTags, "sitemap") === `${SITE_URL_PREFIX}sitemap-index.xml`,
    `${relativePath}: missing sitemap link`,
  );
  assert(
    getLinkHref(linkTags, "manifest") === "/agent-skills/site.webmanifest",
    `${relativePath}: missing manifest link`,
  );
  const robots = getMetaContent(metaTags, "name", "robots");
  const expectedRobots =
    relativePath === "404.html"
      ? "noindex, nofollow"
      : relativePath === "incubator/index.html" || relativePath.startsWith("incubator/")
        ? "noindex, follow"
        : "index, follow";
  assert(robots === expectedRobots, `${relativePath}: expected robots ${expectedRobots}`);
  assert(
    getMetaContent(metaTags, "name", "googlebot"),
    `${relativePath}: missing googlebot metadata`,
  );
  assert(getMetaContent(metaTags, "name", "theme-color"), `${relativePath}: missing theme color`);
  assert(getMetaContent(metaTags, "property", "og:title"), `${relativePath}: missing og:title`);
  assert(
    getMetaContent(metaTags, "property", "og:description"),
    `${relativePath}: missing og:description`,
  );
  assert(
    getMetaContent(metaTags, "property", "og:url") === canonicalUrl,
    `${relativePath}: bad og:url`,
  );
  assert(
    getMetaContent(metaTags, "property", "og:image")?.startsWith(SITE_URL_PREFIX),
    `${relativePath}: missing og:image`,
  );
  assert(
    getMetaContent(metaTags, "property", "og:image:width"),
    `${relativePath}: missing og image width`,
  );
  assert(
    getMetaContent(metaTags, "property", "og:image:height"),
    `${relativePath}: missing og image height`,
  );
  assert(
    getMetaContent(metaTags, "property", "og:image:alt"),
    `${relativePath}: missing og image alt text`,
  );
  assert(
    getMetaContent(metaTags, "name", "twitter:card") === "summary_large_image",
    `${relativePath}: missing Twitter card`,
  );
  assert(
    getMetaContent(metaTags, "name", "twitter:title"),
    `${relativePath}: missing Twitter title`,
  );
  assert(
    getMetaContent(metaTags, "name", "twitter:description"),
    `${relativePath}: missing Twitter description`,
  );
  assert(
    getMetaContent(metaTags, "name", "twitter:image")?.startsWith(SITE_URL_PREFIX),
    `${relativePath}: missing Twitter image`,
  );
  assert(
    getMetaContent(metaTags, "name", "twitter:image:alt"),
    `${relativePath}: missing Twitter image alt text`,
  );
  assert(jsonLdBlocks.length > 0, `${relativePath}: missing JSON-LD`);

  const graph = jsonLdBlocks.flatMap((block) =>
    Array.isArray(block["@graph"]) ? block["@graph"] : [],
  );

  for (const block of jsonLdBlocks) {
    assert(block["@context"] === "https://schema.org", `${relativePath}: invalid JSON-LD context`);
    assert(Array.isArray(block["@graph"]), `${relativePath}: JSON-LD graph must be an array`);
    assert(
      block["@graph"].some((node) => node["@type"] === "Organization"),
      `${relativePath}: missing Organization schema`,
    );
    assert(
      block["@graph"].some((node) => node["@type"] === "WebSite"),
      `${relativePath}: missing WebSite schema`,
    );
    assert(
      block["@graph"].some(
        (node) => node["@type"] === "WebPage" || node["@type"] === "CollectionPage",
      ),
      `${relativePath}: missing page schema`,
    );
  }

  const organization = graph.find((node) => node["@type"] === "Organization");
  assert(
    organization?.logo?.url?.startsWith(SITE_URL_PREFIX),
    `${relativePath}: Organization logo must be hosted on this catalog`,
  );

  if (relativePath === "plugins/stark-ai-developer/index.html") {
    assert(
      graph.some((node) => node["@type"] === "SoftwareApplication"),
      `${relativePath}: missing SoftwareApplication schema`,
    );
    assert(
      graph.some((node) => node["@type"] === "HowTo"),
      `${relativePath}: missing HowTo schema`,
    );
  }

  if (relativePath === "support/index.html") {
    assert(
      graph.some((node) => node["@type"] === "FAQPage"),
      `${relativePath}: missing FAQPage schema`,
    );
  }

  if (/^skills\/[^/]+\/index\.html$/.test(relativePath)) {
    const article = graph.find((node) => node["@type"] === "TechArticle");
    assert(article?.datePublished, `${relativePath}: missing TechArticle datePublished`);
    assert(article?.dateModified, `${relativePath}: missing TechArticle dateModified`);
  }

  validateRenderedMarkdown(html, relativePath);
  validateLocalReferences(filePath, html, linkTags, metaTags);
}

function validateManifest() {
  const manifestPath = path.join(distRoot, "site.webmanifest");
  assert(existsSync(manifestPath), "site.webmanifest was not generated.");

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  for (const key of ["start_url", "scope", "id"]) {
    assert(
      typeof manifest[key] === "string" && manifest[key].startsWith(`${SITE_BASE_PATH}/`),
      `site.webmanifest: ${key} must be inside ${SITE_BASE_PATH}/`,
    );
  }

  assert(Array.isArray(manifest.icons), "site.webmanifest: icons must be an array.");
  const iconSizes = new Set(manifest.icons.map((icon) => icon.sizes));
  assert(iconSizes.has("192x192"), "site.webmanifest: missing 192x192 icon.");
  assert(iconSizes.has("512x512"), "site.webmanifest: missing 512x512 icon.");
  for (const icon of manifest.icons) {
    assert(typeof icon.src === "string", "site.webmanifest: icon is missing src.");
    validateSiteReference(icon.src, manifestPath, `site.webmanifest: icon ${icon.src}`);
  }
}

function validateCatalogCoverage() {
  for (const [sourceRoot, routeRoot] of [
    ["skills", "skills"],
    ["incubator/skills", "incubator"],
  ]) {
    const sourceDirectory = path.join(repoRoot, sourceRoot);

    for (const skillFile of walkSkillFiles(sourceDirectory)) {
      const skillName = path.basename(path.dirname(skillFile));
      const generatedPage = path.join(distRoot, routeRoot, skillName, "index.html");
      assert(
        existsSync(generatedPage),
        `${sourceRoot}/${skillName}: missing generated catalog page ${routeRoot}/${skillName}/`,
      );
    }
  }
}

function validateLoopLatchBacklinks(htmlFiles) {
  for (const htmlFile of htmlFiles) {
    const links = getTags(readCached(htmlFile), "a").filter(({ href }) => href === LOOPLATCH_URL);
    assert(links.length > 0, `${normalizeRelativePath(htmlFile)}: missing LoopLatch backlink`);

    for (const link of links) {
      assert(
        !/(?:^|\s)(?:nofollow|sponsored)(?:\s|$)/i.test(link.rel ?? ""),
        `${normalizeRelativePath(htmlFile)}: LoopLatch backlink must be followable`,
      );
    }
  }

  const homePath = path.join(distRoot, "index.html");
  const homeLinks = getTags(readCached(homePath), "a").filter(({ href }) => href === LOOPLATCH_URL);
  assert(homeLinks.length >= 2, "index.html must include contextual and sitewide LoopLatch links");
}

function sitemapLocations(xml) {
  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (match) => match[1]);
}

function collectSitemapPageUrls(sitemapPath) {
  const sitemapIndex = readFileSync(sitemapPath, "utf8");
  const childSitemaps = sitemapLocations(sitemapIndex);
  const pageUrls = [];

  assert(childSitemaps.length > 0, "sitemap-index.xml does not list any sitemap files.");

  for (const sitemapUrl of childSitemaps) {
    const sitemapFilePath = filePathForSiteUrl(new URL(sitemapUrl));
    assert(sitemapFilePath, `sitemap-index.xml: missing generated sitemap ${sitemapUrl}`);

    const sitemap = readFileSync(sitemapFilePath, "utf8");
    const urls = sitemapLocations(sitemap);
    assert(urls.length > 0, `${normalizeRelativePath(sitemapFilePath)} does not list any URLs.`);

    for (const pageUrl of urls) {
      assert(!pageUrl.includes("/incubator/"), `sitemap includes incubator URL ${pageUrl}`);
      assert(!/\/404(?:\.html)?(?:$|[?#])/.test(pageUrl), `sitemap includes 404 URL ${pageUrl}`);
      const pageFilePath = filePathForSiteUrl(new URL(pageUrl));
      assert(pageFilePath, `${normalizeRelativePath(sitemapFilePath)}: missing page ${pageUrl}`);
      assert(
        path.basename(pageFilePath) === "index.html",
        `${normalizeRelativePath(sitemapFilePath)}: sitemap URL is not an HTML page ${pageUrl}`,
      );
      pageUrls.push(pageUrl);
    }
  }

  return pageUrls;
}

function validateSitemapCoverage(htmlFiles, sitemapUrls) {
  const listed = new Set(sitemapUrls);

  for (const htmlFile of htmlFiles) {
    const html = readCached(htmlFile);
    const relativePath = normalizeRelativePath(htmlFile);
    const robots = getMetaContent(getTags(html, "meta"), "name", "robots");
    const canonicalUrl = getLinkHref(getTags(html, "link"), "canonical");

    if (robots === "index, follow") {
      assert(
        listed.has(canonicalUrl),
        `${relativePath}: indexable canonical missing from sitemap: ${canonicalUrl}`,
      );
    } else {
      assert(
        !listed.has(canonicalUrl),
        `${relativePath}: noindex canonical listed in sitemap: ${canonicalUrl}`,
      );
    }
  }
}

function validateLlmsTxt() {
  const llmsPath = path.join(distRoot, "llms.txt");
  assert(existsSync(llmsPath), "llms.txt was not generated.");

  const content = readFileSync(llmsPath, "utf8");
  const pluginWebsiteUrl = listingSource.plugin?.urls?.website;
  const chatgptPluginUrl = listingSource.plugin?.urls?.chatgptPlugin;
  assert(content.startsWith("# "), "llms.txt must start with an H1.");
  assert(!content.includes("/incubator/"), "llms.txt must not list incubator pages.");
  assert(
    typeof pluginWebsiteUrl === "string" && pluginWebsiteUrl.length > 0,
    "listing source missing plugin website URL",
  );
  assert(content.includes(pluginWebsiteUrl), "llms.txt missing plugin URL");
  assert(
    typeof chatgptPluginUrl === "string" && chatgptPluginUrl.length > 0,
    "listing source missing ChatGPT plugin URL",
  );
  assert(content.includes(chatgptPluginUrl), "llms.txt missing ChatGPT plugin URL");

  for (const skillFile of walkSkillFiles(path.join(repoRoot, "skills"))) {
    const skillName = path.basename(path.dirname(skillFile));
    assert(
      content.includes(`${SITE_URL_PREFIX}skills/${skillName}/`),
      `llms.txt missing public skill ${skillName}`,
    );
  }
}

function validateSitemaps(sitemapPath) {
  return collectSitemapPageUrls(sitemapPath);
}

assert(existsSync(distRoot), "site/dist does not exist. Run astro build before SEO validation.");

const htmlFiles = walkHtmlFiles(distRoot);
assert(htmlFiles.length > 0, "No generated HTML pages found.");

for (const htmlFile of htmlFiles) {
  validateHtmlPage(htmlFile);
}

const robotsPath = path.join(distRoot, "robots.txt");
const sitemapPath = path.join(distRoot, "sitemap-index.xml");
assert(existsSync(robotsPath), "robots.txt was not generated.");
assert(existsSync(sitemapPath), "sitemap-index.xml was not generated.");
assert(
  readFileSync(robotsPath, "utf8").includes(`${SITE_URL_PREFIX}sitemap-index.xml`),
  "robots.txt does not point to the generated sitemap.",
);
validateManifest();
validateCatalogCoverage();
validateLoopLatchBacklinks(htmlFiles);
const sitemapUrls = validateSitemaps(sitemapPath);
validateSitemapCoverage(htmlFiles, sitemapUrls);
validateLlmsTxt();

console.log(`SEO validated for ${htmlFiles.length} HTML page(s).`);
