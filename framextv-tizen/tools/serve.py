"""Local-only development server with video byte ranges (not a production service)."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from functools import partial
import re

class RangeHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        path = Path(self.translate_path(self.path))
        value = self.headers.get('Range')
        self.byte_range = None
        if value and path.is_file():
            match = re.fullmatch(r'bytes=(\d*)-(\d*)', value.strip())
            size = path.stat().st_size
            if not match or not any(match.groups()):
                self.send_error(416); return None
            first, last = match.groups()
            start = int(first) if first else max(0,size-int(last))
            end = min(int(last), size-1) if first and last else size-1
            if start >= size or end < start:
                self.send_response(416); self.send_header('Content-Range',f'bytes */{size}'); self.end_headers(); return None
            stream = path.open('rb'); stream.seek(start)
            self.byte_range = (start,end)
            self.send_response(206)
            self.send_header('Content-Type',self.guess_type(str(path)))
            self.send_header('Accept-Ranges','bytes')
            self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
            self.send_header('Content-Length',str(end-start+1))
            self.end_headers(); return stream
        return super().send_head()
    def end_headers(self):
        self.send_header('Accept-Ranges','bytes')
        super().end_headers()
    def copyfile(self, source, output):
        remaining = (self.byte_range[1]-self.byte_range[0]+1) if self.byte_range else None
        try:
            while remaining is None or remaining > 0:
                chunk = source.read(65536 if remaining is None else min(65536,remaining))
                if not chunk: break
                output.write(chunk)
                if remaining is not None: remaining -= len(chunk)
        except (BrokenPipeError,ConnectionResetError): pass

if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]/'app'
    print('Local development server on port 8000; Ctrl+C stops it.')
    ThreadingHTTPServer(('127.0.0.1',8000),partial(RangeHandler,directory=str(root))).serve_forever()
