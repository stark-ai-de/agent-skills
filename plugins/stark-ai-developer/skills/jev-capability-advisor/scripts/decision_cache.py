"""Opt-in private decision cache. No requests, credentials, or task text stored."""
import hashlib
import json
import math
import os
from pathlib import Path
import re
import stat
import tempfile
import time

VERSION = 1
MAX_BYTES = 64_000
MAX_ENTRIES = 256
ENTRY_NAME = re.compile(r'jev-[0-9a-f]{64}\.json\Z')


def encode(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'),
                      allow_nan=False).encode('utf-8')


class DecisionCache:
    def __init__(self, directory, ttl_seconds=3600):
        if (isinstance(ttl_seconds, bool) or not isinstance(ttl_seconds, (int, float)) or
                not math.isfinite(ttl_seconds) or not 0 < ttl_seconds <= 86400):
            raise ValueError('invalid_cache_ttl')
        self.directory = Path(directory)
        self.ttl = ttl_seconds

    def _directory(self, create=False):
        if not all(hasattr(os, name) for name in ('getuid', 'O_NOFOLLOW', 'O_NONBLOCK')):
            raise OSError('cache_platform_unsupported')
        if create:
            self.directory.mkdir(mode=0o700, parents=True, exist_ok=True)
        info = self.directory.lstat()
        # Shared/symlinked caches are not trusted sources of capability IDs.
        if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077:
            raise OSError('cache_directory_not_private')

    def load(self, key):
        try:
            self._directory()
            path = self.directory / ('jev-' + key + '.json')
            fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
            with os.fdopen(fd, 'rb') as handle:
                info = os.fstat(handle.fileno())
                if (not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or
                        info.st_mode & 0o077 or info.st_size > MAX_BYTES):
                    return None, 'invalid'
                data = handle.read(MAX_BYTES + 1)
            if len(data) > MAX_BYTES:
                return None, 'invalid'
            record = json.loads(data)
            if not isinstance(record, dict) or record.get('version') != VERSION or record.get('key') != key:
                return None, 'invalid'
            created = record.get('created_at')
            if isinstance(created, bool) or not isinstance(created, (int, float)) or not math.isfinite(created):
                return None, 'invalid'
            if not 0 <= time.time() - created < self.ttl:
                return None, 'expired'
            decision = record.get('decision')
            if not isinstance(decision, dict) or record.get('digest') != hashlib.sha256(encode(decision)).hexdigest():
                return None, 'invalid'
            return record, 'hit'
        except FileNotFoundError:
            return None, 'miss'
        except (ValueError, TypeError, UnicodeError, RecursionError, OverflowError):
            return None, 'invalid'
        except OSError:
            return None, 'unavailable'

    def store(self, key, decision):
        temporary = None
        try:
            body = encode({'version': VERSION, 'key': key, 'created_at': time.time(),
                           'decision': decision, 'digest': hashlib.sha256(encode(decision)).hexdigest()})
            if len(body) > MAX_BYTES:
                return 'too_large'
            self._directory(create=True)
            fd, temporary = tempfile.mkstemp(prefix='.jev-', dir=self.directory)
            with os.fdopen(fd, 'wb') as handle:
                handle.write(body)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary, self.directory / ('jev-' + key + '.json'))
            temporary = None
            # Only our own entry names participate in bounded oldest-first eviction.
            entries = []
            for path in self.directory.iterdir():
                if ENTRY_NAME.fullmatch(path.name):
                    info = path.lstat()
                    if stat.S_ISREG(info.st_mode) and info.st_uid == os.getuid():
                        entries.append((info.st_mtime_ns, path.name, path))
            for _, _, path in sorted(entries)[:max(0, len(entries) - MAX_ENTRIES)]:
                path.unlink(missing_ok=True)
            return 'stored'
        except (OSError, ValueError, TypeError):
            # Cache availability never changes a valid fresh recommendation.
            return 'unavailable'
        finally:
            if temporary is not None:
                try:
                    os.unlink(temporary)
                except OSError:
                    pass
