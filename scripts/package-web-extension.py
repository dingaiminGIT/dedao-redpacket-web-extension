#!/usr/bin/env python3
"""Package only reviewed extension assets; never include local account data."""
import hashlib
import json
import runpy
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
source = root
runpy.run_path(str(root / "scripts/build-web-extension.py"))["build"](root)
manifest = json.loads((source / 'manifest.json').read_text())
files = ['manifest.json', 'core.js', 'bridge-main.js', 'content.js', 'background.js', 'README.md', 'PRIVACY.md']
files += list(manifest.get('icons', {}).values())
referenced = {manifest['background']['service_worker']} | set(manifest.get('icons', {}).values())
for script in manifest['content_scripts']:
    referenced.update(script['js'])
assert referenced <= set(files), 'Manifest references an unpackaged file'
assert manifest['manifest_version'] == 3
assert manifest['permissions'] == ['storage']
destination = root / 'artifacts' / 'web-extension'
destination.mkdir(parents=True, exist_ok=True)
archive = destination / f'dedao-redpacket-web-{manifest["version"]}.zip'
with ZipFile(archive, 'w', ZIP_DEFLATED) as bundle:
    for name in files:
        bundle.write(source / name, name)
    bundle.write(root / 'LICENSE', 'LICENSE')
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(destination / (archive.name + '.sha256')).write_text(f'{digest}  {archive.name}\n')
print(archive)
print(f'SHA-256: {digest}')
