"""Controlled shell integration checks; does not validate the live site."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
import xml.etree.ElementTree as ET
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[1] / 'app'
ET.parse(root / 'config.xml')
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(root)))
Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 1920, 'height': 1080})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.route('https://framextv.xyz/**', lambda route: route.fulfill(body='<html><body><button>Fixture</button></body></html>', content_type='text/html'))
        page.goto(f'http://127.0.0.1:{server.server_port}/')
        expect(page.locator('#panel')).to_be_hidden(timeout=10000)
        page.evaluate("window.dispatchEvent(new Event('offline'))")
        assert page.locator('#heading').inner_text() == 'No network connection'
        assert page.locator('#retry').evaluate('(el) => el === document.activeElement')
        page.keyboard.press('ArrowRight')
        assert page.locator('#continue').evaluate('(el) => el === document.activeElement')
        page.keyboard.press('Enter')
        assert page.locator('#panel').is_hidden()
        page.locator('#website').evaluate('(el) => el.blur()')
        page.keyboard.press('Escape')
        assert page.locator('#heading').inner_text() == 'Connection controls'
        page.locator('#retry').click()
        expect(page.locator('#panel')).to_be_hidden(timeout=10000)
        pending = []
        page.route('https://framextv.xyz/**', lambda route: pending.append(route))
        page.evaluate("window.dispatchEvent(new Event('offline'))")
        page.locator('#retry').click()
        assert page.locator('#spinner').is_visible()
        expect(page.locator('#heading')).to_have_text('The website is taking too long', timeout=30000)
        assert page.locator('#retry').is_visible()
        assert not errors, errors
        for route in pending:
            route.fulfill(body='<html>Delayed fixture</html>', content_type='text/html')
        page.unroute_all(behavior='wait')
        browser.close()
        print('PASS: XML, load, offline, focus, arrows, OK, Back, retry, timeout; no JS errors')
finally:
    server.shutdown()
