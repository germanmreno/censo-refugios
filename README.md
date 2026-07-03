# Censo de Refugios — Terremoto Venezuela 2026

Sistema gubernamental de censo para uno o múltiples refugios. Stack: **React + Vite + TypeScript** (frontend), **Node.js + Express + Prisma** (backend), **PostgreSQL** (base de datos local, sin Docker). Monorepo con npm workspaces.

## Requisitos previos

- Node.js 20+
- npm 10+
- PostgreSQL 16+ instalado localmente (el `psql` debe estar en el PATH o usar la ruta completa)

## Primer arranque

```bash
# 1. Instalar dependencias del monorepo
npm install

# 2. Crear base de datos en PostgreSQL
psql -U postgres -c "CREATE DATABASE censo_refugios;"

# 3. Copiar variables de entorno y editarlas
cp .env.example backend/.env
#   -> ajusta DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET y ADMIN_*

# 4. Generar cliente Prisma y aplicar migraciones
npm run db:generate
npm run db:migrate:dev     # en desarrollo (crea/aplica migraciones)
# npm run db:migrate       # en producción (sólo aplica)

# 5. Sembrar el administrador raíz (usa ADMIN_* del .env)
npm run db:seed

# 6. Levantar backend (4000) y frontend (5173) en paralelo
npm run dev
```

## Credenciales por defecto (del seed)

- Cédula: `ADMIN_CEDULA` del `.env` (por defecto `V00000000`)
- Contraseña: `ADMIN_PASSWORD` del `.env` (por defecto `CambiaPorUnaClaveSegura123`)
- **Cambia estos valores en producción.**

## Scripts

| Script | Descripción |
| --- | --- |
| `npm run dev` | Backend + frontend en paralelo (watch) |
| `npm run build` | Compila shared, backend y frontend |
| `npm run start` | Arranca el backend compilado (producción) |
| `npm run typecheck` | Typecheck en todos los workspaces |
| `npm run lint` | ESLint en todos los workspaces |
| `npm run test` | Vitest en todos los workspaces |
| `npm run db:migrate:dev` | Crea/aplica migraciones en desarrollo |
| `npm run db:migrate` | Aplica migraciones en producción |
| `npm run db:seed` | Crea el administrador raíz |
| `npm run db:generate` | Regenera el cliente Prisma |

## Roles

- **Funcionario:** registra y visualiza refugiados. Sólo opera en los refugios que tiene asignados (multi-refugio vía tabla puente `usuario_refugios`).
- **Administrador:** acceso global. Crea/edita refugios, modifica registros de refugiados, gestiona usuarios.

No existe registro público: los usuarios sólo los crea un administrador.

## Estructura

```
censo-refugios/
├── backend/                # Express + Prisma
│   ├── prisma/
│   │   ├── schema.prisma   # modelos de la base de datos
│   │   ├── seed.ts         # admin raíz
│   │   ├── sql/            # constraints adicionales
│   │   └── migrations/     # migraciones versionadas
│   ├── src/
│   │   ├── routes/         # auth, usuarios, refugios, refugiados, geo, stats, auditoria
│   │   ├── middleware/     # authGuard, requireRole, rateLimit, errorHandler
│   │   ├── services/       # prisma, jwt, refugioAccess
│   │   ├── schemas/        # validación Zod (testeable)
│   │   └── utils/          # env, auditoria
│   └── test/               # tests Vitest
├── frontend/               # React + Vite
│   ├── src/
│   │   ├── api/            # clientes axios (con refresh JWT automático)
│   │   ├── components/     # Layout, Modal, CapacidadBar, FormFields, ProtectedRoute
│   │   ├── context/        # AuthContext
│   │   ├── pages/          # Login, Dashboard, refugios, refugiados, estadisticas, usuarios
│   │   └── utils/          # opciones, csv
│   └── test/               # tests Vitest
└── shared/                 # tipos, enums, DTOs y dataset geo de Venezuela
    ├── geo/venezuela.json  # estados → municipios → parroquias
    └── types/
```

## API REST

Base URL: `http://localhost:4000/api` (o vía proxy del frontend en `http://localhost:5173/api`).

| Método | Ruta | Rol | Descripción |
| --- | --- | --- | --- |
| POST | `/auth/login` | público | Login, devuelve access token + cookie refresh |
| POST | `/auth/refresh` | cookie | Renueva el access token |
| POST | `/auth/logout` | auth | Cierra sesión |
| GET | `/auth/me` | auth | Datos del usuario actual |
| GET | `/usuarios` | admin | Lista usuarios |
| POST | `/usuarios` | admin | Crea funcionario/admin |
| PATCH | `/usuarios/:id` | admin | Edita usuario |
| DELETE | `/usuarios/:id` | admin | Desactiva usuario |
| GET | `/refugios` | auth | Lista refugios visibles (con ocupación) |
| POST | `/refugios` | admin | Crea refugio (con aulas) |
| PATCH | `/refugios/:id` | admin | Edita refugio |
| DELETE | `/refugios/:id` | admin | Elimina refugio (bloquea si hay refugiados) |
| GET | `/refugios/:id/ocupacion` | auth | Ocupación detallada vs capacidad |
| POST/DELETE | `/refugios/:id/aulas[/:aulaId]` | admin | Gestiona aulas |
| GET | `/refugiados` | auth | Lista paginada con filtros |
| POST | `/refugiados` | auth | Registra refugiado (jefe o familiar) |
| PATCH | `/refugiados/:id` | admin | Edita refugiado |
| DELETE | `/refugiados/:id` | admin | Soft delete |
| GET | `/refugiados/jefes/buscador` | auth | Autocomplete de jefes |
| GET | `/geo/estados` `/municipios` `/parroquias` | auth | Dataset geo encadenado |
| GET | `/stats` | auth | Resumen global |
| GET | `/stats/:refugioId` | auth | Estadísticas por refugio |
| GET | `/auditoria` | admin | Registro de acciones |

## Seguridad

- JWT: access token (15 min) en memoria + refresh token (7 días) en cookie `httpOnly`, `sameSite=lax`, `secure` en producción.
- bcrypt (costo 12) para passwords. `tokenVersion` permite revocar sesiones al cambiar contraseña o desactivar usuario.
- Rate limiting en `/auth/login` (10 intentos/min por IP).
- Helmet, CORS restrictivo, límite de body 256 KB, `trust proxy`.
- Protege al último administrador activo de ser desactivado/degradado.
- Auditoría de login/create/update/delete en todas las entidades.
- Validación con Zod + constraints `CHECK` en la base de datos (jefe de familia y patología).
- Aislamiento por refugio: el funcionario sólo ve/refgistra en sus refugios.

## Despliegue en producción

1. **Base de datos:** PostgreSQL instalado y `DATABASE_URL` apuntando a ella.
2. **Variables de entorno** (`backend/.env`): `NODE_ENV=production`, secretos JWT de al menos 32 caracteres aleatorios, `CORS_ORIGIN` con el dominio del frontend, `ADMIN_*` para el seed.
3. **Migraciones:** `npm run db:migrate` (sólo aplica migraciones versionadas, no pide confirmación interactiva).
4. **Seed del admin raíz:** `npm run db:seed` (una sola vez; idempotente).
5. **Build:** `npm run build`.
6. **Backend:** servir con `npm run start` detrás de un proxy inverso (Nginx) que termine TLS. Alternativamente con PM2: `pm2 start "npm run start" --name censo-backend`.
7. **Frontend:** el build estático (`frontend/dist`) se sirve con Nginx, que a su vez hace proxy de `/api` al backend.

Ejemplo de bloque Nginx:

```nginx
server {
    listen 80;
    server_name censo.example.gov.ve;

    root /var/www/censo-refugios/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

8. **TLS:** usar Certbot/Let's Encrypt para HTTPS. El refresh cookie requiere `secure` (automático en `NODE_ENV=production`).

## Pruebas

```bash
npm run test          # todos los workspaces
npm run test -w backend    # sólo backend
npm run test -w frontend   # sólo frontend
```

## Dataset geográfico

`shared/geo/venezuela.json` contiene la división político-territorial de Venezuela (24 entidades + Distrito Capital). Las parroquias están completas en las regiones más afectadas por el sismo de 2026 (Distrito Capital, La Guaira, Miranda, Carabobo, Aragua); el resto de estados incluye sus municipios. Es ampliable editando el archivo.
# censo-refugios
