"""Temporary deterministic PR 197 repair; never updates a Git ref."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
from urllib.request import Request, urlopen

EXPECTED = {
'incubator/skills/engineering-workflows/README.md': ['f24ed48ed169df5d9fe2892997e5414d3cb6634f40ac4e54ce42c54cfd611897', '2e71b39d65d97fcd79fd8f5ddbc314049b642ef78d93177560b856fcff4de9ea'],
'plugins/stark-ai-developer/SOURCE-MANIFEST.json': ['bd85bef086d9dc0cb3191c7475060b5cca616a0ce7c95596ab3e1278b5ea3166', '7d8c890f312bfb88afe69c62f8428ef7cbbb1f83f3aaf5b6bd47ec3db592b942'],
'plugins/stark-ai-developer/skills/architecture-compass/SKILL.md': ['028189587517158bf0ba11d257cd016fb3ebfbe5449db59dba01b7a7b3d7cc44', '15db561fe621d79c5b21514cc0dd2b7b65645afafc61fa11ef37c31620ab0aac'],
'plugins/stark-ai-developer/skills/architecture-compass/references/ac-adr-064-preserve-approved-scope-through-capability-aware-planning.guide.md': ['4303b05864e02d8c19fcbb84e679dc554a75516e9b03f78754b1240ee59e4e9e', '2529d4c113e0ccb4a7219d932e162e82d955ad203d59699ee54633089eeab0aa'],
'plugins/stark-ai-developer/skills/codex-memory-curator/SKILL.md': ['8c444e61f66ed59173a9288a8639aff1e4b8cec9cacc835609fde5e558f7e55f', 'e8d73059ce47601e2c6e60be9779e27d8bf15559e389f00d40197bd446e2018d'],
'plugins/stark-ai-developer/skills/codex-memory-curator/references/review-procedure.md': [None, '0e7f446e3244f70380c5a0626492b31edd0f8f27751e3ca5d218187ac747ca61'],
'plugins/stark-ai-developer/skills/jev-capability-advisor/SKILL.md': ['5f209ae35fe01412c8ca7b4c3efcc306b59a81bde6113774796b5f9542aa2770', 'ffd7ef3f5661c71888059462db87d908cc23b5e4133acadf443c901685b278d3'],
'plugins/stark-ai-developer/skills/jev-capability-advisor/references/enabled-hook-entry.md': [None, '3649afd6750c74288b67a80c7733e5c13c61962d5895b16d9cc30150d660c929'],
'plugins/stark-ai-developer/skills/jev-capability-advisor/references/hook-catalog.md': ['672a1f985c9ecdf6482eef7316ad5c4979a5f546a87e140466aae55d812d4b6c', '2f80aa05cf9c042cc239b60b1a3570d1c2f03319cb385d614911034ec32a4311'],
'plugins/stark-ai-developer/skills/jev-capability-advisor/references/script-inventory.md': [None, 'a71be75a0f4fc06ddca11031551d97b1be3164b197968ae34ed9a965cc767765'],
'skills/claude-operations/claude-memory-curator/SKILL.md': ['27489c94d4b36310996a5882a57d2143937a9c2d5f22600e1952c1747ff549fe', '62a46f6f3a97aaee0e227e498c437fb5f50cc1ba7d77cc42d4e250cf51086497'],
'skills/claude-operations/claude-memory-curator/references/review-procedure.md': [None, '0b77ec83d99fb5bb999102c6a03a531a43b5e7241006f570c9fc003b9c085253'],
'skills/codex-operations/codex-memory-curator/SKILL.md': ['8c444e61f66ed59173a9288a8639aff1e4b8cec9cacc835609fde5e558f7e55f', 'e8d73059ce47601e2c6e60be9779e27d8bf15559e389f00d40197bd446e2018d'],
'skills/codex-operations/codex-memory-curator/references/review-procedure.md': [None, '0e7f446e3244f70380c5a0626492b31edd0f8f27751e3ca5d218187ac747ca61'],
'skills/engineering-workflows/architecture-compass/SKILL.md': ['028189587517158bf0ba11d257cd016fb3ebfbe5449db59dba01b7a7b3d7cc44', '15db561fe621d79c5b21514cc0dd2b7b65645afafc61fa11ef37c31620ab0aac'],
'skills/engineering-workflows/architecture-compass/references/ac-adr-064-preserve-approved-scope-through-capability-aware-planning.guide.md': ['4303b05864e02d8c19fcbb84e679dc554a75516e9b03f78754b1240ee59e4e9e', '2529d4c113e0ccb4a7219d932e162e82d955ad203d59699ee54633089eeab0aa'],
'skills/skill-maintenance/jev-capability-advisor/SKILL.md': ['5f209ae35fe01412c8ca7b4c3efcc306b59a81bde6113774796b5f9542aa2770', 'ffd7ef3f5661c71888059462db87d908cc23b5e4133acadf443c901685b278d3'],
'skills/skill-maintenance/jev-capability-advisor/references/enabled-hook-entry.md': [None, '3649afd6750c74288b67a80c7733e5c13c61962d5895b16d9cc30150d660c929'],
'skills/skill-maintenance/jev-capability-advisor/references/hook-catalog.md': ['672a1f985c9ecdf6482eef7316ad5c4979a5f546a87e140466aae55d812d4b6c', '2f80aa05cf9c042cc239b60b1a3570d1c2f03319cb385d614911034ec32a4311'],
'skills/skill-maintenance/jev-capability-advisor/references/script-inventory.md': [None, 'a71be75a0f4fc06ddca11031551d97b1be3164b197968ae34ed9a965cc767765']
}
CONTROLS = ['.github/workflows/pr197-ci-snapshot.yml', '.github/workflows/pr197-ci-repair.yml', 'scripts/pr197-ci-repair.py']
ROOT = Path.cwd()


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def extract(relative, heading, replacement):
    path = ROOT / relative
    text = path.read_text(encoding='utf-8')
    pattern = re.compile(r'^## ' + re.escape(heading) + r'\n\n(.*?)(?=^## |\Z)', re.M | re.S)
    match = pattern.search(text)
    if not match:
        raise ValueError('Missing source section: ' + relative + '#' + heading)
    moved = (match.group(1).rstrip() + '\n').replace('](references/', '](').replace('](assets/', '](../assets/')
    path.write_text(text[:match.start()] + '## ' + heading + '\n\n' + replacement.strip() + '\n\n' + text[match.end():], encoding='utf-8')
    return moved


def move(relative, heading, reference, replacement, intro):
    moved = extract(relative, heading, replacement)
    target = (ROOT / relative).parent / 'references' / reference
    with target.open('x', encoding='utf-8') as stream:
        stream.write(intro + '\n\n' + moved)


def verify():
    for relative, (before, after) in EXPECTED.items():
        path = ROOT / relative
        if path.is_symlink() or not path.is_file() or digest(path) != after:
            raise ValueError('Candidate content mismatch: ' + relative)
    print('All 20 candidate files match the locally tested SHA-256 fingerprints.')


def apply():
    for relative, (before, after) in EXPECTED.items():
        path = ROOT / relative
        if before is None:
            if path.exists():
                raise ValueError('Unexpected existing destination: ' + relative)
        elif path.is_symlink() or not path.is_file() or digest(path) != before:
            raise ValueError('Source drift: ' + relative)
    common = 'Every route applies the same review quality to the explicitly requested scope before planning or cleanup. Read the [review procedure](references/review-procedure.md) before substantive inspection. A single-file or single-claim request permits only targeted reads and the evidence needed to resolve an in-scope conflict; delivery never expands scope or reduces review quality.'
    move('skills/claude-operations/claude-memory-curator/SKILL.md', 'Workflow', 'review-procedure.md', common,
         '# Claude review procedure\n\nRead before substantive review. Paths and commands below are relative to the selected skill directory.')
    move('skills/codex-operations/codex-memory-curator/SKILL.md', 'Workflow', 'review-procedure.md', common + '\n\nFor a store-wide request, run the redacted risk scanner as described there. For a narrower request, do not run this whole-store scanner because it has no file selector. Configuration discovery remains limited to configuration requests or evidence needed for an in-scope conflict.',
         '# Codex review procedure\n\nRead before substantive review. Paths and commands below are relative to the selected skill directory.')
    architecture = 'skills/engineering-workflows/architecture-compass/'
    moved = extract(architecture + 'SKILL.md', 'References',
        "Before selecting references, read [the catalog](references/adr-catalog.md) and [the reading map](references/ac-adr-064-preserve-approved-scope-through-capability-aware-planning.guide.md#selective-reference-routing). Preserve canonical Long authority, non-normative Guides and the map's internal-policy and testing-promotion boundaries. Select only applicable decisions. Start workflow authority with [AC-ADR-064 Short](references/ac-adr-064-preserve-approved-scope-through-capability-aware-planning.short.md).")
    guide = ROOT / architecture / 'references/ac-adr-064-preserve-approved-scope-through-capability-aware-planning.guide.md'
    guide.write_text(guide.read_text(encoding='utf-8').rstrip() + '\n\n## Selective reference routing\n\n' + moved, encoding='utf-8')
    jev = 'skills/skill-maintenance/jev-capability-advisor/'
    move(jev + 'SKILL.md', 'Enabled-hook entry', 'enabled-hook-entry.md',
         "Hook guidance requests **Recommend**, `general/current`. Before any hook-driven advice, read this installed copy's [enabled-hook procedure](references/enabled-hook-entry.md). It distinguishes repository-adopted from installer-managed reminders and retains the consent, current-catalog, network-approval and fallback checks. Keep one eligible skill instance's instructions and scripts together. Missing prerequisites never authorize installation, consent changes, escalation, or replay; preserve native fallback.",
         '# Enabled-hook procedure\n\nRead before any hook-driven advice. All script paths and references to `SKILL.md` below belong to the same selected installed skill directory; use that directory as the command working directory.')
    move(jev + 'SKILL.md', 'Scripts', 'script-inventory.md',
         'Before using a helper, read its [script inventory and side-effect contract](references/script-inventory.md). Only explicitly requested recommendation, output/cache, or hook-management actions may have the documented effects; inspection stays read-only. Resolve commands from this installed skill directory.',
         '# Script inventory and side effects\n\nRead the applicable entry before running a helper. Script paths are relative to the selected installed skill directory.')
    catalog = ROOT / jev / 'references/hook-catalog.md'
    text = catalog.read_text(encoding='utf-8')
    old = "token = 'capture-' + uuid.uuid4().hex\nevidence['capture'] = {'token': token, 'binding': 'agent_asserted_current_session'}"
    new = "capture_id = 'capture-' + uuid.uuid4().hex\nevidence['capture'] = {'token': capture_id, 'binding': 'agent_asserted_current_session'}"
    if text.count(old) != 1 or text.count('print(token)\n') != 1:
        raise ValueError('Capture example drifted.')
    catalog.write_text(text.replace(old, new).replace('print(token)\n', 'print(capture_id)\n'), encoding='utf-8')
    index = ROOT / 'incubator/skills/engineering-workflows/README.md'
    description = re.search(r'^description: (.+)$', (index.parent / 'hindsight-memory/SKILL.md').read_text(encoding='utf-8'), re.M).group(1)
    lines = index.read_text(encoding='utf-8').splitlines()
    matches = [i for i, line in enumerate(lines) if '[`hindsight-memory`](hindsight-memory/SKILL.md)' in line]
    if len(matches) != 1:
        raise ValueError('Ambiguous Hindsight index row.')
    lines[matches[0]] = '| [`hindsight-memory`](hindsight-memory/SKILL.md) | ' + description + ' |'
    index.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    subprocess.run(['node_modules/.bin/oxfmt', '--config', 'oxfmt.json', '--ignore-path', '.oxfmtignore', '--threads=1', '--write', str(index)], check=True)
    # A disposable index exposes new references to the official generator.
    git_index = Path(subprocess.check_output(['git', 'rev-parse', '--git-path', 'index'], text=True).strip()).resolve()
    temporary_index = Path(os.environ['RUNNER_TEMP']) / 'pr197-generator-index'
    shutil.copyfile(git_index, temporary_index)
    environment = dict(os.environ, GIT_INDEX_FILE=str(temporary_index))
    for relative, (before, after) in EXPECTED.items():
        if before is None and relative.startswith('skills/'):
            blob = subprocess.check_output(['git', 'hash-object', '-w', relative], text=True).strip()
            subprocess.run(['git', 'update-index', '--add', '--cacheinfo', '100644', blob, relative], env=environment, check=True)
    subprocess.run(['node', 'scripts/plugin/sync-agent-plugin.mjs'], env=environment, check=True)
    verify()
    print('Canonical text, catalog index and generated projections repaired. No runtime settings changed.')


def publish():
    verify()
    if os.environ.get('GITHUB_REPOSITORY') != 'stark-ai-de/agent-skills' or os.environ.get('GITHUB_REF') != 'refs/heads/codex/lens-debug-skill':
        raise ValueError('Wrong publication scope.')
    parent = os.environ['GITHUB_SHA']
    if not re.fullmatch('[0-9a-f]{40}', parent):
        raise ValueError('Invalid parent commit.')
    token = os.environ['GH_TOKEN']
    def api(path, payload=None):
        request = Request('https://api.github.com/repos/stark-ai-de/agent-skills/' + path,
            data=None if payload is None else json.dumps(payload).encode(),
            headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28'})
        with urlopen(request, timeout=60) as response:
            return json.load(response)
    base = api('git/commits/' + parent)
    entries = [{'path': relative, 'mode': '100644', 'type': 'blob', 'content': (ROOT / relative).read_text(encoding='utf-8')} for relative in EXPECTED]
    entries.extend({'path': relative, 'mode': '100644', 'type': 'blob', 'sha': None} for relative in CONTROLS)
    tree = api('git/trees', {'base_tree': base['tree']['sha'], 'tree': entries})
    commit = api('git/commits', {'message': 'fix(ci): reconcile skill catalog and clear documentation warnings', 'tree': tree['sha'], 'parents': [parent]})
    receipt = {'parent': parent, 'candidate_commit': commit['sha'], 'candidate_tree': tree['sha'], 'files': {p: values[1] for p, values in EXPECTED.items()}, 'removed_controls': CONTROLS, 'ref_updated': False}
    output = Path(os.environ['RUNNER_TEMP']) / 'pr197-candidate.json'
    output.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    print('Created unreferenced candidate commit ' + commit['sha'] + '; no branch, PR state, or check was changed.')


if __name__ == '__main__':
    if sys.argv[1:] == ['apply']:
        apply()
    elif sys.argv[1:] == ['publish']:
        publish()
    else:
        raise SystemExit('Choose apply or publish.')
