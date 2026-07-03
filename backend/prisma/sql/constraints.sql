-- Constraints adicionales sobre refugiados
-- Refuerzan la lógica de jefe de familia (incluye "independiente") y de patología

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
