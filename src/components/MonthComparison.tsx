import React, { useMemo, useState } from 'react';
import type { Transaction, NetworthRecord, MonthlySummary, Category } from '../lib/data';
import { formatIdr } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, TrendingDown, Wallet, PiggyBank, Landmark, Receipt, CreditCard, Banknote, ArrowLeftRight } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  networth: NetworthRecord[];
  summaries: MonthlySummary[];
  categories: Category[];
}

interface DeltaProps {
  current: number;
  previous: number;
  isPct?: boolean;
  inverse?: boolean;
}

function DeltaBadge({ current, previous, isPct, inverse }: DeltaProps) {
  if (previous === 0 && current === 0) {
    return <span className="text-xs text-muted-foreground flex items-center gap-1"><Minus className="w-3 h-3" /> 0%</span>;
  }
  if (previous === 0) {
    return <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" /> New</span>;
  }
  const change = current - previous;
  const pct = (change / Math.abs(previous)) * 100;
  const isPositive = change > 0;
  const isGood = inverse ? !isPositive : isPositive;
  const colorClass = isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <span className={`text-xs flex items-center gap-1 font-medium ${colorClass}`}>
      <Icon className="w-3 h-3" />
      {isPct ? `${Math.abs(pct).toFixed(1)}%` : `${Math.abs(pct).toFixed(1)}%`}
    </span>
  );
}

function DeltaValue({ current, previous, isPct, inverse }: DeltaProps) {
  if (previous === 0 && current === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  if (previous === 0) {
    return <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">New</span>;
  }
  const change = current - previous;
  const isPositive = change > 0;
  const isGood = inverse ? !isPositive : isPositive;
  const colorClass = isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
  const prefix = change > 0 ? '+' : '';

  return (
    <span className={`text-xs font-medium ${colorClass}`}>
      {prefix}{isPct ? `${change.toFixed(1)}%` : formatIdr(change)}
    </span>
  );
}

export default function MonthComparison({ transactions, networth, summaries, categories }: Props) {
  const months = useMemo(() => {
    return [...summaries].reverse().map((s) => s.month);
  }, [summaries]);

  const [leftMonth, setLeftMonth] = useState<string>(months[1] ?? months[0] ?? '');
  const [rightMonth, setRightMonth] = useState<string>(months[0] ?? '');

  const leftSummary = useMemo(() => summaries.find((s) => s.month === leftMonth), [summaries, leftMonth]);
  const rightSummary = useMemo(() => summaries.find((s) => s.month === rightMonth), [summaries, rightMonth]);
  const leftNetworth = useMemo(() => networth.find((n) => n.month === leftMonth), [networth, leftMonth]);
  const rightNetworth = useMemo(() => networth.find((n) => n.month === rightMonth), [networth, rightMonth]);

  const leftPeriodId = leftSummary?.period_id;
  const rightPeriodId = rightSummary?.period_id;

  const leftTxs = useMemo(() => transactions.filter((t) => t.period_id === leftPeriodId), [transactions, leftPeriodId]);
  const rightTxs = useMemo(() => transactions.filter((t) => t.period_id === rightPeriodId), [transactions, rightPeriodId]);

  const categoryMap = useMemo(() => {
    const map: Record<string, Category> = {};
    categories.forEach((c) => { map[c.name] = c; });
    return map;
  }, [categories]);

  const categoryComparison = useMemo(() => {
    const allCats = new Set<string>();
    if (leftSummary?.category_totals) Object.keys(leftSummary.category_totals).forEach((c) => allCats.add(c));
    if (rightSummary?.category_totals) Object.keys(rightSummary.category_totals).forEach((c) => allCats.add(c));

    return Array.from(allCats).map((cat) => {
      const leftAmt = leftSummary?.category_totals?.[cat] ?? 0;
      const rightAmt = rightSummary?.category_totals?.[cat] ?? 0;
      return {
        name: cat,
        left: leftAmt,
        right: rightAmt,
        delta: rightAmt - leftAmt,
        color: categoryMap[cat]?.color,
      };
    }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }, [leftSummary, rightSummary, categoryMap]);

  const txCountLeft = leftTxs.length;
  const txCountRight = rightTxs.length;
  const avgTxLeft = txCountLeft > 0 ? (leftSummary?.outcome.total ?? 0) / txCountLeft : 0;
  const avgTxRight = txCountRight > 0 ? (rightSummary?.outcome.total ?? 0) / txCountRight : 0;

  const MetricCard = ({
    label,
    icon,
    leftValue,
    rightValue,
    isPct,
    inverse,
    format = formatIdr,
  }: {
    label: string;
    icon: React.ReactNode;
    leftValue: number;
    rightValue: number;
    isPct?: boolean;
    inverse?: boolean;
    format?: (n: number) => string;
  }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            {icon}
          </div>
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">{leftMonth}</p>
            <p className="text-base font-semibold">{format(leftValue)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">{rightMonth}</p>
            <p className="text-base font-semibold">{format(rightValue)}</p>
            <div className="mt-1">
              <DeltaValue current={rightValue} previous={leftValue} isPct={isPct} inverse={inverse} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const handleSwap = () => {
    setLeftMonth(rightMonth);
    setRightMonth(leftMonth);
  };

  return (
    <div className="space-y-6">
      {/* Month Selectors */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Month A:</label>
          <Select value={leftMonth} onValueChange={setLeftMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-slate-400">vs</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleSwap}
            title="Swap months"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Month B:</label>
          <Select value={rightMonth} onValueChange={setRightMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          label="Income"
          icon={<Wallet className="w-4 h-4" />}
          leftValue={leftSummary?.income ?? 0}
          rightValue={rightSummary?.income ?? 0}
        />
        <MetricCard
          label="Total Spending"
          icon={<Receipt className="w-4 h-4" />}
          leftValue={leftSummary?.outcome.total ?? 0}
          rightValue={rightSummary?.outcome.total ?? 0}
          inverse
        />
        <MetricCard
          label="Savings"
          icon={<PiggyBank className="w-4 h-4" />}
          leftValue={leftSummary?.savings ?? 0}
          rightValue={rightSummary?.savings ?? 0}
        />
        <MetricCard
          label="Savings Rate"
          icon={<TrendingUp className="w-4 h-4" />}
          leftValue={leftSummary?.savings_rate_pct ?? 0}
          rightValue={rightSummary?.savings_rate_pct ?? 0}
          isPct
          format={(n) => `${n.toFixed(1)}%`}
        />
        <MetricCard
          label="Networth"
          icon={<Landmark className="w-4 h-4" />}
          leftValue={leftNetworth?.total ?? 0}
          rightValue={rightNetworth?.total ?? 0}
        />
        <MetricCard
          label="Avg. per Transaction"
          icon={<Banknote className="w-4 h-4" />}
          leftValue={avgTxLeft}
          rightValue={avgTxRight}
          inverse
        />
      </div>

      {/* Cash vs Credit Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-500" />
            Cash vs Credit Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Month */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{leftMonth}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Cash Expenses</span>
                  <span className="font-medium">{formatIdr(leftSummary?.outcome.cash ?? 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Credit Payment</span>
                  <span className="font-medium">{formatIdr(leftSummary?.outcome.credit_payment ?? 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Credit Expenses</span>
                  <span className="font-medium">{formatIdr(leftSummary?.outcome.credit_expenses ?? 0)}</span>
                </div>
              </div>
            </div>
            {/* Right Month */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{rightMonth}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Cash Expenses</span>
                  <span className="font-medium">{formatIdr(rightSummary?.outcome.cash ?? 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Credit Payment</span>
                  <span className="font-medium">{formatIdr(rightSummary?.outcome.credit_payment ?? 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Credit Expenses</span>
                  <span className="font-medium">{formatIdr(rightSummary?.outcome.credit_expenses ?? 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Comparison Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-slate-500" />
            Category Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">{leftMonth}</TableHead>
                  <TableHead className="text-right">{rightMonth}</TableHead>
                  <TableHead className="text-right">Delta</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryComparison.map((row) => {
                  const isUp = row.delta > 0;
                  const isDown = row.delta < 0;
                  const isSame = row.delta === 0;
                  const pct = row.left > 0 ? (row.delta / row.left) * 100 : row.right > 0 ? 100 : 0;

                  return (
                    <TableRow key={row.name}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: row.color || '#94a3b8' }}
                          />
                          <span className="font-medium">{row.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatIdr(row.left)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatIdr(row.right)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`text-sm font-medium ${isUp ? 'text-red-600 dark:text-red-400' : isDown ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                          {isUp ? '+' : ''}{formatIdr(row.delta)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {row.left > 0 ? (
                          <span className={`text-sm font-medium ${isUp ? 'text-red-600 dark:text-red-400' : isDown ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                            {isUp ? '+' : ''}{pct.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isUp ? (
                          <Badge variant="destructive" className="text-[10px]">Up</Badge>
                        ) : isDown ? (
                          <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Down</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Same</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {categoryComparison.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No category data available for the selected months.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Top Transactions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Top Transactions — {leftMonth}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...leftTxs]
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5)
                .map((tx) => (
                  <div key={tx.id} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{tx.title}</p>
                      <p className="text-xs text-muted-foreground">{tx.category}</p>
                    </div>
                    <span className="text-sm font-semibold shrink-0">{formatIdr(tx.amount)}</span>
                  </div>
                ))}
              {leftTxs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No transactions</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Top Transactions — {rightMonth}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...rightTxs]
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5)
                .map((tx) => (
                  <div key={tx.id} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{tx.title}</p>
                      <p className="text-xs text-muted-foreground">{tx.category}</p>
                    </div>
                    <span className="text-sm font-semibold shrink-0">{formatIdr(tx.amount)}</span>
                  </div>
                ))}
              {rightTxs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No transactions</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
