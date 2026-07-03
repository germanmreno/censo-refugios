import { Progress, Group, Text, Box } from "@mantine/core";

interface Props {
  actual: number;
  max: number;
  label?: string;
}

export function CapacidadBar({ actual, max, label }: Props) {
  const pct = max > 0 ? Math.min(100, Math.round((actual / max) * 100)) : 0;
  const color = pct >= 90 ? "govRed" : pct >= 70 ? "govYellow" : "govGreen";

  return (
    <Box>
      <Group justify="space-between" mb={4}>
        <Text size="sm" c="gray.7">
          {label ?? "Ocupación"}
        </Text>
        <Text size="sm" c="gray.7" fw={600}>
          {actual} / {max} ({pct}%)
        </Text>
      </Group>
      <Progress
        value={pct}
        color={color}
        size="md"
        radius="xs"
        aria-label={label ?? "Ocupación"}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        role="progressbar"
      />
    </Box>
  );
}
