import { api } from "./client";

export interface UsuarioRefugio {
  refugioId: string;
  refugio: { id: string; nombre: string };
}

export interface Usuario {
  id: string;
  cedula: string;
  nombre: string;
  apellido: string;
  rol: "funcionario" | "administrador";
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
  refugiosPermitidos: UsuarioRefugio[];
}

export interface CrearUsuarioPayload {
  nombre: string;
  apellido: string;
  cedula: string;
  password: string;
  rol: "funcionario" | "administrador";
  refugioIds: string[];
}

export type ActualizarUsuarioPayload = Partial<Omit<CrearUsuarioPayload, "password">> & {
  password?: string;
  activo?: boolean;
};

export async function fetchUsuarios() {
  const { data } = await api.get<Usuario[]>("/usuarios");
  return data;
}

export async function crearUsuario(payload: CrearUsuarioPayload) {
  const { data } = await api.post<Usuario>("/usuarios", payload);
  return data;
}

export async function actualizarUsuario(id: string, payload: ActualizarUsuarioPayload) {
  const { data } = await api.patch<Usuario>(`/usuarios/${id}`, payload);
  return data;
}

export async function eliminarUsuario(id: string) {
  await api.delete(`/usuarios/${id}`);
}
