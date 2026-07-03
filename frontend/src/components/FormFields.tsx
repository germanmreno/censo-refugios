import type { ReactNode } from "react";
import { TextInput, Select as MSelect, Switch, Textarea, PasswordInput, NumberInput, Box, Text } from "@mantine/core";

export function Field({
  label,
  htmlFor,
  children,
  required,
  hint,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <Box mb="sm">
      <Text component="label" htmlFor={htmlFor} size="sm" fw={600} display="block" mb={4}>
        {label} {required && <Text component="span" c="govRed.6">*</Text>}
      </Text>
      {children}
      {hint && (
        <Text size="xs" c="dimmed" mt={2}>
          {hint}
        </Text>
      )}
    </Box>
  );
}

interface SelectProps {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
}

export function Select({ id, value, onChange, options, placeholder, disabled, required, name }: SelectProps) {
  return (
    <MSelect
      id={id}
      name={name}
      value={value || null}
      onChange={(v) => onChange(v ?? "")}
      data={options.map((o) => ({ value: o.value, label: o.label }))}
      placeholder={placeholder ?? "Seleccione…"}
      disabled={disabled}
      required={required}
      searchable={false}
      nothingFoundMessage="Sin opciones"
      comboboxProps={{ withinPortal: true }}
    />
  );
}

export function Toggle({
  id,
  checked,
  onChange,
  label,
  description,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <Box
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.75rem",
        padding: "0.75rem 1rem",
        border: "1px solid #d6dbe1",
        borderRadius: 6,
        background: checked ? "#e8f5e9" : "#fafbfc",
        marginBottom: "0.85rem",
      }}
    >
      <Switch
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
        color="govBlue.7"
        size="md"
        aria-label={label}
        mt={2}
      />
      <label htmlFor={id} style={{ cursor: "pointer", flex: 1 }}>
        <Text fw={600} size="sm">
          {label}
        </Text>
        {description && (
          <Text size="xs" c="dimmed" mt={2}>
            {description}
          </Text>
        )}
      </label>
    </Box>
  );
}

export function TextField({
  id,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  autoFocus,
  autoComplete,
  min,
  max,
  rows,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "number" | "password" | "email";
  required?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
  min?: number;
  max?: number;
  rows?: number;
}) {
  if (type === "number") {
    return (
      <NumberInput
        id={id}
        value={value === "" ? "" : Number(value)}
        onChange={(v) => onChange(String(v ?? ""))}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        hideControls
        aria-required={required}
      />
    );
  }
  if (type === "password") {
    return (
      <PasswordInput
        id={id}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
      />
    );
  }
  if (rows && rows > 1) {
    return (
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        autosize
        minRows={rows}
      />
    );
  }
  return (
    <TextInput
      id={id}
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      placeholder={placeholder}
      type={type}
      required={required}
      autoFocus={autoFocus}
      autoComplete={autoComplete}
    />
  );
}
