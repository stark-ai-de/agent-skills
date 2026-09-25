#!/usr/bin/env python3
"""Opt-in Jev hook registration. No provider access or capability discovery.

install/uninstall modify only the selected hook config and private ownership state.
status and --dry-run never write. No third-party dependencies.
"""
import argparse
import base64
from contextlib import contextmanager
from dataclasses import dataclass
import hashlib
import json
import os
from pathlib import Path
import shlex
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
            or receipt.get('config_path') != str(config_path)
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


def run(args):
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
                import shutil
                if shutil.which('powershell.exe') is None:
                    raise HookError('powershell_unavailable')
        guidance = load_guidance()
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


def main(argv=None):
    parser = Parser(description=__doc__, epilog=DISCLOSURE)
    parser.add_argument('action', choices=('install', 'status', 'uninstall'))
    parser.add_argument('--host', choices=('codex', 'claude-code'), required=True)
    parser.add_argument('--scope', choices=('user', 'project'), default='user')
    parser.add_argument('--project-root', type=Path)
    parser.add_argument('--dry-run', action='store_true')
    try:
        result = run(parser.parse_args(argv))
    except (HookError, OSError, UnicodeError) as error:
        print(json.dumps({'status': 'error', 'reason': str(error)}, ensure_ascii=True))
        return 1
    print(json.dumps(result, ensure_ascii=True, indent=2))
    return 0


if __name__ == '__main__':
    sys.dont_write_bytecode = True
    raise SystemExit(main())
