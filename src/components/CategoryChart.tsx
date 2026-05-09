import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { formatIdr } from '../lib/utils';
import type { Category } from '../lib/data';

ChartJS.register(ArcElement, Tooltip, Legend);

const FALLBACK_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

interface Props {
  data: Record<string, number>;
  categories?: Category[];
  onCategoryClick?: (category: string) => void;
}

export default function CategoryChart({ data, categories = [], onCategoryClick }: Props) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const labels = entries.map(([k]) => k);
  const values = entries.map(([_, v]) => v);

  const colorMap = new Map(categories.map((c) => [c.name, c.color]));
  const colors = labels.map((label, i) => colorMap.get(label) || FALLBACK_COLORS[i % FALLBACK_COLORS.length]);

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: colors,
        borderWidth: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_evt: any, elements: any[]) => {
      if (elements.length > 0 && onCategoryClick) {
        const index = elements[0].index;
        const category = labels[index];
        if (category) onCategoryClick(category);
      }
    },
    plugins: {
      legend: {
        position: 'right' as const,
        labels: { boxWidth: 12, font: { size: 11 } },
        onClick: (_e: any, legendItem: any, _legend: any) => {
          if (onCategoryClick && legendItem.text) {
            onCategoryClick(legendItem.text);
          }
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.label}: ${formatIdr(ctx.parsed)}`,
        },
      },
    },
  };

  return (
    <div className="relative h-72">
      <Doughnut data={chartData} options={options} />
    </div>
  );
}
