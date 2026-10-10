import React, { useMemo, useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import type { NetworthRecord } from '../lib/data';
import { formatIdr } from '../lib/utils';
import { computeDividendLens, type BbriQuoteLite } from '../lib/dividendLens';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

interface Props {
  data: NetworthRecord[];
}

// Vibrant palette for up to 12 investment types
const COLORS = [
  '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#6366f1',
  '#14b8a6', '#f97316', '#84cc16', '#a855f7',
];

export default function NetworthComposition({ data }: Props) {
  const sortedData = useMemo(() =>
    [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [data]
  );

  const latest = sortedData[sortedData.length - 1];

  // ── Dividend lens (KUR-210): BBRI TTM yield + projected annual income ──
  const [bbri, setBbri] = useState<{ quote: BbriQuoteLite | null; stale: boolean } | null>(null);
  useEffect(() => {
    let alive = true;
    fetch('/api/bbri/quote')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (alive) setBbri({ quote: d?.quote ?? null, stale: Boolean(d?.stale) });
      })
      .catch(() => {
        // fetch failed / timeout → keep null; lens falls back to manual estimate
        if (alive) setBbri({ quote: null, stale: true });
      });
    return () => {
      alive = false;
    };
  }, []);

  // ── Donut chart: latest month breakdown ──────────────────────────────
  const donutData = useMemo(() => {
    if (!latest?.breakdown) return null;
    const entries = Object.entries(latest.breakdown).sort(([, a], [, b]) => b - a);
    return {
      labels: entries.map(([key]) => key),
      datasets: [{
        data: entries.map(([, val]) => val),
        backgroundColor: entries.map((_, i) => COLORS[i % COLORS.length]),
        borderColor: entries.map((_, i) => COLORS[i % COLORS.length]),
        borderWidth: 0,
        hoverBorderWidth: 2,
        hoverBorderColor: '#fff',
      }],
    };
  }, [latest]);

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 10,
          font: { size: 11 },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const total = ctx.dataset.data.reduce((s: number, v: number) => s + v, 0);
            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0';
            return ` ${ctx.label}: ${formatIdr(ctx.parsed)} (${pct}%)`;
          },
        },
      },
    },
  };

  // ── Stacked bar chart: composition trend ─────────────────────────────
  const allKeys = useMemo(() => {
    const set = new Set<string>();
    sortedData.forEach((d) => {
      if (d.breakdown) Object.keys(d.breakdown).forEach((k) => set.add(k));
    });
    return Array.from(set);
  }, [sortedData]);

  const barData = useMemo(() => {
    const labels = sortedData.map((d) => d.month);
    const datasets = allKeys.map((key, i) => ({
      label: key,
      data: sortedData.map((d) => (d.breakdown?.[key] as number) ?? 0),
      backgroundColor: COLORS[i % COLORS.length],
      borderWidth: 0,
      borderRadius: i === allKeys.length - 1 ? 4 : 0,
      borderSkipped: false,
    }));
    return { labels, datasets };
  }, [sortedData, allKeys]);

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 14,
          usePointStyle: true,
          pointStyleWidth: 10,
          font: { size: 11 },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${ctx.dataset.label}: ${formatIdr(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
      y: {
        stacked: true,
        ticks: {
          callback: (v: any) => formatIdr(v),
          font: { size: 11 },
        },
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
  };

  // ── Investment metrics ───────────────────────────────────────────────
  const metrics = useMemo(() => {
    if (!latest?.breakdown) return [];
    const entries = Object.entries(latest.breakdown).sort(([, a], [, b]) => b - a);
    const total = latest.total || entries.reduce((s, [, v]) => s + v, 0);

    // Find previous month for MoM comparison
    const prev = sortedData.length >= 2 ? sortedData[sortedData.length - 2] : null;

    return entries.map(([key, value]) => {
      const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
      const prevValue = prev?.breakdown?.[key] as number | undefined;
      const change = prevValue != null ? value - prevValue : 0;
      const changePct = prevValue != null && prevValue > 0 ? ((change / prevValue) * 100).toFixed(1) : null;
      return { key, value, pct, change, changePct };
    });
  }, [latest, sortedData]);

  // ── Dividend lens metrics (KUR-210) ───────────────────────────────────
  const sahamValue = (latest?.breakdown?.['Saham'] as number) ?? 0;
  // While the quote request is in flight (bbri === null) we render the manual
  // estimate immediately — never block or blank the card on the fetch.
  const dividendLens = useMemo(
    () =>
      computeDividendLens({
        quote: bbri?.quote ?? null,
        stale: bbri ? bbri.stale : true,
        sahamValue,
      }),
    [bbri, sahamValue]
  );

  if (!latest) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No networth data available.
      </div>
    );
  }

  const fmtPct1 = (n: number) => n.toFixed(1).replace('.', ',');

  const portfolioYieldPct =
    dividendLens.projectedAnnualDividend != null && latest.total > 0
      ? (dividendLens.projectedAnnualDividend / latest.total) * 100
      : null;

  return (
    <div className="space-y-6">
      {/* Dividend lens aggregate (KUR-210 Fase B) — hidden when no data at all */}
      {dividendLens.source != null && (
        <div className="glass-card p-6">
          <div className="flex items-start justify-between flex-wrap gap-2 mb-4">
            <div>
              <h2 className="text-lg font-semibold">Dividend Income (Est.)</h2>
              <p className="text-xs text-slate-600 dark:text-white/60">
                BBRI · trailing twelve months
              </p>
            </div>
            {dividendLens.source === 'manual' && (
              <span
                data-testid="dividend-manual-badge"
                className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold"
              >
                manual estimate
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Projected Annual Income</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatIdr(dividendLens.projectedAnnualDividend ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Portfolio Yield</p>
              <p className="text-xl sm:text-2xl font-bold">
                {portfolioYieldPct != null ? `${fmtPct1(portfolioYieldPct)}%` : '-'}
              </p>
              <p className="text-[11px] text-muted-foreground">of {formatIdr(latest.total)} total</p>
            </div>
          </div>
        </div>
      )}

      {/* Donut + Metrics row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Donut chart */}
        <div className="lg:col-span-3 glass-card p-6">
          <h2 className="text-lg font-semibold mb-2">Portfolio Allocation</h2>
          <p className="text-xs text-slate-600 dark:text-white/60 mb-4">
            {latest.month} · Total: <span className="font-semibold text-gold-500 dark:text-gold-400">{formatIdr(latest.total)}</span>
          </p>
          {donutData ? (
            <div className="relative h-72">
              <Doughnut data={donutData} options={donutOptions} />
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">No breakdown data available.</p>
          )}
        </div>

        {/* Investment Metrics */}
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-lg font-semibold mb-4">Investment Details</h2>
          {metrics.length > 0 ? (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {metrics.map((m) => (
                <div
                  key={m.key}
                  className="p-3 rounded-lg border border-slate-200 dark:border-white/[0.06] hover:bg-slate-100 dark:bg-white/[0.04] transition"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="inline-block w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[metrics.indexOf(m) % COLORS.length] }}
                    />
                    <span className="text-sm font-semibold truncate">{m.key}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Value</span>
                    <span className="font-bold">{formatIdr(m.value)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Allocation</span>
                    <span className="font-medium">{m.pct}%</span>
                  </div>
                  {m.changePct != null && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">MoM Change</span>
                      <span className={`font-semibold ${m.change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {m.change >= 0 ? '+' : ''}{formatIdr(m.change)} ({m.change >= 0 ? '+' : ''}{m.changePct}%)
                      </span>
                    </div>
                  )}
                  {m.key === 'Saham' && dividendLens.source != null && (
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-white/[0.06] space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">TTM Yield</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {dividendLens.ttmYieldPct != null ? `${fmtPct1(dividendLens.ttmYieldPct)}%` : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          Dividend / yr
                          {dividendLens.source === 'manual' && (
                            <span className="ml-1 text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400">(manual estimate)</span>
                          )}
                        </span>
                        <span className="font-semibold">
                          {dividendLens.projectedAnnualDividend != null ? formatIdr(dividendLens.projectedAnnualDividend) : '-'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">No breakdown data available.</p>
          )}
        </div>
      </div>

      {/* Stacked bar: composition trend over time */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4">Composition Trend</h2>
        <div className="relative h-80">
          <Bar data={barData} options={barOptions} />
        </div>
      </div>
    </div>
  );
}
