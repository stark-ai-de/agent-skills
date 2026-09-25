import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";
const output = process.env.QUALIFICATION_RUNTIME_DIR;
if (output)
  process.once("exit", () => {
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(
      path.join(output, `harness-${process.pid}.json`),
      JSON.stringify({
        role: "harness",
        versions: process.versions,
        executable: path.basename(process.execPath),
        maxRssKiB: process.resourceUsage().maxRSS,
      }),
    );
  });
export default defineConfig({
  plugins: [
    {
      name: "qualification-plugin-input",
      configureVitest({ experimental_defineCacheKeyGenerator, project, vitest }) {
        if (output && project.name) {
          fs.mkdirSync(output, { recursive: true });
          fs.writeFileSync(
            path.join(output, `config-${project.name}.json`),
            JSON.stringify({
              role: "configuration",
              project: project.name,
              pool: project.config.pool,
              isolate: project.config.isolate,
              retry: project.config.retry,
              environment: project.config.environment,
              maxWorkers: project.globalConfig.maxWorkers,
              setupFiles: project.config.setupFiles.map((p) => path.basename(p)),
            }),
          );
        }
        // Vitest 4.1.11 maps add/change, but not unlink, through watchTriggerPatterns.
        // Keep collection/execution in Vitest; bridge only the missing input event.
        if (project.name === "contracts" && vitest.config.watch) {
          let pending = Promise.resolve();
          const onUnlink = (file: string) => {
            if (!/(?:^|\/)(?:inputs|schemas)\//.test(file)) return;
            pending = pending
              .then(async () => {
                await vitest.waitForTestRunEnd();
                const specs = vitest.getModuleSpecifications(
                  path.resolve("tests/contracts/inputs.test.ts"),
                );
                if (!specs.length) throw new Error("missing filesystem-input test owner");
                await vitest.rerunTestSpecifications(specs, false);
              })
              .catch((error) => {
                console.error(error);
                process.exitCode = 1;
              });
          };
          vitest.vite.watcher.on("unlink", onUnlink);
          vitest.onClose(() => {
            vitest.vite.watcher.off("unlink", onUnlink);
          });
        }
        experimental_defineCacheKeyGenerator(({ id }) =>
          id.endsWith("/src/plugin-value.ts")
            ? fs.readFileSync("plugin-input.json", "utf8")
            : undefined,
        );
      },
      transform(_code, id) {
        if (id.endsWith("/src/plugin-value.ts"))
          return {
            code: `export const pluginValue = ${JSON.parse(fs.readFileSync("plugin-input.json", "utf8")).value};`,
            map: null,
          };
      },
    },
  ],
  test: {
    allowOnly: false,
    passWithNoTests: false,
    retry: 0,
    environment: "node",
    pool: "forks",
    isolate: true,
    maxWorkers: 1,
    testTimeout: 5000,
    hookTimeout: 5000,
    setupFiles: ["./setup.ts"],
    experimental: {
      fsModuleCache: process.env.TEST_TRANSFORM_CACHE === "on",
      fsModuleCachePath: process.env.VITEST_FS_MODULE_CACHE_PATH ?? ".cache/transforms",
      viteModuleRunner: process.env.QUALIFICATION_NATIVE !== "on",
    },
    watchTriggerPatterns: [
      {
        pattern: /(?:^|\/)(?:inputs|schemas)\//,
        testsToRun: () => ["tests/contracts/inputs.test.ts"],
      },
    ],
    projects: [
      { extends: true, test: { name: "contracts", include: ["tests/contracts/**/*.test.ts"] } },
      { extends: true, test: { name: "monorepo", include: ["packages/*/tests/*.test.ts"] } },
      { extends: true, test: { name: "runtime", include: ["tests/runtime/*.test.ts"] } },
      { extends: true, test: { name: "fallback", include: ["tests/fallback/*.test.ts"] } },
      { extends: true, test: { name: "cache", include: ["tests/cache/*.test.ts"] } },
    ],
  },
});
