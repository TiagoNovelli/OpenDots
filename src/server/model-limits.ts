import type { ModelLimits, ModelLimitWindow } from '../shared/types.js';
import { compatibleFetch } from './compatible-fetch.js';

// Rate-limit headers that OpenAI and compatible providers (Groq among them)
// send on every response. The provider reports these windows, not OpenDots.
const WINDOWS = ['requests', 'tokens'] as const;

/** Reads `1m26.4s`, `577ms`, `2h3m` or plain seconds, as providers send them. */
export function parseDuration(value: string | null): number | undefined {
  if (!value) return undefined;
  const text = value.trim();
  if (/^\d+(\.\d+)?$/.test(text)) return Math.ceil(Number(text) * 1000);
  const units: Record<string, number> = { h: 3_600_000, m: 60_000, s: 1000 };
  let total = 0;
  let matched = '';
  for (const part of text.matchAll(/(\d+(?:\.\d+)?)(ms|h|m|s)/g)) {
    total += Number(part[1]) * (part[2] === 'ms' ? 1 : units[part[2]]);
    matched += part[0];
  }
  return matched === text ? Math.ceil(total) : undefined;
}

export class ModelLimitTracker {
  private current: ModelLimits | null = null;
  constructor(private provider: string) {}
  record(headers: Headers, now = Date.now()) {
    const next: ModelLimits = {
      provider: this.provider,
      updatedAt: now,
      limitedUntil: this.current?.limitedUntil,
    };
    for (const name of WINDOWS) {
      const limit = Number(headers.get(`x-ratelimit-limit-${name}`));
      const remaining = Number(headers.get(`x-ratelimit-remaining-${name}`));
      if (!headers.has(`x-ratelimit-limit-${name}`) || !Number.isFinite(limit))
        continue;
      const reset = parseDuration(headers.get(`x-ratelimit-reset-${name}`));
      const window: ModelLimitWindow = {
        limit,
        remaining: Number.isFinite(remaining) ? remaining : limit,
        ...(reset !== undefined ? { resetAt: now + reset } : {}),
      };
      next[name] = window;
    }
    if (next.requests || next.tokens) this.current = next;
  }
  limited(until: number) {
    this.current = {
      ...(this.current ?? { provider: this.provider, updatedAt: until }),
      limitedUntil: until,
    };
  }
  snapshot(now = Date.now()): ModelLimits | null {
    if (!this.current) return null;
    const { limitedUntil, ...rest } = this.current;
    return limitedUntil && limitedUntil > now
      ? { ...rest, limitedUntil }
      : rest;
  }
}

/** Seconds to wait after a 429, from Retry-After or the exhausted window. */
export function retryAfterMs(headers: Headers): number {
  const retry = parseDuration(headers.get('retry-after'));
  if (retry !== undefined) return retry;
  const resets = WINDOWS.filter(
    (name) => headers.get(`x-ratelimit-remaining-${name}`) === '0',
  ).map((name) => parseDuration(headers.get(`x-ratelimit-reset-${name}`)));
  const known = resets.filter((value): value is number => value !== undefined);
  return known.length ? Math.max(...known) : 60_000;
}

// The client recognizes this exact wording and shows it translated.
export const rateLimitMessage = (seconds: number) =>
  `Model rate limit reached. Try again in ${seconds}s.`;

export function modelFetch(
  tracker?: ModelLimitTracker,
  options: { omitEmptyToolRequired?: boolean } = {},
): typeof fetch {
  const send = options.omitEmptyToolRequired ? compatibleFetch : fetch;
  return async (input, init) => {
    const response = await send(input, init);
    tracker?.record(response.headers);
    if (response.status !== 429) return response;
    const wait = retryAfterMs(response.headers);
    tracker?.limited(Date.now() + wait);
    // Replace the provider's wording, which varies and is in English only.
    return new Response(
      JSON.stringify({
        error: {
          message: rateLimitMessage(Math.max(1, Math.ceil(wait / 1000))),
          type: 'rate_limit_exceeded',
        },
      }),
      { status: 429, headers: response.headers },
    );
  };
}
