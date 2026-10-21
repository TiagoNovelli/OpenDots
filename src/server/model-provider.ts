// Every provider here speaks the OpenAI Chat Completions API. A preset only
// fills in the base URL, the key's variable and any request quirk; OPENAI_*
// variables keep working for deployments configured before presets existed.
export interface ModelProvider {
  label: string;
  baseUrl: string;
  keyVariable: string;
  defaultModel?: string;
  /** Local servers accept any key, but the OpenAI client requires one. */
  keyOptional?: boolean;
  /** Rejects strict tool schemas with an empty `required` and no properties. */
  omitEmptyToolRequired?: boolean;
}

export const MODEL_PROVIDERS = {
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    keyVariable: 'OPENAI_API_KEY',
  },
  groq: {
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    keyVariable: 'GROQ_API_KEY',
    defaultModel: 'openai/gpt-oss-120b',
    omitEmptyToolRequired: true,
  },
  anthropic: {
    label: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    keyVariable: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-sonnet-5-5',
  },
  gemini: {
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    keyVariable: 'GEMINI_API_KEY',
  },
  openrouter: {
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyVariable: 'OPENROUTER_API_KEY',
  },
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    keyVariable: 'DEEPSEEK_API_KEY',
  },
  mistral: {
    label: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    keyVariable: 'MISTRAL_API_KEY',
  },
  xai: {
    label: 'xAI',
    baseUrl: 'https://api.x.ai/v1',
    keyVariable: 'XAI_API_KEY',
  },
  ollama: {
    label: 'Ollama',
    baseUrl: 'http://localhost:11434/v1',
    keyVariable: 'OLLAMA_API_KEY',
    keyOptional: true,
  },
} as const satisfies Record<string, ModelProvider>;

export type ModelProviderId = keyof typeof MODEL_PROVIDERS;

export interface ModelConfig {
  modelProvider: ModelProviderId;
  apiKey?: string;
  baseUrl: string;
  model?: string;
  /** Variable names to show when the key or model is missing. */
  apiKeyLabel: string;
  modelLabel: string;
}

export function isModelProviderId(value: string): value is ModelProviderId {
  return Object.hasOwn(MODEL_PROVIDERS, value);
}

export function modelProvider(id: string | undefined): ModelProvider {
  return id && isModelProviderId(id)
    ? MODEL_PROVIDERS[id]
    : MODEL_PROVIDERS.openai;
}

/** Recognizes a preset from a legacy OPENAI_BASE_URL so its quirks still apply. */
function providerForBaseUrl(baseUrl: string): ModelProviderId {
  let host: string;
  try {
    host = new URL(baseUrl).host;
  } catch {
    return 'openai';
  }
  for (const [id, provider] of Object.entries(MODEL_PROVIDERS))
    if (new URL(provider.baseUrl).host === host) return id as ModelProviderId;
  return 'openai';
}

function value(env: Record<string, string | undefined>, name: string) {
  return env[name]?.trim() || undefined;
}

export function modelConfigFromEnv(
  env: Record<string, string | undefined>,
): ModelConfig {
  const requested = value(env, 'MODEL_PROVIDER')?.toLowerCase();
  const legacyModel = value(env, 'OPENAI_MODEL');
  if (!requested) {
    const baseUrl =
      value(env, 'OPENAI_BASE_URL') ?? MODEL_PROVIDERS.openai.baseUrl;
    return {
      modelProvider: providerForBaseUrl(baseUrl),
      apiKey: value(env, 'OPENAI_API_KEY'),
      baseUrl,
      model: legacyModel,
      apiKeyLabel: 'OPENAI_API_KEY',
      modelLabel: 'OPENAI_MODEL',
    };
  }
  if (!isModelProviderId(requested))
    throw new Error(
      `MODEL_PROVIDER must be one of: ${Object.keys(MODEL_PROVIDERS).join(', ')}.`,
    );
  const provider: ModelProvider = MODEL_PROVIDERS[requested];
  return {
    modelProvider: requested,
    apiKey:
      value(env, provider.keyVariable) ??
      value(env, 'OPENAI_API_KEY') ??
      (provider.keyOptional ? requested : undefined),
    baseUrl: value(env, 'MODEL_BASE_URL') ?? provider.baseUrl,
    model: value(env, 'MODEL_NAME') ?? legacyModel ?? provider.defaultModel,
    apiKeyLabel: provider.keyVariable,
    modelLabel: 'MODEL_NAME',
  };
}
