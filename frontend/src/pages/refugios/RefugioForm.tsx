import { useState, type FormEvent } from "react";
import {
  Alert,
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

export function RefugioForm({ refugio, onSaved, onCancel }: Props) {
  const [nombre, setNombre] = useState(refugio?.nombre ?? "");
  const [capacidadEstimada, setCapacidadEstimada] = useState<string>(
    refugio ? String(refugio.capacidadEstimada) : "",
  );
  const [ubicacion, setUbicacion] = useState(refugio?.ubicacion ?? "");
  const [aulas, setAulas] = useState<{ nombre: string; capacidad: string }[]>(
    refugio?.aulas?.map((a) => ({ nombre: a.nombre, capacidad: a.capacidad ? String(a.capacidad) : "" })) ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function addAula() {
    setAulas((a) => [...a, { nombre: "", capacidad: "" }]);
  }

  function removeAula(i: number) {
    setAulas((a) => a.filter((_, idx) => idx !== i));
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
      aulas: aulas
        .filter((a) => a.nombre.trim())
        .map((a) => ({
          nombre: a.nombre.trim(),
          ...(a.capacidad ? { capacidad: Number(a.capacidad) } : {}),
        })),
    };
    setSubmitting(true);
    try {
      if (refugio) {
        await actualizarRefugio(refugio.id, payload);
        notifications.show({ message: "Refugio actualizado", color: "govGreen" });
      } else {
        await crearRefugio(payload);
        notifications.show({ message: "Refugio creado", color: "govGreen" });
      }
      onSaved();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "No se pudo guardar el refugio.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm">
        <TextInput
          id="nombre"
          label="Nombre del refugio"
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

        <div>
          <Group justify="space-between" align="center" mb={6}>
            <Title order={5} c="govBlue.7" mb={0}>
              Aulas
            </Title>
            <Button onClick={addAula} variant="light" color="govBlue" size="xs" type="button">
              + Añadir aula
            </Button>
          </Group>
          {aulas.length === 0 && (
            <Text size="sm" c="dimmed">
              Sin aulas. Puede añadirlas luego.
            </Text>
          )}
          <Stack gap="xs">
            {aulas.map((a, i) => (
              <Group key={i} align="end" gap="xs">
                <TextInput
                  placeholder="Nombre del aula"
                  value={a.nombre}
                  onChange={(e) =>
                    setAulas((arr) => arr.map((x, idx) => (idx === i ? { ...x, nombre: e.currentTarget.value } : x)))
                  }
                  style={{ flex: 2 }}
                />
                <NumberInput
                  placeholder="Capacidad"
                  min={1}
                  value={a.capacidad === "" ? "" : Number(a.capacidad)}
                  onChange={(v) =>
                    setAulas((arr) => arr.map((x, idx) => (idx === i ? { ...x, capacidad: String(v ?? "") } : x)))
                  }
                  hideControls
                  style={{ flex: 1 }}
                />
                <Button
                  onClick={() => removeAula(i)}
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
        </div>

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
            {refugio ? "Guardar cambios" : "Crear refugio"}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
