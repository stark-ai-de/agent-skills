#!/usr/bin/env python3
"""Opt-in Jev hook registration. No provider access or capability discovery.

install/uninstall modify only the selected hook config and private ownership state.
status and --dry-run never write. No third-party dependencies.
"""
import argparse
import base64
from contextlib import contextmanager
from copy import copy
from dataclasses import dataclass
import hashlib
import json
import os
from pathlib import Path
import shlex
import shutil
import re
import stat
import subprocess
import sys
import tempfile
import time

MARKER = 'jev-capability-advisor hook v1'
STATE_VERSION = 1
MAX_WINDOWS_COMMAND_CHARS = 8000
MAX_FILE_BYTES = 16 * 1024 * 1024
STATE_IGNORE = b'*\n'
EMITTER = """# jev-capability-advisor hook v1
import base64, sys
try:
    payload = base64.b64decode(sys.argv[1], validate=True)
    while sys.stdin.buffer.read(65536):
        pass
    sys.stdout.buffer.write(payload + b'\\n')
    sys.stdout.buffer.flush()
except BaseException:
    sys.exit(1)
"""
DISCLOSURE = ('Opt-in: for new actionable tasks, the agent may send a minimal task '
              'summary and bounded eligible capability metadata to TypeSafe using '
              'existing credentials. The hook itself performs no network access. '
              'Host restrictions and native fallback remain in effect.')


class HookError(Exception):
    """An actionable failure which must not overwrite user configuration."""


class Parser(argparse.ArgumentParser):
    def error(self, message):
        raise HookError('invalid_arguments: ' + message)


@dataclass(frozen=True)
class Snapshot:
    data: bytes | None
    identity: tuple | None


def _identity(value):
    return (value.st_dev, value.st_ino, value.st_size,
            value.st_mtime_ns, value.st_ctime_ns, value.st_mode)


def safe_path(path):
    """Reject symlinked write paths, including existing ancestor components."""
    path = Path(os.path.abspath(path))
    for part in (*reversed(path.parents), path):
        try:
            metadata = part.lstat()
        except FileNotFoundError:
            continue
        # Junctions redirect Windows paths too, but is_symlink() is false for
        # them on supported Python versions before Path.is_junction existed.
        redirect_tags = (getattr(stat, 'IO_REPARSE_TAG_SYMLINK', 0xA000000C),
                         getattr(stat, 'IO_REPARSE_TAG_MOUNT_POINT', 0xA0000003))
        if (stat.S_ISLNK(metadata.st_mode)
                or getattr(metadata, 'st_reparse_tag', 0) in redirect_tags):
            raise HookError('symlink_path: ' + str(part))
    return path


def read_snapshot(path):
    path = safe_path(path)
    try:
        before = path.lstat()
    except FileNotFoundError:
        return Snapshot(None, None)
    if not stat.S_ISREG(before.st_mode):
        raise HookError('not_regular_file: ' + str(path))
    if before.st_size > MAX_FILE_BYTES:
        raise HookError('file_too_large: ' + str(path))
    flags = os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0) | getattr(os, 'O_BINARY', 0)
    with os.fdopen(os.open(path, flags), 'rb') as stream:
        opened = os.fstat(stream.fileno())
        data = stream.read(MAX_FILE_BYTES + 1)
        after = os.fstat(stream.fileno())
    if (len(data) > MAX_FILE_BYTES or _identity(before) != _identity(opened)
            or _identity(opened) != _identity(after)
            or _identity(after) != _identity(path.lstat())):
        raise HookError('concurrent_modification: ' + str(path))
    return Snapshot(data, _identity(after))


def atomic_write(path, data, expected):
    """Stage privately; refuse detected edits before atomic replacement.

    Serializes our managers via the enclosing lock. Filesystems do not offer a
    portable compare-and-swap against an unrelated writer after the last check.
    """
    path = safe_path(path)
    if read_snapshot(path) != expected:
        raise HookError('concurrent_modification: ' + str(path))
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    safe_path(path)
    descriptor, name = tempfile.mkstemp(prefix='.' + path.name + '-', dir=path.parent)
    temporary = Path(name)
    try:
        with os.fdopen(descriptor, 'wb') as stream:
            stream.write(data)
            if expected.identity is not None and os.name != 'nt':
                os.fchmod(stream.fileno(), stat.S_IMODE(expected.identity[-1]))
            stream.flush()
            os.fsync(stream.fileno())
        if read_snapshot(path) != expected:
            raise HookError('concurrent_modification: ' + str(path))
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def _pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise HookError('duplicate_json_key: ' + key)
        result[key] = value
    return result


def parse_object(snapshot, label):
    if snapshot.data is None:
        return {}
    try:
        result = json.loads(snapshot.data.decode('utf-8-sig'), object_pairs_hook=_pairs,
                            parse_constant=lambda _: (_ for _ in ()).throw(
                                HookError('invalid_json_constant')))
    except (ValueError, UnicodeError) as error:
        raise HookError('invalid_json: ' + label) from error
    if not isinstance(result, dict):
        raise HookError('expected_json_object: ' + label)
    return result


def encode(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def digest(data):
    return hashlib.sha256(data).hexdigest() if data is not None else None


def load_guidance():
    return (Path(__file__).resolve().parent.parent / 'assets' /
            'hook-guidance.txt').read_text(encoding='utf-8').strip()


def registration_guidance(host, scope, project_root):
    """Bind local status lookup to this registration, never provider metadata."""
    binding = {'host': host, 'scope': scope,
               'project_root': str(safe_path(project_root)) if scope == 'project' else None}
    return (load_guidance() + '\nLocal registration (never send to provider): ' +
            json.dumps(binding, ensure_ascii=False, separators=(',', ':')))


def _ps_quote(value):
    return "'" + value.replace("'", "''") + "'"


def build_registration(host, python_executable=None, platform=None, guidance=None):
    if host not in ('codex', 'claude-code'):
        raise HookError('unsupported_host')
    platform = platform or sys.platform
    python_executable = str(python_executable or Path(sys.executable).resolve())
    guidance = load_guidance() if guidance is None else guidance
    payload = json.dumps({'hookSpecificOutput': {
        'hookEventName': 'UserPromptSubmit', 'additionalContext': guidance}},
        ensure_ascii=True, separators=(',', ':'))
    # Base64 is data, not executable source. In particular it contains no double
    # quotes for Windows PowerShell 5.1's legacy native argument conversion.
    encoded = base64.b64encode(payload.encode('utf-8')).decode('ascii')
    argv = [python_executable, '-I', '-B', '-c', EMITTER, encoded]
    handler = {'type': 'command', 'timeout': 5}
    if host == 'claude-code':
        handler.update(command=argv[0], args=argv[1:])
    else:
        handler['command'] = shlex.join(argv) + ' || exit 1'
        if platform == 'win32':
            script = ("$ErrorActionPreference='Stop'; try { & " +
                      ' '.join(_ps_quote(arg) for arg in argv) +
                      "; if ($LASTEXITCODE -eq 0) { exit 0 }; exit 1 } catch { exit 1 }")
            command = ('powershell.exe -NoLogo -NoProfile -NonInteractive '
                       '-OutputFormat Text -EncodedCommand ' +
                       base64.b64encode(script.encode('utf-16le')).decode('ascii'))
            if len(command) > MAX_WINDOWS_COMMAND_CHARS:
                raise HookError('windows_command_too_long')
            handler['commandWindows'] = command
    return {'hooks': [handler]}


def verify_home_state_repository(home, state):
    """Allow only untracked private state in the actual HOME worktree."""
    environment = {key: value for key, value in os.environ.items()
                   if not key.startswith('GIT_')}
    environment['GIT_OPTIONAL_LOCKS'] = '0'

    def git(*arguments):
        try:
            result = subprocess.run(
                ['git', '--literal-pathspecs', '-C', str(home), *arguments],
                stdin=subprocess.DEVNULL, capture_output=True, env=environment,
                timeout=5, check=True)
        except (OSError, subprocess.SubprocessError) as error:
            raise HookError('home_state_git_check_failed') from error
        return result.stdout

    root = git('rev-parse', '--show-toplevel').rstrip(b'\r\n')
    if (not root or Path(os.fsdecode(root)) != home
            or git('rev-parse', '--is-bare-repository').strip() != b'false'):
        raise HookError('home_state_git_root_mismatch')
    if git('ls-files', '-z', '--', state.relative_to(home).as_posix()):
        raise HookError('home_state_already_tracked')


def state_exclusion(state):
    snapshot = read_snapshot(state / '.gitignore')
    if snapshot.data is None:
        return 'missing', snapshot
    return ('present' if snapshot.data == STATE_IGNORE else 'changed'), snapshot


def ensure_state_exclusion(state):
    status, snapshot = state_exclusion(state)
    if status == 'changed':
        raise HookError('state_git_exclusion_changed')
    if status == 'missing':
        atomic_write(state / '.gitignore', STATE_IGNORE, snapshot)


def locations(host, scope, project_root):
    if scope == 'project':
        if not project_root:
            raise HookError('project_root_required')
        root = safe_path(project_root)
        if not root.is_dir():
            raise HookError('project_root_not_directory')
        config = root / ('.codex/hooks.json' if host == 'codex'
                         else '.claude/settings.local.json')
    else:
        if project_root:
            raise HookError('project_root_requires_project_scope')
        variable = 'CODEX_HOME' if host == 'codex' else 'CLAUDE_CONFIG_DIR'
        override = os.environ.get(variable)
        if override and not Path(override).is_absolute():
            raise HookError('config_override_must_be_absolute: ' + variable)
        root = Path(override) if override else Path.home() / (
            '.codex' if host == 'codex' else '.claude')
        config = root / ('hooks.json' if host == 'codex' else 'settings.json')
    if sys.platform == 'win32':
        state_home = os.environ.get('LOCALAPPDATA')
        if not state_home:
            raise HookError('localappdata_required')
        state = Path(state_home)
    else:
        state = Path(os.environ.get('XDG_STATE_HOME', str(Path.home() / '.local/state')))
    if not state.is_absolute():
        raise HookError('state_directory_must_be_absolute')
    config = safe_path(config)
    state = safe_path(state / 'jev-capability-advisor/hooks')
    # Keep state outside the selected project even if an environment override
    # mistakenly points into it. User-scope callers must likewise select private
    # state rather than a repository directory.
    if project_root and state.is_relative_to(safe_path(project_root)):
        raise HookError('state_directory_inside_project')
    for parent in (state, *state.parents):
        marker = parent / '.git'
        if ((marker.is_dir() and (marker / 'HEAD').is_file())
                or (marker.is_file() and marker.read_bytes()[:8] == b'gitdir: ')):
            home = safe_path(Path.home())
            default_state = home / '.local/state/jev-capability-advisor/hooks'
            if sys.platform == 'win32' or parent != home or state != default_state:
                raise HookError('state_directory_inside_repository')
            verify_home_state_repository(home, state)
    target_id = hashlib.sha256(os.fsencode(os.path.normcase(str(config)))).hexdigest()
    return config, state / (target_id + '.json')


def event_entries(config):
    hooks = config.get('hooks', {})
    if not isinstance(hooks, dict):
        raise HookError('invalid_hooks_object')
    entries = hooks.get('UserPromptSubmit', [])
    if not isinstance(entries, list) or any(
            not isinstance(entry, dict) or not isinstance(entry.get('hooks'), list)
            or any(not isinstance(handler, dict) for handler in entry['hooks'])
            for entry in entries):
        raise HookError('invalid_user_prompt_submit_hooks')
    return entries


def receipt_entry(receipt, config_path, snapshot, host, scope):
    if not receipt:
        return None
    if (receipt.get('version') != STATE_VERSION
            or not isinstance(receipt.get('config_path'), str)
            or os.path.normcase(receipt['config_path']) != os.path.normcase(str(config_path))
            or receipt.get('host') != host or receipt.get('scope') != scope
            or receipt.get('phase') not in ('prepared', 'complete')):
        raise HookError('invalid_ownership_receipt')
    for field in ('entry', 'previous_entry'):
        entry = receipt.get(field)
        if entry is not None and (not isinstance(entry, dict)
                                 or MARKER not in json.dumps(entry)):
            raise HookError('invalid_ownership_receipt')
    if receipt['phase'] == 'complete':
        return receipt.get('entry')
    current = digest(snapshot.data)
    if current == receipt.get('after_sha256'):
        return receipt.get('entry')
    if current == receipt.get('before_sha256'):
        return receipt.get('previous_entry')
    raise HookError('incomplete_transaction: inspect private receipt and backup')


def inspect_ownership(entries, owned):
    if owned is None:
        if any(MARKER in json.dumps(entry) for entry in entries):
            raise HookError('ownership_receipt_missing')
        return None
    matches = [index for index, entry in enumerate(entries) if entry == owned]
    if len(matches) != 1:
        raise HookError('owned_entry_changed_missing_or_duplicated')
    if any(MARKER in json.dumps(entry) for index, entry in enumerate(entries)
           if index != matches[0]):
        raise HookError('duplicate_jev_registration')
    return matches[0]


@contextmanager
def manager_lock(receipt_path):
    parent = safe_path(receipt_path.parent)
    parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    lock = safe_path(receipt_path.with_suffix('.lock'))
    try:
        fd = os.open(lock, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError as error:
        raise HookError('manager_locked: ' + str(lock)) from error
    try:
        with os.fdopen(fd, 'w', encoding='ascii') as stream:
            stream.write(str(os.getpid()) + '\n')
        ensure_state_exclusion(parent)
        yield
    finally:
        lock.unlink(missing_ok=True)


def change_config(config_path, receipt_path, config_snapshot, receipt_snapshot,
                  config, old_receipt, owned, replacement, host, scope,
                  interpreter, guidance):
    with manager_lock(receipt_path):
        if (read_snapshot(config_path) != config_snapshot
                or read_snapshot(receipt_path) != receipt_snapshot):
            raise HookError('concurrent_modification')
        after = encode(config)
        backup = None
        if config_snapshot.data is not None:
            backup = receipt_path.parent / (
                receipt_path.stem + '-' + str(time.time_ns()) + '.backup.json')
            atomic_write(backup, config_snapshot.data, Snapshot(None, None))
        prepared = {
            'version': STATE_VERSION, 'host': host, 'scope': scope,
            'config_path': str(config_path), 'entry': replacement,
            'previous_entry': owned, 'phase': 'prepared',
            'before_sha256': digest(config_snapshot.data), 'after_sha256': digest(after),
            'backup_path': str(backup) if backup else None,
            'interpreter': interpreter, 'guidance': guidance,
            'previous_interpreter': old_receipt.get('interpreter'),
            'previous_guidance': old_receipt.get('guidance'),
        }
        # Journal ownership first. A crash after either replacement remains
        # recoverable by comparing before/after hashes; never guess ownership.
        atomic_write(receipt_path, encode(prepared), receipt_snapshot)
        prepared_snapshot = read_snapshot(receipt_path)
        try:
            atomic_write(config_path, after, config_snapshot)
        except (OSError, HookError):
            # The prepared receipt is intentionally retained as recovery evidence.
            raise
        prepared['phase'] = 'complete'
        atomic_write(receipt_path, encode(prepared), prepared_snapshot)
        return str(backup) if backup else None


def registration_run(args):
    config_path, receipt_path = locations(args.host, args.scope, args.project_root)
    config_snapshot = read_snapshot(config_path)
    receipt_snapshot = read_snapshot(receipt_path)
    config = parse_object(config_snapshot, 'hook_config')
    receipt = parse_object(receipt_snapshot, 'ownership_receipt')
    entries = event_entries(config)
    owned = receipt_entry(receipt, config_path, config_snapshot, args.host, args.scope)
    index = inspect_ownership(entries, owned)
    exclusion, _ = state_exclusion(receipt_path.parent)
    if args.action != 'status' and exclusion == 'changed':
        raise HookError('state_git_exclusion_changed')
    if receipt.get('phase') == 'prepared':
        # receipt_entry already proved a before/after snapshot. Report metadata
        # for that actual registration and finalize only on explicit mutation.
        receipt = dict(receipt)
        if digest(config_snapshot.data) == receipt.get('before_sha256'):
            receipt['interpreter'] = receipt.get('previous_interpreter')
            receipt['guidance'] = receipt.get('previous_guidance')
        receipt.update(entry=owned, phase='complete')
        if args.action != 'status' and not args.dry_run:
            with manager_lock(receipt_path):
                if read_snapshot(config_path) != config_snapshot:
                    raise HookError('concurrent_modification')
                atomic_write(receipt_path, encode(receipt), receipt_snapshot)
            receipt_snapshot = read_snapshot(receipt_path)
            exclusion = 'present'
    interpreter = str(Path(sys.executable).resolve())
    result = {
        'host': args.host, 'scope': args.scope, 'config_path': str(config_path),
        'receipt_path': str(receipt_path), 'qualification': 'not_verified',
        'host_activation': 'not_verified', 'dry_run': args.dry_run,
        'state_git_exclusion': exclusion,
        'disclosure': DISCLOSURE,
    }
    if args.action == 'status':
        result.update(status='configured' if owned else 'absent',
                      registration=owned, interpreter=receipt.get('interpreter'),
                      guidance=receipt.get('guidance') if owned else None,
                      prerequisites=[
                          'Review and trust hooks in the host; managed policy may prevent activation.',
                          'Qualify current eligible inventory, delivery and adoption independently.',
                      ])
        registered_python = receipt.get('interpreter') if owned else None
        result['interpreter_available'] = bool(
            isinstance(registered_python, str) and Path(registered_python).is_file())
        result['known_obstacles'] = []
        if exclusion != 'present':
            result['known_obstacles'].append('state_git_exclusion_' + exclusion)
        if owned and not result['interpreter_available']:
            result['known_obstacles'].append('registered_interpreter_missing')
        if config.get('disableAllHooks') is True:
            result['host_activation'] = 'disabled_in_selected_config'
            result['known_obstacles'].append('hooks_disabled_in_selected_config')
        return result
    if args.action == 'install':
        if sys.version_info < (3, 10):
            raise HookError('python_3_10_required')
        if not Path(interpreter).is_file():
            raise HookError('python_interpreter_unavailable')
        if sys.platform == 'win32':
            if Path(interpreter).suffix.lower() != '.exe':
                raise HookError('windows_interpreter_requires_exe')
            if args.host == 'codex':
                if shutil.which('powershell.exe') is None:
                    raise HookError('powershell_unavailable')
        guidance = registration_guidance(args.host, args.scope, args.project_root)
        replacement = build_registration(args.host, interpreter, guidance=guidance)
        result.update(registration=replacement, interpreter=interpreter, guidance=guidance)
        if owned == replacement:
            if not args.dry_run and exclusion == 'missing':
                with manager_lock(receipt_path):
                    pass
                result['state_git_exclusion'] = 'present'
            result['status'] = 'unchanged'
            return result
        updated = list(entries)
        if index is None:
            updated.append(replacement)
        else:
            updated[index] = replacement
        config.setdefault('hooks', {})['UserPromptSubmit'] = updated
        result['status'] = 'would_install' if args.dry_run else 'installed'
    else:
        if owned is None:
            result['status'] = 'absent'
            return result
        replacement = None
        guidance = receipt.get('guidance')
        interpreter = receipt.get('interpreter')
        # Preserve surrounding keys, including intentionally empty objects.
        config['hooks']['UserPromptSubmit'] = [
            entry for position, entry in enumerate(entries) if position != index]
        result['status'] = 'would_uninstall' if args.dry_run else 'uninstalled'
    if not args.dry_run:
        result['backup_path'] = change_config(
            config_path, receipt_path, config_snapshot, receipt_snapshot, config,
            receipt, owned, replacement, args.host, args.scope, interpreter, guidance)
        result['state_git_exclusion'] = 'present'
    return result



def key_file_readiness(path):
    """Check access without reading, retaining, or authenticating key contents."""
    try:
        path = safe_path(path)
        before = path.lstat()
        if not stat.S_ISREG(before.st_mode):
            return 'key_file_not_regular'
        flags = os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0) | getattr(os, 'O_BINARY', 0)
        with os.fdopen(os.open(path, flags), 'rb') as stream:
            opened = os.fstat(stream.fileno())
            if _identity(opened) != _identity(before):
                return 'key_file_changed'
            if not opened.st_size:
                return 'key_file_empty'
        return None
    except FileNotFoundError:
        return 'key_file_missing'
    except (OSError, HookError, ValueError):
        return 'key_file_unreadable'


def credential_settings(path, host):
    snapshot = read_snapshot(path)
    settings = parse_object(snapshot, 'credential_config')
    if snapshot.data is not None:
        key_file = settings.get('key_file')
        if (settings.get('version') != 1 or settings.get('host') != host
                or not isinstance(key_file, str) or not key_file or '\0' in key_file
                or not Path(key_file).is_absolute()):
            raise HookError('invalid_credential_config')
    return snapshot, settings


def credential_status(settings):
    key_file = settings.get('key_file')
    if key_file is not None:
        reason = key_file_readiness(key_file)
        return {'source': 'key_file', 'key_file': key_file,
                'readiness': 'unavailable' if reason else 'ready', 'reason': reason}
    available = bool(os.environ.get('TYPESAFE_API_KEY', '').strip())
    return {'source': 'environment' if available else 'none',
            'readiness': 'ready' if available else 'unavailable',
            'reason': None if available else 'credentials_missing'}


def write_credential_settings(path, settings, expected):
    """Caller holds the host lock; backups contain references, never key bytes."""
    if read_snapshot(path) != expected:
        raise HookError('concurrent_modification: credential_config')
    if expected.data is not None:
        backup = path.with_name(path.stem + '-' + str(time.time_ns()) + '.backup.json')
        atomic_write(backup, expected.data, Snapshot(None, None))
    atomic_write(path, encode(settings), expected)


def integration_fingerprint():
    root = Path(__file__).resolve().parent.parent
    paths = [root / 'SKILL.md']
    for folder in ('scripts', 'assets', 'references', 'agents'):
        paths.extend(path for path in (root / folder).rglob('*')
                     if path.is_file() and '__pycache__' not in path.parts
                     and path.suffix != '.pyc')
    hasher = hashlib.sha256()
    for path in sorted(paths):
        hasher.update(path.relative_to(root).as_posix().encode('utf-8') + b'\0')
        hasher.update(hashlib.sha256(path.read_bytes()).digest())
    return hasher.hexdigest()


def host_version(host):
    # A status inspection must not start another host or create its runtime
    # files. The current agent supplies/verifies its version during live tests;
    # a standalone manager cannot attest that session's build from disk.
    return None


def qualification_context(host, registration):
    platform = ('windows' if sys.platform == 'win32' else
                'macos' if sys.platform == 'darwin' else
                'wsl' if os.environ.get('WSL_DISTRO_NAME') else 'linux')
    return {'host_version': host_version(host), 'platform': platform,
            'integration_sha256': integration_fingerprint(),
            'registration_sha256': digest(encode(registration)) if registration else None}


QUALIFICATION_SCENARIOS = (
    'registration', 'delivery', 'catalog', 'provider', 'adoption', 'disabled',
    'explicit_only', 'availability_change', 'incomplete_metadata', 'plan_mode',
    'missing_key', 'error', 'timeout', 'cancellation', 'followup',
)


def qualification_evidence(path, host, current):
    """Read bounded historical evidence; never treat it as a live session probe."""
    result = {'evidence_path': str(path), 'status': 'absent'}
    try:
        snapshot = read_snapshot(path)
        if snapshot.data is None:
            return result
        record = parse_object(snapshot, 'qualification_evidence')
        catalog = record.get('catalog', {})
        scenarios = record.get('scenarios', {})
        valid = (record.get('version') == 1 and record.get('host') == host
                 and isinstance(record.get('host_version'), str)
                 and re.fullmatch(r'[0-9]+\.[0-9]+\.[0-9]+(?:[-+][a-zA-Z0-9.-]+)?',
                                  record['host_version'])
                 and record.get('platform') in ('linux', 'wsl', 'macos', 'windows')
                 and all(isinstance(record.get(field), str) and re.fullmatch(
                     r'[a-f0-9]{64}', record[field])
                     for field in ('integration_sha256', 'registration_sha256'))
                 and isinstance(catalog, dict)
                 and all(type(catalog.get(field)) is int and 0 <= catalog[field] <= 240
                         for field in ('skills', 'mcp_tools'))
                 and catalog.get('completeness') in ('bounded', 'unknown')
                 and isinstance(scenarios, dict)
                 and all(scenarios.get(field) in ('passed', 'failed', 'simulated', 'not_run')
                         for field in QUALIFICATION_SCENARIOS))
        if not valid:
            raise HookError('invalid_qualification_evidence')
        # Do not echo arbitrary record fields, paths, transcripts or raw data.
        result.update({field: record[field] for field in (
            'host', 'host_version', 'platform', 'integration_sha256', 'registration_sha256')})
        result['catalog'] = {field: catalog[field] for field in ('skills', 'mcp_tools', 'completeness')}
        result['scenarios'] = {field: scenarios[field] for field in QUALIFICATION_SCENARIOS}
        result['status'] = 'matching_environment'
        if any(current[field] is not None and current[field] != record[field]
               for field in current):
            result['status'] = 'stale'
        elif any(value is None for value in current.values()):
            result['status'] = 'historical'
        result['all_scenarios_passed'] = all(value == 'passed' for value in result['scenarios'].values())
    except (HookError, OSError, UnicodeError, TypeError):
        result.update(status='invalid', reason='invalid_qualification_evidence')
    return result


def run(args):
    key_file = getattr(args, 'key_file', None)
    if key_file is not None and args.action != 'install':
        raise HookError('key_file_requires_install')
    _, receipt_path = locations(args.host, args.scope, args.project_root)
    settings_path = receipt_path.parent / (args.host + '-settings.json')
    pending_path = settings_path.with_suffix('.pending.json')
    try:
        pending_snapshot = read_snapshot(pending_path)
        pending = parse_object(pending_snapshot, 'credential_transaction')
    except (HookError, OSError, UnicodeError):
        if args.action == 'install':
            raise HookError('invalid_credential_transaction') from None
        pending_snapshot, pending = None, {'invalid': True}
    settings_error = None
    try:
        settings_snapshot, settings = credential_settings(settings_path, args.host)
    except (HookError, OSError, UnicodeError):
        if args.action == 'install':
            raise HookError('invalid_credential_config') from None
        settings_snapshot, settings = None, {}
        settings_error = 'invalid_credential_config'
    updated = dict(settings)
    if key_file is not None:
        key_file = str(safe_path(key_file))
        reason = key_file_readiness(key_file)
        if reason:
            raise HookError(reason)
        updated.update(version=1, host=args.host, key_file=key_file)
    changed = updated != settings
    if pending_snapshot is None or pending_snapshot.data is not None:
        settings_error = 'incomplete_credential_update'
        if args.action == 'install':
            if (pending.get('version') != 1 or pending.get('host') != args.host
                    or key_file is None or pending.get('key_file') != key_file
                    or digest(settings_snapshot.data) not in (
                        pending.get('before_sha256'), pending.get('after_sha256'))
                    or digest(encode(updated)) != pending.get('after_sha256')):
                raise HookError('incomplete_credential_update: retry the original install with --key-file; preserve the private journal')
            settings_error = None

    def apply():
        if settings_snapshot is not None and read_snapshot(settings_path) != settings_snapshot:
            raise HookError('concurrent_modification: credential_config')
        transaction_snapshot = pending_snapshot
        updating = args.action == 'install' and (changed or pending)
        if updating and not args.dry_run:
            if read_snapshot(pending_path) != pending_snapshot:
                raise HookError('concurrent_modification: credential_transaction')
            if not pending:
                journal = {'version': 1, 'host': args.host, 'key_file': key_file,
                           'before_sha256': digest(settings_snapshot.data),
                           'after_sha256': digest(encode(updated))}
                atomic_write(pending_path, encode(journal), pending_snapshot)
                transaction_snapshot = read_snapshot(pending_path)
        try:
            result = registration_run(args)
            if changed and not args.dry_run:
                write_credential_settings(settings_path, updated, settings_snapshot)
            if updating and not args.dry_run:
                if read_snapshot(pending_path) != transaction_snapshot:
                    raise HookError('concurrent_modification: credential_transaction')
                pending_path.unlink()
        except (HookError, OSError, UnicodeError) as error:
            if updating and not args.dry_run:
                raise HookError('credential_update_incomplete: hook may have changed; advice is disabled until the original install with --key-file succeeds') from error
            raise
        result['credential_config_path'] = str(settings_path)
        result['credential_transaction_path'] = str(pending_path)
        result['credential_configuration'] = (
            'would_update' if args.dry_run else 'updated') if changed else 'unchanged'
        result['credentials'] = ({'source': 'unknown', 'readiness': 'unavailable',
                                  'reason': settings_error} if settings_error
                                 else credential_status(updated))
        if args.action == 'status':
            context = qualification_context(args.host, result['registration'])
            result['qualification_context'] = context
            result['qualification_evidence'] = qualification_evidence(
                receipt_path.with_suffix('.qualification.json'), args.host, context)
            result['currently_unverified'] = [
                'effective_host_trust_and_policy', 'current_session_catalog_and_restrictions',
                'hook_delivery', 'provider_authentication', 'recommendation_adoption',
                'failure_and_followup_behavior',
            ]
            if result['credentials']['reason']:
                result['known_obstacles'].append(result['credentials']['reason'])
        return result

    if args.action == 'status' or args.dry_run:
        return apply()
    # Validate registration before creating any state or lock. Preserve the
    # existing no-op uninstall behavior when no registration exists.
    preview_args = copy(args)
    preview_args.dry_run = True
    preview = registration_run(preview_args)
    if args.action == 'uninstall' and preview['status'] == 'absent':
        return apply()
    # Serialize credential updates across all scopes for this host. Existing
    # registration locks and optimistic snapshots continue to protect ownership.
    with manager_lock(settings_path):
        return apply()

def main(argv=None):
    parser = Parser(description=__doc__, epilog=DISCLOSURE)
    parser.add_argument('action', choices=('install', 'status', 'uninstall'))
    parser.add_argument('--host', choices=('codex', 'claude-code'), required=True)
    parser.add_argument('--scope', choices=('user', 'project'), default='user')
    parser.add_argument('--project-root', type=Path)
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--key-file', type=Path, help='Install only: save an existing key-file reference privately; never copy its contents')
    try:
        result = run(parser.parse_args(argv))
    except (HookError, OSError, UnicodeError, ValueError) as error:
        print(json.dumps({'status': 'error', 'reason': str(error)}, ensure_ascii=True))
        return 1
    print(json.dumps(result, ensure_ascii=True, indent=2))
    return 0


if __name__ == '__main__':
    sys.dont_write_bytecode = True
    raise SystemExit(main())
