import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { MonthlySummary } from '../lib/data';
import { formatIdr } from '../lib/utils';
import { FP } from '../lib/chartConfig';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function OutcomeChart({ data }: { data: MonthlySummary[] }) {
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const labels = sortedData.map((d) => d.month);
  const cashOutcomes = sortedData.map((d) => d.outcome.cash);
  const creditPayments = sortedData.map((d) => d.outcome.credit_payment);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Cash Outcome',
        data: cashOutcomes,
        backgroundColor: FP.coral,
        borderRadius: 4,
      },
      {
        label: 'Credit Payment',
        data: creditPayments,
        backgroundColor: FP.gold,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${formatIdr(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      y: { beginAtZero: true },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45,
        },
      },
    },
  };

  return (
    <div className="relative h-72">
      <Bar data={chartData} options={options} />
    </div>
  );
}
