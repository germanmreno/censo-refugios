import { useState } from "react";
import { Button, Group, Stack, Title } from "@mantine/core";
import { CensoForm } from "./CensoForm";
import { RefugiadosTabla } from "./RefugiadosTabla";

export function Refugiados() {
  const [mostrarForm, setMostrarForm] = useState(false);

  if (mostrarForm) {
    return (
      <Stack gap="md">
        <Group justify="space-between" align="center" wrap="wrap">
          <Title order={1} c="govBlue.7" mb={0}>
            Nuevo registro de censo
          </Title>
          <Button onClick={() => setMostrarForm(false)} variant="default">
            Volver al listado
          </Button>
        </Group>
        <CensoForm
          onDone={(ok) => {
            if (ok) {
              setMostrarForm(false);
            }
          }}
        />
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center" wrap="wrap">
        <Title order={1} c="govBlue.7" mb={0}>
          Afectados
        </Title>
        <Button onClick={() => setMostrarForm(true)} color="govBlue">
          + Nuevo registro
        </Button>
      </Group>
      <RefugiadosTabla />
    </Stack>
  );
}
