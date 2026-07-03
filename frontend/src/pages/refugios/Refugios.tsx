import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useAuth } from "../../context/AuthContext";
import {
  fetchRefugios,
  fetchOcupacion,
  eliminarRefugio,
  eliminarAula,
  crearAula,
  type Refugio,
  type Ocupacion,
} from "../../api/refugios";
import { CapacidadBar } from "../../components/CapacidadBar";
import { Modal } from "../../components/Modal";
import { notifications } from "@mantine/notifications";
import { RefugioForm } from "./RefugioForm";

export function Refugios() {
  const { isAdmin } = useAuth();
  const [refugios, setRefugios] = useState<Refugio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Refugio | null>(null);
  const [detalle, setDetalle] = useState<Ocupacion | null>(null);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [nuevaAula, setNuevaAula] = useState({ nombre: "", capacidad: "" });

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRefugios();
      setRefugios(data);
    } catch {
      setError("No se pudieron cargar los refugios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!detalleId) return;
    let active = true;
    (async () => {
      try {
        const occ = await fetchOcupacion(detalleId);
        if (active) setDetalle(occ);
      } catch {
        if (active) setDetalle(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [detalleId]);

  function abrirNuevo() {
    setEditing(null);
    setFormOpen(true);
  }

  function abrirEditar(r: Refugio) {
    setEditing(r);
    setFormOpen(true);
  }

  function handleEliminar(r: Refugio) {
    if (!confirm(`¿Eliminar el refugio "${r.nombre}"? Esta acción no se puede deshacer.`)) return;
    eliminarRefugio(r.id)
      .then(() => {
        notifications.show({ message: "Refugio eliminado", color: "govGreen" });
        cargar();
      })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        notifications.show({ message: msg ?? "No se pudo eliminar el refugio.", color: "govRed" });
      });
  }

  function handleEliminarAula(aulaId: string) {
    if (!detalleId) return;
    if (!confirm("¿Eliminar esta aula?")) return;
    eliminarAula(detalleId, aulaId)
      .then(async () => {
        const occ = await fetchOcupacion(detalleId);
        setDetalle(occ);
        await cargar();
        notifications.show({ message: "Aula eliminada", color: "govGreen" });
      })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        notifications.show({ message: msg ?? "No se pudo eliminar el aula.", color: "govRed" });
      });
  }

  function handleCrearAula() {
    if (!detalleId || !nuevaAula.nombre.trim()) return;
    crearAula(detalleId, {
      nombre: nuevaAula.nombre.trim(),
      ...(nuevaAula.capacidad ? { capacidad: Number(nuevaAula.capacidad) } : {}),
    })
      .then(async () => {
        setNuevaAula({ nombre: "", capacidad: "" });
        const occ = await fetchOcupacion(detalleId);
        setDetalle(occ);
        await cargar();
        notifications.show({ message: "Aula añadida", color: "govGreen" });
      })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        notifications.show({ message: msg ?? "No se pudo crear el aula.", color: "govRed" });
      });
  }

  if (loading) return <Text>Cargando refugios…</Text>;
  if (error)
    return (
      <Text c="govRed" role="alert">
        {error}
      </Text>
    );

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center" wrap="wrap">
        <Title order={1} c="govBlue.7" mb={0}>
          Refugios
        </Title>
        {isAdmin && (
          <Button onClick={abrirNuevo} color="govBlue" size="md">
            + Nuevo refugio
          </Button>
        )}
      </Group>

      {refugios.length === 0 ? (
        <Text c="dimmed">No hay refugios registrados.</Text>
      ) : (
        <Stack gap="sm">
          {refugios.map((r) => {
            const pct = r.capacidadEstimada > 0 ? Math.round((r.ocupacionActual / r.capacidadEstimada) * 100) : 0;
            const color = pct >= 90 ? "govRed" : pct >= 70 ? "govYellow" : "govGreen";
            return (
              <Card key={r.id} withBorder padding="md" radius="md" bg="white">
                <Group justify="space-between" align="center" wrap="wrap" gap="md">
                  <Stack gap={2} style={{ flex: 1, minWidth: 240 }}>
                    <Text fw={700} size="md">
                      {r.nombre}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {r.ubicacion}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {r.aulas.length} aula(s) · {r.ocupacionActual} refugiado(s)
                    </Text>
                  </Stack>
                  <Box style={{ flex: 1, minWidth: 240 }}>
                    <Group align="center" gap="sm">
                      <Box style={{ flex: 1 }}>
                        <CapacidadBar actual={r.ocupacionActual} max={r.capacidadEstimada} />
                      </Box>
                      <Badge color={color} size="lg" variant="filled">
                        {pct}%
                      </Badge>
                    </Group>
                  </Box>
                  <Group gap="xs">
                    <Button size="xs" variant="light" color="govBlue" onClick={() => setDetalleId(r.id)}>
                      Detalle
                    </Button>
                    {isAdmin && (
                      <>
                        <Button size="xs" variant="light" color="govBlue" onClick={() => abrirEditar(r)}>
                          Editar
                        </Button>
                        <Button size="xs" variant="outline" color="govRed" onClick={() => handleEliminar(r)}>
                          Eliminar
                        </Button>
                      </>
                    )}
                  </Group>
                </Group>
              </Card>
            );
          })}
        </Stack>
      )}

      <Modal
        open={formOpen}
        title={editing ? "Editar refugio" : "Nuevo refugio"}
        onClose={() => setFormOpen(false)}
      >
        <RefugioForm
          refugio={editing}
          onSaved={() => {
            setFormOpen(false);
            cargar();
          }}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      <Modal
        open={detalleId !== null}
        title={detalle?.nombre ?? "Detalle del refugio"}
        onClose={() => {
          setDetalleId(null);
          setDetalle(null);
        }}
        maxWidth={680}
      >
        {detalle ? (
          <Stack gap="md">
            <CapacidadBar
              actual={detalle.ocupacionActual}
              max={detalle.capacidadEstimada}
              label="Ocupación total"
            />
            <Group grow>
              <Stat label="Jefes de familia" value={detalle.jefesFamilia} />
              <Stat label="Sin aula asignada" value={detalle.sinAula} />
              <Stat label="Disponibles" value={detalle.disponibles} />
              <Stat label="% ocupación" value={`${detalle.porcentajeOcupacion}%`} />
            </Group>

            <Title order={5} c="govBlue.7" mb={0}>
              Aulas
            </Title>
            {detalle.aulas.length === 0 ? (
              <Text size="sm" c="dimmed">
                Sin aulas registradas.
              </Text>
            ) : (
              <Table striped withTableBorder withColumnBorders verticalSpacing="xs" fz="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Aula</Table.Th>
                    <Table.Th>Capacidad</Table.Th>
                    <Table.Th>Ocupación</Table.Th>
                    {isAdmin && <Table.Th>Acción</Table.Th>}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {detalle.aulas.map((a) => (
                    <Table.Tr key={a.id}>
                      <Table.Td>{a.nombre}</Table.Td>
                      <Table.Td>{a.capacidad ?? "—"}</Table.Td>
                      <Table.Td>
                        {a.ocupacion}
                        {a.disponibles !== null ? ` (disp. ${a.disponibles})` : ""}
                      </Table.Td>
                      {isAdmin && (
                        <Table.Td>
                          <Button
                            onClick={() => handleEliminarAula(a.id)}
                            color="govRed"
                            size="xs"
                            variant="outline"
                            aria-label={`Eliminar ${a.nombre}`}
                          >
                            ×
                          </Button>
                        </Table.Td>
                      )}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}

            {isAdmin && (
              <Group align="end" gap="xs">
                <TextInput
                  placeholder="Nombre del aula"
                  value={nuevaAula.nombre}
                  onChange={(e) => setNuevaAula((a) => ({ ...a, nombre: e.currentTarget.value }))}
                  style={{ flex: 2 }}
                />
                <TextInput
                  placeholder="Capacidad"
                  type="number"
                  min={1}
                  value={nuevaAula.capacidad}
                  onChange={(e) => setNuevaAula((a) => ({ ...a, capacidad: e.currentTarget.value }))}
                  style={{ flex: 1 }}
                />
                <Button onClick={handleCrearAula} color="govBlue">
                  Añadir
                </Button>
              </Group>
            )}
          </Stack>
        ) : (
          <Text>Cargando…</Text>
        )}
      </Modal>
    </Stack>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Box bg="gray.0" p="sm" style={{ borderRadius: 6 }}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text size="lg" fw={700} c="govBlue.7">
        {value}
      </Text>
    </Box>
  );
}
