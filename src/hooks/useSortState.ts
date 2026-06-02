import { useState, useCallback } from 'react';

export type SortDirection = 'asc' | 'desc';

interface SortState {
  key: string;
  direction: SortDirection;
}

export function useSortState(defaultKey?: string, defaultDirection?: SortDirection) {
  const [sort, setSort] = useState<SortState | null>(
    defaultKey ? { key: defaultKey, direction: defaultDirection ?? 'desc' } : null
  );

  const toggleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev?.key === key) {
        return prev.direction === 'asc'
          ? { key, direction: 'desc' }
          : null; // third click resets
      }
      return { key, direction: 'asc' };
    });
  }, []);

  const sortData = useCallback(
    <T>(data: T[], getCellValue: (item: T, key: string) => string | number, defaultSort?: (data: T[]) => T[]) => {
      if (!sort) return defaultSort ? defaultSort(data) : data;

      return [...data].sort((a, b) => {
        const valA = getCellValue(a, sort.key);
        const valB = getCellValue(b, sort.key);

        let cmp: number;
        if (typeof valA === 'number' && typeof valB === 'number') {
          cmp = valA - valB;
        } else {
          cmp = String(valA ?? '').localeCompare(String(valB ?? ''));
        }

        return sort.direction === 'asc' ? cmp : -cmp;
      });
    },
    [sort]
  );

  const isSorted = useCallback(
    (key: string): SortDirection | null => {
      if (sort?.key === key) return sort.direction;
      return null;
    },
    [sort]
  );

  return { sort, toggleSort, sortData, isSorted };
}
