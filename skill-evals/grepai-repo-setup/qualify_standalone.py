"""Real native CLI lifecycle with a loopback embedding stub, not model quality."""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import threading
import time

SOURCE = Path(__file__).resolve().parents[2] / "incubator/skills/engineering-workflows/grepai-repo-setup/scripts/standalone.py"
spec = importlib.util.spec_from_file_location("standalone", SOURCE)
setup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(setup)


class Embeddings(BaseHTTPRequestHandler):
    inputs = []

    def do_GET(self):
        body = json.dumps({"models": [{"name": "bge-m3:latest", "model": "bge-m3:latest", "digest": setup.MODEL_DIGEST}], "version": "fixture"}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        data = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        inputs = data.get("input", data.get("prompt", ""))
        inputs = inputs if isinstance(inputs, list) else [inputs]
        self.inputs.extend(inputs)
        vector = [1.0] + [0.0] * 1023
        body = json.dumps({"model": "bge-m3", "embedding": vector, "embeddings": [vector for _ in inputs]}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


def qualify():
    server = ThreadingHTTPServer(("127.0.0.1", 0), Embeddings)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with tempfile.TemporaryDirectory(prefix="grepai-standalone-") as tmp:
            root = Path(tmp)
            repo = root / "project"
            child_home = root / "home"
            child_home.mkdir()
            env = dict(os.environ, HOME=str(child_home), XDG_CONFIG_HOME=str(child_home / ".config"), NO_PROXY="127.0.0.1,localhost", no_proxy="127.0.0.1,localhost")
            subprocess.run(["git", "init", "-q", str(repo)], check=True, env=env)
            setup.prepare(repo, apply=True, workspace_file=root / "absent-workspace.yaml")
            config = repo / ".grepai/config.yaml"
            value = setup.yaml.safe_load(config.read_text())
            value["embedder"]["endpoint"] = f"http://127.0.0.1:{server.server_port}"
            config.write_text(setup.yaml.safe_dump(value))
            source = repo / "searchable.py"
            source.write_text('def example_lookup():\n    """Return the original public fixture value."""\n    return "ORIGINAL_FIXTURE_VALUE"\n')
            (repo / ".env.private.py").write_text('def excluded_fixture():\n    return "EXCLUDED_SENTINEL"\n')
            with (root / "watch.log").open("w+") as log:
                watcher = subprocess.Popen(["grepai", "watch", "--no-ui"], cwd=repo, env=env, stdout=log, stderr=log)
                try:
                    def hits():
                        result = subprocess.run(["grepai", "search", "--json", "-n", "100", "public fixture value"],
                                                cwd=repo, env=env, capture_output=True, text=True, timeout=5)
                        if result.returncode:
                            return None
                        return json.loads(result.stdout)

                    def until(predicate):
                        deadline = time.monotonic() + 30
                        while time.monotonic() < deadline:
                            if watcher.poll() is not None:
                                log.seek(0)
                                raise AssertionError("owned watcher exited: " + log.read()[-2000:])
                            result = hits()
                            if result is not None and predicate(json.dumps(result)):
                                return result
                            time.sleep(0.2)
                        log.seek(0)
                        raise AssertionError("fixture propagation timed out: " + log.read()[-2000:])

                    until(lambda text: "ORIGINAL_FIXTURE_VALUE" in text)
                    source.write_text('def example_lookup():\n    """Return the changed public fixture value."""\n    return "UPDATED_FIXTURE_VALUE"\n')
                    until(lambda text: "UPDATED_FIXTURE_VALUE" in text and "ORIGINAL_FIXTURE_VALUE" not in text)
                    source.unlink()
                    until(lambda text: "searchable.py" not in text)
                    assert all("EXCLUDED_SENTINEL" not in text for text in Embeddings.inputs)
                finally:
                    watcher.terminate()
                    try:
                        watcher.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        watcher.kill()
                        watcher.wait()
            return {"status": "passed", "layer": "native-cli-with-embedding-stub", "freshMachine": False,
                    "semanticQuality": "unverified", "checks": ["standalone-init", "retrieval", "update", "deletion", "private-exclusions"]}
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


if __name__ == "__main__":
    print(json.dumps(qualify(), indent=2))
