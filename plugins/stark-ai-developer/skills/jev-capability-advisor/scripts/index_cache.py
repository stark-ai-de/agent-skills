"""Optional bounded private lexical-index cache. Failure always permits a fresh build.

No catalog authority, queries, credentials, pickle, or dynamic object state is
stored. Only explicit validated lexical snapshots are restored by retrieval.py.
"""
from contextlib import contextmanager
from copy import deepcopy
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import stat
import sys
import unicodedata

try:
    import fcntl
except ImportError:  # Core uncached retrieval also works on non-POSIX hosts.
    fcntl = None

SCHEMA = 1
MAX_BYTES = 16 * 1024 * 1024
MAX_ENTRIES = 16
MAX_TOTAL_BYTES = 64 * 1024 * 1024
ENTRY_NAME = re.compile(r'jev-index-[0-9a-f]{64}\.json\Z')
KEY = re.compile(r'[0-9a-f]{64}\Z')
RUNTIME_FILES = ('jev_advisor.py', 'retrieval.py', 'routing_metadata.py', 'index_cache.py', 'decision_cache.py')


def encode(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'),
                      allow_nan=False).encode('utf-8')


def _object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('duplicate_json_key')
        result[key] = value
    return result


def _constant(_):
    raise ValueError('nonfinite_json_number')


def supported():
    return (fcntl is not None and all(hasattr(os, name) for name in
            ('getuid', 'O_NOFOLLOW', 'O_DIRECTORY', 'O_NONBLOCK')) and
            os.open in os.supports_dir_fd and os.stat in os.supports_dir_fd and
            os.unlink in os.supports_dir_fd and os.rename in os.supports_dir_fd)


def cache_key(catalog, full_catalog, policy):
    root = Path(__file__).resolve().parent
    implementation = {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in RUNTIME_FILES}
    return hashlib.sha256(encode({
        'schema': SCHEMA, 'catalog': full_catalog, 'representatives': catalog,
        'policy': policy, 'implementation': implementation,
        'python': list(sys.version_info[:3]), 'unicode': unicodedata.unidata_version,
    })).hexdigest()


class IndexCache:
    def __init__(self, directory):
        self.directory = Path(directory)

    @contextmanager
    def _directory(self, create=False):
        if not supported():
            raise OSError('index_cache_unsupported')
        if create:
            self.directory.mkdir(mode=0o700, parents=True, exist_ok=True)
        fd = os.open(self.directory, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
        try:
            info = os.fstat(fd)
            if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077:
                raise OSError('index_cache_directory_not_private')
            yield fd
        finally:
            os.close(fd)

    @staticmethod
    def _private(info):
        return stat.S_ISREG(info.st_mode) and info.st_uid == os.getuid() and not info.st_mode & 0o077

    def load(self, key):
        if not isinstance(key, str) or not KEY.fullmatch(key):
            return None, 'invalid'
        try:
            with self._directory() as directory:
                fd = os.open('jev-index-' + key + '.json', os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK,
                             dir_fd=directory)
                with os.fdopen(fd, 'rb') as stream:
                    info = os.fstat(stream.fileno())
                    if not self._private(info) or info.st_size > MAX_BYTES:
                        return None, 'invalid'
                    body = stream.read(MAX_BYTES + 1)
                if len(body) > MAX_BYTES:
                    return None, 'invalid'
                record = json.loads(body, object_pairs_hook=_object, parse_constant=_constant)
            if (not isinstance(record, dict) or set(record) != {'schema', 'key', 'digest', 'snapshot'} or
                    type(record['schema']) is not int or record['schema'] != SCHEMA or record['key'] != key or
                    record['digest'] != hashlib.sha256(encode(record['snapshot'])).hexdigest()):
                return None, 'invalid'
            return record['snapshot'], 'hit'
        except FileNotFoundError:
            return None, 'miss'
        except (ValueError, TypeError, UnicodeError, RecursionError, OverflowError):
            return None, 'invalid'
        except OSError:
            return None, 'unavailable'

    def _prune(self, directory, target, incoming):
        entries = []
        for name in os.listdir(directory):
            if name == target or not ENTRY_NAME.fullmatch(name):
                continue
            try:
                info = os.stat(name, dir_fd=directory, follow_symlinks=False)
            except FileNotFoundError:
                continue
            if stat.S_ISREG(info.st_mode) and info.st_uid == os.getuid():
                entries.append((info.st_mtime_ns, name, info.st_size))
        entries.sort()
        total = sum(entry[2] for entry in entries)
        while entries and (len(entries) + 1 > MAX_ENTRIES or total + incoming > MAX_TOTAL_BYTES):
            _, name, size = entries.pop(0)
            os.unlink(name, dir_fd=directory)
            total -= size

    def store(self, key, snapshot):
        if not isinstance(key, str) or not KEY.fullmatch(key):
            return 'invalid'
        try:
            body = encode({'schema': SCHEMA, 'key': key, 'snapshot': snapshot,
                           'digest': hashlib.sha256(encode(snapshot)).hexdigest()})
            if len(body) > MAX_BYTES or len(body) > MAX_TOTAL_BYTES:
                return 'too_large'
            with self._directory(create=True) as directory:
                lock = os.open('.jev-index.lock', os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW | os.O_NONBLOCK,
                               0o600, dir_fd=directory)
                temporary = None
                try:
                    if not self._private(os.fstat(lock)):
                        return 'unavailable'
                    # Contention only skips an optional write; recommendation
                    # latency never waits for another process's cache rebuild.
                    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    temporary = '.jev-index-tmp-' + secrets.token_hex(12)
                    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
                                 0o600, dir_fd=directory)
                    with os.fdopen(fd, 'wb') as stream:
                        stream.write(body)
                        stream.flush()
                        os.fsync(stream.fileno())
                    target = 'jev-index-' + key + '.json'
                    self._prune(directory, target, len(body))
                    os.replace(temporary, target, src_dir_fd=directory, dst_dir_fd=directory)
                    temporary = None
                    os.fsync(directory)
                finally:
                    if temporary is not None:
                        try:
                            os.unlink(temporary, dir_fd=directory)
                        except OSError:
                            pass
                    os.close(lock)
            return 'stored'
        except (OSError, ValueError, TypeError, UnicodeError, RecursionError, OverflowError):
            return 'unavailable'


def get_or_build(catalog, *, directory=None, full_catalog=None, policy='current'):
    """Return (index, receipt). Cache problems never suppress a valid fresh index."""
    from retrieval import CandidateIndex
    if directory is None:
        return CandidateIndex(catalog, policy=policy), {'status': 'disabled'}
    cache = IndexCache(directory)
    try:
        key = cache_key(catalog, catalog if full_catalog is None else full_catalog, policy)
        snapshot, status = cache.load(key)
    except (OSError, ValueError, TypeError, UnicodeError, RecursionError, OverflowError):
        return CandidateIndex(catalog, policy=policy), {'status': 'unavailable'}
    receipt = {'status': status, 'key': key}
    if snapshot is not None:
        try:
            return CandidateIndex.from_snapshot(catalog, snapshot, policy=policy), receipt
        except (ValueError, TypeError, KeyError, IndexError, UnicodeError, RecursionError, OverflowError):
            receipt['status'] = 'invalid'
    index = CandidateIndex(catalog, policy=policy)
    receipt['write_status'] = cache.store(key, index.snapshot())
    return index, receipt


# This owner-process memo never enables the optional disk cache. Bound both the
# identity input and the retained Python container graph; one entry alone would
# not bound retained memory for large direct-Python catalogs.
MAX_MEMORY_CATALOG_BYTES = 2_000_000
MAX_MEMORY_INDEX_BYTES = 16 * 1024 * 1024
_LEXICAL_FIELDS = ('id', 'name', 'kind', 'description', 'brief',
                   'use_when', 'keywords', 'parameter_descriptions')


def _retained_size(index, ceiling):
    """Count the private retained container graph, conservatively including keys.

    Runtime classes/functions are shared implementation, not memo-owned state.
    CandidateIndex owns ordinary containers and scalar lexical values only.
    """
    pending, seen, size = [index.__dict__], set(), sys.getsizeof(index)
    while pending:
        value = pending.pop()
        identity = id(value)
        if identity in seen:
            continue
        seen.add(identity)
        size += sys.getsizeof(value)
        if size > ceiling:
            return None
        if isinstance(value, dict):
            pending.extend(value.keys())
            pending.extend(value.values())
        elif isinstance(value, (list, tuple, set, frozenset)):
            pending.extend(value)
    return size


class MemoryIndex:
    """One private derived index for one owner session; never catalog authority.

    The caller validates the current full inventory and consolidates aliases for
    each query before calling search. Only detached lexical data is retained.
    Returned records always come from the current caller inventory. Not shared
    across threads/sessions; AdvisorSession's existing lock owns this instance.
    """
    def __init__(self):
        self.clear()

    def clear(self):
        self._key = None
        self._index = None
        self._index_type = None
        self._retained_bytes = 0

    def search(self, query, catalog, *, full_catalog, policy='current', limit=240):
        from retrieval import CandidateIndex
        receipt = {'backend': 'session_memory', 'status': 'miss',
                   'retained_entries': 0, 'retained_bytes': 0}
        if not catalog:
            self.clear()
            receipt['status'] = 'empty'
            return [], receipt
        try:
            if len(encode(full_catalog)) > MAX_MEMORY_CATALOG_BYTES:
                self.clear()
                receipt['status'] = 'bypass'
                receipt['reason'] = 'catalog_too_large'
                return CandidateIndex(catalog, policy=policy).search(query, limit=limit), receipt
            # Full metadata, ordered query-specific representatives, policy and
            # implementation/Python/Unicode identity use the existing complete key.
            key = cache_key(catalog, full_catalog, policy)
        except (OSError, ValueError, TypeError, UnicodeError, RecursionError, OverflowError):
            self.clear()
            receipt['status'] = 'unavailable'
            return CandidateIndex(catalog, policy=policy).search(query, limit=limit), receipt
        if self._key == key and self._index_type is CandidateIndex:
            index = self._index
            receipt['status'] = 'hit'
        else:
            self.clear()
            # Do not retain caller-owned dictionaries or restrictions/provenance.
            # Their entire values still participate in the identity above.
            detached = deepcopy([{field: item[field] for field in _LEXICAL_FIELDS if field in item}
                                 for item in catalog])
            index = CandidateIndex(detached, policy=policy)
            retained_bytes = _retained_size(index, MAX_MEMORY_INDEX_BYTES - sys.getsizeof(key))
            if retained_bytes is None:
                receipt.update(status='bypass', reason='index_too_large')
            else:
                self._key, self._index, self._index_type = key, index, CandidateIndex
                self._retained_bytes = retained_bytes + sys.getsizeof(key)
        # Scores, requested-provider expansion and the query are always fresh.
        # Never return the private indexed records: current flags, alias identity
        # and provenance must flow from the freshly validated input objects.
        current = {item['id']: item for item in catalog}
        selected = [current[item['id']] for item in index.search(query, limit=limit)]
        receipt.update(retained_entries=int(self._index is not None), retained_bytes=self._retained_bytes)
        return selected, receipt
