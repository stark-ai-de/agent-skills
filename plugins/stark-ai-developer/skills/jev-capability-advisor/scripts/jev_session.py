#!/usr/bin/env python3
"""Owner-process Jev session: fresh host inventory, HTTPS and derived lexical-index reuse.

No discovery, decision cache or inventory authority, background daemon, listener, installation
or authorization inference. The host owns inventory eligibility, data-sharing
authority, interpreting recommendations and any forced process deadline.
"""
import argparse
import json
import math
import os
from pathlib import Path
import re
import sys
import threading
import time

sys.dont_write_bytecode = True
import jev_advisor
from https_transport import JsonClient
from index_cache import MemoryIndex
from routing_metadata import guidance

MAX_FRAME_BYTES = 2_000_000
MAX_CATALOG_ITEMS = 4096
FRAME_ID = re.compile(r'[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}\Z')
CAPABILITY_ID = re.compile(r'[A-Za-z0-9][A-Za-z0-9_.:/@+-]{0,255}\Z')
HASH = re.compile(r'[0-9a-fA-F]{64}\Z')
CATALOG_FIELDS = {
    'id', 'name', 'kind', 'description', 'brief', 'enabled', 'explicit_only',
    'source_paths', 'content_sha256', 'skill_identity', 'bundle_sha256',
    'use_when', 'avoid_when', 'keywords', 'parameter_descriptions',
}
MODES = {'NONE': 0, 'SINGLE': 1, 'PAIR': 2, 'TRIPLE': 3, 'CLARIFY': None}
SAFE_ERRORS = {
    'invalid_frame', 'invalid_json', 'frame_too_large', 'invalid_catalog',
    'invalid_query', 'invalid_catalog_item', 'duplicate_candidate_id', 'invalid_description',
    'criteria_state_budget_exceeded', 'request_budget_exceeded', 'choice_budget_exceeded',
    'malformed_answers', 'malformed_choice', 'unknown_choice', 'inconsistent_initial_choices',
    'response_too_large', 'invalid_api_key', 'missing_api_key', 'invalid_routing_metadata',
    'request_timeout', 'network_error', 'invalid_response_json', 'recommendation_budget_exhausted',
    'credential_unavailable', 'credential_invalid', 'advisor_invalid_reply', 'advisor_error',
    'session_closed', 'session_busy',
}
SAFE_REASONS = {'empty_catalog', 'model_none', 'model_clarify', 'planned_selection_complete',
                'incomplete_cardinality_plan', 'request_capacity_reached', 'error'}


class SessionError(Exception):
    def __init__(self, code):
        self.code = code
        super().__init__(code)


def _safe_error(code):
    return code if isinstance(code, str) and (code in SAFE_ERRORS or re.fullmatch(r'http_[1-5][0-9]{2}', code)) else 'advisor_error'


def _frame_id(frame):
    value = frame.get('id') if isinstance(frame, dict) else None
    return value if isinstance(value, str) and FRAME_ID.fullmatch(value) else None


def error_reply(identifier, code):
    return {'id': identifier, 'status': 'error', 'mode': None, 'selected': [],
            'provisional_selected': [], 'request_count': 0, 'transport_call_count': 0,
            'elapsed_ms': 0.0, 'stopped_reason': 'error', 'error': _safe_error(code),
            'candidate_count': None, 'eligible_count': None, 'represented_count': None,
            'catalog_truncated': None, 'none_scope': None}


def validate_frame(frame):
    if not isinstance(frame, dict) or set(frame) != {'id', 'query', 'catalog'} or _frame_id(frame) is None:
        raise SessionError('invalid_frame')
    query, catalog = frame['query'], frame['catalog']
    if not isinstance(query, str) or not query.strip() or len(query) > jev_advisor.MAX_QUERY_CHARS:
        raise SessionError('invalid_query')
    if not isinstance(catalog, list) or len(catalog) > MAX_CATALOG_ITEMS:
        raise SessionError('invalid_catalog')
    seen = set()
    for item in catalog:
        if not isinstance(item, dict) or set(item) - CATALOG_FIELDS:
            raise SessionError('invalid_catalog')
        identifier = item.get('id')
        if not isinstance(identifier, str) or not CAPABILITY_ID.fullmatch(identifier) or identifier in seen:
            raise SessionError('invalid_catalog')
        seen.add(identifier)
        if item.get('kind') not in ('skill', 'tool'):
            raise SessionError('invalid_catalog')
        name = item.get('name')
        if not isinstance(name, str) or not name.strip() or len(name) > 256:
            raise SessionError('invalid_catalog')
        if not any(key in item for key in ('description', 'brief')):
            raise SessionError('invalid_catalog')
        for key in ('description', 'brief'):
            if key in item and (not isinstance(item[key], str) or len(item[key]) > 32_768):
                raise SessionError('invalid_catalog')
        for key in ('enabled', 'explicit_only'):
            if key in item and not isinstance(item[key], bool):
                raise SessionError('invalid_catalog')
        for key in ('content_sha256', 'bundle_sha256'):
            if key in item and (not isinstance(item[key], str) or not HASH.fullmatch(item[key])):
                raise SessionError('invalid_catalog')
        if 'skill_identity' in item and (not isinstance(item['skill_identity'], str) or not item['skill_identity'].strip()
                                         or len(item['skill_identity']) > 256):
            raise SessionError('invalid_catalog')
        if 'source_paths' in item:
            paths = item['source_paths']
            if (not isinstance(paths, list) or len(paths) > 64
                    or any(not isinstance(path, str) or len(path) > 4096 for path in paths)):
                raise SessionError('invalid_catalog')
        try:
            guidance(item)
        except (ValueError, TypeError):
            raise SessionError('invalid_catalog') from None


def _load_key(key_file):
    try:
        if key_file is None:
            value = os.environ.get('TYPESAFE_API_KEY')
        else:
            with Path(key_file).open('rb') as stream:
                raw = stream.read(8193)
            if len(raw) > 8192:
                raise SessionError('credential_invalid')
            value = raw.decode('ascii')
    except (OSError, UnicodeError):
        raise SessionError('credential_unavailable') from None
    if value is None:
        raise SessionError('credential_unavailable')
    value = value.strip()
    if not value or len(value) > 8192 or '\n' in value or '\r' in value or not value.isascii():
        raise SessionError('credential_invalid')
    return value


def _remaining(deadline):
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        raise SessionError('recommendation_budget_exhausted')
    return remaining


def _summary(result, frame, elapsed, calls):
    if not isinstance(result, dict) or result.get('status') not in ('selected', 'none', 'clarify', 'error'):
        raise SessionError('advisor_invalid_reply')
    status, mode = result['status'], result.get('mode')
    if mode is not None and mode not in MODES:
        raise SessionError('advisor_invalid_reply')
    known = {item['id'] for item in frame['catalog'] if item.get('enabled') is not False}
    selected, provisional = result.get('selected', []), result.get('provisional_selected', [])
    for identifiers in (selected, provisional):
        if (not isinstance(identifiers, list) or len(identifiers) > 3 or
                any(not isinstance(identifier, str) or identifier not in known for identifier in identifiers)
                or len(set(identifiers)) != len(identifiers)):
            raise SessionError('advisor_invalid_reply')
    if ((status == 'selected' and (mode not in ('SINGLE', 'PAIR', 'TRIPLE') or len(selected) != MODES[mode]))
            or (status != 'selected' and selected) or (status == 'selected' and provisional)
            or (status == 'none' and mode != 'NONE') or (status != 'error' and result.get('error'))):
        raise SessionError('advisor_invalid_reply')
    count = result.get('request_count', 0)
    if isinstance(count, bool) or not isinstance(count, int) or not 0 <= count <= jev_advisor.MAX_REQUESTS:
        raise SessionError('advisor_invalid_reply')
    reason = result.get('stopped_reason')
    coverage = {field: result.get(field) for field in (
        'candidate_count', 'eligible_count', 'represented_count', 'catalog_truncated', 'none_scope')}
    counts = [coverage[field] for field in ('candidate_count', 'eligible_count', 'represented_count')]
    if (any(isinstance(value, bool) or not isinstance(value, int) or not 0 <= value <= MAX_CATALOG_ITEMS
            for value in counts)
            or coverage['eligible_count'] != len(known)
            or not len(selected) + len(provisional) <= coverage['candidate_count'] <= jev_advisor.MAX_CANDIDATES
            or not coverage['candidate_count'] <= coverage['represented_count'] <= coverage['eligible_count']
            or not isinstance(coverage['catalog_truncated'], bool)
            or coverage['catalog_truncated'] != (coverage['represented_count'] < coverage['eligible_count'])
            or coverage['none_scope'] != 'retrieved_candidates'):
        # Early failures may have no prepared candidate set; unknown coverage
        # stays explicit instead of being reported as a complete search.
        if status != 'error' or any(value is not None for value in coverage.values()):
            raise SessionError('advisor_invalid_reply')
    return {'id': frame['id'], 'status': status, 'mode': mode, 'selected': list(selected),
            'provisional_selected': list(provisional), 'request_count': count,
            'transport_call_count': calls, 'elapsed_ms': round(elapsed, 3),
            'stopped_reason': reason if reason in SAFE_REASONS else None,
            'error': _safe_error(result.get('error')) if status == 'error' else None, **coverage}


class AdvisorSession:
    """One owner-process session; the host supplies an eligible inventory each time."""
    def __init__(self, *, key_file=None, total_budget_seconds=8, client_factory=JsonClient,
                 key_loader=None, advisor=None, reuse_index=True):
        if (isinstance(total_budget_seconds, bool) or not isinstance(total_budget_seconds, (int, float))
                or not math.isfinite(total_budget_seconds) or not 0 < total_budget_seconds <= 300):
            raise ValueError('invalid_total_budget')
        if not isinstance(reuse_index, bool):
            raise ValueError('invalid_index_reuse')
        self._key_file = key_file
        self._key_loader = key_loader
        self._client_factory = client_factory
        self._advisor = advisor
        self._memory_index = MemoryIndex() if reuse_index and advisor is None else None
        self.total_budget_seconds = float(total_budget_seconds)
        self._client = None
        self._closed = False
        self._lock = threading.Lock()

    def __enter__(self):
        if self._closed:
            raise ValueError('session_closed')
        return self

    def __exit__(self, exc_type, exc, traceback):
        self.close()

    def _drop_client(self):
        if self._memory_index is not None:
            self._memory_index.clear()
        client, self._client = self._client, None
        if client is not None:
            try:
                client.close()
            except Exception:
                pass  # Never expose transport or credential details during cleanup.

    def reset_transport(self):
        """Drop transport after an invalid frame; the next frame may start fresh."""
        with self._lock:
            self._drop_client()

    def close(self):
        with self._lock:
            self._drop_client()
            self._closed = True

    def recommend(self, frame):
        started = time.monotonic()
        deadline = started + self.total_budget_seconds
        identifier = _frame_id(frame)
        try:
            lock_timeout = _remaining(deadline)
        except SessionError:
            return error_reply(identifier, 'recommendation_budget_exhausted')
        if not self._lock.acquire(timeout=lock_timeout):
            return error_reply(identifier, 'session_busy')
        calls = 0
        transport_problem = None
        try:
            if self._closed:
                raise SessionError('session_closed')
            validate_frame(frame)
            _remaining(deadline)
            def transport(payload):
                nonlocal calls, transport_problem
                try:
                    _remaining(deadline)
                    if calls >= jev_advisor.MAX_REQUESTS:
                        raise SessionError('advisor_invalid_reply')
                    if self._client is None:
                        key = self._key_loader() if self._key_loader is not None else _load_key(self._key_file)
                        _remaining(deadline)
                        self._client = self._client_factory(key, timeout_seconds=self.total_budget_seconds)
                    timeout = _remaining(deadline)
                    calls += 1
                    return self._client(payload, timeout_seconds=timeout)
                except SessionError as error:
                    transport_problem = error.code
                    raise
            transport.transport_kind = 'https'
            if self._advisor is None:
                result = jev_advisor.advise(frame['query'], frame['catalog'], transport,
                                            memory_index=self._memory_index)
            else:
                # Preserve the established three-argument injection contract.
                result = self._advisor(frame['query'], frame['catalog'], transport)
            _remaining(deadline)
            reply = _summary(result, frame, (time.monotonic() - started) * 1000, calls)
            if reply['status'] == 'error':
                if transport_problem is not None:
                    reply['error'] = _safe_error(transport_problem)
                self._drop_client()
            return reply
        except Exception as error:
            self._drop_client()
            code = error.code if isinstance(error, SessionError) else 'advisor_error'
            reply = error_reply(identifier, code)
            reply.update(elapsed_ms=round((time.monotonic() - started) * 1000, 3), transport_call_count=calls)
            return reply
        except BaseException:
            self._drop_client()
            self._closed = True
            raise
        finally:
            self._lock.release()


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise SessionError('invalid_json')
        result[key] = value
    return result


def decode_frame(raw):
    if not isinstance(raw, bytes) or len(raw) > MAX_FRAME_BYTES:
        raise SessionError('frame_too_large')
    def invalid_constant(_value):
        raise SessionError('invalid_json')
    try:
        return json.loads(raw.decode('utf-8'), object_pairs_hook=_unique_object, parse_constant=invalid_constant)
    except (ValueError, UnicodeError, RecursionError):
        raise SessionError('invalid_json') from None


def serve(input_stream, output_stream, session):
    """Binary NDJSON streams; oversized frames stop before decoding or draining."""
    try:
        while True:
            raw = input_stream.readline(MAX_FRAME_BYTES + 1)
            if not raw:
                return 0
            stop = len(raw) > MAX_FRAME_BYTES
            if stop:
                session.reset_transport()
                reply = error_reply(None, 'frame_too_large')
            else:
                try:
                    frame = decode_frame(raw)
                    reply = session.recommend(frame)
                except SessionError as error:
                    session.reset_transport()
                    reply = error_reply(None, error.code)
            output_stream.write((json.dumps(reply, ensure_ascii=False, allow_nan=False) + '\n').encode('utf-8'))
            output_stream.flush()
            if stop:
                return 2
    finally:
        session.close()


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--key-file', type=Path, help='Optional local key file; otherwise TYPESAFE_API_KEY. Read lazily.')
    parser.add_argument('--total-budget-seconds', type=float, default=8,
                        help='One budget for validation/preparation and all recommendation calls; default 8 seconds.')
    parser.add_argument('--no-index-reuse', action='store_true',
                        help='Disable the owner-session lexical memo; HTTPS reuse and fresh model calls remain enabled.')
    args = parser.parse_args(argv)
    try:
        session = AdvisorSession(key_file=args.key_file, total_budget_seconds=args.total_budget_seconds,
                                 reuse_index=not args.no_index_reuse)
    except ValueError:
        print('Invalid session configuration.', file=sys.stderr)
        return 2
    try:
        return serve(sys.stdin.buffer, sys.stdout.buffer, session)
    except KeyboardInterrupt:
        return 130
    except (OSError, ValueError):
        # Broken pipes and stream failures must not print paths or exception details.
        return 1


if __name__ == '__main__':
    sys.exit(main())
