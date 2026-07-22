import React, { useState, useEffect } from 'react';
import type { Anomaly } from '../lib/db';
import { formatIdr } from '../lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  ShoppingBag,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';

interface Props {
  month: string;
}

const SEVERITY_COLORS: Record<Anomaly['severity'], string> = {
  high: 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30',
  medium: 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
  low: 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30',
};

const SEVERITY_BADGE: Record<Anomaly['severity'], string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
};

const REASON_LABELS: Record<Anomaly['reason'], string> = {
  amount_spike: 'Unusual Amount',
  new_merchant: 'New Merchant',
  category_outlier: 'Category Outlier',
};

const REASON_ICONS: Record<Anomaly['reason'], React.ReactNode> = {
  amount_spike: <TrendingUp className="w-4 h-4" />,
  new_merchant: <ShoppingBag className="w-4 h-4" />,
  category_outlier: <AlertTriangle className="w-4 h-4" />,
};

export default function AnomalyAlerts({ month }: Props) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<Anomaly['severity'] | null>(null);

  useEffect(() => {
    if (!month) return;
    setLoading(true);
    setDismissed(new Set());
    setSeverityFilter(null);
    fetch(`/api/anomalies?month=${encodeURIComponent(month)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAnomalies(data);
        else setAnomalies([]);
      })
      .catch(() => setAnomalies([]))
      .finally(() => setLoading(false));
  }, [month]);

  const dismiss = (id: number) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const toggleFilter = (severity: Anomaly['severity']) => {
    setSeverityFilter((prev) => (prev === severity ? null : severity));
    setExpanded(false);
  };

  const visible = anomalies.filter((a) => !dismissed.has(a.id));
  const filtered = severityFilter
    ? visible.filter((a) => a.severity === severityFilter)
    : visible;

  if (loading) return null; // Silent loading — don't show spinner for this

  if (visible.length === 0) return null; // Nothing to show

  const highCount = visible.filter((a) => a.severity === 'high').length;
  const mediumCount = visible.filter((a) => a.severity === 'medium').length;
  const lowCount = visible.filter((a) => a.severity === 'low').length;
  const displayItems = expanded ? filtered : filtered.slice(0, 3);

  return (
    <div className="glass-card p-5 border-amber-200 dark:border-amber-800">
      
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold flex items-center gap-2 text-white/80">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Spending Anomalies Detected
          </h3>
          <div className="flex items-center gap-2">
            {highCount > 0 && (
              <button
                onClick={() => toggleFilter('high')}
                className={`text-[10px] px-1.5 py-0 rounded-full font-medium transition cursor-pointer border ${
                  severityFilter === 'high'
                    ? 'bg-red-600 text-white border-red-600 ring-2 ring-red-300'
                    : 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-900/60'
                }`}
              >
                {highCount} high
              </button>
            )}
            {mediumCount > 0 && (
              <button
                onClick={() => toggleFilter('medium')}
                className={`text-[10px] px-1.5 py-0 rounded-full font-medium transition cursor-pointer border ${
                  severityFilter === 'medium'
                    ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-300'
                    : 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-900/60'
                }`}
              >
                {mediumCount} medium
              </button>
            )}
            {lowCount > 0 && (
              <button
                onClick={() => toggleFilter('low')}
                className={`text-[10px] px-1.5 py-0 rounded-full font-medium transition cursor-pointer border ${
                  severityFilter === 'low'
                    ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300'
                    : 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/60'
                }`}
              >
                {lowCount} low
              </button>
            )}
            {severityFilter && (
              <button
                onClick={() => setSeverityFilter(null)}
                className="text-[10px] px-1.5 py-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline"
              >
                clear
              </button>
            )}
            <span className="text-xs text-slate-400">{filtered.length} of {visible.length}</span>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          These transactions look unusual compared to your historical spending patterns.
        </p>
      
      
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-3">
            No {severityFilter} severity anomalies found.
          </p>
        ) : (
          displayItems.map((anomaly) => (
          <div
            key={anomaly.id}
            className={`flex items-start gap-3 p-3 rounded-lg border ${SEVERITY_COLORS[anomaly.severity]} transition`}
          >
            <div className="shrink-0 mt-0.5">
              {REASON_ICONS[anomaly.reason]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">
                  {anomaly.title}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 ${SEVERITY_BADGE[anomaly.severity]}`}
                >
                  {REASON_LABELS[anomaly.reason]}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span>{formatIdr(anomaly.amount)}</span>
                <span>·</span>
                <span>{anomaly.category}</span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {anomaly.detail}
              </p>
            </div>
            <button
              onClick={() => dismiss(anomaly.id)}
              className="shrink-0 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        )))}


        {filtered.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-slate-500"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 mr-1" />
                Show fewer
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 mr-1" />
                Show all {filtered.length} anomalies
              </>
            )}
          </Button>
        )}
      
    </div>
  );
}
