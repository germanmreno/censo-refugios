import { api } from "./client";

export interface AuthUser {
  id: string;
  cedula: string;
  nombre: string;
  apellido: string;
  rol: "funcionario" | "administrador";
  refugiosPermitidos: { refugioId: string; refugio?: { id: string; nombre: string } }[];
}

export async function login(cedula: string, password: string) {
  const { data } = await api.post<{ accessToken: string; user: AuthUser }>("/auth/login", {
    cedula,
    password,
  });
  return data;
}

export async function fetchMe() {
  const { data } = await api.get<AuthUser>("/auth/me");
  return data;
}

export async function logout() {
  await api.post("/auth/logout");
}
