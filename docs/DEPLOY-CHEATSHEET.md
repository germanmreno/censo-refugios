# Cheat sheet — despliegue rápido del Censo de Refugios

> Asume un servidor **Ubuntu 22.04 / Debian 12** recién provisionado, acceso a
> `root` (o `sudo`), y un dominio apuntando al servidor.
>
> El backend escucha en `:3016` y el frontend en `:3017`. Nginx hace de
> reverse proxy en `:80/443`.

---

## 0. Una sola vez: editar credenciales reales

Antes de clonar, abre `backend/.env.example` (o crea `backend/.env` en local)
y rellena:

```ini
JWT_ACCESS_SECRET="..."        # openssl rand -base64 48
JWT_REFRESH_SECRET="..."       # openssl rand -base64 48
ADMIN_PASSWORD="..."           # la que usarás el primer login
PG_SUPERUSER_URL="postgresql://postgres:TU_PASSWORD_POSTGRES@localhost:5432/postgres"
```

(O el equipo ya las rellenó por ti: la `backend/.env` del repo trae valores
seguros; basta sobreescribir lo que aplique al servidor real.)

---

## 1. Instalar dependencias del sistema

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx postgresql postgresql-contrib
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
node --version && npm --version && pm2 --version
```

---

## 2. Clonar y compilar

```bash
sudo mkdir -p /var/www/censo-refugios
sudo chown $USER:www-data /var/www/censo-refugios
cd /var/www/censo-refugios
git clone <URL_DEL_REPO> .

# Instalar TODO (root + backend + frontend + shared) y compilar
npm install
npm run build
```

---

## 3. Ajustar el `.env` de producción

```bash
nano /var/www/censo-refugios/backend/.env
```

Verifica que estos puntos sean correctos (el resto ya viene listo):

```ini
PORT=3016
NODE_ENV="production"
CORS_ORIGIN="https://censo.tu-dominio.gob.ve"   # o http:// si sólo pruebas
DATABASE_URL="postgresql://censo:...@localhost:5432/censo_refugios?schema=public"
PG_SUPERUSER_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/postgres"
ADMIN_PASSWORD="..."
```

Protege el archivo:

```bash
chmod 600 /var/www/censo-refugios/backend/.env
```

---

## 4. Bootstrap de base de datos (un solo comando)

```bash
cd /var/www/censo-refugios/backend
npm run db:bootstrap
```

Esto hace, en orden:

1. Crea el rol `censo` con `SUPERUSER` (si no existe)
2. Crea la base `censo_refugios` con owner `censo`
3. Reasigna permisos a objetos existentes
4. Aplica las migraciones Prisma
5. Genera el Prisma Client
6. Siembra el administrador raíz con las credenciales `ADMIN_*` del `.env`

> **Idempotente**: correlo varias veces sin miedo. Útil en reinstalaciones.

Salida esperada al final:

```
[bootstrap] ✔ Base de datos lista. Ya puedes arrancar el backend.
```

---

## 5. Arrancar el backend con PM2

```bash
sudo mkdir -p /var/log/censo-refugios
sudo chown $USER:$USER /var/log/censo-refugios

cd /var/www/censo-refugios/backend
pm2 start ecosystem.config.cjs       # usa ecosystem.config.cjs
pm2 save                             # guarda la lista de procesos
pm2 startup                          # sigue el comando sudo que imprime
```

Verifica que responde:

```bash
curl http://localhost:3016/health
# → {"ok":true,"service":"censo-refugios-backend","env":"production",...}
```

Comandos PM2 del día a día:

```bash
pm2 status
pm2 logs censo-backend
pm2 restart censo-backend
pm2 stop censo-backend
```

---

## 6. Servir el frontend con Nginx

El frontend ya está compilado en `frontend/dist/`. Sólo hay que decirle a
Nginx dónde encontrarlo.

`/etc/nginx/sites-available/censo-refugios`:

```nginx
server {
    listen 80;
    server_name censo.tu-dominio.gob.ve;

    location /.well-known/acme-challenge/ { root /var/www/html; }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name censo.tu-dominio.gob.ve;

    ssl_certificate     /etc/letsencrypt/live/censo.tu-dominio.gob.ve/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/censo.tu-dominio.gob.ve/privkey.pem;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(self), microphone=()" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    root /var/www/censo-refugios/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3016/api/;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host  $host;
        proxy_read_timeout 60s;
        client_max_body_size 10m;
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml application/json application/javascript image/svg+xml;
}
```

Activar:

```bash
sudo ln -s /etc/nginx/sites-available/censo-refugios /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 7. HTTPS con Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d censo.tu-dominio.gob.ve
```

Certbot rellena automáticamente los `ssl_certificate` y la redirección 80→443.

> La cámara web (`getUserMedia`) **requiere HTTPS** en navegadores modernos.
> En `http://` no funcionará.

---

## 8. Firewall mínimo

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## 9. Verificación end-to-end

```bash
# Backend
curl http://localhost:3016/health

# Frontend (HTTP → debería redirigir a HTTPS)
curl -I http://censo.tu-dominio.gob.ve

# Página pública de verificación (sin auth)
curl -I https://censo.tu-dominio.gob.ve/verificar/algún-token-real
```

En el navegador:

1. Abre `https://censo.tu-dominio.gob.ve` → debería servir el frontend.
2. Inicia sesión con la cédula y contraseña del admin raíz (`ADMIN_*`).
3. Crea un refugio y un funcionario desde la sección **Usuarios**.
4. Registra un refugiado con foto → genera el carnet → escanea el QR con el
   móvil y comprueba que `/verificar/<token>` muestra los datos correctos.

---

## 10. Actualizar el sistema (cada deploy)

```bash
cd /var/www/censo-refugios
git pull
npm install
npm run build
cd backend && npm run db:bootstrap        # aplica migraciones nuevas (idempotente)
pm2 restart censo-backend
sudo systemctl reload nginx              # sólo si cambió config de nginx
```

---

## TL;DR — secuencia completa

```bash
# 1. Sistema
sudo apt update && sudo apt install -y curl git nginx postgresql
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs && sudo npm install -g pm2

# 2. Código
sudo mkdir -p /var/www/censo-refugios && sudo chown $USER /var/www/censo-refugios
cd /var/www/censo-refugios && git clone <URL> . && npm install && npm run build

# 3. Configurar y arrancar
nano backend/.env                         # PORT=3016, secretos, etc.
chmod 600 backend/.env
cd backend && npm run db:bootstrap        # rol + BD + migraciones + admin
pm2 start ecosystem.config.cjs && pm2 save && pm2 startup

# 4. Nginx + HTTPS
sudo nano /etc/nginx/sites-available/censo-refugios   # pegar el bloque de arriba
sudo ln -s /etc/nginx/sites-available/censo-refugios /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d censo.tu-dominio.gob.ve
```

Si todo salió bien, en menos de 10 minutos deberías estar viendo el frontend
en `https://censo.tu-dominio.gob.ve`.
