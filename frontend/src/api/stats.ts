import { api } from "./client";

export interface ResumenGlobal {
  totalRefugios: number;
  totalRefugiados: number;
  capacidadTotal: number;
  disponibles: number;
  porcentajeOcupacion: number;
  refugios: {
    id: string;
    nombre: string;
    capacidadEstimada: number;
    ocupacionActual: number;
    porcentajeOcupacion: number;
    disponibles: number;
  }[];
}

export interface StatsRefugio {
  refugioId: string;
  nombre: string;
  resumen: {
    totalRefugiados: number;
    jefesFamilia: number;
    familiares: number;
    conPatologia: number;
    capacidadEstimada: number;
    disponibles: number;
    porcentajeOcupacion: number;
  };
  porEtapaVida: { etapa: string; cantidad: number }[];
  porParentesco: { parentesco: string; cantidad: number }[];
  porEstatusVivienda: { estatus: string; cantidad: number }[];
  patologiasTop: { nombre: string; cantidad: number }[];
  sectoresMasAfectados: { sector: string; cantidad: number }[];
  estadosMasAfectados: { estado: string; cantidad: number }[];
  piramidePoblacional: { rango: string; cantidad: number }[];
}

export async function fetchStatsGlobal() {
  const { data } = await api.get<ResumenGlobal>("/stats");
  return data;
}

export async function fetchStatsRefugio(refugioId: string) {
  const { data } = await api.get<StatsRefugio>(`/stats/${refugioId}`);
  return data;
}
