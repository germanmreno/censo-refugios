import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, Group, Select, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { fetchRefugios, type Refugio } from "../../api/refugios";
import {
  fetchStatsGlobal,
  fetchStatsRefugio,
  type ResumenGlobal,
  type StatsRefugio,
} from "../../api/stats";
import { CapacidadBar } from "../../components/CapacidadBar";
import { ETAPA_VIDA_OPTIONS, ESTATUS_ACTUAL_OPTIONS } from "../../utils/opciones";

const COLORS = ["#1e3a5f", "#006847", "#f5b800", "#ce1126", "#6a1b9a", "#00838f", "#ad1457", "#5d4037"];
const ESTATUS_COLORS = ["#ce1126", "#f5b800", "#ffe082", "#2e7d32"];

const etiquetaEtapa = (v: string) => ETAPA_VIDA_OPTIONS.find((o) => o.value === v)?.label ?? v;
const etiquetaEstatus = (v: string) => ESTATUS_ACTUAL_OPTIONS.find((o) => o.value === v)?.label ?? v;

export function Estadisticas() {
  const [refugios, setRefugios] = useState<Refugio[]>([]);
  const [global, setGlobal] = useState<ResumenGlobal | null>(null);
  const [detalle, setDetalle] = useState<StatsRefugio | null>(null);
  const [refugioId, setRefugioId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchRefugios(), fetchStatsGlobal()])
      .then(([r, g]) => {
        setRefugios(r);
        setGlobal(g);
        if (r.length > 0) setRefugioId(r[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!refugioId) return;
    fetchStatsRefugio(refugioId)
      .then(setDetalle)
      .catch(() => setDetalle(null));
  }, [refugioId]);

  if (loading) return <Text>Cargando estadísticas…</Text>;
  if (!global) return <Text>No hay datos disponibles.</Text>;

  const ocupacionData = global.refugios.map((r) => ({
    nombre: r.nombre.length > 18 ? r.nombre.slice(0, 16) + "…" : r.nombre,
    Ocupación: r.ocupacionActual,
    Capacidad: r.capacidadEstimada,
  }));

  return (
    <Stack gap="lg">
      <Title order={1} c="govBlue.7" mb={0}>
        Estadísticas
      </Title>

      <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="sm">
        <Kpi label="Refugios" value={global.totalRefugios} />
        <Kpi label="Refugiados" value={global.totalRefugiados} />
        <Kpi label="Capacidad total" value={global.capacidadTotal} />
        <Kpi label="Disponibles" value={global.disponibles} color="govGreen" />
        <Kpi label="% Ocupación global" value={`${global.porcentajeOcupacion}%`} color="govBlue" />
      </SimpleGrid>

      <CardChart title="Ocupación vs capacidad por refugio">
        {ocupacionData.length === 0 ? (
          <Empty text="Sin refugios registrados." />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={ocupacionData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="nombre" tick={{ fontSize: 11 }} interval={0} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Ocupación" fill="#1e3a5f" />
              <Bar dataKey="Capacidad" fill="#cfd8dc" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardChart>

      <Group align="end" maw={400}>
        <Select
          label="Refugio"
          value={refugioId || null}
          onChange={(v) => setRefugioId(v ?? "")}
          data={refugios.map((r) => ({ value: r.id, label: r.nombre }))}
          placeholder="Seleccione"
          allowDeselect={false}
          comboboxProps={{ withinPortal: true }}
          w="100%"
        />
      </Group>

      {detalle && (
        <Stack gap="md">
          <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
            <Kpi label="Total" value={detalle.resumen.totalRefugiados} />
            <Kpi label="Jefes" value={detalle.resumen.jefesFamilia} />
            <Kpi label="Familiares" value={detalle.resumen.familiares} />
            <Kpi label="Con patología" value={detalle.resumen.conPatologia} color="govYellow" />
          </SimpleGrid>

          <CardChart title={`Capacidad — ${detalle.nombre}`}>
            <CapacidadBar
              actual={detalle.resumen.totalRefugiados}
              max={detalle.resumen.capacidadEstimada}
              label="Ocupación del refugio"
            />
          </CardChart>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <CardChart title="Pirámide poblacional">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={detalle.piramidePoblacional} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="rango" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="cantidad" fill="#1e3a5f" radius={[0, 4, 4, 0]}>
                    {detalle.piramidePoblacional.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardChart>

            <CardChart title="Por etapa de vida">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={detalle.porEtapaVida.map((e) => ({ name: etiquetaEtapa(e.etapa), value: e.cantidad }))}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    label={(d) => (d.value ? `${d.name} (${d.value})` : "")}
                    labelLine={false}
                  >
                    {detalle.porEtapaVida.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardChart>

            <CardChart title="Patologías más comunes">
              {detalle.patologiasTop.length === 0 ? (
                <Empty text="Sin patologías registradas." />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={detalle.patologiasTop} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip />
                    <Bar dataKey="cantidad" fill="#f5b800" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardChart>

            <CardChart title="Sectores más afectados">
              {detalle.sectoresMasAfectados.length === 0 ? (
                <Empty text="Sin datos." />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={detalle.sectoresMasAfectados} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="sector" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip />
                    <Bar dataKey="cantidad" fill="#ce1126" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardChart>
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <CardChart title="Estatus de las viviendas">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={detalle.porEstatusVivienda.map((e) => ({ name: etiquetaEstatus(e.estatus), cantidad: e.cantidad }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                    {detalle.porEstatusVivienda.map((_, i) => (
                      <Cell key={i} fill={ESTATUS_COLORS[i % ESTATUS_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardChart>

            <CardChart title="Estados más afectados">
              {detalle.estadosMasAfectados.length === 0 ? (
                <Empty text="Sin datos." />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={detalle.estadosMasAfectados}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="estado" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="cantidad" fill="#00838f" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardChart>
          </SimpleGrid>
        </Stack>
      )}
    </Stack>
  );
}

function Kpi({ label, value, color = "govBlue" }: { label: string; value: string | number; color?: string }) {
  return (
    <Card withBorder padding="md" radius="md" bg="white">
      <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.5}>
        {label}
      </Text>
      <Text size="xl" fw={700} c={color} mt={2}>
        {value}
      </Text>
    </Card>
  );
}

function CardChart({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card withBorder padding="md" radius="md" bg="white">
      <Title order={4} c="govBlue.7" mb="sm" size="md">
        {title}
      </Title>
      {children}
    </Card>
  );
}

function Empty({ text = "Sin refugios registrados." }: { text?: string }) {
  return (
    <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Text size="sm" c="dimmed">
        {text}
      </Text>
    </div>
  );
}
