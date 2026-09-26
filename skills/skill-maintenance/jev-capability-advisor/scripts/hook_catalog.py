#!/usr/bin/env python3
"""Read-only consistency check for a private, current-session hook catalog sidecar.

No discovery, credentials, provider requests, cache or writes. Consistency does
not attest that the host supplied the recorded metadata or that it is current.
"""
import argparse
import json
import math
from pathlib import Path
import re
import sys

sys.dont_write_bytecode = True
import jev_advisor

MAX_JSON_BYTES = 2_000_000
MAX_ITEMS = 4096
TOKEN = re.compile(r'[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}\Z')
HASH = re.compile(r'[a-f0-9]{64}\Z')
BINDING = 'agent_asserted_current_session'
OMISSION_REASONS = {
    'outside_bounded_subset', 'disabled', 'explicit_only',
    'unresolved_availability', 'unresolved_restrictions',
    'deferred_definitions', 'no_current_definitions', 'unknown_coverage',
}
SAFE_ERRORS = {
    'invalid_catalog', 'invalid_catalog_item', 'duplicate_candidate_id',
    'invalid_description', 'invalid_routing_metadata', 'empty_catalog',
    'invalid_provenance', 'catalog_digest_mismatch', 'capture_token_mismatch',
    'catalog_entry_mismatch', 'invalid_source', 'invalid_restriction',
    'invalid_coverage', 'missing_tool_coverage', 'invalid_json',
    'input_too_large', 'input_unavailable', 'invalid_arguments',
}


class CatalogError(ValueError):
    pass


def _fail(code):
    raise CatalogError(code)


def _object(value, fields, code='invalid_provenance'):
    if not isinstance(value, dict) or set(value) != set(fields):
        _fail(code)


def _text(value, limit=1024):
    return isinstance(value, str) and bool(value.strip()) and len(value) <= limit


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            _fail('invalid_json')
        result[key] = value
    return result


def _invalid_constant(_value):
    _fail('invalid_json')


def _finite_float(value):
    number = float(value)
    if not math.isfinite(number):
        _fail('invalid_json')
    return number


def read_json(path):
    """Bound reads, reject duplicate keys/nonfinite numbers; never echo a path."""
    try:
        with path.open('rb') as stream:
            raw = stream.read(MAX_JSON_BYTES + 1)
    except OSError:
        _fail('input_unavailable')
    if len(raw) > MAX_JSON_BYTES:
        _fail('input_too_large')
    try:
        return json.loads(raw.decode('utf-8'), object_pairs_hook=_unique_object,
                          parse_constant=_invalid_constant, parse_float=_finite_float)
    except (ValueError, UnicodeError, RecursionError):
        _fail('invalid_json')


def check_catalog(catalog, provenance, *, expected_capture_token=None):
    """Check recorded assertions only; source truth and live freshness stay external."""
    if not isinstance(catalog, list) or len(catalog) > MAX_ITEMS:
        _fail('invalid_catalog')
    # Reuse the direct advisor's contract and bounded retrieval, without credentials
    # or either optional cache. This fixed query is not the user's semantic task.
    _, metadata = jev_advisor._prepare_candidates('Inspect current hook catalog metadata.', catalog)
    if not catalog:
        _fail('empty_catalog')
    if any(item.get('enabled') is not True or type(item.get('explicit_only')) is not bool
           or not _text(item.get('description'), 32_768) for item in catalog):
        _fail('invalid_catalog_item')
    if any(item['kind'] not in ('skill', 'tool') for item in catalog):
        _fail('invalid_catalog_item')
    _object(provenance, ('version', 'host', 'host_version', 'capture',
                         'catalog_sha256', 'coverage', 'entries'))
    if (type(provenance['version']) is not int or provenance['version'] != 1
            or provenance['host'] not in ('codex', 'claude-code')
            or not _text(provenance['host_version'], 128)):
        _fail('invalid_provenance')
    capture = provenance['capture']
    _object(capture, ('token', 'binding'))
    if (not isinstance(capture['token'], str) or not TOKEN.fullmatch(capture['token'])
            or capture['binding'] != BINDING):
        _fail('invalid_provenance')
    if expected_capture_token is not None:
        if (not isinstance(expected_capture_token, str)
                or not TOKEN.fullmatch(expected_capture_token)):
            _fail('invalid_arguments')
        if capture['token'] != expected_capture_token:
            _fail('capture_token_mismatch')
    catalog_hash = jev_advisor.digest(catalog)
    if (not isinstance(provenance['catalog_sha256'], str)
            or not HASH.fullmatch(provenance['catalog_sha256'])):
        _fail('invalid_provenance')
    if provenance['catalog_sha256'] != catalog_hash:
        _fail('catalog_digest_mismatch')
    entries = provenance['entries']
    if not isinstance(entries, list) or len(entries) != len(catalog):
        _fail('catalog_entry_mismatch')
    by_id = {item['id']: item for item in catalog}
    seen = set()
    for entry in entries:
        _object(entry, ('snapshot', 'source', 'restriction'))
        snapshot = entry['snapshot']
        if not isinstance(snapshot, dict) or not isinstance(snapshot.get('id'), str):
            _fail('catalog_entry_mismatch')
        identifier = snapshot['id']
        if (identifier in seen or identifier not in by_id
                or jev_advisor.encode(snapshot) != jev_advisor.encode(by_id[identifier])):
            _fail('catalog_entry_mismatch')
        seen.add(identifier)
        source = entry['source']
        _object(source, ('surface', 'reference'), 'invalid_source')
        surface = 'model_skill_card' if snapshot['kind'] == 'skill' else 'loaded_mcp_definition'
        if source['surface'] != surface or not _text(source['reference']):
            _fail('invalid_source')
        policy = entry['restriction']
        if not isinstance(policy, dict):
            _fail('invalid_restriction')
        fields = {'basis', 'reference', 'explicit_request'}
        if policy.get('explicit_request') is True:
            fields.add('explicit_request_reference')
        _object(policy, fields, 'invalid_restriction')
        if (policy['basis'] not in ('host_metadata', 'verified_host_default')
                or not _text(policy['reference'])
                or type(policy['explicit_request']) is not bool
                or (snapshot['explicit_only'] and not policy['explicit_request'])
                or (policy['explicit_request'] and not _text(policy['explicit_request_reference']))):
            _fail('invalid_restriction')
        if policy['basis'] == 'verified_host_default':
            # A version string and reference make the assertion auditable, not
            # verified by this checker. Tool eligibility needs current metadata.
            if (snapshot['kind'] != 'skill'
                    or not re.fullmatch(r'[0-9]+\.[0-9]+\.[0-9]+(?:[-+][a-zA-Z0-9.-]+)?',
                                        provenance['host_version'])):
                _fail('invalid_restriction')
    coverage = provenance['coverage']
    _object(coverage, ('completeness', 'omissions'), 'invalid_coverage')
    omissions = coverage['omissions']
    if (coverage['completeness'] not in ('bounded', 'unknown')
            or not isinstance(omissions, list) or len(omissions) > MAX_ITEMS):
        _fail('invalid_coverage')
    for omission in omissions:
        _object(omission, ('kind', 'reason', 'count'), 'invalid_coverage')
        count = omission['count']
        if (omission['kind'] not in ('skill', 'tool')
                or omission['reason'] not in OMISSION_REASONS
                or (count is not None and (type(count) is not int or not 0 <= count <= MAX_ITEMS))):
            _fail('invalid_coverage')
    skills = sum(item['kind'] == 'skill' for item in catalog)
    tools = len(catalog) - skills
    if not tools and not any(item['kind'] == 'tool' for item in omissions):
        _fail('missing_tool_coverage')
    return {
        'status': 'catalog_evidence_consistent', 'host_attestation': 'not_verified',
        'capture_binding': BINDING,
        'capture_token_check': 'matched' if expected_capture_token is not None else 'not_checked',
        'catalog_sha256': catalog_hash, 'provenance_sha256': jev_advisor.digest(provenance),
        'catalog_entries': len(catalog), 'eligible_count': metadata['eligible_count'],
        'skills': skills, 'mcp_tools': tools, 'completeness': coverage['completeness'],
        'omission_records': len(omissions),
    }


class _Parser(argparse.ArgumentParser):
    def error(self, _message):
        _fail('invalid_arguments')


def main(argv=None):
    parser = _Parser(description=__doc__)
    parser.add_argument('--catalog', type=Path, required=True)
    parser.add_argument('--provenance', type=Path, required=True)
    parser.add_argument('--expected-capture-token', help='Optional local token; checks assertion continuity, not host freshness.')
    try:
        args = parser.parse_args(argv)
        result = check_catalog(read_json(args.catalog), read_json(args.provenance),
                               expected_capture_token=args.expected_capture_token)
    except (ValueError, TypeError, KeyError, UnicodeError, RecursionError, OSError) as error:
        code = str(error) if isinstance(error, ValueError) else ''
        result = {'status': 'error', 'error': code if code in SAFE_ERRORS else 'invalid_provenance',
                  'host_attestation': 'not_verified'}
    print(json.dumps(result, sort_keys=True))
    return 1 if result['status'] == 'error' else 0


if __name__ == '__main__':
    sys.exit(main())
