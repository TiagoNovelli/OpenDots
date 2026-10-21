import type { ModelLimits, ModelLimitWindow } from '../shared/types';
import { currentLocale, t } from './i18n';

// The server rewrites a provider's 429 to this wording (model-limits.ts),
// possibly behind the SDK's status prefix.
const rateLimited = /Model rate limit reached\. Try again in (\d+)s\./;

/** Shows known errors in the UI language and leaves others as they came. */
export function friendlyError(message: string): string {
  const limited = rateLimited.exec(message);
  if (limited)
    return t('The model’s usage limit was reached. Try again in {seconds}s.', {
      seconds: limited[1],
    });
  return t(message);
}

export function secondsUntil(time: number, now = Date.now()) {
  return Math.max(1, Math.ceil((time - now) / 1000));
}

const count = (value: number) => value.toLocaleString(currentLocale());

function windowText(window: ModelLimitWindow, label: string) {
  return t(label, {
    remaining: count(window.remaining),
    limit: count(window.limit),
  });
}

/** One line per window the provider reported, for Settings. */
export function limitSummary(limits: ModelLimits): string[] {
  return [
    limits.requests &&
      windowText(limits.requests, '{remaining} of {limit} requests left'),
    limits.tokens &&
      windowText(limits.tokens, '{remaining} of {limit} tokens left'),
  ].filter((line): line is string => !!line);
}
