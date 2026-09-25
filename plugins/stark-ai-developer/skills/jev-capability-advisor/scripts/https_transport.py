"""Session-scoped, fixed-endpoint JSON HTTPS transport; no automatic POST retry.

Use ``with JsonClient(key) as client: result = client(payload)``. Each instance
owns one credential, one verified TLS context and at most one direct connection.
Configured proxies use a fresh standard urllib opener instead of direct pooling.
Only safe transport metadata appears in ``last_receipt``; no logging is done.
"""
import http.client
import io
import json
import math
import ssl
import threading
import time
import urllib.error
import urllib.request

ENDPOINT = 'https://api.typesafe.ai/v1/systemone'
HOST = 'api.typesafe.ai'
PORT = 443
API_PATH = '/v1/systemone'
MAX_RESPONSE_BYTES = 2_000_000
MAX_REQUEST_BYTES = 90_000


def _remaining(deadline):
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        raise TimeoutError('request_timeout')
    return remaining


def _check_context(context):
    if not context.check_hostname or context.verify_mode != ssl.CERT_REQUIRED:
        raise ValueError('unverified_tls_context')


class _DeadlineRaw(io.RawIOBase):
    """Keep socket-file ownership semantics while bounding every underlying read."""
    def __init__(self, raw, sock, deadline):
        super().__init__()
        self._raw, self._sock, self._deadline = raw, sock, deadline

    def readable(self):
        return True

    def readinto(self, buffer):
        self._sock.settimeout(_remaining(self._deadline))
        result = self._raw.readinto(buffer)
        _remaining(self._deadline)
        return result

    def close(self):
        try:
            self._raw.close()
        finally:
            super().close()


class _DeadlineSocket:
    """HTTPResponse uses our bounded reader; its raw file retains the socket ref."""
    def __init__(self, sock, deadline):
        self._sock, self.deadline = sock, deadline

    def __getattr__(self, name):
        return getattr(self._sock, name)

    def makefile(self, mode='rb', buffering=None):
        if mode != 'rb':
            raise ValueError('unsupported_response_file_mode')
        raw = self._sock.makefile('rb', buffering=0)
        return io.BufferedReader(_DeadlineRaw(raw, self._sock, self.deadline))

    def sendall(self, data):
        self._sock.settimeout(_remaining(self.deadline))
        self._sock.sendall(data)
        _remaining(self.deadline)


class _Connection(http.client.HTTPSConnection):
    def __init__(self, context, deadline):
        _check_context(context)
        super().__init__(HOST, PORT, context=context, timeout=_remaining(deadline))
        self.deadline = deadline
        self._connected_once = False

    def connect(self):
        if self._connected_once or self.host != HOST or self.port != PORT or self._tunnel_host:
            raise ValueError('unexpected_reconnect_or_endpoint')
        self._connected_once = True
        # Preserve HTTPConnection TCP_NODELAY, then give TLS only the budget
        # remaining after TCP/DNS rather than the original socket timeout.
        http.client.HTTPConnection.connect(self)
        self.sock.settimeout(_remaining(self.deadline))
        self.sock = self._context.wrap_socket(self.sock, server_hostname=HOST)
        _remaining(self.deadline)
        self.sock = _DeadlineSocket(self.sock, self.deadline)
        # send() must raise NotConnected instead of opening/replaying implicitly.
        self.auto_open = 0

    def use_deadline(self, deadline):
        self.deadline = deadline
        if self.sock is None:
            raise http.client.NotConnected()
        self.sock.deadline = deadline
        self.sock.settimeout(_remaining(deadline))


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def _safe_exception(error):
    """Do not preserve server echoes, proxy values, headers or exception strings."""
    if isinstance(error, urllib.error.HTTPError):
        return urllib.error.HTTPError(ENDPOINT, error.code, 'HTTP status error', None, None)
    if isinstance(error, TimeoutError):
        return TimeoutError('request_timeout')
    if isinstance(error, urllib.error.URLError):
        return urllib.error.URLError('network_error')
    if isinstance(error, (json.JSONDecodeError, UnicodeError)):
        return ValueError('invalid_response_json')
    if isinstance(error, ValueError) and str(error) in {
        'request_budget_exceeded', 'response_too_large', 'unverified_tls_context',
        'unexpected_reconnect_or_endpoint', 'unsupported_response_file_mode', 'invalid_request_payload',
    }:
        return ValueError(str(error))
    return urllib.error.URLError(type(error).__name__)


def _error_code(error):
    if isinstance(error, urllib.error.HTTPError):
        return 'http_' + str(error.code)
    if isinstance(error, TimeoutError):
        return 'request_timeout'
    if isinstance(error, ValueError):
        return str(error)
    return 'network_error'


class JsonClient:
    """Reusable callable transport, serialized per instance; close after a session.

    timeout_seconds covers lock acquisition, setup, I/O and decoding. Socket
    operations and each direct header/body read use the remaining deadline.
    System DNS and certificate-store calls retain the standard library's native
    blocking behavior; there is no claim of forcibly interrupting those calls.
    Request timeouts are never retried because server-side completion is unknown.
    """
    transport_kind = 'https'

    def __init__(self, key, *, timeout_seconds=30, idle_timeout_seconds=60):
        if not isinstance(key, str) or not key.strip() or '\n' in key or '\r' in key:
            raise ValueError('invalid_api_key')
        if (isinstance(timeout_seconds, bool) or not isinstance(timeout_seconds, (int, float))
                or not math.isfinite(timeout_seconds) or not 0 < timeout_seconds <= 300):
            raise ValueError('invalid_timeout')
        if (isinstance(idle_timeout_seconds, bool) or not isinstance(idle_timeout_seconds, (int, float))
                or not math.isfinite(idle_timeout_seconds) or not 0 < idle_timeout_seconds <= 3600):
            raise ValueError('invalid_idle_timeout')
        self._key = key.strip()
        self.timeout_seconds = float(timeout_seconds)
        self.idle_timeout_seconds = float(idle_timeout_seconds)
        self._lock = threading.Lock()
        self._connection = None
        self._context = None
        self._last_used = None
        self._closed = False
        self.last_receipt = None

    def __repr__(self):
        return f'JsonClient(closed={self._closed})'

    def __enter__(self):
        if self._closed:
            raise ValueError('client_closed')
        return self

    def __exit__(self, exc_type, exc, traceback):
        self.close()

    def _drop_connection(self):
        if self._connection is not None:
            try:
                self._connection.close()
            except OSError:
                # A failed socket close must not replace the safe request error.
                pass
            finally:
                self._connection = None
        self._last_used = None

    def close(self):
        with self._lock:
            self._drop_connection()
            self._context = None
            self._key = None
            self._closed = True

    def _direct(self, body, deadline, receipt):
        if (self._connection is not None and (self._connection.sock is None or
                (self._last_used is not None and time.monotonic() - self._last_used >= self.idle_timeout_seconds))):
            self._drop_connection()
        receipt['tls_context_reused'] = self._context is not None
        if self._context is None:
            self._context = ssl.create_default_context()
            self._context.set_alpn_protocols(['http/1.1'])
        _check_context(self._context)
        _remaining(deadline)
        reused = self._connection is not None
        receipt.update(connection_reused=reused, connection_state='reused' if reused else 'cold')
        if self._connection is None:
            # Assign ownership before connect so a failed handshake is closed.
            self._connection = _Connection(self._context, deadline)
            self._connection.connect()
        connection = self._connection
        connection.use_deadline(deadline)
        receipt['request_dispatched'] = True
        connection.request('POST', API_PATH, body=body, headers={
            'Authorization': 'Bearer ' + self._key,
            'Content-Type': 'application/json',
            'Connection': 'keep-alive',
        })
        connection.use_deadline(deadline)
        response = connection.getresponse()
        receipt['http_status'] = response.status
        try:
            if not 200 <= response.status < 300:
                raise urllib.error.HTTPError(ENDPOINT, response.status, 'HTTP status error', None, None)
            data = bytearray()
            while True:
                _remaining(deadline)
                block = response.read1(min(65536, MAX_RESPONSE_BYTES + 1 - len(data)))
                if not block:
                    break
                data.extend(block)
                receipt['response_bytes'] = len(data)
                if len(data) > MAX_RESPONSE_BYTES:
                    raise ValueError('response_too_large')
            if response.length is not None and response.length != 0:
                raise http.client.IncompleteRead(bytes(data))
            _remaining(deadline)
            if response.will_close or connection.sock is None:
                self._drop_connection()
            return bytes(data)
        finally:
            response.close()

    def _proxy(self, body, deadline, receipt, proxies):
        # ProxyHandler honors the configured proxy and standard NO_PROXY rules.
        # Do not put proxy URLs, authorization or returned headers in receipts.
        self._drop_connection()
        receipt.update(connection_state='proxy_fallback', connection_reused=False,
                       tls_context_reused=False)
        context = ssl.create_default_context()
        context.set_alpn_protocols(['http/1.1'])
        _check_context(context)
        opener = urllib.request.build_opener(
            urllib.request.ProxyHandler(proxies), _NoRedirect(),
            urllib.request.HTTPSHandler(context=context))
        request = urllib.request.Request(ENDPOINT, data=body, method='POST', headers={
            'Authorization': 'Bearer ' + self._key, 'Content-Type': 'application/json'})
        receipt['request_dispatched'] = True
        with opener.open(request, timeout=_remaining(deadline)) as response:
            receipt['http_status'] = response.status
            data = bytearray()
            while True:
                timeout = _remaining(deadline)
                sock = getattr(getattr(getattr(response, 'fp', None), 'raw', None), '_sock', None)
                if sock is not None:
                    sock.settimeout(timeout)
                block = response.read1(min(65536, MAX_RESPONSE_BYTES + 1 - len(data)))
                if not block:
                    break
                data.extend(block)
                receipt['response_bytes'] = len(data)
                if len(data) > MAX_RESPONSE_BYTES:
                    raise ValueError('response_too_large')
            if getattr(response, 'length', None) not in (None, 0):
                raise http.client.IncompleteRead(bytes(data))
            _remaining(deadline)
            return bytes(data)

    def __call__(self, payload, *, timeout_seconds=None):
        started = time.monotonic()
        budget = self.timeout_seconds if timeout_seconds is None else timeout_seconds
        if (isinstance(budget, bool) or not isinstance(budget, (int, float))
                or not math.isfinite(budget) or not 0 < budget <= 300):
            raise ValueError('invalid_timeout')
        deadline = started + budget
        if not self._lock.acquire(timeout=_remaining(deadline)):
            raise TimeoutError('request_timeout')
        receipt = {'transport_kind': self.transport_kind, 'connection_state': 'none',
                   'connection_reused': False, 'tls_context_reused': False,
                   'request_dispatched': False, 'request_bytes': 0, 'response_bytes': 0,
                   'http_status': None, 'elapsed_ms': 0.0, 'timeout_seconds': budget, 'error': None}
        try:
            if self._closed:
                raise ValueError('client_closed')
            try:
                body = json.dumps(payload, ensure_ascii=False, separators=(',', ':'),
                                  sort_keys=True, allow_nan=False).encode('utf-8')
            except (TypeError, ValueError, UnicodeError):
                raise ValueError('invalid_request_payload') from None
            receipt['request_bytes'] = len(body)
            if len(body) > MAX_REQUEST_BYTES:
                raise ValueError('request_budget_exceeded')
            proxies = urllib.request.getproxies()
            if proxies:
                raw = self._proxy(body, deadline, receipt, proxies)
            else:
                raw = self._direct(body, deadline, receipt)
            result = json.loads(raw.decode('utf-8'))
            _remaining(deadline)
            self._last_used = time.monotonic() if self._connection is not None else None
            return result
        except Exception as error:
            self._drop_connection()
            safe = ValueError('client_closed') if self._closed else _safe_exception(error)
            if isinstance(error, urllib.error.HTTPError):
                # urllib HTTP errors own a response stream even when redirects
                # or status codes are rejected before entering a context manager.
                try:
                    error.close()
                except Exception:
                    pass  # Cleanup cannot replace the sanitized error or expose its context.
            receipt['error'] = _error_code(safe)
            # Suppress implicit exception chaining, which could otherwise expose
            # proxy credentials or upstream exception messages in tracebacks.
            raise safe from None
        finally:
            receipt['elapsed_ms'] = (time.monotonic() - started) * 1000
            self.last_receipt = receipt
            self._lock.release()
