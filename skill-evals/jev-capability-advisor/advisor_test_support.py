"""Resolve the canonical public skill, with an incubator fallback during development."""
from pathlib import Path

REPOSITORY = Path(__file__).resolve().parents[2]
PUBLIC = REPOSITORY / 'skills/skill-maintenance/jev-capability-advisor/scripts'
INCUBATOR = REPOSITORY / 'incubator/skills/skill-maintenance/jev-capability-advisor/scripts'
SCRIPTS = PUBLIC if PUBLIC.is_dir() else INCUBATOR
