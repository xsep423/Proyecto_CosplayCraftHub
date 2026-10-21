# Multi-tenancy en CosplayCraft Hub

## 1. ¿Qué es un tenant aquí?

Cada **taller** (`Workshop`) es un tenant. Un taller tiene sus propios usuarios,
clientes, inventario, proyectos, tareas y cotizaciones. Dos talleres usan la
misma aplicación y la misma base de datos, pero ninguno puede ver ni modificar
los datos del otro.

```
Workshop (tenant)
├── Profile (usuarios + rol: admin / maker / viewer)
├── Cliente
├── Material ── StockMovement
├── Project ── Task
│           └── ProjectMaterial (usa Material)
└── Quote ── QuoteItem
```

## 2. Enfoque elegido: base de datos compartida, esquema compartido

Existen tres enfoques comunes:

| Enfoque | Cómo funciona | Ventajas | Desventajas |
|---|---|---|---|
| BD por tenant | Una base de datos por taller | Aislamiento físico máximo | Caro, difícil de mantener y migrar |
| Esquema por tenant | Un esquema de PostgreSQL por taller | Buen aislamiento | Migraciones por esquema, más complejidad |
| **Esquema compartido (elegido)** | Todas las tablas tienen una columna `workshop_id` | Simple, barato, una sola migración, escala bien para muchos talleres pequeños | El aislamiento depende de que el código filtre siempre |

Lo elegimos porque los clientes son talleres pequeños (muchos tenants, pocos
datos cada uno), usamos un solo servidor en Render con un solo PostgreSQL y
queremos que dar de alta un taller sea instantáneo (solo insertar una fila).

Las tablas hijas (`Task`, `ProjectMaterial`, `QuoteItem`, `StockMovement`) no
llevan `workshop_id`: heredan el tenant de su padre (`task.project.workshop`).

## 3. Mecanismos de seguridad

Toda la lógica está centralizada en `backend/apps/users/tenancy.py`.

1. **El tenant sale del servidor, nunca del cliente.**
   `get_workshop(user)` lee `Profile.workshop` del usuario autenticado por JWT.
   El token trae `workshop_id`, pero solo como dato para la interfaz: el
   backend no lo usa para decidir nada, así que modificar el token o mandar un
   header no sirve.

2. **Filtrado automático de consultas.**
   Todos los ViewSets heredan de `TenantScopedMixin`, que en `get_queryset()`
   agrega `.filter(workshop=<taller del usuario>)`. Un id de otro taller
   responde **404**, igual que si no existiera (no se revela que existe).

3. **Asignación automática al crear.**
   `perform_create()` guarda con `workshop=<taller del usuario>`. Si alguien
   manda `"workshop": 5` en el JSON, se ignora.

4. **Relaciones validadas por tenant.**
   `TenantPrimaryKeyRelatedField` solo acepta ids del propio taller. Así no se
   puede crear un proyecto con un cliente ajeno, usar material de otro
   inventario, ni asignar una tarea a un usuario de otro taller (responde 400).

5. **Unicidad por tenant.**
   El correo de un cliente y el folio de una cotización son únicos *por
   taller* (`UniqueConstraint(workshop, ...)`). Dos talleres pueden tener el
   mismo cliente; cada taller tiene su propio consecutivo de folios con su
   prefijo (`FRJ-2026-001`, `HYE-2026-001`).

6. **Roles dentro del tenant.**
   Además del aislamiento, cada taller tiene roles: `admin` (todo, incluidos
   usuarios), `maker` (crear y editar) y `viewer` (solo lectura). El admin solo
   ve y administra usuarios de su propio taller.

7. **Otros controles.**
   - JWT con expiración; usuarios o talleres desactivados no pueden entrar.
   - Límite de peticiones (`throttling`) en login y registro de talleres.
   - Contraseñas validadas con los validadores de Django.
   - Operaciones de inventario con `select_for_update()` dentro de
     transacciones para evitar condiciones de carrera.

## 4. Alta de un nuevo tenant

`POST /api/auth/register/` (pantalla `/register`) crea en una sola transacción:
el `Workshop`, el usuario y su `Profile` con rol `admin`. Devuelve los tokens,
así que el usuario entra directo a su dashboard vacío.

## 5. Cómo se comprueba

```bash
cd backend
python manage.py test apps.users
```

Las pruebas (`apps/users/tests.py`) verifican que:
- cada taller solo lista sus clientes, materiales, proyectos y cotizaciones;
- pedir o editar un registro de otro taller da 404;
- no se puede inyectar otro `workshop` al crear;
- no se puede referenciar un cliente o material ajeno;
- el mismo correo de cliente puede existir en dos talleres;
- los folios son independientes por taller;
- un taller recién registrado nace vacío.

## 6. Guion para la demostración en vivo

1. `python manage.py seed_demo --reset` (deja los 2 talleres listos).
2. Entrar como `admin@forja.demo` → mostrar dashboard, proyectos, inventario.
3. En otra ventana (incógnito) entrar como `admin@hiloespuma.demo` → los datos
   son completamente distintos.
4. Mostrar que el "Cliente Compartido" existe en ambos con el mismo correo,
   pero cada taller ve solo el suyo.
5. Copiar la URL de un proyecto de Forja y abrirla en la sesión de Hilo &
   Espuma → "Proyecto no encontrado" (la API responde 404).
6. Cerrar sesión → "Registra tu taller" → crear un taller nuevo → entra a un
   dashboard vacío. Crear un cliente y un proyecto ahí.
7. Mostrar las pruebas automáticas pasando.

Contraseña de todos los usuarios demo: `Demo1234!`
