import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Alert,
  Box,
  Card,
  Center,
  Group,
  Image,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { fetchVerificacion, type VerificacionResponse } from "../api/verificacion";
import { GovernmentHeader } from "../components/GovernmentHeader";

const ETAPA_LABEL: Record<string, string> = {
  primera_infancia: "Primera infancia",
  infancia: "Infancia",
  adolescencia: "Adolescencia",
  juventud: "Juventud",
  adultez: "Adultez",
  vejez: "Vejez",
};

const ESTATUS_LABEL: Record<string, string> = {
  agrietada: "Agrietada",
  alto_riesgo: "Alto riesgo",
  riesgo_leve: "Riesgo leve",
  sin_riesgo: "Sin riesgo",
};

const TIPO_VIVIENDA_LABEL: Record<string, string> = {
  casa: "Casa",
  apartamento: "Apartamento",
  rancho: "Rancho",
  otros: "Otros",
};

export function VerificarRefugiado() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<VerificacionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true);
    fetchVerificacion(token)
      .then((r) => {
        if (active) setData(r);
      })
      .catch(() => {
        if (active) setData({ valid: false, error: "No se pudo conectar con el servidor." });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <Box style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <GovernmentHeader />
      <Center style={{ flex: 1, padding: "1.5rem 1rem" }}>
        <Stack gap="md" style={{ maxWidth: 720, width: "100%" }}>
          <Title order={1} c="govBlue.7" ta="center" mb={0}>
            Verificación pública
          </Title>
          <Text c="dimmed" ta="center">
            Esta página confirma la autenticidad de un carnet de refugiado emitido por el
            sistema oficial. Los datos del refugiado se muestran con fines de verificación.
          </Text>

          {loading ? (
            <Center p="xl">
              <Loader />
            </Center>
          ) : !data || !data.valid || !data.refugiado ? (
            <Alert color="govRed" variant="light" title="Registro no encontrado" role="alert">
              {data?.error ?? "El código QR no corresponde a ningún refugiado activo."}
            </Alert>
          ) : (
            <Card withBorder p="lg" radius="md" shadow="md" bg="white">
              <Stack gap="md">
                <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
                  <Stack gap={4}>
                    <Text size="xs" c="green.7" fw={700} tt="uppercase" lts={0.6}>
                      ✓ Registro válido
                    </Text>
                    <Text size="xs" c="dimmed">
                      Emitido el{" "}
                      {data.emitidoEn
                        ? new Date(data.emitidoEn).toLocaleString("es-VE")
                        : "—"}
                    </Text>
                  </Stack>
                  {data.refugiado.foto && (
                    <Image
                      src={data.refugiado.foto}
                      alt={`Foto de ${data.refugiado.nombre} ${data.refugiado.apellido}`}
                      w={120}
                      h={140}
                      fit="cover"
                      radius="sm"
                      style={{ border: "2px solid #1e3a5f" }}
                    />
                  )}
                </Group>

                <Group grow align="flex-start" gap="lg">
                  <Stack gap="sm">
                    <Section title="Datos del refugiado">
                      <KV label="Nombre" value={`${data.refugiado.nombre} ${data.refugiado.apellido}`} />
                      <KV
                        label="Cédula"
                        value={
                          data.refugiado.cedula
                            ? `${data.refugiado.nacionalidadCedula ?? "V"}-${data.refugiado.cedula}`
                            : "—"
                        }
                      />
                      <KV
                        label="Edad"
                        value={`${data.refugiado.edad} años · ${ETAPA_LABEL[data.refugiado.etapaVida] ?? data.refugiado.etapaVida}`}
                      />
                      <KV label="Teléfono" value={data.refugiado.telefono ?? "—"} />
                      <KV label="Origen" value={data.refugiado.origen} />
                    </Section>

                    <Section title="Condición de salud">
                      <KV
                        label="Patología"
                        value={
                          data.refugiado.patologia
                            ? data.refugiado.patologiaDescripcion ?? "—"
                            : "No"
                        }
                      />
                    </Section>

                    <Section title="Ubicación del siniestro">
                      <KV label="Estado" value={data.refugiado.estado} />
                      <KV label="Municipio" value={data.refugiado.municipio} />
                      <KV label="Parroquia" value={data.refugiado.parroquia} />
                      <KV label="Sector" value={data.refugiado.sector} />
                      <KV label="Dirección" value={data.refugiado.direccion} />
                    </Section>

                    <Section title="Condición de la vivienda">
                      <KV
                        label="Tipo"
                        value={TIPO_VIVIENDA_LABEL[data.refugiado.tipoVivienda] ?? data.refugiado.tipoVivienda}
                      />
                      <KV label="Estatus propiedad" value={data.refugiado.estatusPropiedad} />
                      <KV
                        label="Estatus actual"
                        value={ESTATUS_LABEL[data.refugiado.estatusActual] ?? data.refugiado.estatusActual}
                      />
                    </Section>

                    <Section title="Asignación en el centro">
                      <KV label="Centro" value={data.refugiado.refugio.nombre} />
                      <KV label="Ubicación" value={data.refugiado.refugio.ubicacion} />
                      <KV label="Aula" value={data.refugiado.aula?.nombre ?? "Sin asignar"} />
                      <KV
                        label="Rol"
                        value={
                          data.refugiado.jefeFamilia
                            ? "Jefe de familia"
                            : data.refugiado.parentesco
                              ? `Familiar (${data.refugiado.parentesco})`
                              : "Persona independiente"
                        }
                      />
                      {data.refugiado.tipoSangre && data.refugiado.tipoSangre !== "no_sabe" && (
                        <KV label="Tipo de sangre" value={data.refugiado.tipoSangre} />
                      )}
                      {data.refugiado.numeroBrazalete && (
                        <KV label="Brazalete" value={data.refugiado.numeroBrazalete} />
                      )}
                      {data.refugiado.jefeFamiliaRef && (
                        <KV
                          label="Jefe de familia"
                          value={`${data.refugiado.jefeFamiliaRef.nombre} ${data.refugiado.jefeFamiliaRef.apellido}`}
                        />
                      )}
                    </Section>

                    {data.refugiado.familiares && data.refugiado.familiares.length > 0 && (
                      <Section title={`Familiares (${data.refugiado.familiares.length})`}>
                        {data.refugiado.familiares.map((f) => (
                          <Box key={f.id} p="xs" mb="xs" style={{ background: "#f9fafb", borderRadius: 4, border: "1px solid #e0e6ed" }}>
                            <Text size="sm" fw={600}>{f.nombre} {f.apellido}</Text>
                            <Text size="xs" c="dimmed">
                              {f.parentesco} · {f.edad} años
                              {f.tipoSangre && f.tipoSangre !== "no_sabe" ? ` · ${f.tipoSangre}` : ""}
                              {f.numeroBrazalete ? ` · Brazalete ${f.numeroBrazalete}` : ""}
                              {f.patologia ? ` · Patología: ${f.patologiaDescripcion ?? "Sí"}` : ""}
                            </Text>
                          </Box>
                        ))}
                      </Section>
                    )}

                    {data.refugiado.mascota && (
                      <Section title="Mascota familiar">
                        <Group gap="sm" align="flex-start" wrap="nowrap">
                          {data.refugiado.mascota.foto && (
                            <Image
                              src={data.refugiado.mascota.foto}
                              alt="Mascota"
                              w={60}
                              h={60}
                              fit="cover"
                              radius="sm"
                              style={{ border: "1px solid #1e3a5f" }}
                            />
                          )}
                          <Box>
                            <Text size="sm" fw={600}>{data.refugiado.mascota.tipo}</Text>
                            <Text size="xs" c="dimmed">
                              {data.refugiado.mascota.color ? `Color: ${data.refugiado.mascota.color}` : ""}
                              {data.refugiado.mascota.tieneIdentificador ? " · Con identificador" : " · Sin identificador"}
                            </Text>
                          </Box>
                        </Group>
                      </Section>
                    )}
                  </Stack>
                </Group>

                <Box
                  style={{
                    background: "#f4f6f8",
                    padding: "0.75rem 1rem",
                    borderRadius: 6,
                    fontSize: "0.8rem",
                    color: "#555",
                  }}
                >
                  Esta información es pública y se utiliza exclusivamente para validar la identidad
                  del portador del carnet. El uso indebido está sujeto a las leyes aplicables.
                </Box>
              </Stack>
            </Card>
          )}

          <Group justify="center">
            <Link to="/" style={{ color: "#1e3a5f", fontWeight: 600 }}>
              ← Volver al inicio
            </Link>
          </Group>
        </Stack>
      </Center>
    </Box>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Title order={5} c="govBlue.7" mb={4} pb={4} style={{ borderBottom: "1px solid #e0e6ed" }}>
        {title}
      </Title>
      <Stack gap={4}>{children}</Stack>
    </Box>
  );
}

function KV({ label, value }: { label: string; value: string }) {
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
