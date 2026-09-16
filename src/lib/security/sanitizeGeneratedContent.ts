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

function stripCodeFence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function extractJsonEnvelope(value: string): string | null {
  const objectStart = value.indexOf('{');
  const objectEnd = value.lastIndexOf('}');
  if (objectStart >= 0 && objectEnd > objectStart) {
    return value.slice(objectStart, objectEnd + 1);
  }

  const arrayStart = value.indexOf('[');
  const arrayEnd = value.lastIndexOf(']');
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    return value.slice(arrayStart, arrayEnd + 1);
  }

  return null;
}

/** Escape literal control characters that some LLMs place inside JSON strings. */
function escapeJsonStringControls(value: string): string {
  let result = '';
  let inString = false;
  let escaped = false;

  for (const char of value) {
    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && inString) {
      result += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }

    if (inString) {
      if (char === '\n') {
        result += '\\n';
        continue;
      }
      if (char === '\r') {
        result += '\\r';
        continue;
      }
      if (char === '\t') {
        result += '\\t';
        continue;
      }
    }

    result += char;
  }

  return result;
}

function parseJsonCandidate(value: string): unknown | undefined {
  const stripped = stripCodeFence(value);
  const envelope = extractJsonEnvelope(stripped);
  const candidates = [stripped, envelope].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    const normalizedCandidates = [
      candidate,
      candidate.replace(/,\s*([}\]])/g, '$1'),
      escapeJsonStringControls(candidate).replace(/,\s*([}\]])/g, '$1'),
    ];

    for (const normalized of normalizedCandidates) {
      try {
        const parsed = JSON.parse(normalized) as unknown;
        if (typeof parsed === 'string' && parsed.trim() !== value.trim()) {
          const nested = parseJsonCandidate(parsed);
          if (nested !== undefined) return nested;
        }
        return parsed;
      } catch {
        // Try the next conservative normalization.
      }
    }
  }

  return undefined;
}

export function sanitizeGeneratedContent(value: unknown): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (
      trimmed.startsWith('{') ||
      trimmed.startsWith('[') ||
      trimmed.startsWith('```') ||
      /```json/i.test(trimmed) ||
      extractJsonEnvelope(trimmed) !== null
    ) {
      const parsed = parseJsonCandidate(value);
      if (parsed !== undefined && parsed !== value) {
        return sanitizeGeneratedContent(parsed);
      }
    }
    return value;
  }

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
