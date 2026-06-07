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
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

interface Props {
  data: number[];
  color: string;
  height?: number;
  width?: number;
}

/**
 * Mini sparkline chart — no axes, no labels, pure trend visualization.
 * Shows a filled line chart of the given data points.
 */
export default function Sparkline({ data, color, height = 48, width = 100 }: Props) {
  // Filter out NaN/Infinity
  const clean = data.filter((v) => isFinite(v));
  if (clean.length < 2) return null;

  const isPositiveTrend = clean.length >= 2 && clean[clean.length - 1] >= clean[0];

  const chartData = {
    labels: clean.map((_, i) => `p${i}`),
    datasets: [
      {
        data: clean,
        borderColor: color,
        backgroundColor: `${color}22`,
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 3,
        pointHoverBackgroundColor: color,
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: { display: false },
      y: { display: false, beginAtZero: false },
    },
    elements: {
      line: {
        borderColor: color,
      },
    },
  };

  return (
    <div style={{ width, height }} className="shrink-0">
      <Line data={chartData} options={options} />
    </div>
  );
}
