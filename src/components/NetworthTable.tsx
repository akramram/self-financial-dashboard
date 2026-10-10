import React, { useCallback, useMemo } from 'react';
import type { NetworthRecord } from '../lib/data';
import { formatIdr } from '../lib/utils';
import { useSortState } from '../hooks/useSortState';
import SortableHeader from './SortableHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface Props {
  networth: NetworthRecord[];
}

function changeClass(n: number): string {
  return n >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
}

/**
 * Pair each record with the record 12 positions earlier (chronological order),
 * not calendar-based: handles gapped months (e.g. Jun 1 -> Jul 21) without
 * calendar matching. No pair -> null ("-").
 */
function buildYearOverYear(networth: NetworthRecord[]): Map<string, { change: number; pct: number | null }> {
  const map = new Map<string, { change: number; pct: number | null }>();
  const sorted = [...networth].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  for (let i = 12; i < sorted.length; i++) {
    const cur = sorted[i];
    const prev = sorted[i - 12];
    if (!prev || !Number.isFinite(prev.total) || prev.total === 0) continue;
    const change = cur.total - prev.total;
    const pct = Math.round(((cur.total / prev.total - 1) * 100) * 10) / 10;
    map.set(cur.month, { change, pct });
  }
  return map;
}

export default function NetworthTable({ networth }: Props) {
  const { toggleSort, sortData, isSorted } = useSortState();
  const yoyByMonth = useMemo(() => buildYearOverYear(networth), [networth]);

  const getCellValue = useCallback(
    (row: NetworthRecord, key: string): string | number => {
      switch (key) {
        case 'month': return row.month;
        case 'total': return row.total;
        case 'change': return row.month_over_month_change ?? 0;
        case 'pct': return row.month_over_month_pct ?? 0;
        case 'yoy_change': return yoyByMonth.get(row.month)?.change ?? 0;
        case 'yoy_pct': return yoyByMonth.get(row.month)?.pct ?? 0;
        default: return '';
      }
    },
    [yoyByMonth]
  );

  const sortedRows = useMemo(() => {
    return sortData(networth, getCellValue, (data) => [...data].reverse());
  }, [networth, sortData, getCellValue]);

  const renderYoY = (row: NetworthRecord, field: 'change' | 'pct') => {
    const yoy = yoyByMonth.get(row.month);
    if (!yoy) return <span className="text-muted-foreground">-</span>;
    if (field === 'change') {
      return (
        <span className={changeClass(yoy.change)}>
          {yoy.change >= 0 ? '+' : ''}
          {formatIdr(yoy.change)}
        </span>
      );
    }
    if (yoy.pct == null) return <span className="text-muted-foreground">-</span>;
    return (
      <span className={changeClass(yoy.pct)}>
        {yoy.pct >= 0 ? '+' : ''}
        {yoy.pct}%
      </span>
    );
  };

  return (
    <>
      {/* Desktop table (>=md) — sticky header inside bounded scroll area */}
      <div className="hidden md:block">
        <Table wrapperClassName="max-h-[70vh] overflow-y-auto" data-testid="networth-table">
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="bg-background hover:bg-background border-b border-slate-200 dark:border-white/[0.06]">
              <SortableHeader sortKey="month" currentDirection={isSorted('month')} onSort={toggleSort}>Month</SortableHeader>
              <SortableHeader sortKey="total" currentDirection={isSorted('total')} onSort={toggleSort} className="text-right">Total</SortableHeader>
              <SortableHeader sortKey="change" currentDirection={isSorted('change')} onSort={toggleSort} className="text-right">MoM Change</SortableHeader>
              <SortableHeader sortKey="pct" currentDirection={isSorted('pct')} onSort={toggleSort} className="text-right">MoM %</SortableHeader>
              <SortableHeader sortKey="yoy_change" currentDirection={isSorted('yoy_change')} onSort={toggleSort} className="text-right">YoY Change</SortableHeader>
              <SortableHeader sortKey="yoy_pct" currentDirection={isSorted('yoy_pct')} onSort={toggleSort} className="text-right">YoY %</SortableHeader>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.map((row) => (
              <TableRow key={row.month}>
                <TableCell className="font-medium">{row.month}</TableCell>
                <TableCell className="font-medium text-right tabular-nums">{formatIdr(row.total)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.month_over_month_change != null ? (
                    <span className={changeClass(row.month_over_month_change)}>
                      {row.month_over_month_change >= 0 ? '+' : ''}{formatIdr(row.month_over_month_change)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {row.month_over_month_pct != null ? (
                    <span className={changeClass(row.month_over_month_pct)}>
                      {row.month_over_month_pct >= 0 ? '+' : ''}{row.month_over_month_pct}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{renderYoY(row, 'change')}</TableCell>
                <TableCell className="text-right">{renderYoY(row, 'pct')}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-mint-500 hover:text-mint-600" asChild>
                    <a href={`/networth/edit?month=${encodeURIComponent(row.month)}`}>Edit</a>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list (<md) — mirrors TransactionTable/RecurringManager pattern (issue #265) */}
      <div className="md:hidden divide-y divide-slate-200 dark:divide-white/[0.05]">
        {sortedRows.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">No networth records yet.</div>
        ) : (
          sortedRows.map((row) => {
            const yoy = yoyByMonth.get(row.month);
            return (
              <div key={row.month} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white/90">{row.month}</p>
                  <p className="mt-0.5 text-xs tabular-nums">
                    {row.month_over_month_change != null ? (
                      <span className={changeClass(row.month_over_month_change)}>
                        {row.month_over_month_change >= 0 ? '▲' : '▼'} {formatIdr(Math.abs(row.month_over_month_change))}
                        {row.month_over_month_pct != null ? ` (${row.month_over_month_pct >= 0 ? '+' : ''}${row.month_over_month_pct}%)` : ''}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">First record</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[11px] tabular-nums">
                    {yoy ? (
                      <span className={changeClass(yoy.change)}>
                        YoY {yoy.change >= 0 ? '+' : ''}
                        {formatIdr(yoy.change)}
                        {yoy.pct != null ? ` (${yoy.pct >= 0 ? '+' : ''}${yoy.pct}%)` : ''}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">YoY -</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white/90">
                    {formatIdr(row.total)}
                  </span>
                  <a
                    href={`/networth/edit?month=${encodeURIComponent(row.month)}`}
                    className="min-h-[44px] min-w-[44px] px-3 inline-flex items-center justify-center rounded-lg text-xs font-medium text-mint-500 hover:bg-mint-500/10 transition-colors"
                  >
                    Edit
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
