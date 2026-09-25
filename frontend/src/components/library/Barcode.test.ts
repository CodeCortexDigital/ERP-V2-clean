import { describe, expect, it } from 'vitest';
import { PATTERNS, code128Values, code128Widths } from './Barcode';

describe('Code 128 barcode', () => {
  it('has 107 distinct symbols of 11 modules (the stop symbol is 13)', () => {
    expect(PATTERNS).toHaveLength(107);
    expect(new Set(PATTERNS).size).toBe(107);
    PATTERNS.forEach((p, i) => {
      const width = Array.from(p).reduce((s, d) => s + Number(d), 0);
      expect(width, `symbol ${i}`).toBe(i === 106 ? 13 : 11);
    });
  });

  it('adds start B, the check symbol and stop', () => {
    // "LIB-000001": L=44 I=41 B=34 -=13 0=16 … 1=17; check = (104 + Σ value × position) mod 103
    const values = code128Values('LIB-000001');
    const data = values.slice(1, -2);
    expect(values[0]).toBe(104);
    expect(data).toEqual([44, 41, 34, 13, 16, 16, 16, 16, 16, 17]);
    const check = data.reduce((s, v, i) => s + v * (i + 1), 104) % 103;
    expect(values[values.length - 2]).toBe(check);
    expect(values[values.length - 1]).toBe(106);
  });

  it('draws bars and spaces with the right total width', () => {
    const widths = code128Widths('C-000001');
    expect(widths.reduce((a, b) => a + b, 0)).toBe(11 * (8 + 2) + 13);
  });

  it('refuses characters outside code set B', () => {
    expect(() => code128Values('é')).toThrow();
  });
});
