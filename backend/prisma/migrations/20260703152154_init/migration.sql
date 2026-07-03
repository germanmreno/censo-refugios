-- Censo de Refugios — Migración inicial completa
-- Incluye: Centro→Modulo→Aula, tipoSangre, brazalete, mascotas

-- CreateTable Usuario
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'funcionario',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_cedula_key" ON "usuarios"("cedula");

-- CreateTable UsuarioRefugio
CREATE TABLE "usuario_refugios" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "refugio_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usuario_refugios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_refugios_usuario_id_refugio_id_key" ON "usuario_refugios"("usuario_id", "refugio_id");
CREATE INDEX "usuario_refugios_refugio_id_idx" ON "usuario_refugios"("refugio_id");

-- CreateTable Refugio (Centro)
CREATE TABLE "refugios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "capacidad_estimada" INTEGER NOT NULL,
    "ubicacion" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "refugios_pkey" PRIMARY KEY ("id")
);

-- CreateTable Modulo
CREATE TABLE "modulos" (
    "id" TEXT NOT NULL,
    "refugio_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "modulos_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "modulos_refugio_id_idx" ON "modulos"("refugio_id");

-- CreateTable Aula (pertenece a un Modulo)
CREATE TABLE "aulas" (
    "id" TEXT NOT NULL,
    "modulo_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "capacidad" INTEGER,
    CONSTRAINT "aulas_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "aulas_modulo_id_idx" ON "aulas"("modulo_id");

-- CreateTable Refugiado (Afectado) — tabla central del censo
CREATE TABLE "refugiados" (
    "id" TEXT NOT NULL,
    "refugio_id" TEXT NOT NULL,
    "aula_id" TEXT,
    "origen" TEXT NOT NULL,
    "jefe_familia" BOOLEAN NOT NULL,
    "jefe_familia_id" TEXT,
    "parentesco" TEXT,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "nacionalidad_cedula" TEXT,
    "cedula" TEXT,
    "telefono" TEXT,
    "edad" INTEGER NOT NULL,
    "etapa_vida" TEXT NOT NULL,
    "numero_brazalete" TEXT,
    "tipo_sangre" TEXT,
    "patologia" BOOLEAN NOT NULL DEFAULT false,
    "patologia_descripcion" TEXT,
    "foto" TEXT,
    "verificacion_token" TEXT,
    "estado" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "parroquia" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "tipo_vivienda" TEXT NOT NULL,
    "estatus_propiedad" TEXT NOT NULL,
    "estatus_actual" TEXT NOT NULL,
    "registrado_por" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "refugiados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex para Refugiados
CREATE INDEX "refugiados_refugio_id_idx" ON "refugiados"("refugio_id");
CREATE INDEX "refugiados_jefe_familia_id_idx" ON "refugiados"("jefe_familia_id");
CREATE INDEX "refugiados_estado_municipio_parroquia_idx" ON "refugiados"("estado", "municipio", "parroquia");
CREATE INDEX "refugiados_registrado_por_idx" ON "refugiados"("registrado_por");
CREATE UNIQUE INDEX "refugiados_verificacion_token_key" ON "refugiados"("verificacion_token") WHERE "verificacion_token" IS NOT NULL;
-- Brazalete único por centro
CREATE UNIQUE INDEX "refugiados_brazalete_centro_key" ON "refugiados"("refugio_id", "numero_brazalete") WHERE "numero_brazalete" IS NOT NULL;

-- CreateTable Mascota
CREATE TABLE "mascotas" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "color" TEXT,
    "tiene_identificador" BOOLEAN NOT NULL DEFAULT false,
    "foto" TEXT,
    "afectado_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mascotas_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mascotas_afectado_id_idx" ON "mascotas"("afectado_id");
CREATE UNIQUE INDEX "mascotas_afectado_id_key" ON "mascotas"("afectado_id");

-- CreateTable Auditoria
CREATE TABLE "auditoria" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "auditoria_usuario_id_idx" ON "auditoria"("usuario_id");
CREATE INDEX "auditoria_created_at_idx" ON "auditoria"("created_at");

-- Foreign Keys
-- UsuarioRefugio
ALTER TABLE "usuario_refugios" ADD CONSTRAINT "usuario_refugios_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usuario_refugios" ADD CONSTRAINT "usuario_refugios_refugio_id_fkey" FOREIGN KEY ("refugio_id") REFERENCES "refugios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Modulos
ALTER TABLE "modulos" ADD CONSTRAINT "modulos_refugio_id_fkey" FOREIGN KEY ("refugio_id") REFERENCES "refugios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Aulas
ALTER TABLE "aulas" ADD CONSTRAINT "aulas_modulo_id_fkey" FOREIGN KEY ("modulo_id") REFERENCES "modulos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Refugiados
ALTER TABLE "refugiados" ADD CONSTRAINT "refugiados_refugio_id_fkey" FOREIGN KEY ("refugio_id") REFERENCES "refugios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refugiados" ADD CONSTRAINT "refugiados_aula_id_fkey" FOREIGN KEY ("aula_id") REFERENCES "aulas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "refugiados" ADD CONSTRAINT "refugiados_jefe_familia_id_fkey" FOREIGN KEY ("jefe_familia_id") REFERENCES "refugiados"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "refugiados" ADD CONSTRAINT "refugiados_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Mascotas
ALTER TABLE "mascotas" ADD CONSTRAINT "mascotas_afectado_id_fkey" FOREIGN KEY ("afectado_id") REFERENCES "refugiados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Auditoria
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Constraints adicionales sobre refugiados (Afectados)
ALTER TABLE refugiados
  ADD CONSTRAINT chk_jefe_familia
  CHECK (
    (jefe_familia = true AND jefe_familia_id IS NULL AND parentesco IS NULL)
    OR
    (jefe_familia = false AND (
      (jefe_familia_id IS NULL AND parentesco IS NULL)
      OR
      (jefe_familia_id IS NOT NULL AND parentesco IS NOT NULL)
    ))
  );

ALTER TABLE refugiados
  ADD CONSTRAINT chk_patologia_desc
  CHECK (patologia = false OR (patologia_descripcion IS NOT NULL AND patologia_descripcion <> ''));
