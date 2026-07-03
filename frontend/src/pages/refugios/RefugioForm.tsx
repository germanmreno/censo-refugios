import { useState, type FormEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Group,
  NumberInput,
  Stack,
  TextInput,
  Title,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  crearRefugio,
  actualizarRefugio,
  type CrearRefugioPayload,
  type Refugio,
} from "../../api/refugios";

interface Props {
  refugio?: Refugio | null;
  onSaved: () => void;
  onCancel: () => void;
}

interface AulaForm {
  id: string;
  nombre: string;
  capacidad: string;
}

interface ModuloForm {
  id: string;
  nombre: string;
  aulas: AulaForm[];
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export function RefugioForm({ refugio, onSaved, onCancel }: Props) {
  const [nombre, setNombre] = useState(refugio?.nombre ?? "");
  const [capacidadEstimada, setCapacidadEstimada] = useState<string>(
    refugio ? String(refugio.capacidadEstimada) : "",
  );
  const [ubicacion, setUbicacion] = useState(refugio?.ubicacion ?? "");
  const [modulos, setModulos] = useState<ModuloForm[]>(
    refugio?.modulos?.map((m) => ({
      id: genId(),
      nombre: m.nombre,
      aulas: m.aulas?.map((a) => ({
        id: genId(),
        nombre: a.nombre,
        capacidad: a.capacidad ? String(a.capacidad) : "",
      })) ?? [],
    })) ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function addModulo() {
    setModulos((arr) => [...arr, { id: genId(), nombre: "", aulas: [] }]);
  }

  function removeModulo(mi: number) {
    setModulos((arr) => arr.filter((_, idx) => idx !== mi));
  }

  function addAula(mi: number) {
    setModulos((arr) =>
      arr.map((m, i) => (i === mi ? { ...m, aulas: [...m.aulas, { id: genId(), nombre: "", capacidad: "" }] } : m)),
    );
  }

  function removeAula(mi: number, ai: number) {
    setModulos((arr) =>
      arr.map((m, i) => (i === mi ? { ...m, aulas: m.aulas.filter((_, idx) => idx !== ai) } : m)),
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const cap = Number(capacidadEstimada);
    if (!nombre.trim() || !ubicacion.trim() || !Number.isInteger(cap) || cap <= 0) {
      setError("Nombre, capacidad (entero positivo) y ubicación son obligatorios.");
      return;
    }
    const payload: CrearRefugioPayload = {
      nombre: nombre.trim(),
      capacidadEstimada: cap,
      ubicacion: ubicacion.trim(),
      modulos: modulos.map((m) => ({
        nombre: m.nombre.trim(),
        aulas: m.aulas
          .filter((a) => a.nombre.trim())
          .map((a) => ({
            nombre: a.nombre.trim(),
            ...(a.capacidad ? { capacidad: Number(a.capacidad) } : {}),
          })),
      })),
    };
    setSubmitting(true);
    try {
      if (refugio) {
        await actualizarRefugio(refugio.id, payload as Partial<CrearRefugioPayload>);
        notifications.show({ message: "Centro actualizado", color: "govGreen" });
      } else {
        await crearRefugio(payload);
        notifications.show({ message: "Centro creado", color: "govGreen" });
      }
      onSaved();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "No se pudo guardar el centro.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm">
        <TextInput
          id="nombre"
          label="Nombre del centro"
          required
          value={nombre}
          onChange={(e) => setNombre(e.currentTarget.value)}
          autoFocus
        />
        <NumberInput
          id="cap"
          label="Capacidad estimada (personas)"
          required
          min={1}
          value={capacidadEstimada === "" ? "" : Number(capacidadEstimada)}
          onChange={(v) => setCapacidadEstimada(String(v ?? ""))}
          hideControls
        />
        <TextInput
          id="ubic"
          label="Ubicación"
          required
          value={ubicacion}
          onChange={(e) => setUbicacion(e.currentTarget.value)}
        />

        <Box>
          <Group justify="space-between" align="center" mb={6}>
            <Title order={5} c="govBlue.7" mb={0}>
              Módulos
            </Title>
            <Button onClick={addModulo} variant="light" color="govBlue" size="xs" type="button">
              + Añadir módulo
            </Button>
          </Group>
          {modulos.length === 0 && (
            <Text size="sm" c="dimmed">
              Sin módulos. Puede añadirlos luego.
            </Text>
          )}
          <Stack gap="md">
            {modulos.map((mo, mi) => (
              <Box key={mo.id} p="sm" style={{ border: "1px solid #d6dbe1", borderRadius: 6 }}>
                <Group justify="space-between" align="center" mb={6}>
                  <TextInput
                    placeholder="Nombre del módulo"
                    value={mo.nombre}
                    onChange={(e) => {
                      const v = e.target.value;
                      setModulos((arr) =>
                        arr.map((x, idx) => (idx === mi ? { ...x, nombre: v ?? "" } : x)),
                      );
                    }}
                    style={{ flex: 1 }}
                    label="Módulo"
                  />
                  <Button
                    onClick={() => removeModulo(mi)}
                    color="govRed"
                    size="sm"
                    variant="outline"
                    type="button"
                    mt="lg"
                    aria-label="Quitar módulo"
                  >
                    Quitar
                  </Button>
                </Group>
                <Group justify="space-between" align="center" mb={4}>
                  <Text size="sm" fw={600}>
                    Aulas (camas)
                  </Text>
                  <Button onClick={() => addAula(mi)} variant="subtle" color="govBlue" size="xs" type="button">
                    + Añadir aula
                  </Button>
                </Group>
                <Stack gap="xs">
                  {mo.aulas.length === 0 && (
                    <Text size="xs" c="dimmed">
                      Sin aulas en este módulo.
                    </Text>
                  )}
                  {mo.aulas.map((a, ai) => (
                    <Group key={a.id} align="end" gap="xs">
                      <TextInput
                        placeholder="Nombre del aula"
                        value={a.nombre ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setModulos((arr) =>
                            arr.map((x, mi2) =>
                              mi2 === mi
                                ? { ...x, aulas: x.aulas.map((xa, ai2) => (ai2 === ai ? { ...xa, nombre: v ?? "" } : xa)) }
                                : x,
                            ),
                          );
                        }}
                        style={{ flex: 2 }}
                      />
                      <NumberInput
                        placeholder="Camas"
                        min={1}
                        value={a.capacidad === "" || a.capacidad == null ? "" : Number(a.capacidad)}
                        onChange={(v) => {
                          setModulos((arr) =>
                            arr.map((x, mi2) =>
                              mi2 === mi
                                ? { ...x, aulas: x.aulas.map((xa, ai2) => (ai2 === ai ? { ...xa, capacidad: v == null ? "" : String(v) } : xa)) }
                                : x,
                            ),
                          );
                        }}
                        hideControls
                        style={{ flex: 1 }}
                      />
                      <Button
                        onClick={() => removeAula(mi, ai)}
                        color="govRed"
                        size="sm"
                        variant="outline"
                        aria-label="Quitar aula"
                        type="button"
                      >
                        ×
                      </Button>
                    </Group>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>

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
            {refugio ? "Guardar cambios" : "Crear centro"}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
