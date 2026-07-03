import { Image, Text, Box, Container, Group, Stack } from "@mantine/core";
import bicentenario from "../assets/bicentenario.png";
import ministerio from "../assets/ministerio-texto.png";

export function GovernmentHeader() {
  return (
    <Box
      component="header"
      role="banner"
      style={{
        background: "#fff",
        borderBottom: "3px solid #fcd116",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}
    >
      <Container size="xl" px="md" py="xs">
        <Group justify="space-between" align="center" wrap="nowrap" gap="md">
          <Stack gap={0} visibleFrom="xs">
            <Image
              src={ministerio}
              alt="Ministerio del Poder Popular de Desarrollo Minero Ecológico e Industrias Básicas"
              h={{ base: 48, sm: 64 }}
              w="auto"
              fit="contain"
              aria-label="Ministerio"
            />
          </Stack>
          <Group align="center" gap="sm" wrap="nowrap">
            <Stack gap={0} visibleFrom="sm" align="flex-end">
              <Text size="xs" c="govBlue.7" fw={700} tt="uppercase" lts={0.5}>
                Censo de Refugios
              </Text>
              <Text size="xs" c="gray.6" lts={0.3}>
                Venezuela 2026
              </Text>
            </Stack>
            <Image
              src={bicentenario}
              alt="Bicentenario de Bolivia 1825-2025"
              h={{ base: 56, sm: 72 }}
              w="auto"
              fit="contain"
              aria-label="Bicentenario"
            />
          </Group>
        </Group>
      </Container>
    </Box>
  );
}
