"""
serve.py - local web server for the exam (not published; only site/ is published).
Same as "python3 -m http.server", but it tells the browser NOT to cache files,
so after editing any file (CSS, JS, seed.sql) a normal F5 shows the change.
Run from the project folder:  python3 serve.py   then open http://localhost:8000
"""

import http.server  # Python's built-in web server
import functools  # used to pass the "site" folder to the handler

PORT = 8000  # port number: the site is at http://localhost:8000
FOLDER = 'site'  # the folder that is served (the website itself)


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    """Serves files like the normal server, plus a header that disables caching."""

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')  # browser must always download a fresh copy
        super().end_headers()  # then finish the headers as usual


handler = functools.partial(NoCacheHandler, directory=FOLDER)  # serve files from site/
print('Site pornit: http://localhost:' + str(PORT))  # message shown in the terminal
http.server.ThreadingHTTPServer(('', PORT), handler).serve_forever()  # run until Ctrl+C
