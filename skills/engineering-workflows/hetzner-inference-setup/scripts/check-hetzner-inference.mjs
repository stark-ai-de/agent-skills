import { main } from "./lib/cli.mjs";

await main(["check", ...process.argv.slice(2)]);
