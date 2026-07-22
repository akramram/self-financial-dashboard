import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Transaction, MonthlySummary, Category } from '../lib/data';
import { formatIdr, formatNumber } from '../lib/utils';
import { fetchTransactions, fetchSummaries, fetchCategories } from '../lib/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { CreditCard, ArrowDownLeft, ArrowUpRight, TrendingUp, AlertTriangle, CheckCircle2, Wallet, Clock } from 'lucide-react';
import { useSortState } from '../hooks/useSortState';
import SortableHeader from './SortableHeader';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

export default function CreditCardTracker() {
  const [summaries, setSummaries] = useState<MonthlySummary[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('latest');

  // All hooks BEFORE any early returns (Rules of Hooks)
  const { toggleSort, sortData, isSorted } = useSortState();

  useEffect(() => {
    Promise.all([
      fetchSummaries(),
      fetchTransactions(),
      fetchCategories(),
    ])
      .then(([s, t, c]) => {
        setSummaries(s);
        setTransactions(t);
        setCategories(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Build period options from summaries (newest first)
  const periodOptions = useMemo(() => {
    const seen = new Set<string>();
    return summaries
      .filter((s) => {
        if (seen.has(s.month)) return false;
        seen.add(s.month);
        return true;
      })
      .reverse();
  }, [summaries]);

  const activeSummary = useMemo(() => {
    if (selectedPeriod === 'latest') return periodOptions[0] ?? null;
    return summaries.find((s) => s.month === selectedPeriod) ?? periodOptions[0] ?? null;
  }, [selectedPeriod, summaries, periodOptions]);

  const filteredTransactions = useMemo(() => {
    if (!activeSummary) return [];
    return transactions.filter((t) => t.period_id === activeSummary.period_id);
  }, [transactions, activeSummary]);

  const creditExpenses = useMemo(() => {
    return filteredTransactions.filter(
      (t) => t.type === 'credit_expense' && t.done
    );
  }, [filteredTransactions]);

  const creditPayments = useMemo(() => {
    return filteredTransactions.filter(
      (t) => t.type === 'credit_payment' && t.done
    );
  }, [filteredTransactions]);

  const unpaidCreditExpenses = useMemo(() => {
    return filteredTransactions.filter(
      (t) => t.type === 'credit_expense' && !t.done
    );
  }, [filteredTransactions]);

  const totalCreditExpenses = creditExpenses.reduce((sum, t) => sum + t.amount, 0);
  const totalCreditPayments = creditPayments.reduce((sum, t) => sum + t.amount, 0);
  const unpaidTotal = unpaidCreditExpenses.reduce((sum, t) => sum + t.amount, 0);
  const outstandingBalance = totalCreditExpenses + unpaidTotal;

  // Credit balance trend over all periods (expenses - payments)
  const balanceTrend = useMemo(() => {
    const sorted = [...summaries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let runningBalance = 0;
    return sorted.map((s) => {
      const periodTxs = transactions.filter((t) => t.period_id === s.period_id);
      const expenses = periodTxs
        .filter((t) => t.type === 'credit_expense' && t.done)
        .reduce((sum, t) => sum + t.amount, 0);
      const payments = periodTxs
        .filter((t) => t.type === 'credit_payment' && t.done)
        .reduce((sum, t) => sum + t.amount, 0);
      runningBalance = runningBalance + expenses - payments;
      return {
        month: s.month,
        expenses,
        payments,
        balance: runningBalance,
      };
    });
  }, [summaries, transactions]);

  // Category breakdown for credit expenses
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { total: number; count: number; paid: number }> = {};
    for (const t of [...creditExpenses, ...unpaidCreditExpenses]) {
      if (!map[t.category]) map[t.category] = { total: 0, count: 0, paid: 0 };
      map[t.category].total += t.amount;
      map[t.category].count++;
      if (t.done) map[t.category].paid += t.amount;
    }
    return Object.entries(map)
      .sort((a, b) => b[1].total - a[1].total);
  }, [creditExpenses, unpaidCreditExpenses]);

  const categoryColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((c) => { map[c.name] = c.color; });
    return map;
  }, [categories]);

  // Sortable tables
  const getUnpaidCellValue = useCallback((t: Transaction, key: string): string | number => {
    switch (key) {
      case 'title': return t.title;
      case 'category': return t.category;
      case 'amount': return t.amount;
      case 'date': return new Date(t.created_time || t.date).getTime();
      case 'payment_method': return t.payment_method;
      default: return '';
    }
  }, []);

  const sortedUnpaid = useMemo(() => {
    return sortData(
      unpaidCreditExpenses,
      getUnpaidCellValue,
      (data) => [...data].sort((a, b) => b.amount - a.amount)
    );
  }, [unpaidCreditExpenses, sortData, getUnpaidCellValue]);

  const getPaymentCellValue = useCallback((t: Transaction, key: string): string | number => {
    switch (key) {
      case 'title': return t.title;
      case 'amount': return t.amount;
      case 'date': return new Date(t.created_time || t.date).getTime();
      default: return '';
    }
  }, []);

  const sortedPayments = useMemo(() => {
    return sortData(
      creditPayments,
      getPaymentCellValue,
      (data) => [...data].sort((a, b) => new Date(b.created_time || b.date).getTime() - new Date(a.created_time || a.date).getTime())
    );
  }, [creditPayments, sortData, getPaymentCellValue]);

  // Payment ratio (how much of credit expenses have been paid)
  const paymentRatio = outstandingBalance > 0
    ? Math.min(100, (totalCreditPayments / outstandingBalance) * 100)
    : 100;

  // Line chart data for balance trend
  const balanceChartData = useMemo(() => ({
    labels: balanceTrend.map((b) => b.month),
    datasets: [
      {
        label: 'Outstanding Balance',
        data: balanceTrend.map((b) => b.balance),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  }), [balanceTrend]);

  const balanceChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `Balance: ${formatIdr(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => formatIdr(value).replace('IDR ', ''),
        },
      },
    },
  }), []);

  // Bar chart data for expenses vs payments per period
  const comparisonChartData = useMemo(() => ({
    labels: balanceTrend.map((b) => b.month),
    datasets: [
      {
        label: 'Credit Expenses',
        data: balanceTrend.map((b) => b.expenses),
        backgroundColor: '#ef4444',
        borderRadius: 4,
      },
      {
        label: 'Credit Payments',
        data: balanceTrend.map((b) => b.payments),
        backgroundColor: '#10b981',
        borderRadius: 4,
      },
    ],
  }), [balanceTrend]);

  const comparisonChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { boxWidth: 12, padding: 16 },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${formatIdr(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => formatIdr(value).replace('IDR ', ''),
        },
      },
    },
  }), []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        <span className="ml-3 text-white/50">Loading credit card data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="flex items-center gap-3">
        <CreditCard className="w-5 h-5 text-amber-500" />
        <span className="text-sm font-medium text-white/60">Period:</span>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">Latest Period</SelectItem>
            {periodOptions.map((p) => (
              <SelectItem key={p.month} value={p.month}>{p.month}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Outstanding Balance */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-white/50">Outstanding Balance</span>
            </div>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {formatIdr(outstandingBalance)}
            </p>
            <p className="text-xs text-white/40 mt-1">
              {formatNumber(creditExpenses.length)} transactions + {formatNumber(unpaidCreditExpenses.length)} pending
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Paid This Period */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-white/50">Paid This Period</span>
            </div>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatIdr(totalCreditPayments)}
            </p>
            <p className="text-xs text-white/40 mt-1">
              {formatNumber(creditPayments.length)} payment{creditPayments.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Unpaid Expenses */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-red-500" />
              <span className="text-xs text-white/50">Unpaid Expenses</span>
            </div>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">
              {formatIdr(unpaidTotal)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {formatNumber(unpaidCreditExpenses.length)} item{unpaidCreditExpenses.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Payment Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-white/50">Payment Coverage</span>
            </div>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {paymentRatio.toFixed(0)}%
            </p>
            <div className="w-full bg-white/[0.08] rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  paymentRatio >= 100
                    ? 'bg-emerald-500'
                    : paymentRatio >= 70
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, paymentRatio)}%` }}
              />
            </div>
            <p className="text-xs text-white/40 mt-1">
              of {formatIdr(outstandingBalance)} charged
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Balance Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              Credit Balance Trend
            </CardTitle>
            <CardDescription>
              Running outstanding balance over time (expenses - payments)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: 280 }}>
              <Line data={balanceChartData} options={balanceChartOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Expenses vs Payments Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
              Expenses vs Payments
            </CardTitle>
            <CardDescription>
              Per-period credit card spending and payment amounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: 280 }}>
              <Bar data={comparisonChartData} options={comparisonChartOptions} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Credit Spending by Category</CardTitle>
            <CardDescription>
              Where your credit card spending goes in {activeSummary?.month || 'the selected period'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoryBreakdown.map(([cat, data]) => {
                const color = categoryColorMap[cat] || '#6b7280';
                const maxTotal = categoryBreakdown[0]?.[1].total || 1;
                const pctOfTotal = (data.total / maxTotal) * 100;
                const paidPct = data.total > 0 ? (data.paid / data.total) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-medium text-white/70">{cat}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {data.count}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <span className="text-xs text-white/40">
                          {paidPct.toFixed(0)}% paid
                        </span>
                        <span className="text-sm font-semibold">{formatIdr(data.total)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <div className="flex-1 bg-white/[0.05] rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${pctOfTotal}%`,
                            backgroundColor: color,
                            opacity: 0.4 + (paidPct / 100) * 0.6,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unpaid Credit Expenses Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Unpaid Credit Expenses
              </CardTitle>
              <CardDescription>
                Credit card charges waiting to be paid ({unpaidCreditExpenses.length} item{unpaidCreditExpenses.length !== 1 ? 's' : ''})
              </CardDescription>
            </div>
            {unpaidTotal > 0 && (
              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                {formatIdr(unpaidTotal)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {sortedUnpaid.length === 0 ? (
            <div className="text-center py-8 text-white/40">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
              <p className="text-sm">All credit expenses are paid! 🎉</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader label="Title" sortKey="title" toggleSort={toggleSort} isSorted={isSorted} />
                  <SortableHeader label="Category" sortKey="category" toggleSort={toggleSort} isSorted={isSorted} />
                  <SortableHeader label="Amount" sortKey="amount" toggleSort={toggleSort} isSorted={isSorted} align="right" />
                  <SortableHeader label="Payment Method" sortKey="payment_method" toggleSort={toggleSort} isSorted={isSorted} />
                  <TableHead className="w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUnpaid.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">{tx.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: categoryColorMap[tx.category] || '#6b7280' }}
                        />
                        {tx.category}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-red-600 dark:text-red-400">
                      {formatIdr(tx.amount)}
                    </TableCell>
                    <TableCell className="text-white/50">{tx.payment_method}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 text-[10px]">
                        Pending
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                Payment History
              </CardTitle>
              <CardDescription>
                Credit card payments in this period
              </CardDescription>
            </div>
            {totalCreditPayments > 0 && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                {formatIdr(totalCreditPayments)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {sortedPayments.length === 0 ? (
            <div className="text-center py-8 text-white/40">
              <Wallet className="w-8 h-8 mx-auto mb-2 text-white/30" />
              <p className="text-sm">No credit card payments recorded yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader label="Title" sortKey="title" toggleSort={toggleSort} isSorted={isSorted} />
                  <SortableHeader label="Amount" sortKey="amount" toggleSort={toggleSort} isSorted={isSorted} align="right" />
                  <SortableHeader label="Date" sortKey="date" toggleSort={toggleSort} isSorted={isSorted} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPayments.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">{tx.title}</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatIdr(tx.amount)}
                    </TableCell>
                    <TableCell className="text-white/50 text-sm">
                      {tx.created_time
                        ? new Date(tx.created_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Balance Trend Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Period-by-Period Summary</CardTitle>
          <CardDescription>
            Credit expenses, payments, and running balance for each period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Payments</TableHead>
                <TableHead className="text-right">Running Balance</TableHead>
                <TableHead className="w-[80px]">Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balanceTrend.map((b, i) => {
                const prev = i > 0 ? balanceTrend[i - 1].balance : 0;
                const trend = b.balance - prev;
                return (
                  <TableRow key={b.month}>
                    <TableCell className="font-medium">{b.month}</TableCell>
                    <TableCell className="text-right text-red-600 dark:text-red-400">
                      {formatIdr(b.expenses)}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                      {formatIdr(b.payments)}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${b.balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {formatIdr(b.balance)}
                    </TableCell>
                    <TableCell>
                      {trend > 0 ? (
                        <TrendingUp className="w-4 h-4 text-red-500 inline" />
                      ) : trend < 0 ? (
                        <TrendingUp className="w-4 h-4 text-emerald-500 inline rotate-180" />
                      ) : (
                        <span className="text-white/40">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
