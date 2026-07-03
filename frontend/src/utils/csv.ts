export function exportarCSV(
  nombreArchivo: string,
  columnas: { header: string; accessor: (row: Record<string, unknown>) => string }[],
  filas: Record<string, unknown>[],
) {
  const esc = (v: string) => {
    const s = v ?? "";
    if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const cabecera = columnas.map((c) => esc(c.header)).join(";");
  const cuerpo = filas
    .map((row) => columnas.map((c) => esc(c.accessor(row))).join(";"))
    .join("\n");
  const csv = `\uFEFF${cabecera}\n${cuerpo}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}
