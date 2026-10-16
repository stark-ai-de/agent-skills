import fs from "node:fs";
import path from "node:path";
import { ARTIFACT_PATH, validateRuntimeArtifact } from "../lib/ssh-runtime-artifact.mjs";

const [input, pinFile] = process.argv.slice(2);
if (!input || !pinFile)
  throw new Error(
    "Usage: node scripts/ssh/import-artifact.mjs <runtime-directory> <reviewed-pin.json>",
  );
const pin = JSON.parse(fs.readFileSync(pinFile));
const verified = validateRuntimeArtifact(path.resolve(input), pin);
const root = process.cwd();
const destination = path.join(root, ARTIFACT_PATH);
const sourcePath = path.join(root, "plugins/stark-ai-developer.source.json");
const source = JSON.parse(fs.readFileSync(sourcePath));
const entry = source.mcp?.find((item) => item.name === "ssh-management");
if (!entry) throw new Error("Canonical SSH membership is missing.");
let ancestor = root;
for (const component of ARTIFACT_PATH.split("/")) {
  ancestor = path.join(ancestor, component);
  if (fs.existsSync(ancestor) && !fs.lstatSync(ancestor).isDirectory())
    throw new Error("Artifact destination ancestors must be regular directories.");
}
// Validate all bytes before modifying the consumer's existing artifact.
fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(destination, { recursive: true });
for (const [relative, bytes] of verified.files) {
  const file = path.join(destination, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);
}
entry.source = ARTIFACT_PATH;
entry.artifact = pin;
fs.writeFileSync(sourcePath, JSON.stringify(source, null, 2) + "\n");
console.log(`Imported reviewed runtime ${pin.version} from ${pin.sourceCommit}.`);
