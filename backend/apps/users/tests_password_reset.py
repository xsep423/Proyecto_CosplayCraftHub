"""
Pruebas de recuperación de contraseña por correo.

    python manage.py test apps.users
"""
import re
from urllib.parse import parse_qs, urlparse

from django.contrib.auth.models import User
from django.core import mail
from django.test import override_settings

from apps.users.testutils import PASSWORD, TenantAPITestCase

REQUEST = '/api/auth/password-reset/'
CONFIRM = '/api/auth/password-reset/confirm/'
NEW_PASSWORD = 'Nueva-Clave-Cosplay-9'


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    FRONTEND_URL='https://app.ejemplo.test',
)
class PasswordResetTests(TenantAPITestCase):
    def request_link(self, email='maker@uno.test'):
        res = self.client.post(REQUEST, {'email': email}, format='json')
        self.assertEqual(res.status_code, 200)
        return res

    def link_params(self):
        url = re.search(r'https://\S+', mail.outbox[-1].body).group(0)
        parsed = urlparse(url)
        self.assertEqual(f'{parsed.scheme}://{parsed.netloc}{parsed.path}', 'https://app.ejemplo.test/reset-password')
        query = parse_qs(parsed.query)
        return {'uid': query['uid'][0], 'token': query['token'][0]}

    def test_envia_correo_con_enlace(self):
        self.request_link('MAKER@uno.test')
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['maker@uno.test'])
        self.link_params()

    def test_correo_desconocido_responde_igual_y_no_envia(self):
        known = self.request_link().data
        unknown = self.request_link('nadie@correo.com').data
        self.assertEqual(known, unknown)
        self.assertEqual(len(mail.outbox), 1)

    def test_usuario_desactivado_no_recibe_correo(self):
        User.objects.filter(pk=self.maker.pk).update(is_active=False)
        self.request_link()
        self.assertEqual(len(mail.outbox), 0)

    def test_cambia_la_contrasena_y_permite_iniciar_sesion(self):
        self.request_link()
        res = self.client.post(CONFIRM, {**self.link_params(), 'password': NEW_PASSWORD}, format='json')
        self.assertEqual(res.status_code, 200, res.data)

        old = self.client.post('/api/auth/login/', {'email': 'maker@uno.test', 'password': PASSWORD}, format='json')
        self.assertEqual(old.status_code, 400)
        new = self.client.post('/api/auth/login/', {'email': 'maker@uno.test', 'password': NEW_PASSWORD}, format='json')
        self.assertEqual(new.status_code, 200)

    def test_el_enlace_solo_sirve_una_vez(self):
        self.request_link()
        params = self.link_params()
        self.client.post(CONFIRM, {**params, 'password': NEW_PASSWORD}, format='json')
        res = self.client.post(CONFIRM, {**params, 'password': 'Otra-Clave-Mas-Larga-1'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_token_invalido(self):
        self.request_link()
        params = self.link_params()
        for bad in [{**params, 'token': 'abc-123'}, {**params, 'uid': 'zzz'}]:
            res = self.client.post(CONFIRM, {**bad, 'password': NEW_PASSWORD}, format='json')
            self.assertEqual(res.status_code, 400)
            self.assertIn('non_field_errors', res.data)

    def test_rechaza_contrasena_debil(self):
        self.request_link()
        res = self.client.post(CONFIRM, {**self.link_params(), 'password': '12345678'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('password', res.data)
        self.maker.refresh_from_db()
        self.assertTrue(self.maker.check_password(PASSWORD))
