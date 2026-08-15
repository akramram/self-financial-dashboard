import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Transaction, NetworthRecord, MonthlySummary, Category } from '../lib/data';
import { formatIdr, getActivePeriod } from '../lib/utils';
import { updateTransactionApi, deleteTransactionApi, toggleTransactionDoneApi, fetchCategories, fetchRecurringTransactions } from '../lib/api';
import '../lib/chartConfig';

import { LazyMotion, domAnimation } from 'motion/react';

import GlassCard from './ui/glass-card';
import StatCard from './ui/stat-card';
import AnimatedCounter from './ui/animated-counter';
import Sparkline from './Sparkline';

import { DollarSign, Wallet, BarChart3, TrendingUp, TrendingDown, Scale, Shield, Bell, Plus, X, AlertTriangle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useConfirm } from './ConfirmDialog';
import { useSortState } from '../hooks/useSortState';
import SortableHeader from './SortableHeader';
import EditTransactionDialog from './EditTransactionDialog';
import MonthKickoffModal from './MonthKickoffModal';
import PeriodProgressRing from './ui/period-progress-ring';
import { toast } from 'sonner';

import SpendingPulse from './SpendingPulse';
import CategoryBudgets from './CategoryBudgets';
import FinancialInsights from './FinancialInsights';
import AlertsPanel from './AlertsPanel';
import OutcomeChart from './OutcomeChart';
import NetworthChart from './NetworthChart';
import CategoryChart from './CategoryChart';
import CategoryTrendChart from './CategoryTrendChart';
import SavingsRateChart from './SavingsRateChart';
import OutcomeBarChart from './OutcomeBarChart';
import PeriodVsAverage from './PeriodVsAverage';
import DailyBudgetIndicator from './DailyBudgetIndicator';
import TopMerchantsMini from './TopMerchantsMini';

function parseCreatedTime(tx: Transaction): Date {
  if (tx.created_time) {
    const d = new Date(tx.created_time);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(tx.date);
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const h = 28; const w = 64;
  const points = data.map((v, i) => ({ x: (i / (data.length - 1)) * w, y: h - ((v - min) / range) * (h - 4) - 2 }));
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2" fill={color} />
    </svg>
  );
}

interface Props {
  transactions: Transaction[];
  networth: NetworthRecord[];
  summaries: MonthlySummary[];
}

export default function Dashboard({ transactions, networth, summaries }: Props) {
  const { confirm: confirmAction } = useConfirm();
  const activePeriod = useMemo(() => { const { month, year } = getActivePeriod(); return `${month} ${year}`; }, []);

  // ── State ─────────────────────────────────────────────────────
  // Local transaction state (mirrors props, updated optimistically on mutations)
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>(transactions);
  const [filterPeriodId, setFilterPeriodId] = useState<number | null>(null);
  const [filterAllTime, setFilterAllTime] = useState(true);
  const [txPage, setTxPage] = useState(1); const txPerPage = 10;
  const [categories, setCategories] = useState<Category[]>([]);
  const [recurringTitles, setRecurringTitles] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});
  const [showAlerts, setShowAlerts] = useState(false);
  const [feedSearch, setFeedSearch] = useState('');
  const [kickoffBanner, setKickoffBanner] = useState<{ show: boolean; currentMonth: string; nextMonth: string; recurringCount: number } | null>(null);
  const [kickoffOpen, setKickoffOpen] = useState(false);
  const [runwayData, setRunwayData] = useState<{ runway_months: number; status: string; tips?: string[] } | null>(null);

  // ── Derived ───────────────────────────────────────────────────
  const periodOptions = useMemo(() => {
    const seen = new Set<number>();
    return summaries.filter(s => { if (seen.has(s.period_id)) return false; seen.add(s.period_id); return true; }).map(s => ({ id: s.period_id, month: s.month })).reverse();
  }, [summaries]);

  const isAllTime = filterAllTime;
  const activeSummary = useMemo(() => {
    if (isAllTime) return summaries[summaries.length - 1];
    return summaries.find(s => s.period_id === filterPeriodId) ?? summaries[summaries.length - 1];
  }, [filterPeriodId, summaries, isAllTime]);

  const filteredSummaries = useMemo(() => isAllTime ? summaries : summaries.filter(s => s.period_id === filterPeriodId), [filterPeriodId, summaries, isAllTime]);
  const filteredNetworth = useMemo(() => isAllTime ? networth : networth.filter(n => n.period_id === filterPeriodId), [filterPeriodId, networth, isAllTime]);
  const filteredTransactions = useMemo(() => {
    if (!activeSummary) return [];
    if (isAllTime) return localTransactions.filter(t => t.period_id === activeSummary.period_id);
    return localTransactions.filter(t => t.period_id === filterPeriodId);
  }, [filterPeriodId, localTransactions, activeSummary, isAllTime]);

  const categoryMap = useMemo(() => { const map: Record<string, Category> = {}; categories.forEach(c => { map[c.name] = c; }); return map; }, [categories]);

  // ── Computed glance data ─────────────────────────────────────
  const glance = useMemo(() => {
    if (!activeSummary) return null;
    const sorted = [...summaries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const idx = sorted.findIndex(s => s.month === activeSummary.month);
    const prev = idx > 0 ? sorted[idx - 1] : null;
    const income = activeSummary.income ?? 0;
    const spending = activeSummary.outcome?.total ?? 0;
    const prevIncome = prev?.income ?? 0;
    const prevSpending = prev?.outcome?.total ?? 0;
    const balance = income - spending;
    const prevBalance = prevIncome - prevSpending;
    const nwSorted = [...networth].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const nwCurrent = nwSorted.find(n => n.month === activeSummary.month) ?? nwSorted[nwSorted.length - 1];
    const nwPrevIdx = nwSorted.findIndex(n => n.month === activeSummary.month);
    const nwPrev = nwPrevIdx > 0 ? nwSorted[nwPrevIdx - 1] : null;
    const nw = nwCurrent?.total ?? 0;
    const prevNw = nwPrev?.total ?? 0;
    return { income, spending, balance, prevBalance, prevIncome, prevSpending, nw, prevNw, last6Income: sorted.slice(-6).map(s => s.income ?? 0), last6Spending: sorted.slice(-6).map(s => s.outcome?.total ?? 0), last6Nw: nwSorted.slice(-6).map(n => n.total ?? 0) };
  }, [activeSummary, summaries, networth]);

  // ── Effects ───────────────────────────────────────────────────
  useEffect(() => { fetchCategories().then(setCategories).catch(() => {}); fetchRecurringTransactions().then(r => setRecurringTitles(r.filter(rx => rx.active).map(rx => rx.title))).catch(() => {}); fetch('/api/runway').then(r => r.json()).then(d => setRunwayData(d)).catch(() => {}); }, []);
  useEffect(() => { const today = new Date(); if (today.getDate() < 21) return; const latest = summaries[summaries.length - 1]; if (!latest) return; const latestDate = new Date(latest.month + ' 1'); const nextDate = new Date(latestDate); nextDate.setMonth(nextDate.getMonth() + 1); const nextMonthStr = nextDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); fetch('/api/kickoff').then(res => res.json()).then((status: any) => { if (status.hasNextMonth) { setKickoffBanner(null); return; } fetchRecurringTransactions().then(recurring => { setKickoffBanner({ show: true, currentMonth: latest.month, nextMonth: status.nextMonth || nextMonthStr, recurringCount: recurring.filter(r => r.active).length }); }).catch(() => {}); }).catch(() => {}); }, [summaries]);

  // Keyboard shortcut: / to focus feed search
  const feedSearchRef = React.useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName) && !(e.target as HTMLElement)?.closest('[contenteditable]')) {
        e.preventDefault();
        feedSearchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ── Sort + pagination ────────────────────────────────────────
  const { toggleSort, sortData, isSorted } = useSortState();
  const getTxCellValue = useCallback((t: Transaction, key: string): string | number => { switch (key) { case 'paid': return t.done ? 1 : 0; case 'title': return t.title; case 'category': return t.category; case 'date': return new Date(t.created_time || t.date).getTime(); case 'amount': return t.amount; case 'type': return t.type; default: return ''; } }, []);
  const sortedTransactions = useMemo(() => sortData(filteredTransactions, getTxCellValue, data => [...data].sort((a, b) => parseCreatedTime(b).getTime() - parseCreatedTime(a).getTime())), [filteredTransactions, sortData, getTxCellValue]);
  const searchedTransactions = useMemo(() => {
    if (!feedSearch.trim()) return sortedTransactions;
    const q = feedSearch.toLowerCase().trim();
    return sortedTransactions.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.type.toLowerCase().includes(q)
    );
  }, [sortedTransactions, feedSearch]);
  const totalTxPages = Math.max(1, Math.ceil(searchedTransactions.length / txPerPage));
  const pagedTransactions = searchedTransactions.slice((txPage - 1) * txPerPage, txPage * txPerPage);
  const goToPage = (page: number) => setTxPage(Math.max(1, Math.min(totalTxPages, page)));

  // ── Edit handlers ────────────────────────────────────────────
  const startEdit = (row: Transaction) => { setEditingId(row.id); setEditForm({ ...row }); };
  const cancelEdit = () => { setEditingId(null); setEditForm({}); };
  const saveEdit = async () => {
    if (!editForm.id) return;
    const original = transactions.find(t => t.id === editForm.id);
    if (!original) return;
    const updates = { ...original, ...(editForm as Transaction) };
    try {
      await updateTransactionApi(editForm.id, updates);
      setLocalTransactions(prev => prev.map(t => t.id === editForm.id ? updates : t));
      setEditingId(null);
      setEditForm({});
      toast.success('Transaction updated');
    } catch {
      toast.error('Failed to update transaction');
    }
  };
  const handleChange = (field: keyof Transaction, value: string | number | boolean) => setEditForm(prev => ({ ...prev, [field]: value }));
  const openCategoryDialog = (cat: string) => { setSelectedCategory(cat); setDialogOpen(true); };

  return (
    <LazyMotion features={domAnimation}>
      <div className="space-y-5">

        {/* ═══════════ SECTION 1: PULSE — "Gimana kondisi sekarang?" ═══════════ */}
        <section>
          {/* Period filter pill */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-white/40">Pulse</p>
            <Select value={filterPeriodId?.toString() ?? "all"} onValueChange={v => { setFilterAllTime(v === "all"); setFilterPeriodId(v === "all" ? null : parseInt(v)); setTxPage(1); }}>
              <SelectTrigger className="w-[150px] h-8 text-xs bg-slate-100 dark:bg-white/[0.05] border-slate-300 dark:border-white/[0.08] text-slate-600 dark:text-white/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All-time</SelectItem>
                {periodOptions.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.month}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Balance Hero */}
          {glance && (() => {
            const spendPct = glance.income > 0 ? Math.min(Math.round((glance.spending / glance.income) * 100), 100) : 0;
            const savingsPct = 100 - spendPct;
            const barColor = spendPct >= 100 ? '#ef4444' : spendPct >= 80 ? '#f59e0b' : '#34d399';
            return (
            <GlassCard variant="hero" className="p-6 mb-4">
              <div className="relative flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-500 dark:text-white/40 mb-1">Available Balance</p>
                  <AnimatedCounter value={glance.balance} formatFn={formatIdr} className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight" />
                  <div className="flex items-center gap-3 mt-3">
                    {glance.prevBalance !== 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: 'rgba(52,211,153,0.12)', color: '#34d399' }}>
                        {glance.balance >= glance.prevBalance ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {glance.balance >= glance.prevBalance ? '+' : ''}{formatIdr(glance.balance - glance.prevBalance)}
                      </span>
                    )}
                    <span className="text-xs text-slate-500 dark:text-white/40">vs last period</span>
                  </div>

                  {/* Income Allocation Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-slate-500 dark:text-white/40">Income Allocation</span>
                      <span className="text-xs font-semibold" style={{ color: barColor }}>{spendPct}% spent</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full overflow-hidden bg-white/[0.15]">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${spendPct}%`, backgroundColor: barColor }} />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: barColor }} />
                        <span className="text-[11px] text-slate-500 dark:text-white/40">Spent {formatIdr(glance.spending)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500 dark:text-white/40">Saved {formatIdr(Math.max(0, glance.balance))}</span>
                        <span className="w-2 h-2 rounded-full bg-white/30" />
                      </div>
                    </div>
                  </div>
                </div>
                <PeriodProgressRing activeMonth={activeSummary?.month} />
              </div>
            </GlassCard>
            );
          })()}

          {/* 3 Glance Chips */}
          {glance && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard label="Income" value={formatIdr(glance.income)} delta={glance.prevIncome !== 0 ? `${glance.income >= glance.prevIncome ? '+' : ''}${formatIdr(glance.income - glance.prevIncome)}` : undefined} isPositive={glance.income >= glance.prevIncome} color="#34d399" icon={<DollarSign className="w-4 h-4" />} sparkline={<MiniSparkline data={glance.last6Income} color="#34d399" />} />
              <StatCard label="Spent" value={formatIdr(glance.spending)} delta={glance.prevSpending !== 0 ? `${glance.spending <= glance.prevSpending ? '' : '+'}${formatIdr(glance.spending - glance.prevSpending)}` : undefined} isPositive={glance.spending <= glance.prevSpending} color="#ef4444" icon={<Wallet className="w-4 h-4" />} sparkline={<MiniSparkline data={glance.last6Spending} color="#ef4444" />} />
              <StatCard label="Net Worth" value={formatIdr(glance.nw)} isPositive={glance.nw >= glance.prevNw} color="#f59e0b" icon={<BarChart3 className="w-4 h-4" />} sparkline={<MiniSparkline data={glance.last6Nw} color="#f59e0b" />} />
            </div>
          )}
        </section>

        {/* ═══════════ SECTION 2: FLOW — "Ke mana duit?" ═══════════ */}
        <section>
          <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-white/40 mb-3">Flow</p>

          {/* Spending Pulse + Safe to Spend merged */}
          <GlassCard className="mb-4">
            <SpendingPulse summaries={summaries} activeMonth={activeSummary?.month} />
          </GlassCard>

          {/* Daily Budget Indicator */}
          <GlassCard className="mb-4">
            <DailyBudgetIndicator
              transactions={filteredTransactions}
              income={glance?.income ?? 0}
              spent={glance?.spending ?? 0}
              activeMonth={activeSummary?.month}
            />
          </GlassCard>

          {/* Category Budgets + Credit Snapshot side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <GlassCard>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white/80 mb-3">Top Categories</h3>
              <CategoryBudgets summaries={summaries} categories={categories} activeMonth={activeSummary?.month} onCategoryClick={openCategoryDialog} />
            </GlassCard>

            <GlassCard>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white/80 mb-3">Credit Snapshot</h3>
              {activeSummary && (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600 dark:text-white/50">Credit Payment (Prior Month)</span>
                      <span className="font-semibold text-gold-400">{formatIdr(activeSummary.outcome.credit_payment ?? 0)}</span>
                    </div>
                    <div className="w-full bg-slate-200/60 dark:bg-white/[0.06] rounded-full h-2">
                      <div className="bg-gold-500 h-2 rounded-full transition-all" style={{ width: `${activeSummary.outcome.total > 0 ? Math.round(((activeSummary.outcome.credit_payment ?? 0) / activeSummary.outcome.total) * 100) : 0}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600 dark:text-white/50">Current Month Credit Expenses</span>
                      <span className="font-semibold text-coral-400">{formatIdr(activeSummary.outcome.credit_expenses ?? 0)}</span>
                    </div>
                    <div className="w-full bg-slate-200/60 dark:bg-white/[0.06] rounded-full h-2">
                      <div className="bg-coral-500 h-2 rounded-full transition-all" style={{ width: `${activeSummary.outcome.total > 0 ? Math.round(((activeSummary.outcome.credit_expenses ?? 0) / activeSummary.outcome.total) * 100) : 0}%` }} />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-white/40">Credit expenses this month will be paid next month.</p>
                </div>
              )}
            </GlassCard>
          </div>

          {/* Top Merchants — merchant/title-level spend breakdown */}
          <GlassCard className="mb-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white/80 mb-3">Top Merchants</h3>
            <TopMerchantsMini transactions={filteredTransactions} activePeriodId={activeSummary?.period_id ?? null} />
          </GlassCard>
        </section>

        {/* ═══════════ SECTION 3: ACT — "Apa yang harus dilakukan?" ═══════════ */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-white/40">Act</p>
            {/* Alert bell */}
            <button onClick={() => setShowAlerts(!showAlerts)} className="relative p-2 rounded-xl hover:bg-slate-200/50 dark:bg-white/10 transition">
              <Bell className="w-5 h-5 text-slate-500 dark:text-white/40" strokeWidth={1.8} />
              {/* Red dot if kickoff is ready (as a nudge) */}
              {kickoffBanner?.show && <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ef4444' }} />}
            </button>
          </div>

          {/* Expandable alerts */}
          {showAlerts && (
            <GlassCard className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white/80">Alerts</h3>
                <button onClick={() => setShowAlerts(false)} className="text-slate-500 dark:text-white/30 hover:text-slate-600 dark:text-white/60"><X className="w-4 h-4" /></button>
              </div>
              <AlertsPanel month={activeSummary?.month} summaries={summaries} categories={categories} transactions={transactions} recurringTitles={recurringTitles} />
            </GlassCard>
          )}

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3 mb-4">
            <a href="/add" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-900 dark:text-white transition-all hover:scale-105 no-underline" style={{ background: 'linear-gradient(135deg, #34d399, #0ea5e9)' }}>
              <Plus className="w-4 h-4" /> Add Transaction
            </a>
            {kickoffBanner?.show && (
              <Button onClick={() => setKickoffOpen(true)} variant="secondary" size="sm" className="bg-slate-200/60 dark:bg-white/[0.08] text-slate-800 dark:text-white/80 hover:bg-slate-300/50 dark:bg-white/[0.15] border-slate-300 dark:border-white/[0.1] h-auto py-2.5 px-4 rounded-xl">
                💰 Start {kickoffBanner.nextMonth} ({kickoffBanner.recurringCount} recurring)
              </Button>
            )}
          </div>

          <MonthKickoffModal open={kickoffOpen} onOpenChange={setKickoffOpen} nextMonth={kickoffBanner?.nextMonth || ''} recurringCount={kickoffBanner?.recurringCount || 0} onSuccess={() => { setKickoffBanner(null); window.location.reload(); }} />
        </section>

        {/* ═══════════ SECTION 4: INSIGHTS — "Pahami lebih dalam" ═══════════ */}
        <section>
          <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-white/40 mb-3">Insights</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Net Worth mini chart */}
            <GlassCard className="lg:col-span-2">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white/80 mb-2">Net Worth Trend</h3>
              <div className="h-48">
                <NetworthChart data={filteredNetworth} />
              </div>
            </GlassCard>

            {/* Runway snapshot */}
            <GlassCard>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white/80 mb-3">Runway</h3>
              {runwayData ? (
                <div>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ backgroundColor: runwayData.status === 'healthy' ? 'rgba(52,211,153,0.12)' : runwayData.status === 'caution' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)' }}>
                      {runwayData.status === 'healthy' ? <Shield className="w-5 h-5" style={{ color: '#34d399' }} strokeWidth={1.8} /> : runwayData.status === 'caution' ? <AlertTriangle className="w-5 h-5" style={{ color: '#f59e0b' }} strokeWidth={1.8} /> : <AlertTriangle className="w-5 h-5" style={{ color: '#ef4444' }} strokeWidth={1.8} />}
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{runwayData.runway_months.toFixed(1)}</p>
                      <p className="text-xs text-slate-500 dark:text-white/40">months of emergency fund</p>
                    </div>
                  </div>
                  <a href="/runway" className="block mt-2 text-xs text-mint-500 hover:text-mint-400 no-underline">View details →</a>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-200/60 dark:bg-white/[0.06]">
                    <Shield className="w-5 h-5 text-slate-400 dark:text-white/20" strokeWidth={1.8} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-300 dark:text-white/20">—</p>
                    <p className="text-xs text-slate-500 dark:text-white/40">months of emergency fund</p>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>

          {/* Financial Insights — compact */}
          <GlassCard className="mb-4">
            <FinancialInsights transactions={transactions} networth={networth} summaries={summaries} categories={categories} activeMonth={activeSummary?.month} />
          </GlassCard>
        </section>

        {/* ═══════════ SECTION 5: FEED — Recent transactions ═══════════ */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-white/40">Feed</p>
            <a href="/transactions" className="text-xs text-slate-500 dark:text-white/40 hover:text-slate-700 dark:text-white/70 no-underline">View all →</a>
          </div>

          <GlassCard className="p-0 overflow-hidden">
            {/* Search bar */}
            <div className="relative px-4 pt-3 pb-2">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/30" />
              <input
                ref={feedSearchRef}
                type="text"
                placeholder="Search transactions... ( / )"
                value={feedSearch}
                onChange={(e) => { setFeedSearch(e.target.value); setTxPage(1); }}
                className="w-full pl-9 pr-8 py-2 text-sm rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-white/80 placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-mint-500/30 focus:border-mint-500/50 transition"
              />
              {feedSearch && (
                <button onClick={() => { setFeedSearch(''); setTxPage(1); }} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30 hover:text-slate-600 dark:text-white/60 transition">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {feedSearch && (
                <p className="mt-1 text-[11px] text-slate-500 dark:text-white/40">
                  {searchedTransactions.length} result{searchedTransactions.length !== 1 ? 's' : ''} found
                </p>
              )}
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 dark:border-white/[0.05]">
                    <SortableHeader sortKey="paid" currentDirection={isSorted('paid')} onSort={toggleSort}>Paid</SortableHeader>
                    <SortableHeader sortKey="title" currentDirection={isSorted('title')} onSort={toggleSort}>Title</SortableHeader>
                    <SortableHeader sortKey="category" currentDirection={isSorted('category')} onSort={toggleSort}>Category</SortableHeader>
                    <SortableHeader sortKey="date" currentDirection={isSorted('date')} onSort={toggleSort}>Date</SortableHeader>
                    <SortableHeader sortKey="amount" currentDirection={isSorted('amount')} onSort={toggleSort} className="text-right">Amount</SortableHeader>
                    <SortableHeader sortKey="type" currentDirection={isSorted('type')} onSort={toggleSort}>Type</SortableHeader>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedTransactions.map(row => {
                    const createdDate = parseCreatedTime(row);
                    const dateStr = isNaN(createdDate.getTime()) ? row.date : createdDate.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
                    const typeClass = row.type === 'cash' ? 'text-mint-400' : row.type === 'credit_payment' ? 'text-gold-400' : 'text-coral-400';
                    const typeLabel = row.type === 'cash' ? 'Cash' : row.type === 'credit_payment' ? 'Credit Pay' : 'Credit';
                    return (
                      <TableRow key={row.id} className="border-slate-200 dark:border-white/[0.03] hover:bg-slate-100 dark:bg-white/[0.03]">
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={async () => {
                            const newDone = !row.done;
                            setLocalTransactions(prev => prev.map(t => t.id === row.id ? { ...t, done: newDone ? 1 : 0 } as Transaction : t));
                            try {
                              await toggleTransactionDoneApi(row.id, newDone);
                              toast.success(newDone ? 'Marked as paid' : 'Marked as unpaid');
                            } catch {
                              setLocalTransactions(prev => prev.map(t => t.id === row.id ? { ...t, done: newDone ? 0 : 1 } as Transaction : t));
                              toast.error('Failed to update payment status');
                            }
                          }} className="h-7 text-xs font-semibold px-2 py-0" style={{ backgroundColor: row.done ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.12)', color: row.done ? '#34d399' : '#ef4444' }}>
                            {row.done ? 'Paid' : 'Unpaid'}
                          </Button>
                        </TableCell>
                        <TableCell className="text-slate-800 dark:text-white/80">{row.title}</TableCell>
                        <TableCell><Badge variant="secondary" style={{ backgroundColor: categoryMap[row.category]?.color || undefined, color: categoryMap[row.category]?.color ? '#fff' : undefined }}>{row.category}</Badge></TableCell>
                        <TableCell className="text-slate-500 dark:text-white/40 text-xs">{dateStr}</TableCell>
                        <TableCell className="font-medium text-right text-slate-800 dark:text-white/90">{formatIdr(row.amount)}</TableCell>
                        <TableCell className={`${typeClass} text-xs font-semibold uppercase`}>{typeLabel}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-600 dark:text-white/50 hover:text-slate-800 dark:text-white/80" onClick={() => startEdit(row)}>Edit</Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-red-400 hover:text-red-300" onClick={async () => { const confirmed = await confirmAction({ title: 'Delete Transaction', description: `Delete "${row.title}" (${formatIdr(row.amount)})?`, confirmLabel: 'Delete', variant: 'destructive' }); if (!confirmed) return; try { await deleteTransactionApi(row.id); setLocalTransactions(prev => prev.filter(t => t.id !== row.id)); toast.success(`"${row.title}" deleted`); } catch { toast.error('Failed to delete transaction'); } }}>Delete</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {feedSearch && pagedTransactions.length === 0 && (
                <div className="py-8 text-center">
                  <Search className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-white/20" />
                  <p className="text-sm text-slate-500 dark:text-white/40">No transactions match "{feedSearch}"</p>
                  <button onClick={() => { setFeedSearch(''); setTxPage(1); }} className="mt-2 text-xs text-mint-500 hover:text-mint-400 transition">Clear search</button>
                </div>
              )}
            </div>

            <EditTransactionDialog open={editingId !== null} transaction={editForm} onChange={handleChange} onSave={saveEdit} onCancel={cancelEdit} periods={summaries.map(s => ({ period_id: s.period_id, month: s.month }))} categories={categories.map(c => c.name)} />

            {searchedTransactions.length > txPerPage && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-white/[0.05]">
                <p className="text-xs text-slate-500 dark:text-white/30">Showing {(txPage - 1) * txPerPage + 1}–{Math.min(txPage * txPerPage, searchedTransactions.length)} of {searchedTransactions.length}</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => goToPage(txPage - 1)} disabled={txPage <= 1} className="h-7 text-xs bg-slate-100 dark:bg-white/[0.05] border-slate-300 dark:border-white/[0.08] text-slate-600 dark:text-white/60">Previous</Button>
                  <span className="text-xs text-slate-500 dark:text-white/30 min-w-[3rem] text-center">{txPage} / {totalTxPages}</span>
                  <Button variant="outline" size="sm" onClick={() => goToPage(txPage + 1)} disabled={txPage >= totalTxPages} className="h-7 text-xs bg-slate-100 dark:bg-white/[0.05] border-slate-300 dark:border-white/[0.08] text-slate-600 dark:text-white/60">Next</Button>
                </div>
              </div>
            )}
          </GlassCard>
        </section>

        {/* ═══════════ CHARTS — lower section ═══════════ */}
        <section>
          <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-white/40 mb-3">Charts</p>
          <div className="glass-card p-5 bg-slate-100 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] mb-4">
            <h3 className="text-base font-semibold text-slate-800 dark:text-white/80">Cash Outcome vs Credit Payment</h3><OutcomeChart data={filteredSummaries} /></div>
          <div className="glass-card p-5 bg-slate-100 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] mb-4">
            <h3 className="text-base font-semibold text-slate-800 dark:text-white/80">Savings Rate Trend</h3><SavingsRateChart data={filteredSummaries} /></div>
          <div className="glass-card p-5 bg-slate-100 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] mb-4">
            <h3 className="text-base font-semibold text-slate-800 dark:text-white/80">Category Spending Trend</h3><CategoryTrendChart data={filteredSummaries} categories={categories} /></div>
          <div className="mb-4">
            <div className="glass-card p-5 bg-slate-100 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06]"><h3 className="text-base font-semibold text-slate-800 dark:text-white/80">{isAllTime ? 'Latest Month Categories' : `${activeSummary?.month ?? ''} Categories`}</h3>{activeSummary?.category_totals && Object.keys(activeSummary.category_totals).length > 0 ? <CategoryChart data={activeSummary.category_totals} categories={categories} onCategoryClick={openCategoryDialog} /> : <p className="text-slate-500 dark:text-white/30 text-sm">No category data available.</p>}</div>
          </div>
          <PeriodVsAverage summaries={filteredSummaries} categories={categories} activePeriodId={filterPeriodId} />
        </section>

        {/* ═══════════ Category Drill-Down Dialog ═══════════ */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-100 dark:bg-navy-800 border-slate-300 dark:border-white/[0.08]">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">{selectedCategory} — {activeSummary?.month}</DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-white/40">
                {(() => { const catTxs = transactions.filter(t => t.category === selectedCategory && t.period_id === activeSummary?.period_id); const total = catTxs.reduce((sum, t) => sum + t.amount, 0); return `${catTxs.length} transaction${catTxs.length !== 1 ? 's' : ''} • Total: ${formatIdr(total)}`; })()}
              </DialogDescription>
            </DialogHeader>
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-white/70 mb-2">Outcome by Category</h4>
              <OutcomeBarChart data={activeSummary?.category_totals || {}} categories={categories} highlightCategory={selectedCategory} summaries={summaries} />
            </div>
            <div>
              {(() => { const catTxs = transactions.filter(t => t.category === selectedCategory && t.period_id === activeSummary?.period_id).sort((a, b) => parseCreatedTime(b).getTime() - parseCreatedTime(a).getTime()); if (catTxs.length === 0) return <p className="text-sm text-slate-500 dark:text-white/30">No transactions found.</p>; return (
                <Table>
                  <TableHeader><TableRow className="border-slate-200 dark:border-white/[0.05]"><TableHead className="text-slate-600 dark:text-white/50">Title</TableHead><TableHead className="text-slate-600 dark:text-white/50">Date</TableHead><TableHead className="text-right text-slate-600 dark:text-white/50">Amount</TableHead><TableHead className="text-slate-600 dark:text-white/50">Type</TableHead></TableRow></TableHeader>
                  <TableBody>{catTxs.map(t => { const d = parseCreatedTime(t); const dateStr = isNaN(d.getTime()) ? t.date : d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }); const typeLabel = t.type === 'cash' ? 'Cash' : t.type === 'credit_payment' ? 'Credit Pay' : 'Credit'; return (<TableRow key={t.id} className="border-slate-200 dark:border-white/[0.03]"><TableCell className="font-medium text-slate-800 dark:text-white/80">{t.title}</TableCell><TableCell className="text-slate-500 dark:text-white/40 text-xs">{dateStr}</TableCell><TableCell className="text-right font-medium text-slate-800 dark:text-white/90">{formatIdr(t.amount)}</TableCell><TableCell className="text-xs font-semibold uppercase"><Badge variant="outline" className="border-slate-300 dark:border-white/[0.1]">{typeLabel}</Badge></TableCell></TableRow>); })}</TableBody>
                </Table>
              ); })()}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </LazyMotion>
  );
}
