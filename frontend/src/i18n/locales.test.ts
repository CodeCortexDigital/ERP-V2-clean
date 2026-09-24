import { describe, expect, it } from 'vitest';
import { LANGUAGES } from './languages';

// Every language file must have exactly the English keys and keep {{placeholders}}.
const files = import.meta.glob('./locales/*.json', { eager: true }) as Record<string, { default: Record<string, unknown> }>;

const flatten = (obj: Record<string, unknown>, prefix = ''): Record<string, string> =>
  Object.entries(obj).reduce<Record<string, string>>((acc, [k, v]) => {
    if (v && typeof v === 'object') Object.assign(acc, flatten(v as Record<string, unknown>, `${prefix}${k}.`));
    else acc[`${prefix}${k}`] = String(v);
    return acc;
  }, {});

const placeholders = (s: string) => (s.match(/\{\{\w+\}\}/g) || []).sort().join(',');
const en = flatten(files['./locales/en.json'].default);

describe('translations', () => {
  it('has a file for every offered language', () => {
    for (const lang of LANGUAGES) expect(files[`./locales/${lang.code}.json`], lang.code).toBeDefined();
  });

  for (const [path, mod] of Object.entries(files)) {
    it(`${path} matches the English keys and placeholders`, () => {
      const t = flatten(mod.default);
      expect(Object.keys(t).sort()).toEqual(Object.keys(en).sort());
      for (const key of Object.keys(en)) expect(placeholders(t[key]), `${path} ${key}`).toBe(placeholders(en[key]));
    });
  }
});
