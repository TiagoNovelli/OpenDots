import { expect, it } from 'vitest';
import {
  MODEL_PROVIDERS,
  modelConfigFromEnv,
  modelProvider,
} from '../src/server/model-provider.js';
import { setupStatus } from '../src/server/platform-config.js';

it('keeps the OPENAI_* configuration working without a preset', () => {
  expect(
    modelConfigFromEnv({
      OPENAI_API_KEY: 'sk-fixture',
      OPENAI_MODEL: 'gpt-fixture',
    }),
  ).toEqual({
    modelProvider: 'openai',
    apiKey: 'sk-fixture',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-fixture',
    apiKeyLabel: 'OPENAI_API_KEY',
    modelLabel: 'OPENAI_MODEL',
  });
});

it('recognizes a preset from a legacy base URL so its quirks apply', () => {
  const config = modelConfigFromEnv({
    OPENAI_API_KEY: 'gsk-fixture',
    OPENAI_BASE_URL: 'https://api.groq.com/openai/v1',
    OPENAI_MODEL: 'openai/gpt-oss-120b',
  });
  expect(config.modelProvider).toBe('groq');
  expect(modelProvider(config.modelProvider).omitEmptyToolRequired).toBe(true);
  expect(
    modelConfigFromEnv({ OPENAI_BASE_URL: 'https://llm.example.com/v1' })
      .modelProvider,
  ).toBe('openai');
});

it('fills a preset from its own key variable and defaults', () => {
  expect(
    modelConfigFromEnv({ MODEL_PROVIDER: 'Groq', GROQ_API_KEY: 'gsk-fixture' }),
  ).toEqual({
    modelProvider: 'groq',
    apiKey: 'gsk-fixture',
    baseUrl: MODEL_PROVIDERS.groq.baseUrl,
    model: MODEL_PROVIDERS.groq.defaultModel,
    apiKeyLabel: 'GROQ_API_KEY',
    modelLabel: 'MODEL_NAME',
  });
});

it('ignores the template OPENAI_BASE_URL once a preset is chosen', () => {
  const config = modelConfigFromEnv({
    MODEL_PROVIDER: 'anthropic',
    ANTHROPIC_API_KEY: 'sk-ant-fixture',
    OPENAI_BASE_URL: 'https://api.openai.com/v1',
    MODEL_NAME: 'claude-fixture',
  });
  expect(config.baseUrl).toBe(MODEL_PROVIDERS.anthropic.baseUrl);
  expect(config.model).toBe('claude-fixture');
  expect(
    modelConfigFromEnv({
      MODEL_PROVIDER: 'openrouter',
      OPENROUTER_API_KEY: 'fixture',
      MODEL_BASE_URL: 'https://proxy.example.com/v1',
    }).baseUrl,
  ).toBe('https://proxy.example.com/v1');
});

it('falls back to OPENAI_API_KEY and supplies a key for local servers', () => {
  expect(
    modelConfigFromEnv({ MODEL_PROVIDER: 'deepseek', OPENAI_API_KEY: 'old' })
      .apiKey,
  ).toBe('old');
  expect(modelConfigFromEnv({ MODEL_PROVIDER: 'ollama' }).apiKey).toBe(
    'ollama',
  );
});

it('rejects an unknown provider by naming the valid ones', () => {
  expect(() => modelConfigFromEnv({ MODEL_PROVIDER: 'skynet' })).toThrow(
    /MODEL_PROVIDER must be one of: openai, groq/,
  );
});

it('names the preset variables when setup is incomplete', () => {
  const model = modelConfigFromEnv({ MODEL_PROVIDER: 'gemini' });
  expect(
    setupStatus({
      ...model,
      intelligenceKey: 'cpk-fixture',
      runtimeUrl: '',
      voiceName: 'marin',
      slackUsers: [],
    }).missing,
  ).toEqual(['GEMINI_API_KEY', 'MODEL_NAME']);
});
