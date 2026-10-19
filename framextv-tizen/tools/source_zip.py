"""Produce a clean source archive including bundled CC0 sample media."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT.parent/'framextv-tizen-source.zip'
skip = {'.git','.output','.buildResult','__pycache__','.pytest_cache','node_modules'}
with ZipFile(OUT,'w',ZIP_DEFLATED) as archive:
    for path in sorted(ROOT.rglob('*')):
        if not path.is_file() or any(p in skip for p in path.relative_to(ROOT).parts): continue
        if path.suffix.lower() in {'.p12','.pfx','.wgt','.pyc'} or path.name == 'profiles.xml': continue
        archive.write(path, Path(ROOT.name)/path.relative_to(ROOT))
with ZipFile(OUT) as archive:
    assert archive.testzip() is None
    print(f'Clean source ZIP: {OUT} ({OUT.stat().st_size:,} bytes, {len(archive.namelist())} files)')
