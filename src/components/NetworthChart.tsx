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
import { FP, getAreaGradient } from '../lib/chartConfig';
import { Badge } from '@/components/ui/badge';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend);

/**
 * Historical CAGR from first to last record, annualized over elapsed days.
 * IMPORTANT: net-worth growth includes deposits, not only market returns —
 * the badge must always say "incl. deposits" (see label below).
 */
export function historicalCagr(sortedData: NetworthRecord[]): { pct: number; years: number } | null {
  if (sortedData.length < 2) return null;
  const first = sortedData[0];
  const last = sortedData[sortedData.length - 1];
  if (first.total <= 0 || last.total <= 0) return null;
  const days = (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86_400_000;
  if (days <= 0) return null;
  const years = days / 365.25;
  const pct = (Math.pow(last.total / first.total, 1 / years) - 1) * 100;
  if (!Number.isFinite(pct)) return null;
  return { pct: Math.round(pct * 10) / 10, years: Math.round(years * 10) / 10 };
}

export default function NetworthChart({ data }: { data: NetworthRecord[] }) {
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const labels = sortedData.map((d) => d.month);
  const values = sortedData.map((d) => d.total);
  const cagr = historicalCagr(sortedData);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Networth',
        data: values,
        borderColor: FP.mint,
        backgroundColor: (context: any) => {
          const { chart } = context;
          if (!chart.chartArea) return FP.mint + '20';
          return getAreaGradient(chart.ctx, chart.chartArea, FP.mint);
        },
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
            const change = sortedData[idx]?.month_over_month_pct;
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
    <div>
      {cagr && (
        <div className="flex justify-end mb-2">
          <Badge variant="secondary" className="font-mono text-xs">
            CAGR {cagr.pct >= 0 ? '+' : ''}{cagr.pct}%/yr ({cagr.years}y) — incl. deposits
          </Badge>
        </div>
      )}
      <div className="relative h-72">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
