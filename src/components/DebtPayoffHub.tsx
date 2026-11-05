import React, { useState, useMemo, useEffect } from 'react';
import { formatIdr, formatNumber } from '../lib/utils';
import type { MonthlySummary, RecurringTransaction, Transaction } from '../lib/data';
import {
  calculateDebtPayoffSchedule,
  calculateCreditHealth,
  generateInstallmentMilestones,
  type DebtItem,
  type PayoffSimulationResult,
  type CreditHealthMetrics,
  type CashFlowMilestone,
} from '../lib/debt-simulator';
import { summarizeInstallments, type ActiveInstallmentItem } from '../lib/installment-summary';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CreditCard,
  Zap,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Sparkles,
  Flame,
  Layers,
  ArrowRight,
  Info,
  Calendar,
  Wallet,
} from 'lucide-react';

interface DebtPayoffHubProps {
  transactions: Transaction[];
  recurring: RecurringTransaction[];
  summaries: MonthlySummary[];
  activePeriodMonth?: string;
  categoryColorMap?: Record<string, string>;
}

const STORAGE_KEY_LIMIT = 'findash_credit_limit_target';
const DEFAULT_CREDIT_LIMIT = 15000000;

export default function DebtPayoffHub({
  transactions,
  recurring,
  summaries,
  activePeriodMonth,
  categoryColorMap = {},
}: DebtPayoffHubProps) {
  // Strategy: avalanche or snowball
  const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche');
  const [extraPayment, setExtraPayment] = useState<number>(500000);
  const [creditLimit, setCreditLimit] = useState<number>(DEFAULT_CREDIT_LIMIT);
  const [isCustomLimit, setIsCustomLimit] = useState<boolean>(false);
  const [limitInputStr, setLimitInputStr] = useState<string>(String(DEFAULT_CREDIT_LIMIT));

  // Load custom credit limit from localStorage if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_LIMIT);
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed) && parsed > 0) {
            setCreditLimit(parsed);
            setLimitInputStr(String(parsed));
          }
        }
      } catch {
        // Ignore localStorage error
      }
    }
  }, []);

  const handleSetLimit = (val: number) => {
    setCreditLimit(val);
    setLimitInputStr(String(val));
    setIsCustomLimit(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_LIMIT, String(val));
      } catch {
        // Ignore localStorage error
      }
    }
  };

  const handleCustomLimitBlur = () => {
    const parsed = parseInt(limitInputStr.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= 1000000) {
      handleSetLimit(parsed);
    } else {
      setLimitInputStr(String(creditLimit));
    }
    setIsCustomLimit(false);
  };

  // Summarize installments
  const installmentSummary = useMemo(() => {
    return summarizeInstallments({
      recurring,
      transactions,
      currentPeriodMonth: activePeriodMonth ?? null,
    });
  }, [recurring, transactions, activePeriodMonth]);

  // Unpaid credit card expenses in the active or latest period
  const unpaidExpenses = useMemo(() => {
    return transactions.filter(
      (t) => t.type === 'credit_expense' && !t.done
    );
  }, [transactions]);

  const unpaidTotal = useMemo(() => {
    return unpaidExpenses.reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [unpaidExpenses]);

  // Estimate monthly income from current summaries
  const monthlyIncome = useMemo(() => {
    if (!summaries || summaries.length === 0) return 0;
    const recent = summaries[summaries.length - 1];
    return recent?.income || 0;
  }, [summaries]);

  // Assemble debt items for simulation
  const debtItems: DebtItem[] = useMemo(() => {
    const list: DebtItem[] = [];

    // 1. Add active installments
    for (const inst of installmentSummary.items) {
      if (inst.active && !inst.isCompleted) {
        const balance =
          inst.estimatedRemainingAmount ??
          inst.monthlyAmount * (inst.remainingTenor ?? 1);
        if (balance > 0) {
          list.push({
            id: `inst-${inst.id}`,
            title: inst.cleanTitle,
            category: inst.category,
            balance,
            monthlyPayment: inst.monthlyAmount,
            interestRateAnnual: 0, // installments usually 0% promo or fixed fee
            type: 'installment',
            endDate: inst.endDate,
            remainingTenor: inst.remainingTenor,
          });
        }
      }
    }

    // 2. Add unpaid credit card revolving balance if any
    if (unpaidTotal > 0) {
      list.push({
        id: 'cc-revolving-unpaid',
        title: 'Tagihan Berjalan Kartu Kredit',
        category: 'Credit Card',
        balance: unpaidTotal,
        monthlyPayment: Math.max(100000, Math.round(unpaidTotal * 0.1)),
        interestRateAnnual: 21, // 21% standard credit card APR in Indonesia
        type: 'credit_card',
      });
    }

    return list;
  }, [installmentSummary.items, unpaidTotal]);

  // Outstanding balance across installments + unpaid charges
  const totalOutstandingBalance = useMemo(() => {
    const instLiability = installmentSummary.totalRemainingLiability || 0;
    return instLiability + unpaidTotal;
  }, [installmentSummary.totalRemainingLiability, unpaidTotal]);

  // Credit Health Metrics
  const healthMetrics: CreditHealthMetrics = useMemo(() => {
    return calculateCreditHealth({
      totalCreditLimit: creditLimit,
      outstandingBalance: totalOutstandingBalance,
      monthlyIncome,
      unpaidExpensesCount: unpaidExpenses.length,
      unpaidExpensesTotal: unpaidTotal,
      activeInstallmentsCount: installmentSummary.activeCount,
      activeInstallmentsTotalMonthly: installmentSummary.monthlyObligation,
    });
  }, [
    creditLimit,
    totalOutstandingBalance,
    monthlyIncome,
    unpaidExpenses.length,
    unpaidTotal,
    installmentSummary.activeCount,
    installmentSummary.monthlyObligation,
  ]);

  // Simulation Result
  const simulation: PayoffSimulationResult = useMemo(() => {
    return calculateDebtPayoffSchedule(debtItems, extraPayment, strategy);
  }, [debtItems, extraPayment, strategy]);

  // Cash flow liberation milestones from installments
  const milestones: CashFlowMilestone[] = useMemo(() => {
    return generateInstallmentMilestones(installmentSummary.items);
  }, [installmentSummary.items]);

  // Utilization status styles
  const utilBadgeConfig = useMemo(() => {
    switch (healthMetrics.utilizationStatus) {
      case 'optimal':
        return {
          label: 'Optimal (<30%)',
          colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          barClass: 'bg-emerald-500',
        };
      case 'moderate':
        return {
          label: 'Moderat (30-50%)',
          colorClass: 'bg-gold-500/10 text-gold-600 dark:text-gold-400 border-gold-500/30',
          barClass: 'bg-amber-500',
        };
      case 'high':
        return {
          label: 'Tinggi (50-75%)',
          colorClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
          barClass: 'bg-orange-500',
        };
      case 'critical':
      default:
        return {
          label: 'Kritis (>75%)',
          colorClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
          barClass: 'bg-rose-500',
        };
    }
  }, [healthMetrics.utilizationStatus]);

  // DTI status styles
  const dtiBadgeConfig = useMemo(() => {
    switch (healthMetrics.dtiStatus) {
      case 'healthy':
        return {
          label: 'Sehat (<=20%)',
          colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        };
      case 'moderate':
        return {
          label: 'Moderat (21-36%)',
          colorClass: 'bg-gold-500/10 text-gold-600 dark:text-gold-400 border-gold-500/30',
        };
      case 'caution':
      default:
        return {
          label: 'Perhatian (>36%)',
          colorClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
        };
    }
  }, [healthMetrics.dtiStatus]);

  const presetLimits = [10000000, 15000000, 20000000, 30000000, 50000000];
  const presetExtraPayments = [0, 250000, 500000, 1000000, 2000000];

  return (
    <div className="space-y-6">
      {/* 1. Header Hub Briefing */}
      <div className="glass-card p-5 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-500" />
                Credit Card Debt Payoff & Health Hub
              </h2>
              <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-xs">
                Simulator Aktif
              </Badge>
            </div>
            <p className="text-xs text-slate-600 dark:text-white/60 max-w-2xl">
              Simulasikan percepatan pelunasan cicilan dan saldo kartu kredit menggunakan metode Snowball atau Avalanche, pantau skor rasio pemanfaatan limit, dan evaluasi momen pelepasan arus kas bulanan.
            </p>
          </div>

          {/* Quick Target Summary */}
          <div className="flex items-center gap-2 bg-slate-100/80 dark:bg-white/[0.04] p-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08]">
            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
            <div className="text-xs">
              <span className="text-slate-500 dark:text-white/40 block">Total Liabilitas Saldo & Cicilan</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {formatIdr(totalOutstandingBalance)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Credit Health & Utilization Radar */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Radar Kesehatan Kredit & Batas Limit
            </h3>
            <p className="text-xs text-slate-600 dark:text-white/50">
              Evaluasi rasio penggunaan limit kartu kredit dan beban kewajiban bulanan terhadap penghasilan (DTI).
            </p>
          </div>

          {/* Limit Preset Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500 dark:text-white/40 mr-1">Limit Kartu:</span>
            {presetLimits.map((lim) => (
              <button
                key={lim}
                type="button"
                onClick={() => handleSetLimit(lim)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                  creditLimit === lim && !isCustomLimit
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-white/[0.04] text-slate-700 dark:text-white/70 border-slate-200 dark:border-white/10 hover:border-indigo-400'
                }`}
              >
                {lim >= 1000000 ? `${lim / 1000000} Jt` : formatIdr(lim)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsCustomLimit(true)}
              className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                isCustomLimit
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-white/[0.04] text-slate-700 dark:text-white/70 border-slate-200 dark:border-white/10 hover:border-indigo-400'
              }`}
            >
              Ubah Limit
            </button>
          </div>
        </div>

        {/* Custom Limit Input Bar (Conditional) */}
        {isCustomLimit && (
          <div className="flex items-center gap-2 p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-200/60 dark:border-indigo-500/20">
            <span className="text-xs text-slate-600 dark:text-white/70 whitespace-nowrap">Input Limit Baru (Rp):</span>
            <Input
              type="number"
              value={limitInputStr}
              onChange={(e) => setLimitInputStr(e.target.value)}
              onBlur={handleCustomLimitBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustomLimitBlur();
              }}
              className="h-8 max-w-[200px] text-xs bg-white dark:bg-slate-900"
              placeholder="Contoh: 25000000"
              autoFocus
            />
            <Button size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleCustomLimitBlur}>
              Terapkan
            </Button>
          </div>
        )}

        {/* 3 Metric Cards: Utilization, DTI, Rekomendasi */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Card 1: Credit Utilization */}
          <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] p-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-white/50 font-medium">Credit Utilization</span>
                <Badge variant="outline" className={`text-[10px] ${utilBadgeConfig.colorClass}`}>
                  {utilBadgeConfig.label}
                </Badge>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {healthMetrics.utilizationRate}%
                </span>
                <span className="text-xs text-slate-500 dark:text-white/40">terpakai dari limit</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-white/[0.08] rounded-full h-2 overflow-hidden mt-1">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${utilBadgeConfig.barClass}`}
                  style={{ width: `${Math.min(100, healthMetrics.utilizationRate)}%` }}
                />
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500 dark:text-white/40">
              <span>Saldo: {formatIdr(healthMetrics.totalBalance)}</span>
              <span>Limit: {formatIdr(healthMetrics.totalLimit)}</span>
            </div>
          </div>

          {/* Card 2: Debt-to-Income (DTI) */}
          <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] p-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-white/50 font-medium">Rasio Beban Cicilan (DTI)</span>
                <Badge variant="outline" className={`text-[10px] ${dtiBadgeConfig.colorClass}`}>
                  {dtiBadgeConfig.label}
                </Badge>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {healthMetrics.dtiRatio}%
                </span>
                <span className="text-xs text-slate-500 dark:text-white/40">dari pemasukan bulanan</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-white/60 leading-relaxed">
                Kewajiban bulanan saat ini adalah{' '}
                <strong className="text-slate-800 dark:text-white">{formatIdr(healthMetrics.monthlyObligation)}</strong> per siklus.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500 dark:text-white/40">
              <span>{healthMetrics.activeInstallmentsCount} Cicilan Aktif</span>
              <span>{healthMetrics.unpaidExpensesCount} Tagihan Pending</span>
            </div>
          </div>

          {/* Card 3: Actionable Recommendation */}
          <div className="rounded-xl border border-indigo-200/60 dark:border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/10 p-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-semibold text-xs">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Rekomendasi Cerdas Finansial
              </div>
              <p className="text-xs text-slate-700 dark:text-white/80 leading-relaxed">
                {healthMetrics.recommendation}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-indigo-200/40 dark:border-indigo-500/10 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0" />
              Batas ideal penggunaan kartu kredit adalah di bawah 30% limit.
            </div>
          </div>
        </div>
      </div>

      {/* 3. Debt Payoff Simulator (Snowball vs Avalanche) */}
      <div className="glass-card p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
              <Flame className="w-4 h-4 text-amber-500" />
              Simulator Pelunasan Utang (Snowball vs Avalanche)
            </h3>
            <p className="text-xs text-slate-600 dark:text-white/50">
              Pilih strategi dan simulasikan dampak alokasi pembayaran tambahan bulanan terhadap kecepatan pelunasan liabilitas.
            </p>
          </div>

          {/* Strategy Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.06] p-1 rounded-xl border border-slate-200 dark:border-white/10">
            <button
              type="button"
              onClick={() => setStrategy('avalanche')}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                strategy === 'avalanche'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-white/60 hover:text-slate-900'
              }`}
            >
              Avalanche (Bunga Tinggi)
            </button>
            <button
              type="button"
              onClick={() => setStrategy('snowball')}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                strategy === 'snowball'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-white/60 hover:text-slate-900'
              }`}
            >
              Snowball (Saldo Kecil)
            </button>
          </div>
        </div>

        {/* Extra Payment Slider & Presets */}
        <div className="bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] p-4 rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-white block">
                Alokasi Pembayaran Ekstra Per Bulan
              </span>
              <span className="text-[11px] text-slate-500 dark:text-white/40">
                Uang lebih yang dialokasikan di atas cicilan minimum untuk mempercepat pelunasan
              </span>
            </div>
            <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
              +{formatIdr(extraPayment)} / bln
            </span>
          </div>

          {/* Slider */}
          <div className="pt-1">
            <input
              type="range"
              min={0}
              max={3000000}
              step={100000}
              value={extraPayment}
              onChange={(e) => setExtraPayment(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 dark:bg-white/10 rounded-lg"
            />
          </div>

          {/* Quick preset buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-slate-500 dark:text-white/40 mr-1">Preset Cepat:</span>
            {presetExtraPayments.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setExtraPayment(preset)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                  extraPayment === preset
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-white/[0.04] text-slate-700 dark:text-white/70 border-slate-200 dark:border-white/10 hover:border-indigo-400'
                }`}
              >
                {preset === 0 ? 'Tanpa Ekstra (Rp 0)' : `+${formatIdr(preset).replace('IDR ', '')}`}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Outcome KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* KPI 1: Target Payoff Date */}
          <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] p-3.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/40 mb-1">
              <CalendarCheck className="w-3.5 h-3.5 text-indigo-500" />
              Target Bebas Utang
            </div>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white truncate">
              {simulation.monthsToPayoff === 0 ? 'Lunas Sekarang 🎉' : simulation.payoffDate}
            </p>
            <span className="text-xs text-slate-600 dark:text-white/50">
              {simulation.monthsToPayoff === 0 ? 'Tidak ada sisa utang' : `${simulation.monthsToPayoff} bulan ke depan`}
            </span>
          </div>

          {/* KPI 2: Months Saved */}
          <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] p-3.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/40 mb-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Waktu Dihemat
            </div>
            <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
              {simulation.monthsSavedVsBaseline > 0
                ? `${simulation.monthsSavedVsBaseline} Bulan Lebih Cepat`
                : 'Pace Normal'}
            </p>
            <span className="text-xs text-slate-600 dark:text-white/50">
              {simulation.monthsSavedVsBaseline > 0 ? 'Dibandingkan cicilan minimum' : 'Tambahkan alokasi ekstra'}
            </span>
          </div>

          {/* KPI 3: Interest / Admin Saved */}
          <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] p-3.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/40 mb-1">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
              Estimasi Penghematan
            </div>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white truncate">
              {simulation.interestSavedVsBaseline > 0
                ? formatIdr(simulation.interestSavedVsBaseline)
                : 'Rp 0'}
            </p>
            <span className="text-xs text-slate-600 dark:text-white/50">
              Biaya bunga/admin terhindar
            </span>
          </div>

          {/* KPI 4: Total Monthly Budget */}
          <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] p-3.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/40 mb-1">
              <Wallet className="w-3.5 h-3.5 text-blue-500" />
              Alokasi Bulanan Total
            </div>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white truncate">
              {formatIdr(simulation.totalMonthlyBudget)}
            </p>
            <span className="text-xs text-slate-600 dark:text-white/50">
              Pokok ({formatIdr(simulation.monthlyBaseBudget)}) + Ekstra
            </span>
          </div>
        </div>

        {/* Payoff Schedule Trajectory & Milestone Order */}
        {debtItems.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 dark:border-white/10 rounded-xl space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
            <h4 className="text-sm font-semibold text-slate-800 dark:text-white">Tidak Ada Utang atau Cicilan Aktif</h4>
            <p className="text-xs text-slate-500 dark:text-white/40 max-w-md mx-auto">
              Semua cicilan dan tagihan kartu kredit Anda saat ini berada dalam kondisi lunas. Pemanfaatan kredit Anda berada pada titik 0%.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
            {/* Left: Sequential Item Payoff Order */}
            <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] p-4 bg-slate-50/30 dark:bg-white/[0.01] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  Urutan Penyelesaian Utang ({strategy === 'avalanche' ? 'Avalanche' : 'Snowball'})
                </h4>
                <Badge variant="outline" className="text-[10px] text-slate-600 dark:text-white/50">
                  {simulation.itemPayoffOrder.length} Target
                </Badge>
              </div>

              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {simulation.itemPayoffOrder.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-slate-200/70 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">
                          {item.title}
                        </p>
                        <span className="text-[11px] text-slate-500 dark:text-white/40">
                          Saldo Awal: {formatIdr(item.startingBalance)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                        Lunas: {item.payoffDate}
                      </Badge>
                      <span className="text-[10px] text-slate-500 dark:text-white/40 block mt-0.5">
                        Bulan ke-{item.payoffMonthIndex}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Step Trajectory Preview */}
            <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] p-4 bg-slate-50/30 dark:bg-white/[0.01] space-y-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
                <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                Trajektori Saldo Utang Menuju Lunas
              </h4>

              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {simulation.monthlySchedule.slice(0, 8).map((step) => {
                  const pct =
                    simulation.totalStartingDebt > 0
                      ? Math.round((step.remainingDebt / simulation.totalStartingDebt) * 100)
                      : 0;
                  return (
                    <div key={step.monthIndex} className="p-2.5 rounded-lg border border-slate-200/60 dark:border-white/[0.05] bg-white dark:bg-white/[0.02] space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-white">
                          {step.monthLabel}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatIdr(step.remainingDebt)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 dark:text-white/40">
                        <span>{step.debtItemsRemaining} item sisa</span>
                        <span>{pct}% dari saldo awal</span>
                      </div>
                    </div>
                  );
                })}
                {simulation.monthlySchedule.length > 8 && (
                  <p className="text-center text-[11px] text-slate-500 dark:text-white/40 pt-1">
                    +{simulation.monthlySchedule.length - 8} bulan jadwal lanjutan hingga selesai sepenuhnya.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Cash Flow Liberation Milestones */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
              <Calendar className="w-4 h-4 text-emerald-500" />
              Linimasa Pelepasan Arus Kas (Cash Flow Liberation)
            </h3>
            <p className="text-xs text-slate-600 dark:text-white/50">
              Momen saat cicilan berjalan selesai dan nominal angsurannya kembali menjadi arus kas bebas di dompet Anda.
            </p>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">
            {milestones.length} Milestone Terjadwal
          </Badge>
        </div>

        {milestones.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-500 dark:text-white/40">
            Belum ada cicilan dengan tanggal jatuh tempo akhir (endDate) yang terdata.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {milestones.map((m, idx) => (
              <div
                key={m.dateKey}
                className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] p-4 flex flex-col justify-between hover:border-emerald-500/40 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {m.monthYear}
                    </span>
                    <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                      Milestone #{idx + 1}
                    </Badge>
                  </div>

                  <div className="pt-1">
                    <span className="text-[11px] text-slate-500 dark:text-white/40 block">Arus Kas Dibebaskan:</span>
                    <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                      +{formatIdr(m.monthlyAmountLiberated)} / bln
                    </span>
                  </div>

                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider font-semibold">
                      Cicilan Yang Tuntas:
                    </span>
                    {m.completedItems.map((it, i) => (
                      <p key={i} className="text-xs text-slate-700 dark:text-white/70 font-medium truncate">
                        • {it.title} ({formatIdr(it.monthlyAmount)}/bln)
                      </p>
                    ))}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500 dark:text-white/40">
                  <span>Sisa Angsuran Bulanan:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">
                    {formatIdr(m.remainingMonthlyObligation)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
