export function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';

  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const raw = value == null ? '' : String(value);
    const safe = typeof value === 'string' && /^[\t\r ]*[=+\-@]/.test(raw)
      ? `'${raw}`
      : raw;

    if (/[",\r\n]/.test(safe)) {
      return `"${safe.replace(/"/g, '""')}"`;
    }
    return safe;
  };

  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(',')),
  ].join('\n');
}
