"""Start an already-installed official Karakeep MCP executable; no downloads or writes."""

import argparse
import os
from pathlib import Path
import sys

from runtime import ConfigurationError, default_paths, private_settings


def launch(env_file, command):
    settings = private_settings(env_file)
    if not command or not Path(command[0]).is_absolute():
        raise ConfigurationError("Select an absolute, already-installed official MCP executable.")
    if not Path(command[0]).is_file() or not os.access(command[0], os.X_OK):
        raise ConfigurationError("The selected MCP executable is unavailable.")
    env = dict(os.environ)
    env.update(settings)
    # Node and HTTP clients differ in proxy support; keep loopback out of both forms.
    bypass = "localhost,127.0.0.1,::1,[::1]"
    env.update(NO_PROXY=bypass, no_proxy=bypass)
    os.execve(command[0], command, env)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", type=Path, default=default_paths()[0] / "mcp.env")
    parser.add_argument("command", nargs=argparse.REMAINDER, help="-- /absolute/official/mcp [args]")
    args = parser.parse_args()
    command = args.command[1:] if args.command[:1] == ["--"] else args.command
    try:
        launch(args.env_file, command)
    except (ConfigurationError, OSError) as error:
        message = str(error) if isinstance(error, ConfigurationError) else "Cannot start the selected MCP executable."
        print(message, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
