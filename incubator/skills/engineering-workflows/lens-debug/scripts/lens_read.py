#!/usr/bin/env python3
"""Bounded read-only Lens client. Uses an authorized user-owned LiteLLM key, not an ingestion key."""
import argparse
from http.client import HTTPException
import json
import os
from pathlib import Path
import re
import stat
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

MAX_BYTES = 2 * 1024 * 1024


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('Redirect refused; use the canonical gateway HTTPS base.')


def read_key(path):
    flags = os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0) | getattr(os, 'O_NONBLOCK', 0)
    with os.fdopen(os.open(path, flags), 'rb') as handle:
        info = os.fstat(handle.fileno())
        if not stat.S_ISREG(info.st_mode):
            raise ValueError('The read key must be a regular private file.')
        if os.name == 'posix' and (info.st_uid != os.getuid() or info.st_mode & 0o077):
            raise ValueError('The read key must be owner-only (chmod 600).')
        value = handle.read(8193)
    if len(value) > 8192:
        raise ValueError('The key file is too large.')
    try:
        key = value.decode('ascii').strip()
    except UnicodeError:
        raise ValueError('The key file must contain one ASCII token.') from None
    if not key or any(ord(c) < 33 or ord(c) > 126 for c in key):
        raise ValueError('The key file must contain one raw token.')
    return key


def parser():
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument('--base-url', default=os.environ.get('LENS_GATEWAY_URL'))
    result.add_argument('--key-file', type=Path, default=os.environ.get('LENS_READ_KEY_FILE'))
    commands = result.add_subparsers(dest='command', required=True)
    listing = commands.add_parser('list', help='Read one page, within an explicit time window.')
    listing.add_argument('--cursor')
    show = commands.add_parser('show', help='Read the exact trace returned by list.')
    show.add_argument('--cursor')
    show.add_argument('--page-size', type=int)
    span = commands.add_parser('span', help='Read full input/output for one selected span.')
    span.add_argument('--span-id', required=True)
    span.add_argument('--error', action='store_true', help='Read the full error instead of span content.')
    for command in [show, span]:
        command.add_argument('--trace-id', required=True)
        command.add_argument('--trace-ref', required=True)
    commands.add_parser('schema', help='Read query schema/rules before writing SQL.')
    query = commands.add_parser('query', help='Execute a bounded SELECT on the server read-only endpoint.')
    query.add_argument('--sql-file', type=Path, required=True)
    for command in [listing, query]:
        command.add_argument('--start-ms', type=int, required=True)
        command.add_argument('--end-ms', type=int, required=True)
    return result


def request_spec(args):
    parsed = urlsplit(args.base_url or '')
    if (parsed.scheme != 'https' or not parsed.hostname or parsed.username is not None
            or parsed.password is not None or parsed.query or parsed.fragment
            or any(c.isspace() or ord(c) < 32 for c in (args.base_url or ''))):
        raise ValueError('Set an HTTPS gateway base without credentials, query, or fragment.')
    base = args.base_url.rstrip('/')
    if args.command in ('list', 'query'):
        if not 0 <= args.start_ms < args.end_ms:
            raise ValueError('Use a non-negative, increasing time window.')
    if args.command == 'list':
        params = {'start_ms': args.start_ms, 'end_ms': args.end_ms}
        if args.cursor:
            params['cursor'] = args.cursor
        return base + '/v1/traces?' + urlencode(params), 'GET', None
    if args.command in ('show', 'span'):
        if not re.fullmatch(r'[0-9a-fA-F]{32}', args.trace_id):
            raise ValueError('Use the 32-hex-digit trace ID returned by list.')
        if not args.trace_ref or len(args.trace_ref) > 4096:
            raise ValueError('Use the exact trace_ref returned by list.')
        route = base + '/v1/traces/' + args.trace_id
        params = {'trace_ref': args.trace_ref}
        if args.command == 'span':
            if not re.fullmatch(r'[0-9a-fA-F]{16}', args.span_id):
                raise ValueError('Use the 16-hex-digit span ID returned by show.')
            route += '/spans/' + args.span_id
            if args.error:
                route += '/error'
        else:
            if args.cursor:
                if len(args.cursor) > 4096:
                    raise ValueError('The span-page cursor is too large.')
                params['cursor'] = args.cursor
            if args.page_size is not None:
                if not 1 <= args.page_size <= 1000:
                    raise ValueError('Use a page size between 1 and 1000.')
                params['page_size'] = args.page_size
        return route + '?' + urlencode(params), 'GET', None
    if args.command == 'schema':
        return base + '/v1/traces/query/help', 'GET', None
    sql = args.sql_file.read_text(encoding='utf-8')
    if len(sql.encode()) > 16 * 1024:
        raise ValueError('Query exceeds 16 KiB.')
    # This is a conservative input guard, NOT a SQL sandbox. The server enforces
    # read-only access and row scope. Query rules/schema come from `schema`.
    body = sql.strip().removesuffix(';')
    limit = re.search(r'\bLIMIT\s+(\d+)\s*$', body, re.I)
    if (not re.match(r'^(SELECT|WITH)\b', body, re.I) or ';' in body
            or '{start_ms}' not in body or '{end_ms}' not in body
            or not re.search(r'\bTimestamp\b', body, re.I)
            or not limit or not 1 <= int(limit.group(1)) <= 1000):
        raise ValueError('Use one SELECT/WITH query, Timestamp bounds with {start_ms}/{end_ms}, and a final LIMIT 1..1000.')
    body = body.replace('{start_ms}', str(args.start_ms)).replace('{end_ms}', str(args.end_ms))
    return base + '/v1/traces/query', 'POST', {'sql': body}


def redact(value, token):
    if isinstance(value, dict):
        hidden = {'authorization', 'api_key', 'access_token', 'refresh_token', 'password', 'secret'}
        return {key: '[REDACTED]' if key.lower() in hidden else redact(item, token) for key, item in value.items()}
    if isinstance(value, list):
        return [redact(item, token) for item in value]
    if isinstance(value, str):
        value = value.replace(token, '[REDACTED]')
        return re.sub(r'(?i)Bearer\s+[A-Za-z0-9._~+/=-]+', 'Bearer [REDACTED]', value)
    return value


def fetch_json(url, method, payload, token, opener=None):
    request = Request(url, data=None if payload is None else json.dumps(payload).encode(), method=method,
                      headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/json', 'Content-Type': 'application/json'})
    open_request = opener or build_opener(NoRedirect()).open
    try:
        with open_request(request, timeout=15) as response:
            data = response.read(MAX_BYTES + 1)
    except HTTPError as error:
        raise ValueError(f'Gateway returned HTTP {error.code}; check scope, endpoint, and server status. Response body withheld.') from None
    except (URLError, TimeoutError, OSError, HTTPException):
        raise ValueError('Gateway connection failed; check DNS, TLS, route, and sandbox policy separately.') from None
    if len(data) > MAX_BYTES:
        raise ValueError('Response exceeds 2 MiB; narrow the query instead of silently truncating evidence.')
    try:
        return redact(json.loads(data), token)
    except (ValueError, UnicodeError):
        raise ValueError('Gateway returned invalid JSON; response body withheld.') from None


def main():
    args = parser().parse_args()
    try:
        if not args.key_file:
            raise ValueError('Set --key-file or LENS_READ_KEY_FILE to a private user-owned LiteLLM key file authorized for these traces; TRACE_READ is not a special key type.')
        url, method, payload = request_spec(args)
        result = fetch_json(url, method, payload, read_key(args.key_file))
        print(json.dumps(result, indent=2))
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 2
    except OSError:
        print('Cannot read the private key or query file; no file contents were printed.', file=sys.stderr)
        return 2
    return 0


if __name__ == '__main__':
    sys.exit(main())
