import { LITELLM_PIN, LITELLM_RUNTIME_DEPENDENCIES, PROVIDER_BASE_URL } from "./constants.mjs";

function reject(message) {
  const error = new Error(message);
  error.code = "invalid_manual_options";
  throw error;
}

function identifier(value, fallback) {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._/:+-]{0,199}$/.test(value)) {
    reject("Model and alias must be plain identifiers; do not supply credentials.");
  }
  return value;
}

function endpoint(value, fallback) {
  if (value === undefined) return fallback;
  let url;
  try {
    url = new URL(value);
  } catch {
    reject("Provide an absolute gateway URL without credentials or query parameters.");
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" &&
      !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))
  )
    reject("Use HTTPS, or loopback HTTP, without credentials or query parameters.");
  return url.href.replace(/\/$/, "");
}

/** Pure guidance: deliberately no filesystem, credential environment, subprocess or HTTP access. */
export function manualCommand(command = "setup", options = {}) {
  const allowed = new Set([
    "target",
    "mode",
    "platform",
    "model",
    "alias",
    "management-url",
    "inference-url",
    "clients",
  ]);
  if (Object.keys(options).some((key) => !allowed.has(key))) {
    reject(
      "Manual mode accepts only target, platform, model, alias, URLs and clients; omit credential and mutation options.",
    );
  }
  if (!["setup", "plan", "help", "diagnose", "check", "status"].includes(command)) {
    reject(
      "Manual mode supplies setup and verification instructions; it does not execute lifecycle or mutation commands.",
    );
  }
  const target = options.target ?? "local";
  if (!["local", "remote"].includes(target)) reject("Select local or remote.");
  const platform = options.platform ?? process.platform;
  if (!["linux", "wsl", "darwin", "win32"].includes(platform))
    reject("Select linux, wsl, darwin or win32.");
  const alias = identifier(options.alias, "hetzner-default");
  const model = identifier(options.model, "<MODEL_ID_FROM_HETZNER_MODELS>");
  const managementUrl = endpoint(options["management-url"], "<LITELLM_MANAGEMENT_URL>");
  const inferenceUrl = endpoint(
    options["inference-url"],
    target === "local" ? "http://127.0.0.1:4000/v1" : "<LITELLM_INFERENCE_URL>",
  );
  const clients = options.clients ? options.clients.split(",") : [];
  if (clients.some((client) => !["codex", "claude-code", "cursor"].includes(client)))
    reject("Select codex, claude-code or cursor.");
  const modelConfig = {
    model_name: alias,
    litellm_params: {
      model: `openai/${model}`,
      api_base: PROVIDER_BASE_URL,
      api_key: "os.environ/HETZNER_INFERENCE_API_KEY",
      use_chat_completions_api: true,
      additional_drop_params: ["reasoning_effort"],
    },
  };
  const python =
    platform === "win32" ? ".\\hetzner-venv\\Scripts\\python.exe" : "./hetzner-venv/bin/python";
  const common = [
    {
      instruction:
        "Create a Hetzner Inference token in your account and keep it private. Use the provider's model-list endpoint to choose a current model; never substitute a historical model name.",
      expected: "A current model ID, selected by you.",
      reference: "references/manual-setup.md#discover-a-model",
    },
  ];
  const local = [
    {
      instruction:
        "Create an isolated Python environment in a machine-local directory outside your repository.",
      command: `${platform === "win32" ? "py -3" : "python3"} -m venv hetzner-venv`,
      expected: "A dedicated hetzner-venv directory.",
    },
    {
      instruction: "Install the reviewed proxy version in that environment.",
      command: `${python} -m pip install "litellm[proxy]==${LITELLM_PIN}" ${LITELLM_RUNTIME_DEPENDENCIES.map((requirement) => JSON.stringify(requirement)).join(" ")}`,
      expected: `LiteLLM ${LITELLM_PIN} installed in the dedicated environment.`,
    },
    {
      instruction:
        "Save the supplied configuration as hetzner-litellm.yaml and replace the model placeholder. It contains secret references, never secret values.",
      expected: "A configuration file containing your selected model and the stable alias.",
    },
    {
      instruction:
        "Save the private-input snippet from the manual guide as start-hetzner.py; run it to enter the provider token and a separate sk-prefixed gateway key. Run the proxy in the foreground with secrets restricted to its child environment.",
      command: `${python} start-hetzner.py`,
      expected: "An authenticated listener on 127.0.0.1:4000. Keep this terminal open.",
      reference: "references/manual-setup.md#start-with-private-input",
    },
    {
      instruction: `Using only the gateway key, request ${inferenceUrl}/models and send a short chat request to alias ${alias}. A response proves transport, not tools or a coding client. Stop this foreground process with Ctrl+C.`,
      expected: "Authenticated model listing and a response from the chosen model.",
      reference: "references/manual-setup.md#verify-inference",
    },
  ];
  const remote = [
    {
      instruction: `Open the Admin UI for ${managementUrl} and sign in yourself. Open Models + Endpoints, then All Models. Inspect whether the route is database-managed or config-managed.`,
      expected: "The existing model inventory and its ownership are visible.",
    },
    {
      instruction:
        "For an API/database-managed route, ensure database model storage is enabled. Open Add Model and choose the OpenAI-compatible/custom provider supported by this UI version. If the route is config-managed, use the supplied model_list patch in the owning deployment configuration instead.",
      expected: "An editable database-backed model form, or an identified configuration owner.",
    },
    {
      instruction: `Enter public alias ${alias}, provider model openai/${model}, and API base ${PROVIDER_BASE_URL}. Enter your Hetzner token privately in the UI, or select an existing remote credential. An os.environ reference must exist in the remote proxy process. In Advanced / extra LiteLLM parameters, set use_chat_completions_api to true and additional_drop_params to ["reasoning_effort"]. This enables Responses bridging and removes the unsupported OpenAI reasoning-effort hint without discarding tools.`,
      expected:
        "Provider access is configured on the remote instance; no secret is shared with the agent.",
    },
    {
      instruction:
        "Use Test Connect, then Add Model. Read back the Model ID, use_chat_completions_api: true and non-secret routing values in All Models. UI labels vary; if the installed UI cannot express these fields, use the documented API/config path instead of guessing.",
      expected: "The chosen alias and provider base match the saved model.",
    },
    {
      instruction: `With a separate inference key, test alias ${alias} at ${inferenceUrl} or in Playground. A missing management permission is not solved by using the UI.`,
      expected:
        "A real inference response; configuration and transport evidence are reported separately.",
    },
  ];
  return {
    schemaVersion: 1,
    kind: "hetzner-manual-guide",
    mode: "manual",
    target,
    offline: true,
    mutating: false,
    credentialsRead: false,
    state: "verification_required",
    platform,
    clients,
    alias,
    model,
    modelConfig,
    config:
      target === "local"
        ? {
            model_list: [modelConfig],
            general_settings: { master_key: "os.environ/LITELLM_MASTER_KEY" },
            litellm_settings: {
              use_chat_completions_url_for_anthropic_messages: true,
              drop_params: false,
              set_verbose: false,
              turn_off_message_logging: true,
              redact_messages_in_exceptions: true,
            },
          }
        : { model_list: [modelConfig] },
    steps: [...common, ...(target === "local" ? local : remote)].map((step, index) => ({
      number: index + 1,
      ...step,
    })),
    clientGuidance: clients.map((client) => ({
      client,
      reference: `references/client-${client}.md`,
      endpoint: inferenceUrl,
      model: alias,
      credential:
        target === "local" ? "local administrative loopback key" : "separate remote inference key",
      state: "verification_required",
    })),
  };
}
