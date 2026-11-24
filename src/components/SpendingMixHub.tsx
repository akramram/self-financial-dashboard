import React, { useState, useEffect, useMemo } from 'react';
import { formatIdr } from '../lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import {
  Repeat,
  Zap,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  ShieldCheck,
  Sliders,
  Layers,
  Search,
  AlertTriangle,
  Flame,
  CheckCircle2,
  PieChart as PieIcon,
  HelpCircle,
} from 'lucide-react';
import {
  calculateAgilityScore,
  detectCostCreep,
  simulateDiscretionaryCut,
  categorizeDiscretionaryElasticity,
} from '../lib/spending-mix-engine';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler
);

interface BreakdownPeriod {
  period_id: number;
  month: string;
  recurring: number;
  discretionary: number;
  total: number;
  recurring_pct: number;
  discretionary_pct: number;
  recurring_count: number;
  discretionary_count: number;
}

interface TopItem {
  title: string;
  category: string;
  amount: number;
}

interface CategoryShare {
  category: string;
  amount: number;
  pct: number;
}

interface TxItem {
  id: number;
  title: string;
  category: string;
  amount: number;
  is_recurring: boolean;
  date: string;
}

interface BreakdownData {
  periods: BreakdownPeriod[];
  current: BreakdownPeriod | null;
  topRecurring: TopItem[];
  topDiscretionary?: TopItem[];
  discretionaryCategories?: CategoryShare[];
  recurringCategories?: CategoryShare[];
  periodTransactions?: TxItem[];
}

export default function SpendingMixHub() {
  const [data, setData] = useState<BreakdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'simulation' | 'elasticity' | 'audit'>('overview');

  // Simulation state
  const [cutSlider, setCutSlider] = useState<number>(30);

  // Audit tab search & filter
  const [auditFilter, setAuditFilter] = useState<'all' | 'recurring' | 'discretionary'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    const param = selectedPeriodId !== 'all' ? `?period_id=${selectedPeriodId}` : '';
    fetch(`/api/recurring-breakdown${param}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (d.error) {
          setError(d.error);
        } else {
          setData(d);
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [selectedPeriodId]);

  // Derived periods list for dropdown
  const periodsList = useMemo(() => {
    return data?.periods ? [...data.periods].reverse() : [];
  }, [data]);

  // Active current period
  const currentPeriod = useMemo(() => {
    if (!data) return null;
    if (selectedPeriodId !== 'all') {
      const pid = parseInt(selectedPeriodId, 10);
      return data.periods.find((p) => p.period_id === pid) || data.current;
    }
    return data.current;
  }, [data, selectedPeriodId]);

  // Engine analytics
  const agilityScore = useMemo(() => {
    const recPct = currentPeriod?.recurring_pct ?? 0;
    return calculateAgilityScore(recPct);
  }, [currentPeriod]);

  const costCreep = useMemo(() => {
    return detectCostCreep(data?.periods || []);
  }, [data]);

  const simulation = useMemo(() => {
    const disc = currentPeriod?.discretionary || 0;
    const rec = currentPeriod?.recurring || 0;
    return simulateDiscretionaryCut(disc, rec, cutSlider);
  }, [currentPeriod, cutSlider]);

  const elasticity = useMemo(() => {
    const cats = data?.discretionaryCategories || [];
    return categorizeDiscretionaryElasticity(cats);
  }, [data]);

  // Donut chart data
  const donutData = useMemo(() => {
    if (!currentPeriod || currentPeriod.total === 0) return null;
    return {
      labels: ['Komitmen Tetap (Recurring)', 'Belanja Fleksibel (Discretionary)'],
      datasets: [
        {
          data: [currentPeriod.recurring, currentPeriod.discretionary],
          backgroundColor: ['rgba(59, 130, 246, 0.85)', 'rgba(16, 185, 129, 0.85)'],
          borderColor: ['rgba(59, 130, 246, 1)', 'rgba(16, 185, 129, 1)'],
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    };
  }, [currentPeriod]);

  // Multi-period trajectory chart data
  const trajectoryChartData = useMemo(() => {
    if (!data || data.periods.length < 2) return null;
    return {
      labels: data.periods.map((p) => p.month),
      datasets: [
        {
          label: 'Komitmen Tetap %',
          data: data.periods.map((p) => p.recurring_pct),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.12)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: 'y',
        },
        {
          label: 'Belanja Fleksibel %',
          data: data.periods.map((p) => p.discretionary_pct),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: 'y',
        },
      ],
    };
  }, [data]);

  // Filtered transactions for audit tab
  const filteredTxs = useMemo(() => {
    const txs = data?.periodTransactions || [];
    return txs.filter((tx) => {
      if (auditFilter === 'recurring' && !tx.is_recurring) return false;
      if (auditFilter === 'discretionary' && tx.is_recurring) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (tx.title || '').toLowerCase().includes(q);
        const matchCat = (tx.category || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCat) return false;
      }
      return true;
    });
  }, [data, auditFilter, searchQuery]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 dark:text-slate-400 animate-pulse text-sm">
          Memuat Spending Mix & Agility Hub...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500 font-medium">Gagal memuat data: {error}</div>
      </div>
    );
  }

  if (!data || data.periods.length === 0 || !currentPeriod) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
        <Layers className="w-12 h-12 text-slate-400 dark:text-slate-500 mb-3" />
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Belum Ada Data Pengeluaran</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mt-1">
          Catat transaksi dan atur template berulang untuk melihat analisa struktur biaya dan ketangkasan finansial Anda.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Period Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-500" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Spending Mix & Agility Hub
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Analisis proporsi biaya tetap versus fleksibel, skor ketangkasan finansial, dan simulasi pemangkasan darurat.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={selectedPeriodId} onValueChange={(val) => setSelectedPeriodId(val)}>
            <SelectTrigger className="w-full sm:w-[220px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <SelectValue placeholder="Pilih Periode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Periode (Terbaru)</SelectItem>
              {periodsList.map((p) => (
                <SelectItem key={p.period_id} value={p.period_id.toString()}>
                  {p.month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Agility Score */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Skor Ketangkasan
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {agilityScore.score}
              </span>
              <span className="text-xs text-slate-400">/ 100</span>
            </div>
          </div>
          <div className="mt-4">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${agilityScore.badgeClass}`}
            >
              {agilityScore.title}
            </span>
          </div>
        </div>

        {/* Card 2: Discretionary Spending */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Belanja Fleksibel
              </span>
              <Zap className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatIdr(currentPeriod.discretionary)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {currentPeriod.discretionary_pct}% dari total · {currentPeriod.discretionary_count} transaksi
              </div>
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-400">
            Dapat dipotong langsung saat krisis
          </div>
        </div>

        {/* Card 3: Recurring Commitments */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Komitmen Tetap
              </span>
              <Repeat className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatIdr(currentPeriod.recurring)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {currentPeriod.recurring_pct}% dari total · {currentPeriod.recurring_count} transaksi
              </div>
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-400">
            Biaya wajib & langganan terikat
          </div>
        </div>

        {/* Card 4: Cost Creep Status */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tren Biaya Tetap
              </span>
              {costCreep.direction === 'creeping' ? (
                <TrendingUp className="w-4 h-4 text-amber-500" />
              ) : costCreep.direction === 'improving' ? (
                <TrendingDown className="w-4 h-4 text-emerald-500" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <div className="mt-3">
              <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {costCreep.label}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {costCreep.deltaPct > 0 ? `+${costCreep.deltaPct}%` : `${costCreep.deltaPct}%`} pergeseran rata-rata
              </div>
            </div>
          </div>
          <div className="mt-4">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${costCreep.badgeClass}`}
            >
              {costCreep.direction === 'creeping'
                ? 'Waspada Inflasi Biaya'
                : costCreep.direction === 'improving'
                ? 'Efisiensi Bagus'
                : 'Proporsi Terkendali'}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-slate-50/50 dark:bg-slate-900/40'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <PieIcon className="w-4 h-4" />
          Struktur Biaya & Tren
        </button>
        <button
          onClick={() => setActiveTab('simulation')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'simulation'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-slate-50/50 dark:bg-slate-900/40'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Simulasi Survival Mode
        </button>
        <button
          onClick={() => setActiveTab('elasticity')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'elasticity'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-slate-50/50 dark:bg-slate-900/40'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          Elastisitas Belanja Variabel
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'audit'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-slate-50/50 dark:bg-slate-900/40'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Search className="w-4 h-4" />
          Audit Transaksi
        </button>
      </div>

      {/* TAB 1: OVERVIEW & TRENDS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Donut Chart */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-emerald-500" />
                  Rasio Pengeluaran Periode Ini
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {currentPeriod.month} · Total Pengeluaran {formatIdr(currentPeriod.total)}
                </p>
              </div>

              {donutData ? (
                <div className="relative max-w-[280px] mx-auto my-6" style={{ height: 260 }}>
                  <Doughnut
                    data={donutData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '72%',
                      plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 12 } } },
                        tooltip: {
                          callbacks: {
                            label: (ctx) => {
                              const val = ctx.parsed || 0;
                              const pct = currentPeriod.total > 0 ? ((val / currentPeriod.total) * 100).toFixed(1) : '0';
                              return ` ${ctx.label}: ${formatIdr(val)} (${pct}%)`;
                            },
                          },
                        },
                      },
                    }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                    <span className="text-xs text-slate-400">Total Spend</span>
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      {formatIdr(currentPeriod.total)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-56 flex items-center justify-center text-slate-400 text-sm">
                  Tidak ada data untuk periode ini
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
                  <div>
                    <div className="text-slate-400">Tetap: {currentPeriod.recurring_pct}%</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{formatIdr(currentPeriod.recurring)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <div className="text-slate-400">Fleksibel: {currentPeriod.discretionary_pct}%</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{formatIdr(currentPeriod.discretionary)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Trajectory History Chart */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  Lintasan Proporsi Antar Periode
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Tren persentase komitmen tetap versus belanja fleksibel dari waktu ke waktu
                </p>
              </div>

              {trajectoryChartData ? (
                <div className="my-4" style={{ height: 260 }}>
                  <Line
                    data={trajectoryChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          min: 0,
                          max: 100,
                          ticks: { callback: (v) => `${v}%` },
                          grid: { color: 'rgba(150, 150, 150, 0.1)' },
                        },
                        x: {
                          grid: { display: false },
                        },
                      },
                      plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 12 } } },
                      },
                    }}
                  />
                </div>
              ) : (
                <div className="h-56 flex items-center justify-center text-slate-400 text-sm">
                  Dibutuhkan minimal 2 periode data
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                {costCreep.detail}
              </div>
            </div>
          </div>

          {/* Operating Leverage Insight Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-transparent border border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Prinsip Ketangkasan Operasional (Operating Leverage)
                </h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl">
                Semakin rendah porsi komitmen tetap (di bawah 40%), semakin tinggi daya lentur finansial Anda.
                Saat terjadi penurunan pemasukan, Anda dapat memangkas belanja fleksibel tanpa harus memutus kontrak atau langganan darurat.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('simulation')}
              className="shrink-0 text-xs bg-white dark:bg-slate-900"
            >
              Coba Simulasi Darurat
            </Button>
          </div>
        </div>
      )}

      {/* TAB 2: SURVIVAL MODE SIMULATION */}
      {activeTab === 'simulation' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Kalkulator Pemangkasan Belanja Darurat
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Simulasikan berapa dana tunai yang seketika terbebas jika Anda memotong pengeluaran variabel (makan luar, belanja, hiburan).
              </p>
            </div>

            {/* Slider Control */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Persentase Pemangkasan Belanja Variabel:
                </span>
                <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                  {cutSlider}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={cutSlider}
                onChange={(e) => setCutSlider(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
              />

              {/* Quick Presets */}
              <div className="flex items-center gap-2 flex-wrap pt-2">
                <span className="text-xs text-slate-400">Preset Cepat:</span>
                <button
                  type="button"
                  onClick={() => setCutSlider(25)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition ${
                    cutSlider === 25
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  25% (Pangkas Ringan)
                </button>
                <button
                  type="button"
                  onClick={() => setCutSlider(50)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition ${
                    cutSlider === 50
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  50% (Hemat Ketat)
                </button>
                <button
                  type="button"
                  onClick={() => setCutSlider(75)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition ${
                    cutSlider === 75
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  75% (Survival Frugal)
                </button>
                <button
                  type="button"
                  onClick={() => setCutSlider(100)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition ${
                    cutSlider === 100
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  100% (Lockdown Belanja)
                </button>
              </div>
            </div>

            {/* Simulation Results Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <span className="text-xs text-slate-500 dark:text-slate-400">Dana Bebas per Bulan</span>
                <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  +{formatIdr(simulation.monthlyFreed)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Langsung dapat dialihkan ke dana darurat atau tabungan investasi.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
                <span className="text-xs text-slate-500 dark:text-slate-400">Proyeksi Bebas per Tahun</span>
                <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  +{formatIdr(simulation.annualizedFreed)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Potensi akumulasi modal tambahan dalam 12 bulan penuh.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5">
                <span className="text-xs text-slate-500 dark:text-slate-400">Total Belanja Baru</span>
                <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                  {formatIdr(simulation.newTotalSpending)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Rasio tetap baru: {simulation.newRecurringPct}% · Variabel baru: {simulation.newDiscretionaryPct}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ELASTICITY BREAKDOWN */}
      {activeTab === 'elasticity' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Profil Elastisitas Belanja Variabel
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Mengelompokkan pos belanja fleksibel ke dalam 3 tier elastisitas untuk menentukan prioritas penghematan.
              </p>
            </div>

            {/* 3 Tier Summary Progress Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <span>Sangat Elastis</span>
                  <span>{elasticity.elasticSharePct}%</span>
                </div>
                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                  {formatIdr(elasticity.elasticTotal)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Belanja online, cafe, hobi, hiburan (mudah dipotong 100%).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-700 dark:text-blue-400">
                  <span>Semi-Elastis</span>
                  <span>{elasticity.semiElasticSharePct}%</span>
                </div>
                <div className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-1">
                  {formatIdr(elasticity.semiElasticTotal)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Makan di luar, transport, belanja umum (bisa dikurangi 30-50%).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center justify-between text-xs font-semibold text-purple-700 dark:text-purple-400">
                  <span>Variabel Esensial</span>
                  <span>{elasticity.essentialSharePct}%</span>
                </div>
                <div className="text-lg font-bold text-purple-700 dark:text-purple-300 mt-1">
                  {formatIdr(elasticity.essentialTotal)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Groceries dasar, obat/kesehatan (fluktuatif tapi prioritas hidup).
                </p>
              </div>
            </div>

            {/* Category breakdown table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                    <TableHead>Kategori</TableHead>
                    <TableHead>Klasifikasi Elastisitas</TableHead>
                    <TableHead className="text-right">Porsi (%)</TableHead>
                    <TableHead className="text-right">Total Belanja</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {elasticity.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-slate-400 text-xs">
                        Tidak ada kategori variabel pada periode ini
                      </TableCell>
                    </TableRow>
                  ) : (
                    elasticity.items.map((item) => (
                      <TableRow key={item.category}>
                        <TableCell className="font-medium text-slate-900 dark:text-white">
                          {item.category}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${item.tierBadgeClass}`}
                          >
                            {item.tierLabel}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-slate-500 dark:text-slate-400">
                          {item.sharePct}%
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-slate-900 dark:text-white">
                          {formatIdr(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT & TRANSACTION EXPLORER */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Search className="w-5 h-5 text-emerald-500" />
                  Audit Transaksi: Tetap vs Fleksibel
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Menampilkan seluruh transaksi periode ini yang teridentifikasi sebagai komitmen berulang atau belanja bebas.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    placeholder="Cari transaksi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setAuditFilter('all')}
                className={`px-3 py-1.5 text-xs rounded-lg border transition ${
                  auditFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent font-medium'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                }`}
              >
                Semua Transaksi ({filteredTxs.length})
              </button>
              <button
                type="button"
                onClick={() => setAuditFilter('recurring')}
                className={`px-3 py-1.5 text-xs rounded-lg border transition ${
                  auditFilter === 'recurring'
                    ? 'bg-blue-600 text-white border-blue-600 font-medium'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                }`}
              >
                Komitmen Tetap (Recurring)
              </button>
              <button
                type="button"
                onClick={() => setAuditFilter('discretionary')}
                className={`px-3 py-1.5 text-xs rounded-lg border transition ${
                  auditFilter === 'discretionary'
                    ? 'bg-emerald-600 text-white border-emerald-600 font-medium'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                }`}
              >
                Belanja Fleksibel (Discretionary)
              </button>
            </div>

            {/* Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                    <TableHead>Judul</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Tipe Biaya</TableHead>
                    <TableHead className="text-right">Nominal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTxs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-slate-400 text-xs">
                        Tidak ada transaksi yang cocok dengan kriteria pencarian
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTxs.slice(0, 50).map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium text-slate-900 dark:text-white">
                          {tx.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {tx.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {tx.is_recurring ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              Tetap (Recurring)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Fleksibel (Discretionary)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-slate-900 dark:text-white">
                          {formatIdr(tx.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {filteredTxs.length > 50 && (
              <p className="text-xs text-center text-slate-400">
                Menampilkan 50 transaksi teratas dari total {filteredTxs.length} transaksi
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
