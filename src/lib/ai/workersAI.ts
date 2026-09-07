import { getCloudflareContext } from '@opennextjs/cloudflare';

export type WorkersAIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type WorkersAIResult = {
  text: string;
  tokensUsed: number;
  model: string;
  durationMs: number;
};

type WorkersAIBinding = {
  run: (
    model: string,
    input: {
      messages: WorkersAIMessage[];
      max_tokens?: number;
      temperature?: number;
      stream?: false;
    },
  ) => Promise<unknown>;
};

type WorkersAIResponse = {
  response?: string;
  usage?: {
    total_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  choices?: Array<{ message?: { content?: string } }>;
};

export const DEFAULT_WORKERS_AI_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';

function getAIBinding(): WorkersAIBinding {
  const context = getCloudflareContext();
  const env = context.env as unknown as { AI?: WorkersAIBinding };
  if (!env.AI) {
    throw new Error('Cloudflare Workers AI binding is not configured.');
  }
  return env.AI;
}

export async function runWorkersAI(
  messages: WorkersAIMessage[],
  options: { maxTokens?: number; temperature?: number; model?: string } = {},
): Promise<WorkersAIResult> {
  const model = options.model || process.env.AI_DEFAULT_MODEL || DEFAULT_WORKERS_AI_MODEL;
  const startedAt = Date.now();
  const ai = getAIBinding();

  const raw = await ai.run(model, {
    messages,
    max_tokens: Math.min(2000, Math.max(1, options.maxTokens ?? 800)),
    ...(typeof options.temperature === 'number'
      ? { temperature: Math.min(1.5, Math.max(0, options.temperature)) }
      : {}),
    stream: false,
  });

  const result = raw as WorkersAIResponse;
  const text = (result.response || result.choices?.[0]?.message?.content || '').trim();
  if (!text) {
    throw new Error('Workers AI returned an empty response.');
  }

  const tokensUsed = Number(
    result.usage?.total_tokens ??
      (result.usage?.prompt_tokens ?? 0) + (result.usage?.completion_tokens ?? 0),
  );

  return {
    text,
    tokensUsed: Number.isFinite(tokensUsed) ? tokensUsed : 0,
    model,
    durationMs: Date.now() - startedAt,
  };
}
