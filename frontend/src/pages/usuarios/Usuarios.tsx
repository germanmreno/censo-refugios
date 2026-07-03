import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  fetchUsuarios,
  eliminarUsuario,
  type Usuario,
} from "../../api/usuarios";
import { Modal } from "../../components/Modal";
import { UsuarioForm } from "./UsuarioForm";

export function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [filtro, setFiltro] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsuarios(await fetchUsuarios());
    } catch {
      setError("No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function abrirNuevo() {
    setEditing(null);
    setFormOpen(true);
  }

  function abrirEditar(u: Usuario) {
    setEditing(u);
    setFormOpen(true);
  }

  function handleDesactivar(u: Usuario) {
    const accion = u.activo ? "desactivar" : "reactivar";
    if (!confirm(`¿${accion} al usuario ${u.nombre} ${u.apellido}?`)) return;
    eliminarUsuario(u.id)
      .then(() => {
        notifications.show({ message: `Usuario ${accion}do`, color: "govGreen" });
        cargar();
      })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        notifications.show({ message: msg ?? "No se pudo completar la acción.", color: "govRed" });
      });
  }

  const filtrados = usuarios.filter((u) => {
    if (!filtro.trim()) return true;
    const q = filtro.toLowerCase();
    return (
      u.nombre.toLowerCase().includes(q) ||
      u.apellido.toLowerCase().includes(q) ||
      u.cedula.toLowerCase().includes(q)
    );
  });

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <Title order={1} c="govBlue.7" mb={0}>
          Usuarios
        </Title>
        <Group gap="sm">
          <TextInput
            value={filtro}
            onChange={(e) => setFiltro(e.currentTarget.value)}
            placeholder="Buscar…"
            aria-label="Filtrar usuarios"
          />
          <Button onClick={abrirNuevo} color="govBlue">
            + Nuevo usuario
          </Button>
        </Group>
      </Group>

      {error && (
        <Text c="govRed" role="alert">
          {error}
        </Text>
      )}

      {loading ? (
        <Text>Cargando…</Text>
      ) : filtrados.length === 0 ? (
        <Text c="dimmed">No hay usuarios que coincidan.</Text>
      ) : (
        <Paper withBorder radius="md" style={{ overflowX: "auto" }}>
          <Table striped highlightOnHover verticalSpacing="xs" fz="sm">
            <Table.Thead style={{ background: "var(--mantine-color-govBlue-7)" }}>
              <Table.Tr>
                <Table.Th style={{ color: "#fff" }}>Nombre y apellido</Table.Th>
                <Table.Th style={{ color: "#fff" }}>Cédula</Table.Th>
                <Table.Th style={{ color: "#fff" }}>Rol</Table.Th>
                <Table.Th style={{ color: "#fff" }}>Estado</Table.Th>
                <Table.Th style={{ color: "#fff" }}>Refugios asignados</Table.Th>
                <Table.Th style={{ color: "#fff" }}>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtrados.map((u) => (
                <Table.Tr key={u.id}>
                  <Table.Td>
                    {u.nombre} {u.apellido}
                  </Table.Td>
                  <Table.Td>{u.cedula}</Table.Td>
                  <Table.Td>
                    <Badge color={u.rol === "administrador" ? "govBlue" : "govBlue"} variant={u.rol === "administrador" ? "filled" : "light"}>
                      {u.rol}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c={u.activo ? "govGreen" : "govRed"} fw={600}>
                      {u.activo ? "Activo" : "Inactivo"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {u.rol === "administrador" ? (
                      <Text size="sm" c="dimmed" fs="italic">
                        Todos (admin)
                      </Text>
                    ) : u.refugiosPermitidos.length === 0 ? (
                      <Text size="sm" c="govRed">
                        Sin asignar
                      </Text>
                    ) : (
                      u.refugiosPermitidos.map((r) => r.refugio.nombre).join(", ")
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      <Button size="xs" variant="light" color="govBlue" onClick={() => abrirEditar(u)}>
                        Editar
                      </Button>
                      <Button
                        size="xs"
                        variant={u.activo ? "outline" : "light"}
                        color={u.activo ? "govRed" : "govGreen"}
                        onClick={() => handleDesactivar(u)}
                      >
                        {u.activo ? "Desactivar" : "Reactivar"}
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      <Modal
        open={formOpen}
        title={editing ? "Editar usuario" : "Nuevo usuario"}
        onClose={() => setFormOpen(false)}
      >
        <UsuarioForm
          usuario={editing}
          onSaved={() => {
            setFormOpen(false);
            cargar();
          }}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>
    </Stack>
  );
}
