"""
Backend de correo que manda los mensajes por un Google Apps Script.

Render (plan gratis) bloquea los puertos SMTP 25, 465 y 587, así que no se
puede usar smtp.gmail.com. En su lugar, el backend hace un POST por HTTPS a un
Apps Script publicado con la cuenta de Gmail del proyecto, y el script envía el
correo con MailApp. El código del script está en docs/correo-apps-script.gs.
"""
import json
import logging
import urllib.request

from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

logger = logging.getLogger(__name__)


class AppsScriptEmailBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        sent = 0
        for message in email_messages:
            try:
                self._send(message)
                sent += 1
            except Exception:
                if not self.fail_silently:
                    raise
                logger.exception('No se pudo enviar el correo por Apps Script')
        return sent

    def _send(self, message):
        payload = {
            'token': settings.APPS_SCRIPT_MAIL_TOKEN,
            'to': ','.join(message.recipients()),
            'subject': message.subject,
            'body': message.body,
            'name': settings.EMAIL_SENDER_NAME,
        }
        for content, mimetype in getattr(message, 'alternatives', []):
            if mimetype == 'text/html':
                payload['html'] = content
        request = urllib.request.Request(
            settings.APPS_SCRIPT_MAIL_URL,
            data=json.dumps(payload).encode(),
            headers={'Content-Type': 'application/json'},
            method='POST',
        )
        # Apps Script responde con una redirección; urllib la sigue sola
        with urllib.request.urlopen(request, timeout=settings.EMAIL_TIMEOUT) as response:
            result = json.loads(response.read().decode() or '{}')
        if not result.get('ok'):
            raise RuntimeError(f'Apps Script rechazó el correo: {result.get("error")}')
