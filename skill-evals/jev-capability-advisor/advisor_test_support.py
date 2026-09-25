"""Resolve the canonical skill exercised by the public runtime regression suite."""
from pathlib import Path

REPOSITORY = Path(__file__).resolve().parents[2]
SCRIPTS = REPOSITORY / "skills/skill-maintenance/jev-capability-advisor/scripts"
