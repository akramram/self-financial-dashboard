import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, TrendingDown, Scale, Landmark, CircleDollarSign } from 'lucide-react';
import {
  buildRealValueReport,
  REAL_VALUE_REF_AMOUNT,
  type RealValueRow,
} from '../lib/real-value-engine';

function compactIdr(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}Rp${(abs / 1_000_000_000).toFixed(1).replace('.', ',')}M`;
  if (abs >= 1_000_000) return `${sign}Rp${(abs / 1_000_000).toFixed(1).replace('.', ',')}jt`;
  if (abs >= 1_000) return `${sign}Rp${Math.round(abs / 1_000)}rb`;
  return `${sign}Rp${Math.round(abs)}`;
}

function shortMonth(start: string): string {
  const m = Number(start.slice(5, 7));
  return ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][m - 1] || start.slice(0, 7);
}

const PRESETS = [2, 3.5, 5];
const BAR_MAX_H = 110;

const TONE_STYLES: Record<string, string> = {
  good: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warn: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  bad: 'bg-red-500/10 text-red-700 dark:text-red-300',
  flat: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
};

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

function SurplusBars({ points }: { points: { period_id: number; label: string; realSurplus: number; nominalSurplus: number }[] }) {
  const max = Math.max(1, ...points.map((p) => Math.abs(p.realSurplus)));
  if (points.length === 0) {
    return <p className="text-sm text-slate-600 dark:text-white/50 py-6 text-center">Belum ada periode untuk dibandingkan.</p>;
  }
  return (
    <div className="flex items-end gap-1.5 overflow-x-auto pb-1" role="img" aria-label="Surplus riil per periode dalam rupiah hari ini">
      {points.map((p) => {
        const h = Math.max(3, (Math.abs(p.realSurplus) / max) * BAR_MAX_H);
        return (
          <div key={p.period_id} className="flex flex-col items-center gap-1 min-w-[26px]">
            <div
              className={`w-4 rounded-t ${p.realSurplus >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
              style={{ height: h }}
              title={`${p.label}: riil ${compactIdr(p.realSurplus)}, nominal ${compactIdr(p.nominalSurplus)}`}
            />
            <span className="text-[10px] text-slate-600 dark:text-white/50">{p.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function RealValueHub() {
  const [rows, setRows] = useState<RealValueRow[] | null>(null);
  const [anchorDate, setAnchorDate] = useState<string>('');
  const [ratePct, setRatePct] = useState(3.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = () => {
    setError(null);
    setLoading(true);
    fetch('/api/real-value')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('fail'))))
      .then((data: { rows: RealValueRow[] }) => {
        if (!mounted.current) return;
        setRows(data.rows || []);
        setAnchorDate(new Date().toISOString().slice(0, 10));
        setLoading(false);
      })
      .catch(() => {
        if (!mounted.current) return;
        setError('Gagal memuat data nilai riil. Coba lagi.');
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  // Hooks before any early return (rules of hooks): compute with safe defaults.
  const report = useMemo(
    () => (rows && anchorDate ? buildRealValueReport(rows, ratePct, anchorDate) : null),
    [rows, anchorDate, ratePct]
  );

  if (loading && rows === null) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center" data-testid="rv-loading">
        <RefreshCw className="w-6 h-6 mx-auto animate-spin text-slate-500 dark:text-white/50" aria-hidden="true" />
        <p className="mt-2 text-sm text-slate-600 dark:text-white/50">Menghitung daya beli historis...</p>
      </div>
    );
  }

  if (error && rows === null) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center space-y-3" data-testid="rv-error">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <Button onClick={load} variant="outline" size="sm">Coba lagi</Button>
      </div>
    );
  }

  if (!report || report.points.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center" data-testid="rv-empty">
        <p className="text-sm text-slate-600 dark:text-white/50">
          Belum ada data periode. Mulai catat transaksi, lalu nilai riil terisi otomatis.
        </p>
      </div>
    );
  }

  const fmtPct = (v: number | null) => (v === null ? 'N/A' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`);
  const verdict = report.verdict;
  const surplusPoints = report.points.map((p) => ({
    period_id: p.period_id,
    label: shortMonth(p.start_date),
    realSurplus: p.realSurplus,
    nominalSurplus: p.income - p.outcome,
  }));
  const deficitCount = surplusPoints.filter((p) => p.realSurplus < 0).length;

  return (
    <div className="space-y-5" data-testid="rv-hub">
      {/* Rate control */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="w-5 h-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            <p className="font-semibold text-slate-900 dark:text-white">Asumsi Inflasi Tahunan</p>
            <span className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{ratePct.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setRatePct(p)}
                aria-pressed={ratePct === p}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  ratePct === p
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/70 hover:bg-slate-300 dark:hover:bg-white/20'
                }`}
              >
                {p.toFixed(1)}%
              </button>
            ))}
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={10}
          step={0.1}
          value={ratePct}
          onChange={(e) => setRatePct(Number(e.target.value))}
          className="w-full mt-3 accent-emerald-600"
          aria-label="Asumsi inflasi tahunan dalam persen"
        />
        <p className="mt-1.5 text-[11px] text-slate-600 dark:text-white/50">
          Semua angka di halaman ini adalah uang hari ini: nominal lama dibagi faktor inflasi {ratePct.toFixed(1)}% per tahun sejak {report.anchorDate}.
        </p>
      </div>

      {/* Verdict hero */}
      {verdict && (
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-slate-600 dark:text-white/50" aria-hidden="true" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-white/50">Kesimpulan Daya Beli</p>
          </div>
          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-bold ${TONE_STYLES[verdict.tone]}`}>
            {verdict.label}
          </span>
          <p className="mt-2 text-sm text-slate-600 dark:text-white/60 max-w-xl">{verdict.blurb}</p>
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={<TrendingUp className="w-4 h-4" aria-hidden="true" />}
          label="Inflasi Kumulatif"
          value={`+${report.cumulativeInflationPct.toFixed(1)}%`}
          sub={`sejak ${report.points[0].month} (${shortMonth(report.points[0].start_date)} ${report.points[0].start_date.slice(0, 4)})`}
        />
        <KpiCard
          icon={<Landmark className="w-4 h-4" aria-hidden="true" />}
          label="Perubahan Gaji Riil"
          value={fmtPct(report.incomeRealChangePct)}
          sub={`${report.points[0].month} vs ${report.points[report.points.length - 1].month}, uang hari ini`}
        />
        <KpiCard
          icon={<TrendingDown className="w-4 h-4" aria-hidden="true" />}
          label="Perubahan Belanja Riil"
          value={fmtPct(report.outcomeRealChangePct)}
          sub="pengeluaran kas dikoreksi inflasi"
        />
        <KpiCard
          icon={<Scale className="w-4 h-4" aria-hidden="true" />}
          label="Surplus Riil Terakhir"
          value={compactIdr(report.latestRealSurplus)}
          sub={`rata-rata ${compactIdr(report.avgRealSurplus)}/periode`}
        />
      </div>

      {/* Erosion callout */}
      {report.refErosion && report.cumulativeInflationPct > 0 && (
        <div className="glass-card rounded-2xl p-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="text-sm text-slate-700 dark:text-white/70">
            {compactIdr(REAL_VALUE_REF_AMOUNT)} yang dibelanjakan pada {report.refErosion.label} setara{' '}
            <span className="font-bold tabular-nums text-slate-900 dark:text-white">{compactIdr(report.refErosion.worthNow)}</span>{' '}
            hari ini.
          </p>
          <p className="text-[11px] text-slate-600 dark:text-white/50">
            Daya beli rupiah tergerus {report.cumulativeInflationPct.toFixed(1)}% pada asumsi {ratePct.toFixed(1)}% per tahun.
          </p>
        </div>
      )}

      {/* Real surplus bars */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-slate-900 dark:text-white">Surplus Riil per Periode</p>
          <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-white/50">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" aria-hidden="true" /> Surplus</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" aria-hidden="true" /> Defisit</span>
          </div>
        </div>
        <SurplusBars points={surplusPoints} />
        <p className="mt-3 text-xs text-slate-600 dark:text-white/50">
          {deficitCount > 0
            ? `${deficitCount} dari ${surplusPoints.length} periode defisit setelah dikoreksi inflasi. Arahkan kursor ke batang untuk bandingkan nominal.`
            : 'Semua periode surplus dalam uang hari ini. Arahkan kursor ke batang untuk bandingkan nominal.'}
        </p>
      </div>
    </div>
  );
}
