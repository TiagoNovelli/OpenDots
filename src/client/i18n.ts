import { ptBR } from './locales/pt-BR';
export type LocalePreference = 'system' | 'en' | 'pt-BR';
export type Locale = Exclude<LocalePreference, 'system'>;
const key = 'opendots-locale';
// English text is the key, so a missing translation falls back to English.
const catalogs: Record<Locale, Record<string, string>> = {
  en: {},
  'pt-BR': ptBR,
};
export const localeNames: Record<LocalePreference, string> = {
  system: 'System',
  en: 'English',
  'pt-BR': 'Português (Brasil)',
};
// Storage can be unavailable (private windows, blocked site data); the
// language then follows the browser for this visit.
export function localePreference(): LocalePreference {
  try {
    const value = localStorage.getItem(key);
    if (value === 'en' || value === 'pt-BR') return value;
  } catch {
    // Fall through to the browser language.
  }
  return 'system';
}
export function resolveLocale(
  preference: LocalePreference,
  languages: readonly string[],
): Locale {
  if (preference !== 'system') return preference;
  return languages.some((language) => language.toLowerCase().startsWith('pt'))
    ? 'pt-BR'
    : 'en';
}
// Outside a browser (Node also exposes navigator), stay in English so output
// does not depend on the machine's language.
const browser = typeof document !== 'undefined';
const locale = browser
  ? resolveLocale(localePreference(), navigator.languages)
  : 'en';
if (browser) document.documentElement.lang = locale;
export function currentLocale(): Locale {
  return locale;
}
// Text is read at render time, so a new language applies after a reload.
export function setLocalePreference(preference: LocalePreference) {
  try {
    if (preference === 'system') localStorage.removeItem(key);
    else localStorage.setItem(key, preference);
  } catch {
    // The choice cannot persist; reload would lose it, so keep this page.
    return;
  }
  location.reload();
}
/** Translates English UI text; `{name}` placeholders take `values`. */
export function t(
  text: string,
  values?: Record<string, string | number>,
): string {
  return translate(catalogs[locale], text, values);
}
export function translate(
  catalog: Record<string, string>,
  text: string,
  values?: Record<string, string | number>,
): string {
  const template = catalog[text] ?? text;
  return values
    ? template.replace(/\{(\w+)\}/g, (match, name: string) =>
        Object.hasOwn(values, name) ? String(values[name]) : match,
      )
    : template;
}
