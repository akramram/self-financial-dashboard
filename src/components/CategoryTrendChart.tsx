import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { MonthlySummary, Category } from '../lib/data';
import { formatIdr } from '../lib/utils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const FALLBACK_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

interface Props {
  data: MonthlySummary[];
  categories?: Category[];
}

export default function CategoryTrendChart({ data, categories = [] }: Props) {
  const sortedData = useMemo(
    () => [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [data]
  );

  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.name, c.color));
    return map;
  }, [categories]);

  const { labels, datasets } = useMemo(() => {
    const labels = sortedData.map((d) => d.month);

    // Aggregate total spend per category across all months
    const categoryTotals: Record<string, number> = {};
    sortedData.forEach((summary) => {
      Object.entries(summary.category_totals || {}).forEach(([cat, amount]) => {
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;
      });
    });

    // Pick categories by total spend
    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    const datasets = topCategories.map((cat, idx) => {
      const color = colorMap.get(cat) || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
      return {
        label: cat,
        data: sortedData.map((summary) => summary.category_totals?.[cat] ?? 0),
        borderColor: color,
        backgroundColor: color,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: color,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        tension: 0.3,
        borderWidth: 2,
      };
    });

    return { labels, datasets };
  }, [sortedData, colorMap]);

  const chartData = { labels, datasets };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 16,
          font: { size: 11 },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${formatIdr(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => {
            const num = Number(value);
            if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
            if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
            return `${num}`;
          },
        },
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: { size: 10 },
        },
      },
    },
  };

  if (datasets.length === 0) {
    return (
      <div className="flex items-center justify-center h-72">
        <p className="text-sm text-slate-500">No category data available.</p>
      </div>
    );
  }

  return (
    <div className="relative h-80">
      <Line data={chartData} options={options as any} />
    </div>
  );
}
