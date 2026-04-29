import React from 'react';
import type { NetworthRecord } from '../lib/data';
import { formatIdr } from '../lib/utils';
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
  const networthReversed = [...networth].reverse();

  return (
    <div className="rounded-xl border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Month</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">MoM Change</TableHead>
            <TableHead className="text-right">MoM %</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {networthReversed.map((row) => (
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
