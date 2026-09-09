const RICH_TEXT_FIELDS = new Set(['fullDescription', 'emailBody']);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Convert untrusted generated HTML into display-only HTML.
 *
 * AI output is untrusted even for admin-only features. We intentionally remove
 * markup, then escape the remaining text, and only add our own <br /> tags.
 * This keeps readable line breaks while preventing scripts, event handlers,
 * javascript: URLs, SVG payloads and malformed tag tricks from reaching
 * dangerouslySetInnerHTML consumers.
 */
export function generatedTextToSafeHtml(value: string): string {
  const text = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|h[1-6]|blockquote)\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '');

  return escapeHtml(text)
    .replace(/\r\n?/g, '\n')
    .replace(/\n/g, '<br />');
}

export function sanitizeGeneratedContent(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeGeneratedContent(item));
  }

  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
      if (RICH_TEXT_FIELDS.has(key) && typeof entry === 'string') {
        return [key, generatedTextToSafeHtml(entry)];
      }
      return [key, sanitizeGeneratedContent(entry)];
    }),
  );
}
