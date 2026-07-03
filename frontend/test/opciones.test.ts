import { describe, it, expect } from "vitest";
import { etapaVidaPorEdad } from "../src/utils/opciones";

describe("etapaVidaPorEdad", () => {
  it("clasifica primera infancia (0-6)", () => {
    expect(etapaVidaPorEdad(0)).toBe("primera_infancia");
    expect(etapaVidaPorEdad(6)).toBe("primera_infancia");
  });

  it("clasifica infancia (7-12)", () => {
    expect(etapaVidaPorEdad(7)).toBe("infancia");
    expect(etapaVidaPorEdad(12)).toBe("infancia");
  });

  it("clasifica adolescencia (13-17)", () => {
    expect(etapaVidaPorEdad(15)).toBe("adolescencia");
    expect(etapaVidaPorEdad(17)).toBe("adolescencia");
  });

  it("clasifica juventud (18-25)", () => {
    expect(etapaVidaPorEdad(18)).toBe("juventud");
    expect(etapaVidaPorEdad(25)).toBe("juventud");
  });

  it("clasifica adultez (26-59)", () => {
    expect(etapaVidaPorEdad(26)).toBe("adultez");
    expect(etapaVidaPorEdad(59)).toBe("adultez");
  });

  it("clasifica vejez (60+)", () => {
    expect(etapaVidaPorEdad(60)).toBe("vejez");
    expect(etapaVidaPorEdad(95)).toBe("vejez");
  });
});
