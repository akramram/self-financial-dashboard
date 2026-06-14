import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'dashboard-collapsed-widgets';

export function useCollapsibleWidgets() {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Load persisted state on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const ids: string[] = JSON.parse(raw);
        setCollapsed(new Set(ids));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Persist state on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...collapsed]));
    } catch {
      // Ignore storage errors
    }
  }, [collapsed]);

  const toggle = useCallback((widgetId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(widgetId)) {
        next.delete(widgetId);
      } else {
        next.add(widgetId);
      }
      return next;
    });
  }, []);

  const isCollapsed = useCallback(
    (widgetId: string) => collapsed.has(widgetId),
    [collapsed]
  );

  const collapseAll = useCallback(() => {
    // Collapse all registered widgets
    setCollapsed((prev) => {
      const next = new Set(prev);
      // Add common widget IDs
      ['summary-cards', 'spending-pulse', 'anomaly-alerts', 'budget-alerts',
       'financial-insights', 'outcome-breakdown', 'transactions-table'].forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setCollapsed(new Set());
  }, []);

  return { isCollapsed, toggle, collapseAll, expandAll, collapsedCount: collapsed.size };
}
