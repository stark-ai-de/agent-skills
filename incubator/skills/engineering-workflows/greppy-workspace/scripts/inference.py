#!/usr/bin/env python3
"""Legacy inference path; delegate to the installed Greppy package."""
import os
import sys

try:
    os.execvp("greppy", ["greppy", "inference", *sys.argv[1:]])
except FileNotFoundError:
    raise SystemExit("Install the reviewed greppy-workspace runtime through the package owner.") from None
