# Manual setup without sharing keys

Use this route when the user wants instructions or cannot provide administrative access. The agent does not read credentials, call the target API, install anything or edit configuration. Adapt commands to the user's shell; all steps below are performed by the user. A missing management permission requires the operator, not a different UI.

## Discover a model

1. Open your Hetzner account's Inference section and create a token. Keep it in your password manager or an owner-only local file.
2. Run this Python snippet yourself. It asks privately for the token, lists current model IDs and prints no credential:

```python
import getpass, json, urllib.request
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.error.HTTPError(req.full_url, code, "Redirect refused", headers, fp)
opener = urllib.request.build_opener(NoRedirect)
request = urllib.request.Request(
    "https://inference.hetzner.com/api/v1/models",
    headers={"Authorization": "Bearer " + getpass.getpass("Hetzner token: ")},
)
with opener.open(request, timeout=20) as response:
    for model in json.load(response)["data"]:
        print(model["id"])
```

3. Choose an exact returned model ID. An unavailable or unauthenticated list leaves the model unverified; do not substitute a copied catalog.

## Local proxy

1. In a machine-local directory outside a repository, run `python3 -m venv hetzner-venv` (Windows: `py -3 -m venv hetzner-venv`).
2. Run `./hetzner-venv/bin/python -m pip install "litellm[proxy]==1.101.0" "fastapi==0.136.3" "starlette==1.3.1"`. Windows uses `.\hetzner-venv\Scripts\python.exe`.
   The FastAPI/Starlette pair follows the [official LiteLLM 1.101.0 lockfile](https://github.com/BerriAI/litellm/blob/v1.101.0/uv.lock); an unbounded newer FastAPI removes an import this proxy needs. Run `./hetzner-venv/bin/python -m pip check` after installation (use the Windows Python path there).

3. Save the following as `hetzner-litellm.yaml`, replacing only `<MODEL_ID>`:

```yaml
model_list:
  - model_name: hetzner-default
    litellm_params:
      model: openai/<MODEL_ID>
      api_base: https://inference.hetzner.com/api/v1
      api_key: os.environ/HETZNER_INFERENCE_API_KEY
      use_chat_completions_api: true
      additional_drop_params: ["reasoning_effort"]
general_settings:
  master_key: os.environ/LITELLM_MASTER_KEY
litellm_settings:
  use_chat_completions_url_for_anthropic_messages: true
  drop_params: false
  set_verbose: false
  turn_off_message_logging: true
  redact_messages_in_exceptions: true
```

### Start with private input

4. Save this snippet as `start-hetzner.py`. Run `./hetzner-venv/bin/python start-hetzner.py` (Windows: `.\hetzner-venv\Scripts\python.exe start-hetzner.py`). Enter the Hetzner token and a separate strong `sk-`-prefixed local gateway key when prompted. Save the gateway key in your password manager; local clients need that key, not the Hetzner token.

```python
import getpass, os, pathlib, subprocess, sys
proxy = pathlib.Path(sys.executable).with_name("litellm.exe" if os.name == "nt" else "litellm")
env = dict(os.environ)
env["HETZNER_INFERENCE_API_KEY"] = getpass.getpass("Hetzner token: ")
env["LITELLM_MASTER_KEY"] = getpass.getpass("Separate local gateway key (sk-...): ")
subprocess.run(
    [str(proxy), "--config", "hetzner-litellm.yaml", "--host", "127.0.0.1", "--port", "4000"],
    env=env, check=True,
)
```

The keys are supplied to the child process, never command arguments or saved YAML. Keep the terminal open. If port 4000 is occupied, identify its owner; do not kill an unknown listener. Stop this foreground proxy with Ctrl+C.

5. In a second terminal, request `http://127.0.0.1:4000/v1/models` with the local gateway key and then send a Chat Completions request for `hetzner-default`. A returned response proves transport only. Use the selected client reference for Responses, Messages or Cursor compatibility.

## Existing remote gateway

1. Open the instance's Admin UI and sign in yourself. Identify its management URL separately from the inference API base, including any path prefix.
2. Open **Models + Endpoints → All Models**. Inspect existing aliases and their database/config ownership. Do not create a duplicate alias or replace another provider accidentally.
3. For database-backed management, open **Add Model** and on LiteLLM 1.97.0 select **OpenAI-Compatible Endpoints (Together AI, etc.)**. Other versions may label this OpenAI-compatible/custom. Enter model `openai/<MODEL_ID>`, public name `hetzner-default`, and API base `https://inference.hetzner.com/api/v1`.
4. Enter the Hetzner token yourself or select an existing remote credential. An `os.environ/HETZNER_INFERENCE_API_KEY` reference works only when the remote proxy process has that variable; your laptop's environment does not provision it.
5. On LiteLLM 1.97.0, open **Advanced Settings → LiteLLM Params** and enter `{"use_chat_completions_api": true, "additional_drop_params": ["reasoning_effort"]}` for Codex Responses bridging. Read the setting back after saving. If this UI cannot express it, use the API/config path below. Use **Test Connect**, save with **Add Model**, and read back the Model ID and non-secret configuration under **All Models**. Exact labels and fields vary by version; check the deployed UI. If it cannot represent the custom provider, use the supported management API or the operator's configuration path.
6. Test the alias in **Playground** or through the inference API using a separate permitted inference key. Never put the remote administrator key in a coding client.

A connected database and enabled model storage are prerequisites for API/UI-managed routes. For a config-owned route, give the operator the `model_list` entry above and a remote secret reference. The operator applies the patch through the owning deployment process and reloads it. This skill does not edit Kubernetes resources or migrate the database.

[Official model management](https://docs.litellm.ai/docs/proxy/model_management) and [Admin UI quickstart](https://docs.litellm.ai/docs/proxy/docker_quick_start) describe the supported ownership and UI paths. Instructions are not evidence that the user completed them.

## Verify inference

Save this as `check-hetzner.py` and run it with Python in a second terminal. Use `http://127.0.0.1:4000/v1` locally, or the remote instance's inference base (including its path prefix). Enter only the separate inference/gateway key at the private prompt.

```python
import getpass, json, urllib.request, urllib.parse
base = input("Inference base URL: ").rstrip("/")
url = urllib.parse.urlsplit(base)
if (url.username or url.password or url.query or url.fragment or not url.hostname
    or (url.scheme != "https" and not (url.scheme == "http" and url.hostname in ("127.0.0.1", "localhost", "::1")))):
    raise SystemExit("Use HTTPS, or loopback HTTP, without credentials, query or fragment.")
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.error.HTTPError(req.full_url, code, "Redirect refused", headers, fp)
opener = urllib.request.build_opener(NoRedirect)
alias = input("Model alias [hetzner-default]: ") or "hetzner-default"
key = getpass.getpass("Inference/gateway key: ")
headers = {"Authorization": "Bearer " + key, "Content-Type": "application/json"}
try:
    with opener.open(urllib.request.Request(base + "/models", headers=headers), timeout=30) as response:
        models = json.load(response)["data"]
        print("Alias listed:", any(model["id"] == alias for model in models))
    payload = json.dumps({"model": alias, "messages": [{"role": "user", "content": "Reply with OK."}], "max_tokens": 1024}).encode()
    with opener.open(urllib.request.Request(base + "/chat/completions", data=payload, headers=headers), timeout=60) as response:
        choice = json.load(response)["choices"][0]
        print("Nonempty reply:", bool(choice["message"].get("content")))
        print("Finish reason:", choice.get("finish_reason"))
except Exception as error:
    print("Check failed:", type(error).__name__, getattr(error, "code", "transport or response error"))
```

Expected: `Alias listed: True`, `Nonempty reply: True`, and a normal stop reason. A length limit with no text is inconclusive; a 401/403 means this inference credential lacks access. Do not paste raw error responses or credentials into chat. This proves only model visibility and chat transport; check selected client protocols separately.
