import { callAIEndpoint } from './aiClient';

const ENDPOINT = '/api/ai/chat-completion';

export type ChatMessage = Record<string, unknown>;

export interface ChatChunk {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
  [key: string]: unknown;
}

export interface ChatCompletionResult {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  [key: string]: unknown;
}

export async function getChatCompletion(
  provider: string,
  model: string,
  messages: ChatMessage[],
  parameters: Record<string, unknown> = {}
) {
  return callAIEndpoint<ChatCompletionResult>(ENDPOINT, {
    provider,
    model,
    messages,
    stream: false,
    parameters,
  });
}

export async function getStreamingChatCompletion(
  provider: string,
  model: string,
  messages: ChatMessage[],
  onChunk: (chunk: ChatChunk) => void,
  onComplete: () => void,
  onError: (error: Error) => void,
  parameters: Record<string, unknown> = {}
) {
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, model, messages, stream: true, parameters }),
    });

    if (!response.ok) {
      const data: unknown = await response.json();
      const message =
        data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
          ? data.error
          : `HTTP error: ${response.status}`;
      throw new Error(message);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Response body is not readable');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data: unknown = JSON.parse(line.slice(6));
            if (!data || typeof data !== 'object') continue;
            const event = data as Record<string, unknown>;
            if (event.type === 'chunk' && event.chunk && typeof event.chunk === 'object') {
              onChunk(event.chunk as ChatChunk);
            } else if (event.type === 'done') {
              onComplete();
            } else if (event.type === 'error') {
              const message = typeof event.error === 'string' ? event.error : 'Streaming error';
              console.error('API Route Error:', {
                error: event.error,
                details: event.details,
              });
              onError(new Error(message));
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  } catch (error) {
    console.error('Streaming error:', error);
    onError(error instanceof Error ? error : new Error('Streaming error'));
  }
}
