import { Box, Stack, Text, Image } from "@mantine/core";
import { QRCodeSVG } from "qrcode.react";
import bicentenario from "../assets/bicentenario.png";
import ministerio from "../assets/ministerio-texto.png";

export interface CarnetData {
  id: string;
  verificacionToken: string | null;
  nombre: string;
  apellido: string;
  nacionalidadCedula: string | null;
  cedula: string | null;
  edad: number;
  etapaVida: string;
  telefono: string | null;
  foto: string | null;
  refugio: { id: string; nombre: string; ubicacion?: string };
  aula?: { id: string; nombre: string } | null;
  createdAt: string;
}

interface Props {
  data: CarnetData;
  urlVerificacion: string;
}

const ETAPA_LABEL: Record<string, string> = {
  primera_infancia: "Primera infancia",
  infancia: "Infancia",
  adolescencia: "Adolescencia",
  juventud: "Juventud",
  adultez: "Adultez",
  vejez: "Vejez",
};

export function CarnetRefugiado({ data, urlVerificacion }: Props) {
  const cedulaCompleta = data.cedula
    ? `${data.nacionalidadCedula ?? "V"}-${data.cedula}`
    : "—";
  const expedido = new Date(data.createdAt).toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <Box
      className="carnet-imprimible"
      style={{
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        background: "#fff",
        border: "2px solid #1e3a5f",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
        fontFamily: "Georama, system-ui, sans-serif",
      }}
    >
      <Box
        style={{
          background: "#1e3a5f",
          padding: "0.75rem 1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          borderBottom: "3px solid #fcd116",
        }}
      >
        <Image src={ministerio} alt="Ministerio" h={36} w="auto" fit="contain" />
        <Box style={{ flex: 1 }} />
        <Image src={bicentenario} alt="Bicentenario" h={40} w="auto" fit="contain" />
      </Box>

      <Box
        style={{
          background: "#fcd116",
          padding: "0.5rem 1rem",
          textAlign: "center",
        }}
      >
        <Text fw={800} size="lg" c="govBlue.7" lts={1.2}>
          CARNET DE REFUGIADO
        </Text>
        <Text size="xs" c="govBlue.7" fw={600} lts={0.6}>
          CENSADO · REPÚBLICA BOLIVARIANA DE VENEZUELA
        </Text>
      </Box>

      <Box
        style={{
          padding: "1rem",
          display: "grid",
          gridTemplateColumns: "120px 1fr 140px",
          gap: "1rem",
        }}
      >
        <Box>
          {data.foto ? (
            <img
              src={data.foto}
              alt={`Foto de ${data.nombre} ${data.apellido}`}
              style={{
                width: 120,
                height: 140,
                objectFit: "cover",
                borderRadius: 6,
                border: "2px solid #1e3a5f",
              }}
            />
          ) : (
            <Box
              style={{
                width: 120,
                height: 140,
                borderRadius: 6,
                border: "2px dashed #7896bd",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f4f6f8",
                color: "#7896bd",
                fontSize: "0.75rem",
                textAlign: "center",
                padding: "0.25rem",
              }}
            >
              Sin foto
            </Box>
          )}
        </Box>

        <Stack gap={6}>
          <Stack gap={2}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.5}>
              Nombre y apellido
            </Text>
            <Text fw={800} size="lg" c="govBlue.7">
              {data.nombre} {data.apellido}
            </Text>
          </Stack>
          <Stack gap={2}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.5}>
              Cédula
            </Text>
            <Text fw={600}>{cedulaCompleta}</Text>
          </Stack>
          <Stack gap={2}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.5}>
              Edad
            </Text>
            <Text fw={600}>
              {data.edad} años · {ETAPA_LABEL[data.etapaVida] ?? data.etapaVida}
            </Text>
          </Stack>
          <Stack gap={2}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.5}>
              Refugio
            </Text>
            <Text fw={600}>{data.refugio.nombre}</Text>
            {data.aula && (
              <Text size="xs" c="dimmed">
                Aula: {data.aula.nombre}
              </Text>
            )}
          </Stack>
        </Stack>

        <Stack gap={4} align="center" justify="center">
          <Box style={{ background: "#fff", padding: 4, borderRadius: 4 }}>
            {data.verificacionToken ? (
              <QRCodeSVG
                value={`${urlVerificacion}/${data.verificacionToken}`}
                size={120}
                level="M"
                includeMargin={false}
              />
            ) : (
              <Text size="xs" c="dimmed">
                Sin token
              </Text>
            )}
          </Box>
          <Text size="xs" c="dimmed" ta="center">
            Escanea para verificar
          </Text>
        </Stack>
      </Box>

      <Box
        style={{
          padding: "0.5rem 1rem",
          background: "#f4f6f8",
          borderTop: "1px solid #d6dbe1",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.7rem",
          color: "#1e3a5f",
        }}
      >
        <span>ID: {data.id.slice(0, 8).toUpperCase()}</span>
        <span>Expedido: {expedido}</span>
        <span>Verificar en: {urlVerificacion.replace(/^https?:\/\//, "")}</span>
      </Box>
    </Box>
  );
}
