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
    <div className="rounded-xl border overflow-hidden">
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
                  <span className={row.month_over_month_change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                    {row.month_over_month_change >= 0 ? '+' : ''}{formatIdr(row.month_over_month_change)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {row.month_over_month_pct != null ? (
                  <span className={row.month_over_month_pct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                    {row.month_over_month_pct >= 0 ? '+' : ''}{row.month_over_month_pct}%
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-500 hover:text-blue-700" asChild>
                  <a href={`/networth/edit?month=${encodeURIComponent(row.month)}`}>Edit</a>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
