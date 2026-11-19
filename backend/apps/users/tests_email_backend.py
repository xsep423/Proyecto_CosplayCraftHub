import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

from django.core.mail import send_mail
from django.test import SimpleTestCase, override_settings


class _FakeAppsScript(BaseHTTPRequestHandler):
    received = []

    def do_POST(self):
        data = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        _FakeAppsScript.received.append(data)
        ok = data.get('token') == 'secreto'
        body = json.dumps({'ok': ok, 'error': None if ok else 'no autorizado'}).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


class AppsScriptEmailBackendTests(SimpleTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.server = HTTPServer(('127.0.0.1', 0), _FakeAppsScript)
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.url = f'http://127.0.0.1:{cls.server.server_port}/exec'

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        super().tearDownClass()

    def setUp(self):
        _FakeAppsScript.received.clear()

    def test_envia_el_correo_al_script(self):
        with override_settings(EMAIL_BACKEND='config.email_backends.AppsScriptEmailBackend',
                               APPS_SCRIPT_MAIL_URL=self.url, APPS_SCRIPT_MAIL_TOKEN='secreto'):
            enviados = send_mail('Asunto', 'Cuerpo', None, ['ana@example.com'])
        self.assertEqual(enviados, 1)
        data = _FakeAppsScript.received[0]
        self.assertEqual(data['to'], 'ana@example.com')
        self.assertEqual(data['subject'], 'Asunto')
        self.assertEqual(data['body'], 'Cuerpo')

    def test_token_incorrecto_lanza_error(self):
        with override_settings(EMAIL_BACKEND='config.email_backends.AppsScriptEmailBackend',
                               APPS_SCRIPT_MAIL_URL=self.url, APPS_SCRIPT_MAIL_TOKEN='otro'):
            with self.assertRaises(RuntimeError):
                send_mail('Asunto', 'Cuerpo', None, ['ana@example.com'])
