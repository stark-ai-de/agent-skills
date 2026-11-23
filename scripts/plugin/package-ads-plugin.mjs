import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import { load as parseYaml } from "js-yaml";
import sourceSchema from "../../plugins/stark-ai-ads.source.schema.json" with { type: "json" };
import { assertNoUntrackedReleaseInputs, listTrackedSourceFiles } from "../lib/git-index.mjs";
import { validateOpenAiYaml } from "../lib/openai-contract.mjs";
import { assertInside } from "../lib/plugin-projections.mjs";
import { encodeZipStoreV1, writeZipStoreV1 } from "../lib/reproducible-archive.mjs";

export const ADS_PLUGIN_SOURCE = "plugins/stark-ai-ads.source.json";
const validateSchema = new Ajv2020({ allErrors: true, strict: true }).compile(sourceSchema);
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const json = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);

function regularFile(root, relative) {
  if (
    typeof relative !== "string" ||
    path.posix.isAbsolute(relative) ||
    relative.includes("\\") ||
    relative.split("/").some((part) => !part || part === "." || part === "..")
  )
    throw new Error("Plugin source path must be a contained POSIX path");
  const absolute = path.resolve(root, relative);
  assertInside(root, absolute);
  if (!fs.lstatSync(absolute).isFile())
    throw new Error(`Plugin source is not a regular file: ${relative}`);
  return fs.readFileSync(absolute);
}

function publicHttpsUrl(value, label, { allowFragment = false } = {}) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} requires a public HTTPS URL`);
  }
  const host = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    (!allowFragment && url.hash) ||
    net.isIP(host.replace(/^\[|\]$/g, "")) ||
    !host.includes(".") ||
    host.endsWith(".") ||
    /(?:^|\.)(?:localhost|local|internal|invalid|test|example)$/.test(host) ||
    /(?:^|\.)example\.(?:com|org|net)$/.test(host)
  )
    throw new Error(
      `${label} must use a public HTTPS DNS hostname without credentials, queries or placeholders`,
    );
  return url;
}

function validatePng(bytes, label) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (
    bytes.length < 24 ||
    bytes.length > 5 * 1024 * 1024 ||
    !bytes.subarray(0, 8).equals(signature)
  )
    throw new Error(`${label} must be a PNG of at most 5 MiB`);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width !== height || width < 48 || width > 4096)
    throw new Error(`${label} must be square and between 48 and 4096 pixels`);
}

export function validateAdsPluginSource(root = process.cwd()) {
  const errors = [];
  let source;
  try {
    source = JSON.parse(regularFile(root, ADS_PLUGIN_SOURCE));
    if (!validateSchema(source))
      return {
        source,
        errors: validateSchema.errors.map(
          (item) => `Ads source${item.instancePath}: ${item.message}`,
        ),
      };
    if (source.output !== `dist/openai/${source.name}-${source.version}.zip`)
      errors.push("Ads output must match its independent identity and version");
    for (const [name, value] of Object.entries(source.urls))
      publicHttpsUrl(value, name, { allowFragment: true });
    for (const [name, relative] of Object.entries(source.assets))
      validatePng(regularFile(root, relative), name);
    const skillText = regularFile(root, `${source.skill.source}/SKILL.md`).toString("utf8");
    const header = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(skillText);
    if (!header) errors.push("Canonical Ads skill requires YAML frontmatter");
    else {
      const metadata = parseYaml(header[1]);
      if (
        metadata?.name !== source.skill.name ||
        typeof metadata.description !== "string" ||
        !metadata.description.trim()
      )
        errors.push("Canonical Ads skill name/description does not match the plugin source");
    }
    regularFile(root, `${source.skill.source}/agents/openai.yaml`);
    errors.push(...validateOpenAiYaml(root, source.skill));
    const metadata = parseYaml(
      regularFile(root, `${source.skill.source}/agents/openai.yaml`).toString("utf8"),
    );
    if (!metadata.policy?.products?.includes("CHAT"))
      errors.push("Canonical Ads metadata must enable CHAT for the ChatGPT plugin");
  } catch (error) {
    errors.push(error.message);
  }
  return { source, errors };
}

function deploymentConfiguration(source, serverUrl, oauthClientId) {
  const endpoint = publicHttpsUrl(serverUrl, "--server-url");
  if (endpoint.pathname !== "/mcp")
    throw new Error("--server-url must use the service's /mcp endpoint");
  const clientId = oauthClientId === undefined ? source.oauthClientId : oauthClientId;
  if (typeof clientId !== "string" || !/^[A-Za-z0-9._-]{1,128}$/.test(clientId))
    throw new Error(
      "OAuth client ID must contain 1-128 letters, digits, dots, underscores or hyphens",
    );
  return { serverUrl: endpoint.href, clientId, origin: endpoint.origin };
}

export function buildAdsPluginEntries({ root = process.cwd(), serverUrl, oauthClientId } = {}) {
  root = path.resolve(root);
  const { source, errors } = validateAdsPluginSource(root);
  if (errors.length) throw new Error(errors.join("\n"));
  const deployment = deploymentConfiguration(source, serverUrl, oauthClientId);
  assertNoUntrackedReleaseInputs(root, [
    ADS_PLUGIN_SOURCE,
    "plugins/stark-ai-ads.source.schema.json",
    source.skill.source,
    ...Object.values(source.assets),
    "LICENSE",
  ]);
  const entries = [];
  for (const file of listTrackedSourceFiles(
    root,
    path.join(root, source.skill.source),
    source.skill.source,
  )) {
    const relative = `${source.skill.source}/${file.relative}`;
    entries.push({
      path: `skills/${source.skill.name}/${file.relative}`,
      data: regularFile(root, relative),
      mode: file.mode,
    });
  }
  const manifest = {
    name: source.name,
    version: source.version,
    description: source.description,
    author: { name: source.author },
    homepage: source.urls.website,
    repository: "https://github.com/stark-ai-de/agent-skills",
    license: "Apache-2.0",
    keywords: ["advertising", "openai-ads", "campaigns", "reporting"],
    skills: "./skills/",
    mcpServers: "./.mcp.json",
    interface: {
      displayName: source.displayName,
      shortDescription: source.shortDescription,
      longDescription: source.description,
      developerName: source.author,
      category: source.category,
      capabilities: source.capabilities,
      defaultPrompt: source.starterPrompts,
      websiteURL: source.urls.website,
      privacyPolicyURL: source.urls.privacyPolicy,
      termsOfServiceURL: source.urls.termsOfService,
      supportURL: source.urls.support,
      logo: "./assets/logo.png",
      logoDark: "./assets/logo-dark.png",
      composerIcon: "./assets/composer-icon.png",
      composerIconDark: "./assets/composer-icon-dark.png",
      brandColor: "#0021C7",
      brandColorDark: "#7FA0FF",
    },
    extensions: { "com.openai": { onboardingSkill: `./skills/${source.skill.name}/SKILL.md` } },
  };
  const mcp = {
    mcpServers: {
      "openai-ads": {
        url: deployment.serverUrl,
        extensions: {
          "com.openai": {
            auth: {
              type: "oauth",
              client: {
                mode: "provided",
                clientId: deployment.clientId,
                tokenEndpointAuthMethod: "none",
              },
              authorizationUrl: `${deployment.origin}/oauth/authorize`,
              tokenUrl: `${deployment.origin}/oauth/token`,
              resource: deployment.serverUrl,
              baseScopes: ["ads:read", "offline_access"],
              defaultScopes: ["ads:read", "ads:write", "offline_access"],
            },
          },
        },
      },
    },
  };
  entries.push(
    { path: ".codex-plugin/plugin.json", data: json(manifest) },
    { path: ".mcp.json", data: json(mcp) },
    { path: "assets/logo.png", data: regularFile(root, source.assets.logo) },
    { path: "assets/logo-dark.png", data: regularFile(root, source.assets.logoDark) },
    { path: "assets/composer-icon.png", data: regularFile(root, source.assets.composerIcon) },
    {
      path: "assets/composer-icon-dark.png",
      data: regularFile(root, source.assets.composerIconDark),
    },
    { path: "LICENSE", data: regularFile(root, "LICENSE") },
    {
      path: "README.md",
      data: Buffer.from(
        `# ${source.displayName}\n\n${source.description}\n\nThis generated package contains the unchanged canonical ${source.skill.name} skill and the OAuth-enabled remote MCP connection at ${deployment.serverUrl}.\n\nThe server is deployed separately; installing this archive does not deploy it. Configure the public client ${deployment.clientId} with the exact callback URL displayed by the OpenAI connection flow.\n\nPackage checks do not establish service availability, Ads account access, completed review or public publication. See ${source.urls.website}.\n`,
      ),
    },
  );
  const files = entries
    .map((entry) => ({
      path: entry.path,
      sha256: digest(entry.data),
      byteLength: entry.data.length,
      mode: entry.mode === 0o755 ? "0755" : "0644",
    }))
    .sort((a, b) => Buffer.from(a.path).compare(Buffer.from(b.path)));
  entries.push({
    path: "SOURCE-MANIFEST.json",
    data: json({
      schemaVersion: 1,
      plugin: source.name,
      version: source.version,
      archiveProfile: "zip-store-v1",
      sourceSha256: digest(regularFile(root, ADS_PLUGIN_SOURCE)),
      serverUrl: deployment.serverUrl,
      oauthClientId: deployment.clientId,
      deploymentVerified: false,
      files,
    }),
  });
  return { entries, source, deployment };
}

export function packageAdsPlugin({ root = process.cwd(), output, ...options } = {}) {
  root = path.resolve(root);
  const { entries, source } = buildAdsPluginEntries({ root, ...options });
  const destination = path.resolve(output ?? path.join(root, source.output));
  if (path.extname(destination) !== ".zip")
    throw new Error("Ads plugin output must be a .zip file");
  const relative = path.relative(root, destination);
  if (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
    assertInside(path.join(root, "dist/openai"), destination);
  assertInside(path.parse(destination).root, destination);
  return writeZipStoreV1({ entries, output: destination });
}

export function validateAdsPluginArchive({ root = process.cwd(), archive, ...options } = {}) {
  try {
    const expected = encodeZipStoreV1(buildAdsPluginEntries({ root, ...options }).entries);
    const actual = fs.readFileSync(archive);
    return {
      errors: expected.equals(actual)
        ? []
        : [
            "Ads plugin archive differs from the canonical source and explicit deployment configuration",
          ],
    };
  } catch (error) {
    return { errors: [error.message] };
  }
}

export function parseAdsPluginArgs(argv, { validation = false } = {}) {
  const allowed = new Set([
    "--root",
    "--server-url",
    "--oauth-client-id",
    validation ? "--archive" : "--output",
  ]);
  const values = {};
  for (let index = 0; index < argv.length; index++) {
    const name = argv[index];
    if (name === "--help") {
      values.help = true;
      continue;
    }
    if (!allowed.has(name)) throw new Error("Unknown Ads plugin option; use --help");
    if (Object.hasOwn(values, name)) throw new Error(`Repeated option: ${name}`);
    const value = argv[++index];
    if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
    values[name] = value;
  }
  return {
    root: values["--root"] ?? process.cwd(),
    serverUrl: values["--server-url"],
    oauthClientId: values["--oauth-client-id"],
    output: values["--output"],
    archive: values["--archive"],
    help: values.help ?? false,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = parseAdsPluginArgs(process.argv.slice(2));
    if (args.help)
      console.log(
        "Usage: node scripts/plugin/package-ads-plugin.mjs --server-url HTTPS_MCP_URL [--oauth-client-id ID] [--root PATH] [--output PATH.zip]\nWrites a deterministic plugin ZIP; requires tracked canonical sources. Does not deploy, connect or publish.",
      );
    else {
      const result = packageAdsPlugin(args);
      console.log(
        `Packaged independent Ads API by stark AI candidate: ${result.output}\nSHA-256: ${result.sha256}\nBytes: ${result.bytes}\nRemote service availability and public submission remain unverified.`,
      );
    }
  } catch (error) {
    console.error(`Ads plugin packaging failed: ${error.message}`);
    process.exitCode = 1;
  }
}
