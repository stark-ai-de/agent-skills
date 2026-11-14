#!/usr/bin/env python3
"""Legacy command path; the installed Greppy package owns implementation."""
import os
import sys

args = sys.argv[1:]
if args and args[0] == "doctor":
    args[0] = "workspace-doctor"
try:
    os.execvp("greppy", ["greppy", *args])
except FileNotFoundError:
    raise SystemExit("Install the reviewed greppy-workspace runtime through the package owner.") from None
