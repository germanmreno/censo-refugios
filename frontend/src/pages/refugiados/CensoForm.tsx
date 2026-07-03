import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
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
  crearRefugiado,
  crearAfectadoBatch,
  type CrearRefugiadoPayload,
  type CrearAfectadoBatchPayload,
  type RefugiadoCreado,
} from "../../api/refugiados";
import { fetchEstados, fetchMunicipios, fetchParroquias, type GeoItem } from "../../api/geo";
import { fetchRefugios } from "../../api/refugios";
import {
  ETAPA_VIDA_OPTIONS,
  ESTATUS_ACTUAL_OPTIONS,
  ESTATUS_PROPIEDAD_OPTIONS,
  PARENTESCO_OPTIONS,
  TIPO_SANGRE_OPTIONS,
  TIPO_MASCOTA_OPTIONS,
  TIPO_VIVIENDA_OPTIONS,
  etapaVidaPorEdad,
} from "../../utils/opciones";
import { Field } from "../../components/FormFields";
import { CamaraCaptura } from "../../components/CamaraCaptura";
import { CarnetRefugiado, type CarnetData } from "../../components/CarnetRefugiado";

const DRAFT_KEY = "censo-afectados:draft";
type RolAfectado = "jefe" | "independiente";

interface FamiliarForm {
  uid: string;
  parentesco: string;
  numeroBrazalete: string;
  nombre: string;
  apellido: string;
  nacionalidadCedula: string;
  cedula: string;
  edad: string;
  etapaVida: string;
  tipoSangre: string;
  telefono: string;
  patologia: boolean;
  patologiaDescripcion: string;
  foto: string | null;
}

function genId() { return Math.random().toString(36).slice(2, 10); }

const emptyFamiliar = (): FamiliarForm => ({
  uid: genId(), parentesco: "", numeroBrazalete: "", nombre: "", apellido: "",
  nacionalidadCedula: "V", cedula: "", edad: "", etapaVida: "", tipoSangre: "",
  telefono: "", patologia: false, patologiaDescripcion: "", foto: null,
});

interface FormState {
  rol: RolAfectado;
  refugioId: string; moduloId: string; aulaId: string; origen: string;
  nombre: string; apellido: string; nacionalidadCedula: string; cedula: string;
  telefono: string; edad: string; etapaVida: string; numeroBrazalete: string;
  tipoSangre: string; patologia: boolean; patologiaDescripcion: string; foto: string | null;
  familiares: FamiliarForm[];
  estadoId: string; municipioId: string; parroquiaId: string; sector: string; direccion: string;
  tipoVivienda: string; estatusPropiedad: string; estatusActual: string;
  tieneMascota: boolean; mascotaTipo: string; mascotaColor: string;
  mascotaIdentificador: boolean; mascotaFoto: string | null;
}

const emptyState: FormState = {
  rol: "independiente",
  refugioId: "", moduloId: "", aulaId: "", origen: "",
  nombre: "", apellido: "", nacionalidadCedula: "V", cedula: "", telefono: "",
  edad: "", etapaVida: "", numeroBrazalete: "", tipoSangre: "",
  patologia: false, patologiaDescripcion: "", foto: null,
  familiares: [],
  estadoId: "", municipioId: "", parroquiaId: "", sector: "", direccion: "",
  tipoVivienda: "", estatusPropiedad: "", estatusActual: "",
  tieneMascota: false, mascotaTipo: "", mascotaColor: "", mascotaIdentificador: false, mascotaFoto: null,
};

export function CensoForm({ onDone }: { onDone: (created: boolean) => void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(() => {
    try { const saved = localStorage.getItem(DRAFT_KEY); if (saved) return { ...emptyState, ...JSON.parse(saved) }; } catch { /* ignore */ }
    return emptyState;
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [creado, setCreado] = useState<RefugiadoCreado | null>(null);

  const [refugios, setRefugios] = useState<Awaited<ReturnType<typeof fetchRefugios>>>([]);
  const [estados, setEstados] = useState<GeoItem[]>([]);
  const [municipios, setMunicipios] = useState<GeoItem[]>([]);
  const [parroquias, setParroquias] = useState<GeoItem[]>([]);

  useEffect(() => { fetchRefugios().then(setRefugios).catch(() => {}); }, []);
  useEffect(() => { fetchEstados().then(setEstados).catch(() => {}); }, []);

  useEffect(() => {
    setMunicipios([]); setParroquias([]);
    setForm((f) => ({ ...f, municipioId: "", parroquiaId: "" }));
    if (form.estadoId) fetchMunicipios(form.estadoId).then(setMunicipios).catch(() => {});
  }, [form.estadoId]);
  useEffect(() => {
    setParroquias([]);
    setForm((f) => ({ ...f, parroquiaId: "" }));
    if (form.estadoId && form.municipioId)
      fetchParroquias(form.estadoId, form.municipioId).then(setParroquias).catch(() => {});
  }, [form.estadoId, form.municipioId]);

  const modulos = useMemo(() => {
    const r = refugios.find((x) => x.id === form.refugioId);
    return r?.modulos ?? [];
  }, [refugios, form.refugioId]);

  const aulas = useMemo(() => {
    const mo = modulos.find((x) => x.id === form.moduloId);
    return mo?.aulas ?? [];
  }, [modulos, form.moduloId]);

  // Persist draft
  useEffect(() => {
    if (creado) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form, creado]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateFamiliar(i: number, key: string, value: string | boolean | null) {
    setForm((f) => ({
      ...f,
      familiares: f.familiares.map((x, idx) => (idx === i ? { ...x, [key]: value } : x)),
    }));
  }

  function addFamiliar() {
    setForm((f) => ({ ...f, familiares: [...f.familiares, emptyFamiliar()] }));
  }

  function removeFamiliar(i: number) {
    setForm((f) => ({ ...f, familiares: f.familiares.filter((_, idx) => idx !== i) }));
  }

  function validarPaso(n: number): string | null {
    if (n === 1) {
      if (!form.refugioId) return "Seleccione un centro.";
      if (!form.origen.trim()) return "Indique el origen del afectado.";
      if (!form.nombre.trim() || !form.apellido.trim()) return "Nombre y apellido son obligatorios.";
      const edad = Number(form.edad);
      if (!Number.isInteger(edad) || edad < 0 || edad > 150) return "Edad inválida.";
      if (!form.etapaVida) return "Seleccione la etapa de vida.";
    }
    if (n === 2) {
      if (form.patologia && !form.patologiaDescripcion.trim()) return "Describa la patología del jefe.";
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
    if (err) { setError(err); return; }
    setError(null);
    setStep((s) => Math.min(6, s + 1));
  }

  function anterior() { setError(null); setStep((s) => Math.max(1, s - 1)); }

  async function handleSubmit() {
    const err = validarPaso(1) || validarPaso(2) || validarPaso(3) || validarPaso(4);
    if (err) { setError(err); return; }
    setError(null);
    setSubmitting(true);

    const estadoNombre = estados.find((e) => e.id === form.estadoId)?.nombre ?? form.estadoId;
    const municipioNombre = municipios.find((m) => m.id === form.municipioId)?.nombre ?? form.municipioId;
    const parroquiaNombre = parroquias.find((p) => p.id === form.parroquiaId)?.nombre ?? form.parroquiaId;

    try {
      if (form.rol === "independiente" || form.familiares.length === 0) {
        const payload: CrearRefugiadoPayload = {
          refugioId: form.refugioId, aulaId: form.aulaId || null, origen: form.origen.trim(),
          jefeFamilia: false, nombre: form.nombre.trim(), apellido: form.apellido.trim(),
          nacionalidadCedula: form.cedula.trim() ? form.nacionalidadCedula : null,
          cedula: form.cedula.trim() || null, telefono: form.telefono.trim() || null,
          edad: Number(form.edad), etapaVida: form.etapaVida,
          numeroBrazalete: form.numeroBrazalete.trim() || null,
          tipoSangre: form.tipoSangre || null,
          patologia: form.patologia,
          patologiaDescripcion: form.patologia ? form.patologiaDescripcion.trim() : null,
          foto: form.foto,
          estado: estadoNombre, municipio: municipioNombre, parroquia: parroquiaNombre,
          sector: form.sector.trim(), direccion: form.direccion.trim(),
          tipoVivienda: form.tipoVivienda, estatusPropiedad: form.estatusPropiedad,
          estatusActual: form.estatusActual,
        };
        const result = await crearRefugiado(payload);
        setCreado(result);
      } else {
        const batch: CrearAfectadoBatchPayload = {
          refugioId: form.refugioId, aulaId: form.aulaId || null, origen: form.origen.trim(),
          estado: estadoNombre, municipio: municipioNombre, parroquia: parroquiaNombre,
          sector: form.sector.trim(), direccion: form.direccion.trim(),
          tipoVivienda: form.tipoVivienda, estatusPropiedad: form.estatusPropiedad,
          estatusActual: form.estatusActual,
          jefe: {
            numeroBrazalete: form.numeroBrazalete.trim() || null,
            nombre: form.nombre.trim(), apellido: form.apellido.trim(),
            nacionalidadCedula: form.cedula.trim() ? form.nacionalidadCedula : null,
            cedula: form.cedula.trim() || null, telefono: form.telefono.trim() || null,
            edad: Number(form.edad), etapaVida: form.etapaVida,
            tipoSangre: form.tipoSangre || null,
            patologia: form.patologia,
            patologiaDescripcion: form.patologia ? form.patologiaDescripcion.trim() : null,
            foto: form.foto,
          },
          familiares: form.familiares.map((f) => ({
            parentesco: f.parentesco,
            numeroBrazalete: f.numeroBrazalete.trim() || null,
            nombre: f.nombre.trim(), apellido: f.apellido.trim(),
            nacionalidadCedula: f.nacionalidadCedula || null,
            cedula: f.cedula.trim() || null,
            edad: Number(f.edad), etapaVida: f.etapaVida,
            tipoSangre: f.tipoSangre || null,
            patologia: f.patologia,
            patologiaDescripcion: f.patologia ? f.patologiaDescripcion.trim() : null,
            foto: f.foto,
          })),
          mascota: form.tieneMascota
            ? { tipo: form.mascotaTipo, color: form.mascotaColor.trim() || null,
                tieneIdentificador: form.mascotaIdentificador, foto: form.mascotaFoto }
            : null,
        };
        const result = await crearAfectadoBatch(batch);
        setCreado(result.jefe);
      }
      localStorage.removeItem(DRAFT_KEY);
      setStep(6);
      notifications.show({ message: "Registrado correctamente", color: "govGreen" });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "No se pudo registrar. Revise los campos.");
    } finally {
      setSubmitting(false);
    }
  }

  // Pantalla de carnet final
  if (creado && step === 6) {
    const refugio = refugios.find((r) => r.id === creado.refugioId);
    const aula = aulas.find((a) => a.id === creado.aulaId) ?? null;
    const carnetData: CarnetData = {
      id: creado.id, verificacionToken: creado.verificacionToken,
      nombre: creado.nombre, apellido: creado.apellido,
      nacionalidadCedula: creado.nacionalidadCedula, cedula: creado.cedula,
      edad: creado.edad, etapaVida: creado.etapaVida,
      tipoSangre: creado.tipoSangre ?? null,
      numeroBrazalete: creado.numeroBrazalete ?? null,
      telefono: creado.telefono, foto: creado.foto,
      refugio: refugio ? { id: refugio.id, nombre: refugio.nombre, ubicacion: refugio.ubicacion }
        : { id: creado.refugioId, nombre: creado.refugio?.nombre ?? "Centro" },
      aula: aula ?? null, createdAt: new Date().toISOString(),
      familiares: form.familiares.length > 0
        ? form.familiares.map((f) => ({
            id: f.uid, nombre: f.nombre, apellido: f.apellido,
            parentesco: f.parentesco || null, edad: Number(f.edad),
            tipoSangre: f.tipoSangre || null, numeroBrazalete: f.numeroBrazalete || null,
          }))
        : undefined,
      mascota: form.tieneMascota ? {
        tipo: form.mascotaTipo, color: form.mascotaColor || null,
        tieneIdentificador: form.mascotaIdentificador, foto: form.mascotaFoto,
      } : null,
    };
    return (
      <Stack gap="md">
        <Title order={2} c="govBlue.7" mb={0} ta="center">Registro completado</Title>
        <Text c="dimmed" ta="center">
          Se ha generado el carnet oficial. Imprímalo para su entrega.
        </Text>
        <CarnetRefugiado data={carnetData}
          urlVerificacion={typeof window !== "undefined" ? `${window.location.origin}/verificar` : ""} />
        <Group justify="center" className="no-print">
          <Button color="govBlue" leftSection={<span>🖨️</span>} onClick={() => window.print()}>Imprimir carnet</Button>
          <Button variant="default" onClick={() => onDone(true)}>Volver al listado</Button>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Stepper active={step - 1} onStepClick={setStep} allowNextStepsSelect={false} color="govBlue">
        <Stepper.Step label="Asignación" description="Centro + Módulo + Aula" />
        <Stepper.Step label="Datos" description={form.rol === "jefe" ? "Jefe + Familiares" : "Datos del afectado"} />
        <Stepper.Step label="Ubicación" description="Siniestro" />
        <Stepper.Step label="Vivienda" description="Estatus final" />
        <Stepper.Step label="Mascota" description="Opcional" />
        <Stepper.Step label="Carnet" description="QR de verificación" />
      </Stepper>

      {/* Paso 1: Asignación */}
      {step === 1 && (
        <Card withBorder p="lg" radius="md" bg="white">
          <Stack gap="sm">
            <Radio.Group value={form.rol} onChange={(v) => update("rol", v as RolAfectado)}>
              <Group gap="lg" mb="sm">
                <Radio value="independiente" label="Persona independiente" />
                <Radio value="jefe" label="Jefe de familia" />
              </Group>
            </Radio.Group>
            <Field label="Centro" htmlFor="refugioId" required>
              <Select id="refugioId" value={form.refugioId || null}
                onChange={(v) => update("refugioId", v ?? "")}
                data={refugios.map((r) => ({ value: r.id, label: r.nombre }))}
                placeholder="Seleccione centro" comboboxProps={{ withinPortal: true }} clearable={false} />
            </Field>
            <Field label="Módulo" htmlFor="moduloId">
              <Select id="moduloId" value={form.moduloId || null}
                onChange={(v) => { update("moduloId", v ?? ""); update("aulaId", ""); }}
                data={modulos.map((m) => ({ value: m.id, label: m.nombre }))}
                placeholder="Seleccione módulo" disabled={!form.refugioId}
                comboboxProps={{ withinPortal: true }} clearable={false} />
            </Field>
            <Field label="Aula" htmlFor="aulaId" hint="Camas disponibles">
              <Select id="aulaId" value={form.aulaId || null}
                onChange={(v) => update("aulaId", v ?? "")}
                data={aulas.map((a: { id: string; nombre: string; capacidad?: number | null }) => ({
                  value: a.id, label: a.capacidad ? `${a.nombre} (${a.capacidad} camas)` : a.nombre,
                }))}
                placeholder="Sin asignar" disabled={aulas.length === 0}
                comboboxProps={{ withinPortal: true }} />
            </Field>
            <Field label="Origen del afectado" htmlFor="origen" required hint="Lugar de procedencia antes del centro.">
              <TextInput id="origen" value={form.origen} onChange={(e) => update("origen", e.currentTarget.value)} />
            </Field>
          </Stack>
        </Card>
      )}

      {/* Paso 2: Datos personales */}
      {step === 2 && (
        <Card withBorder p="lg" radius="md" bg="white">
          <Stack gap="sm">
            <Title order={4} c="govBlue.7" mb={0}>
              {form.rol === "jefe" ? "Datos del jefe de familia" : "Datos del afectado"}
            </Title>
            <PersonFields
              form={form}
              onChange={(key, value) => update(key as keyof FormState, value as FormState[keyof FormState])}
              prefix="" />

            {form.rol === "jefe" && (
              <>
                <Divider label="Familiares" />
                <Text size="sm" c="dimmed">Los familiares comparten la misma ubicación y vivienda.</Text>
                {form.familiares.map((f, i) => (
                  <Paper key={f.uid} withBorder p="md" radius="md" bg="gray.0">
                    <Group justify="space-between" mb="xs">
                      <Text fw={600} size="sm">Familiar {i + 1}</Text>
                      <Button size="xs" color="govRed" variant="outline" onClick={() => removeFamiliar(i)}>Quitar</Button>
                    </Group>
                    <Field label="Parentesco" htmlFor={`parentesco${i}`} required>
                      <Select id={`parentesco${i}`} value={f.parentesco || null}
                        onChange={(v) => updateFamiliar(i, "parentesco", v ?? "")}
                        data={PARENTESCO_OPTIONS} comboboxProps={{ withinPortal: true }} clearable={false} />
                    </Field>
                    <PersonFields
                      form={f}
                      onChange={(key, value) => updateFamiliar(i, key, value)}
                      prefix={`fam${i}`} />
                  </Paper>
                ))}
                <Button variant="light" color="govBlue" onClick={addFamiliar} leftSection={<span>+</span>}>
                  Agregar familiar
                </Button>
              </>
            )}
          </Stack>
        </Card>
      )}

      {/* Paso 3: Ubicación */}
      {step === 3 && (
        <Card withBorder p="lg" radius="md" bg="white">
          <Stack gap="sm">
            <Text size="sm" c="dimmed" mb={0}>Datos compartidos de la vivienda afectada por el sismo.</Text>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
              <Field label="Estado" htmlFor="estadoId" required>
                <Select id="estadoId" value={form.estadoId || null}
                  onChange={(v) => update("estadoId", v ?? "")}
                  data={estados.map((e) => ({ value: e.id, label: e.nombre }))}
                  comboboxProps={{ withinPortal: true }} />
              </Field>
              <Field label="Municipio" htmlFor="municipioId" required>
                <Select id="municipioId" value={form.municipioId || null}
                  onChange={(v) => update("municipioId", v ?? "")}
                  data={municipios.map((m) => ({ value: m.id, label: m.nombre }))}
                  disabled={!form.estadoId} comboboxProps={{ withinPortal: true }} />
              </Field>
              <Field label="Parroquia" htmlFor="parroquiaId" required>
                <Select id="parroquiaId" value={form.parroquiaId || null}
                  onChange={(v) => update("parroquiaId", v ?? "")}
                  data={parroquias.map((p) => ({ value: p.id, label: p.nombre }))}
                  disabled={!form.municipioId} comboboxProps={{ withinPortal: true }} />
              </Field>
            </SimpleGrid>
            <Field label="Sector" htmlFor="sector" required>
              <TextInput id="sector" value={form.sector} onChange={(e) => update("sector", e.currentTarget.value)} />
            </Field>
            <Field label="Dirección" htmlFor="direccion" required>
              <Textarea id="direccion" value={form.direccion}
                onChange={(e) => update("direccion", e.currentTarget.value)} autosize minRows={2} />
            </Field>
          </Stack>
        </Card>
      )}

      {/* Paso 4: Vivienda */}
      {step === 4 && (
        <Card withBorder p="lg" radius="md" bg="white">
          <Stack gap="sm">
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
              <Field label="Tipo de vivienda" htmlFor="tipoVivienda" required>
                <Select id="tipoVivienda" value={form.tipoVivienda || null}
                  onChange={(v) => update("tipoVivienda", v ?? "")} data={TIPO_VIVIENDA_OPTIONS}
                  comboboxProps={{ withinPortal: true }} />
              </Field>
              <Field label="Estatus propiedad" htmlFor="estatusPropiedad" required>
                <Select id="estatusPropiedad" value={form.estatusPropiedad || null}
                  onChange={(v) => update("estatusPropiedad", v ?? "")} data={ESTATUS_PROPIEDAD_OPTIONS}
                  comboboxProps={{ withinPortal: true }} />
              </Field>
              <Field label="Estatus actual" htmlFor="estatusActual" required>
                <Select id="estatusActual" value={form.estatusActual || null}
                  onChange={(v) => update("estatusActual", v ?? "")} data={ESTATUS_ACTUAL_OPTIONS}
                  comboboxProps={{ withinPortal: true }} />
              </Field>
            </SimpleGrid>
          </Stack>
        </Card>
      )}

      {/* Paso 5: Mascota */}
      {step === 5 && (
        <Card withBorder p="lg" radius="md" bg="white">
          <Stack gap="sm">
            <Checkbox
              label="¿Tienen mascota?"
              checked={form.tieneMascota}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("tieneMascota", e.currentTarget.checked)}
            />
            {form.tieneMascota && (
              <>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                  <Field label="Tipo de mascota" htmlFor="mascotaTipo">
                    <Select id="mascotaTipo" value={form.mascotaTipo || null}
                      onChange={(v) => update("mascotaTipo", v ?? "")} data={TIPO_MASCOTA_OPTIONS}
                      comboboxProps={{ withinPortal: true }} />
                  </Field>
                  <Field label="Color" htmlFor="mascotaColor">
                    <TextInput id="mascotaColor" value={form.mascotaColor}
                      onChange={(e) => update("mascotaColor", e.currentTarget.value)}
                      placeholder="Ej: Marrón con manchas blancas" />
                  </Field>
                </SimpleGrid>
                <Checkbox
                  label="Tiene identificador"
                  checked={form.mascotaIdentificador}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("mascotaIdentificador", e.currentTarget.checked)}
                />
                <Field label="Foto de la mascota" htmlFor="mascotaFoto">
                  <CamaraCaptura value={form.mascotaFoto} onChange={(v) => update("mascotaFoto", v)} />
                </Field>
              </>
            )}
          </Stack>
        </Card>
      )}

      {error && <Alert color="govRed" role="alert" variant="light">{error}</Alert>}

      {step < 6 && (
        <Group justify="space-between" mt="md" className="no-print">
          <Button onClick={anterior} disabled={step === 1} variant="default">← Anterior</Button>
          {step < 5 ? (
            <Button onClick={siguiente} color="govBlue">Siguiente →</Button>
          ) : (
            <Button onClick={handleSubmit} loading={submitting} color="govBlue">Registrar</Button>
          )}
        </Group>
      )}
    </Stack>
  );
}

// ─── Subcomponente para campos de persona (jefe o familiar) ───
interface PersonFieldsData {
  nombre: string; apellido: string; nacionalidadCedula: string; cedula: string;
  telefono: string; edad: string; etapaVida: string; numeroBrazalete: string;
  tipoSangre: string; patologia: boolean; patologiaDescripcion: string; foto: string | null;
  [key: string]: unknown;
}

function PersonFields({ form, onChange, prefix }: {
  form: PersonFieldsData;
  onChange: (key: string, value: string | boolean | null) => void;
  prefix: string;
}) {
  return (
    <Stack gap="sm">
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <Field label="Nombre" htmlFor={`nombre_${prefix}`} required>
          <TextInput id={`nombre_${prefix}`} value={form.nombre} onChange={(e) => onChange("nombre", e.currentTarget.value)} />
        </Field>
        <Field label="Apellido" htmlFor={`apellido_${prefix}`} required>
          <TextInput id={`apellido_${prefix}`} value={form.apellido} onChange={(e) => onChange("apellido", e.currentTarget.value)} />
        </Field>
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
        <Field label="Nacionalidad" htmlFor={`nac_${prefix}`}>
          <Select id={`nac_${prefix}`} value={form.nacionalidadCedula || null}
            onChange={(v) => onChange("nacionalidadCedula", v ?? "")}
            data={[{ value: "V", label: "V - Venezolano" }, { value: "E", label: "E - Extranjero" }]}
            comboboxProps={{ withinPortal: true }} clearable={false} />
        </Field>
        <Field label="Cédula" htmlFor={`ced_${prefix}`} hint="Opcional si no posee.">
          <TextInput id={`ced_${prefix}`} value={form.cedula} onChange={(e) => onChange("cedula", e.currentTarget.value)} />
        </Field>
        <Field label="Teléfono" htmlFor={`tel_${prefix}`}>
          <TextInput id={`tel_${prefix}`} value={form.telefono} onChange={(e) => onChange("telefono", e.currentTarget.value)} />
        </Field>
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <Field label="Edad" htmlFor={`edad_${prefix}`} required>
          <NumberInput id={`edad_${prefix}`} min={0} max={150}
            value={form.edad === "" ? "" : Number(form.edad)}
            onChange={(v) => {
              onChange("edad", String(v ?? ""));
              const n = Number(v);
              if (Number.isInteger(n) && n >= 0) onChange("etapaVida", etapaVidaPorEdad(n));
            }} hideControls />
        </Field>
        <Field label="Etapa de vida" htmlFor={`etapa_${prefix}`} required>
          <Select id={`etapa_${prefix}`} value={form.etapaVida || null}
            onChange={(v) => onChange("etapaVida", v ?? "")} data={ETAPA_VIDA_OPTIONS}
            comboboxProps={{ withinPortal: true }} />
        </Field>
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <Field label="Brazalete" htmlFor={`braz_${prefix}`}>
          <TextInput id={`braz_${prefix}`} value={form.numeroBrazalete}
            onChange={(e) => onChange("numeroBrazalete", e.currentTarget.value)}
            placeholder="Ej: CVM-001" />
        </Field>
        <Field label="Tipo de sangre" htmlFor={`ts_${prefix}`}>
          <Select id={`ts_${prefix}`} value={form.tipoSangre || null}
            onChange={(v) => onChange("tipoSangre", v ?? "")} data={TIPO_SANGRE_OPTIONS}
            comboboxProps={{ withinPortal: true }} clearable={false} />
        </Field>
      </SimpleGrid>
      {/* Patología */}
      <Group align="flex-start" gap="sm" wrap="nowrap">
        <input id={`pat_${prefix}`} type="checkbox" checked={form.patologia}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("patologia", e.currentTarget.checked)}
          style={{ width: 18, height: 18, marginTop: 4, cursor: "pointer" }} />
        <label htmlFor={`pat_${prefix}`} style={{ cursor: "pointer", flex: 1 }}>
          <Text fw={600} size="sm">¿Posee alguna patología?</Text>
          <Text size="xs" c="dimmed">Especifique si presenta una condición de salud relevante.</Text>
        </label>
      </Group>
      {form.patologia && (
        <Field label="Especifique la patología" htmlFor={`patdesc_${prefix}`} required>
          <Textarea id={`patdesc_${prefix}`} value={form.patologiaDescripcion}
            onChange={(e) => onChange("patologiaDescripcion", e.currentTarget.value)}
            autosize minRows={2} placeholder="Ej: hipertensión, diabetes, asma…" />
        </Field>
      )}
      <Field label="Foto" htmlFor={`foto_${prefix}`}>
        <CamaraCaptura value={form.foto} onChange={(v) => onChange("foto", v)} />
      </Field>
    </Stack>
  );
}

// Necesario para el stepper
function Divider({ label }: { label: string }) {
  return (
    <Group align="center" gap="sm">
      <Box style={{ flex: 1, height: 1, background: "#d6dbe1" }} />
      <Text size="xs" c="dimmed" fw={600}>{label}</Text>
      <Box style={{ flex: 1, height: 1, background: "#d6dbe1" }} />
    </Group>
  );
}
