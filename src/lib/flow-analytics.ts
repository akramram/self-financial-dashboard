// Money Flow engine: builds a Sankey graph (income -> destinations) for one period.
// Outflow = done transactions of type 'cash' or 'credit_payment' (money actually leaving).
// 'credit_expense' is excluded: it is incurred debt, not settled cash (settled via credit_payment).

export const UNCATEGORIZED_LABEL = 'Tanpa Kategori';

export interface FlowTx {
  title?: string;
  category?: string | null;
  amount: number;
  type: string;
  done?: number | boolean;
}

export interface FlowCategoryColors {
  [name: string]: string | undefined;
}

export interface FlowNode {
  id: string;
  label: string;
  kind: 'income' | 'category' | 'invest' | 'savings' | 'overspend';
  value: number;
  color: string;
}

export interface FlowLink {
  source: number;
  target: number;
  value: number;
  color: string;
}

export interface FlowGraph {
  nodes: FlowNode[];
  links: FlowLink[];
  totalOut: number;
  savingsLeft: number;
}

export interface FlowInsights {
  income: number;
  totalOut: number;
  investTotal: number;
  creditTotal: number;
  creditSharePct: number;
  savingsLeft: number;
  savingsRatePct: number;
  concentrationPct: number;
  topFlows: { label: string; value: number; pct: number; kind: FlowNode['kind'] }[];
}

const FALLPALETTE = ['#64748b', '#0ea5e9', '#f59e0b', '#14b8a6', '#a855f7', '#f97316'];

export const INCOME_NODE_COLOR = '#059669';
export const SAVINGS_NODE_COLOR = '#2563eb';
export const OVERSPEND_NODE_COLOR = '#dc2626';
export const INVEST_NODE_COLOR = '#7c3aed';

function colorFor(category: string | null | undefined, colors: FlowCategoryColors, index: number): string {
  const name = category || UNCATEGORIZED_LABEL;
  const fromApi = colors[name];
  if (fromApi) return fromApi;
  return FALLPALETTE[index % FALLPALETTE.length];
}

export function buildFlowGraph(
  txs: FlowTx[],
  income: number,
  categoryColors: FlowCategoryColors = {}
): FlowGraph {
  const perCategory = new Map<string, { value: number; isInvest: boolean }>();
  let totalOut = 0;
  for (const t of txs) {
    if (!t.done) continue;
    if (t.type !== 'cash' && t.type !== 'credit_payment') continue;
    const amount = Math.max(0, Number(t.amount) || 0);
    if (amount <= 0) continue;
    const name = (t.category || '').trim() || UNCATEGORIZED_LABEL;
    const isInvest = name === 'Invest';
    const cur = perCategory.get(name) || { value: 0, isInvest };
    cur.value += amount;
    perCategory.set(name, cur);
    totalOut += amount;
  }

  const savingsLeft = income - totalOut;

  const nodes: FlowNode[] = [
    { id: 'income', label: 'Pemasukan', kind: 'income', value: Math.max(income, totalOut), color: INCOME_NODE_COLOR },
  ];
  const links: FlowLink[] = [];

  const entries = [...perCategory.entries()].sort((a, b) => b[1].value - a[1].value);
  entries.forEach(([name, agg], i) => {
    const kind: FlowNode['kind'] = agg.isInvest ? 'invest' : 'category';
    nodes.push({
      id: `cat:${name}`,
      label: name,
      kind,
      value: agg.value,
      color: agg.isInvest ? INVEST_NODE_COLOR : colorFor(name, categoryColors, i),
    });
    links.push({ source: 0, target: nodes.length - 1, value: agg.value, color: nodes[nodes.length - 1].color });
  });

  if (savingsLeft >= 0) {
    nodes.push({
      id: 'savings',
      label: 'Sisa / Tabungan',
      kind: 'savings',
      value: savingsLeft,
      color: SAVINGS_NODE_COLOR,
    });
    links.push({ source: 0, target: nodes.length - 1, value: savingsLeft, color: SAVINGS_NODE_COLOR });
  } else {
    nodes.push({
      id: 'overspend',
      label: 'Defisit',
      kind: 'overspend',
      value: Math.abs(savingsLeft),
      color: OVERSPEND_NODE_COLOR,
    });
    links.push({ source: 0, target: nodes.length - 1, value: Math.abs(savingsLeft), color: OVERSPEND_NODE_COLOR });
  }

  return { nodes, links, totalOut, savingsLeft };
}

export function buildFlowInsights(txs: FlowTx[], income: number, graph: FlowGraph): FlowInsights {
  let investTotal = 0;
  let creditTotal = 0;
  for (const t of txs) {
    if (!t.done) continue;
    const amount = Math.max(0, Number(t.amount) || 0);
    const name = (t.category || '').trim() || UNCATEGORIZED_LABEL;
    if (t.type === 'cash' || t.type === 'credit_payment') {
      if (name === 'Invest') investTotal += amount;
      if (t.type === 'credit_payment') creditTotal += amount;
    }
  }
  const base = Math.max(income, graph.totalOut);
  const topFlows = graph.links
    .map((l) => ({
      label: graph.nodes[l.target].label,
      value: l.value,
      pct: base > 0 ? Number(((l.value / base) * 100).toFixed(1)) : 0,
      kind: graph.nodes[l.target].kind,
    }))
    .sort((a, b) => b.value - a.value);
  const concentrationPct = topFlows.slice(0, 3).reduce((s, f) => s + f.pct, 0);
  return {
    income,
    totalOut: graph.totalOut,
    investTotal,
    creditTotal,
    creditSharePct: graph.totalOut > 0 ? Number(((creditTotal / graph.totalOut) * 100).toFixed(1)) : 0,
    savingsLeft: graph.savingsLeft,
    savingsRatePct: income > 0 ? Number(((graph.savingsLeft / income) * 100).toFixed(1)) : 0,
    concentrationPct: Number(concentrationPct.toFixed(1)),
    topFlows,
  };
}
