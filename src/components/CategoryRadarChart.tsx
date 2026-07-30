import React, { useMemo } from 'react';
import type { MonthlySummary, Category } from '../lib/data';
import { formatIdr } from '../lib/utils';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { Crosshair } from 'lucide-react';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const FALLBACK_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#e11d48', '#0ea5e9', '#d946ef',
];

interface Props {
  leftSummary: MonthlySummary | undefined;
  rightSummary: MonthlySummary | undefined;
  leftMonth: string;
  rightMonth: string;
  categories: Category[];
}

export default function CategoryRadarChart({
  leftSummary,
  rightSummary,
  leftMonth,
  rightMonth,
  categories,
}: Props) {
  const chartData = useMemo(() => {
    // Collect all categories from both periods
    const allCats = new Set<string>();
    if (leftSummary?.category_totals) {
      Object.keys(leftSummary.category_totals).forEach((c) => allCats.add(c));
    }
    if (rightSummary?.category_totals) {
      Object.keys(rightSummary.category_totals).forEach((c) => allCats.add(c));
    }

    // Sort categories by combined spend (descending), limit to top 12
    const sorted = Array.from(allCats)
      .map((cat) => ({
        name: cat,
        left: leftSummary?.category_totals?.[cat] ?? 0,
        right: rightSummary?.category_totals?.[cat] ?? 0,
        total: (leftSummary?.category_totals?.[cat] ?? 0) + (rightSummary?.category_totals?.[cat] ?? 0),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);

    const labels = sorted.map((s) => s.name);
    const leftValues = sorted.map((s) => s.left);
    const rightValues = sorted.map((s) => s.right);

    // Build color maps
    const colorMap = new Map(categories.map((c) => [c.name, c.color]));
    const leftColors = sorted.map(
      (s, i) => colorMap.get(s.name) || FALLBACK_COLORS[i % FALLBACK_COLORS.length]
    );
    const rightColors = sorted.map(
      (s, i) => colorMap.get(s.name) || FALLBACK_COLORS[i % FALLBACK_COLORS.length]
    );

    return {
      labels,
      datasets: [
        {
          label: leftMonth,
          data: leftValues,
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          borderColor: 'rgba(59, 130, 246, 0.8)',
          borderWidth: 2,
          pointBackgroundColor: leftColors,
          pointBorderColor: leftColors,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: rightMonth,
          data: rightValues,
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderColor: 'rgba(239, 68, 68, 0.8)',
          borderWidth: 2,
          pointBackgroundColor: rightColors,
          pointBorderColor: rightColors,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }, [leftSummary, rightSummary, leftMonth, rightMonth, categories]);

  const hasData = chartData.labels.length > 0;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        ticks: {
          display: true,
          backdropColor: 'transparent',
          font: { size: 10 },
          callback: (value: number) => {
            if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
            if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
            return String(value);
          },
        },
        pointLabels: {
          font: { size: 11, weight: 'bold' as const },
          color: '#64748b',
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.2)',
        },
        angleLines: {
          color: 'rgba(148, 163, 184, 0.2)',
        },
      },
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { size: 12 },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const label = ctx.dataset.label || '';
            const value = ctx.raw as number;
            return `${label}: ${formatIdr(value)}`;
          },
        },
      },
    },
  };

  return (
    <div className="glass-card p-5">
      
        <h3 className="text-base font-semibold flex items-center gap-2 text-slate-800 dark:text-white/80">
          <Crosshair className="w-4 h-4 text-slate-500" />
          Category Spending Radar
        </h3>
      
      
        {hasData ? (
          <div className="h-[400px] w-full">
            <Radar data={chartData} options={options} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            No category data available for the selected periods.
          </div>
        )}
      
    </div>
  );
}
