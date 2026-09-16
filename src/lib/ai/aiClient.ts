type ApiErrorPayload = {
  error?: unknown;
  details?: unknown;
};

function readApiError(data: unknown): ApiErrorPayload {
  if (!data || typeof data !== 'object') return {};
  const record = data as Record<string, unknown>;
  return { error: record.error, details: record.details };
}

function errorText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}

export async function callAIEndpoint<T = unknown>(endpoint: string, payload: object): Promise<T> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data: unknown = await response.json();
    const apiError = readApiError(data);
    const message = errorText(apiError.error);

    if (!response.ok || message) {
      console.error('API Route Error:', {
        error: apiError.error,
        details: apiError.details,
      });
      throw new Error(message || `Request failed: ${response.status}`);
    }

    return data as T;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}
