#!/usr/bin/env python3
"""Inspect local Ollama or measure bounded embeddings; benchmark writes require --apply.

No model download, installation, credentials, remote fallback, or source mutation.
An applied benchmark loads the selected model and retains it for fifteen minutes.
"""
import argparse
import datetime as dt
import hashlib
import json
import math
from pathlib import Path
import statistics
import subprocess
import time
import urllib.request

from workspace import load_config


def request(endpoint, route, body=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(endpoint.rstrip('/') + route, data=data,
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=180) as response:
        raw = response.read(16 * 1024 * 1024 + 1)
    if len(raw) > 16 * 1024 * 1024:
        raise ValueError('Response exceeds the bounded local probe')
    return json.loads(raw)


def model_name(name):
    return name if ':' in name.rsplit('/', 1)[-1] else name + ':latest'


def find_model(models, name):
    return next((x for x in models if model_name(x['name']) == model_name(name)), None)


def validate_vectors(response, count, dimensions):
    vectors = response.get('embeddings')
    if not isinstance(vectors, list) or len(vectors) != count or count < 1:
        raise ValueError('Unexpected embedding count')
    for vector in vectors:
        if not isinstance(vector, list) or len(vector) != dimensions:
            raise ValueError('Unexpected embedding dimension')
        if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in vector):
            raise ValueError('Embedding contains a non-finite or non-numeric value')
        if not any(v != 0 for v in vector):
            raise ValueError('Embedding is a zero vector')
    return {'count': count, 'dimensions': dimensions, 'allFinite': True}


def resources(service):
    if not service:
        return {}
    if not service.endswith('.service') or any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.@-' for c in service):
        raise ValueError('Invalid system service name')
    p = subprocess.run(['systemctl', 'show', service, '-p', 'MemoryCurrent', '-p', 'MemoryPeak', '-p', 'MainPID'],
                       capture_output=True, text=True, timeout=10)
    values = dict(line.split('=', 1) for line in p.stdout.splitlines() if '=' in line)
    return {k: int(v) for k, v in values.items() if v.isdigit()}


def inventory(c):
    e = c['embedding']['endpoint']
    tags = request(e, '/api/tags')['models']
    selected = find_model(tags, c['embedding']['model'])
    return {'serverVersion': request(e, '/api/version').get('version'),
            'selectedModel': selected,
            'loadedModel': find_model(request(e, '/api/ps')['models'], c['embedding']['model']),
            'serviceResources': resources(c.get('inferenceService'))}


def benchmark(c, samples, apply=False):
    if not isinstance(samples, list) or not 1 <= len(samples) <= 64:
        raise ValueError('Provide between one and 64 representative texts')
    if any(not isinstance(s, str) or not s.strip() or len(s.encode()) > 32768 for s in samples):
        raise ValueError('Samples must be nonempty UTF-8 texts up to 32 KiB each')
    plan = {'status': 'planned', 'endpoint': c['embedding']['endpoint'],
            'model': c['embedding']['model'], 'dimensions': c['embedding']['dimensions'],
            'batchCount': len(samples), 'batchBytes': sum(len(x.encode()) for x in samples),
            'inputSha256': hashlib.sha256(json.dumps(samples, ensure_ascii=False).encode()).hexdigest(),
            'effects': 'Loads the selected local model; retains it for 15 minutes; five warm calls and one batch.'}
    if not apply:
        return plan
    before = inventory(c)
    if not before['selectedModel']:
        raise ValueError('Selected exact model tag is not installed; no automatic download')
    observations = []
    for phase, inputs in [('cold' if not before['loadedModel'] else 'already-loaded', [samples[0]]),
                          *[('warm', [samples[0]]) for _ in range(5)], ('batch', samples)]:
        started = time.perf_counter()
        response = request(c['embedding']['endpoint'], '/api/embed', {
            'model': c['embedding']['model'], 'input': inputs, 'truncate': False, 'keep_alive': '15m'})
        wall = time.perf_counter() - started
        proof = validate_vectors(response, len(inputs), c['embedding']['dimensions'])
        observations.append({'phase': phase, 'wallSeconds': wall, **proof,
                             'serverTotalSeconds': response.get('total_duration', 0) / 1e9,
                             'loadSeconds': response.get('load_duration', 0) / 1e9,
                             'tokens': response.get('prompt_eval_count'),
                             'serviceResources': resources(c.get('inferenceService'))})
    after = inventory(c)
    if not after['selectedModel'] or before['selectedModel']['digest'] != after['selectedModel']['digest']:
        raise ValueError('Model identity changed during the probe')
    loaded = after['loadedModel'] or {}
    return {**plan, 'status': 'measured', 'at': dt.datetime.now(dt.timezone.utc).isoformat(),
            'before': before, 'after': after, 'observations': observations,
            'warmMedianSeconds': statistics.median(x['wallSeconds'] for x in observations if x['phase'] == 'warm'),
            'gpuMemoryBytes': loaded.get('size_vram'), 'loadedModelBytes': loaded.get('size'),
            'limits': ['Model memory is not total process RSS or measured GPU utilization.',
                       'Service cgroup memory can include model page cache and child processes.',
                       'A warm median from five calls is a local pilot, not a hardware benchmark.',
                       'This probe does not qualify retrieval quality or complete indexing.']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['inventory', 'benchmark'])
    parser.add_argument('--config', required=True)
    parser.add_argument('--samples')
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    c = load_config(args.config)
    if args.command == 'inventory':
        result = inventory(c)
    else:
        if not args.samples:
            parser.error('benchmark requires --samples containing a JSON array of representative texts')
        data = Path(args.samples).read_bytes()
        if len(data) > 3 * 1024 * 1024:
            raise ValueError('Sample file exceeds the local probe bound')
        result = benchmark(c, json.loads(data), args.apply)
    print(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False))


if __name__ == '__main__':
    main()
