#!/usr/bin/env python3
"""Check the original text-only Android teaching pack; never claims a runnable APK."""
import hashlib
from pathlib import Path
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1] / 'frontend/public/android-foundations'
expected = {}
for line in (root / 'SHA256SUMS').read_text().splitlines():
    digest, name = line.split(maxsplit=1)
    assert name not in expected and '/' not in name and '\\' not in name
    expected[name] = digest
assert set(expected) == {'AndroidManifest.xml', 'LinkActivity.kt', 'NoteStore.kt', 'README.md'}
for name, digest in expected.items():
    assert hashlib.sha256((root / name).read_bytes()).hexdigest() == digest, name
manifest = ET.parse(root / 'AndroidManifest.xml').getroot()
ns = '{http://schemas.android.com/apk/res/android}'
app = manifest.find('application')
assert app is not None and app.attrib[ns + 'debuggable'] == 'false'
components = [(tag, item.attrib.get(ns+'name'), item.attrib.get(ns+'exported')) for tag in ('activity', 'provider', 'receiver') for item in app.findall(tag)]
assert ('activity', '.LinkActivity', 'true') in components
assert ('provider', '.NoteProvider', 'false') in components
assert 'candidate.ownerId == session.userId' in (root / 'NoteStore.kt').read_text()
assert 'getQueryParameter("id")' in (root / 'LinkActivity.kt').read_text()
print('Android Foundations: 4 text-file hashes and source/manifest assumptions verified; no APK or runtime tested.')
