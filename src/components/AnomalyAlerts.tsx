import React, { useState, useEffect } from 'react';
import type { Anomaly } from '../lib/db';
import { formatIdr } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  useEffect(() => {
    if (!month) return;
    setLoading(true);
    setDismissed(new Set());
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

  const visible = anomalies.filter((a) => !dismissed.has(a.id));

  if (loading) return null; // Silent loading — don't show spinner for this

  if (visible.length === 0) return null; // Nothing to show

  const highCount = visible.filter((a) => a.severity === 'high').length;
  const mediumCount = visible.filter((a) => a.severity === 'medium').length;
  const displayItems = expanded ? visible : visible.slice(0, 3);

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Spending Anomalies Detected
          </CardTitle>
          <div className="flex items-center gap-2">
            {highCount > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                {highCount} high
              </Badge>
            )}
            {mediumCount > 0 && (
              <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                {mediumCount} medium
              </Badge>
            )}
            <span className="text-xs text-slate-400">{visible.length} total</span>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          These transactions look unusual compared to your historical spending patterns.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayItems.map((anomaly) => (
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
        ))}

        {visible.length > 3 && (
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
                Show all {visible.length} anomalies
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
