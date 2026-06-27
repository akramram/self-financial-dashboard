import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, Minus, Grid3x3, Info } from 'lucide-react';
import { formatIdr } from '../lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────

interface CategoryPeriodCell {
  amount: number;
  tx_count: number;
}

interface CategoryPeriodMatrixRow {
  category: string;
  cells: Record<number, CategoryPeriodCell>;
  total: number;
  avg: number;
  periodCount: number;
  max: number;
  maxPeriodId: number | null;
  trendPct: number | null;
}

interface MatrixPeriod {
  id: number;
  month: string;
  start_date: string;
  end_date: string;
}

interface CategoryPeriodMatrix {
  periods: MatrixPeriod[];
  categories: CategoryPeriodMatrixRow[];
  periodTotals: Record<number, number>;
}

interface Category {
  id: number;
  name: string;
  color: string;
  monthly_limit: number;
}

interface TxRow {
  id: number;
  title: string;
  category: string;
  amount: number;
  type: string;
  done: number;
  created_time: string;
  date: string;
}

interface Props {}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Short month label: "June 2026" → "Jun '26" */
function shortMonth(monthStr: string): string {
  const d = new Date(monthStr + ' 1');
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  // Fallback: first 3 chars of month name + last 2 of year
  const parts = monthStr.split(' ');
  if (parts.length === 2) {
    return parts[0].slice(0, 3) + " '" + parts[1].slice(2);
  }
  return monthStr;
}

/**
 * Compute a heatmap color from amount relative to the row's max.
 * Returns an rgba string with intensity 0.05 → 0.85.
 */
function heatColor(amount: number, rowMax: number, categoryColor?: string): string {
  if (amount <= 0 || rowMax <= 0) {
    return 'transparent';
  }
  const ratio = Math.min(1, amount / rowMax);
  // Intensity scales from 0.12 (faint) to 0.85 (strong)
  const alpha = 0.12 + ratio * 0.73;

  // Parse category color if provided, otherwise default to indigo
  if (categoryColor) {
    const hex = categoryColor.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  // Default indigo
  return `rgba(99, 102, 241, ${alpha})`;
}

/** Text color: dark text on light backgrounds, white text when intensity is high */
function textColor(amount: number, rowMax: number): string {
  if (amount <= 0 || rowMax <= 0) return '';
  const ratio = amount / rowMax;
  return ratio > 0.55
    ? 'text-white font-medium'
    : 'text-slate-700 dark:text-slate-200';
}

function formatShort(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return Math.round(n).toString();
}

function TrendBadge({ trendPct }: { trendPct: number | null }) {
  if (trendPct === null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-slate-400">
        <Minus className="w-3 h-3" /> —
      </span>
    );
  }
  if (Math.abs(trendPct) < 5) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-slate-400">
        <Minus className="w-3 h-3" /> {trendPct > 0 ? '+' : ''}{trendPct}%
      </span>
    );
  }
  if (trendPct > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-rose-600 dark:text-rose-400">
        <TrendingUp className="w-3 h-3" /> +{trendPct}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600 dark:text-emerald-400">
      <TrendingDown className="w-3 h-3" /> {trendPct}%
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function CategoryMatrix({}: Props) {
  const [matrix, setMatrix] = useState<CategoryPeriodMatrix | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drill-down dialog state
  const [drillCategory, setDrillCategory] = useState<string>('');
  const [drillPeriodId, setDrillPeriodId] = useState<number | null>(null);
  const [drillTxs, setDrillTxs] = useState<TxRow[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);

  useEffect(() => {
    fetch('/api/matrix')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: { matrix: CategoryPeriodMatrix; categories: Category[] }) => {
        setMatrix(json.matrix);
        setCategories(json.categories || []);
      })
      .catch((e) => setError(e.message || 'Failed to load matrix'))
      .finally(() => setLoading(false));
  }, []);

  const categoryColorMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of categories) m[c.name] = c.color;
    return m;
  }, [categories]);

  // For column total color intensity, we need the max period total
  const maxPeriodTotal = useMemo(() => {
    if (!matrix) return 0;
    return Math.max(...Object.values(matrix.periodTotals), 0);
  }, [matrix]);

  // Display periods: reversed so newest is on the right (chronological left→right)
  // But for readability on wider datasets, show newest on the LEFT (like recent-first tables)
  // Convention: newest period on the RIGHT so trends read left→right over time
  const displayPeriods = useMemo(() => {
    if (!matrix) return [];
    return [...matrix.periods]; // already chronological ASC
  }, [matrix]);

  const openDrillDown = async (category: string, periodId: number) => {
    setDrillCategory(category);
    setDrillPeriodId(periodId);
    setDrillTxs([]);
    setDrillLoading(true);
    try {
      const params = new URLSearchParams({
        period_id: String(periodId),
        category,
      });
      const res = await fetch(`/api/transactions?${params.toString()}`);
      const txs: TxRow[] = await res.json();
      // Sort: unpaid last, then by amount desc
      txs.sort((a, b) => {
        if (a.done !== b.done) return a.done ? -1 : 1;
        return b.amount - a.amount;
      });
      setDrillTxs(txs);
    } catch {
      setDrillTxs([]);
    } finally {
      setDrillLoading(false);
    }
  };

  const drillPeriod = useMemo(
    () => matrix?.periods.find((p) => p.id === drillPeriodId) ?? null,
    [matrix, drillPeriodId]
  );

  // ─── Loading / Empty states ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading spending matrix...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-rose-500">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!matrix || matrix.categories.length === 0 || matrix.periods.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-slate-400 py-12">
            <Grid3x3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No spending data available. Add transactions to see the matrix.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasData = matrix.categories.length > 0 && matrix.periods.length > 0;

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-slate-600 dark:text-slate-300">
              <strong className="text-slate-800 dark:text-slate-100">How to read this:</strong>{' '}
              Each cell shows spending in a category (row) for a salary period (column).{' '}
              Darker color = higher spend relative to that category's peak.{' '}
              Click any cell to see the underlying transactions.{' '}
              <span className="text-rose-600 dark:text-rose-400">Red trend</span> = spending is increasing over time,{' '}
              <span className="text-emerald-600 dark:text-emerald-400">green</span> = decreasing.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matrix Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Grid3x3 className="w-4 h-4 text-indigo-500" />
            Category × Period Spending Matrix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-white dark:bg-slate-900 z-10 min-w-[120px] font-semibold">
                    Category
                  </TableHead>
                  {displayPeriods.map((p) => (
                    <TableHead
                      key={p.id}
                      className="text-center min-w-[60px] font-medium whitespace-nowrap"
                      title={p.month}
                    >
                      {shortMonth(p.month)}
                    </TableHead>
                  ))}
                  <TableHead className="text-right font-semibold whitespace-nowrap">Total</TableHead>
                  <TableHead className="text-right font-semibold whitespace-nowrap">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrix.categories.map((row) => {
                  const catColor = categoryColorMap[row.category];
                  return (
                    <TableRow
                      key={row.category}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <TableCell className="sticky left-0 bg-white dark:bg-slate-900 z-10 font-medium whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          {catColor && (
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: catColor }}
                            />
                          )}
                          {row.category}
                        </span>
                      </TableCell>
                      {displayPeriods.map((p) => {
                        const cell = row.cells[p.id];
                        const amt = cell?.amount ?? 0;
                        const count = cell?.tx_count ?? 0;
                        const bg = heatColor(amt, row.max, catColor);
                        return (
                          <TableCell
                            key={p.id}
                            className={`text-center p-0.5 cursor-pointer transition-transform hover:scale-110 ${textColor(amt, row.max)}`}
                            style={bg !== 'transparent' ? { backgroundColor: bg } : undefined}
                            title={amt > 0 ? `${row.category} · ${p.month}\n${formatIdr(amt)} (${count} tx${count !== 1 ? 's' : ''})\n\nClick to view transactions` : `${row.category} · ${p.month}\nNo spending`}
                            onClick={() => amt > 0 && openDrillDown(row.category, p.id)}
                          >
                            {amt > 0 ? formatShort(amt) : <span className="text-slate-300 dark:text-slate-700">·</span>}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-semibold whitespace-nowrap">
                        {formatShort(row.total)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <TrendBadge trendPct={row.trendPct} />
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* Totals Row */}
                <TableRow className="border-t-2 border-slate-300 dark:border-slate-600 font-semibold bg-slate-50/50 dark:bg-slate-800/30">
                  <TableCell className="sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 whitespace-nowrap">
                    All Categories
                  </TableCell>
                  {displayPeriods.map((p) => {
                    const total = matrix.periodTotals[p.id] ?? 0;
                    const bg = heatColor(total, maxPeriodTotal, '#6366f1');
                    return (
                      <TableCell
                        key={p.id}
                        className={`text-center p-1 ${textColor(total, maxPeriodTotal)}`}
                        style={bg !== 'transparent' ? { backgroundColor: bg } : undefined}
                        title={`Total spending · ${p.month}\n${formatIdr(total)}`}
                      >
                        {total > 0 ? formatShort(total) : ''}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right">
                    {formatShort(matrix.categories.reduce((s, r) => s + r.total, 0))}
                  </TableCell>
                  <TableCell className="text-right text-slate-400">—</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Most Consistent Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...matrix.categories]
                .filter((r) => r.periodCount >= 2)
                .map((r) => ({
                  ...r,
                  consistency: matrix.periods.length > 0 ? r.periodCount / matrix.periods.length : 0,
                }))
                .sort((a, b) => b.consistency - a.consistency)
                .slice(0, 5)
                .map((r) => (
                  <div key={r.category} className="flex items-center justify-between text-sm">
                    <span className="truncate flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: categoryColorMap[r.category] || '#64748b' }}
                      />
                      {r.category}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(r.consistency * 100)}% ({r.periodCount}/{matrix.periods.length})
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Fastest Rising Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...matrix.categories]
                .filter((r) => r.trendPct !== null && r.trendPct > 0)
                .sort((a, b) => (b.trendPct ?? 0) - (a.trendPct ?? 0))
                .slice(0, 5)
                .map((r) => (
                  <div key={r.category} className="flex items-center justify-between text-sm">
                    <span className="truncate flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: categoryColorMap[r.category] || '#64748b' }}
                      />
                      {r.category}
                    </span>
                    <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 text-xs font-medium">
                      <TrendingUp className="w-3 h-3" /> +{r.trendPct}%
                    </span>
                  </div>
                ))}
              {matrix.categories.filter((r) => r.trendPct !== null && r.trendPct > 0).length === 0 && (
                <p className="text-xs text-slate-400">No rising trends detected.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Declining Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...matrix.categories]
                .filter((r) => r.trendPct !== null && r.trendPct < 0)
                .sort((a, b) => (a.trendPct ?? 0) - (b.trendPct ?? 0))
                .slice(0, 5)
                .map((r) => (
                  <div key={r.category} className="flex items-center justify-between text-sm">
                    <span className="truncate flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: categoryColorMap[r.category] || '#64748b' }}
                      />
                      {r.category}
                    </span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                      <TrendingDown className="w-3 h-3" /> {r.trendPct}%
                    </span>
                  </div>
                ))}
              {matrix.categories.filter((r) => r.trendPct !== null && r.trendPct < 0).length === 0 && (
                <p className="text-xs text-slate-400">No declining trends detected.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drill-down Dialog */}
      <Dialog
        open={drillPeriodId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDrillPeriodId(null);
            setDrillCategory('');
            setDrillTxs([]);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: categoryColorMap[drillCategory] || '#64748b' }}
              />
              {drillCategory}
            </DialogTitle>
            <DialogDescription>
              Transactions in {drillPeriod?.month ?? ''}
              {drillTxs.length > 0 && ` — ${drillTxs.length} total`}
            </DialogDescription>
          </DialogHeader>

          {drillLoading ? (
            <div className="text-center py-8 text-slate-400">Loading transactions...</div>
          ) : drillTxs.length === 0 ? (
            <div className="text-center py-8 text-slate-400">No transactions found.</div>
          ) : (
            <div className="max-h-[50vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Title</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drillTxs.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {tx.created_time
                          ? new Date(tx.created_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : tx.date}
                      </TableCell>
                      <TableCell className="text-xs">{tx.title}</TableCell>
                      <TableCell className="text-xs text-right font-medium">{formatIdr(tx.amount)}</TableCell>
                      <TableCell className="text-xs">
                        {tx.done ? (
                          <Badge variant="default" className="text-[10px] bg-emerald-600">Paid</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Pending</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
