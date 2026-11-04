#!/usr/bin/env python3
"""Local workspace orchestration. Mutations require an adopted config and --apply.

Requires Python 3.10+, PyYAML, Git and grepai 1.1.x. No Karakeep credentials or
API writes belong here; maintain delegates to the karakeep-knowledge owner.
"""
import argparse
import contextlib
import datetime as dt
import fcntl
import fnmatch
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import shlex
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request
import uuid

import yaml

PRUNE = {'.git', '.grepai', '.codegraph', 'node_modules', '.pnpm', '.venv', 'venv',
         '__pycache__', 'vendor', 'Vendor', 'target', 'dist', 'build', '.next', '.nuxt',
         '.cache', '.turbo', 'coverage', '.output', '.terraform', '.direnv', '.agents', '.codex',
         '.symphony', '.benchmark-private', '.benchmark-work', '.repos', '.claude'}
HARD_IGNORE = sorted(PRUNE | {'.worktrees', '.aws', '.ssh', '.codex', '.agents',
    '.env', '.env.*', '*.env', '*.pem', '*.key', '*.p12', '*.pfx', '*.sqlite*',
    '*.db', '*.log', '*.jsonl', 'credentials*', '*credentials*.json', 'secrets', 'secrets.*',
    '.secrets', '.secrets.*', '*.lock', '*-lock.json', '*-lock.yaml',
    '.DS_Store', '.idea', '.vscode', '.history'})


def sanitized_remote(value):
    if not isinstance(value, str) or len(value) > 4096 or re.search(r"\s", value):
        return None
    if re.match(r"^[A-Za-z]:[\\/]", value) or value.startswith("ext::"):
        return None
    scp = re.fullmatch(r"(?:[^/@:]+@)?([A-Za-z0-9.-]+):([^/].*)", value)
    if "://" not in value and scp:
        value = "ssh://" + scp[1] + "/" + scp[2]
    try:
        url = urllib.parse.urlsplit(value)
        if url.scheme not in {"https", "http", "ssh", "git"} or not url.hostname:
            return None
        host = "[" + url.hostname + "]" if ":" in url.hostname else url.hostname
        return urllib.parse.urlunsplit((url.scheme, host + (":" + str(url.port) if url.port else ""), url.path, "", ""))
    except ValueError:
        return None


class ConfigLoader(yaml.SafeLoader):
    # Keep Go RFC3339 timestamps as strings; PyYAML otherwise dumps a space
    # instead of T, which grepai's time.Time loader rejects.
    yaml_implicit_resolvers = {key: [(tag, regexp) for tag, regexp in values
        if tag != 'tag:yaml.org,2002:timestamp']
        for key, values in yaml.SafeLoader.yaml_implicit_resolvers.items()}


def load_yaml(text):
    return yaml.load(text, Loader=ConfigLoader)


def repair_legacy_timestamp(config):
    watch = config.get('watch') or {}
    value = watch.get('last_index_time')
    if isinstance(value, str) and re.match(r'^\d{4}-\d\d-\d\d ', value):
        watch['last_index_time'] = dt.datetime.fromisoformat(value).isoformat()


def stamp():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def digest(value):
    if not isinstance(value, bytes):
        value = json.dumps(value, sort_keys=True, separators=(',', ':')).encode()
    return hashlib.sha256(value).hexdigest()


def run(args, *, cwd=None, timeout=60, check=True):
    env = dict(os.environ, GIT_OPTIONAL_LOCKS='0', GIT_TERMINAL_PROMPT='0')
    # Repository selectors from a parent agent must never redirect discovery.
    for key in list(env):
        if key.startswith('GIT_') and key not in {'GIT_OPTIONAL_LOCKS', 'GIT_TERMINAL_PROMPT', 'GIT_SSH_COMMAND', 'GIT_SSH'}:
            env.pop(key)
    p = subprocess.run(args, cwd=cwd, env=env, text=True, stdout=subprocess.PIPE,
                       stderr=subprocess.PIPE, timeout=timeout)
    if check and p.returncode:
        raise RuntimeError(f'{Path(args[0]).name} failed ({p.returncode}): {p.stderr[-1200:]}')
    return p


def git(root, *args, check=True):
    return run(['git', '-C', str(root), *args], check=check).stdout.strip()


def atomic(file, data):
    file = Path(file)
    file.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if file.is_symlink():
        raise ValueError('Refusing a symlink destination')
    raw = data if isinstance(data, str) else json.dumps(data, indent=2, ensure_ascii=False) + '\n'
    if file.exists() and file.read_text() == raw:
        return False
    fd, name = tempfile.mkstemp(prefix='.' + file.name, dir=file.parent)
    try:
        with os.fdopen(fd, 'w') as f:
            f.write(raw)
            f.flush()
            os.fsync(f.fileno())
        os.replace(name, file)
    finally:
        if os.path.exists(name):
            os.unlink(name)
    return True


def read(file, default=None):
    try:
        return json.loads(Path(file).read_text())
    except FileNotFoundError:
        if default is not None:
            return default
        raise


def beneath(p, root):
    return p == root or root in p.parents


def load_config(file):
    c = read(file)
    if c.get('schemaVersion') != 1 or not c.get('approval'):
        raise ValueError('An adopted schema-1 config is required')
    for key in ['roots', 'excludePaths']:
        c[key] = [str(Path(p).expanduser().resolve()) for p in c.get(key, [])]
    for key in ['stateRoot', 'registry', 'workspaceFile', 'operationsRoot']:
        target = Path(c[key]).expanduser()
        if not target.is_absolute():
            raise ValueError('Managed paths must be absolute')
        if key in {'registry', 'workspaceFile'} and any(p.is_symlink() for p in [target, *target.parents]):
            raise ValueError('Managed configuration must not traverse symlinks')
        c[key] = str(target.resolve())
    if not re.fullmatch(r'[a-zA-Z0-9_-]+', c['workspace']):
        raise ValueError('Invalid workspace name')
    if c.get('embedding', {}).get('provider') != 'ollama':
        raise ValueError('This qualified adapter supports existing local Ollama only')
    if c['qdrant']['host'] not in {'localhost', '127.0.0.1', '::1'}:
        raise ValueError('Qdrant gRPC must also be local')
    if not re.fullmatch(r'[a-zA-Z0-9_-]+', c['qdrant']['collection']):
        raise ValueError('Invalid managed collection name')
    for address in [c['embedding']['endpoint'], c['qdrant']['rest']]:
        u = urllib.parse.urlparse(address)
        if u.hostname not in {'localhost', '127.0.0.1', '::1'} or u.scheme != 'http' or u.username:
            raise ValueError('Only local HTTP endpoints are qualified')
    extensions = c.get('customExtensions', [])
    if not isinstance(extensions, list) or len(extensions) > 32 or any(
            not isinstance(ext, str) or not re.fullmatch(r'\.[a-zA-Z0-9]{1,16}', ext) for ext in extensions):
        raise ValueError('customExtensions must be a bounded list of file suffixes such as .mjs')
    c['customExtensions'] = sorted(set(ext.lower() for ext in extensions))
    if 'vueProcessing' in c and not isinstance(c['vueProcessing'], bool):
        raise ValueError('vueProcessing must be an explicit boolean')
    return c


@contextlib.contextmanager
def locked(c):
    p = Path(c['stateRoot'])
    p.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (p / 'orchestrator.lock').open('a') as f:
        os.chmod(f.name, 0o600)
        fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield


def discover(c, previous=None):
    previous = previous or {'projects': []}
    old = previous['projects']
    roots = [Path(p).resolve() for p in c['roots']]
    excluded = [Path(p).resolve() for p in c['excludePaths']] + [Path(c['operationsRoot']), Path(c['stateRoot'])]
    seen, candidates, aliases, errors = set(), [], [], []
    deadline = time.monotonic() + c.get('scanSeconds', 120)
    def allowed(p):
        return any(beneath(p, root) for root in roots) and not any(beneath(p, x) for x in excluded)
    def visit(root):
        for directory, dirs, files in os.walk(root, followlinks=False):
            if time.monotonic() > deadline:
                raise TimeoutError('Discovery deadline exceeded; registry remains unchanged')
            p = Path(directory)
            if not allowed(p):
                dirs[:] = []
                continue
            dirs[:] = sorted(d for d in dirs if d not in PRUNE and d not in c.get('pruneNames', ['.worktrees']))
            for d in list(dirs):
                link = p / d
                if link.is_symlink():
                    dirs.remove(d)
                    target = link.resolve()
                    aliases.append({'path': str(link), 'target': str(target), 'eligible': allowed(target)})
                    if allowed(target) and target not in seen:
                        visit(target)
            if p in seen:
                dirs[:] = []
                continue
            seen.add(p)
            marker = p / '.git'
            if not marker.exists():
                continue
            actual = git(p, 'rev-parse', '--show-toplevel', check=False)
            if not actual or Path(actual).resolve() != p:
                errors.append({'path': str(p), 'reason': 'invalid_git_marker'})
                continue
            common = Path(git(p, 'rev-parse', '--path-format=absolute', '--git-common-dir')).resolve()
            gitdir = Path(git(p, 'rev-parse', '--absolute-git-dir')).resolve()
            superproject = git(p, 'rev-parse', '--show-superproject-working-tree')
            kind = 'submodule' if superproject else ('worktree' if common != gitdir else 'repository')
            remote = git(p, 'remote', 'get-url', 'origin', check=False)
            # Raw remote is hashed for stable legacy identity; only sanitized location is stored.
            anchor = digest([remote, git(p, 'rev-list', '--max-parents=0', 'HEAD', check=False)])
            matches = [x for x in old if x['path'] == str(p)]
            if not matches:
                matches = [x for x in old if x.get('anchor') == anchor and not Path(x['path']).exists()]
            rid = matches[0]['id'] if len(matches) == 1 else digest([anchor, str(p)])[:24]
            entry = {'id': rid, 'path': str(p), 'name': re.sub(r'[^a-zA-Z0-9_-]', '-', p.name) + '-' + rid[:8],
                     'kind': kind, 'anchor': anchor, 'status': 'active', 'head': git(p, 'rev-parse', 'HEAD', check=False),
                     'remote': sanitized_remote(remote), 'branch': git(p, 'symbolic-ref', '--quiet', '--short', 'HEAD', check=False) or None}
            if kind == 'worktree' and not c.get('includeWorktrees', False):
                entry.update(status='excluded', reason='linked_worktree')
            selected = c.get('selectedPaths')
            if selected and str(p) not in selected:
                entry.update(status='excluded', reason='qualification_scope')
            candidates.append(entry)
    for root in roots:
        if not root.is_dir():
            raise ValueError('A discovery root is unavailable; refusing mass retirement')
        visit(root)
    # Worktrees outside scanned/pruned paths are still inventoried, never silently admitted.
    known = {x['path'] for x in candidates}
    for entry in list(candidates):
        if entry['kind'] != 'repository':
            continue
        for block in git(entry['path'], 'worktree', 'list', '--porcelain').split('\n\n'):
            line = next((s[9:] for s in block.splitlines() if s.startswith('worktree ')), None)
            if line and line not in known:
                known.add(line)
                candidates.append({'id': digest(['worktree', line])[:24], 'path': line, 'name': Path(line).name,
                                   'kind': 'worktree', 'status': 'excluded', 'reason': 'linked_worktree'})
    active_paths = {x['path'] for x in candidates}
    for entry in old:
        if entry['path'] not in active_paths and entry['id'] not in {x['id'] for x in candidates} and entry['status'] != 'excluded':
            candidates.append({**entry, 'status': 'retired', 'reason': 'source_unavailable'})
    return {'schemaVersion': 1, 'scannedAt': stamp(), 'projects': sorted(candidates, key=lambda x: x['path']),
            'aliases': aliases, 'errors': errors}


def project_ignores(root, all_roots, extra=()):
    ignores = list(HARD_IGNORE) + list(extra)
    for other in all_roots:
        if other != root and beneath(other, root):
            relative = other.relative_to(root)
            if not any(fnmatch.fnmatchcase(part, pattern) for part in relative.parts for pattern in ignores):
                ignores.append('/' + str(relative) + '/')
    for directory, dirs, files in os.walk(root, followlinks=False):
        p = Path(directory)
        dirs[:] = [d for d in dirs if d not in PRUNE and d != '.worktrees' and d not in extra]
        for name in dirs + files:
            f = p / name
            if f.is_symlink():
                ignores.append('/' + f.relative_to(root).as_posix())
        if '.grepaiignore' in files:
            # Upstream negation overrides configured exclusions. Refuse that ambiguity.
            if any(s.strip().startswith('!') for s in (p / '.grepaiignore').read_text().splitlines()):
                raise ValueError(f'Unqualified .grepaiignore negation in {p}')
    return sorted(set(ignores))


def backup(c, file):
    file = Path(file)
    if not file.exists():
        return
    if file.is_symlink():
        raise ValueError('Managed configuration must not be a symlink')
    b = Path(c['stateRoot']) / 'backups' / (digest(str(file))[:16] + '-' + digest(file.read_bytes())[:16])
    if not b.exists():
        atomic(b, file.read_text())
        atomic(str(b) + '.json', {'original': str(file), 'at': stamp()})


def http(address, method='GET', body=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(address, data=data, method=method, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)


def purge_matching(c, predicate):
    base = c['qdrant']['rest'] + '/collections/' + c['qdrant']['collection'] + '/points'
    offset, ids = None, []
    for _ in range(c.get('maxScrollPages', 10000)):
        body = {'limit': 256, 'with_payload': ['file_path'], 'with_vector': False}
        if offset is not None:
            body['offset'] = offset
        try:
            page = http(base + '/scroll', 'POST', body)['result']
        except urllib.error.HTTPError as error:
            if error.code == 404 and offset is None:
                return 0  # A new workspace has no collection yet.
            raise
        ids.extend(p['id'] for p in page['points'] if predicate(p.get('payload', {}).get('file_path', '')))
        offset = page.get('next_page_offset')
        if offset is None:
            break
    else:
        raise RuntimeError('Retirement scan bound exceeded; no unverified purge')
    for start in range(0, len(ids), 256):
        http(base + '/delete?wait=true', 'POST', {'points': ids[start:start + 256]})
    return len(ids)


def purge_retired(c, names):
    if not names:
        return 0
    prefixes = tuple(c['workspace'] + '/' + name + '/' for name in names)
    return purge_matching(c, lambda file: file.startswith(prefixes))


def purge_excluded(c, entries):
    names = {x['name']: Path(x['path']) for x in entries}
    # Repository nesting is static during this writer-stopped scan.
    nested = {name: tuple(other for other in names.values() if other != root and beneath(other, root))
              for name, root in names.items()}
    patterns = list(HARD_IGNORE) + c.get('pruneNames', [])
    ignored_name = re.compile('|'.join(fnmatch.translate(pattern) for pattern in patterns) or r'(?!)')
    def excluded(file):
        parts = file.split('/', 2)
        if len(parts) != 3 or parts[0] != c['workspace'] or parts[1] not in names:
            return False
        rel = Path(parts[2])
        if rel.is_absolute() or '..' in rel.parts:
            return False
        if any(ignored_name.match(part) for part in rel.parts):
            return True
        root = names[parts[1]]
        candidate = root / rel
        if any(beneath(candidate, other) for other in nested[parts[1]]):
            return True
        # Recheck filesystem links for each point; do not cache a safe path.
        while True:
            if candidate.is_symlink():
                return True
            if candidate == root:
                return False
            candidate = candidate.parent
    return purge_matching(c, excluded)


def competing_writers(c, entries):
    config_file = Path(c['workspaceFile'])
    workspaces = yaml.safe_load(config_file.read_text()).get('workspaces', {}) if config_file.exists() else {}
    own = {x['path'] for x in entries}
    for line in run(['pgrep', '-af', 'grepai.*watch'], check=False).stdout.splitlines():
        pid, _, command = line.partition(' ')
        try:
            if Path('/proc', pid, 'exe').resolve().name != 'grepai':
                continue
            args = shlex.split(command)
            if 'watch' not in args:
                continue
            if '--workspace' in args:
                name = args[args.index('--workspace') + 1]
                other = {x['path'] for x in workspaces.get(name, {}).get('projects', [])}
                if own & other or name == c['workspace']:
                    return True
            else:
                root = str(Path('/proc', pid, 'cwd').resolve())
                if any(beneath(Path(root), Path(x)) or beneath(Path(x), Path(root)) for x in own):
                    return True
        except (OSError, ValueError, IndexError):
            raise RuntimeError('Cannot establish existing watcher ownership')
    return False


def workspace_settings(c):
    return {'store': {'backend': 'qdrant', 'qdrant': {
        'endpoint': c['qdrant']['host'], 'port': c['qdrant']['grpcPort'], 'use_tls': False,
        'collection': c['qdrant']['collection']}}, 'embedder': dict(c['embedding'])}


def settings_match(ws, c):
    expected = workspace_settings(c)
    return (ws.get('store', {}).get('backend') == 'qdrant' and
            all(ws.get('store', {}).get('qdrant', {}).get(k) == v for k, v in expected['store']['qdrant'].items()) and
            all(ws.get('embedder', {}).get(k) == v for k, v in expected['embedder'].items()))


def migration_plan(c, ws, previous):
    if settings_match(ws, c):
        return None
    if not previous or not settings_match(ws, previous):
        raise ValueError('Existing workspace provider/store differs; supply the exact --migrate-from config')
    if any(previous[k] != c[k] for k in ['workspace', 'workspaceFile', 'registry', 'stateRoot']):
        raise ValueError('Migration must retain the adopted workspace and registry ownership')
    if any(previous['qdrant'][k] != c['qdrant'][k] for k in ['host', 'grpcPort', 'rest']):
        raise ValueError('Only a new collection on the same adopted Qdrant is supported')
    if previous['qdrant']['collection'] == c['qdrant']['collection']:
        raise ValueError('A model migration must use a different collection; old vectors are preserved')
    return {'fromModel': previous['embedding']['model'], 'toModel': c['embedding']['model'],
            'fromDimensions': previous['embedding']['dimensions'], 'toDimensions': c['embedding']['dimensions'],
            'fromCollection': previous['qdrant']['collection'], 'toCollection': c['qdrant']['collection'],
            'oldCollectionPreserved': True}


def verify_migration_target(c):
    try:
        target = http(c['qdrant']['rest'] + '/collections/' + c['qdrant']['collection'])['result']
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return
        raise
    vectors = target.get('config', {}).get('params', {}).get('vectors', {})
    if target.get('points_count', 0) or vectors.get('size') != c['embedding']['dimensions']:
        raise ValueError('Migration target must be absent or empty with matching dimensions')


def ensure_file_path_index(c):
    if not c['qdrant'].get('filePathIndex', False):
        return 'not_configured'
    address = c['qdrant']['rest'] + '/collections/' + c['qdrant']['collection']
    try:
        info = http(address)['result']
    except urllib.error.HTTPError as error:
        if error.code == 404: return 'pending_collection_creation'
        raise
    current = info.get('payload_schema', {}).get('file_path')
    if current:
        if current.get('data_type') != 'keyword':
            raise ValueError('Existing file_path index has an unadopted type')
        return 'present'
    http(address + '/index?wait=true', 'PUT', {'field_name': 'file_path', 'field_schema': 'keyword'})
    return 'created'


def verify_model_identity(c):
    wanted = c.get('embeddingModelDigest')
    if not wanted:
        return
    name = c['embedding']['model']
    name = name if ':' in name.rsplit('/', 1)[-1] else name + ':latest'
    model = next((x for x in http(c['embedding']['endpoint'] + '/api/tags').get('models', []) if x['name'] == name), None)
    if not model or model.get('digest') != wanted:
        raise ValueError('Selected exact model identity differs from the adopted embedding digest')


def reconcile(c, config_path, apply=False, migrate_from=None):
    old = read(c['registry'], {'schemaVersion': 1, 'projects': []})
    new = discover(c, old)
    entries = [x for x in new['projects'] if x['status'] == 'active']
    priorities = c.get('priorityPaths', [])
    entries.sort(key=lambda x: (priorities.index(x['path']) if x['path'] in priorities else len(priorities), x['path']))
    ws_file = Path(c['workspaceFile'])
    wsc = load_yaml(ws_file.read_text()) if ws_file.exists() else {'version': 1, 'workspaces': {}}
    ws = wsc.setdefault('workspaces', {}).get(c['workspace'])
    expected = {'name': c['workspace'], **workspace_settings(c), 'projects': []}
    migration = migration_plan(c, ws, migrate_from) if ws else None
    if ws:
        known = {x['path'] for x in old['projects']} | {x['path'] for x in entries}
        if any(x['path'] not in known for x in ws.get('projects', [])):
            raise ValueError('Workspace contains unowned entries; adopt before reconciling')
    else:
        ws = expected
    desired = [{'name': x['name'], 'path': x['path']} for x in entries]
    changed = bool(migration) or ws.get('projects') != desired or not ws_file.exists()
    configs = []
    all_roots = [Path(x['path']) for x in new['projects']]
    for entry in entries:
        root = Path(entry['path'])
        f = root / '.grepai/config.yaml'
        if f.is_symlink() or f.parent.is_symlink():
            raise ValueError('Project index configuration must not traverse symlinks')
        current = load_yaml(f.read_text()) if f.exists() else {'version': 1}
        before = json.dumps(current, sort_keys=True, default=str)
        repair_legacy_timestamp(current)
        generated = project_ignores(root, all_roots, c.get('pruneNames', []))
        existing = set(current.get('ignore') or [])
        # Drop only redundant absolute exclusions already covered by hard rules.
        # This cannot weaken ignore scope and avoids restarting on every new worktree.
        rules = list(HARD_IGNORE) + c.get('pruneNames', [])
        existing = {pattern for pattern in existing if not (pattern.startswith('/') and
            any(fnmatch.fnmatchcase(part, rule) for part in Path(pattern.strip('/')).parts for rule in rules))}
        current['ignore'] = sorted(existing | set(generated))
        current.setdefault('watch', {})['discover_worktrees'] = False
        current.setdefault('rpg', {})['enabled'] = False
        current.setdefault('chunking', {}).update({'size': c.get('chunkSize', 384), 'overlap': 40})
        if 'vueProcessing' in c:
            current.setdefault('framework_processing', {}).setdefault('frameworks', {}).setdefault('vue', {})['enabled'] = c['vueProcessing']
        if c.get('customExtensions'):
            current['chunking']['custom_extensions'] = sorted(set(
                current['chunking'].get('custom_extensions', [])) | set(c['customExtensions']))
        if before != json.dumps(current, sort_keys=True, default=str):
            configs.append((f, yaml.safe_dump(current, sort_keys=False)))
    changed = changed or bool(configs)
    removed = {x['name'] for x in old['projects'] if x.get('status') in ['active', 'retired'] and not x.get('vectorsPurged')} - {x['name'] for x in entries}
    summary = {'status': 'planned', 'projects': len(entries), 'excluded': sum(x['status'] == 'excluded' for x in new['projects']),
               'membershipChanged': ws.get('projects') != desired, 'configChanges': len(configs), 'retireNamespaces': sorted(removed), 'migration': migration}
    if not apply:
        return summary
    verify_model_identity(c)
    if migration:
        verify_migration_target(c)
    payload_index = ensure_file_path_index(c)
    service = c.get('watchService')
    running = service and run(['systemctl', '--user', 'is-active', '--quiet', service], check=False).returncode == 0
    if changed and running:
        run(['systemctl', '--user', 'stop', service], timeout=180)
    # Refuse competing independent writers; grepai also acquires project writer locks.
    if changed and competing_writers(c, entries):
        raise RuntimeError('An unmanaged grepai watcher is running; establish ownership before changes')
    for f, contents in configs:
        backup(c, f)
        atomic(f, contents)
        # Keep generated files out of status without touching reference .gitignore.
        info = Path(git(f.parent.parent, 'rev-parse', '--git-path', 'info/exclude'))
        if not info.is_absolute():
            info = f.parent.parent / info
        raw = info.read_text() if info.exists() else ''
        added = [line for line in ['.grepai/', '.codegraph/'] if line not in raw.splitlines()]
        if added:
            backup(c, info)
            atomic(info, raw.rstrip('\n') + '\n' + '\n'.join(added) + '\n')
    if changed:
        backup(c, ws_file)
        if migration:
            ws.update(workspace_settings(c))
        ws['projects'] = desired
        wsc['workspaces'][c['workspace']] = ws
        atomic(ws_file, yaml.safe_dump(wsc, sort_keys=False))
    # Remove stale vector namespaces even if the source directory has disappeared.
    purged = purge_retired(c, removed) if removed else 0
    ignored_purged = purge_excluded(c, entries) if changed else 0
    for entry in new['projects']:
        if entry['name'] in removed:
            entry['vectorsPurged'] = True
    if migration:
        backup(c, Path(c['registry']))
        # grepai keys model metadata by workspace/project, not collection.
        # Preserve it as part of the old vector space's rollback evidence.
        meta_root = ws_file.parent / 'index-meta' / c['workspace']
        if meta_root.is_dir():
            for meta_file in meta_root.glob('*.json'):
                if meta_file.is_symlink():
                    raise ValueError('Index metadata must not traverse symlinks')
                backup(c, meta_file)
    atomic(c['registry'], new)
    if changed and running:
        run(['systemctl', '--user', 'start', service], timeout=30)
    summary.update(status='reconciled', filePathIndex=payload_index, purgedPoints=purged, excludedPointsPurged=ignored_purged, watcherRestarted=bool(changed and running), at=stamp())
    atomic(Path(c['stateRoot']) / 'last-reconcile.json', summary)
    return summary



def watcher_events(invocation):
    """Read bounded warnings/errors from this service invocation only."""
    if not re.fullmatch(r'[a-fA-F0-9]{32}', invocation):
        return {'verified': False, 'reason': 'missing_or_invalid_invocation', 'events': []}
    pattern = r'Failed to |Warning:|invalid config for project|failed to (initialize|start|create|load)|Error:'
    result = run(['journalctl', '--user', '_SYSTEMD_INVOCATION_ID=' + invocation,
                  '--grep=' + pattern, '-n', '200', '--no-pager', '--all', '-o', 'cat'], check=False)
    if result.returncode not in (0, 1) or (result.returncode == 1 and result.stderr.strip()):
        return {'verified': False, 'reason': 'journal_query_failed',
                'error': result.stderr[-1000:], 'events': []}
    events = [line.strip() for line in result.stdout.replace('\r', '\n').splitlines()
              if re.search(pattern, line)]
    return {'verified': True, 'invocation': invocation, 'matchingMessageLimit': 200,
            'eventCountInReturnedMessages': len(events),
            'events': [line[-1500:] for line in events[-20:]]}


def doctor(c):
    registry = read(c['registry'], {'projects': []})
    active = [x for x in registry['projects'] if x['status'] == 'active']
    checks, warnings = {}, []
    checks['vueProcessing'] = c.get('vueProcessing', 'project_default')
    for executable in ['git', 'grepai', 'codegraph', 'ast-grep', 'codex']:
        checks[executable] = shutil.which(executable)
        if not checks[executable]:
            warnings.append('missing_executable:' + executable)
    for name, address in [('ollama', c['embedding']['endpoint'] + '/api/tags'),
                          ('qdrant', c['qdrant']['rest'] + '/collections/' + c['qdrant']['collection'])]:
        try:
            result = http(address)
            if name == 'ollama':
                wanted = c['embedding']['model']
                wanted = wanted if ':' in wanted.rsplit('/', 1)[-1] else wanted + ':latest'
                model = next((x for x in result.get('models', []) if x['name'] == wanted), None)
                checks[name] = {'reachable': True, 'modelPresent': model is not None, 'digest': model.get('digest') if model else None}
                if not model: warnings.append('embedding_model_missing')
                elif c.get('embeddingModelDigest') and model['digest'] != c['embeddingModelDigest']:
                    warnings.append('embedding_model_digest_mismatch')
            else:
                v = result['result']
                vectors = v.get('config', {}).get('params', {}).get('vectors', {})
                checks[name] = {'reachable': True, 'status': v.get('status'), 'points': v.get('points_count'),
                    'dimensions': vectors.get('size'), 'hnswIndexedVectors': v.get('indexed_vectors_count')}
                checks[name]['filePathIndex'] = v.get('payload_schema', {}).get('file_path', {}).get('data_type')
                if c['qdrant'].get('filePathIndex') and checks[name]['filePathIndex'] != 'keyword':
                    warnings.append('file_path_payload_index_missing')
                if vectors.get('size') != c['embedding']['dimensions']: warnings.append('vector_dimension_mismatch')
        except Exception as e:
            checks[name] = {'reachable': False, 'error': type(e).__name__}
            warnings.append('endpoint_unavailable:' + name)
    for key in ['watchService', 'discoveryTimer', 'maintenanceTimer']:
        checks[key] = run(['systemctl', '--user', 'is-active', c[key]], check=False).stdout.strip() if c.get(key) else 'not_configured'
        if checks[key] != 'active': warnings.append('inactive:' + key)
    if c.get('watchService') and checks['watchService'] == 'active':
        invocation = run(['systemctl', '--user', 'show', c['watchService'], '--property=InvocationID', '--value'], check=False).stdout.strip()
        ready = run(['journalctl', '--user', '_SYSTEMD_INVOCATION_ID=' + invocation,
                     '--grep=Watching [0-9]+ projects for changes', '-n', '1', '--no-pager', '-o', 'cat'], check=False).stdout
        match = re.search(r'Watching ([0-9]+) projects for changes', ready)
        checks['watchProjects'] = int(match[1]) if match else None
        checks['watchLoopReady'] = bool(match) and int(match[1]) == len(active)
        if match and int(match[1]) != len(active): warnings.append('watch_project_count_mismatch')
        if not checks['watchLoopReady']: warnings.append('initial_index_in_progress_or_readiness_unverified')
        checks['watcherEvents'] = watcher_events(invocation)
        if not checks['watcherEvents']['verified']: warnings.append('watcher_events_unverified')
        elif checks['watcherEvents']['events']: warnings.append('watcher_warning_or_error_observed')
    expected_meta = {key: c['embedding'][key] for key in ['provider', 'model', 'dimensions']}
    metadata = {'matched': 0, 'missing': [], 'mismatched': []}
    for project in active:
        meta_file = Path(c['workspaceFile']).parent / 'index-meta' / c['workspace'] / (project['name'] + '.json')
        meta = read(meta_file, {})
        if not meta: metadata['missing'].append(project['name'])
        elif meta != expected_meta: metadata['mismatched'].append(project['name'])
        else: metadata['matched'] += 1
    checks['indexMetadata'] = metadata
    if metadata['mismatched']: warnings.append('index_model_metadata_mismatch')
    if metadata['missing']: warnings.append('index_model_metadata_missing')
    samples = []
    try:
        found = json.loads(run(['grepai', 'search', '--workspace', c['workspace'], '--json', '-n', '5',
                               c.get('doctorQuery', 'retry with exponential backoff')], timeout=60).stdout)
        for hit in found:
            parts = hit['file_path'].split('/', 2)
            project = next((x for x in active if len(parts) == 3 and x['name'] == parts[1]), None)
            sample = {k: hit[k] for k in ['file_path', 'start_line', 'end_line']}
            sample['currentSourceMatches'] = False
            if project:
                relative = Path(parts[2])
                source = Path(project['path']) / relative
                if not relative.is_absolute() and '..' not in relative.parts and source.is_file() and not source.is_symlink():
                    lines = source.read_text().splitlines()
                    start, end = hit['start_line'], hit['end_line']
                    content = hit.get('content', '').split('\n\n', 1)[-1]
                    sample['currentSourceMatches'] = 1 <= start <= end <= len(lines) and '\n'.join(lines[start - 1:end]).strip() == content.strip()
                if any(part in HARD_IGNORE for part in relative.parts): warnings.append('excluded_index_hit:' + parts[2])
            if not sample['currentSourceMatches']: warnings.append('stale_search_sample:' + hit['file_path'])
            samples.append(sample)
        if not samples: warnings.append('empty_search')
    except Exception as error:
        checks['searchError'] = {'type': type(error).__name__, 'message': str(error)[-2000:]}
        warnings.append('search_probe_failed:' + type(error).__name__)
    state = Path(c['stateRoot'])
    last = read(state / 'last-reconcile.json', {})
    if last.get('at'):
        age = (dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(last['at'])).total_seconds()
        if age > c.get('maxReconcileAgeSeconds', 1200): warnings.append('repository_scan_stale')
    else: warnings.append('no_reconcile_receipt')
    return {'status': 'attention' if warnings else 'healthy', 'at': stamp(), 'activeProjects': len(active),
        'checks': checks, 'sourceSamples': samples, 'warnings': sorted(set(warnings)), 'lastReconcile': last,
        'lastNotification': read(state / 'last-notify.json', {}),
        'lastRecordMaintenance': read(state / 'last-record-maintenance.json', {}),
        'agentCheckpoints': read(state / 'agent-checkpoints.json', {}),
        'limits': ['Search samples do not prove every file is current.',
                   'HNSW vector count may be zero for small/unoptimized segments; successful search is checked separately.',
                   'CodeGraph freshness is per repository and is not checked or migrated by this command.',
                   'Vue processing choices require source-line qualification; raw-source mode does not qualify compiled-template relationships.']}


def notify(c, event):
    if os.environ.get('GREPPY_MAINTENANCE_RUN') == '1' or event.get('type') != 'agent-turn-complete':
        return {'status': 'ignored'}
    root = Path(event.get('cwd', '/')).resolve()
    if beneath(root, Path(c['operationsRoot'])):
        return {'status': 'ignored', 'reason': 'operations_root'}
    registry = read(c['registry'], {'projects': []})
    match = next((x for x in sorted(registry['projects'], key=lambda x: len(x['path']), reverse=True) if x['status'] == 'active' and beneath(root, Path(x['path']))), None)
    if not match:
        return {'status': 'ignored', 'reason': 'outside_registry'}
    # No prompt, transcript, answer or tool result is persisted by this hook.
    receipt = {'repoId': match['id'], 'at': stamp(), 'trigger': 'agent-turn-complete'}
    atomic(Path(c['stateRoot']) / 'queue' / (match['id'] + '.json'), receipt)
    atomic(Path(c['stateRoot']) / 'last-notify.json', receipt)
    return {'status': 'queued', **receipt}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('command', choices=['setup', 'discover', 'doctor', 'maintain', 'notify'])
    p.add_argument('--config', required=True)
    p.add_argument('--apply', action='store_true')
    p.add_argument('--discovery-only', action='store_true')
    p.add_argument('--migrate-from', help='Exact previous adopted config; preview first, old collection is retained')
    p.add_argument('event', nargs='?')
    args = p.parse_args()
    c = load_config(args.config)
    previous = load_config(args.migrate_from) if args.migrate_from else None
    if previous and args.command != 'setup':
        p.error('--migrate-from is supported only for explicit setup')
    if args.command == 'doctor':
        result = doctor(c)
    elif args.command == 'notify':
        result = notify(c, json.loads(args.event or sys.stdin.read()))
    elif args.command == 'discover':
        result = discover(c, read(c['registry'], {'projects': []}))
        if args.apply:
            with locked(c):
                atomic(c['registry'], result)
    else:
        with locked(c) if args.apply else contextlib.nullcontext():
            result = reconcile(c, args.config, args.apply, previous)
            if args.command == 'maintain' and args.apply and not args.discovery_only and c.get('recordsCommand'):
                result['records'] = json.loads(run(c['recordsCommand'], timeout=c.get('maintenanceSeconds', 300)).stdout)
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    try:
        main()
    except BlockingIOError:
        print(json.dumps({'status': 'pending', 'reason': 'orchestrator_busy'}))
    except Exception as error:
        print(json.dumps({'status': 'error', 'type': type(error).__name__, 'message': str(error)}), file=sys.stderr)
        sys.exit(1)
