#!/usr/bin/env python3
"""Cache a selected public image; never installs packages or changes project policy."""
import argparse
import hashlib
import ipaddress
import json
from pathlib import Path
import re
import time
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
import xml.etree.ElementTree as ET


def validate_svg(payload):
    text = payload.decode('utf-8-sig')
    if re.search(r'<!DOCTYPE|<!ENTITY', text, re.I):
        raise ValueError('SVG declarations and entities are not allowed')
    try:
        root = ET.fromstring(text)
    except ET.ParseError as error:
        raise ValueError('Invalid SVG XML') from error
    if root.tag.rsplit('}', 1)[-1].lower() != 'svg':
        raise ValueError('Response is not an SVG image')
    active = {'script', 'foreignobject', 'iframe', 'object', 'embed', 'animate', 'set', 'animatemotion', 'animatetransform'}
    for element in root.iter():
        name = element.tag.rsplit('}', 1)[-1].lower()
        if name in active:
            raise ValueError('SVG contains active content')
        if name == 'style' and element.text:
            validate_svg_css(element.text)
        for attribute, value in element.attrib.items():
            local_name = attribute.rsplit('}', 1)[-1].lower()
            if local_name.startswith('on'):
                raise ValueError('SVG contains active content')
            if local_name in {'href', 'src'} and not value.startswith('#'):
                raise ValueError('SVG references external content')
            if local_name == 'style' or 'url' in value.lower():
                validate_svg_css(value)


def validate_svg_css(value):
    # Reject CSS escapes rather than implementing tokenization; this blocks escaped
    # function names such as u\\72l(...) while retaining ordinary static styles.
    if "\\" in value:
        raise ValueError('SVG contains active or external CSS')
    for match in re.finditer(r'url\s*\(([^)]*)\)', value, re.I):
        target = match.group(1).strip().strip('\'\"')
        if not target.startswith('#'):
            raise ValueError('SVG contains active or external CSS')
    if re.search(r'(?:javascript|vbscript):|@import', value, re.I):
        raise ValueError('SVG contains active or external CSS')


def validate_public_https_url(value, label):
    try:
        parsed = urlsplit(value)
        host = parsed.hostname
        port = parsed.port
    except (ValueError, AttributeError):
        raise ValueError(f'{label} must be a public HTTPS URL') from None
    if parsed.scheme != 'https' or not host or parsed.username is not None or parsed.password is not None:
        raise ValueError(f'{label} must be a public HTTPS URL without credentials')
    reserved = ('.localhost', '.local', '.test', '.invalid', '.example')
    if port not in (None, 443) or host.lower() == 'localhost' or host.lower().endswith(reserved):
        raise ValueError(f'{label} must be a public HTTPS URL')
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        address = None
    if address is not None and not address.is_global:
        raise ValueError(f'{label} must be a public HTTPS URL')
    if address is None:
        try:
            domain = host.rstrip('.').encode('idna').decode('ascii')
        except UnicodeError:
            raise ValueError(f'{label} must be a public HTTPS URL') from None
        labels = domain.split('.')
        if len(labels) < 2 or any(not re.fullmatch(r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?', label, re.I) for label in labels):
            raise ValueError(f'{label} must be a public HTTPS URL')
    return parsed


class PublicHttpsRedirectHandler(HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, new_url):
        validate_public_https_url(new_url, 'Redirect URL')
        return super().redirect_request(request, response, code, message, headers, new_url)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', required=True)
    parser.add_argument('--url', required=True)
    parser.add_argument('--identity-url', required=True, help='Official product page used to verify identity')
    parser.add_argument('--license-url', default=None)
    parser.add_argument('--label', required=True)
    parser.add_argument('--refresh', action='store_true', help='Explicitly replace a cached retrieval')
    args = parser.parse_args()
    try:
        validate_public_https_url(args.url, 'Asset URL')
        validate_public_https_url(args.identity_url, 'Identity URL')
        if args.license_url is not None:
            validate_public_https_url(args.license_url, 'License URL')
    except ValueError as error:
        parser.error(str(error))
    repo = Path(args.repo).resolve()
    # Read-only check: no automatic policy/configuration edits.
    import subprocess
    result = subprocess.run(['git', '-C', str(repo), 'check-ignore', '--quiet', '.cache/show-html/icons/probe'], check=False)
    if result.returncode != 0:
        parser.error('Cache path is not Git-ignored; add a scoped ignore rule first')
    cache = repo / '.cache' / 'show-html' / 'icons'
    cache.mkdir(parents=True, exist_ok=True)
    key = hashlib.sha256(args.url.encode()).hexdigest()
    metadata_file = cache / (key + '.json')
    payload_file = cache / (key + '.asset')
    if not args.refresh and metadata_file.exists() and payload_file.exists():
        metadata = json.loads(metadata_file.read_text())
        if metadata['sha256'] == hashlib.sha256(payload_file.read_bytes()).hexdigest():
            print(json.dumps({**metadata, 'cache': 'hit', 'path': str(payload_file)}))
            return
        raise ValueError('Cache checksum mismatch; inspect before explicit refresh')
    opener = build_opener(PublicHttpsRedirectHandler())
    with opener.open(Request(args.url, headers={'User-Agent': 'visual-reports-asset-cache/1.0'}), timeout=15) as response:
        validate_public_https_url(response.url, 'Final asset URL')
        payload = response.read(2 * 1024 * 1024 + 1)
        media_type = response.headers.get_content_type()
        final_url = response.url
    if len(payload) > 2 * 1024 * 1024:
        raise ValueError('Icon exceeds 2 MiB')
    if media_type == 'image/svg+xml' or payload.lstrip().startswith((b'<svg', b'<?xml')):
        validate_svg(payload)
        media_type = 'image/svg+xml'
    elif payload.startswith(b'\x89PNG\r\n\x1a\n'):
        media_type = 'image/png'
    elif payload.startswith(b'\x00\x00\x01\x00'):
        media_type = 'image/x-icon'
    elif payload.startswith(b'RIFF') and payload[8:12] == b'WEBP':
        media_type = 'image/webp'
    elif payload.startswith(b'\xff\xd8\xff'):
        media_type = 'image/jpeg'
    else:
        raise ValueError('Unsupported or invalid image response')
    metadata = {'url': args.url, 'finalUrl': final_url, 'identityUrl': args.identity_url, 'label': args.label, 'licenseUrl': args.license_url, 'retrievedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'mediaType': media_type, 'sha256': hashlib.sha256(payload).hexdigest()}
    payload_file.write_bytes(payload)
    metadata_file.write_text(json.dumps(metadata, indent=2) + '\n')
    print(json.dumps({**metadata, 'cache': 'miss', 'path': str(payload_file)}))


if __name__ == '__main__':
    main()
