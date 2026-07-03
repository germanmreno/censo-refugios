# Guía de despliegue en producción

Esta guía cubre el despliegue del **Censo de Refugios** en un servidor Linux
(Ubuntu/Debian) sin Docker. Cubre backend (Node + Express + Prisma + PostgreSQL)
y frontend (Vite build estático), con Nginx como reverse proxy y Let's Encrypt
para HTTPS.

> **Requisitos del servidor**
> - Ubuntu 22.04 LTS o Debian 12 (o similar)
> - 1 vCPU, 1 GB RAM mínimo (2 GB recomendado)
> - Node.js ≥ 20
> - PostgreSQL ≥ 14
> - Nginx
> - Acceso a Internet (para certificados Let's Encrypt)

---

## 1. Preparar el servidor

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx postgresql postgresql-contrib
```

### Instalar Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # v20.x
npm --version
```

### Instalar PM2 (gestor de procesos para el backend)

```bash
sudo npm install -g pm2
pm2 --version
```

---

## 2. Crear la base de datos PostgreSQL

```bash
sudo -u postgres psql
```

Dentro de psql:

```sql
CREATE USER censo WITH PASSWORD 'UNA_CONTRASEÑA_MUY_SEGURA';
CREATE DATABASE censo_refugios OWNER censo;
GRANT ALL PRIVILEGES ON DATABASE censo_refugios TO censo;
\q
```

Verifica la conexión:

```bash
psql "postgresql://censo:UNA_CONTRASEÑA_MUY_SEGURA@localhost:5432/censo_refugios" -c "SELECT 1"
```

> **Importante**: edita `pg_hba.conf` si usas autenticación por host y
> necesitas conexiones remotas. Para el caso típico (backend en el mismo
> servidor), no es necesario.

---

## 3. Desplegar el código

### Opción A — clonar desde Git

```bash
sudo mkdir -p /var/www/censo-refugios
sudo chown $USER:www-data /var/www/censo-refugios
cd /var/www/censo-refugios
git clone <URL_DEL_REPO> .
```

### Opción B — subir artefactos con SCP/rsync

Desde tu máquina de desarrollo:

```bash
rsync -avz --exclude=node_modules --exclude=.git --exclude=dist \
  ./ usuario@servidor:/var/www/censo-refugios/
```

---

## 4. Instalar dependencias y compilar

```bash
cd /var/www/censo-refugios
npm install                # instala deps de root, backend, frontend, shared
npm run build              # compila shared, backend (tsc) y frontend (vite)
```

Al terminar tendrás:

- `backend/dist/` — código JS compilado
- `frontend/dist/` — assets estáticos del frontend

---

## 5. Configurar variables de entorno del backend

Crea `/var/www/censo-refugios/backend/.env` con valores **reales y seguros**:

```ini
# Base de datos
DATABASE_URL="postgresql://censo:UNA_CONTRASEÑA_MUY_SEGURA@localhost:5432/censo_refugios?schema=public"

# JWT — genera claves con: openssl rand -base64 64
JWT_ACCESS_SECRET="<CLASE_ALEATORIA_64_CHARS>"
JWT_REFRESH_SECRET="<OTRA_CLASE_ALEATORIA_64_CHARS>"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Servidor
PORT=4000
NODE_ENV="production"
CORS_ORIGIN="https://censo.tu-dominio.gob.ve"

# Bootstrap del administrador raíz (sólo se usa la primera vez que se ejecuta el seed)
ADMIN_CEDULA="V00000000"
ADMIN_NOMBRE="Administrador"
ADMIN_APELLIDO="Raiz"
ADMIN_PASSWORD="CambiaPorUnaClaveSegura123"
```

> **Importante**: cambia `ADMIN_PASSWORD` antes del primer arranque. Tras el
> seed, este usuario puede iniciar sesión y crear los demás.

### Permisos

```bash
chmod 600 /var/www/censo-refugios/backend/.env
```

---

## 6. Bootstrap de base de datos (crear BD + permisos + admin + migraciones)

```bash
cd /var/www/censo-refugios/backend
npm run db:bootstrap
```

Este único comando realiza, en orden, **todo** lo necesario para dejar la BD
lista para producción:

1. Conecta como superusuario (`PG_SUPERUSER_URL`).
2. Crea el rol de aplicación (`censo`, con la contraseña de `DATABASE_URL`) si
   no existe; le otorga el atributo `SUPERUSER` para simplificar la
   administración (la app ejecuta DDL para las migraciones Prisma).
3. Crea la base de datos `censo_refugios` con owner `censo` si no existe.
4. Reasigna el owner de la base y de los objetos del schema `public` al rol
   `censo`, y otorga los privilegios necesarios.
5. Aplica las migraciones Prisma pendientes (`prisma migrate deploy`).
6. Genera el Prisma Client (`prisma generate`).
7. Siembra el administrador raíz con las credenciales `ADMIN_*` del `.env`
   (idempotente: omite si ya existe).

> **Idempotente**: puedes ejecutarlo varias veces sin problemas. Útil para
> reinstalaciones y para CI/CD.
>
> **Variables requeridas** en `backend/.env`:
> - `DATABASE_URL` — URL que usará la app (incluye usuario/contraseña/bd).
> - `PG_SUPERUSER_URL` — URL del rol `postgres` u otro superusuario para crear
>   la BD. La app **no** usa esta URL en runtime.

Verifica el estado manualmente si lo necesitas:

```bash
npx prisma migrate status
psql "$DATABASE_URL" -c "\dt"
```

---

## 7. Arrancar el backend con PM2

Crea `/var/www/censo-refugios/backend/ecosystem.config.cjs`:

```js
module.exports = {
  apps: [
    {
      name: "censo-backend",
      cwd: "/var/www/censo-refugios/backend",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3016,
      },
      max_memory_restart: "300M",
      error_file: "/var/log/censo-refugios/backend-error.log",
      out_file: "/var/log/censo-refugios/backend-out.log",
      time: true,
    },
  ],
};
```

```bash
sudo mkdir -p /var/log/censo-refugios
sudo chown $USER:$USER /var/log/censo-refugios
cd /var/www/censo-refugios/backend
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup    # sigue las instrucciones que imprime (sudo env PATH=…)
```

Verifica que el backend responde:

```bash
curl http://localhost:4000/health
# → {"ok":true,"service":"censo-refugios-backend","env":"production",...}
```

Comandos PM2 útiles:

```bash
pm2 status                    # estado
pm2 logs censo-backend        # logs en vivo
pm2 restart censo-backend     # reiniciar
pm2 stop censo-backend        # detener
```

---

## 8. Servir el frontend con Nginx

El frontend es estático, así que Nginx lo sirve directamente.

Crea `/etc/nginx/sites-available/censo-refugios`:

```nginx
# Redirigir HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name censo.tu-dominio.gob.ve;

    # Para que certbot pueda emitir el certificado sin problemas
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name censo.tu-dominio.gob.ve;

    # Certificados (gestionados por certbot)
    ssl_certificate     /etc/letsencrypt/live/censo.tu-dominio.gob.ve/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/censo.tu-dominio.gob.ve/privkey.pem;

    # Cabeceras de seguridad recomendadas
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(self), microphone=()" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend estático
    root /var/www/censo-refugios/frontend/dist;
    index index.html;

    # SPA: cualquier ruta no-file cae al index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache agresivo de assets con hash (vite genera nombres con hash)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Proxy hacia el backend
    location /api/ {
        proxy_pass http://127.0.0.1:3016/api/;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host  $host;
        proxy_read_timeout 60s;
        client_max_body_size 10m;  # para fotos en base64
    }

    # Compresión
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;
}
```

Activa el sitio:

```bash
sudo ln -s /etc/nginx/sites-available/censo-refugios /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### HTTPS con Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d censo.tu-dominio.gob.ve
```

Certbot modificará el bloque `server` para añadir el `ssl_certificate` y
redirigir HTTP a HTTPS. Renueva automáticamente cada 60 días.

> **El servidor de destino no soporta Docker** (ver `AGENTS.md`), por eso esta
> guía usa el stack nativo (systemd + PM2 + Nginx).

---

## 9. Verificación post-despliegue

1. Abrir `https://censo.tu-dominio.gob.ve` en el navegador.
2. Iniciar sesión con las credenciales del admin raíz.
3. Crear al menos un refugio y un funcionario desde la sección **Usuarios**.
4. Cerrar sesión y volver a entrar con la cédula del funcionario creado.
5. Registrar un refugiado de prueba con foto y carnet. Escanear el QR del
   carnet con el móvil y comprobar que la página pública
   `/verificar/<token>` muestra los datos correctos.

### Endpoints de salud

| Endpoint | Esperado |
|----------|----------|
| `GET /health` | `{"ok":true,...}` |
| `GET /` | HTML del frontend |
| `GET /verificar/<token>` | JSON o página de verificación |

---

## 10. Backups de la base de datos

Crear un cron de respaldo diario. Añade a `/etc/cron.d/censo-backup`:

```cron
# Backup diario de la BD a las 03:00, conservando 14 días
0 3 * * * postgres pg_dump -U censo -Fc censo_refugios > /var/backups/censo/censo_$(date +\%Y\%m\%d).dump
0 4 * * * postgres find /var/backups/censo -name "censo_*.dump" -mtime +14 -delete
```

```bash
sudo mkdir -p /var/backups/censo
sudo chown postgres:postgres /var/backups/censo
```

Restaurar un backup:

```bash
pg_restore -U censo -d censo_refugios -c /var/backups/censo/censo_20260703.dump
```

---

## 11. Actualizar el sistema

```bash
cd /var/www/censo-refugios
git pull                       # o sube los nuevos artefactos
npm install                    # por si hay nuevas deps
npm run build
cd backend
npx prisma migrate deploy      # aplicar nuevas migraciones
pm2 restart censo-backend
sudo systemctl reload nginx    # sólo si cambió algo de nginx
```

> El frontend se sirve estático, así que un simple `npm run build` en el
> servidor lo actualiza. Si hay cambio en la configuración de Nginx, recarga.

---

## 12. Hardening recomendado

- **Rotar secretos** cada 6 meses (`JWT_*_SECRET`, password del admin).
- **Habilitar fail2ban** para Nginx y SSH.
- **Limitar acceso SSH** con clave pública y deshabilitar password login.
- **Configurar el firewall** (`ufw`) para exponer sólo 22, 80, 443.
- **Monitoreo**: usar un servicio externo (UptimeRobot, BetterStack, etc.)
  que haga ping a `/health` cada 5 minutos.
- **Logs centralizados**: instalar `pm2-logrotate` para que los logs no
  llenen el disco:

  ```bash
  pm2 install pm2-logrotate
  pm2 set pm2-logrotate:max_size 20M
  pm2 set pm2-logrotate:retain 14
  ```

---

## 13. Solución de problemas

| Síntoma | Causa probable | Solución |
|---------|---------------|----------|
| 502 Bad Gateway al abrir la app | Backend no está corriendo | `pm2 status` y `pm2 restart censo-backend` |
| `ECONNREFUSED 127.0.0.1:5432` | Postgres caído | `sudo systemctl restart postgresql` |
| Cámara no enciende en producción | Navegador exige HTTPS para `getUserMedia` | Asegúrate de servir por HTTPS; en HTTP no funcionará |
| QR del carnet no escanea | URL del QR es HTTP en un entorno HTTPS mixto | Verifica que la app se sirva sólo por HTTPS |
| Migración falla con "already exists" | La BD tiene cambios manuales | Revisa el SQL con `npx prisma migrate status` y resuelve manualmente |
| `prisma migrate deploy` falla con "permiso denegado" en BD heredada | El rol no es owner de la base o le faltan GRANTs | Ejecuta `npm run db:bootstrap` (es idempotente y reasigna permisos) |
| `pm2` se reinicia tras reboot del servidor | Falta el comando de startup | `pm2 startup && pm2 save` |

---

## Resumen de archivos críticos

| Archivo | Ubicación servidor | Permisos |
|---------|-------------------|----------|
| `.env` del backend | `/var/www/censo-refugios/backend/.env` | `600`, owner: usuario deploy |
| `dist/` backend | `/var/www/censo-refugios/backend/dist/` | lectura |
| `dist/` frontend | `/var/www/censo-refugios/frontend/dist/` | lectura para Nginx |
| Config Nginx | `/etc/nginx/sites-available/censo-refugios` | `644`, owner: root |
| Certificados | `/etc/letsencrypt/live/...` | `600`, owner: root |
| Logs backend | `/var/log/censo-refugios/` | owner: usuario deploy |
| Backups | `/var/backups/censo/` | owner: postgres |
