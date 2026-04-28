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

export default function CreditPaymentChart({ data }: { data: MonthlySummary[] }) {
  const labels = data.map((d) => d.month);
  const creditPayments = data.map((d) => d.outcome.credit_payment);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Credit Payment',
        data: creditPayments,
        backgroundColor: '#f59e0b',
        borderRadius: 4,
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
          label: (ctx: any) => `Credit Payment: ${formatIdr(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  return (
    <div className="relative h-72">
      <Bar data={chartData} options={options} />
    </div>
  );
}
