import { describe, it, expect } from "vitest";
import { crearRefugiadoSchema, actualizarRefugiadoSchema } from "../src/schemas/refugiado.js";

const baseValid = {
  refugioId: "00000000-0000-0000-0000-000000000001",
  origen: "Caracas",
  jefeFamilia: true,
  nombre: "Carlos",
  apellido: "Perez",
  edad: 35,
  etapaVida: "adultez",
  patologia: false,
  estado: "Distrito Capital",
  municipio: "Libertador",
  parroquia: "Catedral",
  sector: "Centro",
  direccion: "Calle 1 casa 2",
  tipoVivienda: "casa",
  estatusPropiedad: "propia",
  estatusActual: "sin_riesgo",
};

describe("crearRefugiadoSchema", () => {
  it("acepta un jefe de familia válido", () => {
    const r = crearRefugiadoSchema.safeParse(baseValid);
    expect(r.success).toBe(true);
  });

  it("rechaza un no-jefe con estado mixto (solo uno de jefeFamiliaId o parentesco)", () => {
    const r1 = crearRefugiadoSchema.safeParse({
      ...baseValid,
      jefeFamilia: false,
      jefeFamiliaId: "00000000-0000-0000-0000-000000000002",
      parentesco: null,
    });
    const r2 = crearRefugiadoSchema.safeParse({
      ...baseValid,
      jefeFamilia: false,
      jefeFamiliaId: null,
      parentesco: "hijo",
    });
    expect(r1.success).toBe(false);
    expect(r2.success).toBe(false);
  });

  it("acepta un no-jefe con jefeFamiliaId y parentesco (familiar)", () => {
    const r = crearRefugiadoSchema.safeParse({
      ...baseValid,
      jefeFamilia: false,
      jefeFamiliaId: "00000000-0000-0000-0000-000000000002",
      parentesco: "hijo",
    });
    expect(r.success).toBe(true);
  });

  it("acepta un refugiado independiente (sin jefe, sin parentesco)", () => {
    const r = crearRefugiadoSchema.safeParse({
      ...baseValid,
      jefeFamilia: false,
      jefeFamiliaId: null,
      parentesco: null,
    });
    expect(r.success).toBe(true);
  });

  it("rechaza un jefe que trae parentesco", () => {
    const r = crearRefugiadoSchema.safeParse({
      ...baseValid,
      jefeFamilia: true,
      parentesco: "hijo",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza no-jefe con solo uno de jefeFamiliaId o parentesco", () => {
    const r1 = crearRefugiadoSchema.safeParse({
      ...baseValid,
      jefeFamilia: false,
      jefeFamiliaId: "00000000-0000-0000-0000-000000000002",
      parentesco: null,
    });
    const r2 = crearRefugiadoSchema.safeParse({
      ...baseValid,
      jefeFamilia: false,
      jefeFamiliaId: null,
      parentesco: "hijo",
    });
    expect(r1.success).toBe(false);
    expect(r2.success).toBe(false);
  });

  it("rechaza patologia=true sin descripción", () => {
    const r = crearRefugiadoSchema.safeParse({ ...baseValid, patologia: true });
    expect(r.success).toBe(false);
  });

  it("acepta patologia=true con descripción", () => {
    const r = crearRefugiadoSchema.safeParse({
      ...baseValid,
      patologia: true,
      patologiaDescripcion: "Hipertensión",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza edad negativa o no entera", () => {
    expect(crearRefugiadoSchema.safeParse({ ...baseValid, edad: -1 }).success).toBe(false);
    expect(crearRefugiadoSchema.safeParse({ ...baseValid, edad: 1.5 }).success).toBe(false);
    expect(crearRefugiadoSchema.safeParse({ ...baseValid, edad: 200 }).success).toBe(false);
  });

  it("rechaza valores de enum inválidos", () => {
    expect(
      crearRefugiadoSchema.safeParse({ ...baseValid, etapaVida: "no_existe" }).success,
    ).toBe(false);
    expect(
      crearRefugiadoSchema.safeParse({ ...baseValid, tipoVivienda: "mansión" }).success,
    ).toBe(false);
  });
});

describe("actualizarRefugiadoSchema", () => {
  it("acepta un payload parcial", () => {
    const r = actualizarRefugiadoSchema.safeParse({ nombre: "Nuevo nombre" });
    expect(r.success).toBe(true);
  });

  it("acepta payload vacío", () => {
    const r = actualizarRefugiadoSchema.safeParse({});
    expect(r.success).toBe(true);
  });
});
