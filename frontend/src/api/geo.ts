import { api } from "./client";

export interface GeoItem {
  id: string;
  nombre: string;
}

export async function fetchEstados() {
  const { data } = await api.get<GeoItem[]>("/geo/estados");
  return data;
}

export async function fetchMunicipios(estadoId: string) {
  const { data } = await api.get<GeoItem[]>("/geo/municipios", { params: { estadoId } });
  return data;
}

export async function fetchParroquias(estadoId: string, municipioId: string) {
  const { data } = await api.get<GeoItem[]>("/geo/parroquias", {
    params: { estadoId, municipioId },
  });
  return data;
}
