"""Bounded, deterministic Codex and pi 1.5.2 outcome readers; no model calls."""

import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import stat

MAX_TRANSCRIPT_BYTES = 32 * 1024 * 1024
MAX_HEADER_BYTES = 64 * 1024
MAX_OUTCOMES = 16
MAX_OUTCOME_CHARS = 6000
MAX_CONTENT_CHARS = 24000
SESSION_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$")
INJECTED = re.compile(r"<(?:hindsight_memories|hindsight_pages|user_feedback|environment_context|recommended_plugins)(?:\s|>)", re.I)


def timestamp(value):
    if not isinstance(value, str):
        raise ValueError("missing timestamp")
    parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("timestamp without timezone")
    return parsed


def identity(header, source=None):
    if not isinstance(header, dict):
        raise ValueError("session header")
    if header.get("type") == "session_meta":
        meta = header["payload"]
        if meta.get("source") != "cli":
            raise ValueError("only main Codex CLI sessions are eligible")
        actual = "codex"
        parent = meta.get("forked_from_id") or meta.get("parent_session_id")
    elif header.get("type") == "session" and header.get("version") == 3:
        meta = header
        if meta.get("source") == "subagent" or meta.get("is_subagent") is True:
            raise ValueError("child sessions are not independently retained")
        actual = "pi"
        parent = meta.get("parentSession")
    else:
        raise ValueError("unsupported session format")
    if source is not None and actual != source:
        raise ValueError("session source mismatch")
    if not isinstance(meta.get("id"), str) or not SESSION_ID.fullmatch(meta["id"]):
        raise ValueError("session identity")
    timestamp(meta.get("timestamp"))
    if not isinstance(meta.get("cwd"), str) or not Path(meta["cwd"]).is_absolute():
        raise ValueError("session cwd")
    if isinstance(parent, str):
        match = re.search(r"[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}", parent)
        parent = actual + ":" + (match.group(0) if match else hashlib.sha256(parent.encode()).hexdigest()[:24])
    else:
        parent = None
    return {"source": actual, "session_id": meta["id"], "cwd": meta["cwd"],
            "timestamp": meta["timestamp"], "forked_from": parent}


def open_transcript(path):
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    stream = os.fdopen(fd, "rb")
    info = os.fstat(stream.fileno())
    if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid():
        stream.close()
        raise ValueError("transcript ownership or type")
    return stream


def read_header(path, source=None):
    with open_transcript(path) as stream:
        raw = stream.readline(MAX_HEADER_BYTES + 1)
        if len(raw) > MAX_HEADER_BYTES or not raw.endswith(b"\n"):
            raise ValueError("incomplete or oversized session header")
        result = identity(json.loads(raw), source)
        result["byte_length"] = os.fstat(stream.fileno()).st_size
    return result


def snapshot(path, byte_length=None, complete_only=False):
    with open_transcript(path) as stream:
        size = os.fstat(stream.fileno()).st_size
        limit = size if byte_length is None else byte_length
        if type(limit) is not int or not 0 < limit <= MAX_TRANSCRIPT_BYTES or size < limit:
            raise ValueError("snapshot size bound or shortened transcript")
        raw = stream.read(limit)
    if complete_only and raw and not raw.endswith(b"\n"):
        boundary = raw.rfind(b"\n")
        if boundary >= 0:
            raw = raw[:boundary + 1]
    if not raw or (not complete_only and len(raw) != limit) or not raw.endswith(b"\n"):
        raise ValueError("incomplete transcript snapshot")
    return raw


def text_content(content):
    if isinstance(content, str):
        text = content
    elif isinstance(content, list):
        text = "\n".join(item["text"] for item in content if isinstance(item, dict)
                         and item.get("type") in ("text", "input_text", "output_text")
                         and isinstance(item.get("text"), str))
    else:
        return ""
    if INJECTED.search(text) or text.lstrip().startswith("# AGENTS.md instructions"):
        return ""
    return text.strip()


def pi_branch(entries, leaf_id):
    by_id = {}
    for item in entries:
        if isinstance(item.get("id"), str):
            if item["id"] in by_id:
                raise ValueError("duplicate pi entry")
            by_id[item["id"]] = item
    if not by_id:
        return []
    cursor = leaf_id or next(reversed(by_id))
    branch, seen = [], set()
    while cursor is not None:
        if cursor in seen or cursor not in by_id:
            raise ValueError("invalid pi branch")
        seen.add(cursor)
        item = by_id[cursor]
        branch.append(item)
        cursor = item.get("parentId")
    return list(reversed(branch))


def parse(raw, session_id, source=None, leaf_id=None, known_outcomes=(), completion_status=None, checkpoint_at=None):
    if len(raw) > MAX_TRANSCRIPT_BYTES:
        raise ValueError("transcript size bound")
    entries = [json.loads(line) for line in raw.decode("utf-8").splitlines() if line.strip()]
    if not entries or any(not isinstance(item, dict) for item in entries):
        raise ValueError("invalid transcript")
    meta = identity(entries[0], source)
    if meta["session_id"] != session_id:
        raise ValueError("session identity mismatch")
    source = meta["source"]
    started = timestamp(meta["timestamp"])
    records = pi_branch(entries[1:], leaf_id) if source == "pi" else entries[1:]
    if checkpoint_at is not None:
        checkpoint = timestamp(checkpoint_at)
        if checkpoint < started:
            raise ValueError("checkpoint predates session")
        # A dirty reference may see later appends. Admit only timestamped records
        # at/before its checkpoint, including delayed flushes with earlier dates.
        # Filter before selecting edits/user events so future context cannot alter
        # a previously authorized outcome after capture has been paused.
        records = [entry for entry in records if entry.get("timestamp") is not None
                   and timestamp(entry["timestamp"]) <= checkpoint]
    edits = {item["targetId"]: item for item in records if source == "pi" and item.get("type") == "context_edit" and isinstance(item.get("targetId"), str)}
    # Native user events become authoritative as they occur. A later native
    # event must not retroactively change IDs of already checkpointed outcomes.
    user_events = False
    task, outcomes, seen = "", [], set()
    last_task_index = 0
    known_outcomes = set(known_outcomes)
    for entry in records:
        edit = edits.get(entry.get("id"))
        event_time = edit.get("timestamp") if edit else entry.get("timestamp")
        if event_time is None:
            if meta["forked_from"]:
                continue  # Never turn undated inherited history into new fork evidence.
            event_time = meta["timestamp"]
        if timestamp(event_time) < started:
            continue
        if source == "pi":
            if entry.get("type") != "message":
                continue
            payload = entry.get("message", {})
            if edit:
                replacement = edit.get("replacement")
                if replacement is None:
                    continue
                if not isinstance(replacement, dict) or "content" not in replacement:
                    raise ValueError("invalid pi context edit")
                payload = {**payload, "content": replacement["content"]}
            role = payload.get("role")
            if role == "assistant" and (payload.get("stopReason") != "stop"
                    or any(c.get("type") == "toolCall" for c in payload.get("content", []) if isinstance(c, dict))):
                continue
        else:
            payload = entry.get("payload", {})
            if entry.get("type") == "event_msg" and payload.get("type") in {"turn_aborted", "task_aborted"}:
                outcomes = outcomes[:last_task_index]
                continue
            if entry.get("type") == "event_msg":
                if payload.get("type") == "user_message":
                    user_events = True
                    last_task_index = len(outcomes)
                    task = text_content(payload.get("message", ""))[:2000]
                elif payload.get("type") == "item_completed" and payload.get("item", {}).get("type") == "UserMessage":
                    user_events = True
                    last_task_index = len(outcomes)
                    task = text_content(payload["item"].get("content"))[:2000]
                continue
            if entry.get("type") != "response_item" or payload.get("type") != "message":
                continue
            role = payload.get("role")
            if role == "user" and user_events:
                continue
            if role == "assistant" and any(payload.get(field) not in (None, "final") for field in ("channel", "phase")):
                continue
        text = text_content(payload.get("content"))
        if role == "user":
            last_task_index = len(outcomes)
            task = text[:2000]
        elif role == "assistant" and text:
            original = text
            excerpt = len(text) > MAX_OUTCOME_CHARS
            if excerpt:
                boundary = max(text.rfind("\n", 0, MAX_OUTCOME_CHARS), text.rfind(". ", 0, MAX_OUTCOME_CHARS))
                if boundary < MAX_OUTCOME_CHARS // 2:
                    boundary = text.rfind(" ", 0, MAX_OUTCOME_CHARS)
                text = text[:boundary if boundary > 0 else MAX_OUTCOME_CHARS].rstrip()
            outcome = {"task": task, "outcome": text, "timestamp": event_time,
                       "capture": "bounded excerpt; consult original session" if excerpt else "agent-reported outcome",
                       "source_text_sha256": hashlib.sha256(original.encode()).hexdigest()}
            content = json.dumps(outcome, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
            key = hashlib.sha256((source + "\n" + session_id + "\n" + content).encode()).hexdigest()
            if key not in seen and key not in known_outcomes:
                seen.add(key)
                outcomes.append({"id": key, "content": content, "entry_id": entry.get("id")})
    if completion_status == "aborted":
        outcomes = outcomes[:last_task_index]
    # Filter known IDs first, then drain oldest unseen outcomes. A partial batch
    # keeps its queue reference so an unchanged transcript cannot starve history.
    selected, used = [], 0
    for outcome in outcomes:
        if len(selected) >= MAX_OUTCOMES or used + len(outcome["content"]) > MAX_CONTENT_CHARS:
            break
        selected.append(outcome)
        used += len(outcome["content"])
    meta["remaining_outcomes"] = len(outcomes) - len(selected)
    return meta, selected
