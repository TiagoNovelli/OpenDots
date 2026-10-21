import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { resolveLocale, t, translate } from '../src/client/i18n';
import { ptBR } from '../src/client/locales/pt-BR';

const client = join(import.meta.dirname, '../src/client');
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sources(join(dir, entry.name))
      : /\.tsx?$/.test(entry.name)
        ? [join(dir, entry.name)]
        : [],
  );
}
// Literal keys passed straight to t(), including ones prettier wrapped.
function literalKeys(): Set<string> {
  const keys = new Set<string>();
  for (const file of sources(client)) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/\bt\(\s*(['"])((?:(?!\1).)+)\1/g))
      keys.add(match[2]);
  }
  return keys;
}
const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

it('falls back to English and fills placeholders', () => {
  expect(translate({}, 'Hello {name}', { name: 'Dot' })).toBe('Hello Dot');
  expect(translate({ Save: 'Salvar' }, 'Save')).toBe('Salvar');
  expect(
    translate({ 'Hi {name}': 'Oi {name}' }, 'Hi {name}', { name: 'Ana' }),
  ).toBe('Oi Ana');
  expect(translate({}, 'Keep {unknown}', {})).toBe('Keep {unknown}');
  // The test environment's browser language is English.
  expect(t('Save')).toBe('Save');
});

it('picks Portuguese from the browser unless a language is chosen', () => {
  expect(resolveLocale('system', ['pt-BR', 'en'])).toBe('pt-BR');
  expect(resolveLocale('system', ['pt-PT'])).toBe('pt-BR');
  expect(resolveLocale('system', ['en-US', 'pt-BR'])).toBe('pt-BR');
  expect(resolveLocale('system', ['fr-FR'])).toBe('en');
  expect(resolveLocale('en', ['pt-BR'])).toBe('en');
  expect(resolveLocale('pt-BR', [])).toBe('pt-BR');
});

it('translates every literal UI text into Portuguese', () => {
  const keys = literalKeys();
  expect(keys.size).toBeGreaterThan(300);
  const missing = [...keys].filter((key) => !Object.hasOwn(ptBR, key));
  expect(missing).toEqual([]);
});

it('keeps the same placeholders in every Portuguese text', () => {
  const mismatched = Object.entries(ptBR).filter(
    ([english, portuguese]) =>
      placeholders(english).join() !== placeholders(portuguese).join(),
  );
  expect(mismatched).toEqual([]);
});
