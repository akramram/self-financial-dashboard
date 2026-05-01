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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function IncomeOutcomeChart({ data }: { data: MonthlySummary[] }) {
  const labels = data.map((d) => d.month);
  const incomes = data.map((d) => d.income);
  const cashOutcomes = data.map((d) => d.outcome.cash);
  const creditPayments = data.map((d) => d.outcome.credit_payment);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Income',
        data: incomes,
        backgroundColor: '#10b981',
        borderRadius: 4,
        stack: 'income' as const,
      },
      {
        label: 'Cash Outcome',
        data: cashOutcomes,
        backgroundColor: '#3b82f6',
        borderRadius: 4,
        stack: 'outcome' as const,
      },
      {
        label: 'Credit Payment',
        data: creditPayments,
        backgroundColor: '#f59e0b',
        borderRadius: 4,
        stack: 'outcome' as const,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { position: 'top' as const },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${formatIdr(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true },
    },
  };

  return (
    <div className="relative h-72">
      <Bar data={chartData} options={options} />
    </div>
  );
}
