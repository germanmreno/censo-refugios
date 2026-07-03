# Guía para agentes — Censo de Refugios

## Comandos a ejecutar tras editar código

```bash
# Typecheck (ambos workspaces)
npm run typecheck

# Lint
npm run lint

# Tests
npm run test

# En desarrollo, backend y frontend corren en watch en :4000 y :5173
npm run dev
```

## Estructura del monorepo

- `backend/` — Express + Prisma (ESM, TypeScript). Rutas bajo `/api`.
- `frontend/` — React + Vite + Recharts. Proxy `/api` → `:4000`.
- `shared/` — Tipos, enums y dataset geo. Importable como `shared` desde ambos (declarado `type: module`).

## Convenciones

- Backend: ESM con extensión `.js` en imports relativos. Prisma para SQL. Zod para validación (esquemas en `src/schemas/`, testeables).
- Frontend: alias `@` → `src`. Estilos inline con objetos `CSSProperties` (sin framework CSS). Componentes UI reutilizables en `components/FormFields.tsx`, `Modal.tsx`, `CapacidadBar.tsx`.
- Auth: access token en memoria + refresh en cookie httpOnly. El interceptor de `api/client.ts` refresca automáticamente ante 401.
- Aislamiento por refugio: el funcionario sólo ve sus refugios (helper `refugiosVisiblesIds` / `verificarAccesoRefugio` en `backend/src/services/refugioAccess.ts`).

## Base de datos

- PostgreSQL local. Migraciones Prisma en `backend/prisma/migrations/`. Constraints `CHECK` adicionales en `backend/prisma/sql/`.
- Para cambiar el esquema: editar `schema.prisma`, crear migración a mano (entorno no interactivo) y `npx prisma migrate deploy && npx prisma generate` desde `backend/`.

## No usar

- Docker (el servidor de destino no lo soporta).
- Frameworks CSS; usar estilos inline consistentes con los existentes.
- Comentarios en el código salvo que se pidan explícitamente.
