#!/usr/bin/env python3
"""Cache a selected public image; never installs packages or changes project policy."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import time
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


def validate_svg(payload):
    text = payload.decode('utf-8-sig')
    if not re.search(r'<svg\b', text, re.I):
        raise ValueError('Response is not an SVG image')
    if re.search(r'<!DOCTYPE|<!ENTITY|<(?:script|foreignObject|iframe|object|embed)\b|\bon[a-z]+\s*=|(?:javascript|vbscript):|@import|url\(\s*[\'\"]?(?!#)', text, re.I):
        raise ValueError('SVG contains active or external content')
    for target in re.findall(r'(?:xlink:)?href\s*=\s*[\'\"]([^\'\"]*)', text, re.I):
        if not target.startswith('#'):
            raise ValueError('SVG references external content')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', required=True)
    parser.add_argument('--url', required=True)
    parser.add_argument('--identity-url', required=True, help='Official product page used to verify identity')
    parser.add_argument('--license-url', default=None)
    parser.add_argument('--label', required=True)
    parser.add_argument('--refresh', action='store_true', help='Explicitly replace a cached retrieval')
    args = parser.parse_args()
    if urlsplit(args.url).scheme != 'https' or urlsplit(args.identity_url).scheme != 'https':
        parser.error('Public assets and identity pages require HTTPS')
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
    with urlopen(Request(args.url, headers={'User-Agent': 'visual-reports-asset-cache/1.0'}), timeout=15) as response:
        if urlsplit(response.url).scheme != 'https':
            raise ValueError('Refusing an insecure redirect')
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
