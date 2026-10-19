"""Real local UI/media tests with Chromium. Samsung AVPlay requires hardware."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright, expect
import os
ROOT = Path(__file__).resolve().parents[1]
from serve import RangeHandler
class Quiet(RangeHandler):
    def log_message(self, *_): pass
server = ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'app')))
Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as p:
        executable = os.environ.get('CHROMIUM_PATH')
        if not executable and Path('/usr/bin/chromium').exists(): executable = '/usr/bin/chromium'
        browser = p.chromium.launch(executable_path=executable,args=['--no-sandbox'])
        context = browser.new_context(viewport={'width':1920,'height':1080})
        page = context.new_page(); errors = []; external = []
        page.on('pageerror',lambda e: errors.append(str(e)))
        page.on('request',lambda r: external.append(r.url) if not r.url.startswith(f'http://127.0.0.1:{server.server_port}/') else None)
        base = f'http://127.0.0.1:{server.server_port}/'
        def focus(key): return page.locator(f'[data-focus="{key}"]')
        def nav(name): focus('nav-'+name).click()
        page.goto(base)
        expect(focus('hero-play')).to_be_focused()
        assert page.locator('iframe').count() == 0
        page.evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{keyCode:39,bubbles:true}))"); expect(focus('hero-details')).to_be_focused()
        page.keyboard.press('Enter'); expect(focus('details-back')).to_be_focused()
        focus('details-list').click(); expect(focus('details-list')).to_contain_text('In My List')
        page.keyboard.press('Escape'); expect(focus('hero-details')).to_be_focused()
        focus('trending-aurora').focus()
        for _ in range(6): page.keyboard.press('ArrowRight')
        expect(focus('trending-glacier')).to_be_focused()
        assert page.locator('.card-row').first.evaluate('(el) => el.scrollLeft') > 0
        nav('list'); expect(page.locator('.card')).to_have_count(1)
        page.reload(); nav('list'); expect(page.locator('.card')).to_have_count(1)
        nav('search'); focus('key-A').click(); focus('key-U').click(); focus('key-R').click()
        expect(page.locator('#search-input')).to_have_value('AUR')
        expect(page.locator('.grid .card')).to_have_count(1)
        focus('key-delete').click(); expect(page.locator('#search-input')).to_have_value('AU')
        focus('key-clear').click(); page.locator('#search-input').fill('Quiet Orbit'); expect(page.locator('.grid .card')).to_have_count(1)
        page.locator('.grid .card').click(); focus('season-1').click(); expect(focus('ep-orbit-s2-e1')).to_be_visible()
        focus('ep-orbit-s2-e1').click()
        expect(page.locator('#player-screen')).to_be_visible()
        page.wait_for_function('() => document.getElementById("video").currentTime > 1')
        focus('player-toggle').click(); expect(focus('player-toggle')).to_have_text('Play')
        pos = page.locator('#video').evaluate('(v) => v.currentTime')
        focus('player-forward').click()
        page.wait_for_function('(before) => document.getElementById("video").currentTime > before+5',arg=pos)
        focus('player-stop').click(); expect(focus('ep-orbit-s2-e1')).to_be_focused()
        focus('ep-orbit-s2-e1').click()
        page.wait_for_function('() => document.getElementById("video").currentTime > 8')
        focus('player-toggle').click()
        page.locator('#video').evaluate('(v) => { v.currentTime = 17.8; }')
        focus('player-toggle').click()
        expect(page.locator('#player-title')).to_contain_text('Chapter 2',timeout=10000)
        # Test actual media-key keyCodes dispatched by Samsung remotes.
        page.evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{keyCode:19,bubbles:true}))")
        expect(focus('player-toggle')).to_have_text('Play')
        page.evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{keyCode:415,bubbles:true}))")
        expect(focus('player-toggle')).to_have_text('Pause')
        page.keyboard.press('Escape'); expect(focus('ep-orbit-s2-e1')).to_be_focused()
        # Final episode ends without looping; autoplay can be disabled.
        focus('ep-orbit-s2-e3').click()
        page.wait_for_function('() => document.getElementById("video").currentTime > .2')
        page.locator('#video').evaluate('(v) => { v.currentTime = 17.8; }')
        expect(page.locator('#playback-message')).to_have_text('Preview complete',timeout=10000)
        expect(focus('player-replay')).to_be_focused()
        assert focus('player-next').count() == 0
        page.keyboard.press('Escape')
        nav('history'); assert page.locator('.grid .card').count() == 1
        nav('settings'); focus('setting-language').click()
        expect(page.locator('html')).to_have_attribute('dir','rtl')
        expect(focus('setting-language')).to_be_focused()
        nav('home'); expect(focus('hero-play')).to_be_focused()
        page.screenshot(path=str(ROOT/'docs/screenshot-arabic.png'))
        page.keyboard.press('ArrowLeft'); expect(focus('hero-details')).to_be_focused()
        page.keyboard.press('Enter'); page.keyboard.press('Escape'); expect(focus('hero-details')).to_be_focused()
        nav('search'); focus('key-clear').click(); focus('key-م').click(); expect(page.locator('#search-input')).to_have_value('م')
        page.evaluate('window.dispatchEvent(new Event("offline"))')
        # Browser connectivity is authoritative; context offline emulates actual network state.
        context.set_offline(True); expect(page.locator('#network')).to_be_visible()
        nav('home'); expect(focus('hero-play')).to_be_visible()
        context.set_offline(False); expect(page.locator('#network')).to_be_hidden()
        nav('settings'); focus('setting-language').click()
        nav('home'); page.keyboard.press('Escape'); expect(page.locator('#dialog')).to_be_visible()
        expect(focus('exit-cancel')).to_be_focused()
        page.keyboard.press('ArrowRight'); expect(focus('exit-confirm')).to_be_focused()
        page.keyboard.press('Escape'); expect(page.locator('#dialog')).to_be_hidden()
        # An invalid local source produces a recovery UI and Back returns safely.
        page.evaluate("FX.providers.mock.resolve = () => Promise.resolve({url:'assets/media/missing.mp4',format:'mp4',demo:true})")
        focus('hero-play').click(); expect(page.locator('#playback-message')).to_contain_text('Playback unavailable',timeout=10000)
        expect(focus('player-retry')).to_be_visible(); page.keyboard.press('Escape')
        expect(focus('hero-play')).to_be_focused()
        page.reload(); page.set_viewport_size({'width':3840,'height':2160})
        nav('movies'); assert page.locator('.grid .card').count() >= 8
        box = page.locator('#content').bounding_box(); assert box['x'] > 0 and box['x']+box['width'] <= 3841
        nav('home'); page.screenshot(path=str(ROOT/'docs/screenshot-home.png'))
        assert not external, external
        assert not errors, errors
        browser.close()
        print('PASS: home, focus/OK/Back/RTL, watchlist restart, bilingual keyboard, seasons, real local playback, pause/seek/resume, next episode, history, offline recovery, exit confirmation, media error recovery, 4K layout; no JS errors/external requests')
finally:
    server.shutdown()
