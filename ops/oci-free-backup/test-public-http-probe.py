import contextlib
import http.server
import importlib.util
import io
import os
import pathlib
import shutil
import ssl
import subprocess
import sys
import tempfile
import threading
import urllib.error
import unittest
from unittest.mock import Mock

sys.dont_write_bytecode = True

spec = importlib.util.spec_from_file_location(
    'public_probe', pathlib.Path(__file__).with_name('public-http-probe.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        code = {'/ok': 200, '/api': 404, '/bad-header': 404, '/redirect': 302}.get(self.path, 503)
        self.send_response(code)
        self.send_header('X-Request-Id',
            'ad44cb70-a2fa-4fb3-9c25-e00a4a48ffac' if self.path != '/bad-header' else 'PRIVATE_email_token')
        if code == 302:
            self.send_header('Location', '/ok')
        self.end_headers()
        self.wfile.write(b'PRIVATE_password_email_body_should_not_be_read')

    def log_message(self, *_args):
        pass


class ProbeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = tempfile.TemporaryDirectory(prefix='kortek-probe-tls-')
        directory = pathlib.Path(cls.directory.name)
        openssl = shutil.which('openssl')
        if not openssl and os.name == 'nt':
            openssl = r'C:\Program Files\Git\usr\bin\openssl.exe'
        key = directory / 'test-key.pem'
        certificate = directory / 'test-cert.pem'
        subprocess.run([openssl, 'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
            '-keyout', str(key), '-out', str(certificate), '-days', '1',
            '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost'],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15)
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(str(certificate), str(key))
        cls.server.socket = context.wrap_socket(cls.server.socket, server_side=True)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f'https://localhost:{cls.server.server_port}'
        cls.trusted = module.secure_opener(ssl.create_default_context(cafile=str(certificate)))

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)
        cls.directory.cleanup()

    def test_disabled_never_uses_network_or_claims_availability(self):
        opener = Mock()
        self.assertEqual(module.metrics({}, opener), {'public_http_monitor_enabled': 0})
        opener.open.assert_not_called()

    def test_invalid_switch_fails_closed(self):
        with self.assertRaisesRegex(ValueError, '^PUBLIC_HTTP_MONITOR_CONFIGURATION_INVALID$'):
            module.metrics({'KORTEK_PUBLIC_HTTP_ENABLED': 'yes'}, Mock())

    def test_real_https_status_and_application_header(self):
        self.assertEqual(module.probe(self.url + '/ok', 200, False, self.trusted)[0], 1)
        self.assertEqual(module.probe(self.url + '/api', 404, True, self.trusted)[0], 1)
        self.assertEqual(module.probe(self.url + '/bad-header', 404, True, self.trusted)[0], 0)
        self.assertEqual(module.probe(self.url + '/down', 200, False, self.trusted)[0], 0)

    def test_redirect_is_not_healthy(self):
        self.assertEqual(module.probe(self.url + '/redirect', 200, False, self.trusted)[0], 0)

    def test_default_ca_rejects_untrusted_certificate(self):
        self.assertEqual(module.probe(self.url + '/ok', 200, False, module.secure_opener())[0], 0)

    def test_tls_hostname_is_verified(self):
        self.assertEqual(module.probe(self.url.replace('localhost', '127.0.0.1') + '/ok',
            200, False, self.trusted)[0], 0)

    def test_output_has_no_response_body_or_private_header(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            result = module.probe(self.url + '/bad-header', 404, True, self.trusted)
        self.assertEqual(output.getvalue(), '')
        self.assertNotIn('PRIVATE', repr(result))

    def test_timeout_fails_without_exposing_error_or_sending_credentials(self):
        opener = Mock()
        opener.open.side_effect = urllib.error.URLError('PRIVATE_token_timeout')
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            result = module.probe('https://booking.kortek.cloud/', 200, False, opener)
        self.assertEqual(result[0], 0)
        self.assertEqual(output.getvalue(), '')
        request = opener.open.call_args.args[0]
        self.assertNotIn('Authorization', request.headers)
        self.assertNotIn('Cookie', request.headers)
        self.assertEqual(opener.open.call_args.kwargs['timeout'], 3)


if __name__ == '__main__':
    unittest.main()
