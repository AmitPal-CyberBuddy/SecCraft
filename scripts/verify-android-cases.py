#!/usr/bin/env python3
"""Check the download's integrity and case feedback contract (no device grading)."""
import hashlib
import json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
pub = root / 'frontend/public/android-cases'
blob = (pub / 'cases.json').read_bytes()
assert (pub / 'SHA256SUMS').read_text().strip() == hashlib.sha256(blob).hexdigest() + '  cases.json'
assert blob == (root / 'frontend/src/content/androidCases.json').read_bytes()
items = json.loads(blob)['cases']
assert [item['id'] for item in items] == [f'android-{n:02}-{slug}' for n, slug in [(4, 'components'), (5, 'links'), (6, 'storage'), (7, 'network'), (8, 'webview'), (9, 'runtime'), (10, 'crypto'), (11, 'release'), (12, 'case')]]
for item in items:
    assert len(item['questions']) == len(item['feedback']) == 3
    assert all(len(text) >= 35 for text in (*item['questions'], *item['feedback']))
    assert item['limit'] and item['runtime']
print('Android cases: 9 integrity-checked source scenarios and 27 model-feedback tasks; no device result graded.')
