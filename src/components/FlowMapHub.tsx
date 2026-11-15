import React, { useState, useEffect, useMemo, useRef } from 'react';
import { formatIdr } from '../lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Waves, TrendingDown, TrendingUp, PiggyBank, Percent, RefreshCw } from 'lucide-react';
import {
  buildFlowGraph,
  buildFlowInsights,
  type FlowGraph,
  type FlowInsights,
  type FlowTx,
} from '../lib/flow-analytics';

interface SummaryRow {
  period_id: number;
  month: string;
  income: number;
  outcome: { cash: number; credit_payment: number; credit_expenses: number; total: number };
  savings_rate_pct: number;
}

function compactIdr(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}Rp${(abs / 1_000_000_000).toFixed(1).replace('.', ',')}M`;
  if (abs >= 1_000_000) return `${sign}Rp${(abs / 1_000_000).toFixed(1).replace('.', ',')}jt`;
  if (abs >= 1_000) return `${sign}Rp${Math.round(abs / 1_000)}rb`;
  return `${sign}Rp${Math.round(abs)}`;
}

interface LayoutNode {
  node: FlowGraph['nodes'][number];
  x: number;
  y: number;
  h: number;
}

const NODE_W = 16;
const PAD = 24;
const GAP = 10;
const LABEL_RIGHT_W = 210;
const X_SOURCE = 20;
const X_TARGET = 620;
const VIEW_W = X_TARGET + NODE_W + LABEL_RIGHT_W;

export default function FlowMapHub() {
  const [summaries, setSummaries] = useState<SummaryRow[] | null>(null);
  const [colors, setColors] = useState<Record<string, string>>({});
  const [periodId, setPeriodId] = useState<number | null>(null);
  const [txs, setTxs] = useState<FlowTx[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadBase = () => {
    setError(null);
    setSummaries(null);
    setTxs(null);
    fetch('/api/summary')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Gagal memuat ringkasan'))))
      .then(async (rows: SummaryRow[]) => {
        if (!mounted.current) return;
        setSummaries(rows);
        const target = rows.length > 0 ? rows[rows.length - 1].period_id : null;
        setPeriodId(target);
        if (target != null) await loadTxs(target);
        try {
          const c = await fetch('/api/categories').then((r) => (r.ok ? r.json() : []));
          if (mounted.current) {
            const map: Record<string, string> = {};
            for (const cat of c) if (cat?.name) map[cat.name] = cat.color;
            setColors(map);
          }
        } catch {
          /* optional decoration, ignore */
        }
      })
      .catch((e: Error) => {
        if (mounted.current) setError(e.message);
      });
  };

  const loadTxs = (pid: number) => {
    setTxs(null);
    return fetch(`/api/transactions?period_id=${pid}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Gagal memuat transaksi'))))
      .then((rows) => {
        if (mounted.current) setTxs(rows);
      })
      .catch((e: Error) => {
        if (mounted.current) setError(e.message);
      });
  };

  useEffect(loadBase, []);

  const period = useMemo(
    () => summaries?.find((s) => s.period_id === periodId) ?? null,
    [summaries, periodId]
  );

  const { graph, insights } = useMemo(() => {
    if (period == null || txs == null) return { graph: null, insights: null };
    const g = buildFlowGraph(txs, period.income || 0, colors);
    const ins = buildFlowInsights(txs, period.income || 0, g);
    return { graph: g, insights: ins };
  }, [period, txs, colors]);

  if (error) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center space-y-3" data-testid="flow-error">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <Button variant="outline" size="sm" onClick={loadBase}>
          <RefreshCw className="h-4 w-4 mr-2" /> Coba Lagi
        </Button>
      </div>
    );
  }
  if (summaries == null || (period != null && txs == null)) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-sm text-slate-600 dark:text-slate-400" data-testid="flow-loading">
        Memuat peta aliran dana...
      </div>
    );
  }
  if (summaries.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-sm text-slate-600 dark:text-slate-400" data-testid="flow-empty">
        Belum ada data transaksi. Peta aliran dana akan muncul setelah ada transaksi tercatat.
      </div>
    );
  }
  if (period == null || graph == null || insights == null) return null;

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <Waves className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Peta Aliran Dana</h2>
        <div className="ml-auto">
          <Select
            value={periodId != null ? String(periodId) : undefined}
            onValueChange={(v) => {
              const pid = parseInt(v, 10);
              setPeriodId(pid);
              loadTxs(pid);
            }}
          >
            <SelectTrigger className="w-[190px]" aria-label="Pilih periode">
              <SelectValue placeholder="Periode" />
            </SelectTrigger>
            <SelectContent>
              {[...summaries].reverse().map((s) => (
                <SelectItem key={s.period_id} value={String(s.period_id)}>
                  {s.month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="flow-kpis">
        <KpiCard icon={<TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />} label="Pemasukan" value={formatIdr(insights.income)} />
        <KpiCard icon={<TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />} label="Total Keluar" value={formatIdr(insights.totalOut)} />
        <KpiCard
          icon={<PiggyBank className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
          label={insights.savingsLeft >= 0 ? 'Sisa / Tabungan' : 'Defisit'}
          value={formatIdr(insights.savingsLeft)}
          accent={insights.savingsLeft < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}
        />
        <KpiCard icon={<Percent className="h-4 w-4 text-violet-600 dark:text-violet-400" />} label="Savings Rate" value={`${insights.savingsRatePct}%`} />
      </div>

      {/* Sankey */}
      <div className="glass-card rounded-2xl p-3 sm:p-4">
        <SankeySvg graph={graph} hovered={hovered} setHovered={setHovered} />
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 px-1">
          Arah aliran: kiri (pemasukan) ke kanan (peruntukan). Ketebalan pita sebanding dengan nominal. Biaya kartu kredit
          dihitung saat pelunasannya, bukan saat transaksi tercatat.
        </p>
      </div>

      {/* Insight chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="flow-insights">
        <InsightChip
          label="Konsentrasi Top 3"
          value={`${insights.concentrationPct}%`}
          note={insights.concentrationPct >= 60 ? 'Sangat terkonsentrasi di segelintir pos' : 'Sebaran belanja cukup merata'}
        />
        <InsightChip
          label="Porsi Pelunasan Kredit"
          value={`${insights.creditSharePct}%`}
          note={insights.creditSharePct >= 25 ? 'Kartu kredit mendominasi arus kas' : 'Ketergantungan kartu kredit terkendali'}
        />
        <InsightChip
          label="Alokasi Invest"
          value={formatIdr(insights.investTotal)}
          note={insights.investTotal > 0 ? 'Sebagian pemasukan mengalir ke portofolio' : 'Belum ada aliran ke investasi periode ini'}
        />
      </div>

      {/* Top flows */}
      <div className="glass-card rounded-2xl p-4" data-testid="flow-top">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Aliran Terbesar</h3>
        <div className="space-y-2">
          {insights.topFlows.slice(0, 6).map((f) => (
            <div key={f.label} className="flex items-center gap-2 text-xs">
              <span className="w-28 sm:w-36 truncate text-slate-700 dark:text-slate-300">{f.label}</span>
              <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    f.kind === 'savings'
                      ? 'bg-blue-500'
                      : f.kind === 'invest'
                        ? 'bg-violet-500'
                        : f.kind === 'overspend'
                          ? 'bg-rose-500'
                          : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.max(2, Math.min(100, f.pct))}%` }}
                />
              </div>
              <span className="w-14 text-right text-slate-500 dark:text-slate-400">{f.pct}%</span>
              <span className="w-20 sm:w-24 text-right font-medium text-slate-800 dark:text-slate-200">{compactIdr(f.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
  return (
    <div className="glass-card rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`mt-1 text-base font-semibold ${accent ?? 'text-slate-800 dark:text-slate-100'}`}>{value}</p>
    </div>
  );
}

function InsightChip({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="glass-card rounded-xl p-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{note}</p>
    </div>
  );
}

export function SankeySvg({
  graph,
  hovered,
  setHovered,
}: {
  graph: FlowGraph;
  hovered: string | null;
  setHovered: (id: string | null) => void;
}) {
  const targets = graph.nodes.slice(1);
  const totalBase = graph.nodes[0].value;
  const n = targets.length;
  const innerH0 = 560;
  const gapTotal = GAP * Math.max(0, n - 1);
  const scale0 = (innerH0 - gapTotal) / Math.max(1, totalBase);
  const heights = targets.map((t) => Math.max(5, t.value * scale0));
  const innerH = Math.max(innerH0, heights.reduce((s, h) => s + h, 0) + gapTotal);
  const H = innerH + PAD * 2;

  const sourceH = Math.max(5, graph.links.reduce((s, l) => s + l.value, 0) * scale0);
  const layoutTargets: LayoutNode[] = [];
  let cy = PAD;
  targets.forEach((t, i) => {
    layoutTargets.push({ node: t, x: X_TARGET, y: cy, h: heights[i] });
    cy += heights[i] + GAP;
  });

  const midX = (X_SOURCE + NODE_W + X_TARGET) / 2;
  let sy = PAD;
  const ribbons = graph.links.map((l) => {
    const h = Math.max(1, l.value * scale0);
    const t = layoutTargets.find((tn) => tn.node.id === graph.nodes[l.target].id)!;
    const path = `M ${X_SOURCE + NODE_W} ${sy} C ${midX} ${sy} ${midX} ${t.y} ${X_TARGET} ${t.y} L ${X_TARGET} ${t.y + t.h} C ${midX} ${t.y + t.h} ${midX} ${sy + h} ${X_SOURCE + NODE_W} ${sy + h} Z`;
    sy += h;
    return { link: l, target: t, path, y0: sy - h, h };
  });

  const truncate = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}...` : s);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${H}`}
        className="w-full min-w-[640px]"
        style={{ height: 'auto' }}
        role="img"
        aria-label="Diagram Sankey aliran dana dari pemasukan ke peruntukan"
        data-testid="flow-sankey"
      >
        {/* Income node */}
        <g>
          <rect x={X_SOURCE} y={PAD} width={NODE_W} height={sourceH} rx={3} fill={graph.nodes[0].color} />
          <text x={X_SOURCE + 4} y={PAD - 8} className="fill-slate-700 dark:fill-slate-200" fontSize={13} fontWeight={600}>
            Pemasukan {compactIdr(graph.nodes[0].value)}
          </text>
        </g>
        {/* Ribbons */}
        {ribbons.map((r) => (
          <path
            key={`link-${r.target.node.id}`}
            d={r.path}
            fill={r.link.color}
            opacity={hovered == null || hovered === r.target.node.id ? 0.55 : 0.12}
            className="cursor-pointer transition-opacity"
            onMouseEnter={() => setHovered(r.target.node.id)}
            onMouseLeave={() => setHovered(null)}
          >
            <title>{`${r.target.node.label}: ${formatIdr(r.link.value)}`}</title>
          </path>
        ))}
        {/* Target nodes + labels */}
        {layoutTargets.map((tn) => (
          <g
            key={tn.node.id}
            opacity={hovered == null || hovered === tn.node.id ? 1 : 0.35}
            onMouseEnter={() => setHovered(tn.node.id)}
            onMouseLeave={() => setHovered(null)}
            className="cursor-pointer"
          >
            <rect x={tn.x} y={tn.y} width={NODE_W} height={tn.h} rx={3} fill={tn.node.color} />
            <text x={tn.x + NODE_W + 8} y={tn.y + Math.min(tn.h / 2 + 4, 14)} className="fill-slate-700 dark:fill-slate-200" fontSize={12.5}>
              {truncate(tn.node.label, 20)}
              <tspan className="fill-slate-600 dark:fill-slate-300" fontSize={11.5}>
                {' '}
                {compactIdr(tn.node.value)}
              </tspan>
            </text>
            <title>{`${tn.node.label}: ${formatIdr(tn.node.value)}`}</title>
          </g>
        ))}
      </svg>
    </div>
  );
}
