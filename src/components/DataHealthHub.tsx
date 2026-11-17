import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck, RefreshCw, AlertTriangle, CheckCircle2, ChevronDown, Database,
} from 'lucide-react';
import type { DiagnosticsReport, Finding, Severity } from '../lib/data-diagnostics';

const SEV_BADGE: Record<Severity, { label: string; cls: string }> = {
  high: { label: 'Tinggi', cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
  medium: { label: 'Sedang', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  low: { label: 'Rendah', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
};

const RING_R = 54;
const RING_C = 2 * Math.PI * RING_R;

function scoreColor(score: number): string {
  if (score >= 90) return '#10b981';
  if (score >= 75) return '#34d399';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function FindingCard({ f }: { f: Finding }) {
  const [open, setOpen] = useState(false);
  const sev = SEV_BADGE[f.severity];
  const hidden = f.count - f.samples.length;

  return (
    <div
      className="glass-card rounded-2xl p-4 space-y-2"
      data-testid={`finding-${f.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 dark:text-white leading-snug">{f.title}</p>
            <p className="text-xs text-slate-600 dark:text-white/50 mt-0.5">{f.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${sev.cls}`}>{sev.label}</span>
          <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{f.count}</span>
        </div>
      </div>
      <p className="text-xs text-slate-600 dark:text-white/60">
        <span className="font-medium text-slate-700 dark:text-white/70">Saran perbaikan:</span> {f.hint}
      </p>
      {f.samples.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            {open ? 'Sembunyikan contoh' : 'Lihat contoh'}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {open && (
            <ul className="mt-1.5 space-y-1 border-l-2 border-slate-200 dark:border-white/10 pl-3">
              {f.samples.map((s, i) => (
                <li key={i} className="text-xs text-slate-600 dark:text-white/50 break-words">{s}</li>
              ))}
              {hidden > 0 && (
                <li className="text-xs text-slate-500 dark:text-white/40">dan {hidden} lainnya</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function DataHealthHub() {
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = () => {
    setLoading(true);
    setError(null);
    fetch('/api/diagnostics')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Gagal memuat laporan kesehatan data'))))
      .then((data: DiagnosticsReport) => {
        if (mounted.current) setReport(data);
      })
      .catch((e: Error) => {
        if (mounted.current) setError(e.message);
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
  };

  useEffect(load, []);

  if (error) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center space-y-3" data-testid="diagnostics-error">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <Button variant="outline" size="sm" onClick={load}>Coba lagi</Button>
      </div>
    );
  }

  if (loading || !report) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center" data-testid="diagnostics-loading">
        <div className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-white/50">
          <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
          Memeriksa kesehatan data…
        </div>
      </div>
    );
  }

  const active = report.findings.filter((f) => f.count > 0);
  const healthy = report.findings.filter((f) => f.count === 0);
  const ringOffset = RING_C * (1 - report.score / 100);
  const ring = scoreColor(report.score);

  return (
    <div className="space-y-5" data-testid="diagnostics-hub">
      {/* Score hero */}
      <div className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-[132px] h-[132px] shrink-0" data-testid="diagnostics-score" role="img"
          aria-label={`Skor kesehatan data ${report.score} dari 100, status ${report.label}`}>
          <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
            <circle cx="64" cy="64" r={RING_R} fill="none" strokeWidth="10"
              className="stroke-slate-200 dark:stroke-white/10" />
            <circle cx="64" cy="64" r={RING_R} fill="none" strokeWidth="10" stroke={ring}
              strokeDasharray={RING_C} strokeDashoffset={ringOffset} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">{report.score}</span>
            <span className="text-[11px] font-medium" style={{ color: ring }}>{report.label}</span>
          </div>
        </div>
        <div className="text-center sm:text-left space-y-1.5">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Kesehatan Data</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-white/50 max-w-md">
            Pemeriksaan otomatis atas penyakit data yang dikenal: transaksi yatim, tanggal bergeser
            timezone, tagihan lampau tersembunyi, pelunasan kredit salah tipe, dan lainnya.
          </p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] px-2.5 py-1 text-slate-700 dark:text-white/70">
              <Database className="w-3.5 h-3.5" aria-hidden="true" />
              {report.totals.transactions} transaksi, {report.totals.periods} periode, {report.totals.categories} kategori
            </span>
            <Button variant="outline" size="sm" onClick={load} data-testid="diagnostics-refresh">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
              Periksa ulang
            </Button>
          </div>
        </div>
      </div>

      {/* Active findings */}
      {active.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white/80">
            Perlu Perhatian ({active.length})
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {active.map((f) => <FindingCard key={f.id} f={f} />)}
          </div>
        </section>
      ) : (
        <div className="glass-card rounded-2xl p-6 text-center space-y-1.5" data-testid="diagnostics-clean">
          <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <p className="font-semibold text-slate-900 dark:text-white">Semua pemeriksaan lolos</p>
          <p className="text-sm text-slate-600 dark:text-white/50">
            Tidak ditemukan anomali data pada 10 pemeriksaan integritas.
          </p>
        </div>
      )}

      {/* Passed checks */}
      {healthy.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white/80">Lolos</h3>
          <div className="flex flex-wrap gap-2">
            {healthy.map((f) => (
              <span key={f.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 px-2.5 py-1 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                {f.title}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
