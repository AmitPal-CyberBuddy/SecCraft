#!/usr/bin/env python3
"""Package only the reviewed source project for offline study; never build an APK."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import hashlib

repo = Path(__file__).resolve().parents[1]
source = repo / 'android-labs/notes-boundary'
out = repo / 'frontend/public/android-demos'
out.mkdir(parents=True, exist_ok=True)
archive = out / 'notes-boundary-source.zip'
files = sorted(p for p in source.rglob('*') if p.is_file() and not any(part in ('build', '.gradle') for part in p.relative_to(source).parts))
with ZipFile(archive, 'w', ZIP_DEFLATED) as zipped:
    for file in files:
        info = ZipInfo(f'notes-boundary/{file.relative_to(source).as_posix()}', (2025, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        zipped.writestr(info, file.read_bytes())
(out / 'SHA256SUMS').write_text(f'{hashlib.sha256(archive.read_bytes()).hexdigest()}  notes-boundary-source.zip\n')
print('Packaged', len(files), 'source files (no APK).')
