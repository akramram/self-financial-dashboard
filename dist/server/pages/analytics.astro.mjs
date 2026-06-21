/* empty css                               */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BN-0jZ66.mjs';
import 'kleur/colors';
import { a as getMonthSortKey, f as formatIdr, $ as $$Layout } from '../chunks/utils_JbfoWkNO.mjs';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { useMemo, useState, useEffect } from 'react';
import { b as fetchTransactions } from '../chunks/api_CEy8D9Rv.mjs';
import { C as Card, c as CardContent, a as CardHeader, b as CardTitle } from '../chunks/card_CCET0Yjm.mjs';
import { B as Badge } from '../chunks/badge_DvkSPMv8.mjs';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from '../chunks/select_DnqrgBja.mjs';
import { T as Table, a as TableHeader, b as TableRow, c as TableHead, d as TableBody, e as TableCell } from '../chunks/table_DaH70Rt2.mjs';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription } from '../chunks/dialog_B3LETe1A.mjs';
import { Chart, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler, ArcElement } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Zap, Target, Clock, Hash, Activity, BarChart3, PieChart, TrendingUp, TrendingDown } from 'lucide-react';
import { g as getMonthlySummary, a as getCategories, d as db } from '../chunks/db_TxX34wAz.mjs';
export { renderers } from '../renderers.mjs';

Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);
const DOW_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function SpendingAnalytics({ summaries, categories }) {
  const months = useMemo(() => {
    return [...summaries].sort((a, b) => getMonthSortKey(b.month) - getMonthSortKey(a.month)).map((s) => s.month);
  }, [summaries]);
  const [selectedMonth, setSelectedMonth] = useState(months[0] || "");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categoryTxs, setCategoryTxs] = useState([]);
  const categoryMap = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      map[c.name] = c;
    });
    return map;
  }, [categories]);
  useEffect(() => {
    if (!selectedMonth) return;
    setLoading(true);
    fetch(`/api/analytics?month=${encodeURIComponent(selectedMonth)}`).then((res) => res.json()).then((json) => setData(json)).catch(() => setData(null)).finally(() => setLoading(false));
  }, [selectedMonth]);
  const topCategories = useMemo(() => {
    const summary = summaries.find((s) => s.month === selectedMonth);
    if (!summary?.category_totals) return [];
    return Object.entries(summary.category_totals).sort(([, a], [, b]) => b - a).slice(0, 8).map(([name, amount]) => ({
      name,
      amount,
      color: categoryMap[name]?.color || "#64748b",
      limit: categoryMap[name]?.monthly_limit ?? 0
    }));
  }, [selectedMonth, summaries, categoryMap]);
  const prevMonthCategories = useMemo(() => {
    const currentIdx = months.indexOf(selectedMonth);
    if (currentIdx < 0 || currentIdx >= months.length - 1) return null;
    const prevMonth = months[currentIdx + 1];
    const prevSummary = summaries.find((s) => s.month === prevMonth);
    return prevSummary?.category_totals ?? null;
  }, [selectedMonth, months, summaries]);
  const openCategoryDrillDown = async (cat) => {
    setSelectedCategory(cat);
    setDialogOpen(true);
    try {
      const txs = await fetchTransactions({ month: selectedMonth, category: cat });
      setCategoryTxs(txs);
    } catch {
      setCategoryTxs([]);
    }
  };
  if (loading && !data) {
    return /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center h-64", children: /* @__PURE__ */ jsx("div", { className: "text-slate-400", children: "Loading analytics..." }) });
  }
  if (!data) {
    return /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center h-64", children: /* @__PURE__ */ jsx("div", { className: "text-slate-400", children: "No data available for this period." }) });
  }
  const { daily, dow, stats, velocity, titleSpending } = data;
  const topMerchants = useMemo(() => {
    if (!titleSpending || titleSpending.length === 0) return [];
    return titleSpending.filter((t) => t.paid_amount > 0).slice(0, 10);
  }, [titleSpending]);
  const merchantChartData = useMemo(() => {
    if (topMerchants.length === 0) return null;
    const reversed = [...topMerchants].reverse();
    return {
      labels: reversed.map((t) => t.title.length > 25 ? t.title.slice(0, 25) + "..." : t.title),
      datasets: [
        {
          label: "Paid Amount",
          data: reversed.map((t) => t.paid_amount),
          backgroundColor: reversed.map((t) => {
            const catColor = categoryMap[t.category]?.color;
            if (catColor) return catColor + "CC";
            return "rgba(99, 102, 241, 0.7)";
          }),
          borderRadius: 4,
          borderSkipped: false
        }
      ]
    };
  }, [topMerchants, categoryMap]);
  const dailyChartData = {
    labels: daily.map((d) => {
      const date = /* @__PURE__ */ new Date(d.day + "T00:00:00");
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }),
    datasets: [
      {
        label: "Daily Spending",
        data: daily.map((d) => d.paid_amount),
        borderColor: "#6366f1",
        backgroundColor: "rgba(99, 102, 241, 0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: daily.length > 20 ? 2 : 4,
        pointHoverRadius: 6
      },
      {
        label: "Historical Avg",
        data: daily.map(() => velocity.historical_avg_daily),
        borderColor: "#94a3b8",
        borderDash: [6, 4],
        borderWidth: 1,
        pointRadius: 0,
        fill: false
      }
    ]
  };
  const dowChartData = {
    labels: DOW_SHORT,
    datasets: [
      {
        label: "Total Spent",
        data: DOW_LABELS.map((_, i) => {
          const row = dow.find((d) => d.dow === i);
          return row?.paid_amount ?? 0;
        }),
        backgroundColor: DOW_LABELS.map((_, i) => {
          const row = dow.find((d) => d.dow === i);
          if (!row) return "rgba(100, 116, 139, 0.5)";
          return i === 0 || i === 6 ? "rgba(99, 102, 241, 0.8)" : "rgba(16, 185, 129, 0.8)";
        }),
        borderRadius: 6
      }
    ]
  };
  const catChartData = {
    labels: topCategories.map((c) => c.name),
    datasets: [
      {
        data: topCategories.map((c) => c.amount),
        backgroundColor: topCategories.map((c) => c.color),
        borderWidth: 2,
        borderColor: "#ffffff"
      }
    ]
  };
  const velocityUp = velocity.velocity_vs_history >= 0;
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-slate-600 dark:text-slate-300", children: "Period:" }),
      /* @__PURE__ */ jsxs(Select, { value: selectedMonth, onValueChange: setSelectedMonth, children: [
        /* @__PURE__ */ jsx(SelectTrigger, { className: "w-[200px]", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
        /* @__PURE__ */ jsx(SelectContent, { children: months.map((m) => /* @__PURE__ */ jsx(SelectItem, { value: m, children: m }, m)) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: [
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "pt-4 pb-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-1", children: [
          /* @__PURE__ */ jsx(Zap, { className: "w-4 h-4 text-indigo-500" }),
          /* @__PURE__ */ jsx("span", { className: "text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Avg Daily" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "text-xl font-bold", children: formatIdr(velocity.current_avg_daily) }),
        /* @__PURE__ */ jsxs("div", { className: `text-xs mt-1 ${velocityUp ? "text-red-500" : "text-emerald-500"}`, children: [
          velocityUp ? "↑" : "↓",
          " ",
          Math.abs(velocity.velocity_vs_history).toFixed(0),
          "% vs avg"
        ] })
      ] }) }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "pt-4 pb-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-1", children: [
          /* @__PURE__ */ jsx(Target, { className: "w-4 h-4 text-emerald-500" }),
          /* @__PURE__ */ jsx("span", { className: "text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Projected" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "text-xl font-bold", children: formatIdr(velocity.projected_monthly) }),
        /* @__PURE__ */ jsxs("div", { className: "text-xs text-slate-400 mt-1", children: [
          "Based on ",
          velocity.days_with_spending,
          " spending days"
        ] })
      ] }) }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "pt-4 pb-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-1", children: [
          /* @__PURE__ */ jsx(Clock, { className: "w-4 h-4 text-amber-500" }),
          /* @__PURE__ */ jsx("span", { className: "text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Cumulative" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "text-xl font-bold", children: formatIdr(velocity.cumulative_spend) }),
        /* @__PURE__ */ jsxs("div", { className: "text-xs text-slate-400 mt-1", children: [
          "Over ",
          velocity.days_tracked,
          " tracked days"
        ] })
      ] }) }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "pt-4 pb-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-1", children: [
          /* @__PURE__ */ jsx(Hash, { className: "w-4 h-4 text-blue-500" }),
          /* @__PURE__ */ jsx("span", { className: "text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Transactions" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "text-xl font-bold", children: stats.count }),
        /* @__PURE__ */ jsxs("div", { className: "text-xs text-slate-400 mt-1", children: [
          stats.paid_count,
          " paid · ",
          stats.unpaid_count,
          " unpaid"
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsxs(CardHeader, { className: "pb-2", children: [
        /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Activity, { className: "w-4 h-4 text-slate-500" }),
          "Daily Spending Trend"
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-400", children: "Daily paid spending vs historical average (dashed line)" })
      ] }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", { className: "h-[280px]", children: /* @__PURE__ */ jsx(
        Line,
        {
          data: dailyChartData,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: true, position: "top", labels: { boxWidth: 12, font: { size: 11 } } },
              tooltip: {
                callbacks: {
                  label: (ctx) => `${ctx.dataset.label}: ${formatIdr(ctx.raw)}`
                }
              }
            },
            scales: {
              x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 45 } },
              y: {
                beginAtZero: true,
                ticks: {
                  font: { size: 10 },
                  callback: (val) => {
                    const n = Number(val);
                    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
                    if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
                    return val;
                  }
                }
              }
            },
            interaction: { intersect: false, mode: "index" }
          }
        }
      ) }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsxs(CardHeader, { className: "pb-2", children: [
          /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(BarChart3, { className: "w-4 h-4 text-slate-500" }),
            "Spending by Day of Week"
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-400", children: "All-time totals. Weekends in purple, weekdays in green." })
        ] }),
        /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", { className: "h-[250px]", children: /* @__PURE__ */ jsx(
          Bar,
          {
            data: dowChartData,
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    title: (items) => {
                      const idx = items[0]?.dataIndex ?? 0;
                      return DOW_LABELS[idx];
                    },
                    afterBody: (items) => {
                      const idx = items[0]?.dataIndex ?? 0;
                      const row = dow.find((d) => d.dow === idx);
                      if (!row) return "";
                      return `${row.tx_count} transactions`;
                    },
                    label: (ctx) => `Total: ${formatIdr(ctx.raw)}`
                  }
                }
              },
              scales: {
                x: { grid: { display: false } },
                y: {
                  beginAtZero: true,
                  ticks: {
                    font: { size: 10 },
                    callback: (val) => {
                      const n = Number(val);
                      if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
                      if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
                      return val;
                    }
                  }
                }
              }
            }
          }
        ) }) })
      ] }),
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsxs(CardHeader, { className: "pb-2", children: [
          /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(PieChart, { className: "w-4 h-4 text-slate-500" }),
            "Category Breakdown"
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-400", children: "Click a category below the chart to drill down into transactions." })
        ] }),
        /* @__PURE__ */ jsx(CardContent, { children: topCategories.length > 0 ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("div", { className: "h-[200px] mx-auto", style: { maxWidth: 200 }, children: /* @__PURE__ */ jsx(
            Doughnut,
            {
              data: catChartData,
              options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "55%",
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => `${ctx.label}: ${formatIdr(ctx.raw)}`
                    }
                  }
                }
              }
            }
          ) }),
          /* @__PURE__ */ jsx("div", { className: "mt-4 space-y-2", children: topCategories.map((cat) => {
            const prev = prevMonthCategories?.[cat.name];
            const prevPct = prev ? (cat.amount - prev) / prev * 100 : null;
            return /* @__PURE__ */ jsxs(
              "div",
              {
                className: "flex items-center justify-between text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded px-2 py-1 -mx-2 transition",
                onClick: () => openCategoryDrillDown(cat.name),
                children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ jsx(
                      "div",
                      {
                        className: "w-3 h-3 rounded-sm",
                        style: { backgroundColor: cat.color }
                      }
                    ),
                    /* @__PURE__ */ jsx("span", { className: "text-slate-700 dark:text-slate-300", children: cat.name })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ jsx("span", { className: "font-medium", children: formatIdr(cat.amount) }),
                    prevPct !== null && /* @__PURE__ */ jsxs(
                      Badge,
                      {
                        variant: "secondary",
                        className: `text-[10px] px-1.5 py-0 ${prevPct > 0 ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"}`,
                        children: [
                          prevPct > 0 ? "↑" : "↓",
                          Math.abs(prevPct).toFixed(0),
                          "%"
                        ]
                      }
                    )
                  ] })
                ]
              },
              cat.name
            );
          }) })
        ] }) : /* @__PURE__ */ jsx("div", { className: "text-sm text-slate-400 h-[200px] flex items-center justify-center", children: "No spending data for this period" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Hash, { className: "w-4 h-4 text-slate-500" }),
        "Transaction Statistics"
      ] }) }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { className: "text-slate-500", children: "Metric" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Value" })
        ] }) }),
        /* @__PURE__ */ jsxs(TableBody, { children: [
          /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableCell, { className: "text-slate-600 dark:text-slate-300", children: "Total Paid Spending" }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-right font-semibold", children: formatIdr(stats.paid_amount) })
          ] }),
          /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableCell, { className: "text-slate-600 dark:text-slate-300", children: "Unpaid Total" }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-right font-semibold text-amber-600 dark:text-amber-400", children: formatIdr(stats.unpaid_amount) })
          ] }),
          /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableCell, { className: "text-slate-600 dark:text-slate-300", children: "Average Transaction (paid)" }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: formatIdr(stats.avg_amount) })
          ] }),
          /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableCell, { className: "text-slate-600 dark:text-slate-300", children: "Median Transaction (paid)" }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: formatIdr(stats.median_amount) })
          ] }),
          /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableCell, { className: "text-slate-600 dark:text-slate-300", children: "Largest Transaction" }),
            /* @__PURE__ */ jsxs(TableCell, { className: "text-right", children: [
              /* @__PURE__ */ jsx("span", { className: "font-semibold", children: formatIdr(stats.max_amount) }),
              stats.largest_title && /* @__PURE__ */ jsx("span", { className: "text-xs text-slate-400 ml-2", children: stats.largest_title })
            ] })
          ] }),
          /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableCell, { className: "text-slate-600 dark:text-slate-300", children: "Smallest Transaction" }),
            /* @__PURE__ */ jsxs(TableCell, { className: "text-right", children: [
              /* @__PURE__ */ jsx("span", { className: "font-semibold", children: formatIdr(stats.min_amount) }),
              stats.smallest_title && /* @__PURE__ */ jsx("span", { className: "text-xs text-slate-400 ml-2", children: stats.smallest_title })
            ] })
          ] }),
          /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableCell, { className: "text-slate-600 dark:text-slate-300", children: "Total Transactions" }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: stats.count })
          ] }),
          /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableCell, { className: "text-slate-600 dark:text-slate-300", children: "Paid / Unpaid" }),
            /* @__PURE__ */ jsxs(TableCell, { className: "text-right", children: [
              /* @__PURE__ */ jsx("span", { className: "text-emerald-600 dark:text-emerald-400", children: stats.paid_count }),
              /* @__PURE__ */ jsx("span", { className: "text-slate-400 mx-1", children: "/" }),
              /* @__PURE__ */ jsx("span", { className: "text-amber-600 dark:text-amber-400", children: stats.unpaid_count })
            ] })
          ] })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Zap, { className: "w-4 h-4 text-slate-500" }),
        "Spending Velocity"
      ] }) }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm text-slate-500 mb-1", children: "Current Avg / Day" }),
          /* @__PURE__ */ jsx("div", { className: "text-lg font-bold", children: formatIdr(velocity.current_avg_daily) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm text-slate-500 mb-1", children: "Historical Avg / Day" }),
          /* @__PURE__ */ jsx("div", { className: "text-lg font-bold", children: formatIdr(velocity.historical_avg_daily) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm text-slate-500 mb-1", children: "vs Historical" }),
          /* @__PURE__ */ jsxs("div", { className: `text-lg font-bold ${velocityUp ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`, children: [
            velocityUp ? "+" : "",
            velocity.velocity_vs_history.toFixed(1),
            "%"
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-1 mt-1", children: [
            velocityUp ? /* @__PURE__ */ jsx(TrendingUp, { className: "w-4 h-4 text-red-500" }) : /* @__PURE__ */ jsx(TrendingDown, { className: "w-4 h-4 text-emerald-500" }),
            /* @__PURE__ */ jsx("span", { className: "text-xs text-slate-500", children: Math.abs(velocity.velocity_vs_history) > 20 ? velocityUp ? "Spending significantly higher than usual" : "Great — spending well below average" : Math.abs(velocity.velocity_vs_history) > 5 ? velocityUp ? "Slightly above your typical pace" : "Slightly below your typical pace" : "On track with your historical average" })
          ] })
        ] })
      ] }) })
    ] }),
    topMerchants.length > 0 && /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsxs(CardHeader, { className: "pb-2", children: [
        /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Hash, { className: "w-4 h-4 text-slate-500" }),
          "Top Merchants"
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-400", children: "Where your money went this period — grouped by transaction title." })
      ] }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-5 gap-6", children: [
        merchantChartData && /* @__PURE__ */ jsx("div", { className: "lg:col-span-3 h-[320px]", children: /* @__PURE__ */ jsx(
          Bar,
          {
            data: merchantChartData,
            options: {
              indexAxis: "y",
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx) => {
                      const idx = ctx.dataIndex;
                      const merchant = topMerchants[topMerchants.length - 1 - idx];
                      if (!merchant) return formatIdr(ctx.raw);
                      return [
                        `Total: ${formatIdr(merchant.paid_amount)}`,
                        `Transactions: ${merchant.tx_count}`,
                        `Avg: ${formatIdr(merchant.avg_amount)}`,
                        `Category: ${merchant.category}`
                      ];
                    }
                  }
                }
              },
              scales: {
                x: {
                  beginAtZero: true,
                  ticks: {
                    font: { size: 10 },
                    callback: (val) => {
                      const n = Number(val);
                      if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
                      if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
                      return val;
                    }
                  }
                },
                y: {
                  ticks: { font: { size: 10 } }
                }
              }
            }
          }
        ) }),
        /* @__PURE__ */ jsx("div", { className: "lg:col-span-2", children: /* @__PURE__ */ jsxs(Table, { children: [
          /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableHead, { className: "text-xs", children: "Merchant" }),
            /* @__PURE__ */ jsx(TableHead, { className: "text-xs text-right", children: "Spent" }),
            /* @__PURE__ */ jsx(TableHead, { className: "text-xs text-right", children: "#" })
          ] }) }),
          /* @__PURE__ */ jsx(TableBody, { children: topMerchants.map((m) => /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableCell, { className: "text-xs py-1.5", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsx(
                "span",
                {
                  className: "w-2 h-2 rounded-full shrink-0",
                  style: { backgroundColor: categoryMap[m.category]?.color || "#64748b" }
                }
              ),
              /* @__PURE__ */ jsx("span", { className: "truncate max-w-[140px]", title: m.title, children: m.title })
            ] }) }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-xs text-right font-medium py-1.5", children: formatIdr(m.paid_amount) }),
            /* @__PURE__ */ jsxs(TableCell, { className: "text-xs text-right text-slate-400 py-1.5", children: [
              m.tx_count,
              "x"
            ] })
          ] }, m.title)) })
        ] }) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(Dialog, { open: dialogOpen, onOpenChange: setDialogOpen, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-2xl max-h-[80vh] overflow-auto", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxs(DialogTitle, { children: [
          "Category: ",
          selectedCategory
        ] }),
        /* @__PURE__ */ jsxs(DialogDescription, { children: [
          "Transactions for ",
          selectedCategory,
          " in ",
          selectedMonth
        ] })
      ] }),
      categoryTxs.length > 0 ? /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { children: "Title" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Type" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Amount" })
        ] }) }),
        /* @__PURE__ */ jsx(TableBody, { children: categoryTxs.map((tx) => /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxs(TableCell, { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: tx.done ? "" : "opacity-50", children: tx.title }),
            !tx.done && /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "text-[10px] px-1.5 py-0", children: "Unpaid" })
          ] }),
          /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "text-[10px]", children: tx.type === "cash" ? "Cash" : tx.type === "credit_payment" ? "Credit Pay" : "Credit" }) }),
          /* @__PURE__ */ jsx(TableCell, { className: "text-right font-medium", children: formatIdr(tx.amount) })
        ] }, tx.id)) })
      ] }) : /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-400", children: "No transactions found for this category." })
    ] }) })
  ] });
}

const $$Analytics = createComponent(($$result, $$props, $$slots) => {
  const summaries = getMonthlySummary();
  const categories = getCategories();
  const incomeRows = db.prepare("SELECT mi.period_id, mi.income, p.month FROM monthly_income mi JOIN periods p ON mi.period_id = p.id").all();
  const incomeMap = new Map(incomeRows.map((r) => [r.month, r.income]));
  for (const s of summaries) {
    const income = incomeMap.get(s.month) || 0;
    s.income = income;
    s.savings = income - s.outcome.total;
    s.savings_rate_pct = income > 0 ? Number((s.savings / income * 100).toFixed(2)) : 0;
  }
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Spending Analytics - Financial Dashboard" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-6"> <h1 class="text-2xl font-bold">Spending Analytics</h1> <p class="text-slate-500 dark:text-slate-400 text-sm">
Deep-dive into your spending patterns: daily trends, day-of-week analysis, category breakdowns, and spending velocity.
</p> </div> ${renderComponent($$result2, "SpendingAnalytics", SpendingAnalytics, { "summaries": summaries, "categories": categories, "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/SpendingAnalytics", "client:component-export": "default" })} ` })}`;
}, "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/analytics.astro", void 0);

const $$file = "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/analytics.astro";
const $$url = "/analytics";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Analytics,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
