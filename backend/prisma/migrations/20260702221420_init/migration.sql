-- CreateTable
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

-- CreateTable
CREATE TABLE "usuario_refugios" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "refugio_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_refugios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refugios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "capacidad_estimada" INTEGER NOT NULL,
    "ubicacion" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refugios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aulas" (
    "id" TEXT NOT NULL,
    "refugio_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "capacidad" INTEGER,

    CONSTRAINT "aulas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "patologia" BOOLEAN NOT NULL DEFAULT false,
    "patologia_descripcion" TEXT,
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

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_cedula_key" ON "usuarios"("cedula");

-- CreateIndex
CREATE INDEX "usuario_refugios_refugio_id_idx" ON "usuario_refugios"("refugio_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_refugios_usuario_id_refugio_id_key" ON "usuario_refugios"("usuario_id", "refugio_id");

-- CreateIndex
CREATE INDEX "aulas_refugio_id_idx" ON "aulas"("refugio_id");

-- CreateIndex
CREATE INDEX "refugiados_refugio_id_idx" ON "refugiados"("refugio_id");

-- CreateIndex
CREATE INDEX "refugiados_jefe_familia_id_idx" ON "refugiados"("jefe_familia_id");

-- CreateIndex
CREATE INDEX "refugiados_estado_municipio_parroquia_idx" ON "refugiados"("estado", "municipio", "parroquia");

-- CreateIndex
CREATE INDEX "refugiados_registrado_por_idx" ON "refugiados"("registrado_por");

-- CreateIndex
CREATE INDEX "auditoria_usuario_id_idx" ON "auditoria"("usuario_id");

-- CreateIndex
CREATE INDEX "auditoria_created_at_idx" ON "auditoria"("created_at");

-- AddForeignKey
ALTER TABLE "usuario_refugios" ADD CONSTRAINT "usuario_refugios_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_refugios" ADD CONSTRAINT "usuario_refugios_refugio_id_fkey" FOREIGN KEY ("refugio_id") REFERENCES "refugios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aulas" ADD CONSTRAINT "aulas_refugio_id_fkey" FOREIGN KEY ("refugio_id") REFERENCES "refugios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refugiados" ADD CONSTRAINT "refugiados_refugio_id_fkey" FOREIGN KEY ("refugio_id") REFERENCES "refugios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refugiados" ADD CONSTRAINT "refugiados_aula_id_fkey" FOREIGN KEY ("aula_id") REFERENCES "aulas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refugiados" ADD CONSTRAINT "refugiados_jefe_familia_id_fkey" FOREIGN KEY ("jefe_familia_id") REFERENCES "refugiados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refugiados" ADD CONSTRAINT "refugiados_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Constraints adicionales
-- Constraints adicionales sobre refugiados
-- Refuerzan la lógica de jefe de familia y de patología

ALTER TABLE refugiados
  ADD CONSTRAINT chk_jefe_familia
  CHECK (jefe_familia = true OR (jefe_familia_id IS NOT NULL AND parentesco IS NOT NULL));

ALTER TABLE refugiados
  ADD CONSTRAINT chk_patologia_desc
  CHECK (patologia = false OR (patologia_descripcion IS NOT NULL AND patologia_descripcion <> ''));

