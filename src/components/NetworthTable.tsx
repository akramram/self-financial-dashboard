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

export default function NetworthTable({ networth }: Props) {
  const { toggleSort, sortData, isSorted } = useSortState();

  const getCellValue = useCallback((row: NetworthRecord, key: string): string | number => {
    switch (key) {
      case 'month': return row.month;
      case 'total': return row.total;
      case 'change': return row.month_over_month_change ?? 0;
      case 'pct': return row.month_over_month_pct ?? 0;
      default: return '';
    }
  }, []);

  const sortedRows = useMemo(() => {
    return sortData(networth, getCellValue, (data) => [...data].reverse());
  }, [networth, sortData, getCellValue]);

  return (
    <>
      {/* Desktop table (>=md) */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader sortKey="month" currentDirection={isSorted('month')} onSort={toggleSort}>Month</SortableHeader>
              <SortableHeader sortKey="total" currentDirection={isSorted('total')} onSort={toggleSort} className="text-right">Total</SortableHeader>
              <SortableHeader sortKey="change" currentDirection={isSorted('change')} onSort={toggleSort} className="text-right">MoM Change</SortableHeader>
              <SortableHeader sortKey="pct" currentDirection={isSorted('pct')} onSort={toggleSort} className="text-right">MoM %</SortableHeader>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.map((row) => (
              <TableRow key={row.month}>
                <TableCell className="font-medium">{row.month}</TableCell>
                <TableCell className="font-medium text-right">{formatIdr(row.total)}</TableCell>
                <TableCell className="text-right">
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
          sortedRows.map((row) => (
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
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white/90">
                  {formatIdr(row.total)}
                </span>
                <a
                  href={`/networth/edit?month=${encodeURIComponent(row.month)}`}
                  className="h-8 px-3 inline-flex items-center rounded-lg text-xs font-medium text-mint-500 hover:bg-mint-500/10 transition-colors"
                >
                  Edit
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
