import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { formatIdr } from '../lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PiggyBank,
  Target,
  Shield,
  Car,
  Wrench,
  Laptop,
  Plane,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  CalendarDays,
  Coins,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import {
  DEFAULT_SINKING_FUNDS,
  calculateCyclesRemaining,
  calculateMonthlyRequired,
  evaluateFundPacing,
  calculateSinkingFundsSummary,
  simulateWaterfallAllocation,
  type SinkingFund,
  type SinkingFundPriority,
  type SinkingFundCategory,
  type SinkingFundStatus,
} from '../lib/sinking-funds-engine';

const STORAGE_KEY = 'findash_sinking_funds_v1';

const ICON_OPTIONS = [
  { id: 'car', label: 'Kendaraan', icon: Car },
  { id: 'wrench', label: 'Servis / Perbaikan', icon: Wrench },
  { id: 'shield', label: 'Asuransi / Proteksi', icon: Shield },
  { id: 'vault', label: 'Buffer Kas / Darurat', icon: PiggyBank },
  { id: 'laptop', label: 'Gadget / Hardware', icon: Laptop },
  { id: 'plane', label: 'Liburan / Mudik', icon: Plane },
  { id: 'coins', label: 'Investasi / Dana', icon: Coins },
];

function getFundIcon(iconId?: string) {
  const match = ICON_OPTIONS.find((opt) => opt.id === iconId);
  if (match) {
    const IconComp = match.icon;
    return <IconComp className="w-5 h-5" />;
  }
  return <Target className="w-5 h-5" />;
}

export default function SinkingFundsHub() {
  const [funds, setFunds] = useState<SinkingFund[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedPriorityTab, setSelectedPriorityTab] = useState<'all' | SinkingFundPriority>('all');

  // Modal State untuk Tambah / Edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFundId, setEditingFundId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<SinkingFundCategory>('obligation');
  const [formPriority, setFormPriority] = useState<SinkingFundPriority>('high');
  const [formTargetAmount, setFormTargetAmount] = useState<string>('');
  const [formCurrentAmount, setFormCurrentAmount] = useState<string>('');
  const [formTargetDate, setFormTargetDate] = useState<string>('');
  const [formIcon, setFormIcon] = useState<string>('car');
  const [formNotes, setFormNotes] = useState<string>('');

  // Modal State untuk Quick Deposit (+ Setor)
  const [depositFund, setDepositFund] = useState<SinkingFund | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>('');

  // Simulator Waterfall
  const [surplusInput, setSurplusInput] = useState<number>(3000000);

  // Load dari localStorage saat mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFunds(parsed);
          setIsLoaded(true);
          return;
        }
      }
    } catch {
      // Fallback ke default jika parse gagal
    }
    setFunds(DEFAULT_SINKING_FUNDS);
    setIsLoaded(true);
  }, []);

  // Simpan ke localStorage setiap ada perubahan dana
  const updateFunds = useCallback((newFunds: SinkingFund[]) => {
    setFunds(newFunds);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newFunds));
    } catch (e) {
      console.error('Gagal menyimpan sinking funds ke localStorage:', e);
    }
  }, []);

  const handleResetDefaults = () => {
    if (confirm('Kembalikan daftar pos dana khusus ke data awal bawaan?')) {
      updateFunds(DEFAULT_SINKING_FUNDS);
    }
  };

  // Ringkasan metrik
  const summary = useMemo(() => {
    return calculateSinkingFundsSummary(funds, surplusInput);
  }, [funds, surplusInput]);

  // Evaluasi pacing untuk tiap pos
  const fundPacings = useMemo(() => {
    const map = new Map<string, ReturnType<typeof evaluateFundPacing>>();
    for (const f of funds) {
      map.set(f.id, evaluateFundPacing(f));
    }
    return map;
  }, [funds]);

  // Pos terfilter berdasarkan tab prioritas
  const filteredFunds = useMemo(() => {
    if (selectedPriorityTab === 'all') return funds;
    return funds.filter((f) => f.priority === selectedPriorityTab);
  }, [funds, selectedPriorityTab]);

  // Hasil simulasi Waterfall
  const waterfallResult = useMemo(() => {
    return simulateWaterfallAllocation(funds, surplusInput);
  }, [funds, surplusInput]);

  // Buka form tambah
  const openAddForm = () => {
    setEditingFundId(null);
    setFormName('');
    setFormCategory('obligation');
    setFormPriority('high');
    setFormTargetAmount('');
    setFormCurrentAmount('');
    setFormTargetDate('2027-06-20');
    setFormIcon('car');
    setFormNotes('');
    setIsFormOpen(true);
  };

  // Buka form edit
  const openEditForm = (fund: SinkingFund) => {
    setEditingFundId(fund.id);
    setFormName(fund.name);
    setFormCategory(fund.category);
    setFormPriority(fund.priority);
    setFormTargetAmount(fund.targetAmount.toString());
    setFormCurrentAmount(fund.currentAmount.toString());
    setFormTargetDate(fund.targetDate);
    setFormIcon(fund.icon || 'car');
    setFormNotes(fund.notes || '');
    setIsFormOpen(true);
  };

  // Simpan form (Tambah / Edit)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const targetVal = Math.max(0, parseFloat(formTargetAmount) || 0);
    const currentVal = Math.max(0, parseFloat(formCurrentAmount) || 0);

    if (editingFundId) {
      // Edit
      const updated = funds.map((f) =>
        f.id === editingFundId
          ? {
              ...f,
              name: formName.trim(),
              category: formCategory,
              priority: formPriority,
              targetAmount: targetVal,
              currentAmount: currentVal,
              targetDate: formTargetDate || '2027-12-20',
              icon: formIcon,
              notes: formNotes.trim(),
            }
          : f
      );
      updateFunds(updated);
    } else {
      // Tambah baru
      const newFund: SinkingFund = {
        id: `sf-${Date.now()}`,
        name: formName.trim(),
        category: formCategory,
        priority: formPriority,
        targetAmount: targetVal,
        currentAmount: currentVal,
        targetDate: formTargetDate || '2027-12-20',
        icon: formIcon,
        notes: formNotes.trim(),
      };
      updateFunds([...funds, newFund]);
    }
    setIsFormOpen(false);
  };

  // Hapus pos dana
  const handleDeleteFund = (id: string, name: string) => {
    if (confirm(`Hapus pos dana "${name}"?`)) {
      updateFunds(funds.filter((f) => f.id !== id));
    }
  };

  // Setor saldo (Quick Deposit)
  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositFund) return;
    const addVal = Math.max(0, parseFloat(depositAmount) || 0);
    if (addVal <= 0) return;

    const updated = funds.map((f) =>
      f.id === depositFund.id
        ? { ...f, currentAmount: f.currentAmount + addVal }
        : f
    );
    updateFunds(updated);
    setDepositFund(null);
    setDepositAmount('');
  };

  const priorityLabels: Record<SinkingFundPriority, { label: string; badge: string }> = {
    high: {
      label: 'Tier 1: Wajib',
      badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-900',
    },
    medium: {
      label: 'Tier 2: Proteksi',
      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900',
    },
    low: {
      label: 'Tier 3: Gaya Hidup',
      badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-900',
    },
  };

  const statusBadges: Record<SinkingFundStatus, { label: string; class: string }> = {
    funded: {
      label: 'Tercapai',
      class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
    },
    on_track: {
      label: 'Sesuai Target',
      class: 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400 border-teal-200 dark:border-teal-900',
    },
    needs_attention: {
      label: 'Perlu Perhatian',
      class: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900',
    },
    overdue: {
      label: 'Lewat Tenggat',
      class: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-900',
    },
  };

  return (
    <div className="space-y-6">
      {/* Kartu Ringkasan Metrik Finansial */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Terkumpul */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Dana Terkumpul
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <PiggyBank className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl font-bold tracking-tight text-foreground tabular-nums">
            {formatIdr(summary.totalSaved)}
          </div>
          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
            <span>Target:</span>
            <span className="font-semibold text-foreground tabular-nums">{formatIdr(summary.totalTarget)}</span>
            <span className="ml-auto font-medium text-emerald-600 dark:text-emerald-400">
              {summary.overallProgressPct}%
            </span>
          </div>
          <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${summary.overallProgressPct}%` }}
            />
          </div>
        </div>

        {/* Komitmen Bulanan */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Setoran Wajib / Bulan
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl font-bold tracking-tight text-foreground tabular-nums">
            {formatIdr(summary.totalMonthlyRequired)}
          </div>
          <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
            <span>Tier 1 (Wajib Pokok):</span>
            <span className="font-semibold text-foreground tabular-nums">
              {formatIdr(summary.highPriorityMonthlyRequired)}
            </span>
          </div>
        </div>

        {/* Status Pos Dana */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Kesehatan Pos Dana
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl font-bold tracking-tight text-foreground flex items-baseline gap-2">
            <span>{summary.activeCount} Pos Aktif</span>
            {summary.fundedCount > 0 && (
              <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400">
                ({summary.fundedCount} tercapai)
              </span>
            )}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Berdasarkan sisa siklus gaji tanggal 21 s/d 20.
          </div>
        </div>

        {/* Daya Tampung Tabungan */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Kapasitas Tabungan
            </span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl font-bold tracking-tight text-foreground tabular-nums">
            {summary.capacityCoveragePct !== undefined ? `${summary.capacityCoveragePct}%` : '100%'}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {summary.capacityCoveragePct && summary.capacityCoveragePct >= 100
              ? 'Surplus bulanan mampu menutup seluruh target pos.'
              : 'Surplus belum menutup seluruh target ideal.'}
          </div>
        </div>
      </div>

      {/* Toolbar & Filter Pos Dana */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Priority Tabs */}
        <div className="inline-flex p-1 rounded-xl bg-muted border border-border">
          <button
            onClick={() => setSelectedPriorityTab('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              selectedPriorityTab === 'all'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Semua ({funds.length})
          </button>
          <button
            onClick={() => setSelectedPriorityTab('high')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              selectedPriorityTab === 'high'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tier 1: Wajib
          </button>
          <button
            onClick={() => setSelectedPriorityTab('medium')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              selectedPriorityTab === 'medium'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tier 2: Proteksi
          </button>
          <button
            onClick={() => setSelectedPriorityTab('low')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              selectedPriorityTab === 'low'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tier 3: Gaya Hidup
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetDefaults}
            className="text-xs h-9 gap-1.5"
            title="Kembalikan data contoh awal"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Awal</span>
          </Button>

          <Button
            size="sm"
            onClick={openAddForm}
            className="text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Pos Dana</span>
          </Button>
        </div>
      </div>

      {/* Grid Pos Dana Khusus */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFunds.map((fund) => {
          const pacing = fundPacings.get(fund.id);
          const status = pacing ? pacing.status : 'on_track';
          const monthlyReq = pacing ? pacing.monthlyRequired : 0;
          const cyclesLeft = pacing ? pacing.cyclesRemaining : 0;
          const progress = pacing ? pacing.progressPct : 0;
          const statusInfo = statusBadges[status];
          const priorityInfo = priorityLabels[fund.priority];

          return (
            <div
              key={fund.id}
              className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200"
            >
              <div>
                {/* Header Pos */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-foreground">
                      {getFundIcon(fund.icon)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground line-clamp-1">{fund.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${priorityInfo.badge}`}>
                          {priorityInfo.label}
                        </span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusInfo.class}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions (Edit / Delete) */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditForm(fund)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
                      aria-label="Edit pos"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteFund(fund.id, fund.name)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                      aria-label="Hapus pos"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Nominal & Progress */}
                <div className="space-y-2 mt-4">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-muted-foreground">Terkumpul:</span>
                    <span className="font-bold text-foreground tabular-nums text-sm">
                      {formatIdr(fund.currentAmount)}
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        progress >= 100
                          ? 'bg-emerald-500'
                          : progress < 50 && cyclesLeft <= 2
                          ? 'bg-amber-500'
                          : 'bg-teal-500'
                      }`}
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Target: {formatIdr(fund.targetAmount)}</span>
                    <span className="font-semibold text-foreground">{progress}%</span>
                  </div>
                </div>

                {/* Sisa & Kebutuhan Bulanan */}
                <div className="mt-4 pt-3 border-t border-border/60 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Tenggat Target:</span>
                    <span className="font-medium text-foreground text-xs flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      {cyclesLeft > 0 ? `${cyclesLeft} siklus gaji` : 'Sudah jatuh tempo'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Setoran Bulanan:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums text-xs mt-0.5 block">
                      {monthlyReq > 0 ? `${formatIdr(monthlyReq)} / bln` : 'Lunas'}
                    </span>
                  </div>
                </div>

                {fund.notes && (
                  <p className="mt-2.5 text-[11px] text-muted-foreground italic line-clamp-1">
                    {fund.notes}
                  </p>
                )}
              </div>

              {/* Tombol Quick Deposit */}
              <div className="mt-4 pt-3 border-t border-border/40">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDepositFund(fund);
                    setDepositAmount('');
                  }}
                  className="w-full text-xs h-8.5 gap-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Setor Tabungan</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Simulator Waterfall Alokasi Tabungan */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                Simulator Waterfall Alokasi Surplus
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Simulasikan distribusi surplus tabungan per siklus gaji. Sistem memprioritaskan pos Tier 1 (Wajib) sebelum mengisi Tier 2 dan Tier 3.
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {[1000000, 2500000, 3000000, 5000000].map((preset) => (
              <button
                key={preset}
                onClick={() => setSurplusInput(preset)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  surplusInput === preset
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-muted text-muted-foreground border-border hover:bg-accent hover:text-foreground'
                }`}
              >
                {formatIdr(preset)}
              </button>
            ))}
          </div>
        </div>

        {/* Input Slider & Manual Input */}
        <div className="p-4 rounded-xl bg-muted/50 border border-border/80 flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full sm:flex-1">
            <Label htmlFor="surplus-slider" className="text-xs text-muted-foreground mb-1 block">
              Alokasi Surplus Bulanan (Geser untuk mensimulasikan):
            </Label>
            <input
              id="surplus-slider"
              type="range"
              min="500000"
              max="15000000"
              step="250000"
              value={surplusInput}
              onChange={(e) => setSurplusInput(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          <div className="w-full sm:w-56">
            <Label htmlFor="surplus-input" className="text-xs text-muted-foreground mb-1 block">
              Nominal Surplus (IDR):
            </Label>
            <Input
              id="surplus-input"
              type="number"
              value={surplusInput}
              onChange={(e) => setSurplusInput(Math.max(0, Number(e.target.value)))}
              className="h-9 text-sm font-semibold tabular-nums text-foreground bg-background"
            />
          </div>
        </div>

        {/* Tabel Rincian Distribusi Waterfall */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-muted-foreground font-semibold">
                <th className="py-2.5 px-3">Pos Dana</th>
                <th className="py-2.5 px-3">Prioritas</th>
                <th className="py-2.5 px-3 text-right">Saldo Saat Ini</th>
                <th className="py-2.5 px-3 text-right">Kebutuhan Bulanan</th>
                <th className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">
                  Alokasi Masuk
                </th>
                <th className="py-2.5 px-3 text-right">Saldo Baru</th>
                <th className="py-2.5 px-3 text-center">Status Lunas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {waterfallResult.allocations.map((item) => {
                const priorityInfo = priorityLabels[item.priority];
                return (
                  <tr key={item.fundId} className="hover:bg-muted/40 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-foreground">
                      {item.fundName}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${priorityInfo.badge}`}>
                        {priorityInfo.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                      {formatIdr(item.currentAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                      {formatIdr(item.monthlyRequired)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatIdr(item.allocatedAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-foreground">
                      {formatIdr(item.newBalance)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {item.isFullyFunded ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Lunas
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          {item.newProgressPct}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold text-xs bg-muted/30">
                <td className="py-3 px-3 text-foreground" colSpan={4}>
                  Total Teralokasikan
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatIdr(waterfallResult.totalAllocated)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-muted-foreground" colSpan={2}>
                  Sisa Surplus Bebas: {formatIdr(waterfallResult.unallocatedSurplus)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modal Dialog: Tambah / Edit Pos Dana */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg bg-card text-foreground">
          <form onSubmit={handleSaveForm}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {editingFundId ? 'Edit Pos Dana Khusus' : 'Tambah Pos Dana Khusus'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Tentukan target tabungan berjangka, prioritas tier, dan tenggat waktu pencapaian.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              {/* Nama Pos */}
              <div>
                <Label htmlFor="fund-name" className="text-xs font-semibold text-foreground mb-1 block">
                  Nama Pos Dana
                </Label>
                <Input
                  id="fund-name"
                  placeholder="Misal: Pajak STNK Tahunan, Servis Mobil, Liburan"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>

              {/* Kategori & Prioritas Tier */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="fund-priority" className="text-xs font-semibold text-foreground mb-1 block">
                    Tingkat Prioritas
                  </Label>
                  <Select
                    value={formPriority}
                    onValueChange={(val) => setFormPriority(val as SinkingFundPriority)}
                  >
                    <SelectTrigger id="fund-priority" className="h-9 text-xs">
                      <SelectValue placeholder="Pilih prioritas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">Tier 1: Wajib Pokok</SelectItem>
                      <SelectItem value="medium">Tier 2: Proteksi & Darurat</SelectItem>
                      <SelectItem value="low">Tier 3: Gaya Hidup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="fund-category" className="text-xs font-semibold text-foreground mb-1 block">
                    Kategori Pengeluaran
                  </Label>
                  <Select
                    value={formCategory}
                    onValueChange={(val) => setFormCategory(val as SinkingFundCategory)}
                  >
                    <SelectTrigger id="fund-category" className="h-9 text-xs">
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="obligation">Kewajiban Pokok</SelectItem>
                      <SelectItem value="safety">Proteksi & Likuiditas</SelectItem>
                      <SelectItem value="lifestyle">Gaya Hidup & Hobi</SelectItem>
                      <SelectItem value="custom">Kustom Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Target & Saldo Awal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="fund-target" className="text-xs font-semibold text-foreground mb-1 block">
                    Target Nominal (IDR)
                  </Label>
                  <Input
                    id="fund-target"
                    type="number"
                    placeholder="Contoh: 3000000"
                    value={formTargetAmount}
                    onChange={(e) => setFormTargetAmount(e.target.value)}
                    required
                    className="h-9 text-xs tabular-nums"
                  />
                </div>

                <div>
                  <Label htmlFor="fund-current" className="text-xs font-semibold text-foreground mb-1 block">
                    Saldo Awal Terkumpul (IDR)
                  </Label>
                  <Input
                    id="fund-current"
                    type="number"
                    placeholder="Contoh: 1000000"
                    value={formCurrentAmount}
                    onChange={(e) => setFormCurrentAmount(e.target.value)}
                    className="h-9 text-xs tabular-nums"
                  />
                </div>
              </div>

              {/* Tanggal Target & Ikon */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="fund-date" className="text-xs font-semibold text-foreground mb-1 block">
                    Target Tanggal / Jatuh Tempo
                  </Label>
                  <Input
                    id="fund-date"
                    type="date"
                    value={formTargetDate}
                    onChange={(e) => setFormTargetDate(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <Label htmlFor="fund-icon" className="text-xs font-semibold text-foreground mb-1 block">
                    Ikon Tampilan
                  </Label>
                  <Select value={formIcon} onValueChange={setFormIcon}>
                    <SelectTrigger id="fund-icon" className="h-9 text-xs">
                      <SelectValue placeholder="Pilih ikon" />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Catatan Tambahan */}
              <div>
                <Label htmlFor="fund-notes" className="text-xs font-semibold text-foreground mb-1 block">
                  Catatan Tambahan (Opsional)
                </Label>
                <Input
                  id="fund-notes"
                  placeholder="Misal: Nomor polis asuransi, estimasi tanggal mudik"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFormOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {editingFundId ? 'Simpan Perubahan' : 'Buat Pos Dana'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog: Quick Deposit (+ Setor) */}
      <Dialog open={!!depositFund} onOpenChange={(open) => !open && setDepositFund(null)}>
        <DialogContent className="sm:max-w-md bg-card text-foreground">
          <form onSubmit={handleDepositSubmit}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>Setor Tabungan: {depositFund?.name}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Tambahkan saldo ke pos dana ini. Saldo saat ini:{' '}
                <strong className="text-foreground">{depositFund ? formatIdr(depositFund.currentAmount) : 0}</strong>{' '}
                (Target: {depositFund ? formatIdr(depositFund.targetAmount) : 0})
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
              <Label htmlFor="deposit-amount" className="text-xs font-semibold text-foreground block">
                Nominal Setoran (IDR)
              </Label>
              <Input
                id="deposit-amount"
                type="number"
                placeholder="Contoh: 500000"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                autoFocus
                required
                className="h-10 text-sm font-semibold tabular-nums"
              />

              {/* Rekomendasi nominal setoran cepat */}
              {depositFund && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {[250000, 500000, 1000000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDepositAmount(preset.toString())}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-muted text-foreground border border-border hover:bg-accent"
                    >
                      +{formatIdr(preset)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const needed = Math.max(0, depositFund.targetAmount - depositFund.currentAmount);
                      setDepositAmount(needed.toString());
                    }}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                  >
                    Lunaskan Sisa
                  </button>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDepositFund(null)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Konfirmasi Setor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
