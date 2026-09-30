#!/usr/bin/env python3
"""Verify source pack/semantics without claiming an APK build or runtime execution."""
from pathlib import Path
from zipfile import ZipFile
import hashlib
import xml.etree.ElementTree as ET

repo = Path(__file__).resolve().parents[1]
source = repo / 'android-labs/notes-boundary'
published = repo / 'frontend/public/android-demos'

def lines(path):
    result = {}
    for line in path.read_text().splitlines():
        digest, name = line.split(maxsplit=1)
        assert name not in result and '..' not in Path(name).parts and not Path(name).is_absolute()
        result[name] = digest
    return result

hashes = lines(source / 'SHA256SUMS')
assert len(hashes) == 9
for name, digest in hashes.items():
    assert hashlib.sha256((source / name).read_bytes()).hexdigest() == digest, name
archive = published / 'notes-boundary-source.zip'
assert lines(published / 'SHA256SUMS') == {'notes-boundary-source.zip': hashlib.sha256(archive.read_bytes()).hexdigest()}
with ZipFile(archive) as z:
    assert set(z.namelist()) == {f'notes-boundary/{name}' for name in [*hashes, 'SHA256SUMS']}
    for name in [*hashes, 'SHA256SUMS']:
        assert z.read(f'notes-boundary/{name}') == (source / name).read_bytes(), name
manifest = ET.parse(source / 'app/src/main/AndroidManifest.xml').getroot()
ns = '{http://schemas.android.com/apk/res/android}'
activity = manifest.find('application/activity')
assert activity is not None and activity.attrib[ns+'exported'] == 'true'
assert any(i.find('action').attrib[ns+'name'] == 'android.intent.action.VIEW' for i in activity.findall('intent-filter') if i.find('action') is not None)
java = (source / 'app/src/main/java/org/seccraft/noteslab/NoteStore.java').read_text()
assert 'if (!vulnerable && !owner.equals(activeUser)) return null;' in java
assert '"1".equals(id)' in java and '"2".equals(id)' in java
assert 'applicationIdSuffix' in (source / 'app/build.gradle').read_text()
print('Android demo: 9 source hashes, published ZIP integrity and declared teaching boundaries passed; build/runtime NOT TESTED.')
