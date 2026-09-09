export function sanitizeInternalActionUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const raw = value.trim();
  if (
    !raw ||
    raw.length > 2048 ||
    !raw.startsWith('/') ||
    raw.startsWith('//') ||
    raw.includes('\\') ||
    /[\u0000-\u001F\u007F]/.test(raw)
  ) {
    return null;
  }

  try {
    const base = 'https://summeca.com';
    const parsed = new URL(raw, base);
    if (parsed.origin !== base) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
