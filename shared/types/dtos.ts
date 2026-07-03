import type {
  RolUsuario,
  NacionalidadCedula,
  Parentesco,
  EtapaVida,
  TipoVivienda,
  EstatusPropiedad,
  EstatusActual,
} from "./enums";

export interface LoginDto {
  cedula: string;
  password: string;
}

export interface TokensDto {
  accessToken: string;
  refreshToken: string;
}

export interface AccessTokenPayload {
  sub: string;
  cedula: string;
  rol: RolUsuario;
  refugiosPermitidos: string[];
}

export interface CrearUsuarioDto {
  nombre: string;
  apellido: string;
  cedula: string;
  password: string;
  rol: RolUsuario;
  refugioIds: string[];
}

export interface CrearRefugioDto {
  nombre: string;
  capacidadEstimada: number;
  ubicacion: string;
  aulas?: { nombre: string; capacidad?: number }[];
}

export interface CrearRefugiadoDto {
  refugioId: string;
  aulaId?: string | null;
  origen: string;
  jefeFamilia: boolean;
  jefeFamiliaId?: string | null;
  parentesco?: Parentesco | null;
  nombre: string;
  apellido: string;
  nacionalidadCedula?: NacionalidadCedula | null;
  cedula?: string | null;
  telefono?: string | null;
  edad: number;
  etapaVida: EtapaVida;
  patologia: boolean;
  patologiaDescripcion?: string | null;
  estado: string;
  municipio: string;
  parroquia: string;
  sector: string;
  direccion: string;
  tipoVivienda: TipoVivienda;
  estatusPropiedad: EstatusPropiedad;
  estatusActual: EstatusActual;
}
