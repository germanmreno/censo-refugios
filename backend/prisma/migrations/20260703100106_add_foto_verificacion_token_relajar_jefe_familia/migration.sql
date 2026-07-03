-- Censo de Refugios — Migración 20260703100106
-- Añade foto y verificacion_token a refugiados, y relaja la restricción
-- de jefe de familia para permitir la nueva opción "Independiente"
-- (persona sola, no es jefe, no tiene jefe asignado).

ALTER TABLE refugiados
  ADD COLUMN foto TEXT,
  ADD COLUMN verificacion_token TEXT;

CREATE UNIQUE INDEX refugiados_verificacion_token_key
  ON refugiados (verificacion_token)
  WHERE verificacion_token IS NOT NULL;

ALTER TABLE refugiados
  DROP CONSTRAINT IF EXISTS chk_jefe_familia;

-- Nueva regla:
--  - Si jefe_familia = true: NO debe traer jefe_familia_id ni parentesco
--  - Si jefe_familia = false: si trae jefe_familia_id, debe traer parentesco
--    (y viceversa); ambos nulos = persona independiente, válido
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
