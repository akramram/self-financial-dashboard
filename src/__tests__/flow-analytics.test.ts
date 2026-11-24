import { describe, it, expect } from 'vitest';
import { buildFlowGraph, buildFlowInsights } from '../lib/flow-analytics';

describe('flow-analytics', () => {
  it('builds graph: categories, invest, savings', () => {
    const txs = [
      { title: 'Belanja', category: 'Belanja', amount: 2000000, type: 'cash', done: 1 },
      { title: 'CC Payment', category: 'Kartu Kredit', amount: 1500000, type: 'credit_payment', done: 1 },
      { title: 'Invest', category: 'Invest', amount: 2000000, type: 'cash', done: 1 },
      { title: 'Unpaid', category: 'Belanja', amount: 500000, type: 'cash', done: 0 },
      { title: 'Debt incurred', category: 'Belanja', amount: 900000, type: 'credit_expense', done: 1 },
    ];
    const g = buildFlowGraph(txs, 10000000);
    // outflow = 2.000.000 + 1.500.000 + 2.000.000 (credit_expense & unpaid excluded)
    expect(g.totalOut).toBe(5500000);
    expect(g.savingsLeft).toBe(4500000);
    const labels = g.nodes.map((n) => n.label);
    expect(labels).toContain('Pemasukan');
    expect(labels).toContain('Sisa / Tabungan');
    expect(labels).toContain('Invest');
    const invest = g.nodes.find((n) => n.label === 'Invest');
    expect(invest?.kind).toBe('invest');
    expect(g.links.every((l) => l.source === 0)).toBe(true);
    const savingsNode = g.nodes.find((n) => n.kind === 'savings');
    expect(g.links.some((l) => l.target === g.nodes.indexOf(savingsNode!))).toBe(true);
  });

  it('flags overspend as deficit node', () => {
    const txs = [{ title: 'Big', category: 'Belanja', amount: 8000000, type: 'cash', done: 1 }];
    const g = buildFlowGraph(txs, 5000000);
    expect(g.savingsLeft).toBe(-3000000);
    const deficit = g.nodes.find((n) => n.kind === 'overspend');
    expect(deficit?.value).toBe(3000000);
    expect(deficit?.label).toBe('Defisit');
  });

  it('uses fallback label for missing category', () => {
    const txs = [{ title: 'Misc', category: null, amount: 100000, type: 'cash', done: 1 }];
    const g = buildFlowGraph(txs, 200000);
    expect(g.nodes.map((n) => n.label)).toContain('Tanpa Kategori');
  });

  it('applies category colors from map', () => {
    const txs = [{ title: 'A', category: 'Makan', amount: 50000, type: 'cash', done: 1 }];
    const g = buildFlowGraph(txs, 100000, { Makan: '#ff0000' });
    expect(g.nodes.find((n) => n.label === 'Makan')?.color).toBe('#ff0000');
  });

  it('computes insights: credit share, concentration, savings rate', () => {
    const txs = [
      { title: 'CC', category: 'Kartu Kredit', amount: 4000000, type: 'credit_payment', done: 1 },
      { title: 'Cash spend', category: 'Belanja', amount: 1000000, type: 'cash', done: 1 },
      { title: 'Invest', category: 'Invest', amount: 1000000, type: 'cash', done: 1 },
    ];
    const g = buildFlowGraph(txs, 10000000);
    const ins = buildFlowInsights(txs, 10000000, g);
    expect(ins.totalOut).toBe(6000000);
    expect(ins.creditTotal).toBe(4000000);
    expect(ins.creditSharePct).toBeCloseTo(66.7, 0);
    expect(ins.investTotal).toBe(1000000);
    expect(ins.savingsLeft).toBe(4000000);
    expect(ins.savingsRatePct).toBeCloseTo(40, 0);
    expect(ins.topFlows[0].label).toBe('Kartu Kredit');
    expect(ins.concentrationPct).toBeGreaterThan(0);
  });

  it('handles zero income and empty txs', () => {
    const g = buildFlowGraph([], 0);
    expect(g.totalOut).toBe(0);
    expect(g.savingsLeft).toBe(0);
    const ins = buildFlowInsights([], 0, g);
    expect(ins.savingsRatePct).toBe(0);
    expect(ins.creditSharePct).toBe(0);
  });
});
