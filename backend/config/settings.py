"""
Django settings for config project.
"""

from pathlib import Path
from decouple import config, Csv
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY')

DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='127.0.0.1,localhost', cast=Csv())


INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'apps.users',
    'apps.clientes',
    'apps.inventory',
    'apps.quotes',
    'apps.projects',
    'apps.dashboard',
    'apps.plataforma',
    'apps.gallery',
    'apps.exports',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:5173',
    cast=Csv(),
)

CSRF_TRUSTED_ORIGINS = config(
    'CSRF_TRUSTED_ORIGINS',
    default='',
    cast=Csv(),
)

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    # Limita intentos de login y registro de talleres sin sesión
    'DEFAULT_THROTTLE_RATES': {
        'anon': config('ANON_THROTTLE_RATE', default='30/min'),
    },
}

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# Base de datos: en Render usa DATABASE_URL; en local usa las variables DB_*
DATABASE_URL = config('DATABASE_URL', default='')

if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.parse(DATABASE_URL, conn_max_age=600)
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME'),
            'USER': config('DB_USER'),
            'PASSWORD': config('DB_PASSWORD'),
            'HOST': config('DB_HOST'),
            'PORT': config('DB_PORT'),
        }
    }


AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


LANGUAGE_CODE = 'es-mx'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    },
}


# Imágenes (fotos de proyectos, materiales y logo del taller).
# Con CLOUDINARY_URL (cloudinary://API_KEY:API_SECRET@CLOUD_NAME) se suben a
# Cloudinary; sin ella se guardan comprimidas en PostgreSQL. Ver apps/gallery/storage.py.
CLOUDINARY_URL = config('CLOUDINARY_URL', default='')
IMAGE_STORAGE = 'cloudinary' if CLOUDINARY_URL else 'db'

# Las fotos pueden pesar hasta 10 MB; el resto de peticiones sigue limitado a 2.5 MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 2_621_440
DATA_UPLOAD_MAX_MEMORY_SIZE = 12 * 1024 * 1024


# Correo (recuperación de contraseña).
# Sin EMAIL_HOST los correos se imprimen en la consola, útil para desarrollo.
EMAIL_HOST = config('EMAIL_HOST', default='')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_TIMEOUT = 15
# Render (plan gratis) bloquea los puertos SMTP, así que en producción el correo
# sale por un Google Apps Script (HTTPS) cuando existe APPS_SCRIPT_MAIL_URL.
APPS_SCRIPT_MAIL_URL = config('APPS_SCRIPT_MAIL_URL', default='')
APPS_SCRIPT_MAIL_TOKEN = config('APPS_SCRIPT_MAIL_TOKEN', default='')
EMAIL_SENDER_NAME = config('EMAIL_SENDER_NAME', default='CosplayCraft Hub')
if APPS_SCRIPT_MAIL_URL:
    _default_email_backend = 'config.email_backends.AppsScriptEmailBackend'
elif EMAIL_HOST:
    _default_email_backend = 'django.core.mail.backends.smtp.EmailBackend'
else:
    _default_email_backend = 'django.core.mail.backends.console.EmailBackend'
EMAIL_BACKEND = config('EMAIL_BACKEND', default=_default_email_backend)
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='CosplayCraft Hub <no-reply@cosplaycrafthub.local>')

# Dirección del frontend: se usa para armar el enlace del correo de recuperación
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5173').rstrip('/')
# El enlace para restablecer la contraseña caduca en 1 hora
PASSWORD_RESET_TIMEOUT = 60 * 60
# Quien registra un taller nuevo debe confirmar su correo antes de iniciar sesión.
# Se puede apagar con REQUIRE_EMAIL_VERIFICATION=False (p. ej. si el correo no está configurado).
REQUIRE_EMAIL_VERIFICATION = config('REQUIRE_EMAIL_VERIFICATION', default=True, cast=bool)
# El enlace de confirmación caduca en 3 días
EMAIL_VERIFICATION_MAX_AGE = 60 * 60 * 24 * 3


# Errores a la consola: así aparecen en los logs de Render aunque DEBUG esté apagado
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {'class': 'logging.StreamHandler'},
    },
    'root': {'handlers': ['console'], 'level': 'WARNING'},
    'loggers': {
        'django.request': {'handlers': ['console'], 'level': 'ERROR', 'propagate': False},
    },
}
