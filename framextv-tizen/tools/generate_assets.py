"""Generate original CC0 artwork and audiovisual samples. Requires ffmpeg."""
from pathlib import Path
import subprocess
ROOT = Path(__file__).resolve().parents[1] / 'app/assets'
PALETTES = [('38bdf8','071d35'), ('fb923c','351328'), ('a78bfa','16123b'), ('34d399','072f30')]
for i, (light, dark) in enumerate(PALETTES):
    art = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
<defs><linearGradient id="sky" x2="1" y2="1"><stop stop-color="#{dark}"/><stop offset="1" stop-color="#{light}"/></linearGradient><radialGradient id="sun"><stop stop-color="#fff5dd"/><stop offset="1" stop-color="#{light}"/></radialGradient></defs>
<path fill="url(#sky)" d="M0 0h1280v720H0z"/><circle cx="{850-i*60}" cy="{210+i*30}" r="{110+i*12}" fill="url(#sun)"/>
<g fill="#ffffff" opacity=".35"><circle cx="140" cy="90" r="2"/><circle cx="390" cy="160" r="3"/><circle cx="620" cy="70" r="2"/><circle cx="1090" cy="80" r="3"/></g>
<path d="M0 560L230 290 420 520 650 340 890 580 1100 350 1280 550V720H0Z" fill="#{dark}" opacity=".8"/>
<path d="M0 650L310 510 510 620 820 480 1100 620 1280 530V720H0Z" fill="#{dark}"/>
<path d="M0 685Q400 595 1280 690" stroke="#{light}" stroke-width="2" fill="none" opacity=".6"/></svg>'''
    (ROOT / 'art').mkdir(parents=True, exist_ok=True)
    (ROOT / f'art/scene-{i}.svg').write_text(art)
    out = ROOT / f'media/scene-{i}.mp4'
    out.parent.mkdir(parents=True, exist_ok=True)
    if not out.exists():
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y', '-f','lavfi','-i',
            f'testsrc2=size=1280x720:rate=24, hue=h={i*70}', '-f','lavfi','-i',
            f'sine=frequency={220+i*110}:sample_rate=48000','-t','18',
            '-c:v','libx264','-preset','veryfast','-crf','30','-pix_fmt','yuv420p',
            '-c:a','aac','-b:a','64k','-movflags','+faststart',str(out)], check=True)
print('Original artwork and 4 CC0 18-second H.264/AAC previews ready.')
