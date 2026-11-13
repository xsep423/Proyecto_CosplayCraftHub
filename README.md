# CosplayCraft Hub

Sistema web para la gestión de pequeños talleres de cosplay y creadores independientes.

## Descripción

CosplayCraft Hub busca centralizar la administración de talleres de cosplay en una sola plataforma. Permite gestionar clientes, proyectos, tareas, materiales, inventario, costos y cotizaciones.

El proyecto está desarrollado como una aplicación web con arquitectura cliente-servidor y soporte para múltiples talleres.

## Tecnologías

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* React Router

### Backend

* Python
* Django
* Django REST Framework
* JWT

### Base de datos

* PostgreSQL

## Estructura del proyecto

```text
CosplayCraftHub/
├── backend/
│   ├── apps/
│   ├── config/
│   ├── manage.py
│   └── venv/
│
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── services/
    │   └── ...
    ├── package.json
    └── vite.config.ts
```

## Funcionalidades

Actualmente el proyecto se encuentra en desarrollo.

### Planeadas

* [x] Registro de talleres e inicio de sesión
* [x] Gestión de talleres
* [x] Gestión de clientes
* [x] Gestión de proyectos
* [x] Gestión de tareas (tablero kanban)
* [x] Gestión de materiales e inventario
* [x] Control de costos por proyecto
* [x] Creación de cotizaciones
* [x] Gestión de usuarios y permisos
* [x] Multi-tenancy (ver [docs/MULTITENANT.md](docs/MULTITENANT.md))
* [x] Fotos de proyectos (referencias, avances y resultado final) con portada
* [x] Foto de cada material del inventario
* [x] Logo del taller
* [x] Portafolio público del taller (`/p/<slug>`)
* [x] Cotizaciones en PDF (versión imprimible)
* [x] Calendario de entregas

## Imágenes

Las imágenes se procesan en el servidor: se corrige la orientación, se eliminan
los metadatos EXIF (ubicación GPS, etc.), se reducen a 1600 px y se guardan en
WebP junto con una miniatura.

Dónde se guardan depende de `CLOUDINARY_URL`:

* **Con** `CLOUDINARY_URL` → se suben a [Cloudinary](https://cloudinary.com) (recomendado en producción).
* **Sin** ella → se guardan en PostgreSQL.

Nunca se usa el disco del servidor, porque en Render gratis se borra en cada deploy.
Cada imagen recuerda dónde se guardó, así que se puede activar Cloudinary después
sin romper las imágenes anteriores.

El portafolio público solo muestra los proyectos marcados como públicos, nunca
muestra clientes, precios ni costos, y no incluye las fotos marcadas como "referencia".

## Instalación

### Backend

```bash
cd backend

python -m venv venv
source venv/bin/activate

pip install -r requirements.txt

python manage.py migrate
python manage.py seed_demo      # opcional: 2 talleres de demostración
python manage.py runserver
```

Usuarios demo (contraseña `Demo1234!`): `admin@forja.demo`, `maker@forja.demo`,
`viewer@forja.demo`, `admin@hiloespuma.demo`, `maker@hiloespuma.demo`.

Para recrear los datos demo desde cero: `python manage.py seed_demo --reset`.

Pruebas de aislamiento entre talleres:

```bash
python manage.py test apps
```

### Frontend

En otra terminal:

```bash
cd frontend

npm install
npm run dev
```

El frontend estará disponible normalmente en:

`http://localhost:5173`

El backend estará disponible en:

`http://127.0.0.1:8000`

## Variables de entorno

El proyecto utiliza archivos `.env` para configurar información sensible y parámetros de conexión.

Ejemplo:

```env
SECRET_KEY=your-secret-key
DEBUG=True

DB_NAME=cosplaycrafthub
DB_USER=your-user
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432

ALLOWED_HOSTS=127.0.0.1,localhost

# Opcional: guardar imágenes en Cloudinary en vez de PostgreSQL
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

No se deben subir archivos `.env` al repositorio.
