import path from "node:path";
import fs from "node:fs";
import { copyRuntimeArtifact } from "../lib/ssh-runtime-artifact.mjs";
const output = path.resolve("dist/ssh-runtime");
fs.rmSync(output, { recursive: true, force: true });
copyRuntimeArtifact({ root: process.cwd(), output });
console.log("Verified and materialized the pinned standalone SSH runtime artifact.");
