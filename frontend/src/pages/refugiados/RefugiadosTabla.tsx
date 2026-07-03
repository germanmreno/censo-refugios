import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useAuth } from "../../context/AuthContext";
import {
  fetchRefugiados,
  fetchRefugiado,
  fetchCarnet,
  eliminarRefugiado,
  type RefugiadoLista,
  type RefugiadoCreado,
} from "../../api/refugiados";
import { fetchRefugios, type Refugio } from "../../api/refugios";
import { notifications } from "@mantine/notifications";
import { exportarCSV } from "../../utils/csv";
import {
  ETAPA_VIDA_OPTIONS,
  ESTATUS_ACTUAL_OPTIONS,
  PARENTESCO_OPTIONS,
} from "../../utils/opciones";
import { Modal } from "../../components/Modal";
import { CarnetRefugiado, type CarnetData } from "../../components/CarnetRefugiado";

const PAGE_SIZE = 15;

const etiquetaEtapa = (v: string) => ETAPA_VIDA_OPTIONS.find((o) => o.value === v)?.label ?? v;
const etiquetaEstatus = (v: string) => ESTATUS_ACTUAL_OPTIONS.find((o) => o.value === v)?.label ?? v;
const etiquetaParentesco = (v: string | null) =>
  v ? PARENTESCO_OPTIONS.find((o) => o.value === v)?.label ?? v : "—";

export function RefugiadosTabla() {
  const { isAdmin } = useAuth();
  const [refugios, setRefugios] = useState<Refugio[]>([]);
  const [items, setItems] = useState<RefugiadoLista[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [refugioId, setRefugioId] = useState("");
  const [buscar, setBuscar] = useState("");
  const [jefeFamilia, setJefeFamilia] = useState("");
  const [parentesco, setParentesco] = useState("");
  const [etapaVida, setEtapaVida] = useState("");

  const [detalle, setDetalle] = useState<RefugiadoLista | null>(null);
  const [detalleId, setDetalleId] = useState<string | null>(null);

  const [carnet, setCarnet] = useState<CarnetData | null>(null);
  const [carnetLoading, setCarnetLoading] = useState(false);
  const [carnetId, setCarnetId] = useState<string | null>(null);
  const urlVerificacion =
    typeof window !== "undefined" ? `${window.location.origin}/verificar` : "";

  useEffect(() => {
    fetchRefugios().then(setRefugios).catch(() => {});
  }, []);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRefugiados({
        refugioId: refugioId || undefined,
        page,
        pageSize: PAGE_SIZE,
        jefeFamilia: jefeFamilia === "" ? undefined : jefeFamilia === "true",
        buscar: buscar || undefined,
        parentesco: parentesco || undefined,
        etapaVida: etapaVida || undefined,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setError("No se pudieron cargar los refugiados.");
    } finally {
      setLoading(false);
    }
  }, [refugioId, page, jefeFamilia, buscar, parentesco, etapaVida]);

  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
  }, [cargar]);

  useEffect(() => {
    setPage(1);
  }, [refugioId, buscar, jefeFamilia, parentesco, etapaVida]);

  useEffect(() => {
    if (!detalleId) return;
    let active = true;
    (async () => {
      try {
        const d = await fetchRefugiado(detalleId);
        if (active) setDetalle(d);
      } catch {
        if (active) setDetalle(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [detalleId]);

  useEffect(() => {
    if (!carnetId) {
      setCarnet(null);
      return;
    }
    let active = true;
    setCarnetLoading(true);
    fetchCarnet(carnetId)
      .then((data: RefugiadoCreado) => {
        if (!active) return;
        const c: CarnetData = {
          id: data.id,
          verificacionToken: data.verificacionToken,
          nombre: data.nombre,
          apellido: data.apellido,
          nacionalidadCedula: data.nacionalidadCedula,
          cedula: data.cedula,
          edad: data.edad,
          etapaVida: data.etapaVida,
          tipoSangre: data.tipoSangre ?? null,
          numeroBrazalete: data.numeroBrazalete ?? null,
          telefono: data.telefono,
          foto: data.foto,
          refugio: data.refugio
            ? { id: data.refugio.id, nombre: data.refugio.nombre }
            : { id: "", nombre: "Centro" },
          aula: data.aula ?? null,
          createdAt: new Date().toISOString(),
          familiares: data.familiares?.map((f) => ({
            id: f.id,
            nombre: f.nombre,
            apellido: f.apellido,
            parentesco: f.parentesco ?? null,
            edad: f.edad,
            tipoSangre: f.tipoSangre ?? null,
            numeroBrazalete: f.numeroBrazalete ?? null,
          })) ?? [],
          mascota: data.mascota
            ? {
                tipo: data.mascota.tipo,
                color: data.mascota.color ?? null,
                tieneIdentificador: data.mascota.tieneIdentificador,
                foto: data.mascota.foto ?? null,
              }
            : null,
        };
        setCarnet(c);
      })
      .catch(() => {
        if (active) setCarnet(null);
        notifications.show({ message: "No se pudo cargar el carnet.", color: "govRed" });
      })
      .finally(() => {
        if (active) setCarnetLoading(false);
      });
    return () => {
      active = false;
    };
  }, [carnetId]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function limpiarFiltros() {
    setRefugioId("");
    setBuscar("");
    setJefeFamilia("");
    setParentesco("");
    setEtapaVida("");
  }

  function handleEliminar(r: RefugiadoLista) {
    if (!confirm(`¿Eliminar el registro de ${r.nombre} ${r.apellido}?`)) return;
    eliminarRefugiado(r.id)
      .then(() => {
        notifications.show({ message: "Registro eliminado", color: "govGreen" });
        cargar();
        setDetalleId(null);
      })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        notifications.show({ message: msg ?? "No se pudo eliminar.", color: "govRed" });
      });
  }

  function handleExportCSV() {
    const cols = [
      { header: "Refugio", acc: (r: RefugiadoLista) => r.refugio?.nombre ?? "" },
      { header: "Nombre", acc: (r: RefugiadoLista) => r.nombre },
      { header: "Apellido", acc: (r: RefugiadoLista) => r.apellido },
      { header: "Cédula", acc: (r: RefugiadoLista) => `${r.nacionalidadCedula ?? ""}-${r.cedula ?? ""}` },
      { header: "Edad", acc: (r: RefugiadoLista) => String(r.edad) },
      { header: "Etapa", acc: (r: RefugiadoLista) => etiquetaEtapa(r.etapaVida) },
      { header: "Jefe de familia", acc: (r: RefugiadoLista) => (r.jefeFamilia ? "Sí" : "No") },
      { header: "Parentesco", acc: (r: RefugiadoLista) => etiquetaParentesco(r.parentesco) },
      { header: "Patología", acc: (r: RefugiadoLista) => (r.patologia ? r.patologiaDescripcion ?? "" : "No") },
      { header: "Origen", acc: (r: RefugiadoLista) => r.origen },
      { header: "Estado", acc: (r: RefugiadoLista) => r.estado },
      { header: "Municipio", acc: (r: RefugiadoLista) => r.municipio },
      { header: "Parroquia", acc: (r: RefugiadoLista) => r.parroquia },
      { header: "Sector", acc: (r: RefugiadoLista) => r.sector },
      { header: "Dirección", acc: (r: RefugiadoLista) => r.direccion },
      { header: "Tipo vivienda", acc: (r: RefugiadoLista) => r.tipoVivienda },
      { header: "Estatus propiedad", acc: (r: RefugiadoLista) => r.estatusPropiedad },
      { header: "Estatus actual", acc: (r: RefugiadoLista) => etiquetaEstatus(r.estatusActual) },
    ];
    exportarCSV(
      `censo_refugiados_${new Date().toISOString().slice(0, 10)}.csv`,
      cols.map((c) => ({ header: c.header, accessor: (row: Record<string, unknown>) => c.acc(row as unknown as RefugiadoLista) })),
      items as unknown as Record<string, unknown>[],
    );
  }

  return (
    <Stack gap="md">
      <Card withBorder bg="gray.0" p="md" radius="md">
        <Group align="end" gap="sm" grow>
          <Select
            label="Refugio"
            value={refugioId || null}
            onChange={(v) => setRefugioId(v ?? "")}
            data={refugios.map((r) => ({ value: r.id, label: r.nombre }))}
            placeholder="Todos"
            clearable
            comboboxProps={{ withinPortal: true }}
          />
          <TextInput
            label="Buscar"
            value={buscar}
            onChange={(e) => setBuscar(e.currentTarget.value)}
            placeholder="Nombre o cédula…"
          />
          <Select
            label="Jefe de familia"
            value={jefeFamilia || null}
            onChange={(v) => setJefeFamilia(v ?? "")}
            data={[
              { value: "true", label: "Sí" },
              { value: "false", label: "No" },
            ]}
            placeholder="Todos"
            clearable
            comboboxProps={{ withinPortal: true }}
          />
          <Select
            label="Parentesco"
            value={parentesco || null}
            onChange={(v) => setParentesco(v ?? "")}
            data={PARENTESCO_OPTIONS}
            placeholder="Todos"
            clearable
            comboboxProps={{ withinPortal: true }}
          />
          <Select
            label="Etapa de vida"
            value={etapaVida || null}
            onChange={(v) => setEtapaVida(v ?? "")}
            data={ETAPA_VIDA_OPTIONS}
            placeholder="Todas"
            clearable
            comboboxProps={{ withinPortal: true }}
          />
          <Group gap="xs">
            <Button onClick={limpiarFiltros} variant="default" size="sm">
              Limpiar
            </Button>
            <Button onClick={handleExportCSV} color="govBlue" size="sm">
              CSV
            </Button>
          </Group>
        </Group>
      </Card>

      {error && (
        <Text c="govRed" role="alert">
          {error}
        </Text>
      )}

      <Paper withBorder radius="md" style={{ overflowX: "auto" }}>
        <Table striped highlightOnHover withColumnBorders verticalSpacing="xs" fz="sm">
          <Table.Thead style={{ background: "var(--mantine-color-govBlue-7)" }}>
            <Table.Tr>
              <Table.Th style={{ color: "#fff" }}>Nombre y apellido</Table.Th>
              <Table.Th style={{ color: "#fff" }}>Cédula</Table.Th>
              <Table.Th style={{ color: "#fff" }}>Edad</Table.Th>
              <Table.Th style={{ color: "#fff" }}>Etapa</Table.Th>
              <Table.Th style={{ color: "#fff" }}>Refugio</Table.Th>
              <Table.Th style={{ color: "#fff" }}>Rol</Table.Th>
              <Table.Th style={{ color: "#fff" }}>Estatus vivienda</Table.Th>
              <Table.Th style={{ color: "#fff" }}>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading && items.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={8} style={{ textAlign: "center", padding: "1rem", color: "#888" }}>
                  Cargando…
                </Table.Td>
              </Table.Tr>
            ) : items.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={8} style={{ textAlign: "center", padding: "1rem", color: "#888" }}>
                  No hay refugiados que coincidan con los filtros.
                </Table.Td>
              </Table.Tr>
            ) : (
              items.map((r) => (
                <Table.Tr key={r.id}>
                  <Table.Td>
                    {r.nombre} {r.apellido}
                  </Table.Td>
                  <Table.Td>{r.cedula ? `${r.nacionalidadCedula}-${r.cedula}` : "—"}</Table.Td>
                  <Table.Td>{r.edad}</Table.Td>
                  <Table.Td>{etiquetaEtapa(r.etapaVida)}</Table.Td>
                  <Table.Td>{r.refugio?.nombre ?? "—"}</Table.Td>
                  <Table.Td>
                    {r.jefeFamilia ? <Badge color="govBlue" variant="filled">Jefe</Badge> : etiquetaParentesco(r.parentesco)}
                  </Table.Td>
                  <Table.Td>{etiquetaEstatus(r.estatusActual)}</Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      <Button size="xs" variant="light" color="govBlue" onClick={() => setDetalleId(r.id)}>
                        Ver
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        color="govYellow"
                        onClick={() => setCarnetId(r.id)}
                        aria-label={`Ver carnet de ${r.nombre} ${r.apellido}`}
                        title="Ver carnet"
                      >
                        🎫
                      </Button>
                      {isAdmin && (
                        <Button
                          size="xs"
                          variant="outline"
                          color="govRed"
                          onClick={() => handleEliminar(r)}
                          aria-label="Eliminar"
                        >
                          🗑
                        </Button>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      <Group justify="space-between" align="center" wrap="wrap" gap="sm">
        <Text size="sm" c="dimmed">
          {total} refugiado(s) · página {page} de {totalPages}
        </Text>
        <Pagination total={totalPages} value={page} onChange={setPage} color="govBlue" />
      </Group>

      <Modal
        open={detalleId !== null}
        title={detalle ? `${detalle.nombre} ${detalle.apellido}` : "Detalle"}
        onClose={() => {
          setDetalleId(null);
          setDetalle(null);
        }}
        maxWidth={640}
      >
        {detalle ? (
          <Stack gap="sm" style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>
            <DetalleSection titulo="Datos del refugiado">
              <DetalleItem label="Cédula" value={detalle.cedula ? `${detalle.nacionalidadCedula}-${detalle.cedula}` : "—"} />
              <DetalleItem label="Edad" value={`${detalle.edad} años (${etiquetaEtapa(detalle.etapaVida)})`} />
              <DetalleItem label="Teléfono" value={detalle.telefono ?? "—"} />
              <DetalleItem label="Origen" value={detalle.origen} />
              <DetalleItem label="Refugio" value={detalle.refugio?.nombre ?? "—"} />
              <DetalleItem label="Aula" value={detalle.aula?.nombre ?? "Sin asignar"} />
              <DetalleItem
                label="Rol"
                value={detalle.jefeFamilia ? "Jefe de familia" : `Familiar (${etiquetaParentesco(detalle.parentesco)})`}
              />
              {detalle.jefeFamiliaRef && (
                <DetalleItem
                  label="Jefe enlazado"
                  value={`${detalle.jefeFamiliaRef.nombre} ${detalle.jefeFamiliaRef.apellido}`}
                />
              )}
            </DetalleSection>

            <DetalleSection titulo="Condición de salud">
              <DetalleItem label="Patología" value={detalle.patologia ? detalle.patologiaDescripcion ?? "—" : "No"} />
            </DetalleSection>

            <DetalleSection titulo="Ubicación del siniestro">
              <DetalleItem label="Estado" value={detalle.estado} />
              <DetalleItem label="Municipio" value={detalle.municipio} />
              <DetalleItem label="Parroquia" value={detalle.parroquia} />
              <DetalleItem label="Sector" value={detalle.sector} />
              <DetalleItem label="Dirección" value={detalle.direccion} />
            </DetalleSection>

            <DetalleSection titulo="Condición de la vivienda">
              <DetalleItem label="Tipo" value={detalle.tipoVivienda} />
              <DetalleItem label="Estatus propiedad" value={detalle.estatusPropiedad} />
              <DetalleItem label="Estatus actual" value={etiquetaEstatus(detalle.estatusActual)} />
            </DetalleSection>

            {detalle.familiares && detalle.familiares.length > 0 && (
              <DetalleSection titulo={`Familiares (${detalle.familiares.length})`}>
                <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                  {detalle.familiares.map((f) => (
                    <li key={f.id}>
                      {f.nombre} {f.apellido} · {etiquetaParentesco(f.parentesco)} · {f.edad} años
                    </li>
                  ))}
                </ul>
              </DetalleSection>
            )}

            {isAdmin && (
              <Group justify="flex-end" mt="md">
                <Button color="govRed" variant="outline" onClick={() => handleEliminar(detalle)}>
                  Eliminar registro
                </Button>
              </Group>
            )}
          </Stack>
        ) : (
          <Text>Cargando…</Text>
        )}
      </Modal>

      <Modal
        open={carnetId !== null}
        title="Carnet del refugiado"
        onClose={() => setCarnetId(null)}
        maxWidth={780}
      >
        {carnetLoading ? (
          <Center p="xl">
            <Loader />
          </Center>
        ) : carnet ? (
          <Stack gap="md">
            <CarnetRefugiado data={carnet} urlVerificacion={urlVerificacion} />
            <Group justify="center" className="no-print">
              <Button
                color="govBlue"
                leftSection={<span>🖨️</span>}
                onClick={() => window.print()}
              >
                Imprimir carnet
              </Button>
            </Group>
          </Stack>
        ) : (
          <Text c="govRed" role="alert">
            No se pudo cargar el carnet.
          </Text>
        )}
      </Modal>
    </Stack>
  );
}

function DetalleSection({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Box>
      <Title order={5} c="govBlue.7" mb={4} pb={4} style={{ borderBottom: "1px solid #e0e6ed" }}>
        {titulo}
      </Title>
      <Stack gap={4}>{children}</Stack>
    </Box>
  );
}

function DetalleItem({ label, value }: { label: string; value: string }) {
  return (
    <Group gap="sm" wrap="nowrap" align="flex-start">
      <Text size="sm" c="dimmed" style={{ minWidth: 140 }}>
        {label}:
      </Text>
      <Text size="sm" fw={500}>
        {value}
      </Text>
    </Group>
  );
}
