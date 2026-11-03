"""Local-only image loading QA; serves dist without altering production code.

python3 scripts/preview-test-server.py --port 4322 --delay-images-ms 5000
python3 scripts/preview-test-server.py --port 4323 --fail-image abyss --fail-once
"""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock
from time import sleep
from urllib.parse import urlsplit

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--port', type=int, default=4321)
parser.add_argument('--delay-images-ms', type=int, default=0)
parser.add_argument('--fail-image', default='')
parser.add_argument('--fail-once', action='store_true')
parser.add_argument('--fail-scripts', action='store_true')
args = parser.parse_args()
failed = set()
lock = Lock()


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        simulated = args.delay_images_ms or args.fail_image or args.fail_scripts
        self.send_header('Cache-Control', 'no-store' if simulated else 'no-cache')
        super().end_headers()

    def do_GET(self):
        path = urlsplit(self.path).path
        is_image = Path(path).suffix in {'.webp', '.jpg', '.png', '.avif'}
        if is_image and args.delay_images_ms:
            sleep(args.delay_images_ms / 1000)
        if is_image and args.fail_image and args.fail_image in path:
            with lock:
                fail = not args.fail_once or path not in failed
                failed.add(path)
            if fail:
                self.send_error(503, 'Simulated image failure')
                return
        if args.fail_scripts and path.endswith('.js'):
            self.send_error(503, 'Simulated module failure')
            return
        super().do_GET()

    def log_message(self, *_):
        pass


root = Path(__file__).resolve().parents[1] / 'dist'
server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, directory=str(root)))
print(f'QA preview: http://127.0.0.1:{args.port}/', flush=True)
server.serve_forever()
