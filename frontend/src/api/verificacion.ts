import { api } from "./client";

export interface FamiliarPublico {
  id: string;
  nombre: string;
  apellido: string;
  nacionalidadCedula: string | null;
  cedula: string | null;
  edad: number;
  etapaVida: string;
  parentesco: string | null;
  tipoSangre: string | null;
  numeroBrazalete: string | null;
  foto: string | null;
  patologia: boolean;
  patologiaDescripcion: string | null;
}

export interface MascotaPublica {
  id: string;
  tipo: string;
  color: string | null;
  tieneIdentificador: boolean;
  foto: string | null;
}

export interface RefugiadoVerificacion {
  id: string;
  nombre: string;
  apellido: string;
  nacionalidadCedula: string | null;
  cedula: string | null;
  edad: number;
  etapaVida: string;
  tipoSangre: string | null;
  numeroBrazalete: string | null;
  telefono: string | null;
  foto: string | null;
  origen: string;
  jefeFamilia: boolean;
  parentesco: string | null;
  patologia: boolean;
  patologiaDescripcion: string | null;
  estado: string;
  municipio: string;
  parroquia: string;
  sector: string;
  direccion: string;
  tipoVivienda: string;
  estatusPropiedad: string;
  estatusActual: string;
  refugio: { id: string; nombre: string; ubicacion: string };
  aula: { id: string; nombre: string } | null;
  jefeFamiliaRef: { id: string; nombre: string; apellido: string; cedula: string | null } | null;
  familiares: FamiliarPublico[];
  mascota: MascotaPublica | null;
}

export interface VerificacionResponse {
  valid: boolean;
  emitidoEn?: string;
  error?: string;
  refugiado?: RefugiadoVerificacion;
}

export async function fetchVerificacion(token: string) {
  const { data } = await api.get<VerificacionResponse>(`/verificar/${encodeURIComponent(token)}`);
  return data;
}
