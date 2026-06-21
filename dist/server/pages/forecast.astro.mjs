/* empty css                               */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BN-0jZ66.mjs';
import 'kleur/colors';
import { f as formatIdr, $ as $$Layout } from '../chunks/utils_B5Myb6nO.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
import { C as Card, c as CardContent, a as CardHeader, d as CardDescription, b as CardTitle } from '../chunks/card_DQjFT-ZO.mjs';
import '../chunks/badge_D2r9e7Nn.mjs';
import '../chunks/button_ya11cJX2.mjs';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from '../chunks/select_BdQoKGwf.mjs';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
export { renderers } from '../renderers.mjs';

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);
function ConfidenceBadge({ level }) {
  const colors = {
    high: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    low: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
  };
  return /* @__PURE__ */ jsxs("span", { className: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[level] || colors.low}`, children: [
    level.charAt(0).toUpperCase() + level.slice(1),
    " confidence"
  ] });
}
function AlertIcon({ type }) {
  if (type === "danger") return /* @__PURE__ */ jsx("span", { className: "text-red-500 text-lg", children: "⚠️" });
  if (type === "warning") return /* @__PURE__ */ jsx("span", { className: "text-amber-500 text-lg", children: "⚡" });
  return /* @__PURE__ */ jsx("span", { className: "text-blue-500 text-lg", children: "ℹ️" });
}
function ProgressBar({ value, max, color, projectedColor }) {
  const pct = Math.min(100, value / max * 100);
  return /* @__PURE__ */ jsx("div", { className: "w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden relative", children: /* @__PURE__ */ jsx(
    "div",
    {
      className: "h-full rounded-full transition-all duration-500",
      style: { width: `${pct}%`, backgroundColor: color }
    }
  ) });
}
function Forecast() {
  const [data, setData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchForecast("");
  }, []);
  const fetchForecast = async (month) => {
    setLoading(true);
    try {
      const params = month ? `?month=${encodeURIComponent(month)}` : "";
      const res = await fetch(`/api/forecast${params}`);
      const json = await res.json();
      setData(json);
      if (!month && json.allMonths.length > 0) {
        setSelectedMonth(json.allMonths[json.allMonths.length - 1]);
      }
    } catch (err) {
      console.error("Failed to fetch forecast:", err);
    }
    setLoading(false);
  };
  const handleMonthChange = (month) => {
    setSelectedMonth(month);
    fetchForecast(month);
  };
  if (loading) {
    return /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center py-20", children: [
      /* @__PURE__ */ jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" }),
      /* @__PURE__ */ jsx("span", { className: "ml-3 text-slate-500", children: "Loading forecast..." })
    ] });
  }
  if (!data?.forecast) {
    return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "py-12 text-center", children: /* @__PURE__ */ jsx("p", { className: "text-slate-500", children: "No transaction data available for forecasting. Add some transactions first!" }) }) });
  }
  const f = data.forecast;
  const trajectoryLabels = [
    ...f.cumulative.map((d) => d.day.slice(5)),
    // MM-DD
    ...f.projectedTrajectory.map((d) => d.day.slice(5))
  ];
  const actualData = [
    ...f.cumulative.map((d) => d.cumulative),
    ...f.projectedTrajectory.map(() => null)
  ];
  const projectedData = [
    ...f.cumulative.slice(-1).map((d) => d.cumulative),
    ...f.projectedTrajectory.map((d) => d.cumulative)
  ];
  if (actualData.length > 0 && projectedData.length > 1) {
    actualData[actualData.length - 1] = projectedData[0];
  }
  const trajectoryChart = {
    labels: trajectoryLabels,
    datasets: [
      {
        label: "Actual Spending",
        data: actualData,
        borderColor: "rgb(99, 102, 241)",
        backgroundColor: "rgba(99, 102, 241, 0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        borderWidth: 2
      },
      {
        label: "Projected",
        data: projectedData,
        borderColor: "rgb(244, 63, 94)",
        backgroundColor: "rgba(244, 63, 94, 0.05)",
        borderDash: [6, 4],
        fill: true,
        tension: 0.3,
        pointRadius: 1,
        borderWidth: 2
      }
    ]
  };
  const historicalChart = {
    labels: f.recentMonthly.map((m) => m.month),
    datasets: [
      {
        label: "Total Spent",
        data: f.recentMonthly.map((m) => m.total),
        backgroundColor: f.recentMonthly.map(
          (m) => m.month === f.month ? "rgba(99, 102, 241, 0.8)" : "rgba(99, 102, 241, 0.4)"
        ),
        borderRadius: 6
      },
      {
        label: "Daily Average × 30",
        data: f.recentMonthly.map((m) => m.daily_avg * 30),
        backgroundColor: "rgba(244, 63, 94, 0.3)",
        borderRadius: 6
      }
    ]
  };
  const creditChartData = {
    labels: ["Credit Payments", "Outstanding"],
    datasets: [
      {
        data: [f.creditStatus.creditPayments, f.creditStatus.outstanding],
        backgroundColor: ["rgba(16, 185, 129, 0.7)", "rgba(239, 68, 68, 0.7)"],
        borderWidth: 0
      }
    ]
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top", labels: { font: { size: 12 } } },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatIdr(ctx.parsed.y)}`
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: (value) => {
            if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
            if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
            return value;
          }
        }
      }
    }
  };
  const statusColors = {
    safe: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-orange-600 dark:text-orange-400",
    critical: "text-red-600 dark:text-red-400"
  };
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-sm font-medium text-slate-500", children: "Forecast for:" }),
      /* @__PURE__ */ jsxs(Select, { value: selectedMonth, onValueChange: handleMonthChange, children: [
        /* @__PURE__ */ jsx(SelectTrigger, { className: "w-[200px]", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
        /* @__PURE__ */ jsx(SelectContent, { children: data.allMonths.map((m) => /* @__PURE__ */ jsx(SelectItem, { value: m, children: m }, m)) })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "space-y-2", children: f.alerts.map((alert, i) => /* @__PURE__ */ jsxs(
      "div",
      {
        className: `flex items-start gap-3 px-4 py-3 rounded-xl text-sm ${alert.type === "danger" ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800" : alert.type === "warning" ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800" : "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"}`,
        children: [
          /* @__PURE__ */ jsx(AlertIcon, { type: alert.type }),
          /* @__PURE__ */ jsx("span", { className: alert.type === "danger" ? "text-red-700 dark:text-red-300 font-medium" : "text-slate-700 dark:text-slate-300", children: alert.message })
        ]
      },
      i
    )) }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", children: [
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsx(CardDescription, { children: "Current Spending" }) }),
        /* @__PURE__ */ jsxs(CardContent, { children: [
          /* @__PURE__ */ jsx("div", { className: "text-2xl font-bold", children: formatIdr(f.totalSpent) }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 mt-1", children: [
            "Day ",
            f.daysElapsed,
            " of ~",
            f.periodLength,
            " · Avg ",
            formatIdr(f.dailyAvg),
            "/day"
          ] }),
          f.totalUnpaid > 0 && /* @__PURE__ */ jsxs("p", { className: "text-xs text-orange-500 mt-1", children: [
            "+ ",
            formatIdr(f.totalUnpaid),
            " unpaid"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsx(CardDescription, { children: "Projected Total" }) }),
        /* @__PURE__ */ jsxs(CardContent, { children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx("div", { className: "text-2xl font-bold", children: formatIdr(f.projectedTotal) }),
            /* @__PURE__ */ jsx(ConfidenceBadge, { level: f.projectionConfidence })
          ] }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 mt-1", children: [
            f.daysRemaining,
            " days remaining"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsx(CardDescription, { children: "Spending Velocity" }) }),
        /* @__PURE__ */ jsxs(CardContent, { children: [
          /* @__PURE__ */ jsxs("div", { className: `text-2xl font-bold ${f.velocityVsHistory > 20 ? "text-red-600 dark:text-red-400" : f.velocityVsHistory < -20 ? "text-emerald-600 dark:text-emerald-400" : ""}`, children: [
            f.velocityVsHistory > 0 ? "+" : "",
            Math.round(f.velocityVsHistory),
            "%"
          ] }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 mt-1", children: [
            "vs ",
            f.daysElapsed,
            "-day historical average"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsx(CardDescription, { children: "Credit Outstanding" }) }),
        /* @__PURE__ */ jsxs(CardContent, { children: [
          /* @__PURE__ */ jsx("div", { className: `text-2xl font-bold ${f.creditStatus.outstanding > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`, children: formatIdr(f.creditStatus.outstanding) }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 mt-1", children: [
            formatIdr(f.creditStatus.creditExpenses),
            " spent · ",
            formatIdr(f.creditStatus.creditPayments),
            " paid"
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsxs(CardHeader, { children: [
        /* @__PURE__ */ jsx(CardTitle, { className: "text-lg", children: "Spending Trajectory" }),
        /* @__PURE__ */ jsx(CardDescription, { children: "Actual cumulative spending vs projected end-of-month total" })
      ] }),
      /* @__PURE__ */ jsxs(CardContent, { children: [
        /* @__PURE__ */ jsx("div", { className: "h-[300px]", children: /* @__PURE__ */ jsx(Line, { data: trajectoryChart, options: {
          ...chartOptions,
          plugins: {
            ...chartOptions.plugins,
            annotation: void 0,
            tooltip: {
              ...chartOptions.plugins.tooltip,
              mode: "index",
              intersect: false
            }
          }
        } }) }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-6 mt-3 text-xs text-slate-500", children: [
          /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: "w-4 h-0.5 bg-indigo-500 inline-block" }),
            " Actual"
          ] }),
          /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: "w-4 h-0.5 bg-red-500 inline-block border-dashed border-t border-red-500" }),
            " Projected"
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsxs(CardHeader, { children: [
          /* @__PURE__ */ jsx(CardTitle, { className: "text-lg", children: "Budget Burn Rate" }),
          /* @__PURE__ */ jsx(CardDescription, { children: "Category spending vs budget limits (with projection)" })
        ] }),
        /* @__PURE__ */ jsx(CardContent, { children: f.budgetStatus.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-500 py-4 text-center", children: "No category budgets set. Configure limits in Settings to see burn rates." }) : /* @__PURE__ */ jsx("div", { className: "space-y-4", children: f.budgetStatus.map((bs) => /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-sm", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(
                "span",
                {
                  className: "w-3 h-3 rounded-full inline-block",
                  style: { backgroundColor: bs.color }
                }
              ),
              /* @__PURE__ */ jsx("span", { className: "font-medium", children: bs.category })
            ] }),
            /* @__PURE__ */ jsxs("span", { className: statusColors[bs.status], children: [
              Math.round(bs.spentPct),
              "% used"
            ] })
          ] }),
          /* @__PURE__ */ jsx(
            ProgressBar,
            {
              value: bs.spent,
              max: bs.limit,
              color: bs.status === "safe" ? "#10b981" : bs.status === "warning" ? "#f59e0b" : bs.status === "danger" ? "#f97316" : "#ef4444"
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-xs text-slate-500", children: [
            /* @__PURE__ */ jsxs("span", { children: [
              formatIdr(bs.spent),
              " of ",
              formatIdr(bs.limit)
            ] }),
            /* @__PURE__ */ jsxs("span", { className: statusColors[bs.status], children: [
              "Proj: ",
              formatIdr(bs.projected)
            ] })
          ] })
        ] }, bs.category)) }) })
      ] }),
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsxs(CardHeader, { children: [
          /* @__PURE__ */ jsx(CardTitle, { className: "text-lg", children: "Credit Utilization" }),
          /* @__PURE__ */ jsx(CardDescription, { children: "Credit card expenses vs payments this period" })
        ] }),
        /* @__PURE__ */ jsxs(CardContent, { children: [
          /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center mb-4", children: /* @__PURE__ */ jsx("div", { className: "w-[200px] h-[200px]", children: /* @__PURE__ */ jsx(
            Doughnut,
            {
              data: creditChartData,
              options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: "65%",
                plugins: {
                  legend: { position: "bottom" },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => `${ctx.label}: ${formatIdr(ctx.parsed)}`
                    }
                  }
                }
              }
            }
          ) }) }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2 text-sm", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
              /* @__PURE__ */ jsx("span", { className: "text-slate-500", children: "Credit Expenses (paid)" }),
              /* @__PURE__ */ jsx("span", { className: "font-medium", children: formatIdr(f.creditStatus.creditExpenses) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
              /* @__PURE__ */ jsx("span", { className: "text-slate-500", children: "Credit Payments (paid)" }),
              /* @__PURE__ */ jsx("span", { className: "font-medium text-emerald-600 dark:text-emerald-400", children: formatIdr(f.creditStatus.creditPayments) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between border-t pt-2", children: [
              /* @__PURE__ */ jsx("span", { className: "text-slate-500", children: "Outstanding Balance" }),
              /* @__PURE__ */ jsx("span", { className: `font-bold ${f.creditStatus.outstanding > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`, children: formatIdr(f.creditStatus.outstanding) })
            ] }),
            f.creditStatus.unpaidCredit > 0 && /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-xs text-orange-500", children: [
              /* @__PURE__ */ jsx("span", { children: "Unpaid credit expenses" }),
              /* @__PURE__ */ jsx("span", { children: formatIdr(f.creditStatus.unpaidCredit) })
            ] }),
            f.creditStatus.unpaidPayments > 0 && /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-xs text-blue-500", children: [
              /* @__PURE__ */ jsx("span", { children: "Unscheduled credit payments" }),
              /* @__PURE__ */ jsx("span", { children: formatIdr(f.creditStatus.unpaidPayments) })
            ] })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsxs(CardHeader, { children: [
        /* @__PURE__ */ jsx(CardTitle, { className: "text-lg", children: "Historical Monthly Spending" }),
        /* @__PURE__ */ jsx(CardDescription, { children: "Total spending per month compared to daily average × 30 (normalized projection)" })
      ] }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", { className: "h-[250px]", children: /* @__PURE__ */ jsx(Bar, { data: historicalChart, options: {
        ...chartOptions,
        plugins: {
          ...chartOptions.plugins,
          legend: { position: "top" }
        }
      } }) }) })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsxs(CardHeader, { children: [
        /* @__PURE__ */ jsx(CardTitle, { className: "text-lg", children: "Spending Velocity Breakdown" }),
        /* @__PURE__ */ jsx(CardDescription, { children: "Detailed velocity metrics comparing current period to historical patterns" })
      ] }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "p-4 rounded-xl bg-slate-50 dark:bg-slate-800", children: [
          /* @__PURE__ */ jsx("div", { className: "text-xs text-slate-500 mb-1", children: "Current Avg/Day" }),
          /* @__PURE__ */ jsx("div", { className: "text-lg font-bold", children: formatIdr(f.velocity.current_avg_daily) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "p-4 rounded-xl bg-slate-50 dark:bg-slate-800", children: [
          /* @__PURE__ */ jsx("div", { className: "text-xs text-slate-500 mb-1", children: "Historical Avg/Day" }),
          /* @__PURE__ */ jsx("div", { className: "text-lg font-bold", children: formatIdr(f.velocity.historical_avg_daily) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "p-4 rounded-xl bg-slate-50 dark:bg-slate-800", children: [
          /* @__PURE__ */ jsx("div", { className: "text-xs text-slate-500 mb-1", children: "Days with Spending" }),
          /* @__PURE__ */ jsxs("div", { className: "text-lg font-bold", children: [
            f.velocity.days_with_spending,
            " ",
            /* @__PURE__ */ jsxs("span", { className: "text-sm font-normal text-slate-400", children: [
              "of ",
              f.velocity.days_tracked
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "p-4 rounded-xl bg-slate-50 dark:bg-slate-800", children: [
          /* @__PURE__ */ jsx("div", { className: "text-xs text-slate-500 mb-1", children: "Cumulative Spend" }),
          /* @__PURE__ */ jsx("div", { className: "text-lg font-bold", children: formatIdr(f.velocity.cumulative_spend) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "p-4 rounded-xl bg-slate-50 dark:bg-slate-800", children: [
          /* @__PURE__ */ jsx("div", { className: "text-xs text-slate-500 mb-1", children: "Projected Monthly" }),
          /* @__PURE__ */ jsx("div", { className: "text-lg font-bold", children: formatIdr(f.velocity.projected_monthly) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "p-4 rounded-xl bg-slate-50 dark:bg-slate-800", children: [
          /* @__PURE__ */ jsx("div", { className: "text-xs text-slate-500 mb-1", children: "Velocity vs History" }),
          /* @__PURE__ */ jsxs("div", { className: `text-lg font-bold ${f.velocity.velocity_vs_history > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`, children: [
            f.velocity.velocity_vs_history > 0 ? "+" : "",
            Math.round(f.velocity.velocity_vs_history),
            "%"
          ] })
        ] })
      ] }) })
    ] })
  ] });
}

const $$Forecast = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Forecast & Predictions - Financial Dashboard" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-6"> <h1 class="text-2xl font-bold">Forecast & Predictions</h1> <p class="text-slate-500 dark:text-slate-400 text-sm">
Projected end-of-month spending, budget burn rate alerts, credit utilization tracking, and spending velocity analysis.
</p> </div> ${renderComponent($$result2, "Forecast", Forecast, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/Forecast", "client:component-export": "default" })} ` })}`;
}, "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/forecast.astro", void 0);

const $$file = "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/forecast.astro";
const $$url = "/forecast";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Forecast,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
