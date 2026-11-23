import process from "node:process";
import {
  buildAdsPluginEntries,
  parseAdsPluginArgs,
  validateAdsPluginArchive,
  validateAdsPluginSource,
} from "./package-ads-plugin.mjs";

try {
  const args = parseAdsPluginArgs(process.argv.slice(2), { validation: true });
  if (args.help) {
    console.log(
      "Usage: node scripts/plugin/validate-ads-plugin.mjs [--root PATH] [--server-url HTTPS_MCP_URL] [--oauth-client-id ID] [--archive PATH.zip]\nWithout a server URL, validates source and canonical skill metadata offline. With a URL, validates a deployment-specific package; --archive also checks its bytes. Does not verify the remote service or publication.",
    );
  } else {
    let result;
    if (args.archive) result = validateAdsPluginArchive(args);
    else if (args.serverUrl) {
      buildAdsPluginEntries(args);
      result = { errors: [] };
    } else {
      if (args.oauthClientId) throw new Error("--oauth-client-id requires --server-url");
      result = validateAdsPluginSource(args.root);
    }
    if (result.errors.length) throw new Error(result.errors.join("\n"));
    console.log(
      args.archive
        ? "Ads plugin archive matches canonical inputs and deployment configuration."
        : args.serverUrl
          ? "Ads plugin package configuration is valid; remote deployment remains unverified."
          : "Independent Ads plugin source and canonical metadata are valid; no deployment was checked.",
    );
  }
} catch (error) {
  console.error(`Ads plugin validation failed: ${error.message}`);
  process.exitCode = 1;
}
