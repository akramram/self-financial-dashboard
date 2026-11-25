import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sparkles, RefreshCw, TrendingDown, Wallet, Percent,
  Trophy, Crown, PiggyBank, Receipt,
} from 'lucide-react';
import { formatIdr } from '../lib/utils';
import type { RewindReport, RewindMonthly } from '../lib/rewind-analytics';

function compactIdr(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}Rp${(abs / 1_000_000_000).toFixed(1).replace('.', ',')}M`;
  if (abs >= 1_000_000) return `${sign}Rp${(abs / 1_000_000).toFixed(1).replace('.', ',')}jt`;
  if (abs >= 1_000) return `${sign}Rp${Math.round(abs / 1_000)}rb`;
  return `${sign}Rp${Math.round(abs)}`;
}

const MONTHLY_BAR_MAX_H = 120;

function MonthlyBars({ monthly }: { monthly: RewindMonthly[] }) {
  const max = Math.max(1, ...monthly.map((m) => Math.max(m.income, m.outcome)));
  if (monthly.length === 0) {
    return <p className="text-sm text-slate-600 dark:text-white/50 py-6 text-center">Belum ada periode untuk tahun ini.</p>;
  }
  return (
    <div className="flex items-end gap-2 overflow-x-auto pb-1" role="img" aria-label="Perbandingan pemasukan dan pengeluaran per periode">
      {monthly.map((m) => (
        <div key={m.period_id} className="flex flex-col items-center gap-1 min-w-[34px]">
          <div className="flex items-end gap-0.5" style={{ height: MONTHLY_BAR_MAX_H }}>
            <div
              className="w-3.5 rounded-t bg-emerald-500"
              style={{ height: Math.max(3, (m.income / max) * MONTHLY_BAR_MAX_H) }}
              title={`Masuk ${compactIdr(m.income)}`}
            />
            <div
              className="w-3.5 rounded-t bg-rose-500"
              style={{ height: Math.max(3, (m.outcome / max) * MONTHLY_BAR_MAX_H) }}
              title={`Keluar ${compactIdr(m.outcome)}`}
            />
          </div>
          <span className="text-[10px] text-slate-600 dark:text-white/50">{m.month}</span>
        </div>
      ))}
    </div>
  );
}

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center gap-2 text-slate-600 dark:text-white/50">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-1.5 text-xl font-bold tabular-nums text-slate-900 dark:text-white">{value}</p>
      {sub && <p className="text-[11px] text-slate-600 dark:text-white/50 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function RewindHub() {
  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [report, setReport] = useState<RewindReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = (targetYear?: number | null) => {
    setError(null);
    if (targetYear == null) setLoading(true);
    const q = targetYear != null ? `?year=${targetYear}` : '';
    fetch(`/api/rewind${q}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Gagal memuat data rewind'))))
      .then((data: { years: number[]; report: RewindReport | null }) => {
        if (!mounted.current) return;
        setYears(data.years || []);
        setReport(data.report);
        if (data.report) setYear(data.report.year);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted.current) return;
        setError('Gagal memuat data rewind. Coba lagi.');
        setLoading(false);
      });
  };

  useEffect(() => {
    load(null);
  }, []);

  const onYearChange = (v: string) => {
    const y = Number(v);
    setYear(y);
    load(y);
  };

  if (loading && report === null) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center" data-testid="rewind-loading">
        <RefreshCw className="w-6 h-6 mx-auto animate-spin text-slate-500 dark:text-white/50" aria-hidden="true" />
        <p className="mt-2 text-sm text-slate-600 dark:text-white/50">Merangkum perjalanan setahun...</p>
      </div>
    );
  }

  if (error && report === null) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center space-y-3" data-testid="rewind-error">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <Button onClick={() => load(year)} variant="outline" size="sm">Coba lagi</Button>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center" data-testid="rewind-empty">
        <p className="text-sm text-slate-600 dark:text-white/50">
          Belum ada data periode untuk direkap. Mulai catat transaksi, lalu rewind akan terisi otomatis.
        </p>
      </div>
    );
  }

  const savingsLabel = Number.isFinite(report.savingsRatePct) ? `${report.savingsRatePct.toFixed(1)}%` : 'N/A';
  const nwGrowth =
    report.networthGrowthPct !== null
      ? `${report.networthGrowthPct >= 0 ? '+' : ''}${report.networthGrowthPct.toFixed(1)}%`
      : 'N/A';

  return (
    <div className="space-y-5" data-testid="rewind-hub">
      {/* Year selector */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Rewind {report.year}</h2>
        </div>
        {years.length > 1 && (
          <Select value={String(report.year)} onValueChange={onYearChange}>
            <SelectTrigger className="w-[120px]" aria-label="Pilih tahun"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Personality hero */}
      {report.personality && (
        <div className="glass-card rounded-2xl p-5 bg-gradient-to-br from-emerald-500/10 to-sky-500/10">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-white/50">Persona Keuangan {report.year}</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{report.personality.label}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-white/60 max-w-xl">{report.personality.blurb}</p>
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={<Wallet className="w-4 h-4" aria-hidden="true" />}
          label="Total Pemasukan"
          value={compactIdr(report.totalIncome)}
          sub={`${report.monthsActive} periode gaji`}
        />
        <KpiCard
          icon={<TrendingDown className="w-4 h-4" aria-hidden="true" />}
          label="Total Keluar"
          value={compactIdr(report.totalOutcome)}
          sub={`Rata-rata ${compactIdr(report.avgMonthlyOutcome)}/periode`}
        />
        <KpiCard
          icon={<Percent className="w-4 h-4" aria-hidden="true" />}
          label="Savings Rate"
          value={savingsLabel}
          sub={report.investTotal > 0 ? `Invest ${report.investSharePct.toFixed(0)}% dari keluar` : undefined}
        />
        <KpiCard
          icon={<PiggyBank className="w-4 h-4" aria-hidden="true" />}
          label="Net Worth"
          value={report.networthEnd !== null ? compactIdr(report.networthEnd) : 'N/A'}
          sub={report.networthGrowthPct !== null ? `${nwGrowth} dari awal tahun` : 'Data belum lengkap'}
        />
      </div>

      {/* Monthly rhythm */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-slate-900 dark:text-white">Ritme Bulanan</p>
          <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-white/50">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" aria-hidden="true" /> Masuk</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500" aria-hidden="true" /> Keluar</span>
          </div>
        </div>
        <MonthlyBars monthly={report.monthly} />
        {report.heaviest && report.lightest && report.heaviest.period_id !== report.lightest.period_id && (
          <p className="mt-3 text-xs text-slate-600 dark:text-white/50">
            Terberat <span className="font-semibold text-slate-800 dark:text-white/80">{report.heaviest.month}</span> ({compactIdr(report.heaviest.outcome)}), paling ringan <span className="font-semibold text-slate-800 dark:text-white/80">{report.lightest.month}</span> ({compactIdr(report.lightest.outcome)}).
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top categories */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <p className="font-semibold text-slate-900 dark:text-white">5 Kategori Terbesar</p>
          </div>
          {report.topCategories.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-white/50 py-4 text-center">Belum ada pengeluaran tercatat tahun ini.</p>
          ) : (
            <div className="space-y-2.5">
              {report.topCategories.map((c) => (
                <div key={c.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-800 dark:text-white/80 truncate pr-2">{c.name}</span>
                    <span className="tabular-nums text-slate-600 dark:text-white/50 shrink-0">{compactIdr(c.total)} · {c.pct.toFixed(0)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(2, c.pct)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fun stats */}
        <div className="glass-card rounded-2xl p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
            <p className="font-semibold text-slate-900 dark:text-white">Sorotan Tahun Ini</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[11px] text-slate-600 dark:text-white/50">Transaksi tercatat</p>
              <p className="font-bold tabular-nums text-slate-900 dark:text-white">{report.txCount}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-600 dark:text-white/50">Investasi teralokasi</p>
              <p className="font-bold tabular-nums text-slate-900 dark:text-white">{compactIdr(report.investTotal)}</p>
            </div>
          </div>
          {report.biggestTx ? (
            <div className="rounded-xl bg-slate-100 dark:bg-white/5 p-3">
              <p className="text-[11px] text-slate-600 dark:text-white/50">Transaksi terbesar</p>
              <p className="font-semibold text-slate-900 dark:text-white truncate">{report.biggestTx.title}</p>
              <p className="text-sm tabular-nums text-slate-600 dark:text-white/50">
                {formatIdr(report.biggestTx.amount)} · {report.biggestTx.category || 'Tanpa Kategori'}{report.biggestTx.month ? ` · ${report.biggestTx.month}` : ''}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-600 dark:text-white/50">Belum ada transaksi selesai untuk sorotan.</p>
          )}
        </div>
      </div>
    </div>
  );
}
