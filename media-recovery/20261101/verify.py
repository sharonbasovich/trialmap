"""Verify compact recovered archives without extraction, dependencies or network."""
import hashlib,json,zipfile
from pathlib import Path
root=Path(__file__).resolve().parent
for row in json.loads((root/'manifest.json').read_text()):
    p=root/row['file']
    assert p.stat().st_size==row['bytes']
    assert hashlib.sha256(p.read_bytes()).hexdigest()==row['sha256']
    with zipfile.ZipFile(p) as z:
        assert z.testzip() is None
        mapping=json.loads(z.read('recovery-map.json'))
        assert mapping['original_archive_sha256']==row['source_archive_sha256']
        assert len(mapping['entries'])==row['original_entries']
        assert len({v['path'] for v in mapping['entries'].values()})==row['unique_entries']
        for name,entry in mapping['entries'].items():
            data=z.read(entry['path'])
            assert len(data)==entry['size']
            assert hashlib.sha256(data).hexdigest()==entry['sha256']
print('PASS: exact archive hashes, CRCs, member mappings and bytes; not creative/audio acceptance.')
