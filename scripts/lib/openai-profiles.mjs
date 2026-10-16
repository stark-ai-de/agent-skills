import fs from "node:fs";
import { buildInputDigest, digest } from "./metadata-mcp-build.mjs";
import path from "node:path";
import { openAiIdentityFromSource } from "./listing-identity.mjs";
import { loadValidatedPluginSource } from "./release-descriptor.mjs";

export function openAiProfile(root, profileId) {
  return openAiIdentityFromSource(loadValidatedPluginSource(root), profileId);
}
export function listingForProfile(root, listing, profileId) {
  const profile = openAiProfile(root, profileId);
  return listingForOpenAiIdentity(listing, profile);
}
export function listingForOpenAiIdentity(listing, profile) {
  const selected = structuredClone(listing);
  selected.canonicalPluginName = listing.plugin.name;
  selected.submissionProfile = profile;
  if (profile.transport !== "none") {
    if (listing.mcpSubmission?.publication?.release_notes)
      selected.releaseNotes = listing.mcpSubmission.publication.release_notes;
    Object.assign(selected.plugin, {
      name: profile.pluginId,
      version: profile.version,
      displayName: profile.displayName,
      shortDescription: "Skills and metadata checks",
      longDescription: profile.description,
      capabilities: ["Reviewed developer workflows", "Skill and plugin metadata validation"],
      starterPrompts: [
        "Validate the skill metadata I provide",
        "Check the plugin manifest I provide",
      ],
    });
  }
  return selected;
}
export function profilePackageFiles(root, profile) {
  if (!profile || profile.transport === "none") return [];
  const configuration =
    profile.transport === "http"
      ? { url: profile.url }
      : { command: "node", args: ["${PLUGIN_ROOT}/server/dist/index.mjs"] };
  const files = [
    {
      path: ".mcp.json",
      content: `${JSON.stringify({ mcpServers: { "skill-metadata": configuration } }, null, 2)}\n`,
    },
  ];
  if (profile.transport === "stdio") {
    const packageRoot = path.join(root, "packages/skill-metadata-mcp");
    const manifestPath = path.join(packageRoot, "dist/BUILD-MANIFEST-stdio.json");
    if (!fs.existsSync(manifestPath))
      throw new Error("Build the metadata MCP stdio bundle before desktop packaging.");
    const built = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (
      built.inputDigest !== buildInputDigest(packageRoot) ||
      built.sha256 !== digest(fs.readFileSync(path.join(packageRoot, "dist/index.mjs"))) ||
      built.noticesSha256 !==
        digest(fs.readFileSync(path.join(packageRoot, "dist/THIRD-PARTY-NOTICES.txt")))
    )
      throw new Error("Metadata MCP stdio build is stale or modified; rebuild before packaging.");
    for (const [name, file] of [
      ["index.mjs", "index.mjs"],
      ["THIRD-PARTY-NOTICES.txt", "THIRD-PARTY-NOTICES.txt"],
      ["BUILD-MANIFEST.json", "BUILD-MANIFEST-stdio.json"],
    ]) {
      const source = path.join(root, "packages/skill-metadata-mcp/dist", file);
      if (
        !fs.existsSync(source) ||
        !fs.lstatSync(source).isFile() ||
        fs.lstatSync(source).isSymbolicLink()
      )
        throw new Error("Build the metadata MCP stdio bundle before desktop packaging.");
      files.push({ path: `server/dist/${name}`, content: fs.readFileSync(source) });
    }
  }
  return files;
}
