export const PARENTESCO_OPTIONS = [
  { value: "conyuge", label: "Cónyuge" },
  { value: "hijo", label: "Hijo/a" },
  { value: "sobrino", label: "Sobrino/a" },
  { value: "familiar", label: "Familiar" },
];

export const ETAPA_VIDA_OPTIONS = [
  { value: "primera_infancia", label: "Primera infancia (0-6)" },
  { value: "infancia", label: "Infancia (7-12)" },
  { value: "adolescencia", label: "Adolescencia (13-17)" },
  { value: "juventud", label: "Juventud (18-25)" },
  { value: "adultez", label: "Adultez (26-59)" },
  { value: "vejez", label: "Vejez (60+)" },
];

export const TIPO_VIVIENDA_OPTIONS = [
  { value: "casa", label: "Casa" },
  { value: "apartamento", label: "Apartamento" },
  { value: "rancho", label: "Rancho" },
  { value: "otros", label: "Otros" },
];

export const ESTATUS_PROPIEDAD_OPTIONS = [
  { value: "propia", label: "Propia" },
  { value: "alquilada", label: "Alquilada" },
  { value: "prestada", label: "Prestada" },
  { value: "otros", label: "Otros" },
];

export const ESTATUS_ACTUAL_OPTIONS = [
  { value: "agrietada", label: "Agrietada" },
  { value: "alto_riesgo", label: "Alto riesgo" },
  { value: "riesgo_leve", label: "Riesgo leve" },
  { value: "sin_riesgo", label: "Sin riesgo" },
];

export function etapaVidaPorEdad(edad: number): string {
  if (edad <= 6) return "primera_infancia";
  if (edad <= 12) return "infancia";
  if (edad <= 17) return "adolescencia";
  if (edad <= 25) return "juventud";
  if (edad <= 59) return "adultez";
  return "vejez";
}
