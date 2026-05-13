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
import type { MonthlySummary } from '../lib/data';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend);

export default function SavingsRateChart({ data }: { data: MonthlySummary[] }) {
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const labels = sortedData.map((d) => d.month);
  const rates = sortedData.map((d) => d.savings_rate_pct);

  const pointColors = rates.map((r) => (r >= 0 ? '#10b981' : '#ef4444'));
  const pointRadii = rates.map((r) => (Math.abs(r) > 50 ? 6 : 4));

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Savings Rate',
        data: rates,
        borderColor: '#6366f1',
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'rgba(99, 102, 241, 0.1)';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
          gradient.addColorStop(1, 'rgba(99, 102, 241, 0.02)');
          return gradient;
        },
        fill: true,
        tension: 0.35,
        pointRadius: pointRadii,
        pointBackgroundColor: pointColors,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointHoverRadius: 8,
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
          label: (ctx: any) => {
            const val = ctx.parsed.y;
            return `Savings Rate: ${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
          },
          afterLabel: (ctx: any) => {
            const idx = ctx.dataIndex;
            const summary = sortedData[idx];
            if (!summary) return '';
            const savings = summary.income - summary.outcome.total;
            return `Savings: ${savings >= 0 ? '' : '-'}IDR ${Math.abs(savings).toLocaleString('id-ID')}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value: any) => `${value}%`,
        },
      },
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
      <Line data={chartData} options={options} />
    </div>
  );
}
