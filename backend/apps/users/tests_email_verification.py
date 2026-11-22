"""
Pruebas de confirmación de correo al registrar un taller.

    python manage.py test apps.users
"""
import re
from datetime import timedelta
from unittest import mock
from urllib.parse import parse_qs, urlparse

from django.contrib.auth.models import User
from django.core import mail, signing
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase

from apps.users.email_verification import SALT, make_token
from apps.users.models import Profile

REGISTER = '/api/auth/register/'
LOGIN = '/api/auth/login/'
VERIFY = '/api/auth/verify-email/'
RESEND = '/api/auth/verify-email/resend/'
PASSWORD = 'UnaClaveSegura123'


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    FRONTEND_URL='https://app.ejemplo.test',
    REQUIRE_EMAIL_VERIFICATION=True,
)
class EmailVerificationTests(APITestCase):
    def setUp(self):
        cache.clear()  # el límite de peticiones anónimas vive en la caché

    def register(self, email='nuevo@taller.test', name='Taller Nuevo'):
        return self.client.post(REGISTER, {
            'workshopName': name, 'ownerName': 'Kevin Carretero', 'email': email, 'password': PASSWORD,
        }, format='json')

    def token_from_email(self):
        url = re.search(r'https://\S+', mail.outbox[-1].body).group(0)
        parsed = urlparse(url)
        self.assertEqual(f'{parsed.scheme}://{parsed.netloc}{parsed.path}', 'https://app.ejemplo.test/verify-email')
        return parse_qs(parsed.query)['token'][0]

    def login(self, email='nuevo@taller.test'):
        return self.client.post(LOGIN, {'email': email, 'password': PASSWORD}, format='json')

    def test_registro_manda_correo_y_no_inicia_sesion(self):
        res = self.register()
        self.assertEqual(res.status_code, 201, res.data)
        self.assertTrue(res.data['verificationRequired'])
        self.assertTrue(res.data['emailSent'])
        self.assertNotIn('access', res.data)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['nuevo@taller.test'])
        self.assertFalse(Profile.objects.get(user__email='nuevo@taller.test').email_verified)

    def test_no_entra_sin_confirmar_y_si_despues(self):
        self.register()
        res = self.login()
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data['code'], ['email_not_verified'])

        res = self.client.post(VERIFY, {'token': self.token_from_email()}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertIn('access', res.data)  # confirmar deja la sesión iniciada
        self.assertEqual(self.login().status_code, 200)

    def test_contrasena_incorrecta_no_revela_si_falta_confirmar(self):
        self.register()
        res = self.client.post(LOGIN, {'email': 'nuevo@taller.test', 'password': 'otra-clave-x'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertNotIn('code', res.data)

    def test_el_enlace_solo_inicia_sesion_una_vez(self):
        self.register()
        token = self.token_from_email()
        self.client.post(VERIFY, {'token': token}, format='json')
        res = self.client.post(VERIFY, {'token': token}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['alreadyVerified'])
        self.assertNotIn('access', res.data)

    def test_token_alterado_caducado_o_de_otro_correo_no_sirve(self):
        self.register()
        token = self.token_from_email()
        self.assertEqual(self.client.post(VERIFY, {'token': token + 'x'}, format='json').status_code, 400)

        user = User.objects.get(email='nuevo@taller.test')
        with mock.patch('django.core.signing.time.time', return_value=signing.time.time() + timedelta(days=4).total_seconds()):
            self.assertEqual(self.client.post(VERIFY, {'token': token}, format='json').status_code, 400)

        # Si el correo cambia, el enlace viejo deja de servir
        user.email = 'otro@taller.test'
        user.save()
        self.assertEqual(self.client.post(VERIFY, {'token': token}, format='json').status_code, 400)

        # Un token firmado con otra "sal" (p. ej. de otra función) tampoco
        otro = signing.dumps({'u': user.pk, 'e': user.email}, salt='otra-cosa')
        self.assertEqual(self.client.post(VERIFY, {'token': otro}, format='json').status_code, 400)
        self.assertFalse(Profile.objects.get(user=user).email_verified)

    def test_reenviar_responde_igual_y_solo_manda_si_falta_confirmar(self):
        self.register()
        mail.outbox.clear()
        for email in ('nuevo@taller.test', 'nadie@taller.test'):
            res = self.client.post(RESEND, {'email': email}, format='json')
            self.assertEqual(res.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)

        self.client.post(VERIFY, {'token': self.token_from_email()}, format='json')
        mail.outbox.clear()
        self.client.post(RESEND, {'email': 'nuevo@taller.test'}, format='json')
        self.assertEqual(len(mail.outbox), 0)

    def test_si_el_correo_falla_el_taller_queda_y_se_puede_reenviar(self):
        with mock.patch('apps.users.email_verification.send_mail', side_effect=OSError('sin red')):
            res = self.register()
        self.assertEqual(res.status_code, 201)
        self.assertFalse(res.data['emailSent'])
        self.assertTrue(User.objects.filter(email='nuevo@taller.test').exists())
        self.client.post(RESEND, {'email': 'nuevo@taller.test'}, format='json')
        self.assertEqual(len(mail.outbox), 1)

    def test_restablecer_contrasena_tambien_confirma_el_correo(self):
        self.register()
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode

        user = User.objects.get(email='nuevo@taller.test')
        res = self.client.post('/api/auth/password-reset/confirm/', {
            'uid': urlsafe_base64_encode(force_bytes(user.pk)),
            'token': default_token_generator.make_token(user),
            'password': 'Otra-Clave-Segura-77',
        }, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(Profile.objects.get(user=user).email_verified)

    def test_usuarios_existentes_y_creados_por_admin_no_necesitan_confirmar(self):
        user = User.objects.create_user('viejo@taller.test', 'viejo@taller.test', PASSWORD)
        self.assertTrue(Profile.objects.get_or_create(user=user)[0].email_verified)

    @override_settings(REQUIRE_EMAIL_VERIFICATION=False)
    def test_se_puede_apagar_la_confirmacion(self):
        res = self.register()
        self.assertEqual(res.status_code, 201)
        self.assertIn('access', res.data)
        self.assertEqual(len(mail.outbox), 0)

    def test_make_token_usa_su_propia_sal(self):
        self.register()
        user = User.objects.get(email='nuevo@taller.test')
        self.assertEqual(signing.loads(make_token(user), salt=SALT)['u'], user.pk)
