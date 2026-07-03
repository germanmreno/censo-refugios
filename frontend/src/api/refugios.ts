import { api } from "./client";

export interface Aula {
  id: string;
  nombre: string;
  capacidad: number | null;
}

export interface Refugio {
  id: string;
  nombre: string;
  capacidadEstimada: number;
  ubicacion: string;
  ocupacionActual: number;
  aulas: Aula[];
}

export interface RefugioDetalle extends Refugio {
  createdAt: string;
  updatedAt: string;
}

export interface Ocupacion {
  refugioId: string;
  nombre: string;
  capacidadEstimada: number;
  ocupacionActual: number;
  jefesFamilia: number;
  sinAula: number;
  disponibles: number;
  porcentajeOcupacion: number;
  aulas: {
    id: string;
    nombre: string;
    capacidad: number | null;
    ocupacion: number;
    disponibles: number | null;
  }[];
}

export async function fetchRefugios() {
  const { data } = await api.get<Refugio[]>("/refugios");
  return data;
}

export async function fetchRefugio(id: string) {
  const { data } = await api.get<RefugioDetalle>(`/refugios/${id}`);
  return data;
}

export async function fetchOcupacion(id: string) {
  const { data } = await api.get<Ocupacion>(`/refugios/${id}/ocupacion`);
  return data;
}

export interface CrearRefugioPayload {
  nombre: string;
  capacidadEstimada: number;
  ubicacion: string;
  aulas?: { nombre: string; capacidad?: number }[];
}

export async function crearRefugio(payload: CrearRefugioPayload) {
  const { data } = await api.post<RefugioDetalle>("/refugios", payload);
  return data;
}

export async function actualizarRefugio(id: string, payload: Partial<CrearRefugioPayload>) {
  const { data } = await api.patch<RefugioDetalle>(`/refugios/${id}`, payload);
  return data;
}

export async function eliminarRefugio(id: string) {
  await api.delete(`/refugios/${id}`);
}

export async function crearAula(refugioId: string, payload: { nombre: string; capacidad?: number }) {
  const { data } = await api.post<Aula>(`/refugios/${refugioId}/aulas`, payload);
  return data;
}

export async function eliminarAula(refugioId: string, aulaId: string) {
  await api.delete(`/refugios/${refugioId}/aulas/${aulaId}`);
}
