export type CsvValue = string | number | null | undefined;

// Excel abre el archivo con la codificación del sistema si no encuentra el BOM,
// y en español eso rompe las tildes.
const BOM = "﻿";

function escapeCell(value: CsvValue) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  // Un texto que empieza por =, +, - o @ lo interpreta Excel como fórmula. Los
  // números se escriben tal cual: si no, una ganancia negativa llegaría a la
  // hoja de cálculo como texto en lugar de como cifra.
  const safe = typeof value !== "number" && /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: CsvValue[][]) {
  return BOM + rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
}
