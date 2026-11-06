import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { formatIdr } from '../lib/utils';
import {
  RefreshCw,
  Calendar,
  TrendingDown,
  TrendingUp,
  DollarSign,
  PieChart,
  Clock,
  ArrowRight,
  Lightbulb,
  Scissors,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Search,
  Sliders,
  Wallet,
  CreditCard,
  Layers,
  Sparkles,
  ArrowUpRight,
  RotateCcw,
  Info,
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import GlassCard from '@/components/ui/glass-card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  calculateRecurringBurden,
  calculateCutBackSimulation,
  classifyRecurringCommitments,
  getTemporaryCommitmentRoadmap,
  generateAuditRecommendations,
} from '../lib/recurring-audit-engine';
import type { RecurringCostItem, RecurringCostResult } from '../lib/db';

ChartJS.register(ArcElement, Tooltip, Legend);

const PALETTE = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#d946ef', '#22c55e', '#eab308', '#64748b',
  '#a855f7', '#e11d48', '#0ea5e9',
];

function formatEndDate(endDate: string | null): string {
  if (!endDate) return 'Permanen';
  return `Hingga ${endDate}`;
}

export default function RecurringCostAnalyzer() {
  const [data, setData] = useState<RecurringCostResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'simulator' | 'table'>('overview');
  const [cutItemIds, setCutItemIds] = useState<number[]>([]);
  const [showPaused, setShowPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [annualRate, setAnnualRate] = useState<number>(7);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch('/api/recurring-cost')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Unconditional Hooks (Rules of Hooks: all hooks fired before returns) ───
  const items = useMemo(() => data?.items || [], [data]);
  const activeItems = useMemo(() => data?.activeItems || [], [data]);
  const monthlyTotal = useMemo(() => data?.monthlyTotal || 0, [data]);
  const income = useMemo(() => data?.latestIncome || 0, [data]);

  // Rasio Beban Rutin (Recurring Burden)
  const burden = useMemo(() => {
    return calculateRecurringBurden(monthlyTotal, income);
  }, [monthlyTotal, income]);

  // Simulasi Pemangkasan (Cut-Back Simulator)
  const simulation = useMemo(() => {
    return calculateCutBackSimulation(activeItems, cutItemIds, annualRate);
  }, [activeItems, cutItemIds, annualRate]);

  // Pilar Komitmen
  const pillars = useMemo(() => {
    return classifyRecurringCommitments(items);
  }, [items]);

  // Roadmap Komitmen Berjangka
  const roadmap = useMemo(() => {
    return getTemporaryCommitmentRoadmap(items);
  }, [items]);

  // Rekomendasi Cerdas
  const recommendations = useMemo(() => {
    return generateAuditRecommendations({
      monthlyTotal,
      income,
      items,
      cutBackMonthly: simulation.cutMonthly,
    });
  }, [monthlyTotal, income, items, simulation.cutMonthly]);

  // Kategori data untuk Donut Chart
  const categoryEntries = useMemo(() => {
    if (!data?.monthlyByCategory) return [];
    return Object.entries(data.monthlyByCategory).sort(([, a], [, b]) => b - a);
  }, [data]);

  const donutData = useMemo(() => {
    if (categoryEntries.length === 0) return null;
    return {
      labels: categoryEntries.map(([cat]) => cat),
      datasets: [
        {
          data: categoryEntries.map(([, amt]) => amt),
          backgroundColor: categoryEntries.map((_, i) => PALETTE[i % PALETTE.length]),
          borderColor: 'transparent',
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    };
  }, [categoryEntries]);

  // Filter tabel
  const filteredTableItems = useMemo(() => {
    let list = showPaused ? items : activeItems;

    if (filterType !== 'all') {
      list = list.filter((i) => i.type === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (i) => i.title.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
      );
    }

    return list;
  }, [items, activeItems, showPaused, filterType, searchQuery]);

  // Toggle cut item
  const toggleCutItem = (id: number) => {
    setCutItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Preset simulasi cepat
  const applyPreset = (preset: 'reset' | 'streaming' | 'temporary' | 'top3') => {
    if (preset === 'reset') {
      setCutItemIds([]);
      return;
    }

    if (preset === 'streaming') {
      const streamingIds = activeItems
        .filter((i) => {
          const t = i.title.toLowerCase();
          const c = i.category.toLowerCase();
          return (
            t.includes('youtube') ||
            t.includes('netflix') ||
            t.includes('spotify') ||
            c.includes('hiburan') ||
            c.includes('entertainment')
          );
        })
        .map((i) => i.id);
      setCutItemIds(streamingIds);
      return;
    }

    if (preset === 'temporary') {
      const tempIds = activeItems.filter((i) => i.isTemporary).map((i) => i.id);
      setCutItemIds(tempIds);
      return;
    }

    if (preset === 'top3') {
      const sorted = [...activeItems].sort((a, b) => b.amount - a.amount);
      setCutItemIds(sorted.slice(0, 3).map((i) => i.id));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Memuat data audit komitmen berulang...</p>
      </div>
    );
  }

  if (!data || items.length === 0) {
    return (
      <GlassCard className="p-8 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
          <Calendar className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Belum Ada Transaksi Berulang</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Tambahkan transaksi berulang di halaman Recurring Manager untuk menganalisis beban bulanan dan simulasi pemangkasan langganan.
        </p>
        <Button onClick={fetchData} variant="outline" className="mt-2">
          <RefreshCw className="w-4 h-4 mr-2" /> Segarkan
        </Button>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header & Nav Tabs ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>🔄</span> Recurring & Subscription Intelligence Hub
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Audit beban komitmen rutin bulanan, deteksi kebocoran kas, dan simulasi dampak pemangkasan kekayaan majemuk.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-white/10 text-xs font-medium">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'overview'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Ringkasan & Radar
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'simulator'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Scissors className="w-3.5 h-3.5 text-emerald-500" />
              Simulator Kill-Switch
              {cutItemIds.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {cutItemIds.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Daftar Komitmen ({activeItems.length})
            </button>
          </div>

          <Button
            onClick={fetchData}
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs rounded-xl"
            title="Segarkan data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ─── Top 4 KPI Metrics ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Monthly Total */}
        <GlassCard className="p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Komitmen Bulanan</span>
            <Wallet className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {formatIdr(monthlyTotal)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Tahunan: {formatIdr(data.annualTotal)}</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {data.activeCount} item aktif
            </span>
          </div>
        </GlassCard>

        {/* Card 2: Burden Ratio */}
        <GlassCard className="p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Rasio Beban Rutin</span>
            <ShieldCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {burden.ratioPct}%
            </span>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${burden.badgeBg}`}>
              {burden.statusLabel}
            </Badge>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {income > 0 ? (
              <span>dari pemasukan {formatIdr(income)}/bln</span>
            ) : (
              <span>Data pemasukan belum terekam</span>
            )}
          </div>
        </GlassCard>

        {/* Card 3: Temporary Commitments & Expiration */}
        <GlassCard className="p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Cicilan Berjangka</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {data.temporaryCount} Komitmen
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {roadmap.length > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                +{formatIdr(roadmap[roadmap.length - 1].cumulativeFreed)}/bln bebas nanti
              </span>
            ) : (
              <span>Semua komitmen bersifat permanen</span>
            )}
          </div>
        </GlassCard>

        {/* Card 4: Largest Commitment */}
        <GlassCard className="p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Item Terbesar</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
            {data.largestItem ? formatIdr(data.largestItem.amount) : 'Rp 0'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {data.largestItem ? (
              <span>
                {data.largestItem.title} ({((data.largestItem.amount / (monthlyTotal || 1)) * 100).toFixed(0)}%)
              </span>
            ) : (
              <span>Tidak ada data</span>
            )}
          </div>
        </GlassCard>
      </div>

      {/* ─── TAB CONTENT 1: OVERVIEW & RADAR ─── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Pilar Komitmen Rutin */}
          <GlassCard className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  Pilar Komitmen & Distribusi Beban Finansial
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Pengelompokan komitmen rutin ke dalam fungsi esensial, angsuran modal, dan utilitas bulanan.
                </p>
              </div>
            </div>

            {/* Segmented Bar */}
            <div className="space-y-2">
              <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                {pillars.map((pillar) => (
                  <div
                    key={pillar.key}
                    style={{
                      width: `${Math.max(2, pillar.pct)}%`,
                      backgroundColor: pillar.color,
                    }}
                    title={`${pillar.label}: ${formatIdr(pillar.amount)} (${pillar.pct}%)`}
                    className="h-full transition-all duration-300"
                  />
                ))}
              </div>

              {/* Pillars Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                {pillars.map((pillar) => (
                  <div
                    key={pillar.key}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/40 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: pillar.color }}
                        />
                        {pillar.label}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {pillar.pct}%
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {formatIdr(pillar.amount)}
                      <span className="text-[11px] font-normal text-slate-500 ml-1">/bulan</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {pillar.description} ({pillar.count} item)
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Grid: Donut Chart + Temporary Expiration Roadmap */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Category Breakdown Donut */}
            <GlassCard className="lg:col-span-5 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-blue-500" />
                Komposisi Kategori Komitmen
              </h3>

              {donutData ? (
                <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
                  <div className="w-44 h-44 shrink-0">
                    <Doughnut
                      data={donutData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => {
                                const val = ctx.parsed as number;
                                const pct = monthlyTotal > 0 ? ((val / monthlyTotal) * 100).toFixed(1) : '0';
                                return ` ${ctx.label}: ${formatIdr(val)} (${pct}%)`;
                              },
                            },
                          },
                        },
                        cutout: '68%',
                      }}
                    />
                  </div>
                  <div className="space-y-1.5 w-full text-xs">
                    {categoryEntries.slice(0, 5).map(([cat, amt], i) => {
                      const pct = monthlyTotal > 0 ? ((amt / monthlyTotal) * 100).toFixed(0) : 0;
                      return (
                        <div key={cat} className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                          <span className="flex items-center gap-1.5 truncate">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                            />
                            <span className="truncate">{cat}</span>
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white shrink-0 ml-2">
                            {formatIdr(amt)} ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Tidak ada kategori untuk ditampilkan.</p>
              )}
            </GlassCard>

            {/* Roadmap Pelepasan Kas Cicilan Berjangka */}
            <GlassCard className="lg:col-span-7 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Roadmap Pelepasan Arus Kas Cicilan
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {roadmap.length} komitmen berjangka
                </span>
              </div>

              {roadmap.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Begitu cicilan atau komitmen berjangka ini tuntas, arus kas bulanan Anda akan otomatis kembali bebas:
                  </p>
                  <div className="space-y-2.5">
                    {roadmap.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-slate-900/40 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{item.title}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 dark:text-amber-400 border-amber-500/20">
                              Berakhir {item.endDate}
                            </Badge>
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                            Alokasi saat ini: {formatIdr(item.amount)}/bulan
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] text-slate-400 block">Akumulasi Kas Bebas</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                            +{formatIdr(item.cumulativeFreed)}/bln
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  Seluruh komitmen saat ini berstatus permanen (tanpa tanggal jatuh tempo berakhir).
                </div>
              )}
            </GlassCard>
          </div>

          {/* Rekomendasi Cerdas Deterministik */}
          <GlassCard className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Insight & Rekomendasi Audit Finansial
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    {rec.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                    {rec.type === 'warning' && <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />}
                    {rec.type === 'info' && <Info className="w-4 h-4 text-blue-500 shrink-0" />}
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{rec.title}</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {rec.description}
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* ─── TAB CONTENT 2: SIMULATOR KILL-SWITCH ─── */}
      {activeTab === 'simulator' && (
        <div className="space-y-6">
          <GlassCard className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-emerald-500" />
                  Simulator Pemangkasan Komitmen (What-If Kill-Switch)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Centang item langganan atau pengeluaran yang ingin disimulasikan untuk dibatalkan, dan saksikan proyeksi kekayaan yang tercipta jika dana dialihkan ke investasi.
                </p>
              </div>

              {/* Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => applyPreset('streaming')}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 rounded-lg"
                >
                  Pangkas Streaming
                </Button>
                <Button
                  onClick={() => applyPreset('temporary')}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 rounded-lg"
                >
                  Simulasi Bebas Cicilan
                </Button>
                <Button
                  onClick={() => applyPreset('top3')}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 rounded-lg"
                >
                  Pangkas Top 3
                </Button>
                {cutItemIds.length > 0 && (
                  <Button
                    onClick={() => applyPreset('reset')}
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8 text-rose-500 hover:text-rose-600"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Live Impact KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-1">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 block">
                  Kas Bulanan Terbebas
                </span>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  +{formatIdr(simulation.cutMonthly)}
                </div>
                <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                  Penghematan tahunan: {formatIdr(simulation.cutAnnual)} ({simulation.savingsPct}% dari total)
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/40 space-y-1">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                  Sisa Komitmen Rutin
                </span>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {formatIdr(simulation.newMonthly)}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Sisa tahunan: {formatIdr(simulation.newAnnual)}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 space-y-1">
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 block">
                  Rasio Beban Baru
                </span>
                <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                  {income > 0 ? ((simulation.newMonthly / income) * 100).toFixed(1) : 0}%
                </div>
                <div className="text-[11px] text-blue-700/80 dark:text-blue-400/80">
                  Turun dari semula {burden.ratioPct}% ({simulation.cutCount} item terpilih)
                </div>
              </div>
            </div>

            {/* 5-Year Compounded Wealth Projection (The Subscription Multiplier Engine) */}
            <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/40 dark:bg-slate-900/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Efek Pengganda Kekayaan 5 Tahun (The Subscription Multiplier)
                  </h4>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Asumsi Imbal Hasil:</span>
                  <select
                    value={annualRate}
                    onChange={(e) => setAnnualRate(Number(e.target.value))}
                    className="h-7 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value={5}>5% p.a. (Obligasi/Pasar Uang)</option>
                    <option value={7}>7% p.a. (Reksadana Campuran)</option>
                    <option value={10}>10% p.a. (Saham / Indeks Pasar)</option>
                  </select>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Jika penghematan <strong className="text-emerald-600 dark:text-emerald-400">{formatIdr(simulation.cutMonthly)}/bulan</strong> ini dialihkan rutin ke instrumen investasi majemuk:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {simulation.wealthGrowth.map((tier) => (
                  <div
                    key={tier.years}
                    className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">
                        Horizon {tier.years} Tahun
                      </span>
                      <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                        {tier.months} bulan
                      </Badge>
                    </div>

                    <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      {formatIdr(tier.total)}
                    </div>

                    <div className="space-y-1 text-[11px] pt-1 border-t border-slate-100 dark:border-white/5">
                      <div className="flex justify-between text-slate-500 dark:text-slate-400">
                        <span>Modal Pokok:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {formatIdr(tier.principal)}
                        </span>
                      </div>
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                        <span>Hasil Bunga Majemuk:</span>
                        <span>+{formatIdr(tier.growth)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Checklist Pemangkasan Langsung */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pilih Komitmen untuk Disimulasikan Diputus
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {activeItems.map((item) => {
                  const isCut = cutItemIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleCutItem(item.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isCut
                          ? 'border-rose-500/40 bg-rose-50/50 dark:bg-rose-950/20 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isCut}
                          onCheckedChange={() => toggleCutItem(item.id)}
                          className="data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
                        />
                        <div>
                          <div className={`text-xs font-semibold ${isCut ? 'line-through opacity-70' : ''}`}>
                            {item.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>{item.category}</span>
                            <span>•</span>
                            <span>{item.type === 'cash' ? 'Cash' : 'Credit'}</span>
                            {item.isTemporary && (
                              <>
                                <span>•</span>
                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                  {formatEndDate(item.end_date)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-xs font-bold ${isCut ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                          {isCut ? `-${formatIdr(item.amount)}` : formatIdr(item.amount)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {((item.amount / (monthlyTotal || 1)) * 100).toFixed(0)}% dari beban
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ─── TAB CONTENT 3: TABLE & MANAGEMENT ─── */}
      {activeTab === 'table' && (
        <GlassCard className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cari nama komitmen atau kategori..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="h-9 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white"
              >
                <option value="all">Semua Tipe</option>
                <option value="cash">Cash / Tunai</option>
                <option value="credit_expense">Credit Expense</option>
                <option value="credit_payment">Credit Payment</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPaused(!showPaused)}
                className={`h-9 text-xs rounded-xl ${showPaused ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
              >
                {showPaused ? 'Sembunyikan Jeda' : 'Tampilkan Jeda'}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 dark:bg-slate-900/50">
                  <TableHead className="w-12 text-center">Cut?</TableHead>
                  <TableHead>Nama Komitmen</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Bulanan</TableHead>
                  <TableHead className="text-right">Tahunan</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead>Durasi / Batas</TableHead>
                  <TableHead className="text-right">% Beban</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTableItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-xs text-slate-500">
                      Tidak ada transaksi berulang yang cocok dengan filter pencarian.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTableItems.map((item) => {
                    const isCut = cutItemIds.includes(item.id);
                    const pctOfTotal = monthlyTotal > 0 ? (item.amount / monthlyTotal) * 100 : 0;
                    const typeLabel =
                      item.type === 'cash' ? 'Cash' : item.type === 'credit_payment' ? 'CC Pay' : 'Credit';

                    return (
                      <TableRow
                        key={item.id}
                        className={`transition-colors ${
                          !item.active
                            ? 'opacity-50'
                            : isCut
                            ? 'bg-rose-50/40 dark:bg-rose-950/20'
                            : ''
                        }`}
                      >
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isCut}
                            disabled={!item.active}
                            onCheckedChange={() => toggleCutItem(item.id)}
                            className="data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
                          />
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900 dark:text-white">
                          <span className={isCut ? 'line-through text-slate-400' : ''}>
                            {item.title}
                          </span>
                          {!item.active && (
                            <Badge variant="outline" className="ml-2 text-[10px] py-0 h-4">
                              Paused
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400 text-xs">
                          {item.category}
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-900 dark:text-white">
                          <span className={isCut ? 'text-rose-500' : ''}>
                            {formatIdr(item.amount)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-slate-500 dark:text-slate-400 text-xs">
                          {formatIdr(item.amount * 12)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] py-0">
                            {typeLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {item.isTemporary ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              {formatEndDate(item.end_date)}
                            </span>
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400">Permanen</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-xs text-slate-600 dark:text-slate-400">
                          {pctOfTotal.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
