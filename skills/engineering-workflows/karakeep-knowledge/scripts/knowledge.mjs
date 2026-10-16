#!/usr/bin/env node
import { parseArgs } from "node:util";
import { KnowledgeError } from "./knowledge/state.mjs";
import { check, inspect, plan, apply, status, resume } from "./knowledge/reconcile.mjs";

const help =
  "Karakeep knowledge: check --repo ROOT [--config FILE]; inspect --policy FILE [--repo ROOT] --out FILE [--offline]; plan --policy FILE --inspection FILE --intent FILE --out FILE; apply --policy FILE --plan FILE --expect-plan SHA256; status --policy FILE [--online]; resume --policy FILE --operation ID [--recover-lock]. JSON stdout; diagnostics are redacted. No service or scheduler is started.";
try {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 24 || (major === 24 && minor < 18))
    throw new KnowledgeError("runtime", "Node.js 24.18 or newer is required.");
  const parsed = parseArgs({
    allowPositionals: true,
    strict: true,
    options: {
      repo: { type: "string" },
      config: { type: "string" },
      policy: { type: "string" },
      out: { type: "string" },
      inspection: { type: "string" },
      intent: { type: "string" },
      plan: { type: "string" },
      "expect-plan": { type: "string" },
      operation: { type: "string" },
      offline: { type: "boolean" },
      online: { type: "boolean" },
      "recover-lock": { type: "boolean" },
      help: { type: "boolean" },
    },
  });
  if (parsed.values.help) {
    process.stdout.write(help + "\n");
  } else {
    const command = parsed.positionals[0],
      routes = { check, inspect, plan, apply, status, resume };
    if (parsed.positionals.length !== 1 || !routes[command])
      throw new KnowledgeError("arguments", help);
    const accepted = {
      check: ["repo", "config"],
      inspect: ["repo", "policy", "out", "offline"],
      plan: ["policy", "inspection", "intent", "out"],
      apply: ["policy", "plan", "expect-plan"],
      status: ["policy", "online"],
      resume: ["policy", "operation", "recover-lock"],
    };
    if (Object.keys(parsed.values).some((k) => !accepted[command].includes(k)))
      throw new KnowledgeError("arguments", "Option is not supported by this command.");
    const required = {
      check: ["repo"],
      inspect: ["policy", "out"],
      plan: ["policy", "inspection", "intent", "out"],
      apply: ["policy", "plan", "expect-plan"],
      status: ["policy"],
      resume: ["policy", "operation"],
    };
    if (required[command].some((k) => !parsed.values[k]))
      throw new KnowledgeError("arguments", "A required command argument is missing.");
    const args = {
      ...parsed.values,
      expectPlan: parsed.values["expect-plan"],
      recoverLock: parsed.values["recover-lock"],
    };
    const result = await routes[command](args);
    process.stdout.write(JSON.stringify(result) + "\n");
    if (["pending", "uncertain", "conflict", "unreachable"].includes(result.status))
      process.exitCode = 2;
  }
} catch (error) {
  const known = error instanceof KnowledgeError;
  process.stderr.write(
    JSON.stringify({
      status: "failed",
      code: known ? error.code : "internal",
      message: known
        ? error.message
        : "Operation failed; inspect private local inputs and runtime availability.",
    }) + "\n",
  );
  process.exitCode = 1;
}
