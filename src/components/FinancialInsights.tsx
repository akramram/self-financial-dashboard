import React, { useMemo } from 'react';
import type { Transaction, NetworthRecord, MonthlySummary, Category } from '../lib/data';
import { formatIdr } from '../lib/utils';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Wallet, PiggyBank, Receipt } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  networth: NetworthRecord[];
  summaries: MonthlySummary[];
  categories: Category[];
  activeMonth: string;
}

interface Insight {
  id: string;
  type: 'success' | 'warning' | 'danger' | 'info';
  icon: React.ReactNode;
  title: string;
  message: string;
}

export default function FinancialInsights({ transactions, networth, summaries, categories, activeMonth }: Props) {
  const insights = useMemo(() => {
    const list: Insight[] = [];

    const currentSummary = summaries.find((s) => s.month === activeMonth);
    const prevSummary = summaries
      .filter((s) => new Date(s.date).getTime() < new Date(currentSummary?.date || 0).getTime())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    const currentNetworth = networth.find((n) => n.month === activeMonth);
    const prevNetworth = networth
      .filter((n) => new Date(n.date).getTime() < new Date(currentNetworth?.date || 0).getTime())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    const monthTxs = transactions.filter((t) => t.month === activeMonth);
    const unpaidTxs = monthTxs.filter((t) => !t.done);

    // 1. Budget alerts
    if (currentSummary?.category_totals) {
      const categoryMap = new Map(categories.map((c) => [c.name, c]));
      const overspent: string[] = [];
      const nearLimit: string[] = [];

      Object.entries(currentSummary.category_totals).forEach(([cat, amount]) => {
        const limit = categoryMap.get(cat)?.monthly_limit ?? 0;
        if (limit > 0) {
          const pct = (amount / limit) * 100;
          if (pct > 100) overspent.push(cat);
          else if (pct >= 80) nearLimit.push(cat);
        }
      });

      if (overspent.length > 0) {
        list.push({
          id: 'overspent',
          type: 'danger',
          icon: <AlertTriangle className="w-4 h-4" />,
          title: 'Over Budget',
          message: `${overspent.length} categor${overspent.length === 1 ? 'y is' : 'ies are'} over budget: ${overspent.join(', ')}`,
        });
      }
      if (nearLimit.length > 0) {
        list.push({
          id: 'near-limit',
          type: 'warning',
          icon: <AlertTriangle className="w-4 h-4" />,
          title: 'Near Budget Limit',
          message: `${nearLimit.length} categor${nearLimit.length === 1 ? 'y is' : 'ies are'} at ≥80% of budget: ${nearLimit.join(', ')}`,
        });
      }
    }

    // 2. Spending trend vs previous month
    if (currentSummary && prevSummary) {
      const currTotal = currentSummary.outcome.total;
      const prevTotal = prevSummary.outcome.total;
      if (prevTotal > 0) {
        const change = ((currTotal - prevTotal) / prevTotal) * 100;
        const isUp = change > 0;
        list.push({
          id: 'spending-trend',
          type: isUp ? 'warning' : 'success',
          icon: isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />,
          title: 'Spending Trend',
          message: `Total spending is ${isUp ? 'up' : 'down'} ${Math.abs(change).toFixed(1)}% vs ${prevSummary.month} (${formatIdr(currTotal)} vs ${formatIdr(prevTotal)})`,
        });
      }
    }

    // 3. Unpaid transactions
    if (unpaidTxs.length > 0) {
      const totalUnpaid = unpaidTxs.reduce((s, t) => s + t.amount, 0);
      list.push({
        id: 'unpaid',
        type: 'warning',
        icon: <Receipt className="w-4 h-4" />,
        title: 'Unpaid Transactions',
        message: `${unpaidTxs.length} unpaid bill${unpaidTxs.length === 1 ? '' : 's'} totaling ${formatIdr(totalUnpaid)}`,
      });
    } else {
      list.push({
        id: 'all-paid',
        type: 'success',
        icon: <CheckCircle className="w-4 h-4" />,
        title: 'All Caught Up',
        message: `All transactions for ${activeMonth} are marked as paid`,
      });
    }

    // 4. Networth trend
    if (currentNetworth && prevNetworth) {
      const change = currentNetworth.month_over_month_change ?? 0;
      const pct = currentNetworth.month_over_month_pct ?? 0;
      const isUp = change >= 0;
      list.push({
        id: 'networth-trend',
        type: isUp ? 'success' : 'danger',
        icon: isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />,
        title: 'Networth Change',
        message: `Networth ${isUp ? 'grew' : 'dropped'} by ${formatIdr(Math.abs(change))} (${isUp ? '+' : ''}${pct}%) vs last month`,
      });
    }

    // 5. Savings rate insight
    if (currentSummary) {
      const rate = currentSummary.savings_rate_pct;
      if (rate < 0) {
        list.push({
          id: 'negative-savings',
          type: 'danger',
          icon: <PiggyBank className="w-4 h-4" />,
          title: 'Negative Savings',
          message: `You spent ${formatIdr(Math.abs(currentSummary.savings))} more than you earned this month`,
        });
      } else if (rate < 10) {
        list.push({
          id: 'low-savings',
          type: 'warning',
          icon: <PiggyBank className="w-4 h-4" />,
          title: 'Low Savings Rate',
          message: `Savings rate is only ${rate.toFixed(1)}%. Try to keep it above 20%`,
        });
      } else {
        list.push({
          id: 'good-savings',
          type: 'success',
          icon: <PiggyBank className="w-4 h-4" />,
          title: 'Healthy Savings',
          message: `Savings rate is ${rate.toFixed(1)}% — great job!`,
        });
      }
    }

    return list;
  }, [transactions, networth, summaries, categories, activeMonth]);

  if (insights.length === 0) return null;

  const typeStyles = {
    success: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300',
    warning: 'bg-gold-500/5 dark:bg-gold-700/20 border-gold-400/20 dark:border-gold-700/40 text-gold-700 dark:text-gold-300',
    danger: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300',
    info: 'bg-mint-500/5 dark:bg-mint-700/20 border-mint-400/20 dark:border-mint-700/40 text-mint-600 dark:text-mint-300',
  };

  const badgeVariants = {
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' as const,
    warning: 'bg-gold-500/10 text-gold-700 dark:bg-gold-700/20 dark:text-gold-300' as const,
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' as const,
    info: 'bg-mint-500/10 text-mint-600 dark:bg-mint-700/20 dark:text-mint-300' as const,
  };

  return (
    <div className="glass-card p-5">
      
        <h3 className="text-base font-semibold flex items-center gap-2 text-white/80">
          <Wallet className="w-4 h-4 text-slate-500" />
          Insights
        </h3>
      
      
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${typeStyles[insight.type]}`}
            >
              <div className="mt-0.5 shrink-0">{insight.icon}</div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold uppercase tracking-wider">{insight.title}</span>
                  <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${badgeVariants[insight.type]}`}>
                    {insight.type === 'success' ? 'Good' : insight.type === 'warning' ? 'Watch' : insight.type === 'danger' ? 'Alert' : 'Info'}
                  </Badge>
                </div>
                <p className="text-sm leading-snug">{insight.message}</p>
              </div>
            </div>
          ))}
        </div>
      
    </div>
  );
}
