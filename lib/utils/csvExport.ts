const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : dateFormatter.format(value);
  }
  if (typeof value === "string" && ISO_DATE_RE.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return dateFormatter.format(d);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function escapeCell(raw: string): string {
  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

/**
 * Export rows to a CSV file and trigger a browser download. No external deps.
 *
 * @example
 * exportToCSV(customers, "customers-2026-05-12.csv", [
 *   { key: "full_name", label: "Name" },
 *   { key: "total_spent", label: "Spent" },
 * ]);
 */
export function exportToCSV<T>(
  rows: T[],
  filename: string,
  columns: { key: keyof T; label: string }[],
): void {
  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const body = rows
    .map((row) =>
      columns.map((c) => escapeCell(formatCell(row[c.key]))).join(","),
    )
    .join("\r\n");
  const csv = body ? `${header}\r\n${body}` : header;

  // UTF-8 BOM so Excel detects encoding for non-ASCII names.
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
