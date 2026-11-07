# Local inference selection and qualification

Primary documentation checked: 2026-10-28; WSL storage source: 2026-10-29.
Documentation is not evidence that a particular machine or backend works. Record
the observed variant and failures in the private operations report, never machine
identifiers in this public skill.

## Inspect before selecting

1. Confirm execution environment, actual Git roots and Linux-native tools. Keep
   source work on its existing filesystem; never move repositories automatically.
2. Read Windows build, WSL version/distribution/network mode, CPU/RAM/disk limits,
   current free memory, GPU/VRAM and driver. Use explicit Windows executables only
   for Windows inventory. A sandbox can hide `/dev/dxg`; distinguish sandbox
   visibility from an authorized native WSL check. WMI `AdapterRAM` can truncate
   modern VRAM values: use the vendor's observed memory report.
   On WSL, measure both Linux filesystem free space and free space on the Windows
   volume holding the registered distribution's VHD. Identify that volume through
   read-only Windows inventory rather than assuming a drive letter. Linux reports
   logical VHD capacity, which can exceed available host storage. Budget for model
   weights, vector/symbol indices and temporary indexing files at their actual
   storage locations.
   Recheck the host reserve during a long initial build and its restart. Raising
   the logical VHD maximum does not create physical host capacity. Treat VHD
   compaction as separate maintenance: [Microsoft requires a detached or read-only
   disk](https://learn.microsoft.com/powershell/module/hyper-v/optimize-vhd), which
   excludes compacting the active writable distribution.
3. Inspect each existing Ollama installation's owner, executable, package channel,
   listener, service process, model digests and `/api/ps`. Do not install a second
   server merely because one backend is misconfigured. Inspect Nix package output
   and the actual service environment before changing a Nix-managed installation.

## Select the local variant

| Observed condition                                               | Action                                                                   |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Suitable local server already reachable from grepai              | Adopt and measure it.                                                    |
| WSL workflow and supported GPU accessible in that distribution   | Qualify that server's GPU build/runtime.                                 |
| Windows-native backend is more practical for the actual hardware | Qualify Windows Ollama and WSL reachability; keep source tooling in WSL. |
| GPU absent or unusable                                           | Measure a local CPU pilot before considering remote inference.           |

For NVIDIA WSL, use the Windows host driver; do not install a Linux NVIDIA
display driver. A full CUDA development toolkit is not an automatic requirement
for running a prebuilt backend. Driver visibility, an installed CUDA runtime,
and measured model offload are separate evidence. Nix can install a CPU-only
Ollama package even when the GPU is supported. A one-command loader-path fix for
`nvidia-smi` diagnoses tool loading; it does not prove the server uses CUDA.

Check current backend documentation for the specific build. Current Ollama lists
Vulkan as an additional backend, enabled by default when installed; do not repeat
outdated generic instructions calling every Vulkan path experimental. Native
Linux/Windows compatibility does not prove WSL support for AMD or Intel.

## Network and server policy

Keep the existing WSL network mode. Same-distribution service uses IPv4 loopback.
Mirrored WSL networking documents access to Windows services through IPv4
loopback on supported Windows 11 versions. Default NAT needs the actual Windows
host address, a suitable listener and narrowly scoped firewall rules. A changed
URL alone does not make a loopback-only server reachable. Never default to
`0.0.0.0`, wildcard origins or global firewall changes. This adapter currently
accepts loopback endpoints; a NAT deployment needs a reviewed adapter or local
forwarding plan before applying its configuration. No global WSL shutdown while
other work is running.

Set `OLLAMA_NO_CLOUD=1` in the real server's service/app configuration, then
restart only the adopted service and verify its actual process environment and
cloud-disabled startup evidence. A WSL shell export does not configure a Windows
app or an already running service. Model-weight downloads are permitted only by
the setup authorization; disabling cloud inference does not disable downloads.

## Model pilot and migration

Start with `bge-m3`: documented 1024 dimensions, multilingual, MIT license and no
required query instruction. Its approximately 1.2 GB download is not a runtime
memory requirement. Inspect the actual tag/digest and returned finite vectors.
grepai 1.1.0 workspace creation defaults Ollama dimensions to 768 regardless of
the selected model; supply the explicit configuration and inspect the resulting
global workspace. Use the server base URL, not `/v1` or `/api/embed`.

If a measured weakness justifies comparison, `qwen3-embedding:0.6b` is a local
1024-dimensional, Apache-2.0 candidate. Check how the actual adapter handles its
recommended query instruction. A smaller download alone proves no speed or
memory advantage. Never mix changed model vectors in an existing collection.
Keep the old collection and exact configuration backup until the new pilot and
rollback procedure have been checked. The workspace helper refuses an implicit
provider/store change; record and review a concrete migration before applying it.

Define about ten queries with known repository/file/line targets before the
quality comparison. Measure top-5 hit rate without replacing missed targets
after seeing results. Open returned source lines. Record cold load separately
from repeated warm calls, a realistic batch, wall/server durations, actual loaded
model CPU/GPU memory, process memory and indexing duration. HTTP 200 or `ps`
alone does not qualify the target workflow. State contention and measurement
limits rather than calling a noisy benchmark a hardware comparison.

Remote embeddings are a last resort after a documented impractical local
attempt. A slower CPU or one failed GPU probe alone is insufficient. Never
provision remote service in anticipation. Additional costs, accounts or private
code transfer need their own authority. No OpenAI Platform API, key or indirect
proxy when the adopted policy excludes them. Codex's supported existing ChatGPT
login for agent work is a separate path; never extract its OAuth tokens.

## Primary sources

- [Ollama hardware](https://docs.ollama.com/gpu), [Windows](https://docs.ollama.com/windows), [FAQ](https://docs.ollama.com/faq), [Embed API](https://docs.ollama.com/api/embed).
- [NVIDIA CUDA on WSL](https://docs.nvidia.com/cuda/wsl-user-guide/index.html), [Microsoft WSL networking](https://learn.microsoft.com/en-us/windows/wsl/networking).
- [Microsoft WSL virtual disk space](https://learn.microsoft.com/en-us/windows/wsl/disk-space) (checked 2026-10-29).
- [BGE-M3 model card](https://huggingface.co/BAAI/bge-m3), [Ollama BGE-M3](https://ollama.com/library/bge-m3).
- [Qwen3 embedding model card](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B), [Ollama Qwen3 embedding](https://ollama.com/library/qwen3-embedding).
- [grepai v1.1.0 workspace implementation](https://github.com/yoanbernabeu/grepai/blob/v1.1.0/cli/workspace.go).

A Linux/NixOS WSL pilot confirmed that replacing an existing CPU-only Ollama
package with its CUDA variant can enable actual NVIDIA inference through the
Windows driver. With the inspected Nixpkgs package, `cudaArches` accepts a CMake
architecture such as `sm_89` (normalized to `89`), not the dotted compute-capability
string `8.9`. Inspect the pinned package source before specializing a build.
Narrow unfree-package policy changes to required CUDA components; do not enable
all unfree packages or add a Linux display driver. The inspected systemd module
already allowed the WSL GPU device. No global loader-path override was needed.

Actual BGE-M3 calls confirmed 1024 finite dimensions and GPU offload, with a
longer cold load but shorter warm/batch calls than the same model's CPU run on
that host. This does not predict another machine's speed. A separate live fixture
confirmed source change/rename/delete and repository add/remove behavior.
Retrieval quality and full-corpus readiness remain separate acceptance gates.
Keep machine measurements and final acceptance in the private operations report. Native Windows inference and a complete
Windows reboot remain separate, untested variants unless actually observed.

## Executable local probe

`python3 scripts/inference.py inventory --config /absolute/private/workspace.json`
reads the selected server, exact model tag/digest and loaded-model memory.
`benchmark --config ... --samples /absolute/private/texts.json` previews a bounded
measurement without network access; `--apply` makes one initial, five warm and
one batch embedding request. The samples file is a JSON array of one to 64
representative texts. The probe retains only input hashes/counts, not vectors or
source text. It loads the selected model for fifteen minutes, downloads nothing,
and has no remote fallback. Pause the owned index workload first for a meaningful
cold/CPU measurement; an already loaded model is never mislabeled as cold.
Optional `inferenceService` names the systemd system service for observed cgroup
memory; it does not control or restart that service.

## Explicit collection migration

Save the exact previous adopted config. Pin a verified local model tag with the
installed `ollama cp` command and record `embeddingModelDigest` in the new config.
Set a distinct target Qdrant collection on the same local server, retaining the
workspace/registry/state ownership. Preview `workspace.py setup --config NEW
--migrate-from OLD`; only then apply the same command with `--apply` while the
owned timers are paused. The helper refuses a stale baseline, a reused vector
collection, or an unknown nonempty target. It preserves the old collection and
backs up the workspace and registry. A completed migration rerun is idempotent.
For rollback, stop owned writers and restore the exact saved configuration,
registry and matching global `index-meta/<workspace>/` files. Restore only the
owned entry from the global workspace backup, preserving other workspaces.
Distinguish the actively qualified pilot configuration from an older production
configuration saved in the same backup directory; record their roles explicitly.
Resolve current skill/script paths and the production config argument before
restarting timers. Do not call the migration helper against a nonempty old
collection or delete either collection automatically.

## Confirmed adapter and fresh-process observations

The inspected grepai 1.1.0 Ollama adapter sends plain query text to
`/api/embeddings` and document batches to `/api/embed`; it has no query-prefix
configuration. For Qwen, compare plain queries with explicitly instructed
queries on the same fixed corpus. Do not claim that the model-card instruction
is automatic, and do not add an embedding proxy merely to reproduce a benchmark
that already passes with the existing adapter. Preserve the measured misses.

A local Qwen comparison completed the same three-root pilot with all stored file
hashes matching source. Plain and explicitly instructed queries had identical
hit/rank outcomes in that pilot; the measured local model was selected without a
query adapter. These observations do not imply universal model superiority.
Use the exact local quality and resource evidence for each setup.

For a new WSL development process, initialize the distribution's normal login
profile (for example an explicit Linux `bash -lc` through `wsl.exe`). Direct
`wsl --exec` of an absolute Python executable does not necessarily initialize
Nix-managed user tool paths. A failed child-tool lookup in that environment is
not evidence that the package is absent. Verify Linux tool resolution, a real
embedding and search after restarting only the adopted server. A qualified
already-running WSL process does not prove Windows boot/login autostart.

## Query instructions after corpus expansion

A query format that ties in a small pilot can rank differently after admitting
many more repositories. Repeat the same predeclared cases against the full
corpus without changing targets or hiding misses; report the two corpus scopes
separately. Check target hashes and returned source lines in both runs. A local
qualification observed this difference for Qwen3, so a pilot-only tie does not
justify a universal recommendation to omit its documented query instruction.

When the actual Qwen3 comparison selects this instruction, pass it as literal
query text in both CLI and MCP calls:

```text
Instruct: Given a software development question, retrieve relevant code implementations that answer the question.
Query: <the unchanged development question>
```

The qualified grepai adapter does not inject this text automatically. Store the
chosen format in the private operating instructions and use the supported
`doctorQuery` field for that probe. Do not invent an embedder configuration key,
claim automatic MCP rewriting, or change indexed document text to add a query
instruction. A query-only format change does not require a model or vector-space
migration. Source-correct results do not by themselves prove retrieval quality.
