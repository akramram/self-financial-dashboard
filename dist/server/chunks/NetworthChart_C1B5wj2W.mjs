import { jsx } from 'react/jsx-runtime';
import 'react';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { f as formatIdr } from './utils_DHI1a69c.mjs';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend);
function NetworthChart({ data }) {
  const labels = data.map((d) => d.month);
  const values = data.map((d) => d.total);
  const chartData = {
    labels,
    datasets: [
      {
        label: "Networth",
        data: values,
        borderColor: "#8b5cf6",
        backgroundColor: "rgba(139, 92, 246, 0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `Networth: ${formatIdr(ctx.parsed.y)}`,
          afterLabel: (ctx) => {
            const idx = ctx.dataIndex;
            const change = data[idx]?.month_over_month_pct;
            if (change == null) return "";
            return `MoM Change: ${change > 0 ? "+" : ""}${change}%`;
          }
        }
      }
    },
    scales: {
      y: { beginAtZero: false }
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "relative h-72", children: /* @__PURE__ */ jsx(Line, { data: chartData, options }) });
}

export { NetworthChart as N };
