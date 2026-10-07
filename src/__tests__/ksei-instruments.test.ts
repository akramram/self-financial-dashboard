import { describe, it, expect } from 'vitest';
import {
  extractInstruments,
  KIND_BY_SLICE,
  kseiTypeColor,
  kseiTypeLabel,
  KSEI_TYPE_COLORS,
} from '../lib/kseiInstruments';

/**
 * KUR-145 — shape-tolerant extraction for /api/ksei/instruments.
 * The real AKSes 200 shape is unverified (token expired), so these tests pin
 * the CONTRACT: known bundle-derived names map, aliases map, unknown shapes
 * degrade to an empty list (never throw), and UI columns stay stable.
 */

describe('KIND_BY_SLICE (KUR-143 capture naming)', () => {
  it('maps slice types to ksei_detail_snapshots kinds', () => {
    expect(KIND_BY_SLICE.EKUITAS).toBe('equity-summary');
    expect(KIND_BY_SLICE.REKSADANA).toBe('reksadana-summary');
  });
});

describe('extractInstruments — equity shapes', () => {
  it('maps bundle-derived field names (codeBaseSec / jmlLembar style)', () => {
    const raw = {
      data: [
        { codeBaseSec: 'BBCA', emitenName: 'Bank Central Asia', summaryAmount: 10_550_000, jmlLembar: 200 },
        { codeBaseSec: 'BBRI', emitenName: 'Bank Rakyat Indonesia', summaryAmount: 6_480_000, jmlLembar: 1500 },
      ],
    };
    const out = extractInstruments(raw, 'EKUITAS');
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ code: 'BBCA', name: 'Bank Central Asia', value: 10_550_000, volume: 200 });
    expect(out[1].volume).toBe(1500);
  });

  it('derives code from name for funds and drops volume for REKSADANA', () => {
    const raw = {
      dataList: [
        { name: 'Sucorinvest Stable Fund', summaryAmount: 8_200_000, jmlLembar: 1234 },
      ],
    };
    const out = extractInstruments(raw, 'REKSADANA');
    expect(out).toHaveLength(1);
    expect(out[0].code).toBe('Sucorinvest Stable Fund');
    expect(out[0].volume).toBeUndefined(); // spec §8: volume only for EKUITAS
  });

  it('handles AKSes {code,status}-style envelopes with nested arrays', () => {
    const raw = {
      code: 0,
      status: 'ok',
      data: { emitenList: [{ ticker: 'TLKM', name: 'Telkom Indonesia', value: 2_520_000, volume: 800 }] },
    };
    const out = extractInstruments(raw, 'EKUITAS');
    expect(out).toHaveLength(1);
    expect(out[0].code).toBe('TLKM');
  });

  it('recursive fallback finds a value-bearing array under unknown keys', () => {
    const raw = {
      some: {
        weird: {
          wrapper: [
            { foo: 'x', amount: 5, name: 'Instr A' },
            { foo: 'y', amount: 7, name: 'Instr B' },
          ],
        },
      },
    };
    const out = extractInstruments(raw, 'EKUITAS');
    expect(out).toHaveLength(2);
    expect(out[0].value).toBe(5);
  });
});

describe('extractInstruments — defensive degradation', () => {
  it('returns [] for null / primitives / empty objects (never throws)', () => {
    expect(extractInstruments(null, 'EKUITAS')).toEqual([]);
    expect(extractInstruments(undefined, 'REKSADANA')).toEqual([]);
    expect(extractInstruments('nope', 'EKUITAS')).toEqual([]);
    expect(extractInstruments(42, 'EKUITAS')).toEqual([]);
    expect(extractInstruments({}, 'EKUITAS')).toEqual([]);
  });

  it('returns [] when rows carry no recognizable value field', () => {
    const raw = { data: [{ a: 1 }, { b: 2 }] };
    expect(extractInstruments(raw, 'EKUITAS')).toEqual([]);
  });

  it('skips rows without a value instead of failing the whole list', () => {
    const raw = {
      data: [
        { code: 'GOOD', name: 'Good Corp', summaryAmount: 1000 },
        { code: 'BAD' },
        { code: 'ALSO', name: 'Also Corp', summaryAmount: 2000 },
      ],
    };
    const out = extractInstruments(raw, 'EKUITAS');
    expect(out.map(o => o.code)).toEqual(['GOOD', 'ALSO']);
  });

  it('parses numeric strings (APIs love strings)', () => {
    const raw = { data: [{ code: 'ASII', name: 'Astra', summaryAmount: '2575000', jmlLembar: '500' }] };
    const out = extractInstruments(raw, 'EKUITAS');
    expect(out[0].value).toBe(2_575_000);
    expect(out[0].volume).toBe(500);
  });
});

describe('shared display constants', () => {
  it('colors match the card palette', () => {
    expect(kseiTypeColor('EKUITAS')).toBe('#10b981');
    expect(kseiTypeColor('REKSADANA')).toBe('#6366f1');
    expect(kseiTypeColor('UNKNOWN')).toBe('#94a3b8');
    expect(KSEI_TYPE_COLORS.EKUITAS).toBe(kseiTypeColor('EKUITAS'));
  });

  it('labels are the Indonesian slice names', () => {
    expect(kseiTypeLabel('EKUITAS')).toBe('Saham');
    expect(kseiTypeLabel('REKSADANA')).toBe('Reksadana');
    expect(kseiTypeLabel('KAS')).toBe('Kas');
    expect(kseiTypeLabel('ZZZ')).toBe('ZZZ');
  });
});
