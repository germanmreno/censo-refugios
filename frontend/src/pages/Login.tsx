import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  Center,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
  Alert,
} from "@mantine/core";
import { useAuth } from "../context/AuthContext";
import { GovernmentHeader } from "../components/GovernmentHeader";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

  const [cedula, setCedula] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(cedula.trim(), password);
      navigate(from, { replace: true });
    } catch {
      setError("Cédula o contraseña incorrectas.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#eef2f7" }}>
      <GovernmentHeader />
      <Center style={{ flex: 1, padding: "1.5rem 1rem" }}>
        <Card
          withBorder
          shadow="md"
          padding="xl"
          radius="md"
          maw={420}
          w="100%"
          component="form"
          onSubmit={handleSubmit}
          aria-label="Inicio de sesión"
        >
          <Stack gap="md">
            <Stack gap={4}>
              <Title order={2} c="govBlue.7" mb={0}>
                Censo de Refugios
              </Title>
              <Text size="sm" c="dimmed">
                Venezuela 2026 · Acceso restringido a funcionarios autorizados
              </Text>
            </Stack>
            <TextInput
              id="cedula"
              label="Cédula"
              required
              autoFocus
              autoComplete="username"
              value={cedula}
              onChange={(e) => setCedula(e.currentTarget.value)}
            />
            <PasswordInput
              id="password"
              label="Contraseña"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
            {error && (
              <Alert color="govRed" role="alert" variant="light" title="Error de autenticación">
                {error}
              </Alert>
            )}
            <Button
              type="submit"
              loading={submitting}
              fullWidth
              size="md"
              color="govBlue"
              variant="filled"
            >
              Ingresar
            </Button>
            <Text size="xs" c="dimmed" ta="center">
              ¿No tiene cuenta? Contacte a un administrador.
            </Text>
          </Stack>
        </Card>
      </Center>
    </Box>
  );
}
