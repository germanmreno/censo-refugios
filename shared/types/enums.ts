export const RolUsuario = {
  FUNCIONARIO: "funcionario",
  ADMINISTRADOR: "administrador",
} as const;
export type RolUsuario = (typeof RolUsuario)[keyof typeof RolUsuario];

export const NacionalidadCedula = {
  V: "V",
  E: "E",
} as const;
export type NacionalidadCedula = (typeof NacionalidadCedula)[keyof typeof NacionalidadCedula];

export const Parentesco = {
  CONYUGE: "conyuge",
  HIJO: "hijo",
  SOBRINO: "sobrino",
  FAMILIAR: "familiar",
} as const;
export type Parentesco = (typeof Parentesco)[keyof typeof Parentesco];

export const EtapaVida = {
  PRIMERA_INFANCIA: "primera_infancia",
  INFANCIA: "infancia",
  ADOLESCENCIA: "adolescencia",
  JUVENTUD: "juventud",
  ADULTEZ: "adultez",
  VEJEZ: "vejez",
} as const;
export type EtapaVida = (typeof EtapaVida)[keyof typeof EtapaVida];

export const TipoVivienda = {
  CASA: "casa",
  APARTAMENTO: "apartamento",
  RANCHO: "rancho",
  OTROS: "otros",
} as const;
export type TipoVivienda = (typeof TipoVivienda)[keyof typeof TipoVivienda];

export const EstatusPropiedad = {
  PROPIA: "propia",
  ALQUILADA: "alquilada",
  PRESTADA: "prestada",
  OTROS: "otros",
} as const;
export type EstatusPropiedad = (typeof EstatusPropiedad)[keyof typeof EstatusPropiedad];

export const EstatusActual = {
  AGRIETADA: "agrietada",
  ALTO_RIESGO: "alto_riesgo",
  RIESGO_LEVE: "riesgo_leve",
  SIN_RIESGO: "sin_riesgo",
} as const;
export type EstatusActual = (typeof EstatusActual)[keyof typeof EstatusActual];

export const TipoSangre = {
  O_POSITIVO: "O+",
  O_NEGATIVO: "O-",
  A_POSITIVO: "A+",
  A_NEGATIVO: "A-",
  B_POSITIVO: "B+",
  B_NEGATIVO: "B-",
  AB_POSITIVO: "AB+",
  AB_NEGATIVO: "AB-",
  NO_SABE: "no_sabe",
} as const;
export type TipoSangre = (typeof TipoSangre)[keyof typeof TipoSangre];

export const TipoMascota = {
  PERRO: "perro",
  GATO: "gato",
  AVE: "ave",
  CONEJO: "conejo",
  TORTUGA: "tortuga",
  OTROS: "otros",
} as const;
export type TipoMascota = (typeof TipoMascota)[keyof typeof TipoMascota];
