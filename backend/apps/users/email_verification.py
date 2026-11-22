"""
Confirmación de correo al registrar un taller.

El enlace lleva un token firmado (django.core.signing) con el id del usuario y su
correo. Caduca en EMAIL_VERIFICATION_MAX_AGE y deja de servir si el correo cambia.
"""
import logging

from django.conf import settings
from django.contrib.auth.models import User
from django.core import signing
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

SALT = 'cosplaycrafthub.email-verification'


def make_token(user):
    return signing.dumps({'u': user.pk, 'e': user.email.lower()}, salt=SALT, compress=True)


def user_from_token(token):
    """Devuelve el usuario del enlace, o None si es inválido, caducó o el correo cambió."""
    try:
        data = signing.loads(token, salt=SALT, max_age=settings.EMAIL_VERIFICATION_MAX_AGE)
    except (signing.BadSignature, TypeError, ValueError):
        return None
    if not isinstance(data, dict):
        return None
    user = User.objects.filter(pk=data.get('u'), is_active=True).select_related('profile').first()
    if user is None or user.email.lower() != data.get('e'):
        return None
    return user


def verification_link(user):
    return f'{settings.FRONTEND_URL}/verify-email?token={make_token(user)}'


def send_verification_email(user):
    """Manda el enlace de confirmación. Devuelve False si el correo no salió."""
    name = f'{user.first_name} {user.last_name}'.strip() or user.username
    body = (
        f'Hola {name}:\n\n'
        'Gracias por registrar tu taller en CosplayCraft Hub.\n'
        'Confirma tu correo con este enlace para activar tu cuenta (caduca en 3 días):\n\n'
        f'{verification_link(user)}\n\n'
        'Si no creaste esta cuenta, ignora este correo.\n'
    )
    try:
        send_mail('Confirma tu correo', body, None, [user.email])
        return True
    except Exception:
        logger.exception('No se pudo enviar el correo de confirmación')
        return False
