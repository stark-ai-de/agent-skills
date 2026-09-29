import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertCurrentWslOwnedNamespace,
  assertCurrentWslPath,
  readProtectedGatewaySecret,
} from "./protected-file.mjs";

const CONFIG_ROOT = "__CONFIG_ROOT__";
const STATE_ROOT = "__STATE_ROOT__";

function within(target, boundary) {
  const relative = path.relative(path.resolve(boundary), path.resolve(target));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function runCredentialHelper(argv = process.argv.slice(2), dependencies = {}) {
  if (argv.length !== 0) throw new Error("credential helper accepts no arguments");
  const target =
    dependencies.target ??
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      "secrets",
      "litellm-master-key",
    );
  const configRoot = dependencies.configRoot ?? CONFIG_ROOT;
  const stateRoot = dependencies.stateRoot ?? STATE_ROOT;
  if (![configRoot, stateRoot, target].every((value) => path.isAbsolute(value))) {
    throw new Error("credential helper has no absolute owned-root binding");
  }
  if (!within(target, configRoot)) {
    throw new Error("gateway credential escapes the bound configuration root");
  }
  const boundaryOptions = dependencies.wslBoundaryOptions ?? {};
  const assertOwnedNamespace =
    dependencies.assertCurrentWslOwnedNamespace ?? assertCurrentWslOwnedNamespace;
  const assertPath = dependencies.assertCurrentWslPath ?? assertCurrentWslPath;
  const assertBoundaries = () => {
    assertOwnedNamespace(configRoot, "configuration namespace", boundaryOptions);
    assertOwnedNamespace(stateRoot, "state namespace", boundaryOptions);
    assertPath(target, "gateway credential", boundaryOptions);
  };
  dependencies.beforeCredentialBoundary?.({ configRoot, stateRoot, target });
  assertBoundaries();
  return (dependencies.readProtectedGatewaySecret ?? readProtectedGatewaySecret)(
    target,
    "gateway credential",
    { wslBoundaryOptions: boundaryOptions },
  );
}

const executedDirectly =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (executedDirectly) {
  try {
    process.stdout.write(`${runCredentialHelper()}\n`);
  } catch (error) {
    process.stderr.write(`credential helper failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
