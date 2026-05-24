# Cleanup Plan Template

Use this structure when the user needs to approve individual memory cleanup actions.

```json
{
  "schema_version": "1.0",
  "codex_home": "<codex-home>",
  "created_at": "<iso-8601-timestamp>",
  "source": {
    "memory_files": [],
    "config_file": null,
    "repo_context_files": []
  },
  "summary": {
    "entries_extracted": 0,
    "keep": 0,
    "rewrite": 0,
    "move_to_agents_md": 0,
    "move_to_repo_docs": 0,
    "move_to_skill": 0,
    "move_to_config": 0,
    "delete": 0,
    "ask_user": 0
  },
  "decisions": [
    {
      "id": "M-1",
      "source_file": "memories/MEMORY.md",
      "line": 1,
      "current_memory_redacted": "<short redacted memory claim>",
      "primary_classification": "ASK USER",
      "risk_tags": [],
      "confidence": "low",
      "conflicts": [],
      "proposed_action": "<leave unchanged, rewrite, move, delete, or ask>",
      "proposed_replacement": null,
      "approved": false
    }
  ],
  "apply_requirements": {
    "requires_explicit_user_approval": true,
    "requires_backup_first": true,
    "write_proposed_file_when_schema_unknown": true
  }
}
```
