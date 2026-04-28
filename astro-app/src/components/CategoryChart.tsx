import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { formatIdr } from '../lib/utils';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function CategoryChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const labels = entries.map(([k]) => k);
  const values = entries.map(([_, v]) => v);

  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  ];

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
    plugins: {
      legend: {
        position: 'right' as const,
        labels: { boxWidth: 12, font: { size: 11 } },
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
