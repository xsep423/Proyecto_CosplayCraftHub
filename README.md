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

* [ ] Registro e inicio de sesión
* [ ] Gestión de talleres
* [ ] Gestión de clientes
* [ ] Gestión de proyectos
* [ ] Gestión de tareas
* [ ] Gestión de materiales e inventario
* [ ] Control de costos
* [ ] Creación de cotizaciones
* [ ] Gestión de usuarios y permisos
* [ ] Multi-tenancy

## Instalación

### Backend

```bash
cd backend

python -m venv venv
source venv/bin/activate

pip install -r requirements.txt

python manage.py migrate
python manage.py runserver
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
```

No se deben subir archivos `.env` al repositorio.
