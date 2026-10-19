"""Dependency-free source/build preflight; never substitutes for Tizen SDK build."""
from pathlib import Path
import json
import subprocess
import xml.etree.ElementTree as ET
ROOT = Path(__file__).resolve().parents[1]
APP = ROOT/'app'
ns = {'w':'http://www.w3.org/ns/widgets','t':'http://tizen.org/ns/widgets'}
config = ET.parse(APP/'config.xml').getroot()
assert config.find('w:content',ns).get('src') == 'index.html'
assert config.find('t:profile',ns).get('name') == 'tv-samsung'
assert config.find('t:application',ns).get('id') == 'FrameXTV01.FrameXTV'
assert config.find('w:access',ns) is None, 'Local provider must not have external access grants'
html = (APP/'index.html').read_text()
assert '<iframe' not in html.lower()
assert 'frame-src \'none\'' in html
for path in list((APP/'js').glob('*.js')) + [APP/'app.js']:
    subprocess.run(['node','--check',str(path)],check=True)
for path in (APP/'assets/media').glob('*.mp4'):
    probe = subprocess.run(['ffprobe','-v','error','-show_streams','-of','json',str(path)],check=True,capture_output=True,text=True)
    streams = json.loads(probe.stdout)['streams']
    assert streams[0]['codec_name'] == 'h264' and streams[0]['pix_fmt'] == 'yuv420p'
    assert streams[1]['codec_name'] == 'aac'
assert len(list((APP/'assets/media').glob('*.mp4'))) == 4
for path in (APP/'assets/art').glob('*.svg'): ET.parse(path)
print('PASS: XML/app identity, local-only CSP, no iframe, all JS syntax, SVGs, 4 H.264/AAC media files')
