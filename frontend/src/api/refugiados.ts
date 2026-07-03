import { api } from "./client";

export interface RefugiadoLista {
  id: string;
  refugioId: string;
  aulaId: string | null;
  origen: string;
  jefeFamilia: boolean;
  jefeFamiliaId: string | null;
  parentesco: string | null;
  nombre: string;
  apellido: string;
  nacionalidadCedula: string | null;
  cedula: string | null;
  telefono: string | null;
  edad: number;
  etapaVida: string;
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
  verificacionToken?: string | null;
  refugio?: { id: string; nombre: string };
  aula?: { id: string; nombre: string } | null;
  jefeFamiliaRef?: { id: string; nombre: string; apellido: string; cedula: string | null } | null;
  familiares?: {
    id: string;
    nombre: string;
    apellido: string;
    cedula: string | null;
    parentesco: string | null;
    edad: number;
  }[];
}

export interface ListaResponse {
  total: number;
  page: number;
  pageSize: number;
  items: RefugiadoLista[];
}

export interface JefeOption {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string | null;
  nacionalidadCedula: string | null;
  edad: number;
  refugio: { id: string; nombre: string };
}

export interface CrearRefugiadoPayload {
  refugioId: string;
  aulaId?: string | null;
  origen: string;
  jefeFamilia: boolean;
  jefeFamiliaId?: string | null;
  parentesco?: string | null;
  nombre: string;
  apellido: string;
  nacionalidadCedula?: string | null;
  cedula?: string | null;
  telefono?: string | null;
  edad: number;
  etapaVida: string;
  patologia: boolean;
  patologiaDescripcion?: string | null;
  foto?: string | null;
  estado: string;
  municipio: string;
  parroquia: string;
  sector: string;
  direccion: string;
  tipoVivienda: string;
  estatusPropiedad: string;
  estatusActual: string;
}

export interface RefugiadoCreado extends RefugiadoLista {
  foto: string | null;
  verificacionToken: string | null;
}

export async function fetchRefugiados(params: {
  refugioId?: string;
  page?: number;
  pageSize?: number;
  jefeFamilia?: boolean;
  buscar?: string;
  parentesco?: string;
  etapaVida?: string;
  estado?: string;
}) {
  const { data } = await api.get<ListaResponse>("/refugiados", { params });
  return data;
}

export async function fetchRefugiado(id: string) {
  const { data } = await api.get<RefugiadoLista>(`/refugiados/${id}`);
  return data;
}

export async function buscarJefes(q: string, refugioId: string) {
  const { data } = await api.get<JefeOption[]>("/refugiados/jefes/buscador", {
    params: { q, refugioId },
  });
  return data;
}

export async function crearRefugiado(payload: CrearRefugiadoPayload) {
  const { data } = await api.post<RefugiadoCreado>("/refugiados", payload);
  return data;
}

export async function fetchCarnet(id: string) {
  const { data } = await api.get<RefugiadoCreado>(`/refugiados/${id}/carnet`);
  return data;
}

export async function actualizarRefugiado(id: string, payload: Partial<CrearRefugiadoPayload>) {
  const { data } = await api.patch<RefugiadoLista>(`/refugiados/${id}`, payload);
  return data;
}

export async function eliminarRefugiado(id: string) {
  await api.delete(`/refugiados/${id}`);
}
