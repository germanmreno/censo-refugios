import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Group,
  NumberInput,
  Paper,
  Radio,
  Select,
  SimpleGrid,
  Stack,
  Stepper,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  buscarJefes,
  crearRefugiado,
  type CrearRefugiadoPayload,
  type JefeOption,
  type RefugiadoCreado,
} from "../../api/refugiados";
import { fetchEstados, fetchMunicipios, fetchParroquias, type GeoItem } from "../../api/geo";
import { fetchRefugios, type Refugio } from "../../api/refugios";
import {
  ETAPA_VIDA_OPTIONS,
  ESTATUS_ACTUAL_OPTIONS,
  ESTATUS_PROPIEDAD_OPTIONS,
  PARENTESCO_OPTIONS,
  TIPO_VIVIENDA_OPTIONS,
  etapaVidaPorEdad,
} from "../../utils/opciones";
import { Field } from "../../components/FormFields";
import { CamaraCaptura } from "../../components/CamaraCaptura";
import { CarnetRefugiado, type CarnetData } from "../../components/CarnetRefugiado";

const DRAFT_KEY = "censo-refugios:draft";

type RolRefugiado = "jefe" | "familiar" | "independiente";

interface FormState {
  rol: RolRefugiado;
  refugioId: string;
  aulaId: string;
  origen: string;
  jefeFamiliaId: string;
  parentesco: string;
  nombre: string;
  apellido: string;
  nacionalidadCedula: string;
  cedula: string;
  telefono: string;
  edad: string;
  etapaVida: string;
  patologia: boolean;
  patologiaDescripcion: string;
  foto: string | null;
  estadoId: string;
  municipioId: string;
  parroquiaId: string;
  sector: string;
  direccion: string;
  tipoVivienda: string;
  estatusPropiedad: string;
  estatusActual: string;
}

const emptyState: FormState = {
  rol: "jefe",
  refugioId: "",
  aulaId: "",
  origen: "",
  jefeFamiliaId: "",
  parentesco: "",
  nombre: "",
  apellido: "",
  nacionalidadCedula: "V",
  cedula: "",
  telefono: "",
  edad: "",
  etapaVida: "",
  patologia: false,
  patologiaDescripcion: "",
  foto: null,
  estadoId: "",
  municipioId: "",
  parroquiaId: "",
  sector: "",
  direccion: "",
  tipoVivienda: "",
  estatusPropiedad: "",
  estatusActual: "",
};

const ROL_OPTIONS: { value: RolRefugiado; label: string; description: string }[] = [
  {
    value: "jefe",
    label: "Jefe de familia",
    description: "Representante legal de un grupo familiar. Puede tener familiares asociados.",
  },
  {
    value: "familiar",
    label: "Familiar de un jefe",
    description: "Llega acompañando a un jefe de familia ya registrado en este refugio.",
  },
  {
    value: "independiente",
    label: "Persona independiente",
    description: "Llega completamente sola, sin familiares asociados a este refugio.",
  },
];

export function CensoForm({ onDone }: { onDone: (created: boolean) => void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return { ...emptyState, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return emptyState;
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [creado, setCreado] = useState<RefugiadoCreado | null>(null);
  const [urlVerificacion, setUrlVerificacion] = useState<string>(
    typeof window !== "undefined" ? `${window.location.origin}/verificar` : "",
  );

  const [refugios, setRefugios] = useState<Refugio[]>([]);
  useEffect(() => {
    (async () => {
      try {
        setRefugios(await fetchRefugios());
      } catch {
        // ignore
      }
    })();
  }, []);
  const aulas = useMemo(
    () => refugios.find((r) => r.id === form.refugioId)?.aulas ?? [],
    [refugios, form.refugioId],
  );

  const [estados, setEstados] = useState<GeoItem[]>([]);
  const [municipios, setMunicipios] = useState<GeoItem[]>([]);
  const [parroquias, setParroquias] = useState<GeoItem[]>([]);
  useEffect(() => {
    fetchEstados().then(setEstados).catch(() => {});
  }, []);
  useEffect(() => {
    setMunicipios([]);
    setParroquias([]);
    setForm((f) => ({ ...f, municipioId: "", parroquiaId: "" }));
    if (form.estadoId) fetchMunicipios(form.estadoId).then(setMunicipios).catch(() => {});
  }, [form.estadoId]);
  useEffect(() => {
    setParroquias([]);
    setForm((f) => ({ ...f, parroquiaId: "" }));
    if (form.estadoId && form.municipioId)
      fetchParroquias(form.estadoId, form.municipioId).then(setParroquias).catch(() => {});
  }, [form.estadoId, form.municipioId]);

  const [jefes, setJefes] = useState<JefeOption[]>([]);
  const [jefeQuery, setJefeQuery] = useState("");
  useEffect(() => {
    if (form.rol !== "familiar" || !form.refugioId) return;
    const q = jefeQuery.trim();
    const t = setTimeout(() => {
      buscarJefes(q, form.refugioId)
        .then(setJefes)
        .catch(() => setJefes([]));
    }, 300);
    return () => clearTimeout(t);
  }, [jefeQuery, form.rol, form.refugioId]);

  useEffect(() => {
    if (creado) return; // No persistir tras éxito
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form, creado]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validarPaso(n: number): string | null {
    if (n === 1) {
      if (!form.refugioId) return "Seleccione un refugio.";
      if (!form.origen.trim()) return "Indique el origen del refugiado.";
      if (form.rol === "familiar") {
        if (!form.jefeFamiliaId) return "Seleccione el jefe de familia al que pertenece.";
        if (!form.parentesco) return "Indique el parentesco.";
      }
      if (!form.nombre.trim() || !form.apellido.trim()) return "Nombre y apellido son obligatorios.";
      const edad = Number(form.edad);
      if (!Number.isInteger(edad) || edad < 0 || edad > 150) return "Edad inválida.";
      if (!form.etapaVida) return "Seleccione la etapa de vida.";
    }
    if (n === 2) {
      if (form.patologia && !form.patologiaDescripcion.trim()) return "Describa la patología.";
    }
    if (n === 3) {
      if (!form.estadoId || !form.municipioId || !form.parroquiaId) return "Complete estado, municipio y parroquia.";
      if (!form.sector.trim() || !form.direccion.trim()) return "Sector y dirección son obligatorios.";
    }
    if (n === 4) {
      if (!form.tipoVivienda || !form.estatusPropiedad || !form.estatusActual)
        return "Complete todos los campos de la vivienda.";
    }
    return null;
  }

  function siguiente() {
    const err = validarPaso(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(6, s + 1));
  }

  function anterior() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleSubmit() {
    const err = validarPaso(4);
    if (err) {
      setError(err);
      setStep(1);
      return;
    }
    setError(null);
    setSubmitting(true);

    const estadoNombre = estados.find((e) => e.id === form.estadoId)?.nombre ?? form.estadoId;
    const municipioNombre = municipios.find((m) => m.id === form.municipioId)?.nombre ?? form.municipioId;
    const parroquiaNombre = parroquias.find((p) => p.id === form.parroquiaId)?.nombre ?? form.parroquiaId;

    const payload: CrearRefugiadoPayload = {
      refugioId: form.refugioId,
      aulaId: form.aulaId || null,
      origen: form.origen.trim(),
      jefeFamilia: form.rol === "jefe",
      jefeFamiliaId: form.rol === "familiar" ? form.jefeFamiliaId || null : null,
      parentesco: form.rol === "familiar" ? form.parentesco || null : null,
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      nacionalidadCedula: form.cedula.trim() ? form.nacionalidadCedula : null,
      cedula: form.cedula.trim() || null,
      telefono: form.telefono.trim() || null,
      edad: Number(form.edad),
      etapaVida: form.etapaVida,
      patologia: form.patologia,
      patologiaDescripcion: form.patologia ? form.patologiaDescripcion.trim() : null,
      foto: form.foto,
      estado: estadoNombre,
      municipio: municipioNombre,
      parroquia: parroquiaNombre,
      sector: form.sector.trim(),
      direccion: form.direccion.trim(),
      tipoVivienda: form.tipoVivienda,
      estatusPropiedad: form.estatusPropiedad,
      estatusActual: form.estatusActual,
    };

    try {
      const result = await crearRefugiado(payload);
      setCreado(result);
      setUrlVerificacion(`${window.location.origin}/verificar`);
      localStorage.removeItem(DRAFT_KEY);
      setStep(6); // ir al carnet
      notifications.show({ message: "Refugiado registrado correctamente", color: "govGreen" });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } | { detalles?: unknown } } })?.response?.data;
      const text =
        (msg && !Array.isArray(msg) && "error" in msg ? msg.error : null) ??
        "No se pudo registrar el refugiado. Revise los campos.";
      setError(text);
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Pantalla de éxito: carnet imprimible ──────────────────────────────
  if (creado && step === 6) {
    const refugio = refugios.find((r) => r.id === creado.refugioId);
    const aula = aulas.find((a) => a.id === creado.aulaId) ?? null;
    const carnetData: CarnetData = {
      id: creado.id,
      verificacionToken: creado.verificacionToken,
      nombre: creado.nombre,
      apellido: creado.apellido,
      nacionalidadCedula: creado.nacionalidadCedula,
      cedula: creado.cedula,
      edad: creado.edad,
      etapaVida: creado.etapaVida,
      telefono: creado.telefono,
      foto: creado.foto,
      refugio: refugio
        ? { id: refugio.id, nombre: refugio.nombre, ubicacion: refugio.ubicacion }
        : { id: creado.refugioId, nombre: creado.refugio?.nombre ?? "Refugio" },
      aula: aula ? { id: aula.id, nombre: aula.nombre } : null,
      createdAt: new Date().toISOString(),
    };
    return (
      <Stack gap="md">
        <Title order={2} c="govBlue.7" mb={0} ta="center">
          Registro completado
        </Title>
        <Text c="dimmed" ta="center">
          Se ha generado el carnet oficial del refugiado. Imprímalo o guárdelo para su entrega.
        </Text>
        <CarnetRefugiado data={carnetData} urlVerificacion={urlVerificacion} />
        <Group justify="center" gap="md" className="no-print">
          <Button color="govBlue" leftSection={<span>🖨️</span>} onClick={() => window.print()}>
            Imprimir carnet
          </Button>
          <Button variant="default" onClick={() => onDone(true)}>
            Volver al listado
          </Button>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Stepper active={step - 1} onStepClick={setStep} allowNextStepsSelect={false} color="govBlue">
        <Stepper.Step label="Datos" description="Persona y rol" />
        <Stepper.Step label="Salud" description="Patologías" />
        <Stepper.Step label="Ubicación" description="Siniestro" />
        <Stepper.Step label="Vivienda" description="Estatus final" />
        <Stepper.Step label="Foto" description="Identificación visual" />
        <Stepper.Step label="Carnet" description="QR de verificación" />
      </Stepper>

      {step === 1 && (
        <Card withBorder p="lg" radius="md" bg="white">
          <Stack gap="sm">
            <Title order={4} c="govBlue.7" mb={0}>
              Rol en el refugio
            </Title>
            <Radio.Group
              value={form.rol}
              onChange={(v) => update("rol", v as RolRefugiado)}
            >
              <Stack gap="xs">
                {ROL_OPTIONS.map((opt) => (
                  <Paper
                    key={opt.value}
                    withBorder
                    p="sm"
                    radius="sm"
                    style={{
                      background: form.rol === opt.value ? "#e3eef7" : "transparent",
                      borderColor: form.rol === opt.value ? "#1e3a5f" : undefined,
                    }}
                  >
                    <Radio
                      value={opt.value}
                      label={
                        <Box>
                          <Text fw={600}>{opt.label}</Text>
                          <Text size="xs" c="dimmed">
                            {opt.description}
                          </Text>
                        </Box>
                      }
                    />
                  </Paper>
                ))}
              </Stack>
            </Radio.Group>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <Field label="Refugio" htmlFor="refugioId" required>
                <Select
                  id="refugioId"
                  value={form.refugioId || null}
                  onChange={(v) => update("refugioId", v ?? "")}
                  data={refugios.map((r) => ({ value: r.id, label: r.nombre }))}
                  placeholder="Seleccione refugio"
                  comboboxProps={{ withinPortal: true }}
                  allowDeselect={false}
                  clearable={false}
                />
              </Field>
              <Field label="Aula del refugio" htmlFor="aulaId">
                <Select
                  id="aulaId"
                  value={form.aulaId || null}
                  onChange={(v) => update("aulaId", v ?? "")}
                  data={aulas.map((a) => ({ value: a.id, label: a.nombre }))}
                  placeholder="Sin asignar"
                  disabled={aulas.length === 0}
                  comboboxProps={{ withinPortal: true }}
                  allowDeselect={false}
                  clearable={false}
                />
              </Field>
            </SimpleGrid>

            <Field label="Origen del refugiado" htmlFor="origen" required hint="Lugar de procedencia antes del refugio.">
              <TextInput
                id="origen"
                value={form.origen}
                onChange={(e) => update("origen", e.currentTarget.value)}
              />
            </Field>

            {form.rol === "familiar" && (
              <Paper withBorder p="md" radius="md" bg="govYellow.0">
                <Field label="Buscar jefe de familia" htmlFor="jefeQ">
                  <TextInput
                    id="jefeQ"
                    value={jefeQuery}
                    onChange={(e) => setJefeQuery(e.currentTarget.value)}
                    placeholder="Nombre, apellido o cédula…"
                  />
                </Field>
                {jefes.length > 0 && (
                  <Stack gap="xs" mt="xs">
                    {jefes.map((j) => {
                      const sel = form.jefeFamiliaId === j.id;
                      return (
                        <Button
                          key={j.id}
                          onClick={() => update("jefeFamiliaId", j.id)}
                          variant={sel ? "filled" : "outline"}
                          color={sel ? "govGreen" : "gray"}
                          fullWidth
                          justify="flex-start"
                          styles={{ root: { height: "auto", padding: "0.5rem 0.75rem" } }}
                        >
                          <Text size="sm" fw={600}>
                            {j.nombre} {j.apellido}
                          </Text>
                          {j.cedula && (
                            <Text size="xs" c="dimmed" ml="xs">
                              · {j.nacionalidadCedula}-{j.cedula}
                            </Text>
                          )}
                          <Text size="xs" c="dimmed" ml="xs">
                            · {j.edad} años · {j.refugio.nombre}
                          </Text>
                        </Button>
                      );
                    })}
                  </Stack>
                )}
                {form.jefeFamiliaId && (
                  <Field label="Parentesco" htmlFor="parentesco" required>
                    <Select
                      id="parentesco"
                      value={form.parentesco || null}
                      onChange={(v) => update("parentesco", v ?? "")}
                      data={PARENTESCO_OPTIONS}
                      comboboxProps={{ withinPortal: true }}
                      clearable={false}
                    />
                  </Field>
                )}
              </Paper>
            )}

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <Field label="Nombre" htmlFor="nombre" required>
                <TextInput id="nombre" value={form.nombre} onChange={(e) => update("nombre", e.currentTarget.value)} />
              </Field>
              <Field label="Apellido" htmlFor="apellido" required>
                <TextInput
                  id="apellido"
                  value={form.apellido}
                  onChange={(e) => update("apellido", e.currentTarget.value)}
                />
              </Field>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
              <Field label="Nacionalidad" htmlFor="nacionalidadCedula">
                <Select
                  id="nacionalidadCedula"
                  value={form.nacionalidadCedula || null}
                  onChange={(v) => update("nacionalidadCedula", v ?? "")}
                  data={[
                    { value: "V", label: "V - Venezolano" },
                    { value: "E", label: "E - Extranjero" },
                  ]}
                  comboboxProps={{ withinPortal: true }}
                  clearable={false}
                />
              </Field>
              <Box style={{ gridColumn: "span 2" }}>
                <Field label="Número de cédula" htmlFor="cedula" hint="Opcional si no posee por edad.">
                  <TextInput id="cedula" value={form.cedula} onChange={(e) => update("cedula", e.currentTarget.value)} />
                </Field>
              </Box>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <Field label="Teléfono" htmlFor="telefono">
                <TextInput
                  id="telefono"
                  value={form.telefono}
                  onChange={(e) => update("telefono", e.currentTarget.value)}
                />
              </Field>
              <Field label="Edad" htmlFor="edad" required>
                <NumberInput
                  id="edad"
                  min={0}
                  max={150}
                  value={form.edad === "" ? "" : Number(form.edad)}
                  onChange={(v) => {
                    const str = String(v ?? "");
                    update("edad", str);
                    const n = Number(str);
                    if (Number.isInteger(n) && n >= 0) update("etapaVida", etapaVidaPorEdad(n));
                  }}
                  hideControls
                />
              </Field>
            </SimpleGrid>

            <Field label="Etapa de vida" htmlFor="etapaVida" required>
              <Select
                id="etapaVida"
                value={form.etapaVida || null}
                onChange={(v) => update("etapaVida", v ?? "")}
                data={ETAPA_VIDA_OPTIONS}
                comboboxProps={{ withinPortal: true }}
                clearable={false}
              />
            </Field>
          </Stack>
        </Card>
      )}

      {step === 2 && (
        <Card withBorder p="lg" radius="md" bg="white">
          <Stack gap="sm">
            <Title order={4} c="govBlue.7" mb={0}>
              Condición de salud
            </Title>
            <Paper
              withBorder
              p="md"
              radius="md"
              style={{
                background: form.patologia ? "#fff8e1" : "#fafbfc",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
              }}
            >
              <input
                id="patologia"
                type="checkbox"
                checked={form.patologia}
                onChange={(e) => update("patologia", e.currentTarget.checked)}
                style={{ width: 18, height: 18, marginTop: 4, cursor: "pointer" }}
                aria-label="Posee alguna patología"
              />
              <label htmlFor="patologia" style={{ cursor: "pointer", flex: 1 }}>
                <Text fw={600} size="sm">
                  ¿Posee alguna patología?
                </Text>
                <Text size="xs" c="dimmed">
                  Active solo si el refugiado presenta una condición de salud relevante.
                </Text>
              </label>
            </Paper>
            {form.patologia && (
              <Field label="Especifique la patología" htmlFor="patologiaDesc" required>
                <Textarea
                  id="patologiaDesc"
                  value={form.patologiaDescripcion}
                  onChange={(e) => update("patologiaDescripcion", e.currentTarget.value)}
                  autosize
                  minRows={3}
                  placeholder="Ej: hipertensión, diabetes, asma…"
                />
              </Field>
            )}
          </Stack>
        </Card>
      )}

      {step === 3 && (
        <Card withBorder p="lg" radius="md" bg="white">
          <Stack gap="sm">
            <Title order={4} c="govBlue.7" mb={0}>
              Ubicación del siniestro
            </Title>
            <Text size="sm" c="dimmed" mb={0}>
              Datos de la vivienda afectada por el sismo.
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
              <Field label="Estado" htmlFor="estadoId" required>
                <Select
                  id="estadoId"
                  value={form.estadoId || null}
                  onChange={(v) => update("estadoId", v ?? "")}
                  data={estados.map((e) => ({ value: e.id, label: e.nombre }))}
                  comboboxProps={{ withinPortal: true }}
                  clearable={false}
                />
              </Field>
              <Field label="Municipio" htmlFor="municipioId" required>
                <Select
                  id="municipioId"
                  value={form.municipioId || null}
                  onChange={(v) => update("municipioId", v ?? "")}
                  data={municipios.map((m) => ({ value: m.id, label: m.nombre }))}
                  disabled={!form.estadoId}
                  comboboxProps={{ withinPortal: true }}
                  clearable={false}
                />
              </Field>
              <Field label="Parroquia" htmlFor="parroquiaId" required>
                <Select
                  id="parroquiaId"
                  value={form.parroquiaId || null}
                  onChange={(v) => update("parroquiaId", v ?? "")}
                  data={parroquias.map((p) => ({ value: p.id, label: p.nombre }))}
                  disabled={!form.municipioId}
                  comboboxProps={{ withinPortal: true }}
                  clearable={false}
                />
              </Field>
            </SimpleGrid>
            <Field label="Sector" htmlFor="sector" required>
              <TextInput
                id="sector"
                value={form.sector}
                onChange={(e) => update("sector", e.currentTarget.value)}
              />
            </Field>
            <Field label="Dirección" htmlFor="direccion" required>
              <Textarea
                id="direccion"
                value={form.direccion}
                onChange={(e) => update("direccion", e.currentTarget.value)}
                autosize
                minRows={2}
              />
            </Field>
          </Stack>
        </Card>
      )}

      {step === 4 && (
        <Card withBorder p="lg" radius="md" bg="white">
          <Stack gap="sm">
            <Title order={4} c="govBlue.7" mb={0}>
              Condición de la vivienda
            </Title>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
              <Field label="Tipo de vivienda" htmlFor="tipoVivienda" required>
                <Select
                  id="tipoVivienda"
                  value={form.tipoVivienda || null}
                  onChange={(v) => update("tipoVivienda", v ?? "")}
                  data={TIPO_VIVIENDA_OPTIONS}
                  comboboxProps={{ withinPortal: true }}
                  clearable={false}
                />
              </Field>
              <Field label="Estatus de la propiedad" htmlFor="estatusPropiedad" required>
                <Select
                  id="estatusPropiedad"
                  value={form.estatusPropiedad || null}
                  onChange={(v) => update("estatusPropiedad", v ?? "")}
                  data={ESTATUS_PROPIEDAD_OPTIONS}
                  comboboxProps={{ withinPortal: true }}
                  clearable={false}
                />
              </Field>
              <Field label="Estatus actual" htmlFor="estatusActual" required>
                <Select
                  id="estatusActual"
                  value={form.estatusActual || null}
                  onChange={(v) => update("estatusActual", v ?? "")}
                  data={ESTATUS_ACTUAL_OPTIONS}
                  comboboxProps={{ withinPortal: true }}
                  clearable={false}
                />
              </Field>
            </SimpleGrid>

            <Paper withBorder p="md" radius="md" bg="govBlue.0">
              <Text fw={700} c="govBlue.7" mb="xs">
                Resumen
              </Text>
              <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.9rem", color: "#1f2933" }}>
                <li>
                  <strong>
                    {form.nombre} {form.apellido}
                  </strong>{" "}
                  · {form.edad} años ·{" "}
                  {form.rol === "jefe"
                    ? "Jefe de familia"
                    : form.rol === "familiar"
                      ? `Familiar (${PARENTESCO_OPTIONS.find((p) => p.value === form.parentesco)?.label ?? "—"})`
                      : "Persona independiente"}
                </li>
                <li>Refugio: {refugios.find((r) => r.id === form.refugioId)?.nombre ?? "—"}</li>
                <li>{form.patologia ? `Patología: ${form.patologiaDescripcion}` : "Sin patología"}</li>
                <li>
                  {form.sector}, {parroquias.find((p) => p.id === form.parroquiaId)?.nombre ?? "—"}
                </li>
                <li>
                  Vivienda {form.tipoVivienda} ·{" "}
                  {ESTATUS_ACTUAL_OPTIONS.find((e) => e.value === form.estatusActual)?.label}
                </li>
              </ul>
            </Paper>
          </Stack>
        </Card>
      )}

      {step === 5 && (
        <Card withBorder p="lg" radius="md" bg="white">
          <Stack gap="sm">
            <Title order={4} c="govBlue.7" mb={0}>
              Foto del refugiado
            </Title>
            <Text size="sm" c="dimmed">
              Tome una foto con la cámara web o suba una imagen desde el dispositivo. La foto aparecerá
              en el carnet y la página de verificación pública.
            </Text>
            <CamaraCaptura value={form.foto} onChange={(v) => update("foto", v)} />
          </Stack>
        </Card>
      )}

      {error && (
        <Alert color="govRed" role="alert" variant="light">
          {error}
        </Alert>
      )}

      {step < 6 && (
        <Group justify="space-between" mt="md" className="no-print">
          <Button onClick={anterior} disabled={step === 1} variant="default">
            ← Anterior
          </Button>
          {step < 5 ? (
            <Button onClick={siguiente} color="govBlue">
              Siguiente →
            </Button>
          ) : (
            <Button onClick={handleSubmit} loading={submitting} color="govBlue">
              Registrar y generar carnet
            </Button>
          )}
        </Group>
      )}
    </Stack>
  );
}
