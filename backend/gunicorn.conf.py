"""
Configuración de gunicorn. Se carga sola porque Render arranca con
`gunicorn config.wsgi` desde la carpeta backend/.

Sin esto gunicorn usa 1 proceso con 1 hilo: las peticiones se atienden de una
en una y una subida de foto (procesar + enviar a Cloudinary) bloquea a todos.

El plan gratis de Render da 0.1 CPU: con 2 procesos compiten por ella y todo se
vuelve más lento (medido: mediana de 0.7 s a 1.7 s con 8 peticiones a la vez).
Por eso 1 proceso con 4 hilos: los hilos se reparten las esperas (base de datos,
Cloudinary) sin duplicar CPU ni memoria. Con un plan de pago se puede subir
WEB_CONCURRENCY.
"""
import os

bind = f"0.0.0.0:{os.environ.get('PORT', '8000')}"
workers = int(os.environ.get('WEB_CONCURRENCY', 1))
threads = int(os.environ.get('GUNICORN_THREADS', 4))
worker_class = 'gthread'
# Las fotos grandes pueden tardar unos segundos en procesarse y subirse
timeout = 60
graceful_timeout = 30
keepalive = 5
# Recicla procesos de vez en cuando para que la memoria no crezca sin límite
max_requests = 1000
max_requests_jitter = 100
accesslog = '-'
