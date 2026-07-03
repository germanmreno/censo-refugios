import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, FileButton, Group, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";

interface Props {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  maxSizeMb?: number;
}

const MAX_DIMENSION = 800;
const JPEG_QUALITY = 0.85;

export function CamaraCaptura({ value, onChange, maxSizeMb = 4 }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const [disponible, setDisponible] = useState<boolean | null>(null);
  const [esContextoSeguro, setEsContextoSeguro] = useState<boolean | null>(null);

  useEffect(() => {
    const seguro =
      typeof window !== "undefined" &&
      (window.isSecureContext === true ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");
    setEsContextoSeguro(seguro);
    setDisponible(
      seguro &&
        typeof navigator !== "undefined" &&
        !!navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === "function",
    );
  }, []);

  // Detectar cuando el <video> se desmonta y liberar la cámara.
  useEffect(() => {
    return () => {
      detenerStream();
    };
  }, []);

  // Cuando camaraActiva se vuelve true, el <video> ya está montado:
  // solicitamos el stream y lo conectamos.
  useEffect(() => {
    if (!camaraActiva) return;
    let cancelado = false;
    setIniciando(true);
    setErrorCamara(null);

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          v.muted = true;
          v.playsInline = true;
          // Esperar al evento 'loadedmetadata' garantiza dimensiones listas
          await new Promise<void>((resolve) => {
            if (!v) return resolve();
            if (v.readyState >= 1) return resolve();
            v.addEventListener("loadedmetadata", () => resolve(), { once: true });
          });
          await v.play().catch(() => {});
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "No se pudo acceder a la cámara.";
        setErrorCamara(msg);
        notifications.show({
          message: `No se pudo iniciar la cámara: ${msg}`,
          color: "govRed",
        });
        setCamaraActiva(false);
      } finally {
        if (!cancelado) setIniciando(false);
      }
    })();

    return () => {
      cancelado = true;
      detenerStream();
    };
  }, [camaraActiva]);

  function detenerStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.srcObject = null;
    }
  }

  function capturar() {
    if (!videoRef.current) return;
    const dataUrl = drawScaled(videoRef.current);
    if (!dataUrl) return;
    onChange(dataUrl);
    setCamaraActiva(false);
  }

  function handleArchivo(file: File | null) {
    if (!file) return;
    if (file.size > maxSizeMb * 1024 * 1024) {
      notifications.show({
        message: `La imagen supera el máximo de ${maxSizeMb} MB.`,
        color: "govRed",
      });
      return;
    }
    if (!file.type.startsWith("image/")) {
      notifications.show({ message: "El archivo debe ser una imagen.", color: "govRed" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      const img = new Image();
      img.onload = () => {
        const scaled = scaleImage(img, MAX_DIMENSION, JPEG_QUALITY);
        onChange(scaled);
      };
      img.onerror = () => onChange(url);
      img.src = url;
    };
    reader.readAsDataURL(file);
  }

  function limpiar() {
    onChange(null);
    setCamaraActiva(false);
  }

  return (
    <Stack gap="sm">
      {value ? (
        <Box
          style={{
            position: "relative",
            display: "inline-block",
            maxWidth: 320,
          }}
        >
          <img
            src={value}
            alt="Foto del refugiado"
            style={{
              width: "100%",
              maxHeight: 320,
              objectFit: "cover",
              borderRadius: 8,
              border: "2px solid #1e3a5f",
              display: "block",
            }}
          />
          <Button
            color="govRed"
            size="xs"
            variant="filled"
            style={{ position: "absolute", top: 8, right: 8 }}
            onClick={limpiar}
            aria-label="Eliminar foto"
          >
            Quitar
          </Button>
        </Box>
      ) : camaraActiva ? (
        <Stack gap="xs" align="center">
          <Box
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 480,
              borderRadius: 8,
              overflow: "hidden",
              background: "#000",
              border: "2px solid #1e3a5f",
              minHeight: 320,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                display: "block",
                maxHeight: 360,
                objectFit: "cover",
                background: "#000",
              }}
              aria-label="Vista previa de la cámara"
            />
            {iniciando && (
              <Box
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: "0.9rem",
                  background: "rgba(0,0,0,0.4)",
                }}
              >
                Iniciando cámara…
              </Box>
            )}
          </Box>
          <Group gap="sm">
            <Button color="govBlue" onClick={capturar} leftSection={<span>📸</span>}>
              Capturar foto
            </Button>
            <Button variant="default" onClick={() => setCamaraActiva(false)}>
              Cancelar
            </Button>
          </Group>
        </Stack>
      ) : (
        <Stack gap="xs" align="center">
          <Box
            style={{
              width: "100%",
              maxWidth: 320,
              minHeight: 180,
              borderRadius: 8,
              border: "2px dashed #7896bd",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#f4f6f8",
              color: "#1e3a5f",
              textAlign: "center",
              padding: "1rem",
            }}
          >
            <Text size="sm" c="dimmed">
              Sin foto. Puede usar la cámara web o subir una imagen del dispositivo.
            </Text>
          </Box>
          {esContextoSeguro === false && (
            <Alert color="govYellow" variant="light" title="Cámara no disponible" mb={0}>
              La cámara web requiere una conexión segura (HTTPS). Este sitio se está
              sirviendo por HTTP. Use la opción "Subir imagen" o configure HTTPS en
              el servidor para habilitar la cámara.
            </Alert>
          )}
          <Group gap="sm">
            {disponible === true && (
              <Button
                color="govBlue"
                onClick={() => setCamaraActiva(true)}
                leftSection={<span>📷</span>}
                aria-label="Iniciar cámara"
              >
                Usar cámara
              </Button>
            )}
            <FileButton accept="image/*" onChange={handleArchivo}>
              {(props) => (
                <Button
                  {...props}
                  variant="light"
                  color="govBlue"
                  leftSection={<span>🖼️</span>}
                  aria-label="Subir imagen"
                >
                  Subir imagen
                </Button>
              )}
            </FileButton>
          </Group>
          {errorCamara && (
            <Text size="xs" c="govRed" role="alert">
              {errorCamara}
            </Text>
          )}
        </Stack>
      )}
    </Stack>
  );
}

function drawScaled(source: HTMLVideoElement): string | null {
  const vw = source.videoWidth;
  const vh = source.videoHeight;
  if (!vw || !vh) return null;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(vw, vh));
  const w = Math.round(vw * scale);
  const h = Math.round(vh * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

function scaleImage(img: HTMLImageElement, maxDim: number, quality: number): string {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return img.src;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const tw = Math.round(w * scale);
  const th = Math.round(h * scale);
  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) return img.src;
  ctx.drawImage(img, 0, 0, tw, th);
  return canvas.toDataURL("image/jpeg", quality);
}
