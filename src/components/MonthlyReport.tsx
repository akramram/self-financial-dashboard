import React, { useMemo, useState } from 'react';
import type { Transaction, NetworthRecord, MonthlySummary, Category } from '../lib/data';
import { formatIdr, getActivePeriodMonth } from '../lib/utils';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import {
  Printer,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

interface Props {
  summaries: MonthlySummary[];
  transactions: Transaction[];
  networth: NetworthRecord[];
  categories: Category[];
  anomalies?: {
    id: number;
    title: string;
    category: string;
    amount: number;
    severity: 'high' | 'medium' | 'low';
    detail: string;
  }[];
}

function parseCreatedTime(tx: Transaction): Date {
  if (tx.created_time) {
    const d = new Date(tx.created_time);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(tx.date);
}

export default function MonthlyReport({
  summaries,
  transactions,
  networth,
  categories,
  anomalies = [],
}: Props) {
  const periodOptions = useMemo(() => {
    return summaries
      .map((s) => ({ id: s.period_id, month: s.month }))
      .reverse();
  }, [summaries]);

  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(
    periodOptions.length > 0 ? periodOptions[0].id : null
  );

  const reportSummary = useMemo(() => {
    return summaries.find((s) => s.period_id === selectedPeriodId) ?? null;
  }, [summaries, selectedPeriodId]);

  const reportNetworth = useMemo(() => {
    return networth.find((n) => n.period_id === selectedPeriodId) ?? null;
  }, [networth, selectedPeriodId]);

  const reportTransactions = useMemo(() => {
    return transactions
      .filter((t) => t.period_id === selectedPeriodId)
      .sort((a, b) => parseCreatedTime(b).getTime() - parseCreatedTime(a).getTime());
  }, [transactions, selectedPeriodId]);

  const prevSummary = useMemo(() => {
    if (!reportSummary) return null;
    const idx = summaries.findIndex((s) => s.period_id === selectedPeriodId);
    if (idx <= 0) return null;
    return summaries[idx - 1];
  }, [summaries, selectedPeriodId, reportSummary]);

  const categoryMap = useMemo(() => {
    const map: Record<string, Category> = {};
    for (const c of categories) map[c.name] = c;
    return map;
  }, [categories]);

  const totalOutcome = reportSummary?.outcome.total ?? 0;
  const income = reportSummary?.income ?? 0;

  const categoryBreakdown = useMemo(() => {
    if (!reportSummary?.category_totals) return [];
    return Object.entries(reportSummary.category_totals)
      .map(([name, amount]) => {
        const cat = categoryMap[name];
        const limit = cat?.monthly_limit ?? 0;
        const pct = totalOutcome > 0 ? (amount / totalOutcome) * 100 : 0;
        return { name, amount, limit, pct, color: cat?.color };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [reportSummary, categoryMap, totalOutcome]);

  const topTransactions = useMemo(() => {
    return reportTransactions
      .filter((t) => t.done)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [reportTransactions]);

  const generatedAt = new Date().toLocaleString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handlePrint = () => {
    window.print();
  };

  if (!reportSummary) {
    return (
      <div className="text-center py-20">
        <p className="text-white/50 text-lg">
          No data available for the selected period.
        </p>
        <p className="text-white/40 text-sm mt-2">
          Add transactions and net worth data first.
        </p>
      </div>
    );
  }

  return (
    <div className="monthly-report">
      {/* Controls — hidden when printing */}
      <div className="print:hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Select
            value={selectedPeriodId?.toString() ?? ''}
            onValueChange={(v) => setSelectedPeriodId(parseInt(v))}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-white/50">
            {reportSummary.start_date && reportSummary.end_date
              ? `${reportSummary.start_date} → ${reportSummary.end_date}`
              : ''}
          </span>
        </div>
        <Button onClick={handlePrint} className="gap-2 print:hidden">
          <Printer className="w-4 h-4" />
          Print Report
        </Button>
      </div>

      {/* Report Content */}
      <div className="space-y-6">
        {/* Report Header */}
        <div className="text-center border-b border-white/[0.08] pb-6 print:pb-4">
          <h1 className="text-2xl font-bold text-white/90 print:text-black">
            Monthly Financial Report
          </h1>
          <h2 className="text-xl font-semibold text-white/70 mt-1 print:text-gray-700">
            {reportSummary.month}
          </h2>
          {reportSummary.start_date && reportSummary.end_date && (
            <p className="text-sm text-white/50 mt-1 print:text-gray-500">
              Period: {reportSummary.start_date} – {reportSummary.end_date}
            </p>
          )}
          <p className="text-xs text-white/40 mt-2 print:text-gray-400">
            Generated: {generatedAt}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
          <div className="glass-card p-5 print:border print:border-gray-300 print:shadow-none">
            <h3 className="text-sm font-medium text-white/50 print:text-gray-600 text-white/80">
                Total Income
              </h3>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 print:text-emerald-700">
                {formatIdr(income)}
              </p>
            </div>
          <div className="glass-card p-5 print:border print:border-gray-300 print:shadow-none">
            <h3 className="text-sm font-medium text-white/50 print:text-gray-600 text-white/80">
                Total Outcome
              </h3>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 print:text-red-700">
                {formatIdr(totalOutcome)}
              </p>
              <div className="text-xs text-white/40 mt-1 print:text-gray-500">
                <span className="inline-block mr-3">
                  Cash: {formatIdr(reportSummary.outcome.cash)}
                </span>
                <span className="inline-block">
                  Credit Pay: {formatIdr(reportSummary.outcome.credit_payment)}
                </span>
              </div>
            </div>
          <div className="glass-card p-5 print:border print:border-gray-300 print:shadow-none">
            <h3 className="text-sm font-medium text-white/50 print:text-gray-600 text-white/80">
                Savings
              </h3>
            <p
                className={`text-2xl font-bold ${
                  reportSummary.savings >= 0
                    ? 'text-emerald-600 dark:text-emerald-400 print:text-emerald-700'
                    : 'text-red-600 dark:text-red-400 print:text-red-700'
                }`}
              >
                {formatIdr(reportSummary.savings)}
              </p>
            </div>
          <div className="glass-card p-5 print:border print:border-gray-300 print:shadow-none">
            <h3 className="text-sm font-medium text-white/50 print:text-gray-600 text-white/80">
                Savings Rate
              </h3>
            <p
                className={`text-2xl font-bold ${
                  reportSummary.savings_rate_pct >= 20
                    ? 'text-emerald-600 dark:text-emerald-400 print:text-emerald-700'
                    : reportSummary.savings_rate_pct >= 0
                    ? 'text-gold-600 dark:text-gold-400 print:text-gold-700'
                    : 'text-red-600 dark:text-red-400 print:text-red-700'
                }`}
              >
                {reportSummary.savings_rate_pct.toFixed(1)}%
              </p>
            </div>
        </div>

        {/* Period-over-Period Comparison */}
        {prevSummary && (
          <div className="glass-card p-5 print:border print:border-gray-300 print:shadow-none">
            <h3 className="text-base font-semibold flex items-center gap-2 text-white/80">
                <ArrowRight className="w-4 h-4" />
                vs Previous Period ({prevSummary.month})
              </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                {(() => {
                  const incomeChange = prevSummary.income > 0
                    ? ((income - prevSummary.income) / prevSummary.income) * 100
                    : 0;
                  const spendChange = prevSummary.outcome.total > 0
                    ? ((totalOutcome - prevSummary.outcome.total) / prevSummary.outcome.total) * 100
                    : 0;
                  const savingsChange = reportSummary.savings_rate_pct - prevSummary.savings_rate_pct;
                  const nwCurrent = reportNetworth?.total ?? 0;
                  const prevNw = networth.find(
                    (n) => n.period_id === prevSummary.period_id
                  )?.total ?? 0;
                  const nwChange = prevNw > 0
                    ? ((nwCurrent - prevNw) / prevNw) * 100
                    : 0;

                  return (
                    <>
                      <div>
                        <p className="text-white/50 print:text-gray-600 text-xs">
                          Income Change
                        </p>
                        <p
                          className={`text-lg font-semibold flex items-center gap-1 ${
                            incomeChange >= 0
                              ? 'text-emerald-600 dark:text-emerald-400 print:text-emerald-700'
                              : 'text-red-600 dark:text-red-400 print:text-red-700'
                          }`}
                        >
                          {incomeChange >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          {incomeChange.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-white/50 print:text-gray-600 text-xs">
                          Spending Change
                        </p>
                        <p
                          className={`text-lg font-semibold flex items-center gap-1 ${
                            spendChange <= 0
                              ? 'text-emerald-600 dark:text-emerald-400 print:text-emerald-700'
                              : 'text-red-600 dark:text-red-400 print:text-red-700'
                          }`}
                        >
                          {spendChange <= 0 ? (
                            <TrendingDown className="w-4 h-4" />
                          ) : (
                            <TrendingUp className="w-4 h-4" />
                          )}
                          {spendChange >= 0 ? '+' : ''}
                          {spendChange.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-white/50 print:text-gray-600 text-xs">
                          Savings Rate Δ
                        </p>
                        <p
                          className={`text-lg font-semibold ${
                            savingsChange >= 0
                              ? 'text-emerald-600 dark:text-emerald-400 print:text-emerald-700'
                              : 'text-red-600 dark:text-red-400 print:text-red-700'
                          }`}
                        >
                          {savingsChange >= 0 ? '+' : ''}
                          {savingsChange.toFixed(1)} pp
                        </p>
                      </div>
                      <div>
                        <p className="text-white/50 print:text-gray-600 text-xs">
                          Net Worth Change
                        </p>
                        <p
                          className={`text-lg font-semibold flex items-center gap-1 ${
                            nwChange >= 0
                              ? 'text-emerald-600 dark:text-emerald-400 print:text-emerald-700'
                              : 'text-red-600 dark:text-red-400 print:text-red-700'
                          }`}
                        >
                          {nwChange >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          {nwChange.toFixed(1)}%
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
        )}

        {/* Two-column: Category Breakdown + Net Worth */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:grid-cols-3">
          {/* Category Breakdown */}
          <div className="glass-card p-5 lg:col-span-2 print:col-span-2 print:border print:border-gray-300 print:shadow-none">
            <h3 className="text-base font-semibold text-white/80">
                Category Breakdown
              </h3>
            {categoryBreakdown.length === 0 ? (
                <p className="text-sm text-white/50">No category data.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">% of Total</TableHead>
                      <TableHead className="text-right">Budget Limit</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryBreakdown.map((cat) => {
                      const isOver =
                        cat.limit > 0 && cat.amount > cat.limit;
                      return (
                        <TableRow key={cat.name}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {cat.color && (
                                <span
                                  className="w-3 h-3 rounded-full shrink-0"
                                  style={{ backgroundColor: cat.color }}
                                />
                              )}
                              <span className="font-medium">{cat.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatIdr(cat.amount)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {cat.pct.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right text-sm text-white/50">
                            {cat.limit > 0 ? formatIdr(cat.limit) : '—'}
                          </TableCell>
                          <TableCell>
                            {cat.limit > 0 ? (
                              isOver ? (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  Over by{' '}
                                  {Math.round(
                                    ((cat.amount - cat.limit) / cat.limit) * 100
                                  )}
                                  %
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-xs text-emerald-600 border-emerald-300"
                                >
                                  {Math.round((cat.amount / cat.limit) * 100)}%
                                </Badge>
                              )
                            ) : (
                              <span className="text-xs text-white/40">
                                No limit
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>

          {/* Net Worth Snapshot */}
          <div className="glass-card p-5 print:border print:border-gray-300 print:shadow-none">
            <h3 className="text-base font-semibold text-white/80">
                Net Worth
              </h3>
            {reportNetworth ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-white/50 print:text-gray-600">
                      Total
                    </p>
                    <p className="text-2xl font-bold text-white/90 print:text-black">
                      {formatIdr(reportNetworth.total)}
                    </p>
                  </div>
                  {reportNetworth.month_over_month_change != null && (
                    <div>
                      <p className="text-xs text-white/50 print:text-gray-600">
                        Month-over-Month
                      </p>
                      <p
                        className={`text-lg font-semibold flex items-center gap-1 ${
                          reportNetworth.month_over_month_change >= 0
                            ? 'text-emerald-600 dark:text-emerald-400 print:text-emerald-700'
                            : 'text-red-600 dark:text-red-400 print:text-red-700'
                        }`}
                      >
                        {reportNetworth.month_over_month_change >= 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        {formatIdr(reportNetworth.month_over_month_change)}
                        {reportNetworth.month_over_month_pct != null && (
                          <span className="text-sm ml-1">
                            (
                            {reportNetworth.month_over_month_pct >= 0
                              ? '+'
                              : ''}
                            {reportNetworth.month_over_month_pct.toFixed(1)}
                            %)
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                  {reportNetworth.breakdown &&
                    Object.keys(reportNetworth.breakdown).length > 0 && (
                      <div className="border-t border-white/[0.06] pt-3 print:border-gray-300">
                        <p className="text-xs text-white/50 mb-2 print:text-gray-600">
                          Composition
                        </p>
                        <div className="space-y-1.5">
                          {Object.entries(reportNetworth.breakdown)
                            .sort(([, a], [, b]) => b - a)
                            .map(([key, val]) => (
                              <div
                                key={key}
                                className="flex justify-between text-sm"
                              >
                                <span className="text-white/60 print:text-gray-700">
                                  {key}
                                </span>
                                <span className="font-medium font-mono">
                                  {formatIdr(val)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                </div>
              ) : (
                <p className="text-sm text-white/50">
                  No net worth data for this period.
                </p>
              )}
            </div>
        </div>

        {/* Top Transactions */}
        <div className="glass-card p-5 print:border print:border-gray-300 print:shadow-none">
          <h3 className="text-base font-semibold text-white/80">
              Top 10 Transactions
            </h3>
          {topTransactions.length === 0 ? (
              <p className="text-sm text-white/50">No transactions.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topTransactions.map((tx) => {
                    const d = parseCreatedTime(tx);
                    const dateStr = isNaN(d.getTime())
                      ? tx.date
                      : d.toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        });
                    const typeLabel =
                      tx.type === 'cash'
                        ? 'Cash'
                        : tx.type === 'credit_payment'
                        ? 'Credit Pay'
                        : 'Credit';

                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium">
                          {tx.title}
                        </TableCell>
                        <TableCell>{tx.category}</TableCell>
                        <TableCell className="text-sm text-white/50">
                          {dateStr}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {typeLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatIdr(tx.amount)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

        {/* Anomalies */}
        {anomalies.length > 0 && (
          <div className="glass-card p-5 print:border print:border-gray-300 print:shadow-none">
            <h3 className="text-base font-semibold flex items-center gap-2 text-white/80">
                <AlertTriangle className="w-4 h-4 text-gold-500" />
                Spending Anomalies
              </h3>
            <div className="space-y-3">
                {anomalies.map((a) => {
                  const severityColor =
                    a.severity === 'high'
                      ? 'bg-red-100 text-red-700 border-red-300'
                      : a.severity === 'medium'
                      ? 'bg-gold-500/10 text-gold-700 border-gold-400/30'
                      : 'bg-mint-500/10 text-mint-600 border-mint-400/30';
                  return (
                    <div
                      key={a.id}
                      className={`rounded-lg border p-3 ${severityColor} print:bg-transparent print:border-gray-300`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">{a.title}</p>
                          <p className="text-xs mt-0.5 opacity-80">{a.detail}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatIdr(a.amount)}</p>
                          <Badge
                            variant="outline"
                            className={`text-xs capitalize ${
                              a.severity === 'high'
                                ? 'border-red-300 text-red-700'
                                : a.severity === 'medium'
                                ? 'border-gold-400/30 text-gold-700'
                                : 'border-mint-400/30 text-mint-600'
                            }`}
                          >
                            {a.severity}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
        )}

        {/* Transaction Summary Stats */}
        <div className="glass-card p-5 print:border print:border-gray-300 print:shadow-none">
          <h3 className="text-base font-semibold text-white/80">
              Transaction Summary
            </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-white/50 print:text-gray-600">
                  Total Transactions
                </p>
                <p className="text-xl font-bold">
                  {reportTransactions.filter((t) => t.done).length}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/50 print:text-gray-600">
                  Avg Transaction
                </p>
                <p className="text-xl font-bold">
                  {(() => {
                    const done = reportTransactions.filter((t) => t.done);
                    if (done.length === 0) return formatIdr(0);
                    const avg =
                      done.reduce((s, t) => s + t.amount, 0) / done.length;
                    return formatIdr(avg);
                  })()}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/50 print:text-gray-600">
                  Largest Transaction
                </p>
                <p className="text-xl font-bold">
                  {topTransactions.length > 0
                    ? formatIdr(topTransactions[0].amount)
                    : formatIdr(0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/50 print:text-gray-600">
                  Categories Used
                </p>
                <p className="text-xl font-bold">
                  {categoryBreakdown.length}
                </p>
              </div>
            </div>
          </div>

        {/* Footer */}
        <div className="text-center text-xs text-white/40 pt-4 border-t border-white/[0.06] print:text-gray-500 print:border-gray-300">
          <p>Financial Dashboard · Monthly Report · {generatedAt}</p>
        </div>
      </div>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .monthly-report {
            max-width: 100% !important;
          }
          /* Hide dark mode backgrounds */
          .dark .monthly-report * {
            background-color: transparent !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
}
