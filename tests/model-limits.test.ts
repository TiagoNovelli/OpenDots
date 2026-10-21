import { afterEach, expect, it, vi } from 'vitest';
import {
  ModelLimitTracker,
  modelFetch,
  parseDuration,
  rateLimitMessage,
  retryAfterMs,
} from '../src/server/model-limits.js';
import { friendlyError } from '../src/client/model-limit';

afterEach(() => vi.unstubAllGlobals());

const groqHeaders = (overrides: Record<string, string> = {}) =>
  new Headers({
    'x-ratelimit-limit-requests': '1000',
    'x-ratelimit-remaining-requests': '999',
    'x-ratelimit-reset-requests': '1m26.4s',
    'x-ratelimit-limit-tokens': '8000',
    'x-ratelimit-remaining-tokens': '7923',
    'x-ratelimit-reset-tokens': '577ms',
    ...overrides,
  });

it('reads the durations providers put in reset headers', () => {
  expect(parseDuration('1m26.4s')).toBe(86_400);
  expect(parseDuration('577ms')).toBe(577);
  expect(parseDuration('2h3m')).toBe(7_380_000);
  expect(parseDuration('12')).toBe(12_000);
  expect(parseDuration('soon')).toBeUndefined();
  expect(parseDuration(null)).toBeUndefined();
});

it('keeps the latest windows a provider reports', () => {
  const tracker = new ModelLimitTracker('Groq');
  expect(tracker.snapshot()).toBeNull();
  tracker.record(new Headers(), 1000);
  expect(tracker.snapshot()).toBeNull();
  tracker.record(groqHeaders(), 1000);
  expect(tracker.snapshot(1000)).toEqual({
    provider: 'Groq',
    updatedAt: 1000,
    requests: { limit: 1000, remaining: 999, resetAt: 87_400 },
    tokens: { limit: 8000, remaining: 7923, resetAt: 1577 },
  });
});

it('reports a rate limit only until it ends', () => {
  const tracker = new ModelLimitTracker('Groq');
  tracker.record(groqHeaders(), 1000);
  tracker.limited(5000);
  expect(tracker.snapshot(4000)?.limitedUntil).toBe(5000);
  expect(tracker.snapshot(6000)?.limitedUntil).toBeUndefined();
  // A later response keeps the limit until it expires.
  tracker.record(groqHeaders(), 4500);
  expect(tracker.snapshot(4600)?.limitedUntil).toBe(5000);
});

it('waits for Retry-After, else the exhausted window', () => {
  expect(retryAfterMs(new Headers({ 'retry-after': '3' }))).toBe(3000);
  expect(
    retryAfterMs(
      groqHeaders({
        'x-ratelimit-remaining-tokens': '0',
        'x-ratelimit-reset-tokens': '7.2s',
      }),
    ),
  ).toBe(7200);
  expect(retryAfterMs(new Headers())).toBe(60_000);
});

it('records headers and rewrites a 429 into a known message', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response('{}', { headers: groqHeaders() }))
    .mockResolvedValueOnce(
      new Response('{"error":{"message":"Rate limit reached for model"}}', {
        status: 429,
        headers: groqHeaders({ 'retry-after': '12' }),
      }),
    );
  vi.stubGlobal('fetch', fetchMock);
  const tracker = new ModelLimitTracker('Groq');
  const send = modelFetch(tracker);
  expect((await send('https://example.com')).status).toBe(200);
  expect(tracker.snapshot()?.requests?.remaining).toBe(999);
  const limited = await send('https://example.com');
  expect(limited.status).toBe(429);
  expect(await limited.json()).toEqual({
    error: { message: rateLimitMessage(12), type: 'rate_limit_exceeded' },
  });
  expect(tracker.snapshot()?.limitedUntil).toBeGreaterThan(Date.now());
});

it('turns the rate-limit message into friendly text', () => {
  expect(friendlyError(`429 ${rateLimitMessage(12)}`)).toBe(
    'The model’s usage limit was reached. Try again in 12s.',
  );
  expect(friendlyError('Something else broke.')).toBe('Something else broke.');
});
