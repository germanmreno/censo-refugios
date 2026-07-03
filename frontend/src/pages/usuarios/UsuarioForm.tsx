import { useEffect, useState, type FormEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Group,
  PasswordInput,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  crearUsuario,
  actualizarUsuario,
  type CrearUsuarioPayload,
  type Usuario,
} from "../../api/usuarios";
import { fetchRefugios, type Refugio } from "../../api/refugios";
import { Field } from "../../components/FormFields";

interface Props {
  usuario?: Usuario | null;
  onSaved: () => void;
  onCancel: () => void;
}

export function UsuarioForm({ usuario, onSaved, onCancel }: Props) {
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [apellido, setApellido] = useState(usuario?.apellido ?? "");
  const [cedula, setCedula] = useState(usuario?.cedula ?? "");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<"funcionario" | "administrador">(usuario?.rol ?? "funcionario");
  const [refugioIds, setRefugioIds] = useState<string[]>(
    usuario?.refugiosPermitidos?.map((r) => r.refugioId) ?? [],
  );
  const [refugios, setRefugios] = useState<Refugio[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRefugios().then(setRefugios).catch(() => {});
  }, []);

  function toggleRefugio(id: string) {
    setRefugioIds((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim() || !apellido.trim() || !cedula.trim()) {
      setError("Nombre, apellido y cédula son obligatorios.");
      return;
    }
    if (!usuario && password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    const payload: CrearUsuarioPayload = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      cedula: cedula.trim(),
      password,
      rol,
      refugioIds: rol === "administrador" ? [] : refugioIds,
    };
    setSubmitting(true);
    try {
      if (usuario) {
        const update: Partial<CrearUsuarioPayload> & { activo?: boolean } = {
          nombre: payload.nombre,
          apellido: payload.apellido,
          cedula: payload.cedula,
          rol: payload.rol,
          refugioIds: payload.refugioIds,
        };
        if (password) (update as { password?: string }).password = password;
        await actualizarUsuario(usuario.id, update);
        notifications.show({ message: "Usuario actualizado", color: "govGreen" });
      } else {
        await crearUsuario(payload);
        notifications.show({ message: "Usuario creado", color: "govGreen" });
      }
      onSaved();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "No se pudo guardar el usuario.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <Field label="Nombre" htmlFor="nombre" required>
            <TextInput
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.currentTarget.value)}
              autoFocus
            />
          </Field>
          <Field label="Apellido" htmlFor="apellido" required>
            <TextInput id="apellido" value={apellido} onChange={(e) => setApellido(e.currentTarget.value)} />
          </Field>
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <Field label="Cédula" htmlFor="cedula" required>
            <TextInput id="cedula" value={cedula} onChange={(e) => setCedula(e.currentTarget.value)} />
          </Field>
          <Field label="Rol" htmlFor="rol" required>
            <Select
              id="rol"
              value={rol}
              onChange={(v) => setRol((v as "funcionario" | "administrador") ?? "funcionario")}
              data={[
                { value: "funcionario", label: "Funcionario" },
                { value: "administrador", label: "Administrador" },
              ]}
              allowDeselect={false}
              comboboxProps={{ withinPortal: true }}
            />
          </Field>
        </SimpleGrid>

        <Field
          label={usuario ? "Nueva contraseña (dejar vacío para mantener)" : "Contraseña"}
          htmlFor="password"
          required={!usuario}
          hint="Mínimo 8 caracteres."
        >
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            autoComplete="new-password"
          />
        </Field>

        {rol === "funcionario" && (
          <Box mb="sm">
            <Text component="label" size="sm" fw={600} display="block" mb={6}>
              Refugios asignados
            </Text>
            <ScrollArea
              style={{
                border: "1px solid #d6dbe1",
                borderRadius: 6,
                maxHeight: 200,
                padding: "0.25rem",
              }}
            >
              {refugios.length === 0 ? (
                <Text size="sm" c="dimmed" p="xs">
                  No hay refugios registrados.
                </Text>
              ) : (
                <Stack gap={0}>
                  {refugios.map((r) => {
                    const sel = refugioIds.includes(r.id);
                    return (
                      <Box
                        key={r.id}
                        p="xs"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          cursor: "pointer",
                          borderRadius: 4,
                          background: sel ? "#e8f5e9" : "transparent",
                        }}
                      >
                        <Checkbox
                          checked={sel}
                          onChange={() => toggleRefugio(r.id)}
                          aria-label={`Asignar refugio ${r.nombre}`}
                        />
                        <Text size="sm" fw={500}>
                          {r.nombre}
                        </Text>
                        <Text size="xs" c="dimmed">
                          · {r.ocupacionActual}/{r.capacidadEstimada}
                        </Text>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </ScrollArea>
          </Box>
        )}

        {error && (
          <Alert color="govRed" role="alert" variant="light">
            {error}
          </Alert>
        )}

        <Group justify="flex-end" gap="sm" mt="md">
          <Button onClick={onCancel} variant="default" disabled={submitting} type="button">
            Cancelar
          </Button>
          <Button type="submit" loading={submitting} color="govBlue">
            {usuario ? "Guardar cambios" : "Crear usuario"}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
