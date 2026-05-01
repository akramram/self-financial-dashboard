import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { NetworthRecord } from '../lib/data';
import { formatIdr } from '../lib/utils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend);

export default function NetworthChart({ data }: { data: NetworthRecord[] }) {
  const labels = data.map((d) => d.month);
  const values = data.map((d) => d.total);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Networth',
        data: values,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `Networth: ${formatIdr(ctx.parsed.y)}`,
          afterLabel: (ctx: any) => {
            const idx = ctx.dataIndex;
            const change = data[idx]?.month_over_month_pct;
            if (change == null) return '';
            return `MoM Change: ${change > 0 ? '+' : ''}${change}%`;
          },
        },
      },
    },
    scales: {
      y: { beginAtZero: false },
    },
  };

  return (
    <div className="relative h-72">
      <Line data={chartData} options={options} />
    </div>
  );
}
