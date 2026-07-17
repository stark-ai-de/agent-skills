import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

import { evaluateAssertion, listArtifacts, parseAssertion } from "../lib/visual-assertions.mjs";

const root = process.cwd();
const skillRoot = path.join(root, "incubator/skills/skill-maintenance/skillopt-setup");
const assetRoot = path.join(skillRoot, "assets/agent-skills-benchmark");

const helperScripts = [
  "apply-skillopt-best.mjs",
  "audit-skillopt-local-artifacts.mjs",
  "check-skillopt-readiness.mjs",
  "codex-local-openai-chat-gateway.mjs",
  "prepare-local-skillopt-adapter.mjs",
  "prepare-skillopt-split.mjs",
  "probe-codex-cli.mjs",
  "probe-openai-compatible-endpoint.mjs",
  "setup-skillopt-local.mjs",
  "summarize-skillopt-run.mjs",
  "verify-skillopt-run-artifacts.mjs",
];

const pythonTemplates = [
  "adapter.py.template",
  "codex_cli_reflector.py.template",
  "dataloader.py.template",
  "evaluator.py.template",
  "rollout.py.template",
];
const minDeterministicCases = 20;

function fail(message) {
  throw new Error(message);
}

function assertFile(file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    fail(`Missing file: ${path.relative(root, file)}`);
  }
}

function run(name, command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 30000,
    ...options,
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.error) {
    fail(`${name}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`${name}: expected exit 0, got ${result.status}\n${output}`);
  }
  return output;
}

function hasPython3() {
  const probe = spawnSync("python3", ["--version"], {
    cwd: root,
    encoding: "utf8",
    timeout: 30000,
  });
  return !probe.error && probe.status === 0;
}

function assertIncludes(name, text, needle) {
  if (!text.includes(needle)) {
    fail(`${name}: expected output/content to include ${JSON.stringify(needle)}`);
  }
}

function assertNotIncludes(name, text, needle) {
  if (text.includes(needle)) {
    fail(`${name}: unexpected content ${JSON.stringify(needle)}`);
  }
}

function assertNotMatches(name, text, pattern, label) {
  if (pattern.test(text)) {
    fail(`${name}: unexpected ${label}`);
  }
}

function writeFile(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
}

function validateHelp() {
  for (const scriptName of helperScripts) {
    const script = path.join(skillRoot, "scripts", scriptName);
    assertFile(script);
    const output = run(`${scriptName} --help`, "node", [script, "--help"]);
    assertIncludes(`${scriptName} --help`, output, "Usage:");
    assertIncludes(`${scriptName} --help`, output, scriptName);
  }
  const readinessScript = fs.readFileSync(
    path.join(skillRoot, "scripts/check-skillopt-readiness.mjs"),
    "utf8",
  );
  assertIncludes("readiness JSON flush", readinessScript, "process.exitCode =");
  assertNotIncludes("readiness JSON flush", readinessScript, "process.exit(result.safe_to_setup");
}

function validatePythonTemplates() {
  const files = pythonTemplates.map((name) => path.join(assetRoot, name));
  for (const file of files) assertFile(file);
  for (const templateName of [
    "rollout.py.template",
    "evaluator.py.template",
    "codex_cli_reflector.py.template",
  ]) {
    const source = fs.readFileSync(path.join(assetRoot, templateName), "utf8");
    assertIncludes(`${templateName} stdin transport`, source, 'command.append("-")');
    assertIncludes(`${templateName} stdin transport`, source, "stdin=subprocess.PIPE");
    assertIncludes(`${templateName} bounded transport`, source, "BoundedProcessIO");
    assertIncludes(`${templateName} bounded transport`, source, "start_bounded_process_io");
    assertIncludes(`${templateName} bounded transport`, source, "redaction_snapshot");
    assertIncludes(`${templateName} bounded transport`, source, "close_stopped_streams");
    assertIncludes(`${templateName} bounded transport`, source, "10 * 1024 * 1024");
    assertIncludes(`${templateName} bounded transport`, source, "64 * 1024");
    assertIncludes(`${templateName} bounded transport`, source, "65_536");
    assertIncludes(`${templateName} stdin transport`, source, '.encode("utf-8", errors="replace")');
    assertIncludes(
      `${templateName} output transport`,
      source,
      '.decode("utf-8", errors="replace")',
    );
    assertIncludes(`${templateName} stdin transport`, source, 'errors="replace"');
    assertIncludes(`${templateName} prompt redaction`, source, "[redacted-prompt]");
    assertIncludes(
      `${templateName} bounded transport`,
      source,
      "[output truncated; retained tail]",
    );
    assertNotIncludes(`${templateName} stdin transport`, source, "stdin=subprocess.DEVNULL");
    assertNotIncludes(`${templateName} stdin transport`, source, "command.append(prompt)");
    assertNotIncludes(`${templateName} bounded transport`, source, "process.communicate(");
    assertNotIncludes(
      `${templateName} stdin transport`,
      source,
      "command.append(self._judge_prompt",
    );
  }

  if (!hasPython3()) {
    console.warn("python3 unavailable; skipping SkillOpt Python template parse check");
    return;
  }

  run("SkillOpt Python template parse", "python3", [
    "-c",
    "import ast, pathlib, sys\nfor p in sys.argv[1:]:\n    ast.parse(pathlib.Path(p).read_text(encoding='utf-8'), filename=p)\n",
    ...files,
  ]);

  run("SkillOpt prompt-fragment redaction regression", "python3", [
    "-c",
    `import runpy, sys
templates = (
    (sys.argv[1], "redact_prompt", "redact_timeout_stream"),
    (sys.argv[2], "_redact_prompt", "_redact_timeout_stream"),
    (sys.argv[3], "_redact_prompt", "_redact_timeout_stream"),
)
prompt = (
    "System header\\n"
    "Task prompt:\\nTASK-CONTENT-71f0e9\\n"
    "Skill body:\\nSKILL-BODY-CONTENT-32ac47\\n"
    "Resource snapshot:\\nRESOURCE-CONTENT-885bd1\\n"
)
harmless = "child diagnostic: renderer unavailable"
for path, redact_name, timeout_name in templates:
    module = runpy.run_path(path)
    redact = module[redact_name]
    redact_timeout = module[timeout_name]
    prefix = prompt[:19]
    chunk = prompt[prompt.index("SKILL-BODY"):prompt.index("SKILL-BODY") + 19]
    mixed = f"safe-prefix:{prefix}:safe-middle:{chunk}:safe-suffix"
    result = redact(mixed, prompt)
    assert prefix not in result and chunk not in result, (path, result)
    assert "safe-prefix:" in result and ":safe-middle:" in result and ":safe-suffix" in result, (path, result)
    assert result.count("[redacted-prompt]") == 2, (path, result)
    assert redact(harmless, prompt) == harmless, (path, redact(harmless, prompt))
    assert redact_timeout("x") == "[redacted-prompt]", path
    assert redact_timeout(b"y") == "[redacted-prompt]", path
    assert redact_timeout("") == "", path
`,
    path.join(assetRoot, "rollout.py.template"),
    path.join(assetRoot, "evaluator.py.template"),
    path.join(assetRoot, "codex_cli_reflector.py.template"),
  ]);

  run("SkillOpt repeated prompt-echo redaction regression", "python3", [
    "-c",
    `import runpy, sys
templates = (
    (
        sys.argv[1],
        "redact_prompt",
        "prompt_echo_spans",
        "PROMPT_ECHO_MAX_UNIQUE_SEEDS",
        "PROMPT_ECHO_MAX_SPANS",
    ),
    (
        sys.argv[2],
        "_redact_prompt",
        "_prompt_echo_spans",
        "_PROMPT_ECHO_MAX_UNIQUE_SEEDS",
        "_PROMPT_ECHO_MAX_SPANS",
    ),
    (
        sys.argv[3],
        "_redact_prompt",
        "_prompt_echo_spans",
        "_PROMPT_ECHO_MAX_UNIQUE_SEEDS",
        "_PROMPT_ECHO_MAX_SPANS",
    ),
)
seed = "REPEAT-SEED-1234"
assert len(seed) == 16, seed
expected = "stderr prefix: [redacted-prompt] failed"
for path, redact_name, spans_name, seed_budget_name, span_budget_name in templates:
    module = runpy.run_path(path)
    redact = module[redact_name]
    spans = module[spans_name]
    function_globals = spans.__globals__
    for occurrence_count in (9, 65):
        prompt = "".join(
            f"{seed}DECOY-{index:03d}\\n"
            for index in range(occurrence_count - 1)
        ) + f"{seed}TOPSECRET"
        echo = f"stderr prefix: {seed}TOPSECRET failed"
        for captured in (echo, echo.encode("utf-8")):
            result = redact(captured, prompt)
            assert result == expected, (path, occurrence_count, type(captured), result)
            assert seed not in result, (path, occurrence_count, type(captured), result)
            assert "TOPSECRET" not in result, (path, occurrence_count, type(captured), result)

    repetitive_prompt = "A" * (64 * 1024)
    prefix = "stderr prefix: "
    suffix = " failed"
    repeated_4k = "A" * (4 * 1024)
    repetitive_echo = prefix + repeated_4k + suffix
    assert spans(repetitive_echo, repetitive_prompt) == [
        (len(prefix), len(prefix) + len(repeated_4k))
    ], path
    assert redact(repetitive_echo, repetitive_prompt) == expected, path

    repeated_4m = ("A" * (4 * 1024 * 1024)) + "TOPSECRET"
    repetitive_echo = prefix + repeated_4m + suffix
    assert spans(repetitive_echo, repeated_4m) == [
        (len(prefix), len(prefix) + len(repeated_4m))
    ], path
    result = redact(repetitive_echo, repeated_4m)
    assert result == expected, (path, len(result), result[:80])
    assert "TOPSECRET" not in result, path

    fragment = "ABCDEFGHIJKLMNOPQR"
    sparse_prompt = fragment[:16] + "\\n" + fragment[2:]
    sparse_prefix = "left:"
    sparse_value = sparse_prefix + fragment + ":right"
    assert spans(sparse_value, sparse_prompt) == [
        (len(sparse_prefix), len(sparse_prefix) + len(fragment))
    ], path
    assert redact(sparse_value, sparse_prompt) == "left:[redacted-prompt]:right", path

    first = "FIRST-PROMPT-SPAN-ALPHA"
    second = "SECOND-PROMPT-SPAN-BETA"
    disjoint_prompt = first + "\\n" + second
    disjoint_value = "left:" + first + ":safe-gap:" + second + ":right"
    assert redact(disjoint_value, disjoint_prompt) == (
        "left:[redacted-prompt]:safe-gap:[redacted-prompt]:right"
    ), path

    rolling = "ROLLING-PROMPT-SPAN-123"
    short_line = "tiny"
    mixed_prompt = rolling + "\\n" + short_line
    mixed_value = "prefix:" + rolling + ":suffix\\nsafe\\n  " + short_line + "  "
    mixed_spans = spans(mixed_value, mixed_prompt)
    assert len(mixed_spans) == 2 and mixed_spans[0][0] > mixed_spans[1][0], (
        path,
        mixed_spans,
    )
    assert redact(mixed_value, mixed_prompt) == (
        "prefix:[redacted-prompt]:suffix\\nsafe\\n  [redacted-prompt]  "
    ), path

    original_seed_budget = function_globals[seed_budget_name]
    function_globals[seed_budget_name] = 2
    try:
        assert redact(
            "harmless-output-1234",
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        ) == "[redacted-prompt]", path
    finally:
        function_globals[seed_budget_name] = original_seed_budget

    original_span_budget = function_globals[span_budget_name]
    function_globals[span_budget_name] = 1
    try:
        assert redact(disjoint_value, disjoint_prompt) == "[redacted-prompt]", path
    finally:
        function_globals[span_budget_name] = original_span_budget
`,
    path.join(assetRoot, "rollout.py.template"),
    path.join(assetRoot, "evaluator.py.template"),
    path.join(assetRoot, "codex_cli_reflector.py.template"),
  ]);

  run("SkillOpt bounded subprocess capture regression", "python3", [
    "-c",
    `import os, runpy, signal, subprocess, sys, tempfile, threading, time
templates = (
    (
        sys.argv[1],
        "BoundedByteCapture",
        "BoundedProcessIO",
        "render_captured_stream",
        "reap_process_group",
        "start_bounded_process_io",
        "BoundedCaptureError",
        "process_group_alive",
        "PROMPT_ECHO_MAX_SPANS",
    ),
    (
        sys.argv[2],
        "_BoundedByteCapture",
        "_BoundedProcessIO",
        "_render_captured_stream",
        "_reap_process_group",
        "_start_bounded_process_io",
        "_BoundedCaptureError",
        "_process_group_alive",
        "_PROMPT_ECHO_MAX_SPANS",
    ),
    (
        sys.argv[3],
        "_BoundedByteCapture",
        "_BoundedProcessIO",
        "_render_captured_stream",
        "_reap_process_group",
        "_start_bounded_process_io",
        "_BoundedCaptureError",
        "_process_group_alive",
        "_PROMPT_ECHO_MAX_SPANS",
    ),
)
child_code = """
import sys
prompt = sys.stdin.buffer.read()
sys.stdout.buffer.write(b"X" * 4096 + b"\\\\nstdout-tail:" + prompt)
sys.stderr.buffer.write(b"Y" * 4096 + b"\\\\nstderr-tail:" + prompt)
raise SystemExit(7)
"""
prompt = "capture-secret-0123456789ABCDEF:Gr\\u00fc\\u00dfe"
for (
    path,
    capture_name,
    process_io_name,
    render_name,
    reap_name,
    starter_name,
    capture_error_name,
    group_alive_name,
    span_budget_name,
) in templates:
    module = runpy.run_path(path)
    capture_type = module[capture_name]
    process_io_type = module[process_io_name]
    render = module[render_name]
    starter = module[starter_name]
    capture_error_type = module[capture_error_name]
    group_alive = module[group_alive_name]
    isolated_runner = module.get("_run_isolated_codex")
    assert issubclass(capture_error_type, OSError), path

    capture = capture_type(8)
    capture.append(b"prefix")
    capture.append(b"-suffix")
    retained, truncated = capture.snapshot()
    assert retained == b"x-suffix" and truncated and capture.total_bytes == 13, (
        path,
        retained,
        truncated,
        capture.total_bytes,
    )

    split_utf8 = capture_type(2)
    split_utf8.append("\\u20ac".encode("utf-8"))
    rendered_split = render(split_utf8, "unrelated prompt")
    assert rendered_split.startswith("[output truncated; retained tail]\\n"), (
        path,
        rendered_split,
    )
    assert "\\ufffd" in rendered_split, (path, rendered_split)

    boundary_prompt = "system-prefix:TOPSECRET-1234567890"
    boundary_suffix = ":child-failed-with-safe-diagnostic"
    boundary_limit = len((boundary_prompt[-8:] + boundary_suffix).encode("utf-8"))
    boundary_capture = capture_type(boundary_limit)
    boundary_capture.append((boundary_prompt + boundary_suffix).encode("utf-8"))
    boundary_bytes, boundary_truncated = boundary_capture.snapshot()
    assert len(boundary_bytes) == boundary_limit and boundary_truncated, (
        path,
        len(boundary_bytes),
        boundary_limit,
    )
    rendered_boundary = render(boundary_capture, boundary_prompt)
    assert rendered_boundary == (
        "[output truncated; retained tail]\\n"
        "[redacted-prompt]"
        + boundary_suffix
    ), (path, rendered_boundary)
    assert boundary_prompt[-8:] not in rendered_boundary, (path, rendered_boundary)

    partial_prompt = "ABCDEFGHIJKLMNOPQRST"
    partial_suffix = ":child-failed"
    partial_limit = len((partial_prompt[-8:] + partial_suffix).encode("utf-8"))
    partial_capture = capture_type(partial_limit)
    partial_capture.append(
        ("safe-output-prefix:" + partial_prompt + partial_suffix).encode("utf-8")
    )
    rendered_partial = render(partial_capture, partial_prompt)
    assert rendered_partial == (
        "[output truncated; retained tail]\\n"
        "[redacted-prompt]"
        + partial_suffix
    ), (path, rendered_partial)
    assert partial_prompt[-8:] not in rendered_partial, (path, rendered_partial)

    safe_tail = b"safe-diagnostic-tail"
    harmless_capture = capture_type(len(safe_tail))
    harmless_capture.append(b"discarded-prefix:" + safe_tail)
    assert render(harmless_capture, boundary_prompt) == (
        "[output truncated; retained tail]\\n" + safe_tail.decode("utf-8")
    ), path

    unicode_prompt = "long-system-prefix-1234567890\\U0001f680ABCDEFGHIJKLMNO"
    unicode_suffix = ":safe-unicode-tail"
    unicode_retained = (
        "\\U0001f680".encode("utf-8")[1:]
        + b"ABCDEFGHIJKLMNO"
        + unicode_suffix.encode("utf-8")
    )
    unicode_capture = capture_type(len(unicode_retained))
    unicode_capture.append((unicode_prompt + unicode_suffix).encode("utf-8"))
    retained_unicode, unicode_truncated = unicode_capture.snapshot()
    assert retained_unicode == unicode_retained and unicode_truncated, (
        path,
        retained_unicode,
    )
    rendered_unicode = render(unicode_capture, unicode_prompt)
    assert rendered_unicode == (
        "[output truncated; retained tail]\\n"
        "[redacted-prompt]"
        + unicode_suffix
    ), (path, rendered_unicode)
    assert "\\ufffd" not in rendered_unicode, (path, rendered_unicode)

    second_prompt = "SECOND-PROMPT-SPAN-BETA"
    budget_prompt = boundary_prompt + "\\n" + second_prompt
    budget_suffix = ":safe-gap:" + second_prompt + ":safe-end"
    budget_limit = len((boundary_prompt[-8:] + budget_suffix).encode("utf-8"))
    budget_capture = capture_type(budget_limit)
    budget_capture.append((boundary_prompt + budget_suffix).encode("utf-8"))
    render_globals = render.__globals__
    original_span_budget = render_globals[span_budget_name]
    render_globals[span_budget_name] = 1
    try:
        assert render(budget_capture, budget_prompt) == (
            "[output truncated; retained tail]\\n[redacted-prompt]"
        ), path
    finally:
        render_globals[span_budget_name] = original_span_budget

    process = subprocess.Popen(
        [sys.executable, "-c", child_code],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        start_new_session=True,
    )
    process_io = process_io_type(
        process,
        prompt,
        stdout_limit=96,
        stderr_limit=80,
    )
    process_io.start()
    process.wait(timeout=5)
    module[reap_name](process, grace_seconds=0)
    process_io.finish()
    assert process.returncode == 7, (path, process.returncode)

    stdout_bytes, stdout_truncated = process_io.stdout.snapshot()
    stderr_bytes, stderr_truncated = process_io.stderr.snapshot()
    assert len(stdout_bytes) == 96 and stdout_truncated, (path, len(stdout_bytes))
    assert len(stderr_bytes) == 80 and stderr_truncated, (path, len(stderr_bytes))
    assert process_io.stdout.total_bytes > len(stdout_bytes), path
    assert process_io.stderr.total_bytes > len(stderr_bytes), path

    stdout = render(process_io.stdout, prompt)
    stderr = render(process_io.stderr, prompt)
    for stream, safe_tail in (
        (stdout, "stdout-tail:"),
        (stderr, "stderr-tail:"),
    ):
        assert prompt not in stream, (path, stream)
        assert safe_tail in stream, (path, stream)
        assert stream.count("[output truncated; retained tail]") == 1, (path, stream)
        assert stream.count("[redacted-prompt]") == 1, (path, stream)

    startup_child_code = """
import pathlib
import signal
import sys
import time
signal.signal(signal.SIGTERM, lambda *_: None)
pathlib.Path(sys.argv[1]).write_text("ready", encoding="utf-8")
while True:
    time.sleep(3600)
"""
    for failure_index in range(3):
        with tempfile.TemporaryDirectory() as temp_dir:
            ready_file = os.path.join(temp_dir, "ready")
            startup_process = subprocess.Popen(
                [sys.executable, "-c", startup_child_code, ready_file],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                start_new_session=True,
            )
            deadline = time.monotonic() + 5
            while not os.path.exists(ready_file) and time.monotonic() < deadline:
                time.sleep(0.01)
            assert os.path.exists(ready_file), (path, failure_index)
            real_thread_start = threading.Thread.start
            start_calls = {"count": 0}

            def injected_start(thread):
                current = start_calls["count"]
                start_calls["count"] += 1
                if current == failure_index:
                    raise RuntimeError("injected startup failure with private detail")
                return real_thread_start(thread)

            threading.Thread.start = injected_start
            startup_error = ""
            try:
                try:
                    starter(startup_process, "startup-secret-must-not-leak")
                except capture_error_type as error:
                    startup_error = str(error)
                else:
                    raise AssertionError((path, failure_index, "startup unexpectedly succeeded"))
            finally:
                threading.Thread.start = real_thread_start
            assert startup_process.poll() is not None, (path, failure_index)
            assert "RuntimeError" in startup_error, (path, failure_index, startup_error)
            assert "private detail" not in startup_error, (path, failure_index, startup_error)
            assert "startup-secret" not in startup_error, (path, failure_index, startup_error)
            assert all(
                stream.closed
                for stream in (
                    startup_process.stdin,
                    startup_process.stdout,
                    startup_process.stderr,
                )
            ), (path, failure_index)
            deadline = time.monotonic() + 5
            while group_alive(startup_process.pid) and time.monotonic() < deadline:
                time.sleep(0.01)
            assert not group_alive(startup_process.pid), (path, failure_index)
            assert not any(
                thread.name.startswith("skillopt-") and thread.is_alive()
                for thread in threading.enumerate()
            ), (path, failure_index)

    with tempfile.TemporaryDirectory() as temp_dir:
        ready_file = os.path.join(temp_dir, "post-launch-ready")
        post_launch_process = subprocess.Popen(
            [sys.executable, "-c", startup_child_code, ready_file],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            start_new_session=True,
        )
        deadline = time.monotonic() + 5
        while not os.path.exists(ready_file) and time.monotonic() < deadline:
            time.sleep(0.01)
        assert os.path.exists(ready_file), path
        real_thread_start = threading.Thread.start
        post_launch_raised = {"value": False}

        def start_then_raise(thread):
            real_thread_start(thread)
            if not post_launch_raised["value"]:
                post_launch_raised["value"] = True
                raise RuntimeError("post-launch failure with private detail")

        threading.Thread.start = start_then_raise
        post_launch_error = ""
        try:
            try:
                starter(post_launch_process, "post-launch-secret")
            except capture_error_type as error:
                post_launch_error = str(error)
            else:
                raise AssertionError((path, "post-launch startup unexpectedly succeeded"))
        finally:
            threading.Thread.start = real_thread_start
        assert post_launch_process.poll() is not None, path
        assert "RuntimeError" in post_launch_error, (path, post_launch_error)
        assert "private detail" not in post_launch_error, (path, post_launch_error)
        assert "post-launch-secret" not in post_launch_error, path
        assert all(
            stream.closed
            for stream in (
                post_launch_process.stdin,
                post_launch_process.stdout,
                post_launch_process.stderr,
            )
        ), path
        assert not group_alive(post_launch_process.pid), path
        assert not any(
            thread.name.startswith("skillopt-") and thread.is_alive()
            for thread in threading.enumerate()
        ), path

    with tempfile.TemporaryDirectory() as temp_dir:
        ready_file = os.path.join(temp_dir, "constructor-ready")
        constructor_process = subprocess.Popen(
            [sys.executable, "-c", startup_child_code, ready_file],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            start_new_session=True,
        )
        deadline = time.monotonic() + 5
        while not os.path.exists(ready_file) and time.monotonic() < deadline:
            time.sleep(0.01)
        assert os.path.exists(ready_file), path

        class FailingPrompt:
            def __str__(self):
                raise RuntimeError("constructor failure with private detail")

        try:
            starter(constructor_process, FailingPrompt())
        except capture_error_type as error:
            constructor_error = str(error)
        else:
            raise AssertionError((path, "constructor unexpectedly succeeded"))
        assert constructor_process.poll() is not None, path
        assert "RuntimeError" in constructor_error, (path, constructor_error)
        assert "private detail" not in constructor_error, (path, constructor_error)
        assert all(
            stream.closed
            for stream in (
                constructor_process.stdin,
                constructor_process.stdout,
                constructor_process.stderr,
            )
        ), path
        assert not group_alive(constructor_process.pid), path

    escaped_child_code = """
import pathlib
import signal
import subprocess
import sys
import time
signal.signal(signal.SIGTERM, lambda *_: None)
descendant = subprocess.Popen(
    [
        sys.executable,
        "-c",
        "import signal,time; signal.signal(signal.SIGTERM, lambda *_: None); time.sleep(3600)",
    ],
    start_new_session=True,
)
pathlib.Path(sys.argv[1]).write_text(str(descendant.pid), encoding="utf-8")
while True:
    time.sleep(3600)
"""
    with tempfile.TemporaryDirectory() as temp_dir:
        descendant_file = os.path.join(temp_dir, "descendant.pid")
        escaped_process = subprocess.Popen(
            [sys.executable, "-c", escaped_child_code, descendant_file],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            start_new_session=True,
        )
        deadline = time.monotonic() + 5
        while not os.path.exists(descendant_file) and time.monotonic() < deadline:
            time.sleep(0.01)
        assert os.path.exists(descendant_file), path
        with open(descendant_file, encoding="utf-8") as descendant_handle:
            descendant_pid = int(descendant_handle.read())
        real_thread_start = threading.Thread.start
        start_calls = {"count": 0}

        def fail_second_start(thread):
            current = start_calls["count"]
            start_calls["count"] += 1
            if current == 1:
                raise RuntimeError("escaped descendant startup failure")
            return real_thread_start(thread)

        threading.Thread.start = fail_second_start
        escaped_error = ""
        try:
            try:
                starter(escaped_process, "escaped-descendant-secret")
            except capture_error_type as error:
                escaped_error = str(error)
            else:
                raise AssertionError((path, "escaped descendant startup unexpectedly succeeded"))
        finally:
            threading.Thread.start = real_thread_start
        direct_left_alive = escaped_process.poll() is None
        group_left_alive = group_alive(escaped_process.pid)
        if direct_left_alive or group_left_alive:
            try:
                os.killpg(escaped_process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            try:
                escaped_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                pass
        try:
            os.kill(descendant_pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        deadline = time.monotonic() + 5
        while (
            any(
                thread.name.startswith("skillopt-") and thread.is_alive()
                for thread in threading.enumerate()
            )
            and time.monotonic() < deadline
        ):
            time.sleep(0.01)
        assert not direct_left_alive, path
        assert not group_left_alive, path
        assert escaped_error == "bounded subprocess I/O startup cleanup failed", (
            path,
            escaped_error,
        )
        assert "escaped-descendant-secret" not in escaped_error, path
        assert not any(
            thread.name.startswith("skillopt-") and thread.is_alive()
            for thread in threading.enumerate()
        ), path
        assert all(
            stream.closed
            for stream in (
                escaped_process.stdin,
                escaped_process.stdout,
                escaped_process.stderr,
            )
        ), path

    if isolated_runner is not None:
        runner_globals = isolated_runner.__globals__
        real_reap = runner_globals[reap_name]

        def fail_reaper(*_args, **_kwargs):
            raise OSError("reaper failure with private detail")

        runner_globals[reap_name] = fail_reaper
        reaper_error = ""
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                try:
                    isolated_runner(
                        [
                            sys.executable,
                            "-c",
                            "import sys; sys.stdin.buffer.read(); print('safe')",
                        ],
                        "reaper-secret",
                        temp_dir,
                        os.environ.copy(),
                        5,
                    )
                except capture_error_type as error:
                    reaper_error = str(error)
                else:
                    raise AssertionError((path, "injected reaper failure was ignored"))
        finally:
            runner_globals[reap_name] = real_reap
        assert reaper_error == "bounded subprocess cleanup failed", (
            path,
            reaper_error,
        )
        assert "private detail" not in reaper_error, path
        assert "reaper-secret" not in reaper_error, path
        assert not any(
            thread.name.startswith("skillopt-") and thread.is_alive()
            for thread in threading.enumerate()
        ), path
`,
    path.join(assetRoot, "rollout.py.template"),
    path.join(assetRoot, "evaluator.py.template"),
    path.join(assetRoot, "codex_cli_reflector.py.template"),
  ]);

  const evaluator = path.join(assetRoot, "evaluator.py.template");
  run("SkillOpt Markdown-escaped visual glob regression", "python3", [
    "-c",
    "import runpy, sys\nmodule = runpy.run_path(sys.argv[1])\nresult = module['_match_visual_assertion']([{'path': 'result.png'}], r'artifact_exists: \\*.png')\nassert result['passed'], result\n",
    evaluator,
  ]);
  run("SkillOpt hard-gate semantic merge regression", "python3", [
    "-c",
    `import hashlib, runpy, sys
module = runpy.run_path(sys.argv[1])
evaluator = module['AgentSkillsEvaluator']({'judge_backend': 'heuristic'})
result = evaluator.score(
    {
        'id': 'semantic-after-hard-gates',
        'skill_name': 'test-skill',
        'expected_behavior': ['semantic requirement'],
        'deterministic_assertions': ['contains: hard-token'],
        'visual_assertions': [],
    },
    {'returncode': 0, 'response': 'hard-token only', 'artifacts': []},
)
assert result['hard'] == 0, result
assert result['judge_backend'] == 'deterministic+heuristic', result
assert any(item['text'] == 'Response semantically reflects expected behavior' for item in result['assertion_results']), result

missing = module['_match_visual_assertion'](
    [{'path': 'result.svg', 'kind': 'svg', 'valid': True}],
    'svg_contains: *.svg Visible',
)
assert not missing['passed'] and 'visible-text metadata' in missing['evidence'], missing
metadata_only = module['_match_visual_assertion'](
    [{'path': 'result.svg', 'kind': 'svg', 'valid': True, 'visible_text': ''}],
    'svg_contains: *.svg MetadataOnly',
)
assert not metadata_only['passed'], metadata_only
self_contained_svg = {
    'path': 'result.svg',
    'kind': 'svg',
    'valid': True,
    'embedded_svg_images': 1,
    'external_references': 0,
    'unsupported_images': 0,
    'flow_animation': True,
}
assert module['_match_visual_assertion'](
    [self_contained_svg],
    'svg_self_contained_images: *.svg',
)['passed']
assert not module['_match_visual_assertion'](
    [{**self_contained_svg, 'external_references': 1}],
    'svg_self_contained_images: *.svg',
)['passed']
assert module['_match_visual_assertion'](
    [self_contained_svg],
    'svg_has_flow_animation: *.svg',
)['passed']
assert not module['_match_visual_assertion'](
    [{**self_contained_svg, 'flow_animation': False}],
    'svg_has_flow_animation: *.svg',
)['passed']
self_contained_drawio = {
    'path': 'result.drawio',
    'kind': 'drawio',
    'valid': True,
    'page_count': 2,
    'adaptive_colors': True,
    'native_stencil_count': 2,
    'uncompressed': True,
    'self_contained_svg': True,
    'embedded_svg_sha256s': ['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
    'embedded_svg_cell_sha256s': [
        hashlib.sha256(
            'logo\\0aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'.encode('utf-8')
        ).hexdigest(),
    ],
    'animation_on': True,
    'animation_off': False,
    'directed_flow_edges': 1,
    'animated_edges': 1,
    'animated_static_edges': 0,
    'cell_id_sha256s': [
        hashlib.sha256(value.encode('utf-8')).hexdigest()
        for value in ('client', 'api', 'cache')
    ],
    'native_stencil_cell_id_sha256s': [
        hashlib.sha256('cache'.encode('utf-8')).hexdigest(),
    ],
    'directed_edge_sha256s': [
        hashlib.sha256('client\\0api'.encode('utf-8')).hexdigest(),
        hashlib.sha256('api\\0cache'.encode('utf-8')).hexdigest(),
    ],
    'link_sha256s': [
        hashlib.sha256('https://docs.example.invalid/product'.encode('utf-8')).hexdigest(),
    ],
    'edge_role_sha256s': [
        hashlib.sha256('edge-client-api\\0request'.encode('utf-8')).hexdigest(),
    ],
    'profile_style_sha256s': [
        hashlib.sha256(value.encode('utf-8')).hexdigest()
        for value in (
            'api\\0designProfile\\0neon-hub',
            'api\\0strokeColor\\0light-dark(#4D7C0F,#D7FF00)',
        )
    ],
    'page_graphs': [
        {
            'page_name_sha256': hashlib.sha256('Runtime'.encode('utf-8')).hexdigest(),
            'adaptive_colors': True,
            'cell_id_sha256s': [
                hashlib.sha256(value.encode('utf-8')).hexdigest()
                for value in ('client', 'api')
            ],
            'native_stencil_cell_id_sha256s': [],
            'directed_edge_sha256s': [
                hashlib.sha256('client\\0api'.encode('utf-8')).hexdigest(),
            ],
            'edge_role_sha256s': [
                hashlib.sha256('edge-client-api\\0request'.encode('utf-8')).hexdigest(),
            ],
            'profile_style_sha256s': [
                hashlib.sha256(value.encode('utf-8')).hexdigest()
                for value in (
                    'api\\0designProfile\\0neon-hub',
                    'api\\0strokeColor\\0light-dark(#4D7C0F,#D7FF00)',
                )
            ],
            'link_sha256s': [],
        },
        {
            'page_name_sha256': hashlib.sha256('Data Path'.encode('utf-8')).hexdigest(),
            'adaptive_colors': True,
            'cell_id_sha256s': [hashlib.sha256('cache'.encode('utf-8')).hexdigest()],
            'native_stencil_cell_id_sha256s': [
                hashlib.sha256('cache'.encode('utf-8')).hexdigest(),
            ],
            'directed_edge_sha256s': [],
            'edge_role_sha256s': [],
            'profile_style_sha256s': [],
            'link_sha256s': [
                hashlib.sha256(
                    'https://docs.example.invalid/product'.encode('utf-8')
                ).hexdigest(),
            ],
        },
    ],
}
assert module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_valid: *.drawio min_pages=2 min_native_stencils=2 uncompressed=1 self_contained_svg=1 animation_on=1 adaptive_colors=1',
)['passed']
assert not module['_match_visual_assertion'](
    [{
        **self_contained_drawio,
        'adaptive_colors': False,
        'page_graphs': [
            self_contained_drawio['page_graphs'][0],
            {**self_contained_drawio['page_graphs'][1], 'adaptive_colors': False},
        ],
    }],
    'drawio_valid: *.drawio adaptive_colors=1',
)['passed']
assert not module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_valid: *.drawio animation_off=1',
)['passed']
assert not module['_match_visual_assertion'](
    [{**self_contained_drawio, 'directed_flow_edges': 0, 'animated_edges': 0}],
    'drawio_valid: *.drawio animation_on=1',
)['passed']
assert not module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_valid: *.drawio animation_on=1 animation_off=1',
)['passed']
assert not module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_valid: *.drawio unsupported=1',
)['passed']
assert not module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_valid: *.drawio uncompressed=2',
)['passed']
assert not module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_valid: *.drawio adaptive_colors=2',
)['passed']
assert not module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_valid: *.drawio min_pages=0',
)['passed']
assert not module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_valid: *.drawio min_native_stencils=3',
)['passed']
assert not module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_valid: *.drawio min_native_stencils=3 uncompressed=1',
)['passed']
assert module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_self_contained_svg: *.drawio',
)['passed']
assert not module['_match_visual_assertion'](
    [{**self_contained_drawio, 'self_contained_svg': False}],
    'drawio_self_contained_svg: *.drawio',
)['passed']
compressed_self_contained_drawio = {**self_contained_drawio, 'uncompressed': False}
assert module['_match_visual_assertion'](
    [compressed_self_contained_drawio],
    'drawio_valid: *.drawio self_contained_svg=1',
)['passed']
assert not module['_match_visual_assertion'](
    [compressed_self_contained_drawio],
    'drawio_self_contained_svg: *.drawio',
)['passed']
assert module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_embeds_svg_sha256: *.drawio aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
)['passed']
assert module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_embeds_svg_sha256: *.drawio aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa cell=logo',
)['passed']
assert not module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_embeds_svg_sha256: *.drawio aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa cell=other-logo',
)['passed']
assert not module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_embeds_svg_sha256: *.drawio bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
)['passed']
assert not module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_embeds_svg_sha256: *.drawio AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
)['passed']
assert not module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_embeds_svg_sha256: *.drawio abc',
)['passed']
assert not module['_match_visual_assertion'](
    [{**self_contained_drawio, 'embedded_svg_sha256s': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'}],
    'drawio_embeds_svg_sha256: *.drawio aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
)['passed']
assert module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_graph: *.drawio ids=client,api,cache native_ids=cache edges=client>api,api>cache not_edges=api>client edge_roles=edge-client-api:request profile_styles=api:designProfile:neon-hub,api:strokeColor:light-dark%28%234D7C0F%2C%23D7FF00%29 links=https://docs.example.invalid/product',
)['passed']
assert module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_graph: *.drawio page=Runtime ids=client,api edges=client>api edge_roles=edge-client-api:request profile_styles=api:designProfile:neon-hub',
)['passed']
assert module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_graph: *.drawio page=Data%20Path ids=cache native_ids=cache links=https://docs.example.invalid/product',
)['passed']
split_profile_digests = {
    name: hashlib.sha256(value.encode('utf-8')).hexdigest()
    for name, value in {
        'profile': 'api\\0designProfile\\0neon-hub',
        'stroke': 'api\\0strokeColor\\0light-dark(#4D7C0F,#D7FF00)',
        'shadow': f'api\\0shadow\\0{0}',
    }.items()
}
split_profile_drawio = {
    **self_contained_drawio,
    'profile_style_sha256s': sorted(split_profile_digests.values()),
    'page_graphs': [
        {
            **self_contained_drawio['page_graphs'][0],
            'profile_style_sha256s': [
                split_profile_digests['profile'],
                split_profile_digests['stroke'],
            ],
        },
        {
            **self_contained_drawio['page_graphs'][1],
            'cell_id_sha256s': [hashlib.sha256('api'.encode('utf-8')).hexdigest()],
            'profile_style_sha256s': [
                split_profile_digests['profile'],
                split_profile_digests['shadow'],
            ],
        },
    ],
}
assert not module['_match_visual_assertion'](
    [split_profile_drawio],
    'drawio_graph: *.drawio profile_styles=api:designProfile:neon-hub,api:strokeColor:light-dark%28%234D7C0F%2C%23D7FF00%29,api:shadow:0',
)['passed']
assert module['_match_visual_assertion'](
    [split_profile_drawio],
    'drawio_graph: *.drawio page=Runtime profile_styles=api:designProfile:neon-hub,api:strokeColor:light-dark%28%234D7C0F%2C%23D7FF00%29',
)['passed']
assert module['_match_visual_assertion'](
    [split_profile_drawio],
    'drawio_graph: *.drawio page=Data%20Path profile_styles=api:designProfile:neon-hub,api:shadow:0',
)['passed']
assert not module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_graph: *.drawio page=Runtime ids=cache',
)['passed']
assert not module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_graph: *.drawio page=Missing ids=client',
)['passed']
assert not module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_graph: *.drawio native_ids=api',
)['passed']
assert not module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_graph: *.drawio edge_roles=edge-client-api:event',
)['passed']
assert not module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_graph: *.drawio ids=database edges=api>client',
)['passed']
assert not module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_graph: *.drawio not_edges=client>api',
)['passed']
assert not module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_graph: *.drawio links=https://docs.example.invalid/missing',
)['passed']
assert not module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_graph: *.drawio page=Data%20Path profile_styles=api:designProfile:neon-hub',
)['passed']
assert not module['_match_visual_assertion'](
    [self_contained_drawio],
    'drawio_graph: *.drawio profile_styles=api:strokeColor:%23FFFFFF',
)['passed']
for invalid_profile_styles in (
    'bad%20id:designProfile:neon-hub',
    'api:bad%3Dkey:value',
    'api:image:value',
    'api:strokeColor:%00',
    'api:strokeColor:%FF',
    f"api:strokeColor:{'a' * 2049}",
    ','.join(f'profile-{index}:designProfile:technical' for index in range(129)),
):
    assert not module['_match_visual_assertion'](
        [self_contained_drawio],
        f'drawio_graph: *.drawio profile_styles={invalid_profile_styles}',
    )['passed']
`,
    evaluator,
  ]);
}

function validateDataloaderSetupBoundary() {
  if (!hasPython3()) return;
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-dataloader-boundary-"));
  try {
    run("SkillOpt dataloader setup boundary regression", "python3", [
      "-c",
      `import json
import runpy
import sys
import types
from pathlib import Path

base = types.ModuleType("skillopt.datasets.base")

class SplitDataLoader:
    def __init__(self, split_dir="", **kwargs):
        self.split_dir = split_dir
        self._splits = {}

    def setup(self, cfg):
        if not self.split_dir:
            self.split_dir = cfg.get("split_dir", "")
        for name in ("train", "val", "test"):
            self._splits[name] = self.load_split_items(Path(self.split_dir) / name)

    def get_split_items(self, split):
        return list(self._splits.get(split, []))

base.SplitDataLoader = SplitDataLoader
skillopt = types.ModuleType("skillopt")
datasets = types.ModuleType("skillopt.datasets")
sys.modules["skillopt"] = skillopt
sys.modules["skillopt.datasets"] = datasets
sys.modules["skillopt.datasets.base"] = base

module = runpy.run_path(sys.argv[1])
root = Path(sys.argv[2])

def item(identifier, family, group, fixtures=None, skill_name="test-skill"):
    return {
        "id": f"{skill_name}/{identifier}",
        "skill_name": skill_name,
        "case_path": f"cases/{identifier}.md",
        "prompt": "Test prompt",
        "expected_behavior": ["Produce a result."],
        "rubric_path": None,
        "fixtures": list(fixtures or []),
        "split_family": family,
        "split_group": f"sha256:{group * 64}",
        "expected_artifacts": [],
        "deterministic_assertions": ["contains: result"],
        "visual_assertions": [],
        "tags": ["positive"],
        "should_trigger": True,
        "workspace_policy": "text-only",
        "source_hash": f"sha256:{identifier}",
    }

def scenario(name, train, val, test, expected=None):
    split_root = root / name
    for split, values in (("train", train), ("val", val), ("test", test)):
        target = split_root / split / "items.json"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(values), encoding="utf-8")
    loader = module["AgentSkillsDataLoader"](split_dir=str(split_root))
    try:
        loader.setup({})
    except ValueError as error:
        if expected is None:
            raise
        assert expected in str(error), error
    else:
        if expected is not None:
            raise AssertionError(f"setup accepted invalid {name} dataset")

scenario(
    "valid",
    [item("train", "family-train", "a", ["fixtures/train.svg"])],
    [item("val", "family-val", "b", ["fixtures/val.svg"])],
    [item("test", "family-test", "c", ["fixtures/test.svg"])],
)
scenario(
    "group-crossing",
    [item("train", "family-train", "a")],
    [item("val", "family-val", "a")],
    [item("test", "family-test", "c")],
    "split_group",
)
scenario(
    "fixture-alias",
    [item("train", "family-train", "a", ["fixtures/shared.svg"])],
    [item("val", "family-val", "b", ["./fixtures/shared.svg"])],
    [item("test", "family-test", "c")],
    "fixture",
)
scenario(
    "family-bridge",
    [
        item("train-a", "family-one", "a", ["fixtures/shared.svg"]),
        item("train-b", "family-two", "a", ["fixtures/shared.svg"]),
    ],
    [item("val", "family-two", "b", ["fixtures/other.svg"])],
    [item("test", "family-test", "c")],
    "split_family",
)
for index, invalid_fixture in enumerate((
    " ./fixtures/shared.svg",
    "fixtures/shared.svg ",
    "C:/private.svg",
    "https://example.invalid/icon.svg",
    "../outside.svg",
    "fixtures\\shared.svg",
    "fixtures/a|b.svg",
)):
    scenario(
        f"invalid-fixture-{index}",
        [item("train", "family-train", "a", [invalid_fixture])],
        [item("val", "family-val", "b")],
        [item("test", "family-test", "c")],
        "fixture",
    )
scenario(
    "family-whitespace",
    [item("train", " family-train", "a")],
    [item("val", "family-val", "b")],
    [item("test", "family-test", "c")],
    "split_family",
)
scenario(
    "skill-name-mismatch",
    [item("train", "family-train", "a")],
    [item("val", "family-val", "b", skill_name="other-skill")],
    [item("test", "family-test", "c")],
    "skill_name",
)
`,
      path.join(assetRoot, "dataloader.py.template"),
      temp,
    ]);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function validateRolloutArtifactPolicy() {
  if (!hasPython3()) {
    console.warn("python3 unavailable; skipping SkillOpt rollout artifact-policy smoke");
    return;
  }
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-artifact-policy-"));
  const template = path.join(assetRoot, "rollout.py.template");
  const templateText = fs.readFileSync(template, "utf8");
  assertNotIncludes("rollout-owned artifact validation", templateText, "runpy");
  assertNotIncludes(
    "rollout-owned artifact validation",
    templateText,
    "prepare_trusted_drawio_validator",
  );
  assertNotIncludes("rollout-owned artifact validation", templateText, "drawio_validator");
  const python = `
import base64
import hashlib
import html
import os
import runpy
import struct
import urllib.parse
import xml.etree.ElementTree as ET
import zlib
from pathlib import Path

module = runpy.run_path(os.environ["ROLLOUT_TEMPLATE"])
public_validator = runpy.run_path(os.environ["PUBLIC_DRAWIO_VALIDATOR"])
root = Path(os.environ["TEST_ROOT"])

def chunk(kind, payload):
    crc = zlib.crc32(kind)
    crc = zlib.crc32(payload, crc) & 0xffffffff
    return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", crc)

def png(width, height, raw, color_type=6, bit_depth=8, interlace=0, before_idat=()):
    ihdr = struct.pack(">IIBBBBB", width, height, bit_depth, color_type, 0, 0, interlace)
    return (
        b"\\x89PNG\\r\\n\\x1a\\n"
        + chunk(b"IHDR", ihdr)
        + b"".join(before_idat)
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )

valid = png(2, 1, b"\\x00\\xff\\x00\\x00\\xff\\x00\\xff\\x00\\xff")
valid_path = root / "valid.png"
valid_path.write_bytes(valid)
metadata = module["png_metadata"](valid_path)
assert metadata["valid"] and metadata["nonblank"], metadata

bad_crc = bytearray(valid)
idat = valid.index(b"IDAT")
length = struct.unpack(">I", valid[idat - 4:idat])[0]
bad_crc[idat + 4 + length] ^= 1
assert not module["png_metadata"](root / "bad-crc.png", bytes(bad_crc))["valid"]
assert not module["png_metadata"](root / "missing-iend.png", valid[:-12])["valid"]
assert not module["png_metadata"](root / "oversized.png", png(20000, 1, b""))["valid"]
assert not module["png_metadata"](root / "inflate-bomb.png", png(1, 1, b"\\x00" * 400))["valid"]

adam7 = module["png_metadata"](
    root / "adam7.png",
    png(1, 1, b"\\x00\\x10\\x20\\x30\\xff", interlace=1),
)
assert adam7["valid"] and adam7["visible_pixel_count"] == 1, adam7

duplicate_palette = module["png_metadata"](
    root / "duplicate-palette.png",
    png(
        2,
        1,
        b"\\x00\\x00\\x01",
        color_type=3,
        before_idat=(chunk(b"PLTE", b"\\xff\\x00\\x00\\xff\\x00\\x00"),),
    ),
)
assert duplicate_palette["valid"] and not duplicate_palette["nonblank"], duplicate_palette

invalid_index = module["png_metadata"](
    root / "invalid-index.png",
    png(
        2,
        1,
        b"\\x00\\x00\\x01",
        color_type=3,
        before_idat=(chunk(b"PLTE", b"\\xff\\x00\\x00"),),
    ),
)
assert not invalid_index["valid"], invalid_index

cross_row_alpha = module["png_metadata"](
    root / "cross-row-alpha.png",
    png(1, 2, b"\\x00\\xff\\x00\\x00\\x00\\x00\\xff\\x00\\x00\\xff"),
)
assert cross_row_alpha["valid"], cross_row_alpha
assert cross_row_alpha["transparent_pixel_count"] == 1, cross_row_alpha
assert cross_row_alpha["visible_pixel_count"] == 1 and cross_row_alpha["nonblank"], cross_row_alpha

late_plte = module["png_metadata"](
    root / "late-plte.png",
    png(
        1,
        1,
        b"\\x00\\xff\\x00\\x00",
        color_type=2,
        before_idat=(
            chunk(b"tRNS", b"\\x00\\x00\\x00\\x00\\x00\\x00"),
            chunk(b"PLTE", b"\\xff\\x00\\x00"),
        ),
    ),
)
assert not late_plte["valid"], late_plte

valid_svg = b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><text>visible</text></svg>'
assert module["svg_metadata"](root / "valid.svg", valid_svg)["valid"]
assert module["svg_metadata"](
    root / "no-namespace.svg",
    b'<svg viewBox="0 0 16 16"><rect width="16" height="16"/></svg>',
)["valid"]
assert not module["svg_metadata"](root / "bad-utf8.svg", b'<svg>\\xff</svg>')["valid"]
assert not module["svg_metadata"](root / "dtd.svg", b'<!DOCTYPE svg><svg/>')["valid"]
assert not module["svg_metadata"](root / "empty.svg", b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"/>')["valid"]
assert not module["svg_metadata"](
    root / "wrong-namespace.svg",
    b'<svg xmlns="urn:not-svg" viewBox="0 0 16 16"><rect width="16" height="16"/></svg>',
)["valid"]
assert not module["svg_metadata"](
    root / "no-bounds.svg",
    b'<svg xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16"/></svg>',
)["valid"]
assert not module["svg_metadata"](
    root / "processing.svg",
    b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><?unsafe?><rect width="16" height="16"/></svg>',
)["valid"]

original_svg_element_limit = module["svg_metadata"].__globals__["MAX_SVG_ELEMENTS"]
module["svg_metadata"].__globals__["MAX_SVG_ELEMENTS"] = 2
assert not module["svg_metadata"](
    root / "too-many-elements.svg",
    b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g><rect width="16" height="16"/></g></svg>',
)["valid"]
module["svg_metadata"].__globals__["MAX_SVG_ELEMENTS"] = original_svg_element_limit
original_svg_depth_limit = module["svg_metadata"].__globals__["MAX_SVG_DEPTH"]
module["svg_metadata"].__globals__["MAX_SVG_DEPTH"] = 2
assert not module["svg_metadata"](
    root / "too-deep.svg",
    b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g><rect width="16" height="16"/></g></svg>',
)["valid"]
module["svg_metadata"].__globals__["MAX_SVG_DEPTH"] = original_svg_depth_limit
assert not module["svg_metadata"](
    root / "malformed-path.svg",
    b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M0 0 L" stroke="#111827" fill="none"/></svg>',
)["valid"]
assert not module["svg_metadata"](
    root / "trailing-path-data.svg",
    b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M0 0 L10 10 garbage" stroke="#111827" fill="none"/></svg>',
)["valid"]
assert not module["svg_metadata"](
    root / "unstroked-line.svg",
    b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><line x1="0" y1="0" x2="10" y2="10"/></svg>',
)["valid"]
assert module["svg_metadata"](
    root / "stroked-line.svg",
    b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><line x1="0" y1="0" x2="10" y2="10" stroke="#111827"/></svg>',
)["valid"]
valid_path_metadata = module["svg_metadata"](
    root / "filled-path.svg",
    b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M0 0 L10 0 L5 10 Z"/></svg>',
)
assert valid_path_metadata["valid"] and "text_sample" not in valid_path_metadata
for name, unsafe_svg in (
    ("stylesheet-hidden.svg", b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><style>.mark{display:none}</style><rect class="mark" width="16" height="16"/></svg>'),
    ("stylesheet-transparent.svg", b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><style>.mark{fill:transparent}</style><rect class="mark" width="16" height="16"/></svg>'),
    ("unresolved-paint.svg", b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="url(#missing)" d="M0 0h16v16H0z"/></svg>'),
    ("rgb-alpha-zero.svg", b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="rgb(0 0 0 / 0)"/></svg>'),
    ("current-color-transparent.svg", b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g color="transparent"><rect width="16" height="16" fill="currentColor"/></g></svg>'),
    ("nonfinite-path.svg", b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="none" stroke="#111827" d="M0 0L1e999 10"/></svg>'),
    ("nonfinite-polyline.svg", b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><polyline fill="none" stroke="#111827" points="0,0 1e999,10"/></svg>'),
    ("nonfinite-polygon.svg", b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><polygon fill="none" stroke="#111827" points="0,0 10,0 1e999,10"/></svg>'),
):
    assert not module["svg_metadata"](root / name, unsafe_svg)["valid"], name

def flow_svg(duration="500ms", delay="0s", start="16", keyframe_offsets="to { stroke-dashoffset: 0; }"):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 16"><defs><style>@keyframes ge-flow-test {{ {keyframe_offsets} }}</style></defs><path d="M1 8L31 8" fill="none" stroke="#2563eb" stroke-dasharray="8" stroke-dashoffset="{start}" style="animation:{duration} linear {delay} infinite normal none running ge-flow-test"/></svg>'''.encode("utf-8")

animated_svg = module["svg_metadata"](root / "animated.svg", flow_svg())
assert animated_svg["valid"] and animated_svg["flow_animation"], animated_svg
zero_offset_svg = module["svg_metadata"](
    root / "zero-offset.svg",
    flow_svg(start="16", keyframe_offsets="from { stroke-dashoffset: 0; } to { stroke-dashoffset: 0; }"),
)
assert zero_offset_svg["valid"] and not zero_offset_svg["flow_animation"], zero_offset_svg
delay_only_svg = module["svg_metadata"](root / "delay-only.svg", flow_svg(duration="0s", delay="5s"))
assert delay_only_svg["valid"] and not delay_only_svg["flow_animation"], delay_only_svg
for name, invisible_flow in (
    ("transparent-rgba-flow.svg", flow_svg().replace(b'<path ', b'<rect width="4" height="4" fill="#111827"/><path ').replace(b'stroke="#2563eb"', b'stroke="rgba(37, 99, 235, 0)"')),
    ("transparent-hex-flow.svg", flow_svg().replace(b'<path ', b'<rect width="4" height="4" fill="#111827"/><path ').replace(b'stroke="#2563eb"', b'stroke="#2563eb00"')),
    ("transparent-current-color-flow.svg", flow_svg().replace(b'<path ', b'<rect width="4" height="4" fill="#111827"/><g color="transparent"><path ').replace(b'stroke="#2563eb"', b'stroke="currentColor"').replace(b'</svg>', b'</g></svg>')),
):
    invisible_metadata = module["svg_metadata"](root / name, invisible_flow)
    assert invisible_metadata["valid"] and not invisible_metadata["flow_animation"], invisible_metadata

embedded_svg = b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="#111827"/></svg>'
embedded_uri = "data:image/svg+xml;base64," + base64.b64encode(embedded_svg).decode("ascii")
embedded_markerless_uri = "data:image/svg+xml," + base64.b64encode(embedded_svg).decode("ascii")
embedded_style_uri = "data:image/svg+xml," + urllib.parse.quote_from_bytes(embedded_svg, safe="")
exported_svg = (
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 32 16">'
    f'<image width="16" height="16" xlink:href="{embedded_uri}"/><text>Northstar</text></svg>'
).encode("utf-8")
exported_metadata = module["svg_metadata"](root / "self-contained.svg", exported_svg)
assert exported_metadata["valid"], exported_metadata
assert exported_metadata["embedded_svg_images"] == 1, exported_metadata
assert exported_metadata["external_references"] == 0, exported_metadata
assert exported_metadata["unsupported_images"] == 0, exported_metadata
remote_metadata = module["svg_metadata"](
    root / "remote.svg",
    b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><image width="16" height="16" href="https://example.invalid/logo.svg"/></svg>',
)
assert remote_metadata["external_references"] == 1, remote_metadata

for invalid_embedded in (
    "data:image/svg+xml," + urllib.parse.quote('<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>'),
    "data:image/svg+xml," + urllib.parse.quote('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><?unsafe?><rect width="1" height="1"/></svg>'),
    "data:image/svg+xml," + urllib.parse.quote('<svg xmlns="urn:not-svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>'),
    "data:image/svg+xml," + urllib.parse.quote('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>'),
    "data:image/svg+xml," + urllib.parse.quote('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><style>.mark{display:none}</style><rect class="mark" width="1" height="1"/></svg>'),
    "data:image/svg+xml," + urllib.parse.quote('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="rgb(0 0 0 / 0)"/></svg>'),
    "data:image/svg+xml," + urllib.parse.quote('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><g color="transparent"><rect width="1" height="1" fill="currentColor"/></g></svg>'),
    "data:image/svg+xml," + urllib.parse.quote('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path fill="none" stroke="#000" d="M0 0L1e999 1"/></svg>'),
    "data:image/svg+xml," + urllib.parse.quote('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><defs><path id="route" d="M0 0L1 1"/></defs><rect width="1" height="1"/><mpath href="#route"/></svg>'),
    "data:image/svg+xml,%GG",
):
    try:
        module["validate_embedded_image"](invalid_embedded)
    except ValueError:
        pass
    else:
        raise AssertionError("unsafe or empty embedded SVG passed harness validation")

def drawio(image_source, *, animated=True, pages=1, animation_suffix="", role="request"):
    models = []
    for index in range(pages):
        animation = "1" if animated else "0"
        models.append(f'''  <diagram name="Page {index + 1}">
    <mxGraphModel iconMode="icon-first" adaptiveColors="auto" grid="1" gridSize="8" page="1" pageWidth="827" pageHeight="1169">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="source" value="Source" style="shape=mxgraph.aws4.compute;" vertex="1" parent="1">
          <mxGeometry x="40" y="160" width="120" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="target" value="Target" style="rounded=1;" vertex="1" parent="1">
          <mxGeometry x="240" y="160" width="120" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="profile-operator-grid" value="Profile" style="rounded=1;designProfile=operator-grid;shape=rect;strokeColor=light-dark(#718096,#5B6B80);" vertex="1" parent="1">
          <mxGeometry x="400" y="160" width="120" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="logo" value="Northstar" link="https://docs.example.invalid/product" style="shape=image;image={image_source};aspect=fixed;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="64" height="64" as="geometry"/>
        </mxCell>
        <mxCell id="flow" style="edgeStyle=orthogonalEdgeStyle;endArrow=block;dataRole={role};flowAnimation={animation}{animation_suffix};" edge="1" source="source" target="target" parent="1">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>''')
    return '<mxfile host="app.diagrams.net">\\n' + "\\n".join(models) + '\\n</mxfile>'

def compressed_payload(xml):
    encoded = urllib.parse.quote(xml, safe="").encode("utf-8")
    compressor = zlib.compressobj(level=9, wbits=-15)
    compressed = compressor.compress(encoded) + compressor.flush()
    return base64.b64encode(compressed).decode("ascii")

def compressed_drawio(image_source, *, animated=True):
    source = ET.fromstring(drawio(image_source, animated=animated))
    model = source.find("diagram/mxGraphModel")
    payload = compressed_payload(ET.tostring(model, encoding="unicode"))
    return f'<mxfile host="app.diagrams.net"><diagram name="Compressed">{payload}</diagram></mxfile>'

drawio_workspace = root / "drawio-workspace"
drawio_workspace.mkdir()
(drawio_workspace / "valid.drawio").write_text(drawio(embedded_uri, pages=2), encoding="utf-8")
(drawio_workspace / "remote.drawio").write_text(
    drawio("https://example.invalid/logo.svg", animated=False),
    encoding="utf-8",
)
(drawio_workspace / "fixtures").mkdir()
(drawio_workspace / "fixtures" / "input.drawio").write_text(drawio(embedded_style_uri), encoding="utf-8")
(drawio_workspace / "fixtures" / "input.svg").write_text(
    '<svg xmlns="http://www.w3.org/2000/svg"><text>fixture</text></svg>',
    encoding="utf-8",
)
(drawio_workspace / "assets").mkdir()
(drawio_workspace / "assets" / "helper.svg").write_text(
    '<svg xmlns="http://www.w3.org/2000/svg"><text>helper</text></svg>',
    encoding="utf-8",
)
drawio_artifacts = module["collect_artifacts"](drawio_workspace)
assert [item["path"] for item in drawio_artifacts] == ["remote.drawio", "valid.drawio"], drawio_artifacts
valid_drawio = next(item for item in drawio_artifacts if item["path"] == "valid.drawio")
remote_drawio = next(item for item in drawio_artifacts if item["path"] == "remote.drawio")
assert valid_drawio["kind"] == "drawio" and valid_drawio["self_contained_svg"], valid_drawio
assert valid_drawio["page_count"] == 2 and valid_drawio["uncompressed"], valid_drawio
assert valid_drawio["adaptive_colors"], valid_drawio
assert valid_drawio["animation_on"] and not valid_drawio["animation_off"], valid_drawio
assert valid_drawio["directed_flow_edges"] == 2 and valid_drawio["animated_edges"] == 2, valid_drawio
assert valid_drawio["native_stencil_count"] == 2, valid_drawio
assert valid_drawio["embedded_svg_sha256s"] == [hashlib.sha256(embedded_svg).hexdigest()], valid_drawio
assert valid_drawio["embedded_svg_cell_sha256s"] == [
    hashlib.sha256(f"logo\\0{hashlib.sha256(embedded_svg).hexdigest()}".encode("utf-8")).hexdigest()
], valid_drawio
assert valid_drawio["native_stencil_cell_id_sha256s"] == [
    hashlib.sha256(b"source").hexdigest()
], valid_drawio
assert valid_drawio["edge_role_sha256s"] == [
    hashlib.sha256(b"flow\\0request").hexdigest()
], valid_drawio
expected_profile_styles = {
    hashlib.sha256(f"{cell_id}\\0{key}\\0{value}".encode("utf-8")).hexdigest()
    for cell_id, key, value in (
        ("profile-operator-grid", "designProfile", "operator-grid"),
        ("profile-operator-grid", "shape", "rect"),
        ("profile-operator-grid", "strokeColor", "light-dark(#718096,#5B6B80)"),
    )
}
assert set(valid_drawio["profile_style_sha256s"]) == expected_profile_styles, valid_drawio
assert hashlib.sha256(b"source\\0shape\\0mxgraph.aws4.compute").hexdigest() not in set(
    valid_drawio["profile_style_sha256s"]
), valid_drawio
assert valid_drawio["link_sha256s"] == [hashlib.sha256(b"https://docs.example.invalid/product").hexdigest()], valid_drawio
assert len(valid_drawio["page_graphs"]) == 2, valid_drawio
assert {
    graph["page_name_sha256"] for graph in valid_drawio["page_graphs"]
} == {
    hashlib.sha256(b"Page 1").hexdigest(),
    hashlib.sha256(b"Page 2").hexdigest(),
}, valid_drawio
for page_graph in valid_drawio["page_graphs"]:
    assert page_graph["adaptive_colors"] is True
    assert hashlib.sha256(b"source").hexdigest() in page_graph["native_stencil_cell_id_sha256s"]
    assert hashlib.sha256(b"flow\\0request").hexdigest() in page_graph["edge_role_sha256s"]
    assert set(page_graph["profile_style_sha256s"]) == expected_profile_styles
assert not remote_drawio["self_contained_svg"], remote_drawio
assert remote_drawio["animation_off"] and not remote_drawio["animation_on"], remote_drawio

partially_adaptive_source = drawio(embedded_style_uri, pages=2).replace(
    ' adaptiveColors="auto"',
    '',
    1,
)
partially_adaptive_metadata = module["drawio_metadata"](
    root / "partially-adaptive.drawio",
    partially_adaptive_source.encode("utf-8"),
)
assert partially_adaptive_metadata["valid"], partially_adaptive_metadata
assert not partially_adaptive_metadata["adaptive_colors"], partially_adaptive_metadata
assert [
    page["adaptive_colors"] for page in partially_adaptive_metadata["page_graphs"]
] == [False, True], partially_adaptive_metadata

safe_drawio = drawio(embedded_style_uri)
markerless_metadata = module["drawio_metadata"](
    root / "markerless-base64.drawio",
    drawio(embedded_markerless_uri).encode("utf-8"),
)
assert markerless_metadata["valid"], markerless_metadata
assert markerless_metadata["self_contained_svg"], markerless_metadata
assert markerless_metadata["external_references"] == 0, markerless_metadata
assert markerless_metadata["embedded_svg_sha256s"] == [
    hashlib.sha256(embedded_svg).hexdigest()
], markerless_metadata

fragment_image_source = safe_drawio.replace(
    '<mxCell id="target" value="Target" style="rounded=1;"',
    '<mxCell id="target" value="Target" style="shape=image;image=#missing;aspect=fixed;"',
)
fragment_image_metadata = module["drawio_metadata"](
    root / "fragment-image-source.drawio",
    fragment_image_source.encode("utf-8"),
)
assert fragment_image_metadata["valid"], fragment_image_metadata
assert fragment_image_metadata["embedded_svg_images"] == 1, fragment_image_metadata
assert fragment_image_metadata["unsupported_images"] == 1, fragment_image_metadata
assert not fragment_image_metadata["self_contained_svg"], fragment_image_metadata

empty_image_source = safe_drawio.replace(
    '<mxCell id="target" value="Target" style="rounded=1;"',
    '<mxCell id="target" value="Target" style="shape=image;aspect=fixed;"',
)
empty_image_metadata = module["drawio_metadata"](
    root / "empty-image-source.drawio",
    empty_image_source.encode("utf-8"),
)
assert not empty_image_metadata["valid"], empty_image_metadata
assert "empty or truncated image source" in empty_image_metadata["error"], empty_image_metadata

empty_image_declaration = safe_drawio.replace(
    '<mxCell id="target" value="Target" style="rounded=1;"',
    '<mxCell id="target" value="Target" style="image=;aspect=fixed;"',
)
empty_image_declaration_metadata = module["drawio_metadata"](
    root / "empty-image-declaration.drawio",
    empty_image_declaration.encode("utf-8"),
)
assert not empty_image_declaration_metadata["valid"], empty_image_declaration_metadata
assert "empty or truncated image source" in empty_image_declaration_metadata["error"], empty_image_declaration_metadata

empty_bare_image = safe_drawio.replace(
    '<mxCell id="target" value="Target" style="rounded=1;"',
    '<mxCell id="target" value="Target" style="image;aspect=fixed;"',
)
empty_bare_image_metadata = module["drawio_metadata"](
    root / "empty-bare-image.drawio",
    empty_bare_image.encode("utf-8"),
)
assert not empty_bare_image_metadata["valid"], empty_bare_image_metadata
assert "empty or truncated image source" in empty_bare_image_metadata["error"], empty_bare_image_metadata
assert module["drawio_is_image_style"]("image;aspect=fixed;")

for public_empty_source in (empty_image_source, empty_image_declaration, empty_bare_image):
    public_empty_model = ET.fromstring(public_empty_source).find("diagram/mxGraphModel")
    public_empty_report = public_validator["validate_model"](
        "Empty image",
        public_empty_model,
        "generic",
        None,
        "preserve",
        True,
    )
    assert any(
        "image cell has an empty or missing image source" in error
        for error in public_empty_report["errors"]
    ), public_empty_report

embedded_then_remote = safe_drawio.replace(
    f"image={embedded_style_uri};aspect=fixed;",
    f"image={embedded_style_uri};image=https://last.example.invalid/icon.svg;aspect=fixed;",
)
embedded_then_remote_metadata = module["drawio_metadata"](
    root / "last-image-remote.drawio",
    embedded_then_remote.encode("utf-8"),
)
assert embedded_then_remote_metadata["valid"], embedded_then_remote_metadata
assert embedded_then_remote_metadata["embedded_svg_images"] == 0, embedded_then_remote_metadata
assert embedded_then_remote_metadata["external_references"] == 1, embedded_then_remote_metadata
assert not embedded_then_remote_metadata["self_contained_svg"], embedded_then_remote_metadata

remote_then_embedded = safe_drawio.replace(
    f"image={embedded_style_uri};aspect=fixed;",
    f"image=https://first.example.invalid/icon.svg;image={embedded_style_uri};aspect=fixed;",
)
remote_then_embedded_metadata = module["drawio_metadata"](
    root / "last-image-embedded.drawio",
    remote_then_embedded.encode("utf-8"),
)
assert remote_then_embedded_metadata["valid"], remote_then_embedded_metadata
assert remote_then_embedded_metadata["embedded_svg_images"] == 1, remote_then_embedded_metadata
assert remote_then_embedded_metadata["external_references"] == 0, remote_then_embedded_metadata
assert remote_then_embedded_metadata["self_contained_svg"], remote_then_embedded_metadata

html_remote_value = (
    '&lt;picture&gt;'
    '&lt;source srcset=&quot;#logo 1x, https://cdn.example.invalid/icon.svg 2x&quot;&gt;'
    '&lt;img src=&quot;#logo&quot; style=&quot;background-image:url(https://assets.example.invalid/icon.svg)&quot;&gt;'
    '&lt;/picture&gt;'
)
html_remote_drawio = safe_drawio.replace(
    'id="target" value="Target"',
    f'id="target" value="{html_remote_value}"',
)
html_remote_metadata = module["drawio_metadata"](
    root / "html-remote-sources.drawio",
    html_remote_drawio.encode("utf-8"),
)
assert html_remote_metadata["valid"], html_remote_metadata
assert html_remote_metadata["embedded_svg_images"] == 1, html_remote_metadata
assert html_remote_metadata["external_references"] == 2, html_remote_metadata
assert html_remote_metadata["unsupported_images"] == 1, html_remote_metadata
assert not html_remote_metadata["self_contained_svg"], html_remote_metadata
duplicate_srcset_value = (
    '&lt;source srcset=&quot;https://duplicate.example.invalid/icon.svg 2x&quot; '
    'srcset=&quot;#logo 1x&quot;&gt;'
)
duplicate_srcset_drawio = safe_drawio.replace(
    'id="target" value="Target"',
    f'id="target" value="{duplicate_srcset_value}"',
)
duplicate_srcset_metadata = module["drawio_metadata"](
    root / "duplicate-srcset.drawio",
    duplicate_srcset_drawio.encode("utf-8"),
)
assert duplicate_srcset_metadata["valid"], duplicate_srcset_metadata
assert duplicate_srcset_metadata["external_references"] == 1, duplicate_srcset_metadata
assert duplicate_srcset_metadata["unsupported_images"] == 1, duplicate_srcset_metadata
assert not duplicate_srcset_metadata["self_contained_svg"], duplicate_srcset_metadata
assert module["drawio_srcset_sources"](
    "#logo 1x, https://cdn.example.invalid/icon.svg 2x"
) == ["#logo", "https://cdn.example.invalid/icon.svg"]
assert module["drawio_srcset_sources"](
    f"{embedded_markerless_uri} 1x, https://cdn.example.invalid/fallback.svg 2x"
) == [embedded_markerless_uri, "https://cdn.example.invalid/fallback.svg"]
active_parser = module["DrawioImageSourceParser"]()
active_parser.feed('<mpath href="#logo"/>')
assert "active-content:mpath" in active_parser.sources, active_parser.sources

for navigation_href in (
    "docs/guide.html",
    "../guide.html#install",
    "/docs/guide.html",
    "https://docs.example.invalid/guide",
    "mailto:docs@example.invalid",
    "tel:+123456",
    "sms:+123456",
    "ftp://downloads.example.invalid/guide.pdf",
    "geo:0,0",
):
    navigation_value = html.escape(
        f'<a href="{navigation_href}">Docs</a>',
        quote=True,
    )
    navigation_drawio = safe_drawio.replace(
        'id="target" value="Target"',
        f'id="target" value="{navigation_value}"',
    )
    navigation_metadata = module["drawio_metadata"](
        root / "navigation.drawio",
        navigation_drawio.encode("utf-8"),
    )
    assert navigation_metadata["valid"], navigation_metadata
    assert navigation_metadata["external_references"] == 0, navigation_metadata
    assert navigation_metadata["unsupported_images"] == 0, navigation_metadata
    assert navigation_metadata["self_contained_svg"], navigation_metadata

resource_parser = module["DrawioImageSourceParser"]()
resource_parser.feed(
    '<a href="docs/guide.html">Docs</a>'
    '<svg><image href="https://cdn.example.invalid/image.svg"/>'
    '<use href="https://cdn.example.invalid/sprite.svg#mark"/></svg>'
)
assert "docs/guide.html" not in resource_parser.sources, resource_parser.sources
assert "https://cdn.example.invalid/image.svg" in resource_parser.sources, resource_parser.sources
assert "https://cdn.example.invalid/sprite.svg#mark" in resource_parser.sources, resource_parser.sources

unsafe_navigation_parser = module["DrawioImageSourceParser"]()
unsafe_navigation_parser.feed('<a href="javascript:alert(1)">Unsafe</a>')
assert "javascript:alert(1)" in unsafe_navigation_parser.sources, unsafe_navigation_parser.sources

def html_resource_drawio(markup):
    escaped_markup = html.escape(markup, quote=True)
    return safe_drawio.replace(
        'id="target" value="Target"',
        f'id="target" value="{escaped_markup}"',
    )

missing_html_resources = (
    "<img>",
    '<img src="" srcset="">',
    "<image>",
    '<image href="" xlink:href="">',
    "<source>",
    '<source src="" srcset="">',
)
fallback_html_resources = (
    f'<img src="" srcset="{embedded_markerless_uri} 1x">',
    f'<image href="" xlink:href="{embedded_markerless_uri}">',
    f'<source src="" srcset="{embedded_markerless_uri} 1x">',
)
for parser_name, parser_type in (
    ("rollout", module["DrawioImageSourceParser"]),
    ("public", public_validator["ImageSourceParser"]),
):
    for markup in missing_html_resources:
        parser = parser_type()
        parser.feed(markup)
        parser.close()
        assert any(
            source.startswith("missing-image-source:") for source in parser.sources
        ), (parser_name, markup, parser.sources)
    for markup in fallback_html_resources:
        parser = parser_type()
        parser.feed(markup)
        parser.close()
        assert not any(
            source.startswith("missing-image-source:") for source in parser.sources
        ), (parser_name, markup, parser.sources)
        assert embedded_markerless_uri in parser.sources, (parser_name, markup, parser.sources)

for markup in missing_html_resources:
    missing_html_metadata = module["drawio_metadata"](
        root / "missing-html-resource.drawio",
        html_resource_drawio(markup).encode("utf-8"),
    )
    assert missing_html_metadata["valid"], missing_html_metadata
    assert missing_html_metadata["unsupported_images"] == 1, missing_html_metadata
    assert not missing_html_metadata["self_contained_svg"], missing_html_metadata

for markup in fallback_html_resources:
    fallback_html_metadata = module["drawio_metadata"](
        root / "fallback-html-resource.drawio",
        html_resource_drawio(markup).encode("utf-8"),
    )
    assert fallback_html_metadata["valid"], fallback_html_metadata
    assert fallback_html_metadata["unsupported_images"] == 0, fallback_html_metadata
    assert fallback_html_metadata["self_contained_svg"], fallback_html_metadata

escaped_css_url = "u" + chr(92) + "72l(https://cdn.example.invalid/escaped.svg)"
unsafe_css_cases = (
    f'<span style="background:{escaped_css_url}">Escaped</span>',
    '<span style="@import url(https://cdn.example.invalid/import.css);">Import</span>',
    f'<style>.mark{{background:{escaped_css_url}}}</style><span class="mark">Escaped</span>',
    '<style>@import "https://cdn.example.invalid/import.css";.mark{background:url(https://cdn.example.invalid/visible.svg)}</style><span class="mark">Import</span>',
)
image_set_css_cases = (
    '<span style="background-image:image-set(&quot;https://cdn.example.invalid/one.png&quot; 1x, &quot;https://cdn.example.invalid/two.png&quot; 2x)">Image set</span>',
    '<style>.mark{background-image:-webkit-image-set("https://cdn.example.invalid/one.png" 1x)}</style><span class="mark">Image set</span>',
)
for parser_name, parser_type in (
    ("rollout", module["DrawioImageSourceParser"]),
    ("public", public_validator["ImageSourceParser"]),
):
    for markup in unsafe_css_cases:
        parser = parser_type()
        parser.feed(markup)
        parser.close()
        assert any(source.startswith("unsafe-css:") for source in parser.sources), (
            parser_name,
            markup,
            parser.sources,
        )
    mixed_parser = parser_type()
    mixed_parser.feed(unsafe_css_cases[-1])
    mixed_parser.close()
    assert "https://cdn.example.invalid/visible.svg" in mixed_parser.sources, (
        parser_name,
        mixed_parser.sources,
    )
    for markup in image_set_css_cases:
        parser = parser_type()
        parser.feed(markup)
        parser.close()
        assert "unsupported-css:image-set" in parser.sources, (
            parser_name,
            markup,
            parser.sources,
        )

for markup in unsafe_css_cases + image_set_css_cases:
    unsafe_css_metadata = module["drawio_metadata"](
        root / "unsafe-css.drawio",
        html_resource_drawio(markup).encode("utf-8"),
    )
    assert unsafe_css_metadata["valid"], unsafe_css_metadata
    assert unsafe_css_metadata["unsupported_images"] >= 1, unsafe_css_metadata
    assert not unsafe_css_metadata["self_contained_svg"], unsafe_css_metadata

for raw_url, normalized_url in (
    (chr(0) + " " + chr(9) + "java" + chr(10) + "script:alert(1)" + chr(13) + chr(31), "javascript:alert(1)"),
    ("java" + chr(9) + "script:alert(1)", "javascript:alert(1)"),
    ("vb" + chr(13) + "script:msgbox(1)", "vbscript:msgbox(1)"),
    ("data:" + chr(10) + "text/html,unsafe", "data:text/html,unsafe"),
):
    assert module["normalize_url_for_scheme"](raw_url) == normalized_url
    assert public_validator["normalize_url_for_scheme"](raw_url) == normalized_url
    for parser_name, parser_type in (
        ("rollout", module["DrawioImageSourceParser"]),
        ("public", public_validator["ImageSourceParser"]),
    ):
        parser = parser_type()
        parser.feed(f'<a href="{raw_url}">Unsafe</a>')
        parser.close()
        assert parser.sources, (parser_name, raw_url, parser.sources)

for unsafe_name, unsafe_href in (
    ("javascript-lf", "java&#10;script:alert(1)"),
    ("javascript-tab", "java&#9;script:alert(1)"),
    ("vbscript-cr", "vb&#13;script:msgbox(1)"),
    ("data-html-lf", "data:&#10;text/html,unsafe"),
    ("trimmed-c0", " &#9;javascript:alert(1)&#13; "),
):
    unsafe_navigation_value = (
        f'&lt;a href=&quot;{unsafe_href}&quot;&gt;Unsafe&lt;/a&gt;'
    )
    unsafe_navigation_drawio = safe_drawio.replace(
        'id="target" value="Target"',
        f'id="target" value="{unsafe_navigation_value}"',
    )
    unsafe_navigation_metadata = module["drawio_metadata"](
        root / f"unsafe-navigation-{unsafe_name}.drawio",
        unsafe_navigation_drawio.encode("utf-8"),
    )
    assert unsafe_navigation_metadata["valid"], unsafe_navigation_metadata
    assert unsafe_navigation_metadata["unsupported_images"] == 1, unsafe_navigation_metadata
    assert not unsafe_navigation_metadata["self_contained_svg"], unsafe_navigation_metadata

for profile_visibility_name, profile_visibility_source in (
    (
        "hidden-profile-cell",
        safe_drawio.replace(
            '<mxCell id="profile-operator-grid"',
            '<mxCell id="profile-operator-grid" visible="0"',
        ),
    ),
    (
        "hidden-profile-layer",
        safe_drawio.replace(
            '<mxCell id="1" parent="0"/>',
            '<mxCell id="1" parent="0" visible="0"/>',
        ),
    ),
    (
        "zero-size-profile-cell",
        safe_drawio.replace(
            '<mxGeometry x="400" y="160" width="120" height="60" as="geometry"/>',
            '<mxGeometry x="400" y="160" width="0" height="0" as="geometry"/>',
        ),
    ),
):
    profile_visibility_metadata = module["drawio_metadata"](
        root / f"{profile_visibility_name}.drawio",
        profile_visibility_source.encode("utf-8"),
    )
    assert profile_visibility_metadata["valid"], profile_visibility_metadata
    assert not profile_visibility_metadata["profile_style_sha256s"], profile_visibility_metadata
    assert not profile_visibility_metadata["page_graphs"][0]["profile_style_sha256s"], profile_visibility_metadata

terminal_image_style = safe_drawio.replace(
    f'image={embedded_style_uri};aspect=fixed;dataRole=component;',
    f'aspect=fixed;dataRole=component;image={embedded_style_uri};',
)
terminal_image_metadata = module["drawio_metadata"](
    root / "terminal-image-style.drawio",
    terminal_image_style.encode("utf-8"),
)
assert terminal_image_metadata["valid"] and terminal_image_metadata["self_contained_svg"], terminal_image_metadata

wrapped_cell = f'''        <object id="logo" label="Northstar" link="https://docs.example.invalid/product"><mxCell style="shape=image;image={embedded_style_uri};aspect=fixed;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="64" height="64" as="geometry"/>
        </mxCell></object>'''
plain_logo_cell = f'''        <mxCell id="logo" value="Northstar" link="https://docs.example.invalid/product" style="shape=image;image={embedded_style_uri};aspect=fixed;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="64" height="64" as="geometry"/>
        </mxCell>'''
wrapped_drawio = safe_drawio.replace(plain_logo_cell, wrapped_cell)
assert wrapped_drawio != safe_drawio
wrapped_metadata = module["drawio_metadata"](
    root / "wrapped.drawio",
    wrapped_drawio.encode("utf-8"),
)
assert wrapped_metadata["valid"] and wrapped_metadata["self_contained_svg"], wrapped_metadata
assert hashlib.sha256(b"logo").hexdigest() in wrapped_metadata["cell_id_sha256s"], wrapped_metadata
wrapped_remote_metadata = module["drawio_metadata"](
    root / "wrapped-remote.drawio",
    wrapped_drawio.replace(embedded_style_uri, "https://example.invalid/logo.svg").encode("utf-8"),
)
assert wrapped_remote_metadata["valid"] and not wrapped_remote_metadata["self_contained_svg"], wrapped_remote_metadata
assert not module["drawio_metadata"](
    root / "wrapped-missing-geometry.drawio",
    wrapped_drawio.replace('<mxGeometry x="40" y="40" width="64" height="64" as="geometry"/>', "").encode("utf-8"),
)["valid"]
near_empty_drawio = b'''<mxfile><diagram name="Empty"><mxGraphModel><root>
  <mxCell id="0"/><mxCell id="1" parent="0"/>
</root></mxGraphModel></diagram></mxfile>'''
assert not module["drawio_metadata"](root / "near-empty.drawio", near_empty_drawio)["valid"]
assert not module["drawio_metadata"](
    root / "missing-vertex-geometry.drawio",
    safe_drawio.replace(
        '<mxGeometry x="40" y="160" width="120" height="60" as="geometry"/>',
        '',
        1,
    ).encode("utf-8"),
)["valid"]
assert not module["drawio_metadata"](
    root / "nonfinite-vertex.drawio",
    safe_drawio.replace('x="40" y="160"', 'x="NaN" y="160"', 1).encode("utf-8"),
)["valid"]
assert not module["drawio_metadata"](
    root / "missing-relative-edge.drawio",
    safe_drawio.replace(
        '<mxGeometry relative="1" as="geometry"/>',
        '<mxGeometry as="geometry"/>',
        1,
    ).encode("utf-8"),
)["valid"]
assert not module["drawio_metadata"](
    root / "nonvertex-endpoint.drawio",
    safe_drawio.replace('source="source"', 'source="1"', 1).encode("utf-8"),
)["valid"]
assert not module["drawio_metadata"](
    root / "missing-terminal.drawio",
    safe_drawio.replace(' target="target"', '', 1).encode("utf-8"),
)["valid"]
explicit_terminals = safe_drawio.replace(
    ' source="source" target="target"',
    '',
    1,
).replace(
    '<mxGeometry relative="1" as="geometry"/>',
    '<mxGeometry relative="1" as="geometry"><mxPoint x="160" y="190" as="sourcePoint"/><mxPoint x="240" y="190" as="targetPoint"/></mxGeometry>',
    1,
)
assert module["drawio_metadata"](
    root / "explicit-terminals.drawio",
    explicit_terminals.encode("utf-8"),
)["valid"]
assert not module["drawio_metadata"](
    root / "nonfinite-terminal.drawio",
    explicit_terminals.replace('x="160"', 'x="Infinity"', 1).encode("utf-8"),
)["valid"]
assert not module["drawio_metadata"](
    root / "missing-parent.drawio",
    safe_drawio.replace(
        'id="source" value="Source" style="shape=mxgraph.aws4.compute;" vertex="1" parent="1"',
        'id="source" value="Source" style="shape=mxgraph.aws4.compute;" vertex="1" parent="missing"',
        1,
    ).encode("utf-8"),
)["valid"]
parent_cycle = safe_drawio.replace(
    'id="source" value="Source" style="shape=mxgraph.aws4.compute;" vertex="1" parent="1"',
    'id="source" value="Source" style="shape=mxgraph.aws4.compute;" vertex="1" parent="target"',
    1,
).replace(
    'id="target" value="Target" style="rounded=1;" vertex="1" parent="1"',
    'id="target" value="Target" style="rounded=1;" vertex="1" parent="source"',
    1,
)
assert not module["drawio_metadata"](
    root / "parent-cycle.drawio",
    parent_cycle.encode("utf-8"),
)["valid"]

compressed_metadata = module["drawio_metadata"](
    root / "compressed.drawio",
    compressed_drawio(embedded_uri).encode("utf-8"),
)
assert compressed_metadata["valid"] and not compressed_metadata["uncompressed"], compressed_metadata
assert compressed_metadata["self_contained_svg"], compressed_metadata
assert compressed_metadata["animation_on"] and not compressed_metadata["animation_off"], compressed_metadata
assert compressed_metadata["embedded_svg_sha256s"] == [hashlib.sha256(embedded_svg).hexdigest()]
encoded_malformed_percent = urllib.parse.quote(
    ET.tostring(ET.fromstring(safe_drawio).find("diagram/mxGraphModel"), encoding="unicode"),
    safe="",
).replace("Source", "%GG", 1)
compressor = zlib.compressobj(level=9, wbits=-15)
malformed_percent_payload = base64.b64encode(
    compressor.compress(encoded_malformed_percent.encode("utf-8")) + compressor.flush()
).decode("ascii")
malformed_percent_drawio = f'<mxfile><diagram name="Broken">{malformed_percent_payload}</diagram></mxfile>'
assert not module["drawio_metadata"](
    root / "malformed-percent.drawio",
    malformed_percent_drawio.encode("utf-8"),
)["valid"]
assert not module["drawio_metadata"](
    root / "garbage-compressed.drawio",
    b'<mxfile><diagram name="Broken">not-valid-base64!</diagram></mxfile>',
)["valid"]
for unsafe_inner_xml in (
    '<!DOCTYPE mxGraphModel [<!ENTITY x "boom">]><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>',
    '<mxGraphModel><?unsafe?><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>',
):
    unsafe_compressed = (
        '<mxfile><diagram name="Unsafe">'
        + compressed_payload(unsafe_inner_xml)
        + '</diagram></mxfile>'
    ).encode("utf-8")
    assert not module["drawio_metadata"](
        root / "unsafe-compressed.drawio",
        unsafe_compressed,
    )["valid"]
original_inflated_drawio_limit = module["drawio_metadata"].__globals__["MAX_INFLATED_DRAWIO_BYTES"]
module["drawio_metadata"].__globals__["MAX_INFLATED_DRAWIO_BYTES"] = 64
assert not module["drawio_metadata"](
    root / "inflated-limit.drawio",
    compressed_drawio(embedded_uri).encode("utf-8"),
)["valid"]
module["drawio_metadata"].__globals__["MAX_INFLATED_DRAWIO_BYTES"] = original_inflated_drawio_limit

static_animation = module["drawio_metadata"](
    root / "static-animation.drawio",
    drawio(embedded_style_uri, role="ownership").encode("utf-8"),
)
assert static_animation["valid"] and static_animation["animated_static_edges"] == 1
assert not static_animation["animation_on"] and not static_animation["animation_off"]
assert hashlib.sha256(b"source\\0target").hexdigest() in static_animation["directed_edge_sha256s"]
no_arrow_animation = module["drawio_metadata"](
    root / "no-arrow-animation.drawio",
    drawio(embedded_style_uri).replace("endArrow=block;", "endArrow=none;startArrow=none;").encode("utf-8"),
)
assert no_arrow_animation["valid"] and not no_arrow_animation["animation_on"], no_arrow_animation

bom_metadata = module["drawio_metadata"](
    root / "bom.drawio",
    b'\\xef\\xbb\\xbf<?xml version="1.0" encoding="UTF-8"?>' + drawio(embedded_style_uri).encode("utf-8"),
)
assert bom_metadata["valid"], bom_metadata

invalid_animation = module["drawio_metadata"](
    root / "invalid-animation.drawio",
    drawio(embedded_style_uri, animation_suffix=";flowAnimationUnknown=1").encode("utf-8"),
)
assert not invalid_animation["valid"], invalid_animation
malformed_image = module["drawio_metadata"](
    root / "malformed-image.drawio",
    drawio("data:image/svg+xml,%3Csvg%2F%3E").encode("utf-8"),
)
assert not malformed_image["valid"], malformed_image
truncated_image = module["drawio_metadata"](
    root / "truncated-image-data-uri.drawio",
    drawio("data:image/svg+xml;base64,").encode("utf-8"),
)
assert not truncated_image["valid"], truncated_image
malformed_percent_image = module["drawio_metadata"](
    root / "malformed-percent-image.drawio",
    drawio("data:image/svg+xml,%GG").encode("utf-8"),
)
assert not malformed_percent_image["valid"], malformed_percent_image
original_drawio_element_limit = module["drawio_metadata"].__globals__["MAX_DRAWIO_ELEMENTS"]
module["drawio_metadata"].__globals__["MAX_DRAWIO_ELEMENTS"] = 4
assert not module["drawio_metadata"](
    root / "too-many-drawio-elements.drawio",
    drawio(embedded_style_uri).encode("utf-8"),
)["valid"]
module["drawio_metadata"].__globals__["MAX_DRAWIO_ELEMENTS"] = original_drawio_element_limit

compressed_source = ET.fromstring(safe_drawio)
compressed_model = ET.tostring(compressed_source.find("diagram/mxGraphModel"), encoding="unicode")
compressed_model_payload = compressed_payload(compressed_model)
two_compressed_pages = (
    '<mxfile><diagram name="One">'
    + compressed_model_payload
    + '</diagram><diagram name="Two">'
    + compressed_model_payload
    + '</diagram></mxfile>'
)
outer_elements = len(list(ET.fromstring(two_compressed_pages).iter()))
model_elements = len(list(ET.fromstring(compressed_model).iter()))
module["drawio_metadata"].__globals__["MAX_DRAWIO_ELEMENTS"] = outer_elements + model_elements
assert not module["drawio_metadata"](
    root / "aggregate-element-limit.drawio",
    two_compressed_pages.encode("utf-8"),
)["valid"]
module["drawio_metadata"].__globals__["MAX_DRAWIO_ELEMENTS"] = original_drawio_element_limit

public_source = root / "public-validator.drawio"
public_source.write_text(safe_drawio, encoding="utf-8")
assert len(public_validator["parse_models"](public_source)) == 1
public_globals = public_validator["parse_models"].__globals__
for limit_name, low_limit in (
    ("MAX_DRAWIO_SOURCE_BYTES", 64),
    ("MAX_DRAWIO_ELEMENTS", 4),
    ("MAX_DRAWIO_DEPTH", 2),
):
    original_limit = public_globals[limit_name]
    public_globals[limit_name] = low_limit
    try:
        public_validator["parse_models"](public_source)
    except ValueError:
        pass
    else:
        raise AssertionError(f"public validator did not enforce {limit_name}")
    finally:
        public_globals[limit_name] = original_limit

public_malformed_percent = root / "public-malformed-percent.drawio"
public_malformed_percent.write_text(malformed_percent_drawio, encoding="utf-8")
try:
    public_validator["parse_models"](public_malformed_percent)
except ValueError:
    pass
else:
    raise AssertionError("public validator accepted malformed compressed percent encoding")

for public_name, public_xml, expected_fragment in (
    (
        "public-nonfinite-geometry.drawio",
        safe_drawio.replace('x="40" y="160"', 'x="NaN" y="160"', 1),
        "mxGeometry x must be finite",
    ),
    (
        "public-nonfinite-point.drawio",
        explicit_terminals.replace('x="160"', 'x="Infinity"', 1),
        "mxPoint x must be finite",
    ),
):
    public_path = root / public_name
    public_path.write_text(public_xml, encoding="utf-8")
    page_name, model = public_validator["parse_models"](public_path)[0]
    public_report = public_validator["validate_model"](
        page_name,
        model,
        "generic",
        None,
        "preserve",
        False,
    )
    assert any(expected_fragment in error for error in public_report["errors"]), public_report

public_two_pages = root / "public-two-compressed.drawio"
public_two_pages.write_text(two_compressed_pages, encoding="utf-8")
encoded_model_bytes = len(urllib.parse.quote(compressed_model, safe="").encode("utf-8"))
original_public_inflated_limit = public_globals["MAX_INFLATED_DIAGRAM_BYTES"]
public_globals["MAX_INFLATED_DIAGRAM_BYTES"] = encoded_model_bytes * 2 - 1
try:
    public_validator["parse_models"](public_two_pages)
except ValueError:
    pass
else:
    raise AssertionError("public validator did not enforce aggregate inflated bytes")
finally:
    public_globals["MAX_INFLATED_DIAGRAM_BYTES"] = original_public_inflated_limit

outer_public_elements = len(list(ET.fromstring(two_compressed_pages).iter()))
decoded_public_elements = len(list(ET.fromstring(compressed_model).iter()))
original_public_element_limit = public_globals["MAX_DRAWIO_ELEMENTS"]
public_globals["MAX_DRAWIO_ELEMENTS"] = outer_public_elements + decoded_public_elements
try:
    public_validator["parse_models"](public_two_pages)
except ValueError:
    pass
else:
    raise AssertionError("public validator did not enforce aggregate decoded elements")
finally:
    public_globals["MAX_DRAWIO_ELEMENTS"] = original_public_element_limit

old_workspace_limit = module["collect_artifacts"].__globals__["MAX_WORKSPACE_ENTRIES"]
module["collect_artifacts"].__globals__["MAX_WORKSPACE_ENTRIES"] = 2
assert len(module["collect_artifacts"](drawio_workspace)) == 2
module["collect_artifacts"].__globals__["MAX_WORKSPACE_ENTRIES"] = old_workspace_limit

drawio_quota = root / "drawio-quota"
drawio_quota.mkdir()
(drawio_quota / "large.drawio").write_text("x" * 64, encoding="utf-8")
module["collect_artifacts"].__globals__["MAX_ARTIFACT_TOTAL_BYTES"] = 32
try:
    module["collect_artifacts"](drawio_quota)
except module["ArtifactPolicyError"]:
    pass
else:
    raise AssertionError("draw.io artifacts did not use the aggregate byte quota")

quota = root / "quota"
quota.mkdir()
(quota / "one.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg"><text>one</text></svg>', encoding="utf-8")
(quota / "two.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg"><text>two</text></svg>', encoding="utf-8")
module["collect_artifacts"].__globals__["MAX_ARTIFACT_TOTAL_BYTES"] = 32
try:
    module["collect_artifacts"](quota)
except module["ArtifactPolicyError"]:
    pass
else:
    raise AssertionError("artifact total-byte quota was not enforced")

count = root / "count"
count.mkdir()
module["collect_artifacts"].__globals__["MAX_ARTIFACT_TOTAL_BYTES"] = 64 * 1024 * 1024
for index in range(module["MAX_ARTIFACT_COUNT"] + 1):
    (count / f"{index:02d}.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg"><text>x</text></svg>', encoding="utf-8")
try:
    module["collect_artifacts"](count)
except module["ArtifactPolicyError"]:
    pass
else:
    raise AssertionError("artifact count quota was not enforced")

snapshot_workspace = root / "snapshot-workspace"
snapshot_workspace.mkdir()
snapshot_path = snapshot_workspace / "result.svg"
snapshot_bytes = b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><text>Original</text></svg>'
replacement_bytes = b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><text>Changed!</text></svg>'
snapshot_path.write_bytes(snapshot_bytes)
original_svg_metadata = module["collect_artifacts"].__globals__["svg_metadata"]

def mutate_after_snapshot(path, data):
    assert data == snapshot_bytes
    path.write_bytes(replacement_bytes)
    return original_svg_metadata(path, data)

module["collect_artifacts"].__globals__["svg_metadata"] = mutate_after_snapshot
snapshot_artifact = module["collect_artifacts"](snapshot_workspace)[0]
module["collect_artifacts"].__globals__["svg_metadata"] = original_svg_metadata
assert snapshot_artifact["sha256"] == hashlib.sha256(snapshot_bytes).hexdigest(), snapshot_artifact
assert snapshot_artifact["visible_text"] == "Original", snapshot_artifact

changing_workspace = root / "changing-workspace"
changing_workspace.mkdir()
changing_path = changing_workspace / "result.svg"
changing_path.write_bytes(snapshot_bytes)
module_os = module["read_artifact_snapshot"].__globals__["os"]
original_read = module_os.read
changed = False

def change_during_read(descriptor, size):
    global changed
    data = original_read(descriptor, size)
    if data and not changed:
        changed = True
        changing_path.write_bytes(replacement_bytes)
    return data

module_os.read = change_during_read
try:
    module["collect_artifacts"](changing_workspace)
except module["ArtifactPolicyError"]:
    pass
else:
    raise AssertionError("artifact mutation during the descriptor read was not detected")
finally:
    module_os.read = original_read

outside_dir = root / "outside-dir"
outside_dir.mkdir()
(outside_dir / "outside.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg"><text>outside</text></svg>', encoding="utf-8")
symlink_workspace = root / "symlink-workspace"
symlink_workspace.mkdir()
(symlink_workspace / "linked-dir").symlink_to(outside_dir, target_is_directory=True)
assert module["collect_artifacts"](symlink_workspace) == []

symlink_file_workspace = root / "symlink-file-workspace"
symlink_file_workspace.mkdir()
(symlink_file_workspace / "outside.svg").symlink_to(outside_dir / "outside.svg")
assert module["collect_artifacts"](symlink_file_workspace) == []
assert "O_NOFOLLOW" in module["read_artifact_snapshot"].__code__.co_names
assert "O_NONBLOCK" in module["read_artifact_snapshot"].__code__.co_names
if hasattr(os, "mkfifo"):
    fifo_workspace = root / "fifo-workspace"
    fifo_workspace.mkdir()
    os.mkfifo(fifo_workspace / "blocked.svg")
    try:
        module["collect_artifacts"](fifo_workspace)
    except module["ArtifactPolicyError"]:
        pass
    else:
        raise AssertionError("FIFO artifact did not fail closed")
`;
  try {
    run("SkillOpt rollout artifact-policy smoke", "python3", ["-c", python], {
      env: {
        ...process.env,
        ROLLOUT_TEMPLATE: template,
        PUBLIC_DRAWIO_VALIDATOR: path.join(
          root,
          "skills/engineering-workflows/drawio-diagrams/scripts/validate_drawio.py",
        ),
        TEST_ROOT: tempDir,
      },
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function validateProviderTargetRollout() {
  if (!hasPython3()) {
    console.warn("python3 unavailable; skipping provider target rollout smoke");
    return;
  }
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-provider-rollout-"));
  const skillName = "provider-rollout-skill";
  const secret = `sk-provider${"7".repeat(24)}`;
  const errorSecret = `sk-error${"8".repeat(24)}`;
  const template = path.join(assetRoot, "rollout.py.template");
  try {
    writeFile(path.join(tempRepo, "package.json"), "{}\n");
    writeFile(path.join(tempRepo, "AGENTS.md"), "# Test repo\n");
    writeFile(
      path.join(tempRepo, "skills/engineering-workflows", skillName, "SKILL.md"),
      `---
name: ${skillName}
description: Temporary provider rollout skill used only by the SkillOpt validator.
---

# Provider Rollout Skill
`,
    );
    writeFile(
      path.join(tempRepo, "skills/engineering-workflows", skillName, "references/provider-rule.md"),
      `# Provider rule\n\nUse fixture evidence. Synthetic token that must be redacted: ${secret}\n`,
    );
    const fixture = `skill-evals/${skillName}/fixtures/input.txt`;
    const oversized = `skill-evals/${skillName}/fixtures/oversized.txt`;
    const binary = `skill-evals/${skillName}/fixtures/binary.dat`;
    writeFile(path.join(tempRepo, fixture), "fixture evidence is present\n");
    writeFile(path.join(tempRepo, oversized), "x".repeat(64 * 1024 + 1));
    fs.writeFileSync(path.join(tempRepo, binary), Buffer.from([0, 1, 2, 3]));

    const python = `
import json
import runpy
import sys
import types

calls = []
model = types.ModuleType("skillopt.model")
def chat_target(**kwargs):
    calls.append(kwargs)
    return "provider response", {"prompt_tokens": 4, "completion_tokens": 2}
model.chat_target = chat_target
def chat_optimizer(**kwargs):
    return json.dumps({"passed": True, "score": 1.0, "reason": "semantic pass", "assertions": []}), {"prompt_tokens": 3, "completion_tokens": 2}
model.chat_optimizer = chat_optimizer
skillopt = types.ModuleType("skillopt")
skillopt.model = model
sys.modules["skillopt"] = skillopt
sys.modules["skillopt.model"] = model

module = runpy.run_path(sys.argv[1])
evaluator_module = runpy.run_path(sys.argv[2])
rollout = module["AgentSkillsRollout"]({"target_backend": "openai_chat", "exec_timeout": 10})
base = {
    "id": "provider-text",
    "skill_name": ${JSON.stringify(skillName)},
    "prompt": "Use the provider resources.",
    "fixtures": [${JSON.stringify(fixture)}],
    "visual_assertions": [],
}
text = rollout.run(base, "# Test Skill")
visual = rollout.run({**base, "id": "provider-visual", "visual_assertions": ["artifact_exists: *.png"]}, "# Test Skill")
oversized = rollout.run({**base, "id": "provider-oversized", "fixtures": [${JSON.stringify(oversized)}]}, "# Test Skill")
binary = rollout.run({**base, "id": "provider-binary", "fixtures": [${JSON.stringify(binary)}]}, "# Test Skill")

evaluator = evaluator_module["AgentSkillsEvaluator"]({"judge_backend": "provider"})
semantic = evaluator.score(
    {
        "id": "provider-semantic-judge",
        "skill_name": ${JSON.stringify(skillName)},
        "expected_behavior": ["Preserve architecture boundaries exactly"],
    },
    {
        "returncode": 0,
        "response": "The module separation remains intact.",
        "artifacts": [],
    },
)
unsafe_evaluator = evaluator_module["AgentSkillsEvaluator"]({
    "judge_backend": "provider",
    "optimizer_backend": "claude_chat",
})
unsafe_semantic = unsafe_evaluator.score(
    {
        "id": "provider-unsafe-optimizer",
        "skill_name": ${JSON.stringify(skillName)},
        "expected_behavior": ["semantic requirement"],
    },
    {"returncode": 0, "response": "candidate response", "artifacts": []},
)
def failing_chat_optimizer(**kwargs):
    raise RuntimeError(${JSON.stringify(errorSecret)})
model.chat_optimizer = failing_chat_optimizer
semantic_failed = evaluator.score(
    {
        "id": "provider-semantic-error",
        "skill_name": ${JSON.stringify(skillName)},
        "expected_behavior": ["semantic requirement"],
    },
    {"returncode": 0, "response": "candidate response", "artifacts": []},
)

def failing_chat_target(**kwargs):
    raise RuntimeError(${JSON.stringify(errorSecret)})
model.chat_target = failing_chat_target
failed = rollout.run({**base, "id": "provider-failed"}, "# Test Skill")
print(json.dumps({
    "text": text,
    "visual": visual,
    "oversized": oversized,
    "binary": binary,
    "semantic": semantic,
    "unsafe_semantic": unsafe_semantic,
    "semantic_failed": semantic_failed,
    "failed": failed,
    "calls": calls,
}))
`;
    const smoke = spawnSync(
      "python3",
      ["-c", python, template, path.join(assetRoot, "evaluator.py.template")],
      {
        cwd: tempRepo,
        encoding: "utf8",
        timeout: 30000,
      },
    );
    if (smoke.status !== 0) {
      fail(
        `provider target rollout smoke failed: ${smoke.status}\n${smoke.stdout}\n${smoke.stderr}`,
      );
    }
    const parsed = JSON.parse(smoke.stdout);
    if (
      parsed.text.returncode !== 0 ||
      parsed.text.response !== "provider response" ||
      parsed.text.target_backend !== "openai_chat"
    ) {
      fail(`provider target did not use chat_target: ${JSON.stringify(parsed.text)}`);
    }
    const providerPrompt = parsed.calls[0]?.user || "";
    for (const expected of [
      "provider-rule.md",
      "Use fixture evidence",
      "fixtures/input.txt",
      "fixture evidence is present",
    ]) {
      if (!providerPrompt.includes(expected)) {
        fail(`provider target prompt omitted bounded resource content ${expected}`);
      }
    }
    if (providerPrompt.includes(secret) || !providerPrompt.includes("[redacted-token]")) {
      fail("provider target resource snapshot did not redact a secret-like value");
    }
    if (parsed.visual.returncode !== 126 || !parsed.visual.visual_rollout_blocker) {
      fail("provider target did not fail closed for active visual assertions");
    }
    if (parsed.semantic.hard !== 1 || parsed.semantic.judge_backend !== "provider") {
      fail(
        `provider semantic judge did not score a paraphrased response: ${JSON.stringify(parsed.semantic)}`,
      );
    }
    if (
      parsed.unsafe_semantic.hard !== 0 ||
      parsed.unsafe_semantic.judge_backend !== "provider" ||
      !parsed.unsafe_semantic.judge_reason.includes("does not support optimizer_backend") ||
      !parsed.unsafe_semantic.assertion_results?.some(
        (item) => item.text === "Provider semantic judge completed",
      )
    ) {
      fail("provider semantic judge accepted an unsafe local optimizer backend");
    }
    if (
      parsed.semantic_failed.hard !== 0 ||
      parsed.semantic_failed.judge_reason.includes(errorSecret) ||
      !parsed.semantic_failed.judge_reason.includes("[redacted-token]")
    ) {
      fail("provider semantic judge failure diagnostics leaked a secret-like value");
    }
    if (
      parsed.oversized.returncode !== 127 ||
      parsed.binary.returncode !== 127 ||
      !parsed.oversized.resource_snapshot_blocker ||
      !parsed.binary.resource_snapshot_blocker
    ) {
      fail("provider target accepted oversized or binary fixture context");
    }
    if (
      parsed.failed.returncode !== 1 ||
      parsed.failed.stderr.includes(errorSecret) ||
      !parsed.failed.stderr.includes("[redacted-token]")
    ) {
      fail("provider target failure diagnostics leaked a secret-like value");
    }
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

async function validateCodexJudgeAndReflectorIsolation() {
  if (!hasPython3()) {
    console.warn("python3 unavailable; skipping Codex judge/reflector isolation smoke");
    return;
  }
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-codex-analysis-isolation-"));
  const fakeCodex = path.join(tempDir, "fake-codex");
  const noReadCodex = path.join(tempDir, "fake-codex-no-read");
  const partialEchoCodex = path.join(tempDir, "fake-codex-partial-echo");
  const noReadChildPidFile = path.join(tempDir, "no-read-child.pid");
  const expectationsFile = path.join(tempDir, "prompt-expectations.json");
  const reportDir = path.join(tempDir, "reports");
  const promptMarker = "stdin-only-marker-7f3b2c91";
  const failureMarker = "stdin-judge-failure-marker-45a8";
  fs.mkdirSync(reportDir, { recursive: true });
  writeFile(
    fakeCodex,
    `#!/usr/bin/env python3
import hashlib
import json
import os
import pathlib
import subprocess
import sys

args = sys.argv[1:]
prompt_bytes = sys.stdin.buffer.read()
prompt = prompt_bytes.decode("utf-8", errors="strict")
output_index = args.index("--output-last-message")
output = pathlib.Path(args[output_index + 1])
kind = "judge" if output.name == "judge.json" else ("reflector" if output.name == "patch.json" else "direct")
helper = subprocess.Popen(
    [sys.executable, "-c", "import signal,time; signal.signal(signal.SIGTERM, lambda *_: None); time.sleep(3600)"],
)
pathlib.Path(${JSON.stringify(reportDir)}, kind + ".json").write_text(
    json.dumps({
        "args": args,
        "environment_keys": sorted(os.environ),
        "child_pid": helper.pid,
        "stdin_bytes": len(prompt_bytes),
        "stdin_sha256": hashlib.sha256(prompt_bytes).hexdigest(),
        "stdin_has_marker": ${JSON.stringify(promptMarker)} in prompt,
    }),
    encoding="utf-8",
)
sys.stdout.buffer.write(b"child-stdout-prefix\\n" + prompt_bytes + b"\\nchild-stdout-suffix\\n")
sys.stderr.buffer.write(b"child-stderr-prefix\\n" + prompt_bytes + b"\\nchild-stderr-suffix\\n")
if ${JSON.stringify(failureMarker)} in prompt:
    raise SystemExit(9)
payload = (
    {"passed": True, "score": 1.0, "reason": "semantic pass", "assertions": []}
    if kind == "judge"
    else {"raw_patches": [{"source_type": "failure", "patch": {"reasoning": "bounded fix", "edits": [{"op": "replace", "target": "old", "content": "new"}]}}]}
)
output.write_text(json.dumps(payload), encoding="utf-8")
`,
  );
  writeFile(
    noReadCodex,
    `#!/usr/bin/env python3
import pathlib
import signal
import subprocess
import sys
import time

signal.signal(signal.SIGTERM, lambda *_: None)
helper = subprocess.Popen(
    [sys.executable, "-c", "import signal,time; signal.signal(signal.SIGTERM, lambda *_: None); time.sleep(3600)"],
)
pathlib.Path(${JSON.stringify(noReadChildPidFile)}).write_text(str(helper.pid), encoding="utf-8")
while True:
    time.sleep(3600)
`,
  );
  writeFile(
    partialEchoCodex,
    `#!/usr/bin/env python3
import sys
import time

prompt = sys.stdin.read()
sys.stdout.write("stdout-diagnostic:" + prompt[:1] + ":stdout-tail")
sys.stdout.flush()
middle = max(0, len(prompt) // 2)
sys.stderr.write("stderr-diagnostic:" + prompt[middle:middle + 7] + ":stderr-tail")
sys.stderr.flush()
time.sleep(3600)
`,
  );
  fs.chmodSync(fakeCodex, 0o755);
  fs.chmodSync(noReadCodex, 0o755);
  fs.chmodSync(partialEchoCodex, 0o755);
  const python = `
import hashlib
import json
import os
import runpy
import subprocess
import sys
from pathlib import Path

evaluator_module = runpy.run_path(sys.argv[1])
reflector_module = runpy.run_path(sys.argv[2])
fake_codex = sys.argv[3]
out_dir = Path(sys.argv[4])
no_read_codex = sys.argv[5]
expectations_path = Path(sys.argv[6])
partial_echo_codex = sys.argv[7]
out_dir.mkdir(parents=True, exist_ok=True)
prompt_marker = ${JSON.stringify(promptMarker)}
failure_marker = ${JSON.stringify(failureMarker)}
unicode_suffix = "Gr\\u00fc\\u00dfe \\U0001f44b"
large_prompt = prompt_marker + ":" + unicode_suffix + ":" + ("j" * (140 * 1024))

evaluator = evaluator_module["AgentSkillsEvaluator"]({
    "judge_backend": "codex_cli",
    "codex_exec_path": fake_codex,
    "codex_cli_judge_timeout": 10,
})
failure_case = {
    "id": "judge-echo-failure",
    "skill_name": "test",
    "prompt": failure_marker + ":" + unicode_suffix,
    "expected_behavior": ["semantic pass"],
}
failure_score = evaluator.score(
    failure_case,
    {"returncode": 0, "response": "candidate response", "artifacts": []},
)
assert failure_score["hard"] == 0, failure_score
assert failure_marker not in failure_score["judge_reason"], failure_score
assert "[redacted-prompt]" in failure_score["judge_reason"], failure_score
assert "child-stderr-prefix" in failure_score["judge_reason"], failure_score
assert "child-stderr-suffix" in failure_score["judge_reason"], failure_score

judge_case = {
    "id": "judge-isolation",
    "skill_name": "test",
    "prompt": large_prompt,
    "expected_behavior": ["semantic pass"],
}
judge_response = {"returncode": 0, "response": "candidate response", "artifacts": []}
expected_judge_prompt = evaluator._judge_prompt(
    judge_case,
    judge_response["response"],
    judge_case["expected_behavior"],
)
score = evaluator.score(judge_case, judge_response)
assert score["hard"] == 1, score

reflector = reflector_module["CodexCliReflector"]({
    "codex_exec_path": fake_codex,
    "codex_cli_reflection_timeout": 10,
    "edit_budget": 2,
})
reflection_results = [{"id": "failed", "hard": 0, "prediction": "old"}]
skill_content = "# Skill\\n\\n" + prompt_marker + ":" + unicode_suffix + "\\nold\\n"
expected_reflection_prompt = reflector._prompt(reflection_results, skill_content, {})

direct_prompt = "reflector-direct-marker:" + unicode_suffix
direct_output = out_dir / "direct.json"
completed = reflector_module["_run_isolated_codex"](
    [fake_codex, "exec", "--output-last-message", str(direct_output), "-"],
    direct_prompt,
    out_dir,
    os.environ.copy(),
    10,
)
assert direct_prompt not in completed.stdout, completed.stdout
assert direct_prompt not in completed.stderr, completed.stderr
assert "[redacted-prompt]" in completed.stdout, completed.stdout
assert "[redacted-prompt]" in completed.stderr, completed.stderr
assert "child-stdout-prefix" in completed.stdout and "child-stdout-suffix" in completed.stdout
assert "child-stderr-prefix" in completed.stderr and "child-stderr-suffix" in completed.stderr

patches = reflector.reflect(reflection_results, skill_content, out_dir)
assert len(patches) == 1, patches

def prompt_summary(value):
    encoded = value.encode("utf-8")
    return {"stdin_bytes": len(encoded), "stdin_sha256": hashlib.sha256(encoded).hexdigest()}

expectations_path.write_text(
    json.dumps({
        "judge": prompt_summary(expected_judge_prompt),
        "reflector": prompt_summary(expected_reflection_prompt),
    }),
    encoding="utf-8",
)

timeout_dir = out_dir / "timeout"
timeout_dir.mkdir()
try:
    evaluator_module["_run_isolated_codex"](
        [no_read_codex, "exec", "-"],
        "no-read:" + unicode_suffix + ":" + ("t" * (256 * 1024)),
        timeout_dir,
        os.environ.copy(),
        1,
    )
except subprocess.TimeoutExpired:
    pass
else:
    raise AssertionError("large no-read stdin child did not time out")

partial_prompt = "partial-timeout-prompt:" + unicode_suffix
for module in (evaluator_module, reflector_module):
    try:
        module["_run_isolated_codex"](
            [partial_echo_codex, "exec", "-"],
            partial_prompt,
            timeout_dir,
            os.environ.copy(),
            1,
        )
    except subprocess.TimeoutExpired as error:
        assert error.stdout == "[redacted-prompt]", error.stdout
        assert error.stderr == "[redacted-prompt]", error.stderr
    else:
        raise AssertionError("partial prompt echo child did not time out")
`;
  try {
    const smoke = spawnSync(
      "python3",
      [
        "-c",
        python,
        path.join(assetRoot, "evaluator.py.template"),
        path.join(assetRoot, "codex_cli_reflector.py.template"),
        fakeCodex,
        path.join(tempDir, "output"),
        noReadCodex,
        expectationsFile,
        partialEchoCodex,
      ],
      {
        cwd: root,
        env: {
          ...process.env,
          SKILLOPT_SENTINEL_SECRET: "must-not-reach-analysis-child",
          LC_ALL: "C",
          LANG: "C",
          PYTHONCOERCECLOCALE: "0",
          PYTHONUTF8: "0",
        },
        encoding: "utf8",
        timeout: 30000,
      },
    );
    if (smoke.status !== 0) {
      fail(
        `Codex judge/reflector isolation smoke failed: ${smoke.status}\n${smoke.stdout}\n${smoke.stderr}`,
      );
    }
    if (
      `${smoke.stdout || ""}\n${smoke.stderr || ""}`.includes(promptMarker) ||
      `${smoke.stdout || ""}\n${smoke.stderr || ""}`.includes(failureMarker)
    ) {
      fail("Codex judge/reflector prompt leaked into subprocess logs");
    }
    const expectations = JSON.parse(fs.readFileSync(expectationsFile, "utf8"));
    for (const kind of ["judge", "reflector"]) {
      const report = JSON.parse(fs.readFileSync(path.join(reportDir, `${kind}.json`), "utf8"));
      for (const expected of [
        "--strict-config",
        "permissions.skillopt_",
        "network.enabled=false",
        'shell_environment_policy.inherit="none"',
      ]) {
        if (!report.args.some((arg) => arg.includes(expected))) {
          fail(`${kind} Codex invocation omitted isolation argument ${expected}`);
        }
      }
      if (report.args.includes("--sandbox")) {
        fail(`${kind} Codex invocation retained a host-readable legacy sandbox`);
      }
      if (report.args.at(-1) !== "-") {
        fail(`${kind} Codex invocation did not select stdin with a trailing '-' argument`);
      }
      if (report.args.some((arg) => arg.includes(promptMarker))) {
        fail(`${kind} Codex invocation leaked its prompt into argv`);
      }
      if (!report.stdin_has_marker || report.stdin_bytes <= 0) {
        fail(`${kind} Codex invocation did not receive its prompt through stdin`);
      }
      if (
        report.stdin_bytes !== expectations[kind].stdin_bytes ||
        report.stdin_sha256 !== expectations[kind].stdin_sha256
      ) {
        fail(`${kind} Codex stdin changed or truncated the exact UTF-8 prompt`);
      }
      if (kind === "judge" && report.stdin_bytes <= 128 * 1024) {
        fail(`judge Codex stdin regression did not exceed 128 KiB: ${report.stdin_bytes}`);
      }
      if (report.environment_keys.includes("SKILLOPT_SENTINEL_SECRET")) {
        fail(`${kind} Codex invocation inherited an unrelated trainer secret`);
      }
      if (!(await waitForProcessExit(Number(report.child_pid)))) {
        fail(`${kind} Codex invocation left descendant process ${report.child_pid} alive`);
      }
    }
    await waitForFile(noReadChildPidFile);
    const noReadChildPid = Number(fs.readFileSync(noReadChildPidFile, "utf8"));
    if (!Number.isInteger(noReadChildPid) || !(await waitForProcessExit(noReadChildPid))) {
      fail(`large no-read stdin timeout left descendant process ${noReadChildPid} alive`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function validateRolloutWorkspaceSeedingContract() {
  if (!hasPython3()) {
    console.warn("python3 unavailable; skipping SkillOpt rollout workspace seeding smoke");
    return;
  }

  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-rollout-seed-"));
  const workspace = path.join(tempRepo, "rollout-workspace");
  const template = path.join(assetRoot, "rollout.py.template");
  try {
    writeFile(path.join(tempRepo, "package.json"), "{}\n");
    writeFile(path.join(tempRepo, "AGENTS.md"), "# Agent Instructions\n");
    writeFile(
      path.join(tempRepo, "skills/codex-operations/codex-spec-interviewer/SKILL.md"),
      `---
name: codex-spec-interviewer
description: Temporary skill used only by the SkillOpt validator.
---

# Codex Spec Interviewer
`,
    );
    writeFile(
      path.join(
        tempRepo,
        "skills/codex-operations/codex-spec-interviewer/references/spec-rubric.md",
      ),
      "# Spec Rubric\n",
    );
    writeFile(
      path.join(
        tempRepo,
        "skills/codex-operations/codex-spec-interviewer/assets/spec-template.standard.md",
      ),
      "# Standard Spec\n",
    );
    writeFile(
      path.join(tempRepo, "skills/codex-operations/codex-spec-interviewer/agents/spec-agent.md"),
      "# Spec Agent\n",
    );
    writeFile(
      path.join(tempRepo, "skills/codex-operations/codex-spec-interviewer/scripts/helper.mjs"),
      "console.log('helper');\n",
    );
    writeFile(
      path.join(tempRepo, "skill-evals/codex-spec-interviewer/fixtures/input.md"),
      "# Fixture\n",
    );

    const python = `
import json
import os
import runpy
from pathlib import Path

module = runpy.run_path(os.environ["ROLLOUT_TEMPLATE"])
workspace = Path(os.environ["ROLLOUT_WORKSPACE"])
workspace.mkdir(parents=True, exist_ok=True)
note = module["seed_workspace"](
    workspace,
    {"fixtures": ["skill-evals/codex-spec-interviewer/fixtures/input.md"]},
    "codex-spec-interviewer",
)
print(json.dumps({
    "note": note,
    "files": sorted(str(path.relative_to(workspace)) for path in workspace.rglob("*") if path.is_file()),
}))
`;
    const seed = spawnSync("python3", ["-c", python], {
      cwd: tempRepo,
      env: {
        ...process.env,
        ROLLOUT_TEMPLATE: template,
        ROLLOUT_WORKSPACE: workspace,
      },
      encoding: "utf8",
      timeout: 30000,
    });
    if (seed.status !== 0) {
      fail(
        `rollout workspace seeding smoke failed: ${seed.status}\n${seed.stdout}\n${seed.stderr}`,
      );
    }
    const parsed = JSON.parse(seed.stdout);
    for (const file of [
      "agents/spec-agent.md",
      "assets/spec-template.standard.md",
      "fixtures/input.md",
      "references/spec-rubric.md",
      "scripts/helper.mjs",
    ]) {
      if (!parsed.files.includes(file)) {
        fail(`rollout workspace seeding did not copy ${file}: ${seed.stdout}`);
      }
    }
    for (const needle of [
      "./agents/ from the target skill package",
      "./assets/ from the target skill package",
      "./references/ from the target skill package",
      "./scripts/ from the target skill package",
      "./fixtures/input.md copied from skill-evals/codex-spec-interviewer/fixtures/input.md",
    ]) {
      assertIncludes("rollout workspace seeding note", parsed.note, needle);
    }

    const outsideFixture = path.join(
      path.dirname(tempRepo),
      `${path.basename(tempRepo)}-outside.md`,
    );
    writeFile(outsideFixture, "outside\n");
    const symlinkFixture = path.join(
      tempRepo,
      "skill-evals/codex-spec-interviewer/fixtures/symlink.md",
    );
    fs.symlinkSync(outsideFixture, symlinkFixture);
    const fixturePolicyPython = `
import json
import os
import runpy
from pathlib import Path

module = runpy.run_path(os.environ["ROLLOUT_TEMPLATE"])
repo = Path.cwd()
fixtures = [
    str(repo / "skill-evals/codex-spec-interviewer/fixtures/input.md"),
    "../outside.md",
    "skill-evals/codex-spec-interviewer/fixtures/symlink.md",
]
rejected = []
for fixture in fixtures:
    try:
        module["fixture_source"](repo, fixture)
    except ValueError:
        rejected.append(fixture)
print(json.dumps(rejected))
`;
    const fixturePolicy = spawnSync("python3", ["-c", fixturePolicyPython], {
      cwd: tempRepo,
      env: { ...process.env, ROLLOUT_TEMPLATE: template },
      encoding: "utf8",
      timeout: 30000,
    });
    fs.rmSync(outsideFixture, { force: true });
    if (fixturePolicy.status !== 0) {
      fail(
        `rollout fixture containment smoke failed: ${fixturePolicy.status}\n${fixturePolicy.stdout}\n${fixturePolicy.stderr}`,
      );
    }
    const rejectedFixtures = JSON.parse(fixturePolicy.stdout);
    if (rejectedFixtures.length !== 3) {
      fail(
        `rollout fixture containment accepted an absolute, parent, or symlink path: ${fixturePolicy.stdout}`,
      );
    }

    writeFile(
      path.join(tempRepo, "incubator/skills/codex-operations/codex-spec-interviewer/SKILL.md"),
      `---
name: codex-spec-interviewer
description: Duplicate skill used only by the SkillOpt validator.
---

# Duplicate
`,
    );
    const ambiguous = spawnSync("python3", ["-c", python], {
      cwd: tempRepo,
      env: {
        ...process.env,
        ROLLOUT_TEMPLATE: template,
        ROLLOUT_WORKSPACE: path.join(tempRepo, "ambiguous-workspace"),
      },
      encoding: "utf8",
      timeout: 30000,
    });
    if (ambiguous.status !== 0) {
      fail(
        `rollout ambiguous workspace seeding smoke failed: ${ambiguous.status}\n${ambiguous.stdout}\n${ambiguous.stderr}`,
      );
    }
    const ambiguousParsed = JSON.parse(ambiguous.stdout);
    assertIncludes(
      "ambiguous rollout workspace seeding note",
      ambiguousParsed.note,
      "Multiple target skill packages named 'codex-spec-interviewer' were found",
    );
    assertIncludes(
      "ambiguous rollout workspace seeding note",
      ambiguousParsed.note,
      "Cannot seed rollout helpers safely.",
    );
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

async function validateVisualRolloutReadIsolation() {
  if (!hasPython3()) {
    console.warn("python3 unavailable; skipping SkillOpt visual read-isolation smoke");
    return;
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-visual-isolation-"));
  const binDir = path.join(tempDir, "bin");
  const codexPackage = path.join(tempDir, "codex-package");
  const fakeCodex = path.join(codexPackage, "bin", "codex");
  const childPidFile = path.join(codexPackage, "rollout-child.pid");
  const childReportFile = path.join(codexPackage, "rollout-report.json");
  const fakeDrawio = path.join(binDir, "drawio");
  const template = path.join(assetRoot, "rollout.py.template");
  const promptMarker = "stdin-only-rollout-marker-91c2e7a4";
  try {
    writeFile(
      path.join(codexPackage, "package.json"),
      `${JSON.stringify({ name: "@openai/codex" })}\n`,
    );
    writeFile(
      fakeCodex,
      `#!/usr/bin/env python3
import hashlib
import json
import os
import pathlib
import subprocess
import sys

args = sys.argv[1:]
prompt_bytes = sys.stdin.buffer.read()
prompt = prompt_bytes.decode("utf-8", errors="strict")
output_index = args.index("--output-last-message")
pathlib.Path(args[output_index + 1]).write_text("VISUAL_ISOLATION_READY\\n", encoding="utf-8")
helper = subprocess.Popen(
    [sys.executable, "-c", "import signal,time; signal.signal(signal.SIGTERM, lambda *_: None); time.sleep(3600)"],
)
pathlib.Path(${JSON.stringify(childPidFile)}).write_text(str(helper.pid), encoding="utf-8")
pathlib.Path(${JSON.stringify(childReportFile)}).write_text(json.dumps({
    "args": args,
    "environment_keys": sorted(os.environ),
    "stdin_bytes": len(prompt_bytes),
    "stdin_sha256": hashlib.sha256(prompt_bytes).hexdigest(),
    "stdin_has_marker": ${JSON.stringify(promptMarker)} in prompt,
}), encoding="utf-8")
sys.stdout.buffer.write(b"child-stdout-prefix\\n" + prompt_bytes + b"\\nchild-stdout-suffix\\n")
sys.stderr.buffer.write(b"child-stderr-prefix\\n" + prompt_bytes + b"\\nchild-stderr-suffix\\n")
`,
    );
    writeFile(fakeDrawio, "#!/bin/sh\nexit 0\n");
    fs.chmodSync(fakeCodex, 0o755);
    fs.chmodSync(fakeDrawio, 0o755);

    const python = `
import hashlib
import json
import os
import runpy
from pathlib import Path

module = runpy.run_path(os.environ["ROLLOUT_TEMPLATE"])
prompt_marker = ${JSON.stringify(promptMarker)}
unicode_suffix = "Gr\\u00fc\\u00dfe \\U0001f44b"
artifact_workspace = Path(os.environ["TEST_ROOT"]) / "artifact-workspace"
artifact_workspace.mkdir()
(artifact_workspace / "genuine.svg").write_text(
    '<svg xmlns="http://www.w3.org/2000/svg"><text>safe</text></svg>',
    encoding="utf-8",
)
outside = Path(os.environ["TEST_ROOT"]) / "outside.svg"
outside.write_text('<svg xmlns="http://www.w3.org/2000/svg"><text>outside</text></svg>', encoding="utf-8")
(artifact_workspace / "leak.svg").symlink_to(outside)

rollout = module["AgentSkillsRollout"]({
    "codex_exec_path": os.environ["FAKE_CODEX"],
    "tool_rollout_for_visual_assertions": True,
    "require_drawio_cli_for_visual_rollouts": True,
    "visual_exec_timeout": 10,
})
rollout_globals = rollout.run.__globals__
real_process_io = rollout_globals["BoundedProcessIO"]
transport = {}

class RecordingProcessIO(real_process_io):
    def __init__(self, process, prompt, *args, **kwargs):
        encoded = str(prompt or "").encode("utf-8", errors="replace")
        transport["stdin_bytes"] = len(encoded)
        transport["stdin_sha256"] = hashlib.sha256(encoded).hexdigest()
        super().__init__(process, prompt, *args, **kwargs)

rollout_globals["BoundedProcessIO"] = RecordingProcessIO
try:
    outcome = rollout.run(
        {
            "id": "visual-isolation-smoke",
            "skill_name": "missing-test-skill",
            "prompt": prompt_marker + ":" + unicode_suffix + ":" + ("r" * (140 * 1024)),
            "fixtures": [],
            "visual_assertions": ["artifact_exists: *.svg"],
        },
        "# Test Skill",
    )
finally:
    rollout_globals["BoundedProcessIO"] = real_process_io
print(json.dumps({
    "outcome": outcome,
    "transport": transport,
    "artifact_paths": [item["path"] for item in module["collect_artifacts"](artifact_workspace)],
}))
`;
    const smokeStarted = Date.now();
    const smoke = spawnSync("python3", ["-c", python], {
      cwd: root,
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH || ""}`,
        ROLLOUT_TEMPLATE: template,
        TEST_ROOT: tempDir,
        FAKE_CODEX: fakeCodex,
        SKILLOPT_SENTINEL_SECRET: "must-not-reach-child",
        LC_ALL: "C",
        LANG: "C",
        PYTHONCOERCECLOCALE: "0",
        PYTHONUTF8: "0",
      },
      encoding: "utf8",
      timeout: 30000,
    });
    if (smoke.status !== 0) {
      fail(
        `visual rollout read-isolation smoke failed: ${smoke.status}\n${smoke.stdout}\n${smoke.stderr}`,
      );
    }
    if (`${smoke.stdout || ""}\n${smoke.stderr || ""}`.includes(promptMarker)) {
      fail("target rollout prompt leaked into subprocess logs");
    }
    if (Date.now() - smokeStarted > 5_000) {
      fail("successful visual rollout waited for an inherited helper pipe timeout");
    }
    const parsed = JSON.parse(smoke.stdout);
    const outcome = parsed.outcome;
    if (outcome.returncode !== 0 || outcome.response.trim() !== "VISUAL_ISOLATION_READY") {
      fail(`visual rollout fake Codex failed: ${JSON.stringify(outcome)}`);
    }
    if (
      !outcome.stdout.includes("[redacted-prompt]") ||
      !outcome.stdout.includes("child-stdout-prefix") ||
      !outcome.stdout.includes("child-stdout-suffix") ||
      outcome.stdout.includes("[output truncated; retained tail]")
    ) {
      fail(`target rollout stdout redaction destroyed retained diagnostics: ${outcome.stdout}`);
    }
    if (
      !outcome.stderr.includes("[redacted-prompt]") ||
      !outcome.stderr.includes("child-stderr-suffix") ||
      !outcome.stderr.includes("[output truncated; retained tail]") ||
      outcome.stderr.includes("child-stderr-prefix")
    ) {
      fail(`target rollout stderr did not retain the bounded tail: ${outcome.stderr}`);
    }
    const childReport = JSON.parse(fs.readFileSync(childReportFile, "utf8"));
    const codexArgs = childReport.args;
    if (codexArgs.at(-1) !== "-") {
      fail("target rollout Codex invocation did not select stdin with a trailing '-' argument");
    }
    if (codexArgs.some((arg) => arg.includes(promptMarker))) {
      fail("target rollout Codex invocation leaked its prompt into argv");
    }
    if (!childReport.stdin_has_marker || childReport.stdin_bytes <= 128 * 1024) {
      fail(`target rollout Codex stdin did not carry a >128 KiB prompt: ${outcome.stdout}`);
    }
    if (
      childReport.stdin_bytes !== parsed.transport.stdin_bytes ||
      childReport.stdin_sha256 !== parsed.transport.stdin_sha256
    ) {
      fail("target rollout Codex stdin changed or truncated the exact UTF-8 prompt");
    }
    for (const expected of [
      "--strict-config",
      'default_permissions="skillopt_visual_rollout"',
      "permissions.skillopt_visual_rollout.network.enabled=false",
      'shell_environment_policy.inherit="none"',
    ]) {
      if (!codexArgs.includes(expected)) {
        fail(`visual rollout missing strict read-isolation argument ${expected}`);
      }
    }
    const filesystemArg = codexArgs.find((arg) =>
      arg.startsWith("permissions.skillopt_visual_rollout.filesystem="),
    );
    for (const expected of [
      '":minimal"="read"',
      '":workspace_roots"={"."="write",".skillopt-control"="deny"}',
      `${JSON.stringify(path.resolve(codexPackage))}="read"`,
    ]) {
      if (!filesystemArg?.includes(expected)) {
        fail(`visual rollout filesystem profile omitted ${expected}: ${filesystemArg}`);
      }
    }
    if (codexArgs.includes("--sandbox") || codexArgs.includes("--search")) {
      fail("visual rollout retained a legacy sandbox or web-search argument");
    }
    if (childReport.environment_keys.includes("SKILLOPT_SENTINEL_SECRET")) {
      fail("visual rollout inherited an unrelated trainer secret into the Codex child");
    }
    const outputIndex = codexArgs.indexOf("--output-last-message");
    if (
      outputIndex === -1 ||
      !codexArgs[outputIndex + 1]?.endsWith("/.skillopt-control/final.md")
    ) {
      fail("visual rollout did not protect its final-output control path");
    }
    if (JSON.stringify(parsed.artifact_paths) !== JSON.stringify(["genuine.svg"])) {
      fail(`visual rollout artifact collection followed a symlink: ${smoke.stdout}`);
    }
    await waitForFile(childPidFile);
    const childPid = Number(fs.readFileSync(childPidFile, "utf8"));
    if (!Number.isInteger(childPid) || !(await waitForProcessExit(childPid))) {
      fail(`successful visual rollout left descendant process ${childPid} alive`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function validateRolloutTimeoutPromptRedaction() {
  if (!hasPython3()) {
    console.warn("python3 unavailable; skipping rollout timeout prompt-redaction smoke");
    return;
  }
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-timeout-redaction-"));
  const codexPackage = path.join(tempDir, "codex-package");
  const fakeCodex = path.join(codexPackage, "bin", "codex");
  const taskMarker = "TASK-71f0e9";
  const skillMarker = "SKILL-32ac47";
  const resourceMarker = "RESOURCE-885bd1";
  try {
    writeFile(
      path.join(codexPackage, "package.json"),
      `${JSON.stringify({ name: "@openai/codex" })}\n`,
    );
    writeFile(
      fakeCodex,
      `#!/usr/bin/env python3
import sys
import time

prompt = sys.stdin.read()
for marker in (${JSON.stringify(taskMarker)}, ${JSON.stringify(skillMarker)}, ${JSON.stringify(resourceMarker)}):
    assert marker in prompt, marker
sys.stdout.write("stdout-diagnostic:" + ${JSON.stringify(taskMarker)}[:1] + ":" + ${JSON.stringify(skillMarker)}[:5])
sys.stdout.flush()
sys.stderr.write("stderr-diagnostic:" + ${JSON.stringify(resourceMarker)}[3:10])
sys.stderr.flush()
time.sleep(3600)
`,
    );
    fs.chmodSync(fakeCodex, 0o755);
    const python = `
import json
import os
import runpy
import shutil
from pathlib import Path

module = runpy.run_path(os.environ["ROLLOUT_TEMPLATE"])
rollout_globals = module["AgentSkillsRollout"].run.__globals__
rollout_globals["seed_workspace"] = lambda workspace, case, skill_name: "seeded helper note"
rollout_globals["provider_resource_snapshot"] = lambda workspace: ${JSON.stringify(resourceMarker)} + " resource snapshot body"
rollout = module["AgentSkillsRollout"]({
    "codex_exec_path": os.environ["FAKE_CODEX"],
    "exec_timeout": 1,
    "tool_rollout_for_visual_assertions": False,
})
outcome = rollout.run(
    {
        "id": "timeout-partial-echo",
        "skill_name": "test-skill",
        "prompt": ${JSON.stringify(taskMarker)} + " task body",
        "fixtures": [],
        "visual_assertions": [],
    },
    "# Skill\\n\\n" + ${JSON.stringify(skillMarker)} + " skill body",
)
preserved = outcome.get("workspace_preserved")
if preserved and Path(preserved).is_dir():
    shutil.rmtree(preserved)
print(json.dumps(outcome))
`;
    const smoke = spawnSync("python3", ["-c", python], {
      cwd: root,
      env: {
        ...process.env,
        ROLLOUT_TEMPLATE: path.join(assetRoot, "rollout.py.template"),
        FAKE_CODEX: fakeCodex,
      },
      encoding: "utf8",
      timeout: 30000,
    });
    if (smoke.status !== 0) {
      fail(
        `rollout timeout prompt-redaction smoke failed: ${smoke.status}\n${smoke.stdout}\n${smoke.stderr}`,
      );
    }
    const outcome = JSON.parse(smoke.stdout);
    if (outcome.returncode !== 124 || !outcome.timeout) {
      fail(`partial prompt echo did not exercise rollout timeout: ${smoke.stdout}`);
    }
    if (outcome.response !== "[redacted-prompt]" || outcome.stdout !== "[redacted-prompt]") {
      fail(`rollout timeout retained captured stdout: ${smoke.stdout}`);
    }
    if (!outcome.stderr.includes("[redacted-prompt]")) {
      fail(`rollout timeout omitted redaction evidence: ${smoke.stdout}`);
    }
    const serialized = JSON.stringify({
      response: outcome.response,
      stdout: outcome.stdout,
      stderr: outcome.stderr,
    });
    for (const fragment of [
      taskMarker.slice(0, 1),
      skillMarker.slice(0, 5),
      resourceMarker.slice(3, 10),
    ]) {
      if (serialized.includes(fragment)) {
        fail(`rollout timeout leaked partial prompt fragment ${JSON.stringify(fragment)}`);
      }
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function validateConfigContracts() {
  const codexAll = fs.readFileSync(path.join(assetRoot, "config.codex-cli-all.yaml"), "utf8");
  const hybrid = fs.readFileSync(path.join(assetRoot, "config.hybrid-codex-target.yaml"), "utf8");
  const nativeProvider = fs.readFileSync(
    path.join(assetRoot, "config.native-provider.yaml"),
    "utf8",
  );

  assertIncludes("codex-cli-all config", codexAll, "run_profile: exploratory");
  assertIncludes("codex-cli-all config", codexAll, "reflection_backend: codex_cli");
  assertIncludes("codex-cli-all config", codexAll, "judge_backend: codex_cli");
  assertIncludes("codex-cli-all config", codexAll, "target_backend: codex_exec");
  assertIncludes("codex-cli-all config", codexAll, "use_slow_update: false");
  assertIncludes("codex-cli-all config", codexAll, "use_meta_skill: false");
  assertIncludes("codex-cli-all config", codexAll, "codex_exec_approval_policy: never");
  for (const [name, text] of [
    ["codex-cli-all config", codexAll],
    ["hybrid config", hybrid],
    ["native-provider config", nativeProvider],
  ]) {
    assertIncludes(name, text, "split_dir: <split-dir>");
    assertIncludes(name, text, "visual_eval_policy: <visual-eval-policy>");
    assertIncludes(name, text, "tool_rollout_for_visual_assertions: true");
    assertIncludes(name, text, "require_drawio_cli_for_visual_rollouts: true");
    assertIncludes(name, text, "visual_exec_timeout: 120");
  }

  assertIncludes("hybrid config", hybrid, "run_profile: <run-profile>");
  assertIncludes("hybrid config", hybrid, "optimizer_backend: openai_chat");
  assertIncludes("hybrid config", hybrid, "target_backend: codex_exec");
  assertIncludes("hybrid config", hybrid, "use_slow_update: true");
  assertIncludes("hybrid config", hybrid, "use_meta_skill: true");
  assertIncludes("hybrid config", hybrid, "codex_exec_approval_policy: never");

  assertIncludes("native-provider config", nativeProvider, "optimizer_backend: openai_chat");
  assertIncludes("native-provider config", nativeProvider, "target_backend: openai_chat");
  assertIncludes("native-provider config", nativeProvider, "use_slow_update: true");
  assertIncludes("native-provider config", nativeProvider, "use_meta_skill: true");
}

function validateVisualArtifactRolloutContract() {
  const skill = fs.readFileSync(path.join(skillRoot, "SKILL.md"), "utf8");
  const rollout = fs.readFileSync(path.join(assetRoot, "rollout.py.template"), "utf8");
  const adapter = fs.readFileSync(path.join(assetRoot, "adapter.py.template"), "utf8");
  const readiness = fs.readFileSync(
    path.join(skillRoot, "scripts/check-skillopt-readiness.mjs"),
    "utf8",
  );
  const split = fs.readFileSync(path.join(skillRoot, "scripts/prepare-skillopt-split.mjs"), "utf8");
  const setup = fs.readFileSync(path.join(skillRoot, "scripts/setup-skillopt-local.mjs"), "utf8");
  const prepareAdapter = fs.readFileSync(
    path.join(skillRoot, "scripts/prepare-local-skillopt-adapter.mjs"),
    "utf8",
  );
  const codexRunner = fs.readFileSync(
    path.join(skillRoot, "references/codex-cli-runner.md"),
    "utf8",
  );
  const adapterContract = fs.readFileSync(
    path.join(skillRoot, "references/adapter-contract.md"),
    "utf8",
  );
  const troubleshooting = fs.readFileSync(
    path.join(skillRoot, "references/troubleshooting.md"),
    "utf8",
  );
  const evalCase = fs.readFileSync(
    path.join(root, "skill-evals/skillopt-setup/cases/visual-rollout-tool-boundary.md"),
    "utf8",
  );

  for (const [name, text] of [
    ["skill", skill],
    ["rollout template", rollout],
    ["adapter template", adapter],
    ["readiness script", readiness],
    ["codex runner reference", codexRunner],
    ["adapter contract", adapterContract],
    ["troubleshooting reference", troubleshooting],
    ["visual rollout eval", evalCase],
  ]) {
    assertIncludes(name, text, "visual_assertions");
    assertIncludes(name, text, "tool_rollout_for_visual_assertions");
  }

  assertIncludes("rollout template", rollout, "def find_drawio_cli");
  assertIncludes("rollout template", rollout, "visual_rollout_blocker");
  assertIncludes("rollout template", rollout, "Browser tools");
  assertIncludes("rollout template", rollout, "tool_rollout_enabled");
  assertIncludes("rollout template", rollout, "process_alive_after_kill");
  assertIncludes("rollout template", rollout, "VISUAL_ROLLOUT_PERMISSION_PROFILE");
  assertIncludes("rollout template", rollout, "def codex_runtime_read_path");
  assertIncludes("rollout template", rollout, "default_permissions=");
  assertIncludes("rollout template", rollout, '":minimal"="read"');
  assertIncludes("rollout template", rollout, '"."="write"');
  assertIncludes("rollout template", rollout, "ROLLOUT_CONTROL_DIR");
  assertIncludes("rollout template", rollout, "network.enabled=false");
  assertIncludes("rollout template", rollout, "if path.is_symlink()");
  assertIncludes("adapter template", adapter, "require_drawio_cli_for_visual_rollouts");
  assertIncludes("readiness script", readiness, "function visualArtifactReadiness");
  assertIncludes("readiness script", readiness, "function readExistingCodexProbe");
  assertIncludes("readiness script", readiness, "activePositiveCases");
  assertIncludes("readiness script", readiness, "hasVisualAssertionBullets");
  assertIncludes("readiness script", readiness, "detectDrawioCli");
  assertIncludes("readiness script", readiness, "missing_drawio_cli");
  assertIncludes("readiness script", readiness, "text_only_ready");
  assertIncludes("split script", split, "visual_assertions");
  assertIncludes("split script", split, "isNoneAssertion");
  assertIncludes("split script", split, "data-text-only");
  assertIncludes("split script", split, "companion data-text-only split");
  assertIncludes("setup script", setup, "--visual-eval-policy");
  assertIncludes("setup script", setup, "Visual Assertions");
  assertIncludes("setup script", setup, "visualAssertionBullets");
  assertIncludes("setup script", setup, "passed using existing ignored readiness diagnostics");
  assertIncludes("setup script", setup, "trainingSplitDir");
  assertIncludes("adapter preparer", prepareAdapter, "effectiveVisualSplit");
  assertIncludes("adapter preparer", prepareAdapter, "<split-dir>");
  assertIncludes("adapter preparer", prepareAdapter, "<visual-eval-policy>");
  assertIncludes(
    "adapter preparer",
    prepareAdapter,
    "either the target is provider-backed or draw.io Desktop CLI is unavailable",
  );
  assertIncludes(
    "skill",
    skill,
    "Every active Codex target, judge, or reflection role still requires strict isolation",
  );
  assertIncludes("skill", skill, "data-text-only");
  assertIncludes("codex runner reference", codexRunner, "fast-fail with `visual_rollout_blocker`");
  assertIncludes("troubleshooting reference", troubleshooting, "Visual Artifact Rollouts Fail");
  assertIncludes(
    "troubleshooting reference",
    troubleshooting,
    "Strict readiness can reuse an existing successful probe",
  );
}

function validateGatewayOwnershipGuidance() {
  const reference = path.join(skillRoot, "references/local-openai-gateway.md");
  const runbook = path.join(skillRoot, "references/runbook.md");
  const evalCase = path.join(
    root,
    "skill-evals/skillopt-setup/cases/local-gateway-ownership-and-extraction.md",
  );
  assertFile(reference);
  assertFile(runbook);
  assertFile(evalCase);

  const referenceText = fs.readFileSync(reference, "utf8");
  const runbookText = fs.readFileSync(runbook, "utf8");
  const evalText = fs.readFileSync(evalCase, "utf8");
  for (const [name, text] of [
    ["local-openai-gateway reference", referenceText],
    ["runbook", runbookText],
    ["gateway ownership eval", evalText],
  ]) {
    assertIncludes(name, text, "skillopt-setup");
    assertIncludes(name, text, "second independent consumer");
    assertIncludes(name, text, "fail-closed");
    assertIncludes(name, text, "loopback-only");
    assertIncludes(name, text, "OS/container");
  }
  for (const [name, text] of [
    ["local-openai-gateway reference", referenceText],
    ["gateway ownership eval", evalText],
  ]) {
    assertIncludes(
      name,
      text,
      "filesystem, process, tool, network, and inherited-environment isolation",
    );
  }
  assertIncludes("local-openai-gateway reference", referenceText, "/v1/chat/completions");
  assertIncludes("local-openai-gateway reference", referenceText, "infrastructure source of truth");
}

function section(text, heading) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex(
    (line) => line.trim().toLowerCase() === `## ${heading}`.toLowerCase(),
  );
  if (start === -1) return "";
  const collected = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s+/.test(line)) break;
    collected.push(line);
  }
  return collected.join("\n").trim();
}

function bullets(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*[-*]\s+(.+)$/)?.[1]?.trim())
    .filter(Boolean);
}

function shouldTrigger(text) {
  const value = section(text, "Should Trigger")
    .trim()
    .split(/\s+/)[0]
    ?.replace(/[.]/g, "")
    .toLowerCase();
  return value !== "no" && value !== "false";
}

function validateBenchmarkAssertions() {
  const casesDir = path.join(root, "skill-evals/skillopt-setup/cases");
  assertFile(path.join(root, "skill-evals/skillopt-setup/rubric.md"));
  const cases = walk(casesDir).filter((file) => file.endsWith(".md"));
  let positiveCases = 0;
  let deterministicCases = 0;
  for (const file of cases) {
    const text = fs.readFileSync(file, "utf8");
    if (!shouldTrigger(text)) continue;
    positiveCases += 1;
    if (bullets(section(text, "Deterministic Assertions")).length > 0) {
      deterministicCases += 1;
    }
  }
  if (positiveCases < 20) {
    fail(`skillopt-setup benchmark has only ${positiveCases} positive cases; expected at least 20`);
  }
  if (deterministicCases < minDeterministicCases) {
    fail(
      `skillopt-setup benchmark has only ${deterministicCases} positive cases with deterministic assertions; expected at least ${minDeterministicCases}`,
    );
  }
}

function skillBodyText(file) {
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/^---\n[\s\S]*?\n---\n?/);
  return match ? text.slice(match[0].length).trimStart() : text;
}

function runAdoptionPreview(name, candidate, expectedStatus) {
  const script = path.join(skillRoot, "scripts/apply-skillopt-best.mjs");
  const result = spawnSync(
    process.execPath,
    [script, "--skill", "drawio-diagrams", "--best", candidate, "--dry-run", "--summary"],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 30000,
    },
  );
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.error) fail(`${name}: ${result.error.message}`);
  if (result.status !== expectedStatus) {
    fail(`${name}: expected exit ${expectedStatus}, got ${result.status}\n${output}`);
  }
  return output;
}

function validateAdoptionSafety() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-adoption-"));
  try {
    const summary = JSON.stringify(
      { baseline_test_hard: 1, test_hard: 1, test_delta_hard: 0 },
      null,
      2,
    );
    fs.writeFileSync(path.join(tmp, "summary.json"), `${summary}\n`, "utf8");

    const unchangedCandidate = path.join(tmp, "best-unchanged.md");
    fs.writeFileSync(
      unchangedCandidate,
      skillBodyText(path.join(root, "skills/engineering-workflows/drawio-diagrams/SKILL.md")),
      "utf8",
    );
    const unchangedOutput = runAdoptionPreview(
      "drawio unchanged adoption preview",
      unchangedCandidate,
      0,
    );
    assertIncludes("drawio unchanged adoption preview", unchangedOutput, "Safety checks: pass");

    const secretCandidate = path.join(tmp, "best-secret.md");
    const fakeToken = `sk-test${"0".repeat(24)}`;
    fs.writeFileSync(
      secretCandidate,
      `# drawio-diagrams\n\n## Goal\n\nProbe adoption safety.\n\n## Safety rules\n\nNever expose secrets.\n\nExample token: ${fakeToken}\n`,
      "utf8",
    );
    const secretOutput = runAdoptionPreview("secret adoption preview", secretCandidate, 1);
    assertIncludes(
      "secret adoption preview",
      secretOutput,
      "candidate contains a secret-like string",
    );

    const paddedCandidate = path.join(tmp, "best-padded-base64.md");
    const paddedPayload = Buffer.from(
      Array.from({ length: 61 }, (_, index) => (index * 37) % 256),
    ).toString("base64");
    if (!paddedPayload.endsWith("=")) fail("padded Base64 regression fixture is not padded");
    fs.writeFileSync(
      paddedCandidate,
      `# drawio-diagrams\n\n## Goal\n\nProbe padded payload safety.\n\n## Safety rules\n\nNever expose secrets.\n\nEncoded payload: ${paddedPayload}\n`,
      "utf8",
    );
    const paddedOutput = runAdoptionPreview("padded Base64 adoption preview", paddedCandidate, 1);
    assertIncludes(
      "padded Base64 adoption preview",
      paddedOutput,
      "candidate contains a secret-like string",
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function validateNoPrivatePayload() {
  const forbidden = ["sk-tek", "codex-oauth", "agent-system.svc", "refresh_token"];
  const forbiddenPatterns = [
    {
      label: "private Unix home path",
      pattern: /\/home\/[A-Za-z0-9._-]+(?:\/|$)/,
    },
  ];
  const roots = [skillRoot, path.join(root, "skill-evals/skillopt-setup")];
  const files = [];
  for (const dir of roots) {
    files.push(...walk(dir));
  }
  for (const file of files) {
    const rel = path.relative(root, file);
    const text = fs.readFileSync(file, "utf8");
    for (const needle of forbidden) {
      assertNotIncludes(rel, text, needle);
    }
    for (const { pattern, label } of forbiddenPatterns) {
      assertNotMatches(rel, text, pattern, label);
    }
  }
}

function requestJson(port, method, requestPath, payload = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const body =
      payload === null ? null : typeof payload === "string" ? payload : JSON.stringify(payload);
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        method,
        path: requestPath,
        headers: {
          ...extraHeaders,
          ...(body
            ? {
                "content-type": "application/json",
                "content-length": Buffer.byteLength(body),
              }
            : {}),
        },
        timeout: 5000,
      },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          text += chunk;
        });
        res.on("end", () => {
          let parsed = null;
          try {
            parsed = text ? JSON.parse(text) : null;
          } catch {
            parsed = { raw: text };
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      },
    );
    req.on("timeout", () => {
      req.destroy(new Error(`${method} ${requestPath} timed out`));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function waitForGateway(port, child) {
  let lastError = null;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`gateway exited before readiness with code ${child.exitCode}`);
    }
    try {
      const health = await requestJson(port, "GET", "/healthz");
      if (health.status === 200) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`gateway did not become ready: ${lastError?.message || "timeout"}`);
}

async function waitForFile(file, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(file)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  fail(`timed out waiting for ${file}`);
}

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    throw error;
  }
}

async function waitForProcessExit(pid, timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!processIsAlive(pid)) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return !processIsAlive(pid);
}

async function validateGatewaySmoke() {
  const gateway = path.join(skillRoot, "scripts/codex-local-openai-chat-gateway.mjs");
  assertFile(gateway);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-gateway-smoke-"));
  const fakeCodex = path.join(tempDir, "fake-codex.mjs");
  const configPath = path.join(tempDir, "gateway-config.json");
  const workspace = path.join(tempDir, "workspace");
  const sharedWorkspace = path.join(tempDir, "shared-workspace");
  const authHeaders = { authorization: "Bearer smoke-token" };
  fs.mkdirSync(workspace, { recursive: true });
  fs.mkdirSync(sharedWorkspace, { recursive: true });
  fs.writeFileSync(
    fakeCodex,
    `#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
let stdin = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  stdin += chunk;
});
process.stdin.on("end", () => {
  fs.writeFileSync(
    path.join(process.cwd(), "invocation.json"),
    JSON.stringify({ args: process.argv.slice(2), environment_keys: Object.keys(process.env).sort() }),
    "utf8",
  );
  if (stdin.includes("SPAWN_CHILD_SUCCESS")) {
    const helper = spawn(
      process.execPath,
      ["-e", "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000);"],
      { stdio: "inherit" },
    );
    fs.writeFileSync(path.join(process.cwd(), "success-child.pid"), String(helper.pid), "utf8");
    const successOutputIndex = process.argv.indexOf("--output-last-message");
    if (successOutputIndex !== -1) {
      fs.writeFileSync(process.argv[successOutputIndex + 1], "SUCCESS_TREE_REAPED\\n", "utf8");
    }
    process.stdout.write(JSON.stringify({ type: "turn.completed", usage: { input_tokens: 1, output_tokens: 1 } }) + "\\n");
    setTimeout(() => process.exit(0), 20);
    return;
  }
  if (stdin.includes("SPAWN_CHILD_IGNORE_SIGTERM")) {
    const label = stdin.includes("CLIENT_ABORT") ? "abort" : "timeout";
    const helper = spawn(
      process.execPath,
      ["-e", "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000);"],
      { stdio: "ignore" },
    );
    fs.writeFileSync(path.join(process.cwd(), label + "-child.pid"), String(helper.pid), "utf8");
    fs.writeFileSync(path.join(process.cwd(), label + "-parent.pid"), String(process.pid), "utf8");
    process.on("SIGTERM", () => {});
    setInterval(() => {}, 1000);
    return;
  }
  if (stdin.includes("IGNORE_SIGTERM")) {
    process.on("SIGTERM", () => {});
    setInterval(() => {}, 1000);
    return;
  }
	  const outputIndex = process.argv.indexOf("--output-last-message");
	  if (outputIndex !== -1) fs.writeFileSync(process.argv[outputIndex + 1], "SKILLOPT_ENDPOINT_READY\\n", "utf8");
	  if (stdin.includes("SPLIT_JSON_USAGE")) {
	    process.stdout.write('{"type":"turn.completed","usage":');
	    setTimeout(() => {
	      process.stdout.write('{"input_tokens":7,"output_tokens":5}}\\n');
	    }, 5);
	    return;
	  }
	  process.stdout.write(JSON.stringify({ type: "turn.completed", usage: { input_tokens: 3, output_tokens: 2 } }) + "\\n");
	});
	`,
    "utf8",
  );
  fs.chmodSync(fakeCodex, 0o755);
  const port = 15100 + Math.floor(Math.random() * 1000);
  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        server: { host: "127.0.0.1", port, request_body_limit_bytes: 256 },
        codex: {
          binary: fakeCodex,
          include_usage: true,
          default_timeout_seconds: 2,
          max_timeout_seconds: 2,
          kill_grace_seconds: 1,
        },
        workspaces: {
          default: { path: workspace, allow_write: false },
          shared: { path: sharedWorkspace, allow_write: false },
        },
        models: {
          codex: {
            codex_model: "fake-codex",
            workspace: "default",
            sandbox: "read-only",
          },
          "codex-shared": {
            codex_model: "fake-codex",
            workspace: "default",
            allowed_workspaces: ["shared"],
            sandbox: "read-only",
          },
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  const child = spawn(process.execPath, [gateway, "--config", configPath], {
    cwd: root,
    env: {
      ...process.env,
      CODEX_OPENAI_GATEWAY_KEY: "smoke-token",
      SKILLOPT_SENTINEL_SECRET: "must-not-reach-gateway-child",
    },
    stdio: ["ignore", "ignore", "pipe"],
  });
  let stderr = "";
  let cleanupError = null;
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });

  try {
    await waitForGateway(port, child);
    const healthAlias = await requestJson(port, "GET", "/v1/healthz");
    if (healthAlias.status !== 200) {
      fail(
        `gateway smoke /v1/healthz failed: ${healthAlias.status} ${JSON.stringify(healthAlias.body)}`,
      );
    }
    const unauthenticatedModels = await requestJson(port, "GET", "/v1/models");
    if (unauthenticatedModels.status !== 401) {
      fail(
        `gateway smoke unauthenticated models expected 401, got ${unauthenticatedModels.status}`,
      );
    }
    const models = await requestJson(port, "GET", "/v1/models", null, authHeaders);
    if (models.status !== 200 || models.body?.data?.[0]?.id !== "codex") {
      fail(`gateway smoke models failed: ${models.status} ${JSON.stringify(models.body)}`);
    }
    const chat = await requestJson(
      port,
      "POST",
      "/v1/chat/completions",
      {
        model: "codex",
        messages: [{ role: "user", content: "Say SKILLOPT_ENDPOINT_READY." }],
      },
      authHeaders,
    );
    const content = chat.body?.choices?.[0]?.message?.content || "";
    if (chat.status !== 200 || !content.includes("SKILLOPT_ENDPOINT_READY")) {
      fail(`gateway smoke chat failed: ${chat.status} ${JSON.stringify(chat.body)}`);
    }
    const invocation = JSON.parse(fs.readFileSync(path.join(workspace, "invocation.json"), "utf8"));
    for (const expected of [
      "--strict-config",
      'default_permissions="codex_gateway_text"',
      "permissions.codex_gateway_text.network.enabled=false",
      'shell_environment_policy.inherit="none"',
    ]) {
      if (!invocation.args.some((arg) => arg.includes(expected))) {
        fail(`gateway Codex invocation omitted isolation argument ${expected}`);
      }
    }
    const gatewayFilesystem = invocation.args.find((arg) =>
      arg.startsWith("permissions.codex_gateway_text.filesystem="),
    );
    if (
      !gatewayFilesystem?.includes('":minimal"="read"') ||
      !gatewayFilesystem?.includes('":workspace_roots"={"."="deny"}')
    ) {
      fail(`gateway Codex invocation did not deny workspace reads: ${gatewayFilesystem}`);
    }
    if (invocation.args.includes("--sandbox")) {
      fail("gateway Codex invocation retained a host-readable legacy sandbox");
    }
    if (invocation.environment_keys.includes("SKILLOPT_SENTINEL_SECRET")) {
      fail("gateway Codex child inherited an unrelated server secret");
    }
    const deniedWorkspace = await requestJson(
      port,
      "POST",
      "/v1/chat/completions",
      {
        model: "codex",
        metadata: { codex: { workspace: "shared" } },
        messages: [{ role: "user", content: "hello" }],
      },
      authHeaders,
    );
    if (deniedWorkspace.status !== 400) {
      fail(`gateway smoke workspace override expected 400, got ${deniedWorkspace.status}`);
    }
    const deniedProfile = await requestJson(
      port,
      "POST",
      "/v1/chat/completions",
      {
        model: "codex",
        metadata: { codex: { profile: "host-profile" } },
        messages: [{ role: "user", content: "hello" }],
      },
      authHeaders,
    );
    if (
      deniedProfile.status !== 400 ||
      deniedProfile.body?.error?.code !== "unsupported_metadata"
    ) {
      fail(
        `gateway smoke profile override expected unsupported_metadata, got ${JSON.stringify(deniedProfile)}`,
      );
    }
    const allowedWorkspace = await requestJson(
      port,
      "POST",
      "/v1/chat/completions",
      {
        model: "codex-shared",
        metadata: { codex: { workspace: "shared" } },
        messages: [{ role: "user", content: "hello" }],
      },
      authHeaders,
    );
    if (allowedWorkspace.status !== 200) {
      fail(`gateway smoke allowlisted workspace expected 200, got ${allowedWorkspace.status}`);
    }
    const splitJsonUsage = await requestJson(
      port,
      "POST",
      "/v1/chat/completions",
      {
        model: "codex",
        messages: [{ role: "user", content: "SPLIT_JSON_USAGE" }],
      },
      authHeaders,
    );
    if (splitJsonUsage.body?.usage?.total_tokens !== 12) {
      fail(
        `gateway smoke split JSONL usage expected 12 total tokens, got ${JSON.stringify(splitJsonUsage.body?.usage)}`,
      );
    }
    const successfulTreeStarted = Date.now();
    const successfulTree = await requestJson(
      port,
      "POST",
      "/v1/chat/completions",
      {
        model: "codex",
        messages: [{ role: "user", content: "SPAWN_CHILD_SUCCESS" }],
      },
      authHeaders,
    );
    if (
      successfulTree.status !== 200 ||
      !successfulTree.body?.choices?.[0]?.message?.content?.includes("SUCCESS_TREE_REAPED")
    ) {
      fail(`gateway successful process-tree smoke failed: ${JSON.stringify(successfulTree)}`);
    }
    if (Date.now() - successfulTreeStarted > 4_000) {
      fail("gateway successful process-tree cleanup waited for an inherited helper pipe timeout");
    }
    const successChildPidFile = path.join(workspace, "success-child.pid");
    await waitForFile(successChildPidFile);
    const successChildPid = Number(fs.readFileSync(successChildPidFile, "utf8"));
    if (!Number.isInteger(successChildPid) || !(await waitForProcessExit(successChildPid))) {
      fail(`gateway successful request left descendant process ${successChildPid} alive`);
    }
    const invalidCwd = await requestJson(
      port,
      "POST",
      "/v1/chat/completions",
      {
        model: "codex",
        metadata: { codex: { cwd_subdir: "missing" } },
        messages: [{ role: "user", content: "hello" }],
      },
      authHeaders,
    );
    if (invalidCwd.status !== 400) {
      fail(`gateway smoke cwd_subdir expected 400, got ${invalidCwd.status}`);
    }
    const tooLarge = await requestJson(
      port,
      "POST",
      "/v1/chat/completions",
      JSON.stringify({
        model: "codex",
        messages: [{ role: "user", content: "x".repeat(512) }],
      }),
      authHeaders,
    );
    if (tooLarge.status !== 413) {
      fail(`gateway smoke body limit expected 413, got ${tooLarge.status}`);
    }
    const timeout = await requestJson(
      port,
      "POST",
      "/v1/chat/completions",
      {
        model: "codex",
        metadata: { codex: { timeout_seconds: 1 } },
        messages: [{ role: "user", content: "SPAWN_CHILD_IGNORE_SIGTERM" }],
      },
      authHeaders,
    );
    if (timeout.status !== 504) {
      fail(
        `gateway smoke timeout expected 504, got ${timeout.status} ${JSON.stringify(timeout.body)}`,
      );
    }
    const timeoutChildPidFile = path.join(workspace, "timeout-child.pid");
    await waitForFile(timeoutChildPidFile);
    const timeoutChildPid = Number(fs.readFileSync(timeoutChildPidFile, "utf8"));
    if (!Number.isInteger(timeoutChildPid) || !(await waitForProcessExit(timeoutChildPid))) {
      fail(`gateway timeout left descendant process ${timeoutChildPid} alive`);
    }

    const abortBody = JSON.stringify({
      model: "codex",
      messages: [{ role: "user", content: "SPAWN_CHILD_IGNORE_SIGTERM CLIENT_ABORT" }],
    });
    const abortRequest = http.request(
      {
        host: "127.0.0.1",
        port,
        method: "POST",
        path: "/v1/chat/completions",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "content-length": Buffer.byteLength(abortBody),
        },
      },
      (response) => response.resume(),
    );
    abortRequest.on("error", () => {});
    abortRequest.write(abortBody);
    abortRequest.end();
    const abortChildPidFile = path.join(workspace, "abort-child.pid");
    await waitForFile(abortChildPidFile);
    abortRequest.destroy();
    const abortChildPid = Number(fs.readFileSync(abortChildPidFile, "utf8"));
    if (!Number.isInteger(abortChildPid) || !(await waitForProcessExit(abortChildPid))) {
      fail(`gateway client disconnect left descendant process ${abortChildPid} alive`);
    }
    const probeScript = path.join(skillRoot, "scripts/probe-openai-compatible-endpoint.mjs");
    const probe = spawnSync(
      process.execPath,
      [
        probeScript,
        "--base-url",
        `http://127.0.0.1:${port}/v1`,
        "--model",
        "codex",
        "--api-key",
        "smoke-token",
        "--json",
      ],
      { cwd: root, encoding: "utf8", timeout: 10000 },
    );
    if (probe.status !== 0) {
      fail(`endpoint probe smoke failed: ${probe.status}\n${probe.stdout}\n${probe.stderr}`);
    }
    if (probe.stdout.includes("SKILLOPT_ENDPOINT_READY")) {
      fail("endpoint probe JSON leaked raw assistant content");
    }
    const probeResult = JSON.parse(probe.stdout);
    if (!probeResult.ok || probeResult.chat?.payload?.assistant_content_present !== true) {
      fail(`endpoint probe smoke returned unexpected JSON: ${probe.stdout}`);
    }
  } finally {
    for (const name of [
      "success-child.pid",
      "timeout-child.pid",
      "timeout-parent.pid",
      "abort-child.pid",
      "abort-parent.pid",
    ]) {
      const pidFile = path.join(workspace, name);
      if (!fs.existsSync(pidFile)) continue;
      const pid = Number(fs.readFileSync(pidFile, "utf8"));
      if (!Number.isInteger(pid)) continue;
      try {
        process.kill(pid, "SIGKILL");
      } catch (error) {
        if (error?.code !== "ESRCH" && cleanupError === null) cleanupError = error;
      }
    }
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await new Promise((resolve) => child.once("exit", resolve));
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  if (cleanupError) throw cleanupError;

  if (/sk-[A-Za-z0-9_-]{8,}/.test(stderr)) {
    fail("gateway smoke leaked a secret-like token to stderr");
  }
}

async function validateEndpointProbeRedaction() {
  const probeScript = path.join(skillRoot, "scripts/probe-openai-compatible-endpoint.mjs");
  const urlSecrets = [
    "url-user-secret",
    "url-password-secret",
    "query-secret",
    "signature-secret",
    "fragment-secret",
  ];
  const unsafeUrl =
    "http://url-user-secret:url-password-secret@127.0.0.1:1/v1" +
    "?api_key=query-secret&X-Amz-Signature=signature-secret#fragment-secret";
  const unsafeResult = spawnSync(
    process.execPath,
    [
      probeScript,
      "--base-url",
      unsafeUrl,
      "--model",
      "probe-model",
      "--timeout-ms",
      "1000",
      "--json",
    ],
    { cwd: root, encoding: "utf8", timeout: 5000 },
  );
  const unsafeOutput = `${unsafeResult.stdout}${unsafeResult.stderr}`;
  if (unsafeResult.status !== 1) {
    fail(`endpoint probe unsafe-URL smoke exited ${unsafeResult.status}`);
  }
  for (const secret of urlSecrets) {
    assertNotIncludes("endpoint probe unsafe URL", unsafeOutput, secret);
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-endpoint-redaction-"));
  const serverScript = path.join(tempDir, "echo-server.mjs");
  const readyFile = path.join(tempDir, "ready");
  const apiKey = "probe-bearer-secret-value";
  const responseSecret = "provider-response-secret-value";
  writeFile(
    serverScript,
    `import fs from "node:fs";
import http from "node:http";
const server = http.createServer((request, response) => {
  response.writeHead(500, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: {
    type: "provider_error",
    code: "echo_error",
    message: "authorization=" + request.headers.authorization + " response=${responseSecret}",
  }}));
});
server.listen(${15150 + Math.floor(Math.random() * 1000)}, "127.0.0.1", () => {
  fs.writeFileSync(${JSON.stringify(readyFile)}, String(server.address().port));
});
`,
  );
  const server = spawn(process.execPath, [serverScript], {
    cwd: tempDir,
    stdio: ["ignore", "ignore", "pipe"],
  });
  let stderr = "";
  server.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });
  try {
    await waitForFile(readyFile);
    const port = Number(fs.readFileSync(readyFile, "utf8"));
    const echoResult = spawnSync(
      process.execPath,
      [
        probeScript,
        "--base-url",
        `http://127.0.0.1:${port}/v1?token=${responseSecret}`,
        "--api-key",
        apiKey,
        "--model",
        "probe-model",
        "--timeout-ms",
        "2000",
        "--json",
      ],
      { cwd: root, encoding: "utf8", timeout: 5000 },
    );
    const echoOutput = `${echoResult.stdout}${echoResult.stderr}`;
    if (echoResult.status !== 1) {
      fail(`endpoint probe provider-error smoke exited ${echoResult.status}: ${echoOutput}`);
    }
    for (const secret of [apiKey, responseSecret]) {
      assertNotIncludes("endpoint probe provider error", echoOutput, secret);
    }
    assertIncludes("endpoint probe provider error", echoOutput, "[redacted]");
  } finally {
    if (server.exitCode === null) {
      server.kill("SIGTERM");
      await new Promise((resolve) => server.once("close", resolve));
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  if (stderr) fail(`endpoint probe redaction server failed: ${stderr}`);
}

function validateGatewayConfigHardening() {
  const gateway = path.join(skillRoot, "scripts/codex-local-openai-chat-gateway.mjs");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-gateway-config-"));
  try {
    const missingValue = spawnSync(process.execPath, [gateway, "--config"], {
      cwd: root,
      encoding: "utf8",
      timeout: 10000,
    });
    if (
      missingValue.status !== 2 ||
      !`${missingValue.stdout}${missingValue.stderr}`.includes("--config requires a value")
    ) {
      fail("gateway config hardening did not reject missing --config value");
    }

    const protoConfig = path.join(tempDir, "proto.json");
    fs.writeFileSync(
      protoConfig,
      '{"__proto__":{"polluted":true},"auth":{"enabled":false}}\n',
      "utf8",
    );
    const protoResult = spawnSync(process.execPath, [gateway, "--config", protoConfig], {
      cwd: root,
      encoding: "utf8",
      timeout: 10000,
    });
    if (
      protoResult.status !== 2 ||
      !`${protoResult.stdout}${protoResult.stderr}`.includes("Unsupported config key: __proto__")
    ) {
      fail("gateway config hardening did not reject prototype pollution keys");
    }

    const yamlProtoConfig = path.join(tempDir, "proto.yaml");
    fs.writeFileSync(
      yamlProtoConfig,
      "__proto__:\n  polluted: true\nauth:\n  enabled: false\n",
      "utf8",
    );
    const yamlProtoResult = spawnSync(process.execPath, [gateway, "--config", yamlProtoConfig], {
      cwd: root,
      encoding: "utf8",
      timeout: 10000,
    });
    if (
      yamlProtoResult.status !== 2 ||
      !`${yamlProtoResult.stdout}${yamlProtoResult.stderr}`.includes(
        "Unsupported config key: __proto__",
      )
    ) {
      fail("gateway YAML parser accepted a prototype pollution key");
    }

    const numericConfig = path.join(tempDir, "numeric.json");
    fs.writeFileSync(
      numericConfig,
      JSON.stringify({
        server: { host: "127.0.0.1", port: 15090 },
        auth: { enabled: false },
        codex: { max_queue_length: -1 },
      }),
      "utf8",
    );
    const numericResult = spawnSync(process.execPath, [gateway, "--config", numericConfig], {
      cwd: root,
      encoding: "utf8",
      timeout: 10000,
    });
    if (
      numericResult.status !== 2 ||
      !`${numericResult.stdout}${numericResult.stderr}`.includes(
        "codex.max_queue_length must be a non-negative integer",
      )
    ) {
      fail("gateway config hardening did not reject invalid numeric limits");
    }

    const quotedBooleanConfig = path.join(tempDir, "quoted-boolean.json");
    fs.writeFileSync(
      quotedBooleanConfig,
      JSON.stringify({
        server: { host: "127.0.0.1", port: 15092 },
        auth: { enabled: false },
        workspaces: { default: { path: tempDir, allow_write: "false" } },
      }),
      "utf8",
    );
    const quotedBooleanResult = spawnSync(
      process.execPath,
      [gateway, "--config", quotedBooleanConfig],
      { cwd: root, encoding: "utf8", timeout: 10000 },
    );
    if (
      quotedBooleanResult.status !== 2 ||
      !`${quotedBooleanResult.stdout}${quotedBooleanResult.stderr}`.includes(
        "workspaces.default.allow_write must be a boolean",
      )
    ) {
      fail("gateway config hardening accepted quoted false as a truthy write authorization");
    }

    const writableWorkspaceConfig = path.join(tempDir, "writable-workspace.json");
    fs.writeFileSync(
      writableWorkspaceConfig,
      JSON.stringify({
        server: { host: "127.0.0.1", port: 15093 },
        auth: { enabled: false },
        workspaces: { default: { path: tempDir, allow_write: true } },
      }),
      "utf8",
    );
    const writableWorkspaceResult = spawnSync(
      process.execPath,
      [gateway, "--config", writableWorkspaceConfig],
      { cwd: root, encoding: "utf8", timeout: 10000 },
    );
    if (
      writableWorkspaceResult.status !== 2 ||
      !`${writableWorkspaceResult.stdout}${writableWorkspaceResult.stderr}`.includes(
        "allow_write=true is unsupported",
      )
    ) {
      fail("gateway config hardening accepted a writable workspace without OS isolation");
    }

    const workspaceWriteModelConfig = path.join(tempDir, "workspace-write-model.json");
    fs.writeFileSync(
      workspaceWriteModelConfig,
      JSON.stringify({
        server: { host: "127.0.0.1", port: 15094 },
        auth: { enabled: false },
        workspaces: { default: { path: tempDir, allow_write: false } },
        models: {
          codex: {
            codex_model: "test",
            workspace: "default",
            sandbox: "workspace-write",
          },
        },
      }),
      "utf8",
    );
    const workspaceWriteModelResult = spawnSync(
      process.execPath,
      [gateway, "--config", workspaceWriteModelConfig],
      { cwd: root, encoding: "utf8", timeout: 10000 },
    );
    if (
      workspaceWriteModelResult.status !== 2 ||
      !`${workspaceWriteModelResult.stdout}${workspaceWriteModelResult.stderr}`.includes(
        "uses workspace-write",
      )
    ) {
      fail("gateway config hardening accepted a workspace-write model without OS isolation");
    }

    for (const [name, codex, expected] of [
      [
        "user-config",
        { ignore_user_config: false },
        "codex.ignore_user_config=false is unsupported",
      ],
      ["rules", { ignore_rules: false }, "codex.ignore_rules=false is unsupported"],
      ["environment", { inherit_env: true }, "codex.inherit_env=true is unsupported"],
      ["profiles", { allowed_profiles: ["host-profile"] }, "codex.allowed_profiles must be empty"],
    ]) {
      const strictConfig = path.join(tempDir, `strict-${name}.json`);
      fs.writeFileSync(
        strictConfig,
        JSON.stringify({
          server: { host: "127.0.0.1", port: 15095 },
          auth: { enabled: false },
          codex,
        }),
        "utf8",
      );
      const strictResult = spawnSync(process.execPath, [gateway, "--config", strictConfig], {
        cwd: root,
        encoding: "utf8",
        timeout: 10000,
      });
      if (
        strictResult.status !== 2 ||
        !`${strictResult.stdout}${strictResult.stderr}`.includes(expected)
      ) {
        fail(`gateway config hardening accepted insecure ${name} settings`);
      }
    }

    const modelProfileConfig = path.join(tempDir, "model-profile.json");
    fs.writeFileSync(
      modelProfileConfig,
      JSON.stringify({
        server: { host: "127.0.0.1", port: 15096 },
        auth: { enabled: false },
        workspaces: { default: { path: tempDir, allow_write: false } },
        models: {
          codex: {
            codex_model: "test",
            workspace: "default",
            sandbox: "read-only",
            profile: "host-profile",
          },
        },
      }),
      "utf8",
    );
    const modelProfileResult = spawnSync(
      process.execPath,
      [gateway, "--config", modelProfileConfig],
      { cwd: root, encoding: "utf8", timeout: 10000 },
    );
    if (
      modelProfileResult.status !== 2 ||
      !`${modelProfileResult.stdout}${modelProfileResult.stderr}`.includes(
        "profiles are unsupported for the strict gateway",
      )
    ) {
      fail("gateway config hardening accepted a model profile");
    }

    const remoteConfig = path.join(tempDir, "remote.json");
    fs.writeFileSync(
      remoteConfig,
      JSON.stringify({
        server: { host: "0.0.0.0", port: 15091 },
        auth: { enabled: true, bearer_tokens: ["remote-smoke-token"] },
      }),
      "utf8",
    );
    const remoteResult = spawnSync(process.execPath, [gateway, "--config", remoteConfig], {
      cwd: root,
      encoding: "utf8",
      timeout: 10000,
    });
    if (
      remoteResult.status !== 2 ||
      !`${remoteResult.stdout}${remoteResult.stderr}`.includes("Non-loopback bindings are disabled")
    ) {
      fail("gateway config hardening did not reject a non-loopback listener");
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function validateGatewaySpawnFailureRedaction() {
  const gateway = path.join(skillRoot, "scripts/codex-local-openai-chat-gateway.mjs");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-gateway-spawn-"));
  const configPath = path.join(tempDir, "gateway-config.json");
  const workspace = path.join(tempDir, "workspace");
  const missingBinary = path.join(tempDir, "missing-codex-binary");
  const authHeaders = { authorization: "Bearer spawn-token" };
  fs.mkdirSync(workspace, { recursive: true });
  const port = 16100 + Math.floor(Math.random() * 1000);
  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        server: { host: "127.0.0.1", port, request_body_limit_bytes: 1024 },
        codex: { binary: missingBinary },
        workspaces: { default: { path: workspace, allow_write: false } },
        models: {
          codex: {
            codex_model: "fake-codex",
            workspace: "default",
            sandbox: "read-only",
          },
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  const child = spawn(process.execPath, [gateway, "--config", configPath], {
    cwd: root,
    env: { ...process.env, CODEX_GATEWAY_API_KEY: "spawn-token" },
    stdio: ["ignore", "ignore", "pipe"],
  });
  try {
    await waitForGateway(port, child);
    const chat = await requestJson(
      port,
      "POST",
      "/v1/chat/completions",
      {
        model: "codex",
        messages: [{ role: "user", content: "hello" }],
      },
      authHeaders,
    );
    const bodyText = JSON.stringify(chat.body);
    if (chat.status !== 500 || chat.body?.error?.message !== "Codex process failed") {
      fail(`gateway spawn failure expected generic 500, got ${chat.status} ${bodyText}`);
    }
    if (bodyText.includes(missingBinary) || bodyText.includes(tempDir)) {
      fail("gateway spawn failure leaked a local binary path to the client");
    }
    const streamFailure = await requestJson(
      port,
      "POST",
      "/v1/chat/completions",
      {
        model: "codex",
        stream: true,
        messages: [{ role: "user", content: "hello" }],
      },
      authHeaders,
    );
    const streamFailureText = JSON.stringify(streamFailure.body);
    if (
      streamFailure.status !== 500 ||
      streamFailure.body?.error?.message !== "Codex process failed"
    ) {
      fail(
        `gateway streaming spawn failure expected generic 500 before SSE starts, got ${streamFailure.status} ${streamFailureText}`,
      );
    }
    if (
      streamFailureText.includes("chat.completion.chunk") ||
      streamFailureText.includes(missingBinary)
    ) {
      fail("gateway streaming spawn failure leaked SSE success chunks or local paths");
    }
  } finally {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await new Promise((resolve) => child.once("exit", resolve));
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function validateGatewayEarlyExitStdinSafety() {
  const gateway = path.join(skillRoot, "scripts/codex-local-openai-chat-gateway.mjs");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-gateway-epipe-"));
  const fastExit = path.join(tempDir, "fast-exit.mjs");
  const configPath = path.join(tempDir, "gateway-config.json");
  const workspace = path.join(tempDir, "workspace");
  const authHeaders = { authorization: "Bearer epipe-token" };
  fs.mkdirSync(workspace, { recursive: true });
  writeFile(fastExit, "#!/usr/bin/env node\nprocess.exit(0);\n");
  fs.chmodSync(fastExit, 0o755);
  const port = 17100 + Math.floor(Math.random() * 1000);
  writeFile(
    configPath,
    `${JSON.stringify(
      {
        server: {
          host: "127.0.0.1",
          port,
          request_body_limit_bytes: 512 * 1024,
        },
        codex: {
          binary: fastExit,
          default_timeout_seconds: 3,
          max_timeout_seconds: 3,
        },
        workspaces: { default: { path: workspace, allow_write: false } },
        models: {
          codex: {
            codex_model: "fast-exit",
            workspace: "default",
            sandbox: "read-only",
          },
        },
      },
      null,
      2,
    )}\n`,
  );

  const child = spawn(process.execPath, [gateway, "--config", configPath], {
    cwd: root,
    env: { ...process.env, CODEX_GATEWAY_API_KEY: "epipe-token" },
    stdio: ["ignore", "ignore", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });
  try {
    await waitForGateway(port, child);
    const response = await requestJson(
      port,
      "POST",
      "/v1/chat/completions",
      {
        model: "codex",
        messages: [{ role: "user", content: "x".repeat(190_000) }],
      },
      authHeaders,
    );
    if (![500, 502].includes(response.status)) {
      fail(`gateway early-exit smoke expected a generic 5xx, got ${response.status}`);
    }
    if (child.exitCode !== null) {
      fail(`gateway crashed after a child stdin EPIPE with code ${child.exitCode}: ${stderr}`);
    }
    const health = await requestJson(port, "GET", "/healthz");
    if (health.status !== 200) {
      fail(`gateway was not healthy after a child stdin EPIPE: ${health.status}`);
    }
  } finally {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await new Promise((resolve) => child.once("exit", resolve));
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function validateStaleAdapterManifestBlocksTraining() {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-stale-manifest-"));
  const skillName = "stale-skill";
  const installedAdapter = ".agents/tools/SkillOpt/skillopt/envs/agent_skills/adapter.py";
  const installedReflector =
    ".agents/tools/SkillOpt/skillopt/envs/agent_skills/codex_cli_reflector.py";
  const installedEvaluator = ".agents/tools/SkillOpt/skillopt/envs/agent_skills/evaluator.py";
  const sourceTemplate = "templates/adapter.py";
  try {
    writeFile(path.join(tempRepo, "package.json"), "{}\n");
    writeFile(path.join(tempRepo, "AGENTS.md"), "# Agent Instructions\n");
    writeFile(path.join(tempRepo, ".gitignore"), ".agents/\n");
    writeFile(
      path.join(tempRepo, "incubator/skills", skillName, "SKILL.md"),
      `---
name: ${skillName}
description: Temporary skill used only by the SkillOpt validator.
---

# Stale Skill
`,
    );
    writeFile(
      path.join(tempRepo, "skill-evals", skillName, "cases/example.md"),
      `# Example

## Should Trigger

Yes.

## Prompt

Prepare SkillOpt.

## Deterministic Assertions

- contains: SkillOpt
`,
    );

    const adapterText = "# adapter template\n";
    writeFile(path.join(tempRepo, sourceTemplate), adapterText);
    writeFile(path.join(tempRepo, installedAdapter), adapterText);
    writeFile(path.join(tempRepo, installedReflector), "# codex-cli local truncation\n");
    writeFile(path.join(tempRepo, installedEvaluator), "# evaluator\n");
    fs.mkdirSync(path.join(tempRepo, ".agents/tools/SkillOpt/.venv"), {
      recursive: true,
    });

    const configSource = fs
      .readFileSync(path.join(assetRoot, "config.codex-cli-all.yaml"), "utf8")
      .replaceAll("<skill>", skillName)
      .replaceAll("<run-name>", "run-001")
      .replaceAll("<run-profile>", "exploratory");
    writeFile(
      path.join(
        tempRepo,
        ".agents/skillopt-work",
        skillName,
        "configs/agent-skills.codex-cli-all.yaml",
      ),
      configSource,
    );

    writeFile(
      path.join(tempRepo, ".agents/skillopt-work", skillName, "adapter-manifest.json"),
      `${JSON.stringify(
        {
          registry_patch: { status: "ready" },
          installed_files: [installedAdapter, installedReflector, installedEvaluator],
          template_sources: {
            [installedAdapter]: { source: sourceTemplate },
          },
        },
        null,
        2,
      )}\n`,
    );

    const readiness = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/check-skillopt-readiness.mjs"),
        "--skill",
        skillName,
        "--mode",
        "codex-cli-all",
        "--run-profile",
        "exploratory",
        "--strict-training-ready",
        "--no-codex-probe",
        "--json",
      ],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    if (readiness.status === 0) {
      fail("stale adapter manifest strict readiness unexpectedly passed");
    }
    const parsed = JSON.parse(readiness.stdout);
    if (parsed.adapterManifestCheck?.status !== "refresh_required") {
      fail(
        `stale adapter manifest expected refresh_required, got ${parsed.adapterManifestCheck?.status}`,
      );
    }
    for (const needle of [
      "missing target identity",
      "missing mode identity",
      "missing run profile identity",
    ]) {
      if (!parsed.adapterManifestCheck.warnings.some((warning) => warning.includes(needle))) {
        fail(`stale adapter manifest did not warn about ${needle}`);
      }
    }
    if (!parsed.trainingBlockers?.includes("adapter manifest/config refresh required")) {
      fail("stale adapter manifest did not block strict training readiness");
    }
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

function validateActiveSplitDataFloor() {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-active-split-floor-"));
  const skillName = "active-split-skill";
  try {
    writeFile(path.join(tempRepo, "package.json"), "{}\n");
    writeFile(path.join(tempRepo, "AGENTS.md"), "# Agent Instructions\n");
    writeFile(path.join(tempRepo, ".gitignore"), ".agents/\n");
    writeFile(
      path.join(tempRepo, "incubator/skills", skillName, "SKILL.md"),
      `---
name: ${skillName}
description: Temporary skill used only by the SkillOpt validator.
---

# Active Split Skill
`,
    );

    for (let index = 0; index < 25; index += 1) {
      const visualSection =
        index < 10
          ? `
## Visual Assertions

- artifact_exists: *.png
`
          : "";
      writeFile(
        path.join(tempRepo, "skill-evals", skillName, "cases", `case-${index}.md`),
        `# Case ${index}

## Should Trigger

Yes.

## Prompt

Prepare SkillOpt case ${index}.

## Deterministic Assertions

- contains: SkillOpt
${visualSection}`,
      );
    }

    const makeItem = (index, visual = false) => ({
      id: `${skillName}/case-${index}`,
      skill_name: skillName,
      case_path: `skill-evals/${skillName}/cases/case-${index}.md`,
      prompt: `Prepare SkillOpt case ${index}.`,
      deterministic_assertions: ["contains: SkillOpt"],
      visual_assertions: visual ? ["artifact_exists: *.png"] : [],
      expected_behavior: ["uses SkillOpt"],
      rubric_path: null,
      fixtures: [],
      split_family: `case:case-${index}`,
      split_group: `sha256:test-group-${index}`,
      tags: ["positive"],
      should_trigger: true,
      workspace_policy: visual ? "isolated-artifact-write" : "text-only",
      source_hash: `test-source-${index}`,
    });
    const writeItems = (split, items) => {
      writeFile(
        path.join(tempRepo, ".agents/skillopt-work", skillName, "data", split, "items.json"),
        `${JSON.stringify(items, null, 2)}\n`,
      );
    };
    writeItems(
      "train",
      Array.from({ length: 13 }, (_, index) => makeItem(index, index < 5)),
    );
    writeItems(
      "val",
      Array.from({ length: 6 }, (_, index) => makeItem(index + 13, index < 3)),
    );
    writeItems(
      "test",
      Array.from({ length: 6 }, (_, index) => makeItem(index + 19, index < 2)),
    );

    const writeTextOnlyItems = (split, items) => {
      writeFile(
        path.join(
          tempRepo,
          ".agents/skillopt-work",
          skillName,
          "data-text-only",
          split,
          "items.json",
        ),
        `${JSON.stringify(items, null, 2)}\n`,
      );
    };
    writeTextOnlyItems("train", [makeItem(10)]);
    writeTextOnlyItems("val", [makeItem(11)]);
    writeTextOnlyItems("test", [makeItem(12)]);
    writeFile(
      path.join(tempRepo, ".agents/skillopt-work", skillName, "activation/negative-cases.json"),
      "[]\n",
    );

    const configSource = fs
      .readFileSync(path.join(assetRoot, "config.hybrid-codex-target.yaml"), "utf8")
      .replaceAll("<skill>", skillName)
      .replaceAll("<run-name>", "run-001")
      .replaceAll("<run-profile>", "official-parity")
      .replaceAll("<split-dir>", `.agents/skillopt-work/${skillName}/data-text-only`)
      .replaceAll("<visual-eval-policy>", "text-only");
    writeFile(
      path.join(
        tempRepo,
        ".agents/skillopt-work",
        skillName,
        "configs/agent-skills.hybrid-codex-target.yaml",
      ),
      configSource,
    );

    const readiness = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/check-skillopt-readiness.mjs"),
        "--skill",
        skillName,
        "--mode",
        "hybrid-codex-target",
        "--run-profile",
        "official-parity",
        "--no-codex-probe",
        "--json",
      ],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    if (readiness.status !== 0) {
      fail(
        `active split readiness smoke failed unexpectedly: ${readiness.status}\n${readiness.stdout}\n${readiness.stderr}`,
      );
    }
    const parsed = JSON.parse(readiness.stdout);
    if (parsed.benchmarkQuality?.officialFloorMet !== false) {
      fail("active split readiness incorrectly marked official floor as met");
    }
    if (parsed.benchmarkQuality?.activePositiveCases !== 3) {
      fail(
        `active split readiness expected 3 active positives, got ${parsed.benchmarkQuality?.activePositiveCases}`,
      );
    }
    if (!parsed.benchmarkQuality?.splitCounts?.path?.endsWith("/data-text-only")) {
      fail(
        `active split readiness did not score the configured data-text-only split: ${parsed.benchmarkQuality?.splitCounts?.path}`,
      );
    }
    if (!parsed.trainingBlockers?.some((blocker) => blocker.includes("active dataset floor"))) {
      fail("active split readiness did not block official training on active dataset floor");
    }
    for (const needle of [
      "SKILLOPT_OPTIMIZER_MODEL",
      "SKILLOPT_TARGET_MODEL",
      "SKILLOPT_JUDGE_MODEL",
    ]) {
      if (!parsed.trainingBlockers?.some((blocker) => blocker.includes(needle))) {
        fail(`active split readiness did not include model pin blocker ${needle}`);
      }
    }

    const staleItem = makeItem(10);
    delete staleItem.split_group;
    writeTextOnlyItems("train", [staleItem]);
    const staleSplitReadiness = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/check-skillopt-readiness.mjs"),
        "--skill",
        skillName,
        "--mode",
        "hybrid-codex-target",
        "--run-profile",
        "official-parity",
        "--no-codex-probe",
        "--json",
      ],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    const staleParsed = JSON.parse(staleSplitReadiness.stdout);
    if (
      !staleParsed.trainingBlockers?.some((blocker) => blocker.includes("missing required fields"))
    ) {
      fail("readiness accepted stale split items without split_group metadata");
    }
    writeTextOnlyItems("train", [makeItem(10)]);

    const crossingTrain = makeItem(10);
    const crossingVal = makeItem(11);
    crossingVal.split_family = crossingTrain.split_family;
    crossingVal.split_group = crossingTrain.split_group;
    writeTextOnlyItems("train", [crossingTrain]);
    writeTextOnlyItems("val", [crossingVal]);
    const crossingReadiness = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/check-skillopt-readiness.mjs"),
        "--skill",
        skillName,
        "--mode",
        "hybrid-codex-target",
        "--run-profile",
        "official-parity",
        "--no-codex-probe",
        "--json",
      ],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    const crossingParsed = JSON.parse(crossingReadiness.stdout);
    if (
      !crossingParsed.trainingBlockers?.some((blocker) =>
        blocker.includes("split_group value(s) across"),
      ) ||
      !crossingParsed.trainingBlockers?.some((blocker) =>
        blocker.includes("split_family value(s) across"),
      )
    ) {
      fail("readiness accepted split_group/split_family leakage across heldout boundaries");
    }
    writeTextOnlyItems("train", [makeItem(10)]);
    writeTextOnlyItems("val", [makeItem(11)]);

    const missingSplitConfig = configSource.replaceAll(
      `.agents/skillopt-work/${skillName}/data-text-only`,
      `.agents/skillopt-work/${skillName}/missing-data`,
    );
    writeFile(
      path.join(
        tempRepo,
        ".agents/skillopt-work",
        skillName,
        "configs/agent-skills.hybrid-codex-target.yaml",
      ),
      missingSplitConfig,
    );
    const missingReadiness = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/check-skillopt-readiness.mjs"),
        "--skill",
        skillName,
        "--mode",
        "hybrid-codex-target",
        "--run-profile",
        "official-parity",
        "--no-codex-probe",
        "--json",
      ],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    if (missingReadiness.status !== 0) {
      fail(
        `missing active split readiness smoke failed unexpectedly: ${missingReadiness.status}\n${missingReadiness.stdout}\n${missingReadiness.stderr}`,
      );
    }
    const missingParsed = JSON.parse(missingReadiness.stdout);
    if (missingParsed.benchmarkQuality?.activePositiveCases !== 0) {
      fail(
        `missing active split should score zero active positives, got ${missingParsed.benchmarkQuality?.activePositiveCases}`,
      );
    }
    if (
      !missingParsed.trainingBlockers?.some((blocker) =>
        blocker.includes("configured split_dir is missing"),
      )
    ) {
      fail("missing configured split_dir did not block training readiness");
    }
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

function validateNoneVisualAssertionsIgnored() {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-none-visual-"));
  const skillName = "none-visual-skill";
  try {
    writeFile(path.join(tempRepo, "package.json"), "{}\n");
    writeFile(path.join(tempRepo, ".gitignore"), ".agents/\n");
    writeFile(
      path.join(tempRepo, "incubator/skills", skillName, "SKILL.md"),
      `---
name: ${skillName}
description: Temporary skill used only by the SkillOpt validator.
---

# None Visual Skill
`,
    );
    writeFile(
      path.join(tempRepo, "skill-evals", skillName, "cases/text-only.md"),
      `# Text Only

## Should Trigger

Yes.

## Prompt

Prepare a text-only SkillOpt setup.

## Deterministic Assertions

- contains: SkillOpt

## Visual Assertions

- None.
`,
    );
    writeFile(
      path.join(tempRepo, "skill-evals", skillName, "cases/actual-visual.md"),
      `# Actual Visual

## Should Trigger

Yes.

## Prompt

Prepare a visual SkillOpt setup.

## Deterministic Assertions

- contains: SkillOpt

## Visual Assertions

- artifact_exists: *.png
`,
    );
    const split = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/prepare-skillopt-split.mjs"),
        "--skill",
        skillName,
        "--seed",
        "42",
        "--json",
      ],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    if (split.status !== 0) {
      fail(`none visual split smoke failed: ${split.status}\n${split.stdout}\n${split.stderr}`);
    }
    const metadata = JSON.parse(
      fs.readFileSync(
        path.join(tempRepo, ".agents/skillopt-work", skillName, "dataset-metadata.json"),
        "utf8",
      ),
    );
    if (metadata.positive_with_visual_assertions !== 1) {
      fail(
        `None visual assertion sentinel should not count as visual; got ${metadata.positive_with_visual_assertions}`,
      );
    }
    const textOnlyItems = ["train", "val", "test"].flatMap((splitName) =>
      JSON.parse(
        fs.readFileSync(
          path.join(
            tempRepo,
            ".agents/skillopt-work",
            skillName,
            "data-text-only",
            splitName,
            "items.json",
          ),
          "utf8",
        ),
      ),
    );
    const textOnlyCase = textOnlyItems.find((item) => item.id.endsWith("/text-only"));
    if (!textOnlyCase) {
      fail("None visual assertion sentinel case was incorrectly excluded from data-text-only");
    }
    if (textOnlyCase.visual_assertions.length !== 0) {
      fail(
        `None visual assertion sentinel was persisted as a visual assertion: ${textOnlyCase.visual_assertions.join(", ")}`,
      );
    }
    if (textOnlyCase.workspace_policy !== "text-only") {
      fail(`text-only case advertised unsafe workspace policy ${textOnlyCase.workspace_policy}`);
    }
    const fullItems = ["train", "val", "test"].flatMap((splitName) =>
      JSON.parse(
        fs.readFileSync(
          path.join(tempRepo, ".agents/skillopt-work", skillName, "data", splitName, "items.json"),
          "utf8",
        ),
      ),
    );
    const visualCase = fullItems.find((item) => item.id.endsWith("/actual-visual"));
    if (visualCase?.workspace_policy !== "isolated-artifact-write") {
      fail(`visual case did not declare isolated artifact writes: ${visualCase?.workspace_policy}`);
    }
    if (fullItems.some((item) => item.workspace_policy === "workspace-write")) {
      fail("generated split retained legacy broad workspace-write metadata");
    }
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

function validateGroupedSplitsAndTextOnlyMembership() {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-grouped-split-"));
  const skillName = "grouped-split-skill";
  try {
    writeFile(path.join(tempRepo, "package.json"), "{}\n");
    writeFile(path.join(tempRepo, ".gitignore"), ".agents/\n");
    writeFile(
      path.join(tempRepo, "incubator/skills", skillName, "SKILL.md"),
      `---
name: ${skillName}
description: Temporary skill used only by the grouped SkillOpt split validator.
---

# Grouped Split Skill
`,
    );
    const fixture = `skill-evals/${skillName}/fixtures/shared.txt`;
    writeFile(path.join(tempRepo, fixture), "shared fixture\n");

    const writeCase = (name, { family = "", fixturePath = "", visual = false } = {}) => {
      writeFile(
        path.join(tempRepo, "skill-evals", skillName, "cases", `${name}.md`),
        `# ${name}

## Prompt

Prepare ${name}.

## Should Trigger

Yes
${family ? `\n## Split Family\n\n${family}\n` : ""}${fixturePath ? `\n## Fixtures\n\n- ${fixturePath}\n` : ""}
## Expected Behavior

- Produce a result.

## Deterministic Assertions

- contains: result
${visual ? `\n## Visual Assertions\n\n- artifact_exists: ${name}.png\n` : ""}`,
      );
    };

    writeCase("family-text", { family: "paired-behavior" });
    writeCase("family-visual", { family: "paired-behavior", visual: true });
    writeCase("fixture-text", { fixturePath: fixture });
    writeCase("fixture-visual", { fixturePath: fixture, visual: true });
    writeCase("transitive-family-a", {
      family: "transitive-alpha",
      fixturePath: fixture,
    });
    writeCase("transitive-bridge", {
      family: "transitive-beta",
      fixturePath: `./${fixture}`,
    });
    writeCase("transitive-family-b", { family: "transitive-beta" });
    for (let index = 0; index < 8; index += 1) writeCase(`independent-${index}`);

    const split = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/prepare-skillopt-split.mjs"),
        "--skill",
        skillName,
        "--seed",
        "42",
        "--json",
      ],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    if (split.status !== 0) {
      fail(`grouped split smoke failed: ${split.status}\n${split.stdout}\n${split.stderr}`);
    }

    const loadSplits = (variant) =>
      Object.fromEntries(
        ["train", "val", "test"].map((splitName) => [
          splitName,
          JSON.parse(
            fs.readFileSync(
              path.join(
                tempRepo,
                ".agents/skillopt-work",
                skillName,
                variant,
                splitName,
                "items.json",
              ),
              "utf8",
            ),
          ),
        ]),
      );
    const full = loadSplits("data");
    const textOnly = loadSplits("data-text-only");
    const membership = (splits, id) =>
      Object.entries(splits).find(([, items]) =>
        items.some((item) => item.id.endsWith(`/${id}`)),
      )?.[0];

    if (membership(full, "family-text") !== membership(full, "family-visual")) {
      fail("explicit split family crossed a train/validation/test boundary");
    }
    if (membership(full, "fixture-text") !== membership(full, "fixture-visual")) {
      fail("shared fixture cases crossed a train/validation/test boundary");
    }
    const transitiveIds = ["transitive-family-a", "transitive-bridge", "transitive-family-b"];
    if (new Set(transitiveIds.map((id) => membership(full, id))).size !== 1) {
      fail("transitively related family/fixture cases crossed a split boundary");
    }
    const transitiveItems = Object.values(full)
      .flat()
      .filter((item) => transitiveIds.some((id) => item.id.endsWith(`/${id}`)));
    if (new Set(transitiveItems.map((item) => item.split_group)).size !== 1) {
      fail("transitively related family/fixture cases did not share split_group metadata");
    }
    for (const [splitName, items] of Object.entries(textOnly)) {
      for (const item of items) {
        if (membership(full, item.id.split("/").at(-1)) !== splitName) {
          fail(`text-only case ${item.id} changed full-split membership`);
        }
        if (!item.split_family) fail(`text-only case ${item.id} omitted split_family metadata`);
        if (!item.split_group) fail(`text-only case ${item.id} omitted split_group metadata`);
      }
    }
    if (
      Object.values(textOnly)
        .flat()
        .some((item) => item.id.endsWith("/family-visual") || item.id.endsWith("/fixture-visual"))
    ) {
      fail("text-only split retained a visual assertion case");
    }
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

function validateGroupedSplitFloorsAndNumericArgs() {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-group-floor-"));
  const skillName = "group-floor-skill";
  try {
    writeFile(path.join(tempRepo, "package.json"), "{}\n");
    writeFile(path.join(tempRepo, ".gitignore"), ".agents/\n");
    writeFile(
      path.join(tempRepo, "incubator/skills", skillName, "SKILL.md"),
      `---
name: ${skillName}
description: Temporary skill used only by the group floor SkillOpt validator.
---

# Group Floor Skill
`,
    );
    const groupSizes = [6, 6, 4, 4];
    for (const [groupIndex, groupSize] of groupSizes.entries()) {
      for (let caseIndex = 0; caseIndex < groupSize; caseIndex += 1) {
        const visual = groupSize === 4;
        writeFile(
          path.join(
            tempRepo,
            "skill-evals",
            skillName,
            "cases",
            `group-${groupIndex}-case-${caseIndex}.md`,
          ),
          `# Group ${groupIndex} case ${caseIndex}

## Prompt

Prepare the grouped result.

## Should Trigger

Yes

## Split Family

floor-group-${groupIndex}

## Expected Behavior

- Produce a result.

## Deterministic Assertions

- contains: result
${visual ? "\n## Visual Assertions\n\n- artifact_exists: grouped.png\n" : ""}`,
        );
      }
    }

    const splitScript = path.join(skillRoot, "scripts/prepare-skillopt-split.mjs");
    const split = spawnSync(
      process.execPath,
      [splitScript, "--skill", skillName, "--seed", "42", "--json"],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    if (split.status !== 0) {
      fail(`group floor split failed: ${split.status}\n${split.stdout}\n${split.stderr}`);
    }
    const result = JSON.parse(split.stdout);
    if (result.counts.train < 1 || result.counts.val < 5 || result.counts.test < 5) {
      fail(
        `group-aware allocation missed feasible 5/5 heldout floors: ${JSON.stringify(result.counts)}`,
      );
    }
    const repeatedSplit = spawnSync(
      process.execPath,
      [splitScript, "--skill", skillName, "--seed", "42", "--json"],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    if (repeatedSplit.status !== 0 || repeatedSplit.stdout !== split.stdout) {
      fail("group-aware official-floor allocation was not deterministic for the same seed");
    }

    for (const invalidArgs of [
      ["--seed", "1.5"],
      ["--seed", "4294967296"],
      ["--seed", ""],
      ["--seed"],
      ["--train", "-1"],
      ["--val", "0"],
      ["--test", "NaN"],
    ]) {
      const invalid = spawnSync(
        process.execPath,
        [splitScript, "--skill", skillName, ...invalidArgs, "--json"],
        { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
      );
      if (invalid.status !== 2) {
        fail(
          `invalid split arguments ${invalidArgs.join(" ")} exited ${invalid.status}: ${invalid.stdout}\n${invalid.stderr}`,
        );
      }
    }

    const visualSkill = "visual-dp-adversary-skill";
    writeFile(
      path.join(tempRepo, "incubator/skills", visualSkill, "SKILL.md"),
      `---
name: ${visualSkill}
description: Temporary skill used only by the visual DP split validator.
---

# Visual DP Adversary Skill
`,
    );
    const adversaryGroups = [
      { family: "one-visual", size: 1, visual: true },
      { family: "one-nonvisual", size: 1, visual: false },
      { family: "three-visual", size: 3, visual: true },
      { family: "five-nonvisual", size: 5, visual: false },
    ];
    for (const group of adversaryGroups) {
      for (let index = 0; index < group.size; index += 1) {
        writeFile(
          path.join(tempRepo, "skill-evals", visualSkill, "cases", `${group.family}-${index}.md`),
          `# ${group.family} ${index}

## Prompt

Prepare ${group.family} case ${index}.

## Should Trigger

Yes

## Split Family

${group.family}

## Expected Behavior

- Produce a result.

## Deterministic Assertions

- contains: result
${group.visual ? "\n## Visual Assertions\n\n- artifact_exists: result.png\n" : ""}`,
        );
      }
    }
    const visualSplit = spawnSync(
      process.execPath,
      [splitScript, "--skill", visualSkill, "--seed", "42", "--json"],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    if (visualSplit.status !== 0) {
      fail(
        `visual redistribution split failed: ${visualSplit.status}\n${visualSplit.stdout}\n${visualSplit.stderr}`,
      );
    }
    for (const splitName of ["val", "test"]) {
      const items = JSON.parse(
        fs.readFileSync(
          path.join(
            tempRepo,
            ".agents/skillopt-work",
            visualSkill,
            "data",
            splitName,
            "items.json",
          ),
          "utf8",
        ),
      );
      if (!items.some((item) => item.visual_assertions.length > 0)) {
        fail(`visual DP adversary left ${splitName} without a visual case`);
      }
      if (items.length < 3) {
        fail(`visual DP adversary broke the exploratory floor for ${splitName}`);
      }
    }

    const singleVisualSkill = "single-visual-group-skill";
    writeFile(
      path.join(tempRepo, "incubator/skills", singleVisualSkill, "SKILL.md"),
      `---
name: ${singleVisualSkill}
description: Temporary skill used only by the single visual group validator.
---

# Single Visual Group Skill
`,
    );
    for (let index = 0; index < 10; index += 1) {
      writeFile(
        path.join(tempRepo, "skill-evals", singleVisualSkill, "cases", `case-${index}.md`),
        `# Case ${index}

## Prompt

Prepare case ${index}.

## Should Trigger

Yes

## Expected Behavior

- Produce a result.

## Deterministic Assertions

- contains: result
${index === 0 ? "\n## Visual Assertions\n\n- artifact_exists: result.png\n" : ""}`,
      );
    }
    const singleVisualSplit = spawnSync(
      process.execPath,
      [splitScript, "--skill", singleVisualSkill, "--seed", "42", "--json"],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    if (singleVisualSplit.status !== 0) {
      fail(
        `single visual group split failed: ${singleVisualSplit.status}\n${singleVisualSplit.stdout}\n${singleVisualSplit.stderr}`,
      );
    }
    const singleVisualHeldout = ["val", "test"].map((splitName) =>
      JSON.parse(
        fs.readFileSync(
          path.join(
            tempRepo,
            ".agents/skillopt-work",
            singleVisualSkill,
            "data",
            splitName,
            "items.json",
          ),
          "utf8",
        ),
      ),
    );
    if (
      singleVisualHeldout.some((items) => items.length < 3) ||
      singleVisualHeldout.filter((items) => items.some((item) => item.visual_assertions.length > 0))
        .length !== 1
    ) {
      fail("single visual group allocation did not maximize feasible heldout visual coverage");
    }

    const duplicateSkill = "duplicate-case-id-skill";
    writeFile(
      path.join(tempRepo, "incubator/skills", duplicateSkill, "SKILL.md"),
      `---
name: ${duplicateSkill}
description: Temporary skill used only by the duplicate case ID validator.
---

# Duplicate Case ID Skill
`,
    );
    const duplicateCase = (label) => `# ${label}

## Prompt

Prepare ${label}.

## Should Trigger

Yes

## Expected Behavior

- Produce a result.

## Deterministic Assertions

- contains: result
`;
    writeFile(
      path.join(tempRepo, "skill-evals", duplicateSkill, "cases/a/duplicate.md"),
      duplicateCase("A"),
    );
    writeFile(
      path.join(tempRepo, "skill-evals", duplicateSkill, "cases/b/duplicate.md"),
      duplicateCase("B"),
    );
    const duplicateSplit = spawnSync(
      process.execPath,
      [splitScript, "--skill", duplicateSkill, "--seed", "42", "--json"],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    if (duplicateSplit.status !== 2 || !duplicateSplit.stderr.includes("Duplicate eval case ID")) {
      fail("split preparation accepted recursive duplicate case basenames");
    }
    if (fs.existsSync(path.join(tempRepo, ".agents/skillopt-work", duplicateSkill))) {
      fail("duplicate case ID validation mutated the SkillOpt work directory before failing");
    }

    const invalidCaseNameSkill = "invalid-case-name-skill";
    writeFile(
      path.join(tempRepo, "incubator/skills", invalidCaseNameSkill, "SKILL.md"),
      `---
name: ${invalidCaseNameSkill}
description: Temporary skill used only by the case filename validator.
---

# Invalid Case Name Skill
`,
    );
    writeFile(
      path.join(tempRepo, "skill-evals", invalidCaseNameSkill, "cases/under_score.md"),
      duplicateCase("Invalid basename"),
    );
    const invalidCaseName = spawnSync(
      process.execPath,
      [splitScript, "--skill", invalidCaseNameSkill, "--seed", "42", "--json"],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    if (
      invalidCaseName.status !== 2 ||
      !invalidCaseName.stderr.includes("lowercase kebab-case") ||
      fs.existsSync(path.join(tempRepo, ".agents/skillopt-work", invalidCaseNameSkill))
    ) {
      fail("split preparation accepted a non-kebab eval case basename or wrote partial output");
    }

    for (const [index, fixture] of [
      "C:/private.svg",
      "https://example.invalid/icon.svg",
      "../outside.svg",
      "fixtures\\icon.svg",
      "fixtures/a|b.svg",
    ].entries()) {
      const invalidFixtureSkill = `invalid-fixture-${index}-skill`;
      writeFile(
        path.join(tempRepo, "incubator/skills", invalidFixtureSkill, "SKILL.md"),
        `---
name: ${invalidFixtureSkill}
description: Temporary skill used only by the fixture path validator.
---

# Invalid Fixture Skill
`,
      );
      writeFile(
        path.join(tempRepo, "skill-evals", invalidFixtureSkill, "cases/case-one.md"),
        `${duplicateCase("Invalid fixture")}
## Fixtures

- ${fixture}
`,
      );
      const invalidFixture = spawnSync(
        process.execPath,
        [splitScript, "--skill", invalidFixtureSkill, "--seed", "42", "--json"],
        { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
      );
      if (
        invalidFixture.status !== 2 ||
        !invalidFixture.stderr.includes("Fixture paths must") ||
        fs.existsSync(path.join(tempRepo, ".agents/skillopt-work", invalidFixtureSkill))
      ) {
        fail(`split preparation accepted invalid fixture class ${index} or wrote partial output`);
      }
    }
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

function validateTextOnlySplitExistsWithoutVisualAssertions() {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-text-only-no-visual-"));
  const skillName = "no-visual-skill";
  try {
    writeFile(path.join(tempRepo, "package.json"), "{}\n");
    writeFile(path.join(tempRepo, ".gitignore"), ".agents/\n");
    writeFile(
      path.join(tempRepo, "incubator/skills", skillName, "SKILL.md"),
      `---
name: ${skillName}
description: Temporary non-visual skill used only by the SkillOpt validator.
---

# No Visual Skill
`,
    );
    for (let index = 0; index < 4; index += 1) {
      writeFile(
        path.join(tempRepo, "skill-evals", skillName, "cases", `case-${index}.md`),
        `# Case ${index}

## Should Trigger

Yes.

## Prompt

Prepare a non-visual SkillOpt setup.

## Deterministic Assertions

- contains: SkillOpt

## Visual Assertions

- None.
`,
      );
    }

    const split = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/prepare-skillopt-split.mjs"),
        "--skill",
        skillName,
        "--seed",
        "42",
        "--json",
      ],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    if (split.status !== 0) {
      fail(
        `non-visual text-only split smoke failed: ${split.status}\n${split.stdout}\n${split.stderr}`,
      );
    }
    const splitResult = JSON.parse(split.stdout);
    if (splitResult.text_only?.excluded_visual_positive_cases !== 0) {
      fail(
        `non-visual text-only split expected zero excluded visual cases, got ${splitResult.text_only?.excluded_visual_positive_cases}`,
      );
    }
    for (const splitName of ["train", "val", "test"]) {
      assertFile(
        path.join(
          tempRepo,
          ".agents/skillopt-work",
          skillName,
          "data-text-only",
          splitName,
          "items.json",
        ),
      );
    }

    const skillOptPath = path.join(tempRepo, ".agents/tools/SkillOpt");
    writeFile(path.join(skillOptPath, "configs/_base_/default.yaml"), "{}\n");
    const registrySource = [
      "def _register_builtins():",
      "    pass",
      "",
      "",
      "def get_adapter(cfg):",
      "    return None",
      "",
    ].join("\n");
    writeFile(path.join(skillOptPath, "scripts/train.py"), registrySource);
    writeFile(path.join(skillOptPath, "scripts/eval_only.py"), registrySource);
    writeFile(
      path.join(skillOptPath, "skillopt/config.py"),
      [
        "import os",
        "from typing import Any",
        "import yaml",
        "",
        "_STRUCTURED_SECTIONS = frozenset({",
        "})",
        "_ENV_PLACEHOLDER_ALLOWLIST = frozenset()",
        "",
        "# ── YAML loading with _base_ inheritance",
        "def load_config(abs_path):",
        "    with open(abs_path) as f:",
        "        cfg = yaml.safe_load(f) or {}",
        "    return cfg",
        "",
      ].join("\n"),
    );
    writeFile(
      path.join(skillOptPath, "skillopt/engine/trainer.py"),
      [
        "import math",
        "",
        "def _resolve_train_size(cfg, dataloader):",
        "    return 10",
        "",
        "def train(cfg, dataloader):",
        "    num_epochs = 1",
        "    batch_size = 1",
        "    accumulation = 1",
        "        train_size = _resolve_train_size(cfg, dataloader)",
        "        steps_per_epoch = math.ceil(train_size / (batch_size * accumulation))",
        "        batches_per_epoch = steps_per_epoch * accumulation",
        "        total_steps = num_epochs * steps_per_epoch",
        '        print(f"\\n  [config] epochs={num_epochs} steps/epoch={steps_per_epoch} "',
        '              f"(auto) accum={accumulation} batch_size={batch_size}")',
        "        return total_steps, batches_per_epoch",
        "",
      ].join("\n"),
    );

    const adapter = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/prepare-local-skillopt-adapter.mjs"),
        "--skill",
        skillName,
        "--skillopt",
        ".agents/tools/SkillOpt",
        "--mode",
        "hybrid-codex-target",
        "--visual-eval-policy",
        "text-only",
        "--json",
      ],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    if (adapter.status !== 0) {
      fail(
        `non-visual text-only adapter smoke failed: ${adapter.status}\n${adapter.stdout}\n${adapter.stderr}`,
      );
    }
    const manifest = JSON.parse(adapter.stdout);
    if (manifest.visualSplit?.effective_policy !== "text-only") {
      fail(
        `expected explicit text-only policy in manifest, got ${manifest.visualSplit?.effective_policy}`,
      );
    }
    if (!manifest.visualSplit?.text_only?.exists) {
      fail("explicit text-only adapter did not find a generated data-text-only split");
    }
    const configText = fs.readFileSync(
      path.join(
        tempRepo,
        ".agents/skillopt-work",
        skillName,
        "configs/agent-skills.hybrid-codex-target.yaml",
      ),
      "utf8",
    );
    assertIncludes(
      "non-visual text-only generated config",
      configText,
      `.agents/skillopt-work/${skillName}/data-text-only`,
    );
    const patchedConfigText = fs.readFileSync(
      path.join(skillOptPath, "skillopt/config.py"),
      "utf8",
    );
    for (const needle of [
      '"SKILLOPT_OPTIMIZER_MODEL"',
      '"SKILLOPT_TARGET_MODEL"',
      '"SKILLOPT_JUDGE_MODEL"',
      '"SKILLOPT_REFLECTION_MODEL"',
      "def _expand_safe_env_placeholders",
      "cfg = _expand_safe_env_placeholders(cfg)",
    ]) {
      assertIncludes("partial SkillOpt env placeholder patch repair", patchedConfigText, needle);
    }

    writeFile(
      path.join(tempRepo, "skill-evals", skillName, "cases/visual.md"),
      `# Visual Case

## Should Trigger

Yes.

## Prompt

Create a visual result.

## Expected Behavior

- Produce a diagram.

## Deterministic Assertions

- contains: diagram

## Visual Assertions

- artifact_exists: *.png
`,
    );
    const visualSplit = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/prepare-skillopt-split.mjs"),
        "--skill",
        skillName,
        "--seed",
        "42",
        "--json",
      ],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    if (visualSplit.status !== 0) {
      fail(
        `provider auto text-only split preparation failed: ${visualSplit.status}\n${visualSplit.stdout}\n${visualSplit.stderr}`,
      );
    }
    const fakeBin = path.join(tempRepo, "fake-bin");
    writeFile(path.join(fakeBin, "drawio"), "#!/bin/sh\nexit 0\n");
    fs.chmodSync(path.join(fakeBin, "drawio"), 0o755);
    const nativeAuto = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/prepare-local-skillopt-adapter.mjs"),
        "--skill",
        skillName,
        "--skillopt",
        ".agents/tools/SkillOpt",
        "--mode",
        "native-provider",
        "--visual-eval-policy",
        "auto",
        "--json",
      ],
      {
        cwd: tempRepo,
        env: {
          ...process.env,
          PATH: `${fakeBin}${path.delimiter}${process.env.PATH || ""}`,
        },
        encoding: "utf8",
        timeout: 30000,
      },
    );
    if (nativeAuto.status !== 0) {
      fail(
        `native-provider auto split smoke failed: ${nativeAuto.status}\n${nativeAuto.stdout}\n${nativeAuto.stderr}`,
      );
    }
    const nativeManifest = JSON.parse(nativeAuto.stdout);
    if (
      nativeManifest.visualSplit?.effective_policy !== "text-only" ||
      !nativeManifest.visualSplit?.reason?.includes("provider chat targets")
    ) {
      fail(
        `native-provider auto policy selected an artifact split despite drawio availability: ${JSON.stringify(nativeManifest.visualSplit)}`,
      );
    }
    const nativeConfig = fs.readFileSync(
      path.join(
        tempRepo,
        ".agents/skillopt-work",
        skillName,
        "configs/agent-skills.native-provider.yaml",
      ),
      "utf8",
    );
    assertIncludes(
      "native-provider auto generated config",
      nativeConfig,
      `.agents/skillopt-work/${skillName}/data-text-only`,
    );
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

function validateWrappedExpectedBehaviorSplit() {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-wrapped-behavior-"));
  const skillName = "wrapped-behavior-skill";
  try {
    writeFile(path.join(tempRepo, "package.json"), "{}\n");
    writeFile(path.join(tempRepo, ".gitignore"), ".agents/\n");
    writeFile(
      path.join(tempRepo, "incubator/skills", skillName, "SKILL.md"),
      `---
name: ${skillName}
description: Temporary wrapped behavior skill used only by the SkillOpt validator.
---

# Wrapped Behavior Skill
`,
    );
    writeFile(
      path.join(tempRepo, "skill-evals", skillName, "cases/wrapped.md"),
      `# Wrapped Behavior

## Should Trigger

Yes.

## Prompt

Prepare a wrapped expected-behavior split.

## Expected Behavior

- Preserve the first line and fold
  the wrapped safety qualifier.
- Keep the second behavior intact.

## Deterministic Assertions

- contains: wrapped
`,
    );
    const split = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/prepare-skillopt-split.mjs"),
        "--skill",
        skillName,
        "--seed",
        "42",
        "--json",
      ],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    if (split.status !== 0) {
      fail(
        `wrapped behavior split smoke failed: ${split.status}\n${split.stdout}\n${split.stderr}`,
      );
    }
    const items = ["train", "val", "test"].flatMap((splitName) =>
      JSON.parse(
        fs.readFileSync(
          path.join(tempRepo, ".agents/skillopt-work", skillName, "data", splitName, "items.json"),
          "utf8",
        ),
      ),
    );
    const expected = [
      "Preserve the first line and fold the wrapped safety qualifier.",
      "Keep the second behavior intact.",
    ];
    if (JSON.stringify(items[0]?.expected_behavior) !== JSON.stringify(expected)) {
      fail(
        `wrapped expected behavior was truncated: ${JSON.stringify(items[0]?.expected_behavior)}`,
      );
    }
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

function validateLocalArtifactAudit() {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-artifact-audit-"));
  const skillName = "audit-skill";
  try {
    writeFile(path.join(tempRepo, "package.json"), "{}\n");
    writeFile(path.join(tempRepo, ".gitignore"), ".agents/\n");
    writeFile(
      path.join(tempRepo, ".agents/skills/skillopt-setup/SKILL.md"),
      `---
name: skillopt-setup
description: Installed stale copy used by validator.
---

# SkillOpt Setup
`,
    );
    writeFile(
      path.join(tempRepo, ".agents/tools/SkillOpt/skillopt/envs/agent_skills/rollout.py"),
      "# stale local rollout\n",
    );
    writeFile(
      path.join(tempRepo, ".agents/tools/SkillOpt/configs/agent_skills/codex-cli-all.yaml"),
      "env:\n  name: agent_skills\n",
    );
    writeFile(path.join(tempRepo, "templates/global-rollout.py"), "# stale local rollout\n");
    fs.mkdirSync(path.join(tempRepo, ".agents/tools/SkillOpt/.venv"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(tempRepo, ".agents/tools/SkillOpt/.git"), {
      recursive: true,
    });
    writeFile(
      path.join(tempRepo, ".agents/skillopt-work/_readiness/codex-probe-output.txt"),
      "ignored diagnostic\n",
    );
    writeFile(
      path.join(
        tempRepo,
        ".agents/skillopt-work",
        skillName,
        "configs/agent-skills.codex-cli-all.yaml",
      ),
      "env:\n  name: agent_skills\n",
    );
    writeFile(
      path.join(tempRepo, ".agents/skillopt-work", skillName, "data/train/items.json"),
      "[]\n",
    );
    writeFile(
      path.join(tempRepo, ".agents/skillopt-work", skillName, "outputs/run-001/history.json"),
      "[]\n",
    );
    for (let index = 0; index < 2_050; index += 1) {
      writeFile(
        path.join(
          tempRepo,
          ".agents/skillopt-work",
          skillName,
          "outputs/000-noise",
          `step-${String(index).padStart(4, "0")}.json`,
        ),
        "{}\n",
      );
    }
    writeFile(
      path.join(tempRepo, ".agents/skillopt-work", skillName, "outputs/run-001/summary.json"),
      `${JSON.stringify(
        {
          config: { run_profile: "exploratory" },
          total_steps: 2,
          total_accepts: 1,
          total_rejects: 1,
          baseline_test_hard: 0.75,
          test_hard: 0.5,
          test_delta_hard: -0.25,
        },
        null,
        2,
      )}\n`,
    );
    writeFile(
      path.join(tempRepo, ".agents/skillopt-work", skillName, "adapter-manifest.json"),
      `${JSON.stringify(
        {
          target_skill: skillName,
          mode: "codex-cli-all",
          run_profile: "exploratory",
          registry_patch: { status: "ready" },
          installed_files: [".agents/tools/SkillOpt/skillopt/envs/agent_skills/rollout.py"],
        },
        null,
        2,
      )}\n`,
    );
    writeFile(
      path.join(tempRepo, ".agents/skillopt-work/adapter-manifest.json"),
      `${JSON.stringify(
        {
          target_skill: skillName,
          mode: "codex-cli-all",
          run_profile: "exploratory",
          registry_patch: { status: "ready" },
          installed_files: [".agents/tools/SkillOpt/skillopt/envs/agent_skills/rollout.py"],
          template_sources: {
            ".agents/tools/SkillOpt/skillopt/envs/agent_skills/rollout.py": {
              source: "templates/global-rollout.py",
            },
          },
        },
        null,
        2,
      )}\n`,
    );

    const audit = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/audit-skillopt-local-artifacts.mjs"),
        "--root",
        tempRepo,
        "--skill",
        skillName,
        "--json",
      ],
      { cwd: root, encoding: "utf8", timeout: 30000 },
    );
    if (audit.status !== 0) {
      fail(`local artifact audit smoke failed: ${audit.status}\n${audit.stdout}\n${audit.stderr}`);
    }
    if (audit.stdout.includes(tempRepo)) {
      fail("local artifact audit leaked an absolute temporary path");
    }
    const parsed = JSON.parse(audit.stdout);
    const toolClone = parsed.classifications.find((item) => item.path === ".agents/tools/SkillOpt");
    if (toolClone?.classification !== "local_tooling_do_not_move") {
      fail("local artifact audit did not classify SkillOpt clone as do_not_move");
    }
    const installedCopy = parsed.classifications.find(
      (item) => item.path === ".agents/skills/skillopt-setup",
    );
    if (installedCopy?.classification !== "installed_skill_copy_compare_only") {
      fail("local artifact audit did not classify installed skill copy as comparison-only");
    }
    const workspace = parsed.workspaces.find((item) => item.skill === skillName);
    if (!workspace || workspace.move_action !== "do_not_move_raw_workspace") {
      fail("local artifact audit did not classify generated workspaces as raw local state");
    }
    const globalManifest = parsed.manifests.find(
      (item) => item.path === ".agents/skillopt-work/adapter-manifest.json",
    );
    if (
      globalManifest?.status !== "legacy_compatibility_copy" ||
      globalManifest.target_specific !== false
    ) {
      fail(
        "local artifact audit did not classify a current legacy global manifest as compatibility-only",
      );
    }
    if (!globalManifest.warnings.some((warning) => warning.includes("legacy/global"))) {
      fail("local artifact audit did not warn that the global manifest is legacy");
    }
    if (workspace.run_summaries.regressing_runs !== 1) {
      fail("local artifact audit did not detect the regressing run summary");
    }
    if (workspace.manifest.status !== "refresh_required") {
      fail(
        `local artifact audit expected stale manifest refresh_required, got ${workspace.manifest.status}`,
      );
    }
    if (!parsed.recommendations.some((item) => item.includes("negative held-out test"))) {
      fail("local artifact audit did not recommend blocking negative test-delta adoption");
    }
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

function validateLocalArtifactAuditFreshGlobalCompatibility() {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-artifact-audit-fresh-"));
  const skillName = "fresh-audit-skill";
  const installedAdapter = ".agents/tools/SkillOpt/skillopt/envs/agent_skills/adapter.py";
  const sourceTemplate = "templates/adapter.py";
  try {
    writeFile(path.join(tempRepo, "package.json"), "{}\n");
    writeFile(path.join(tempRepo, ".gitignore"), ".agents/\n");
    writeFile(path.join(tempRepo, sourceTemplate), "# current adapter\n");
    writeFile(path.join(tempRepo, installedAdapter), "# current adapter\n");
    const manifest = {
      target_skill: skillName,
      mode: "codex-cli-all",
      run_profile: "exploratory",
      registry_patch: { status: "ready" },
      installed_files: [installedAdapter],
      template_sources: {
        [installedAdapter]: { source: sourceTemplate },
      },
    };
    writeFile(
      path.join(tempRepo, ".agents/skillopt-work", skillName, "adapter-manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    writeFile(
      path.join(tempRepo, ".agents/skillopt-work/adapter-manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );

    const audit = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/audit-skillopt-local-artifacts.mjs"),
        "--root",
        tempRepo,
        "--skill",
        skillName,
        "--json",
      ],
      { cwd: root, encoding: "utf8", timeout: 30000 },
    );
    if (audit.status !== 0) {
      fail(
        `fresh local artifact audit smoke failed: ${audit.status}\n${audit.stdout}\n${audit.stderr}`,
      );
    }
    const parsed = JSON.parse(audit.stdout);
    const workspace = parsed.workspaces.find((item) => item.skill === skillName);
    if (workspace?.manifest?.status !== "matched") {
      fail(
        `fresh local artifact audit expected target manifest matched, got ${workspace?.manifest?.status}`,
      );
    }
    const globalManifest = parsed.manifests.find(
      (item) => item.path === ".agents/skillopt-work/adapter-manifest.json",
    );
    if (globalManifest?.status !== "legacy_compatibility_copy") {
      fail(
        `fresh local artifact audit expected global manifest compatibility copy, got ${globalManifest?.status}`,
      );
    }
    if (
      parsed.recommendations.some((item) =>
        item.includes("Rerun production setup with reuse/refresh"),
      )
    ) {
      fail(
        "fresh local artifact audit recommended rerunning setup only because a global compatibility manifest exists",
      );
    }
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

function runReadinessJson(tempRepo, skillName, mode, extraArgs = [], env = process.env) {
  const result = spawnSync(
    process.execPath,
    [
      path.join(skillRoot, "scripts/check-skillopt-readiness.mjs"),
      "--skill",
      skillName,
      "--mode",
      mode,
      "--run-profile",
      mode === "codex-cli-all" ? "exploratory" : "official-parity",
      "--no-codex-probe",
      "--json",
      ...extraArgs,
    ],
    { cwd: tempRepo, env, encoding: "utf8", timeout: 30000 },
  );
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    fail(
      `readiness JSON smoke returned invalid JSON: ${result.status}\n${result.stdout}\n${result.stderr}`,
    );
  }
  return { result, parsed };
}

function providerTestEnv(extra = {}) {
  const env = { ...process.env };
  for (const name of Object.keys(env)) {
    if (
      name.includes("OPENAI") ||
      name.includes("ANTHROPIC") ||
      name.includes("MINIMAX") ||
      /^SKILLOPT_(?:OPTIMIZER|TARGET|JUDGE|REFLECTION)_MODEL$/.test(name)
    ) {
      delete env[name];
    }
  }
  return { ...env, ...extra };
}

function validateProviderSpecificReadiness() {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-provider-readiness-"));
  const skillName = "provider-readiness-skill";
  try {
    writeFile(path.join(tempRepo, "package.json"), "{}\n");
    writeFile(path.join(tempRepo, ".gitignore"), ".agents/\n");
    writeFile(
      path.join(tempRepo, "incubator/skills", skillName, "SKILL.md"),
      `---
name: ${skillName}
description: Temporary provider-readiness skill used only by the SkillOpt validator.
---

# Provider Readiness Skill
`,
    );
    writeFile(path.join(tempRepo, "skill-evals", skillName, "README.md"), "# Eval proof\n");
    const config = fs
      .readFileSync(path.join(assetRoot, "config.native-provider.yaml"), "utf8")
      .replaceAll("<skill>", skillName)
      .replaceAll("<run-name>", "run-001")
      .replaceAll("<run-profile>", "official-parity")
      .replaceAll("<split-dir>", `.agents/skillopt-work/${skillName}/data`)
      .replaceAll("<visual-eval-policy>", "text-only");
    writeFile(
      path.join(
        tempRepo,
        ".agents/skillopt-work",
        skillName,
        "configs/agent-skills.native-provider.yaml",
      ),
      config,
    );

    const genericKeyOnly = runReadinessJson(
      tempRepo,
      skillName,
      "native-provider",
      [],
      providerTestEnv({ OPENAI_API_KEY: "generic-key-must-not-authorize" }),
    );
    const roles = genericKeyOnly.parsed.providerReadiness?.roles || [];
    for (const role of ["optimizer", "target"]) {
      const status = roles.find((item) => item.role === role);
      if (
        status?.configured !== false ||
        !status.blockers?.some((blocker) => blocker.includes("openai_chat endpoint is missing"))
      ) {
        fail(`generic OPENAI_API_KEY incorrectly authorized ${role} openai_chat readiness`);
      }
    }

    const endpoint = "http://127.0.0.1:1/v1";
    const apiKey = "dead-endpoint-key-must-not-leak";
    const strict = runReadinessJson(
      tempRepo,
      skillName,
      "native-provider",
      ["--strict-training-ready"],
      providerTestEnv({
        AZURE_OPENAI_ENDPOINT: endpoint,
        AZURE_OPENAI_AUTH_MODE: "openai_compatible",
        AZURE_OPENAI_API_KEY: apiKey,
        SKILLOPT_OPTIMIZER_MODEL: "optimizer-test-model",
        SKILLOPT_TARGET_MODEL: "target-test-model",
      }),
    );
    if (strict.result.status === 0) {
      fail("strict readiness accepted an unreachable OpenAI-compatible endpoint");
    }
    const probes = strict.parsed.providerReadiness?.endpoint_probes || [];
    if (probes.length !== 2 || probes.some((probe) => probe.ok || probe.status !== "failed")) {
      fail(`strict readiness did not record failed endpoint probes: ${JSON.stringify(probes)}`);
    }
    const publicOutput = `${strict.result.stdout}${strict.result.stderr}`;
    if (publicOutput.includes(apiKey) || publicOutput.includes(endpoint)) {
      fail("strict provider readiness leaked an endpoint or API key in diagnostics");
    }

    writeFile(
      path.join(
        tempRepo,
        ".agents/skillopt-work",
        skillName,
        "configs/agent-skills.native-provider.yaml",
      ),
      config.replaceAll("openai_chat", "qwen_chat"),
    );
    const qwenWithoutKey = runReadinessJson(
      tempRepo,
      skillName,
      "native-provider",
      [],
      providerTestEnv({
        QWEN_CHAT_BASE_URL: "https://example.invalid/v1",
        QWEN_CHAT_MODEL: "qwen-test-model",
      }),
    );
    for (const role of ["optimizer", "target"]) {
      const status = qwenWithoutKey.parsed.providerReadiness?.roles?.find(
        (item) => item.role === role,
      );
      if (
        status?.configured !== false ||
        !status.blockers?.some((blocker) => blocker.includes("qwen_chat API key is missing"))
      ) {
        fail(`qwen_chat readiness accepted ${role} without its API key`);
      }
    }

    writeFile(
      path.join(
        tempRepo,
        ".agents/skillopt-work",
        skillName,
        "configs/agent-skills.native-provider.yaml",
      ),
      config.replaceAll("openai_chat", "claude_chat"),
    );
    const claudeCli = runReadinessJson(
      tempRepo,
      skillName,
      "native-provider",
      [],
      providerTestEnv({ ANTHROPIC_API_KEY: "must-not-authorize-local-cli" }),
    );
    for (const role of ["optimizer", "target"]) {
      const status = claudeCli.parsed.providerReadiness?.roles?.find((item) => item.role === role);
      if (
        status?.configured !== false ||
        !status.blockers?.some((blocker) => blocker.includes("local Claude CLI"))
      ) {
        fail(`claude_chat readiness exposed an unisolated local CLI for ${role}`);
      }
    }

    writeFile(
      path.join(
        tempRepo,
        ".agents/skillopt-work",
        skillName,
        "configs/agent-skills.native-provider.yaml",
      ),
      config.replaceAll("openai_chat", "minimax_chat"),
    );
    const minimax = runReadinessJson(
      tempRepo,
      skillName,
      "native-provider",
      [],
      providerTestEnv({
        MINIMAX_BASE_URL: "https://api.example.invalid/v1",
        MINIMAX_API_KEY: "minimax-test-key",
      }),
    );
    const minimaxOptimizer = minimax.parsed.providerReadiness?.roles?.find(
      (item) => item.role === "optimizer",
    );
    const minimaxTarget = minimax.parsed.providerReadiness?.roles?.find(
      (item) => item.role === "target",
    );
    if (
      minimaxOptimizer?.configured !== false ||
      !minimaxOptimizer.blockers?.some((blocker) => blocker.includes("target chat only")) ||
      minimaxTarget?.configured !== true
    ) {
      fail("MiniMax readiness did not enforce its target-only backend contract");
    }

    writeFile(
      path.join(
        tempRepo,
        ".agents/skillopt-work",
        skillName,
        "configs/agent-skills.native-provider.yaml",
      ),
      config.replace("judge_backend: provider", "judge_backend: heuristic"),
    );
    const heuristic = runReadinessJson(
      tempRepo,
      skillName,
      "native-provider",
      [],
      providerTestEnv(),
    );
    if (
      !heuristic.parsed.proofBlockers?.some((blocker) => blocker.includes("semantic judge_backend"))
    ) {
      fail("official-parity readiness accepted literal-substring heuristic judging");
    }
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

function validateGeneratedDataFreshnessAndRunnability() {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-data-freshness-"));
  const skillName = "freshness-skill";
  const skillPath = path.join(tempRepo, "incubator/skills", skillName, "SKILL.md");
  const casesDir = path.join(tempRepo, "skill-evals", skillName, "cases");
  const splitRoot = path.join(tempRepo, ".agents/skillopt-work", skillName, "data");
  const activationPath = path.join(
    tempRepo,
    ".agents/skillopt-work",
    skillName,
    "activation/negative-cases.json",
  );
  const caseText = (index) => `# Case ${index}

## Should Trigger

Yes.

## Prompt

Prepare freshness case ${index}.

## Expected Behavior

- Preserve current proof
  across a wrapped bullet line.

## Deterministic Assertions

- contains: freshness
  marker
${index === 0 ? "\n## Visual Assertions\n\n- artifact_exists: result.png\n" : ""}`;
  const negativeCaseText = (index) => `# Negative case ${index}

## Should Trigger

No

## Prompt

Prepare unrelated negative case ${index}.

## Expected Behavior

- Do not activate the skill.

## Deterministic Assertions

- contains: unrelated
`;
  const prepare = () => {
    const result = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/prepare-skillopt-split.mjs"),
        "--skill",
        skillName,
        "--seed",
        "42",
        "--json",
      ],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    if (result.status !== 0) {
      fail(
        `freshness split preparation failed: ${result.status}\n${result.stdout}\n${result.stderr}`,
      );
    }
  };
  const readiness = (strict = false) =>
    runReadinessJson(
      tempRepo,
      skillName,
      "codex-cli-all",
      strict ? ["--strict-training-ready"] : [],
      providerTestEnv(),
    );
  try {
    writeFile(path.join(tempRepo, "package.json"), "{}\n");
    writeFile(path.join(tempRepo, ".gitignore"), ".agents/\n");
    const skillText = `---
name: ${skillName}
description: Temporary freshness skill used only by the SkillOpt validator.
---

# Freshness Skill
`;
    writeFile(skillPath, skillText);
    for (let index = 0; index < 8; index += 1) {
      writeFile(path.join(casesDir, `case-${index}.md`), caseText(index));
    }
    for (let index = 0; index < 2; index += 1) {
      writeFile(path.join(casesDir, `negative-${index}.md`), negativeCaseText(index));
    }
    prepare();
    const config = fs
      .readFileSync(path.join(assetRoot, "config.codex-cli-all.yaml"), "utf8")
      .replaceAll("<skill>", skillName)
      .replaceAll("<run-name>", "run-001")
      .replaceAll("<run-profile>", "exploratory")
      .replaceAll("<split-dir>", `.agents/skillopt-work/${skillName}/data`)
      .replaceAll("<visual-eval-policy>", "full");
    writeFile(
      path.join(
        tempRepo,
        ".agents/skillopt-work",
        skillName,
        "configs/agent-skills.codex-cli-all.yaml",
      ),
      config,
    );

    if (readiness().parsed.datasetFreshness?.status !== "matched") {
      fail("freshly generated split and initial skill proof did not match source state");
    }

    const mutatePositiveItem = (id, mutate) => {
      for (const splitName of ["train", "val", "test"]) {
        const itemFile = path.join(splitRoot, splitName, "items.json");
        const splitItems = JSON.parse(fs.readFileSync(itemFile, "utf8"));
        const target = splitItems.find((item) => item.id === `${skillName}/${id}`);
        if (!target) continue;
        mutate(target);
        writeFile(itemFile, `${JSON.stringify(splitItems, null, 2)}\n`);
        return;
      }
      fail(`freshness mutation target not found: ${id}`);
    };

    mutatePositiveItem("case-0", (item) => {
      item.visual_assertions = [];
      item.workspace_policy = "text-only";
    });
    let tampered = readiness().parsed;
    if (
      tampered.datasetFreshness?.status !== "refresh_required" ||
      !tampered.datasetFreshness.blockers.some((blocker) =>
        blocker.includes("visual_assertions is stale"),
      ) ||
      tampered.trainingReadiness !== "blocked"
    ) {
      fail("removed visual assertions did not invalidate dataset freshness and training proof");
    }
    prepare();

    mutatePositiveItem("case-1", (item) => {
      item.skill_name = "wrong-skill";
    });
    tampered = readiness().parsed;
    if (
      tampered.datasetFreshness?.status !== "refresh_required" ||
      !tampered.datasetFreshness.blockers.some((blocker) => blocker.includes("skill_name is stale"))
    ) {
      fail("mutated skill_name did not invalidate dataset freshness");
    }
    prepare();

    mutatePositiveItem("case-2", (item) => {
      item.deterministic_assertions = [];
    });
    tampered = readiness().parsed;
    if (
      tampered.datasetFreshness?.status !== "refresh_required" ||
      !tampered.datasetFreshness.blockers.some((blocker) =>
        blocker.includes("deterministic_assertions is stale"),
      )
    ) {
      fail("removed deterministic assertions did not invalidate dataset freshness");
    }
    prepare();

    writeFile(
      path.join(casesDir, "negative-0.md"),
      `${negativeCaseText(0)}\nChanged activation source.\n`,
    );
    let current = readiness().parsed.datasetFreshness;
    if (
      current?.status !== "refresh_required" ||
      !current.blockers.some((blocker) => blocker.includes("activation source hash is stale"))
    ) {
      fail("changed activation source hash did not invalidate generated negative proof");
    }
    writeFile(path.join(casesDir, "negative-0.md"), negativeCaseText(0));

    const activationItems = JSON.parse(fs.readFileSync(activationPath, "utf8"));
    activationItems[0].case_path = "stale/negative-path.md";
    writeFile(activationPath, `${JSON.stringify(activationItems, null, 2)}\n`);
    current = readiness().parsed.datasetFreshness;
    if (!current.blockers.some((blocker) => blocker.includes("activation case path is stale"))) {
      fail("stale activation case path did not invalidate generated negative proof");
    }
    prepare();

    writeFile(path.join(casesDir, "negative-added.md"), negativeCaseText("added"));
    current = readiness().parsed.datasetFreshness;
    if (!current.blockers.some((blocker) => blocker.includes("missing current negative cases"))) {
      fail("added activation case did not invalidate generated negative IDs");
    }
    fs.rmSync(path.join(casesDir, "negative-added.md"));
    fs.rmSync(path.join(casesDir, "negative-1.md"));
    current = readiness().parsed.datasetFreshness;
    if (
      !current.blockers.some((blocker) =>
        blocker.includes("activation split contains stale or unexpected cases"),
      )
    ) {
      fail("removed activation case did not invalidate generated negative IDs");
    }
    writeFile(path.join(casesDir, "negative-1.md"), negativeCaseText(1));
    prepare();

    writeFile(path.join(casesDir, "case-0.md"), `${caseText(0)}\nChanged source.\n`);
    current = readiness().parsed.datasetFreshness;
    if (
      current?.status !== "refresh_required" ||
      !current.blockers.some((blocker) => blocker.includes("source hash is stale"))
    ) {
      fail("changed eval source hash did not invalidate generated split proof");
    }

    writeFile(path.join(casesDir, "case-0.md"), caseText(0));
    writeFile(path.join(casesDir, "case-added.md"), caseText("added"));
    current = readiness().parsed.datasetFreshness;
    if (!current.blockers.some((blocker) => blocker.includes("missing current positive cases"))) {
      fail("added eval case did not invalidate generated split IDs");
    }
    fs.rmSync(path.join(casesDir, "case-added.md"));
    fs.rmSync(path.join(casesDir, "case-7.md"));
    current = readiness().parsed.datasetFreshness;
    if (!current.blockers.some((blocker) => blocker.includes("stale or unexpected cases"))) {
      fail("removed eval case did not invalidate generated split IDs");
    }
    writeFile(path.join(casesDir, "case-7.md"), caseText(7));
    prepare();

    writeFile(skillPath, `${skillText}\nChanged skill.\n`);
    current = readiness().parsed.datasetFreshness;
    if (!current.blockers.some((blocker) => blocker.includes("initial skill checksum is stale"))) {
      fail("changed SKILL.md did not invalidate the initial skill checksum");
    }
    writeFile(skillPath, skillText);
    prepare();
    writeFile(
      path.join(tempRepo, ".agents/skillopt-work", skillName, "initial/skill-body.md"),
      "tampered body\n",
    );
    current = readiness().parsed.datasetFreshness;
    if (!current.blockers.some((blocker) => blocker.includes("initial skill body is stale"))) {
      fail("tampered initial skill body did not invalidate freshness proof");
    }

    prepare();
    fs.rmSync(path.join(splitRoot, "test/items.json"));
    let strict = readiness(true);
    if (
      strict.result.status === 0 ||
      !strict.parsed.trainingBlockers.some((blocker) => blocker.includes("missing test/items.json"))
    ) {
      fail("strict exploratory readiness accepted a missing test split");
    }

    prepare();
    writeFile(path.join(splitRoot, "val/items.json"), "{not-json}\n");
    strict = readiness(true);
    if (
      strict.result.status === 0 ||
      !strict.parsed.trainingBlockers.some((blocker) =>
        blocker.includes("val/items.json is not a JSON array"),
      )
    ) {
      fail("strict exploratory readiness accepted a malformed validation split");
    }

    prepare();
    for (const name of ["train", "val", "test"]) {
      writeFile(path.join(splitRoot, name, "items.json"), "[]\n");
    }
    strict = readiness(true);
    if (
      strict.result.status === 0 ||
      !strict.parsed.trainingBlockers.includes("active split needs at least one training case")
    ) {
      fail("strict exploratory readiness accepted an empty active split");
    }

    prepare();
    const splitWithItem = ["train", "val", "test"].find((name) => {
      const items = JSON.parse(fs.readFileSync(path.join(splitRoot, name, "items.json"), "utf8"));
      return items.length > 0;
    });
    const itemPath = path.join(splitRoot, splitWithItem, "items.json");
    const items = JSON.parse(fs.readFileSync(itemPath, "utf8"));
    delete items[0].prompt;
    writeFile(itemPath, `${JSON.stringify(items, null, 2)}\n`);
    strict = readiness(true);
    if (
      strict.result.status === 0 ||
      !strict.parsed.trainingBlockers.some((blocker) => blocker.includes("missing required fields"))
    ) {
      fail("strict exploratory readiness accepted an item with missing required fields");
    }
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

function validateLiveAdapterPatchProof() {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-live-patch-"));
  const skillName = "live-patch-skill";
  const clone = path.join(tempRepo, ".agents/tools/SkillOpt");
  const trainPatch = `_ENV_REGISTRY = {}
def _register_builtins():
    try:
        from skillopt.envs.agent_skills.adapter import AgentSkillsAdapter
        _ENV_REGISTRY["agent_skills"] = AgentSkillsAdapter
    except ImportError:
        pass
`;
  const configPatch = `import os
_ENV_PLACEHOLDER_ALLOWLIST = frozenset({"SKILLOPT_OPTIMIZER_MODEL", "SKILLOPT_TARGET_MODEL", "SKILLOPT_JUDGE_MODEL", "SKILLOPT_REFLECTION_MODEL"})
def _expand_safe_env_placeholders(cfg):
    env_name = "SKILLOPT_OPTIMIZER_MODEL"
    if env_name in _ENV_PLACEHOLDER_ALLOWLIST and os.environ.get(env_name):
        return os.environ[env_name]
    return cfg
cfg = _expand_safe_env_placeholders(cfg)
`;
  const trainerPatch = `import math
requested_steps_per_epoch = int(cfg.get("steps_per_epoch", 0) or 0)
auto_steps_per_epoch = math.ceil(train_size / (batch_size * accumulation))
steps_per_epoch = requested_steps_per_epoch if requested_steps_per_epoch > 0 else auto_steps_per_epoch
batches_per_epoch = steps_per_epoch * accumulation
total_steps = num_epochs * steps_per_epoch
steps_source = "configured" if requested_steps_per_epoch > 0 else "auto"
`;
  try {
    writeFile(path.join(tempRepo, "package.json"), "{}\n");
    writeFile(path.join(tempRepo, ".gitignore"), ".agents/\n");
    writeFile(
      path.join(tempRepo, "incubator/skills", skillName, "SKILL.md"),
      `---
name: ${skillName}
description: Temporary live-patch skill used only by the SkillOpt validator.
---

# Live Patch Skill
`,
    );
    writeFile(path.join(tempRepo, "skill-evals", skillName, "README.md"), "# Eval proof\n");
    writeFile(path.join(clone, "scripts/train.py"), trainPatch);
    writeFile(path.join(clone, "scripts/eval_only.py"), trainPatch);
    writeFile(path.join(clone, "skillopt/config.py"), configPatch);
    writeFile(path.join(clone, "skillopt/engine/trainer.py"), trainerPatch);
    run("live patch git init", "git", ["init", "--quiet"], { cwd: clone });
    run("live patch git identity", "git", ["config", "user.name", "SkillOpt Validator"], {
      cwd: clone,
    });
    run(
      "live patch git email",
      "git",
      ["config", "user.email", "skillopt-validator@example.invalid"],
      { cwd: clone },
    );
    run("live patch git add", "git", ["add", "."], { cwd: clone });
    run("live patch git commit", "git", ["commit", "--quiet", "-m", "fixture"], {
      cwd: clone,
    });
    const commit = run("live patch git rev-parse", "git", ["rev-parse", "HEAD"], {
      cwd: clone,
    }).trim();
    const config = fs
      .readFileSync(path.join(assetRoot, "config.codex-cli-all.yaml"), "utf8")
      .replaceAll("<skill>", skillName)
      .replaceAll("<run-name>", "run-001")
      .replaceAll("<run-profile>", "exploratory")
      .replaceAll("<split-dir>", `.agents/skillopt-work/${skillName}/data`)
      .replaceAll("<visual-eval-policy>", "text-only");
    writeFile(
      path.join(
        tempRepo,
        ".agents/skillopt-work",
        skillName,
        "configs/agent-skills.codex-cli-all.yaml",
      ),
      config,
    );
    writeFile(
      path.join(tempRepo, ".agents/skillopt-work", skillName, "adapter-manifest.json"),
      `${JSON.stringify(
        {
          target_skill: skillName,
          mode: "codex-cli-all",
          run_profile: "exploratory",
          skillopt_commit: commit,
          registry_patch: { status: "ready" },
          installed_files: [],
        },
        null,
        2,
      )}\n`,
    );

    let live = runReadinessJson(tempRepo, skillName, "codex-cli-all", [], providerTestEnv()).parsed
      .liveAdapterPatchCheck;
    if (live?.status !== "matched") {
      fail(`valid live SkillOpt patches did not match manifest proof: ${JSON.stringify(live)}`);
    }

    writeFile(
      path.join(clone, "scripts/train.py"),
      `# from skillopt.envs.agent_skills.adapter import AgentSkillsAdapter
# _ENV_REGISTRY["agent_skills"] = AgentSkillsAdapter
`,
    );
    live = runReadinessJson(tempRepo, skillName, "codex-cli-all", [], providerTestEnv()).parsed
      .liveAdapterPatchCheck;
    if (
      live?.status !== "refresh_required" ||
      !live.blockers.some((blocker) => blocker.includes("train.py is missing"))
    ) {
      fail("manifest ready status hid a removed live registry patch");
    }

    writeFile(path.join(clone, "scripts/train.py"), trainPatch);
    writeFile(
      path.join(clone, "skillopt/config.py"),
      `# _ENV_PLACEHOLDER_ALLOWLIST = frozenset({"SKILLOPT_OPTIMIZER_MODEL"})
# def _expand_safe_env_placeholders(cfg): return cfg
# cfg = _expand_safe_env_placeholders(cfg)
`,
    );
    live = runReadinessJson(tempRepo, skillName, "codex-cli-all", [], providerTestEnv()).parsed
      .liveAdapterPatchCheck;
    if (
      live?.status !== "refresh_required" ||
      !live.blockers.some((blocker) => blocker.includes("structural safe model"))
    ) {
      fail("comment-only safe environment markers passed live patch proof");
    }

    writeFile(path.join(clone, "skillopt/config.py"), configPatch);
    writeFile(
      path.join(clone, "skillopt/engine/trainer.py"),
      `# requested_steps_per_epoch = int(cfg.get("steps_per_epoch", 0) or 0)
# steps_per_epoch = requested_steps_per_epoch if requested_steps_per_epoch > 0 else auto_steps_per_epoch
# steps_source = "configured" if requested_steps_per_epoch > 0 else "auto"
`,
    );
    live = runReadinessJson(tempRepo, skillName, "codex-cli-all", [], providerTestEnv()).parsed
      .liveAdapterPatchCheck;
    if (
      live?.status !== "refresh_required" ||
      !live.blockers.some((blocker) => blocker.includes("structural configured steps"))
    ) {
      fail("comment-only trainer markers passed live patch proof");
    }

    writeFile(path.join(clone, "skillopt/engine/trainer.py"), trainerPatch);
    writeFile(path.join(clone, "commit-change.txt"), "new commit\n");
    run("live patch changed commit add", "git", ["add", "."], { cwd: clone });
    run("live patch changed commit", "git", ["commit", "--quiet", "-m", "changed clone"], {
      cwd: clone,
    });
    live = runReadinessJson(tempRepo, skillName, "codex-cli-all", [], providerTestEnv()).parsed
      .liveAdapterPatchCheck;
    if (
      live?.status !== "refresh_required" ||
      !live.blockers.some((blocker) => blocker.includes("commit does not match"))
    ) {
      fail("manifest ready status hid a changed live SkillOpt clone commit");
    }
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

function validateVisualPermissionCapabilityGate() {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-visual-capability-"));
  const skillName = "visual-capability-skill";
  const binDir = path.join(tempRepo, "bin");
  const fakeCodex = path.join(binDir, "codex-without-permissions");
  try {
    writeFile(path.join(tempRepo, "package.json"), "{}\n");
    writeFile(path.join(tempRepo, ".gitignore"), ".agents/\n");
    writeFile(
      path.join(tempRepo, "incubator/skills", skillName, "SKILL.md"),
      `---
name: ${skillName}
description: Temporary visual-capability skill used only by the SkillOpt validator.
---

# Visual Capability Skill
`,
    );
    const evalCase = (name, visual) => `# ${name}

## Should Trigger

Yes.

## Prompt

Prepare ${name}.

## Expected Behavior

- Produce a result.

## Deterministic Assertions

- contains: result
${visual ? "\n## Visual Assertions\n\n- artifact_exists: *.png\n" : ""}`;
    writeFile(
      path.join(tempRepo, "skill-evals", skillName, "cases/text.md"),
      evalCase("Text", false),
    );
    writeFile(
      path.join(tempRepo, "skill-evals", skillName, "cases/visual.md"),
      evalCase("Visual", true),
    );
    const split = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/prepare-skillopt-split.mjs"),
        "--skill",
        skillName,
        "--seed",
        "42",
        "--json",
      ],
      { cwd: tempRepo, encoding: "utf8", timeout: 30000 },
    );
    if (split.status !== 0) {
      fail(`visual capability split failed: ${split.status}\n${split.stdout}\n${split.stderr}`);
    }
    writeFile(fakeCodex, "#!/bin/sh\necho 'codex exec help without custom permissions'\n");
    writeFile(path.join(binDir, "drawio"), "#!/bin/sh\nexit 0\n");
    fs.chmodSync(fakeCodex, 0o755);
    fs.chmodSync(path.join(binDir, "drawio"), 0o755);
    const configPath = path.join(
      tempRepo,
      ".agents/skillopt-work",
      skillName,
      "configs/agent-skills.codex-cli-all.yaml",
    );
    const baseConfig = fs
      .readFileSync(path.join(assetRoot, "config.codex-cli-all.yaml"), "utf8")
      .replaceAll("<skill>", skillName)
      .replaceAll("<run-name>", "run-001")
      .replaceAll("<run-profile>", "exploratory")
      .replaceAll("codex_exec_path: codex", `codex_exec_path: ${fakeCodex}`);
    const testEnv = providerTestEnv({
      PATH: `${binDir}${path.delimiter}${process.env.PATH || ""}`,
    });
    const fullConfig = baseConfig
      .replaceAll("<split-dir>", `.agents/skillopt-work/${skillName}/data`)
      .replaceAll("<visual-eval-policy>", "full");
    const textOnlyConfig = baseConfig
      .replaceAll("<split-dir>", `.agents/skillopt-work/${skillName}/data-text-only`)
      .replaceAll("<visual-eval-policy>", "text-only");
    writeFile(configPath, fullConfig);
    let visual = runReadinessJson(tempRepo, skillName, "codex-cli-all", [], testEnv).parsed
      .visualArtifactReadiness;
    if (
      visual?.status !== "unsupported_codex_permission_profile" ||
      visual.codexPermissionProfile?.status !== "unsupported"
    ) {
      fail(
        `full visual readiness ignored missing custom permission support: ${JSON.stringify(visual)}`,
      );
    }

    writeFile(configPath, textOnlyConfig);
    visual = runReadinessJson(tempRepo, skillName, "codex-cli-all", [], testEnv).parsed
      .visualArtifactReadiness;
    if (visual?.status !== "unsupported_codex_permission_profile") {
      fail(
        `text-only Codex rollout ignored missing isolation capability: ${JSON.stringify(visual)}`,
      );
    }

    writeFile(
      fakeCodex,
      `#!/bin/sh
schema=""
invalid=0
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--output-schema" ]; then
    shift
    schema="$1"
  elif [ "$1" = "permissions.skillopt_capability_probe.filesystem=7" ]; then
    invalid=1
  fi
  shift
done
if [ "$invalid" -eq 1 ]; then
  echo "Error loading config.toml: invalid type for permissions filesystem" >&2
  exit 1
fi
echo "Failed to read output schema file: $schema" >&2
exit 1
`,
    );
    fs.chmodSync(fakeCodex, 0o755);
    fs.rmSync(path.join(binDir, "drawio"));
    const supportedEnv = providerTestEnv({
      PATH: `${binDir}${path.delimiter}/bin${path.delimiter}/usr/bin`,
    });
    visual = runReadinessJson(tempRepo, skillName, "codex-cli-all", [], supportedEnv).parsed
      .visualArtifactReadiness;
    if (
      visual?.status !== "text_only_ready" ||
      visual.codexPermissionProfile?.status !== "supported"
    ) {
      fail(`text-only split did not bypass only the renderer gate: ${JSON.stringify(visual)}`);
    }

    writeFile(configPath, fullConfig);
    visual = runReadinessJson(tempRepo, skillName, "codex-cli-all", [], supportedEnv).parsed
      .visualArtifactReadiness;
    if (visual?.status !== "missing_drawio_cli") {
      fail(`full visual split did not require a renderer: ${JSON.stringify(visual)}`);
    }

    const nativeConfigPath = path.join(
      tempRepo,
      ".agents/skillopt-work",
      skillName,
      "configs/agent-skills.native-provider.yaml",
    );
    const nativeBase = fs
      .readFileSync(path.join(assetRoot, "config.native-provider.yaml"), "utf8")
      .replaceAll("<skill>", skillName)
      .replaceAll("<run-name>", "run-001")
      .replaceAll("<run-profile>", "official-parity");
    writeFile(
      nativeConfigPath,
      nativeBase
        .replaceAll("<split-dir>", `.agents/skillopt-work/${skillName}/data`)
        .replaceAll("<visual-eval-policy>", "full"),
    );
    visual = runReadinessJson(tempRepo, skillName, "native-provider", [], providerTestEnv()).parsed
      .visualArtifactReadiness;
    if (visual?.status !== "unsupported_visual_target_backend") {
      fail(`provider-backed full visual split was not blocked: ${JSON.stringify(visual)}`);
    }

    writeFile(
      nativeConfigPath,
      nativeBase
        .replaceAll("<split-dir>", `.agents/skillopt-work/${skillName}/data-text-only`)
        .replaceAll("<visual-eval-policy>", "text-only"),
    );
    visual = runReadinessJson(tempRepo, skillName, "native-provider", [], providerTestEnv()).parsed
      .visualArtifactReadiness;
    if (visual?.status !== "text_only_ready") {
      fail(
        `provider-backed text-only split did not bypass artifact tooling: ${JSON.stringify(visual)}`,
      );
    }
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

function validateNativeStencilAssertionEvidence() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-native-stencil-evidence-"));
  try {
    writeFile(
      path.join(tempDir, "inert-label.drawio"),
      `<mxfile host="app.diagrams.net">
  <diagram name="Page 1">
    <mxGraphModel adaptiveColors="auto" grid="1" page="1" pageWidth="827" pageHeight="1169">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="label" value="shape=mxgraph.fake" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="180" height="60" as="geometry"/>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`,
    );
    const artifacts = listArtifacts(tempDir);
    evaluateAssertion(parseAssertion("drawio_valid: inert-label.drawio uncompressed=1"), artifacts);
    let accepted = false;
    let rejection = "";
    try {
      evaluateAssertion(
        parseAssertion("drawio_valid: inert-label.drawio min_native_stencils=1 uncompressed=1"),
        artifacts,
      );
      accepted = true;
    } catch (error) {
      accepted = false;
      rejection = String(error?.message || error);
    }
    if (accepted) {
      fail("min_native_stencils accepted inert label text instead of parsed stencil cells");
    }
    assertIncludes("parsed native stencil evidence", rejection, "has 0 native stencil cell(s)");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

validateHelp();
validatePythonTemplates();
validateNativeStencilAssertionEvidence();
validateDataloaderSetupBoundary();
validateRolloutArtifactPolicy();
validateProviderTargetRollout();
await validateCodexJudgeAndReflectorIsolation();
validateRolloutWorkspaceSeedingContract();
await validateVisualRolloutReadIsolation();
validateRolloutTimeoutPromptRedaction();
validateConfigContracts();
validateVisualArtifactRolloutContract();
validateGatewayOwnershipGuidance();
validateBenchmarkAssertions();
validateAdoptionSafety();
validateNoPrivatePayload();
validateGatewayConfigHardening();
await validateGatewaySmoke();
await validateEndpointProbeRedaction();
await validateGatewaySpawnFailureRedaction();
await validateGatewayEarlyExitStdinSafety();
validateStaleAdapterManifestBlocksTraining();
validateActiveSplitDataFloor();
validateProviderSpecificReadiness();
validateGeneratedDataFreshnessAndRunnability();
validateLiveAdapterPatchProof();
validateVisualPermissionCapabilityGate();
validateNoneVisualAssertionsIgnored();
validateGroupedSplitsAndTextOnlyMembership();
validateGroupedSplitFloorsAndNumericArgs();
validateTextOnlySplitExistsWithoutVisualAssertions();
validateWrappedExpectedBehaviorSplit();
validateLocalArtifactAudit();
validateLocalArtifactAuditFreshGlobalCompatibility();

console.log("SkillOpt setup payload validated.");
