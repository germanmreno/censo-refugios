import { Card, Stack, Text, Title } from "@mantine/core";
import { useAuth } from "../context/AuthContext";

export function Dashboard() {
  const { user, isAdmin } = useAuth();
  return (
    <Stack gap="lg">
      <Title order={1} c="govBlue.7" mb={0}>
        Bienvenido, {user?.nombre}
      </Title>
      <Card withBorder padding="lg" radius="md" bg="white">
        <Text c="gray.7" mb="sm">
          {isAdmin
            ? "Panel de administrador. Use el menú superior para gestionar refugios, refugiados, estadísticas y usuarios."
            : "Panel de funcionario. Use el menú superior para registrar y consultar refugiados."}
        </Text>
        <Text size="sm" c="dimmed">
          Rol: <strong>{user?.rol}</strong> · Cédula: <strong>{user?.cedula}</strong>
        </Text>
      </Card>
    </Stack>
  );
}
