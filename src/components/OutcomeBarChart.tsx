import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { formatIdr } from '../lib/utils';
import type { Category, MonthlySummary } from '../lib/data';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const FALLBACK_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

interface Props {
  data: Record<string, number>;
  categories?: Category[];
  highlightCategory?: string;
  summaries?: MonthlySummary[];
}

export default function OutcomeBarChart({ data, categories = [], highlightCategory, summaries }: Props) {
  // Trend mode: single category across months
  const isTrendMode = !!highlightCategory && !!summaries && summaries.length > 0;

  const { labels, values, backgroundColors, borderColors, borderWidths } = useMemo(() => {
    if (isTrendMode) {
      const sorted = [...summaries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const labels = sorted.map((s) => s.month);
      const values = sorted.map((s) => s.category_totals?.[highlightCategory!] ?? 0);

      const colorMap = new Map(categories.map((c) => [c.name, c.color]));
      const baseColor = colorMap.get(highlightCategory!) || FALLBACK_COLORS[0];

      return {
        labels,
        values,
        backgroundColors: values.map((v) => (v > 0 ? baseColor : `${baseColor}40`)),
        borderColors: labels.map(() => baseColor),
        borderWidths: labels.map(() => 0),
      };
    }

    // Default mode: all categories horizontal bar for single month
    const entries = Object.entries(data)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);

    const labels = entries.map(([k]) => k);
    const values = entries.map(([_, v]) => v);

    const colorMap = new Map(categories.map((c) => [c.name, c.color]));

    const backgroundColors = labels.map((label, i) => {
      const baseColor = colorMap.get(label) || FALLBACK_COLORS[i % FALLBACK_COLORS.length];
      if (highlightCategory && label !== highlightCategory) {
        return `${baseColor}40`; // 25% opacity
      }
      return baseColor;
    });

    const borderColors = labels.map((label, i) => {
      return colorMap.get(label) || FALLBACK_COLORS[i % FALLBACK_COLORS.length];
    });

    const borderWidths = labels.map((label) => {
      return highlightCategory && label === highlightCategory ? 2 : 0;
    });

    return { labels, values, backgroundColors, borderColors, borderWidths };
  }, [data, categories, highlightCategory, summaries, isTrendMode]);

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: borderWidths,
        borderRadius: 4,
        barPercentage: 0.6,
      },
    ],
  };

  const options = {
    indexAxis: isTrendMode ? ('x' as const) : ('y' as const),
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.label}: ${formatIdr(isTrendMode ? ctx.parsed.y : ctx.parsed.x)}`,
        },
      },
    },
    scales: {
      [isTrendMode ? 'y' : 'x']: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => {
            const num = Number(value);
            if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
            if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
            return `${num}`;
          },
          font: { size: 10 },
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.15)',
        },
      },
      [isTrendMode ? 'x' : 'y']: {
        ticks: {
          font: { size: 11 },
        },
        grid: { display: false },
      },
    },
  };

  if (labels.length === 0 || values.every((v) => v === 0)) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-sm text-slate-500">No outcome data available.</p>
      </div>
    );
  }

  return (
    <div className="relative h-64">
      <Bar data={chartData} options={options as any} />
    </div>
  );
}
