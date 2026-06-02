import React from 'react';
import { TableHead } from '@/components/ui/table';
import type { SortDirection } from '../hooks/useSortState';

interface SortableHeaderProps {
  children: React.ReactNode;
  sortKey: string;
  currentDirection: SortDirection | null;
  onSort: (key: string) => void;
  className?: string;
}

export default function SortableHeader({
  children,
  sortKey,
  currentDirection,
  onSort,
  className,
}: SortableHeaderProps) {
  return (
    <TableHead
      className={`cursor-pointer select-none hover:bg-muted/50 transition-colors ${className ?? ''}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <span className="inline-flex flex-col leading-none text-[10px] ml-0.5">
          <span
            className={
              currentDirection === 'asc'
                ? 'text-foreground'
                : 'text-muted-foreground/40'
            }
          >
            ▲
          </span>
          <span
            className={
              currentDirection === 'desc'
                ? 'text-foreground'
                : 'text-muted-foreground/40'
            }
          >
            ▼
          </span>
        </span>
      </span>
    </TableHead>
  );
}
