/* empty css                                        */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BN-0jZ66.mjs';
import 'kleur/colors';
import { f as formatIdr, g as getActivePeriod, $ as $$Layout } from '../chunks/utils_Dm1NQFdF.mjs';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { B as kickoffMonth, f as fetchCategories, j as fetchRecurringTransactions, w as toggleTransactionDoneApi, x as deleteTransactionApi, y as updateTransactionApi } from '../chunks/api_B85Pj26R.mjs';
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { N as NetworthChart } from '../chunks/NetworthChart_Btk03mlZ.mjs';
import { C as Card, b as CardHeader, c as CardTitle, a as CardContent } from '../chunks/card_Davj9yGI.mjs';
import { B as Badge } from '../chunks/badge_B_lPct8T.mjs';
import { AlertTriangle, TrendingUp, TrendingDown, Receipt, CheckCircle, PiggyBank, Wallet, BarChart3, DollarSign, Gauge, Clock, Activity, X, ChevronUp, ChevronDown, ShoppingBag, ChevronRight, StickyNote } from 'lucide-react';
import { B as Button } from '../chunks/button_Br1WsJzs.mjs';
import { I as Input } from '../chunks/input_iPhZt7ob.mjs';
import { L as Label } from '../chunks/label_BzcOJTTH.mjs';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription } from '../chunks/dialog_BsSkt0Aj.mjs';
import { u as useSortState, S as SortableHeader } from '../chunks/SortableHeader_CmGXngLk.mjs';
import { E as EditTransactionDialog } from '../chunks/EditTransactionDialog_DCtQIDKg.mjs';
import { T as Table, a as TableHeader, b as TableRow, c as TableHead, d as TableBody, e as TableCell } from '../chunks/table_B4ZDQe-_.mjs';
import '../chunks/checkbox_DpbmdwJA.mjs';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from '../chunks/select_CUJ65ghu.mjs';
import { q as getTransactions, r as getNetworth, a as getMonthlySummary, d as db } from '../chunks/db_BgiJApmW.mjs';
export { renderers } from '../renderers.mjs';

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
function OutcomeChart({ data }) {
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const labels = sortedData.map((d) => d.month);
  const cashOutcomes = sortedData.map((d) => d.outcome.cash);
  const creditPayments = sortedData.map((d) => d.outcome.credit_payment);
  const chartData = {
    labels,
    datasets: [
      {
        label: "Cash Outcome",
        data: cashOutcomes,
        backgroundColor: "#3b82f6",
        borderRadius: 4
      },
      {
        label: "Credit Payment",
        data: creditPayments,
        backgroundColor: "#f59e0b",
        borderRadius: 4
      }
    ]
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          padding: 16
        }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatIdr(ctx.parsed.y)}`
        }
      }
    },
    scales: {
      y: { beginAtZero: true },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45
        }
      }
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "relative h-72", children: /* @__PURE__ */ jsx(Bar, { data: chartData, options }) });
}

Chart.register(ArcElement, Tooltip, Legend);
const FALLBACK_COLORS$2 = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1"
];
function CategoryChart({ data, categories = [], onCategoryClick }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const labels = entries.map(([k]) => k);
  const values = entries.map(([_, v]) => v);
  const colorMap = new Map(categories.map((c) => [c.name, c.color]));
  const colors = labels.map((label, i) => colorMap.get(label) || FALLBACK_COLORS$2[i % FALLBACK_COLORS$2.length]);
  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: colors,
        borderWidth: 0
      }
    ]
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_evt, elements) => {
      if (elements.length > 0 && onCategoryClick) {
        const index = elements[0].index;
        const category = labels[index];
        if (category) onCategoryClick(category);
      }
    },
    plugins: {
      legend: {
        position: "right",
        labels: { boxWidth: 12, font: { size: 11 } },
        onClick: (_e, legendItem, _legend) => {
          if (onCategoryClick && legendItem.text) {
            onCategoryClick(legendItem.text);
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${formatIdr(ctx.parsed)}`
        }
      }
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "relative h-72", children: /* @__PURE__ */ jsx(Doughnut, { data: chartData, options }) });
}

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);
const FALLBACK_COLORS$1 = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1"
];
function CategoryTrendChart({ data, categories = [] }) {
  const sortedData = useMemo(
    () => [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [data]
  );
  const colorMap = useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    categories.forEach((c) => map.set(c.name, c.color));
    return map;
  }, [categories]);
  const { labels, datasets } = useMemo(() => {
    const labels2 = sortedData.map((d) => d.month);
    const categoryTotals = {};
    sortedData.forEach((summary) => {
      Object.entries(summary.category_totals || {}).forEach(([cat, amount]) => {
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;
      });
    });
    const topCategories = Object.entries(categoryTotals).filter(([_, total]) => total > 0).sort((a, b) => b[1] - a[1]).map(([name]) => name);
    const datasets2 = topCategories.map((cat, idx) => {
      const color = colorMap.get(cat) || FALLBACK_COLORS$1[idx % FALLBACK_COLORS$1.length];
      return {
        label: cat,
        data: sortedData.map((summary) => summary.category_totals?.[cat] || null),
        spanGaps: true,
        borderColor: color,
        backgroundColor: color,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: color,
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        tension: 0.3,
        borderWidth: 2
      };
    });
    return { labels: labels2, datasets: datasets2 };
  }, [sortedData, colorMap]);
  const chartData = { labels, datasets };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          padding: 16,
          font: { size: 11 }
        }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatIdr(ctx.parsed.y)}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => {
            const num = Number(value);
            if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
            if (num >= 1e3) return `${(num / 1e3).toFixed(0)}K`;
            return `${num}`;
          }
        }
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: { size: 10 }
        }
      }
    }
  };
  if (datasets.length === 0) {
    return /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center h-72", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-500", children: "No category data available." }) });
  }
  return /* @__PURE__ */ jsx("div", { className: "relative h-80", children: /* @__PURE__ */ jsx(Line, { data: chartData, options }) });
}

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend);
function SavingsRateChart({ data }) {
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const labels = sortedData.map((d) => d.month);
  const rates = sortedData.map((d) => d.savings_rate_pct);
  const pointColors = rates.map((r) => r >= 0 ? "#10b981" : "#ef4444");
  const pointRadii = rates.map((r) => Math.abs(r) > 50 ? 6 : 4);
  const chartData = {
    labels,
    datasets: [
      {
        label: "Savings Rate",
        data: rates,
        borderColor: "#6366f1",
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return "rgba(99, 102, 241, 0.1)";
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, "rgba(99, 102, 241, 0.25)");
          gradient.addColorStop(1, "rgba(99, 102, 241, 0.02)");
          return gradient;
        },
        fill: true,
        tension: 0.35,
        pointRadius: pointRadii,
        pointBackgroundColor: pointColors,
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointHoverRadius: 8
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
          label: (ctx) => {
            const val = ctx.parsed.y;
            return `Savings Rate: ${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
          },
          afterLabel: (ctx) => {
            const idx = ctx.dataIndex;
            const summary = sortedData[idx];
            if (!summary) return "";
            const savings = summary.income - summary.outcome.total;
            return `Savings: ${savings >= 0 ? "" : "-"}IDR ${Math.abs(savings).toLocaleString("id-ID")}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value) => `${value}%`
        }
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45
        }
      }
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "relative h-72", children: /* @__PURE__ */ jsx(Line, { data: chartData, options }) });
}

function FinancialInsights({ transactions, networth, summaries, categories, activeMonth }) {
  const insights = useMemo(() => {
    const list = [];
    const currentSummary = summaries.find((s) => s.month === activeMonth);
    const prevSummary = summaries.filter((s) => new Date(s.date).getTime() < new Date(currentSummary?.date || 0).getTime()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const currentNetworth = networth.find((n) => n.month === activeMonth);
    const prevNetworth = networth.filter((n) => new Date(n.date).getTime() < new Date(currentNetworth?.date || 0).getTime()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const monthTxs = transactions.filter((t) => t.month === activeMonth);
    const unpaidTxs = monthTxs.filter((t) => !t.done);
    if (currentSummary?.category_totals) {
      const categoryMap = new Map(categories.map((c) => [c.name, c]));
      const overspent = [];
      const nearLimit = [];
      Object.entries(currentSummary.category_totals).forEach(([cat, amount]) => {
        const limit = categoryMap.get(cat)?.monthly_limit ?? 0;
        if (limit > 0) {
          const pct = amount / limit * 100;
          if (pct > 100) overspent.push(cat);
          else if (pct >= 80) nearLimit.push(cat);
        }
      });
      if (overspent.length > 0) {
        list.push({
          id: "overspent",
          type: "danger",
          icon: /* @__PURE__ */ jsx(AlertTriangle, { className: "w-4 h-4" }),
          title: "Over Budget",
          message: `${overspent.length} categor${overspent.length === 1 ? "y is" : "ies are"} over budget: ${overspent.join(", ")}`
        });
      }
      if (nearLimit.length > 0) {
        list.push({
          id: "near-limit",
          type: "warning",
          icon: /* @__PURE__ */ jsx(AlertTriangle, { className: "w-4 h-4" }),
          title: "Near Budget Limit",
          message: `${nearLimit.length} categor${nearLimit.length === 1 ? "y is" : "ies are"} at ≥80% of budget: ${nearLimit.join(", ")}`
        });
      }
    }
    if (currentSummary && prevSummary) {
      const currTotal = currentSummary.outcome.total;
      const prevTotal = prevSummary.outcome.total;
      if (prevTotal > 0) {
        const change = (currTotal - prevTotal) / prevTotal * 100;
        const isUp = change > 0;
        list.push({
          id: "spending-trend",
          type: isUp ? "warning" : "success",
          icon: isUp ? /* @__PURE__ */ jsx(TrendingUp, { className: "w-4 h-4" }) : /* @__PURE__ */ jsx(TrendingDown, { className: "w-4 h-4" }),
          title: "Spending Trend",
          message: `Total spending is ${isUp ? "up" : "down"} ${Math.abs(change).toFixed(1)}% vs ${prevSummary.month} (${formatIdr(currTotal)} vs ${formatIdr(prevTotal)})`
        });
      }
    }
    if (unpaidTxs.length > 0) {
      const totalUnpaid = unpaidTxs.reduce((s, t) => s + t.amount, 0);
      list.push({
        id: "unpaid",
        type: "warning",
        icon: /* @__PURE__ */ jsx(Receipt, { className: "w-4 h-4" }),
        title: "Unpaid Transactions",
        message: `${unpaidTxs.length} unpaid bill${unpaidTxs.length === 1 ? "" : "s"} totaling ${formatIdr(totalUnpaid)}`
      });
    } else {
      list.push({
        id: "all-paid",
        type: "success",
        icon: /* @__PURE__ */ jsx(CheckCircle, { className: "w-4 h-4" }),
        title: "All Caught Up",
        message: `All transactions for ${activeMonth} are marked as paid`
      });
    }
    if (currentNetworth && prevNetworth) {
      const change = currentNetworth.month_over_month_change ?? 0;
      const pct = currentNetworth.month_over_month_pct ?? 0;
      const isUp = change >= 0;
      list.push({
        id: "networth-trend",
        type: isUp ? "success" : "danger",
        icon: isUp ? /* @__PURE__ */ jsx(TrendingUp, { className: "w-4 h-4" }) : /* @__PURE__ */ jsx(TrendingDown, { className: "w-4 h-4" }),
        title: "Networth Change",
        message: `Networth ${isUp ? "grew" : "dropped"} by ${formatIdr(Math.abs(change))} (${isUp ? "+" : ""}${pct}%) vs last month`
      });
    }
    if (currentSummary) {
      const rate = currentSummary.savings_rate_pct;
      if (rate < 0) {
        list.push({
          id: "negative-savings",
          type: "danger",
          icon: /* @__PURE__ */ jsx(PiggyBank, { className: "w-4 h-4" }),
          title: "Negative Savings",
          message: `You spent ${formatIdr(Math.abs(currentSummary.savings))} more than you earned this month`
        });
      } else if (rate < 10) {
        list.push({
          id: "low-savings",
          type: "warning",
          icon: /* @__PURE__ */ jsx(PiggyBank, { className: "w-4 h-4" }),
          title: "Low Savings Rate",
          message: `Savings rate is only ${rate.toFixed(1)}%. Try to keep it above 20%`
        });
      } else {
        list.push({
          id: "good-savings",
          type: "success",
          icon: /* @__PURE__ */ jsx(PiggyBank, { className: "w-4 h-4" }),
          title: "Healthy Savings",
          message: `Savings rate is ${rate.toFixed(1)}% — great job!`
        });
      }
    }
    return list;
  }, [transactions, networth, summaries, categories, activeMonth]);
  if (insights.length === 0) return null;
  const typeStyles = {
    success: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300",
    warning: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300",
    danger: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300",
    info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300"
  };
  const badgeVariants = {
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    danger: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    info: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
  };
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold flex items-center gap-2", children: [
      /* @__PURE__ */ jsx(Wallet, { className: "w-4 h-4 text-slate-500" }),
      "Insights"
    ] }) }),
    /* @__PURE__ */ jsx(CardContent, { className: "pt-0", children: /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3", children: insights.map((insight) => /* @__PURE__ */ jsxs(
      "div",
      {
        className: `flex items-start gap-3 rounded-lg border p-3 transition-colors ${typeStyles[insight.type]}`,
        children: [
          /* @__PURE__ */ jsx("div", { className: "mt-0.5 shrink-0", children: insight.icon }),
          /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-0.5", children: [
              /* @__PURE__ */ jsx("span", { className: "text-xs font-semibold uppercase tracking-wider", children: insight.title }),
              /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: `text-[10px] px-1.5 py-0 ${badgeVariants[insight.type]}`, children: insight.type === "success" ? "Good" : insight.type === "warning" ? "Watch" : insight.type === "danger" ? "Alert" : "Info" })
            ] }),
            /* @__PURE__ */ jsx("p", { className: "text-sm leading-snug", children: insight.message })
          ] })
        ]
      },
      insight.id
    )) }) })
  ] });
}

function PeriodVsAverage({
  summaries,
  categories,
  activePeriodId,
  lookbackPeriods = 6
}) {
  const categoryMap = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      map[c.name] = c;
    });
    return map;
  }, [categories]);
  const variances = useMemo(() => {
    if (!activePeriodId || summaries.length < 2) return [];
    const currentSummary2 = summaries.find((s) => s.period_id === activePeriodId);
    if (!currentSummary2 || !currentSummary2.category_totals) return [];
    const historical = summaries.filter((s) => s.period_id !== activePeriodId && s.category_totals).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, lookbackPeriods);
    if (historical.length === 0) return [];
    const allCategories = /* @__PURE__ */ new Set();
    Object.keys(currentSummary2.category_totals).forEach((c) => allCategories.add(c));
    historical.forEach((h) => {
      Object.keys(h.category_totals || {}).forEach((c) => allCategories.add(c));
    });
    const result = [];
    for (const cat of allCategories) {
      const current = currentSummary2.category_totals[cat] || 0;
      const historicalValues = historical.map((h) => h.category_totals?.[cat] || 0).filter((v) => v > 0);
      const count = historicalValues.length;
      const average = count > 0 ? historicalValues.reduce((sum, v) => sum + v, 0) / count : 0;
      const variance = current - average;
      const variancePct = average > 0 ? variance / average * 100 : current > 0 ? 100 : 0;
      result.push({
        category: cat,
        color: categoryMap[cat]?.color || "#6b7280",
        current,
        average,
        variance,
        variancePct,
        count
      });
    }
    result.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
    return result;
  }, [summaries, activePeriodId, lookbackPeriods, categoryMap]);
  const currentSummary = useMemo(
    () => summaries.find((s) => s.period_id === activePeriodId),
    [summaries, activePeriodId]
  );
  const totalCurrent = useMemo(
    () => variances.reduce((sum, v) => sum + v.current, 0),
    [variances]
  );
  const totalAverage = useMemo(
    () => variances.reduce((sum, v) => sum + v.average, 0),
    [variances]
  );
  const totalVariance = totalCurrent - totalAverage;
  const totalVariancePct = totalAverage > 0 ? totalVariance / totalAverage * 100 : 0;
  if (!activePeriodId || variances.length === 0) {
    return /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsxs(CardTitle, { className: "flex items-center gap-2 text-base", children: [
        /* @__PURE__ */ jsx(BarChart3, { className: "h-5 w-5" }),
        "Period vs Average"
      ] }) }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Need at least 2 periods of data to compare." }) })
    ] });
  }
  const maxAbsVariance = Math.max(...variances.map((v) => Math.abs(v.variance)), 1);
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsxs(CardHeader, { className: "pb-2", children: [
      /* @__PURE__ */ jsxs(CardTitle, { className: "flex items-center gap-2 text-base", children: [
        /* @__PURE__ */ jsx(BarChart3, { className: "h-5 w-5" }),
        currentSummary?.month ?? "Current",
        " vs ",
        lookbackPeriods,
        "-Period Average"
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
        "Comparing against ",
        variances[0]?.count ?? 0,
        " historical period",
        variances[0]?.count !== 1 ? "s" : "",
        " · ",
        "Total:",
        " ",
        /* @__PURE__ */ jsxs(
          "span",
          {
            className: `font-semibold ${totalVariance > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`,
            children: [
              totalVariance >= 0 ? "+" : "",
              formatIdr(totalVariance),
              " (",
              totalVariancePct >= 0 ? "+" : "",
              totalVariancePct.toFixed(1),
              "%)"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs(CardContent, { children: [
      /* @__PURE__ */ jsx("div", { className: "space-y-3", children: variances.map((v) => {
        const isUp = v.variance > 0;
        const isSignificant = Math.abs(v.variancePct) >= 20;
        const barWidth = Math.min(
          100,
          Math.max(5, Math.abs(v.variance) / maxAbsVariance * 100)
        );
        return /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-sm", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [
              /* @__PURE__ */ jsx(
                "span",
                {
                  className: "w-2.5 h-2.5 rounded-full flex-shrink-0",
                  style: { backgroundColor: v.color }
                }
              ),
              /* @__PURE__ */ jsx("span", { className: "font-medium truncate", children: v.category }),
              isSignificant && /* @__PURE__ */ jsxs(
                Badge,
                {
                  variant: "outline",
                  className: `text-[10px] h-4 px-1.5 flex-shrink-0 ${isUp ? "border-red-300 text-red-600 dark:border-red-700 dark:text-red-400" : "border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400"}`,
                  children: [
                    isUp ? /* @__PURE__ */ jsx(TrendingUp, { className: "h-2.5 w-2.5 mr-0.5" }) : /* @__PURE__ */ jsx(TrendingDown, { className: "h-2.5 w-2.5 mr-0.5" }),
                    Math.abs(v.variancePct).toFixed(0),
                    "%"
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0 ml-2", children: [
              /* @__PURE__ */ jsx("span", { children: formatIdr(v.current) }),
              /* @__PURE__ */ jsx("span", { className: "text-[10px]", children: "vs" }),
              /* @__PURE__ */ jsx("span", { children: formatIdr(v.average) })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxs("div", { className: "relative flex-1 h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden", children: [
              /* @__PURE__ */ jsx(
                "div",
                {
                  className: "absolute top-0 bottom-0 bg-slate-300 dark:bg-slate-600 rounded-full opacity-50",
                  style: {
                    width: `${Math.min(100, v.average / Math.max(v.current, v.average) * 100)}%`
                  }
                }
              ),
              /* @__PURE__ */ jsx(
                "div",
                {
                  className: `absolute top-0 bottom-0 rounded-full transition-all ${isUp ? "bg-red-400 dark:bg-red-500" : "bg-emerald-400 dark:bg-emerald-500"}`,
                  style: { width: `${barWidth}%`, maxWidth: "100%" }
                }
              )
            ] }),
            /* @__PURE__ */ jsxs(
              "span",
              {
                className: `text-xs font-mono font-semibold w-16 text-right flex-shrink-0 ${isUp ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`,
                children: [
                  v.variance >= 0 ? "+" : "",
                  v.variancePct.toFixed(0),
                  "%"
                ]
              }
            )
          ] }),
          v.count < lookbackPeriods && v.current > 0 && /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-muted-foreground ml-5", children: [
            "New category — only ",
            v.count,
            " historical period",
            v.count !== 1 ? "s" : "",
            " for comparison"
          ] })
        ] }, v.category);
      }) }),
      variances.length === 0 && /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground text-center py-4", children: "No category data to compare." })
    ] })
  ] });
}

Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);
const FALLBACK_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1"
];
function OutcomeBarChart({ data, categories = [], highlightCategory, summaries }) {
  const isTrendMode = !!highlightCategory && !!summaries && summaries.length > 0;
  const { labels, values, backgroundColors, borderColors, borderWidths } = useMemo(() => {
    if (isTrendMode) {
      const sorted = [...summaries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const labels3 = sorted.map((s) => s.month);
      const values3 = sorted.map((s) => s.category_totals?.[highlightCategory] ?? 0);
      const colorMap2 = new Map(categories.map((c) => [c.name, c.color]));
      const baseColor = colorMap2.get(highlightCategory) || FALLBACK_COLORS[0];
      return {
        labels: labels3,
        values: values3,
        backgroundColors: values3.map((v) => v > 0 ? baseColor : `${baseColor}40`),
        borderColors: labels3.map(() => baseColor),
        borderWidths: labels3.map(() => 0)
      };
    }
    const entries = Object.entries(data).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const labels2 = entries.map(([k]) => k);
    const values2 = entries.map(([_, v]) => v);
    const colorMap = new Map(categories.map((c) => [c.name, c.color]));
    const backgroundColors2 = labels2.map((label, i) => {
      const baseColor = colorMap.get(label) || FALLBACK_COLORS[i % FALLBACK_COLORS.length];
      if (highlightCategory && label !== highlightCategory) {
        return `${baseColor}40`;
      }
      return baseColor;
    });
    const borderColors2 = labels2.map((label, i) => {
      return colorMap.get(label) || FALLBACK_COLORS[i % FALLBACK_COLORS.length];
    });
    const borderWidths2 = labels2.map((label) => {
      return highlightCategory && label === highlightCategory ? 2 : 0;
    });
    return { labels: labels2, values: values2, backgroundColors: backgroundColors2, borderColors: borderColors2, borderWidths: borderWidths2 };
  }, [data, categories, highlightCategory, summaries, isTrendMode]);
  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: borderWidths,
        borderRadius: 4,
        barPercentage: 0.6
      }
    ]
  };
  const options = {
    indexAxis: isTrendMode ? "x" : "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${formatIdr(isTrendMode ? ctx.parsed.y : ctx.parsed.x)}`
        }
      }
    },
    scales: {
      [isTrendMode ? "y" : "x"]: {
        beginAtZero: true,
        ticks: {
          callback: (value) => {
            const num = Number(value);
            if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
            if (num >= 1e3) return `${(num / 1e3).toFixed(0)}K`;
            return `${num}`;
          },
          font: { size: 10 }
        },
        grid: {
          color: "rgba(148, 163, 184, 0.15)"
        }
      },
      [isTrendMode ? "x" : "y"]: {
        ticks: {
          font: { size: 11 }
        },
        grid: { display: false }
      }
    }
  };
  if (labels.length === 0 || values.every((v) => v === 0)) {
    return /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center h-48", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-500", children: "No outcome data available." }) });
  }
  return /* @__PURE__ */ jsx("div", { className: "relative h-64", children: /* @__PURE__ */ jsx(Bar, { data: chartData, options }) });
}

function MonthKickoffModal({ open, onOpenChange, nextMonth, recurringCount, onSuccess }) {
  const [salary, setSalary] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const handleKickoff = async () => {
    const salaryNum = Number(salary);
    if (!salaryNum || salaryNum <= 0) {
      setResult({ success: false, message: "Please enter a valid salary amount." });
      return;
    }
    setLoading(true);
    try {
      const res = await kickoffMonth(nextMonth, salaryNum);
      if (res.success) {
        setResult({
          success: true,
          message: `${nextMonth} started! Salary: ${formatIdr(res.salary)}. ${res.preloaded} recurring transaction${res.preloaded !== 1 ? "s" : ""} preloaded.`
        });
      } else {
        setResult({ success: false, message: "Failed to start new month." });
      }
    } catch (e) {
      setResult({ success: false, message: e.message || "An error occurred." });
    } finally {
      setLoading(false);
    }
  };
  const handleClose = () => {
    if (result?.success) {
      setResult(null);
      setSalary("");
      onOpenChange(false);
      onSuccess();
      return;
    }
    setResult(null);
    setSalary("");
    onOpenChange(false);
  };
  return /* @__PURE__ */ jsx(Dialog, { open, onOpenChange: handleClose, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-md", children: [
    /* @__PURE__ */ jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxs(DialogTitle, { children: [
        "Start ",
        nextMonth
      ] }),
      /* @__PURE__ */ jsx(DialogDescription, { children: "Enter your salary to kick off the new month. All active recurring transactions will be preloaded." })
    ] }),
    result ? /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsx("div", { className: `rounded-lg border px-4 py-3 text-sm ${result.success ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300" : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"}`, children: result.message }),
      /* @__PURE__ */ jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsx(Button, { onClick: handleClose, children: result.success ? "Go to Dashboard" : "Close" }) })
    ] }) : /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "salary", children: "Monthly Salary (IDR)" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: "salary",
            type: "number",
            value: salary,
            onChange: (e) => setSalary(e.target.value),
            placeholder: "Enter your salary",
            autoFocus: true
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-lg border bg-slate-50 dark:bg-slate-800/50 p-3 text-sm space-y-1", children: [
        /* @__PURE__ */ jsx("p", { className: "font-medium text-slate-700 dark:text-slate-200", children: "What will happen:" }),
        /* @__PURE__ */ jsxs("ul", { className: "list-disc list-inside text-slate-500 dark:text-slate-400 space-y-0.5", children: [
          /* @__PURE__ */ jsxs("li", { children: [
            "Create income record for ",
            nextMonth
          ] }),
          /* @__PURE__ */ jsxs("li", { children: [
            "Preload ",
            recurringCount,
            " active recurring transaction",
            recurringCount !== 1 ? "s" : ""
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2", children: [
        /* @__PURE__ */ jsx(Button, { variant: "secondary", onClick: handleClose, disabled: loading, children: "Cancel" }),
        /* @__PURE__ */ jsx(Button, { onClick: handleKickoff, disabled: loading, children: loading ? "Starting..." : `Confirm & Start ${nextMonth}` })
      ] })
    ] })
  ] }) });
}

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);
function Sparkline({ data, color, height = 48, width = 100 }) {
  const clean = data.filter((v) => isFinite(v));
  if (clean.length < 2) return null;
  clean.length >= 2 && clean[clean.length - 1] >= clean[0];
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
        fill: true
      }
    ]
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    },
    scales: {
      x: { display: false },
      y: { display: false, beginAtZero: false }
    },
    elements: {
      line: {
        borderColor: color
      }
    }
  };
  return /* @__PURE__ */ jsx("div", { style: { width, height }, className: "shrink-0", children: /* @__PURE__ */ jsx(Line, { data: chartData, options }) });
}

function DashboardSummaryCards({ summaries, networth, activeMonth }) {
  const cards = useMemo(() => {
    const result = [];
    const sorted = [...summaries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const last6 = sorted.slice(-6);
    last6.map((s) => s.month);
    const currentIdx = sorted.findIndex((s) => s.month === activeMonth);
    const currentSummary = currentIdx >= 0 ? sorted[currentIdx] : sorted[sorted.length - 1];
    const prevSummary = currentIdx > 0 ? sorted[currentIdx - 1] : null;
    const nwSorted = [...networth].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const nwLast6 = nwSorted.slice(-6);
    const nwCurrent = nwSorted.find((n) => n.month === activeMonth) ?? nwSorted[nwSorted.length - 1];
    const nwPrevIdx = nwSorted.findIndex((n) => n.month === activeMonth);
    const nwPrev = nwPrevIdx > 0 ? nwSorted[nwPrevIdx - 1] : null;
    if (currentSummary) {
      const income = currentSummary.income ?? 0;
      const prevIncome = prevSummary?.income ?? 0;
      const incomeDelta = income - prevIncome;
      const incomeDeltaPct = prevIncome > 0 ? incomeDelta / prevIncome * 100 : income > 0 ? 100 : 0;
      result.push({
        label: "Income",
        value: formatIdr(income),
        delta: incomeDelta >= 0 ? `+${formatIdr(incomeDelta)}` : formatIdr(incomeDelta),
        deltaPct: incomeDeltaPct >= 0 ? `+${incomeDeltaPct.toFixed(1)}%` : `${incomeDeltaPct.toFixed(1)}%`,
        isPositive: incomeDelta >= 0,
        sparklineData: last6.map((s) => s.income ?? 0),
        color: "#10b981",
        icon: /* @__PURE__ */ jsx(DollarSign, { className: "w-5 h-5" })
      });
    }
    if (currentSummary) {
      const outcome = currentSummary.outcome?.total ?? 0;
      const prevOutcome = prevSummary?.outcome?.total ?? 0;
      const outcomeDelta = outcome - prevOutcome;
      const outcomeDeltaPct = prevOutcome > 0 ? outcomeDelta / prevOutcome * 100 : outcome > 0 ? 100 : 0;
      result.push({
        label: "Spending",
        value: formatIdr(outcome),
        delta: outcomeDelta >= 0 ? `+${formatIdr(outcomeDelta)}` : formatIdr(outcomeDelta),
        deltaPct: outcomeDeltaPct >= 0 ? `+${outcomeDeltaPct.toFixed(1)}%` : `${outcomeDeltaPct.toFixed(1)}%`,
        isPositive: outcomeDelta <= 0,
        // Lower spending is positive
        sparklineData: last6.map((s) => s.outcome?.total ?? 0),
        color: "#ef4444",
        icon: /* @__PURE__ */ jsx(Wallet, { className: "w-5 h-5" })
      });
    }
    if (currentSummary) {
      const income = currentSummary.income ?? 0;
      const outcome = currentSummary.outcome?.total ?? 0;
      const savingsRate = income > 0 ? (income - outcome) / income * 100 : 0;
      const prevIncome = prevSummary?.income ?? 0;
      const prevOutcome = prevSummary?.outcome?.total ?? 0;
      const prevSavingsRate = prevIncome > 0 ? (prevIncome - prevOutcome) / prevIncome * 100 : 0;
      const srDelta = savingsRate - prevSavingsRate;
      result.push({
        label: "Savings Rate",
        value: `${savingsRate.toFixed(1)}%`,
        delta: srDelta >= 0 ? `+${srDelta.toFixed(1)}pp` : `${srDelta.toFixed(1)}pp`,
        deltaPct: "",
        isPositive: srDelta >= 0,
        sparklineData: last6.map((s) => {
          const inc = s.income ?? 0;
          const out = s.outcome?.total ?? 0;
          return inc > 0 ? (inc - out) / inc * 100 : 0;
        }),
        color: "#6366f1",
        icon: /* @__PURE__ */ jsx(PiggyBank, { className: "w-5 h-5" })
      });
    }
    if (nwCurrent) {
      const nw = nwCurrent.total ?? 0;
      const prevNw = nwPrev?.total ?? 0;
      const nwDelta = nw - prevNw;
      const nwDeltaPct = prevNw > 0 ? nwDelta / prevNw * 100 : nw > 0 ? 100 : 0;
      result.push({
        label: "Net Worth",
        value: formatIdr(nw),
        delta: nwDelta >= 0 ? `+${formatIdr(nwDelta)}` : formatIdr(nwDelta),
        deltaPct: nwDeltaPct >= 0 ? `+${nwDeltaPct.toFixed(1)}%` : `${nwDeltaPct.toFixed(1)}%`,
        isPositive: nwDelta >= 0,
        sparklineData: nwLast6.map((n) => n.total ?? 0),
        color: "#3b82f6",
        icon: /* @__PURE__ */ jsx(BarChart3, { className: "w-5 h-5" })
      });
    }
    return result;
  }, [summaries, networth, activeMonth]);
  if (cards.length === 0) return null;
  return /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6", children: cards.map((card) => /* @__PURE__ */ jsxs(
    "div",
    {
      className: "bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 relative overflow-hidden hover:shadow-md transition-shadow",
      children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            className: "absolute top-0 left-0 right-0 h-1",
            style: { backgroundColor: card.color }
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-1", children: [
              /* @__PURE__ */ jsx("span", { className: "text-slate-400 dark:text-slate-500", children: card.icon }),
              /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-slate-500 dark:text-slate-400 truncate", children: card.label })
            ] }),
            /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold mt-1 truncate", children: card.value }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 mt-1", children: [
              /* @__PURE__ */ jsxs(
                "span",
                {
                  className: `inline-flex items-center gap-0.5 text-xs font-semibold ${card.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`,
                  children: [
                    card.isPositive ? /* @__PURE__ */ jsx(TrendingUp, { className: "w-3.5 h-3.5" }) : /* @__PURE__ */ jsx(TrendingDown, { className: "w-3.5 h-3.5" }),
                    card.delta
                  ]
                }
              ),
              card.deltaPct && /* @__PURE__ */ jsx(
                "span",
                {
                  className: `text-xs font-medium ${card.isPositive ? "text-emerald-500/70 dark:text-emerald-400/70" : "text-red-500/70 dark:text-red-400/70"}`,
                  children: card.deltaPct
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "ml-2 shrink-0 self-end", children: /* @__PURE__ */ jsx(Sparkline, { data: card.sparklineData, color: card.color, height: 40, width: 72 }) })
        ] })
      ]
    },
    card.label
  )) });
}

function getPeriodDates(activeMonth) {
  const parts = activeMonth.split(" ");
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];
  const monthIdx = monthNames.indexOf(parts[0]);
  const year = parseInt(parts[1] || String((/* @__PURE__ */ new Date()).getFullYear()), 10);
  if (monthIdx < 0) {
    const now = /* @__PURE__ */ new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 21),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 20)
    };
  }
  const startMonth = monthIdx === 0 ? 11 : monthIdx - 1;
  const startYear = monthIdx === 0 ? year - 1 : year;
  const start = new Date(startYear, startMonth, 21);
  const end = new Date(year, monthIdx, 20, 23, 59, 59, 999);
  return { start, end };
}
function SpendingPulse({ summaries, activeMonth }) {
  const pulse = useMemo(() => {
    const summary = summaries.find((s) => s.month === activeMonth);
    if (!summary) return null;
    const income = summary.income ?? 0;
    if (income <= 0) return null;
    const { start, end } = getPeriodDates(activeMonth);
    const now = /* @__PURE__ */ new Date();
    const effectiveNow = now < start ? start : now > end ? end : now;
    const daysTotal = Math.ceil((end.getTime() - start.getTime()) / (1e3 * 60 * 60 * 24)) + 1;
    const daysElapsed = Math.max(1, Math.ceil((effectiveNow.getTime() - start.getTime()) / (1e3 * 60 * 60 * 24)) + 1);
    const daysRemaining = Math.max(0, daysTotal - daysElapsed);
    const pctTimeElapsed = Math.min(100, daysElapsed / daysTotal * 100);
    const dailyBudget = income / daysTotal;
    const expectedSpend = dailyBudget * daysElapsed;
    const actualSpend = summary.outcome?.total ?? 0;
    const pacePct = expectedSpend > 0 ? actualSpend / expectedSpend * 100 : 0;
    const projectedTotal = daysElapsed > 0 ? actualSpend / daysElapsed * daysTotal : 0;
    let status = "on-track";
    if (pacePct < 90) status = "under";
    else if (pacePct > 110) status = "over";
    return {
      daysElapsed,
      daysTotal,
      daysRemaining,
      pctTimeElapsed,
      dailyBudget,
      expectedSpend,
      actualSpend,
      pacePct,
      projectedTotal,
      status,
      income
    };
  }, [summaries, activeMonth]);
  if (!pulse) return null;
  const statusConfig = {
    "under": {
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      border: "border-emerald-200 dark:border-emerald-800",
      bar: "bg-emerald-500",
      track: "bg-emerald-100 dark:bg-emerald-800/50",
      icon: /* @__PURE__ */ jsx(TrendingDown, { className: "w-5 h-5" }),
      label: "Spending slower than expected",
      badge: "Under Pace"
    },
    "on-track": {
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-200 dark:border-amber-800",
      bar: "bg-amber-500",
      track: "bg-amber-100 dark:bg-amber-800/50",
      icon: /* @__PURE__ */ jsx(Activity, { className: "w-5 h-5" }),
      label: "Spending on pace with the period",
      badge: "On Track"
    },
    "over": {
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-200 dark:border-red-800",
      bar: "bg-red-500",
      track: "bg-red-100 dark:bg-red-800/50",
      icon: /* @__PURE__ */ jsx(TrendingUp, { className: "w-5 h-5" }),
      label: "Spending faster than expected",
      badge: "Over Pace"
    }
  };
  const cfg = statusConfig[pulse.status];
  const gaugeRadius = 70;
  const gaugeStroke = 10;
  const gaugeCenter = 80;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeArcLength = gaugeCircumference * 0.5;
  const clampedPace = Math.max(0, Math.min(200, pulse.pacePct));
  const gaugePct = clampedPace / 200;
  const gaugeOffset = gaugeArcLength * (1 - gaugePct);
  const gaugeColor = pulse.status === "under" ? "#10b981" : pulse.status === "on-track" ? "#f59e0b" : "#ef4444";
  return /* @__PURE__ */ jsxs("div", { className: `rounded-xl border ${cfg.border} ${cfg.bg} p-5 relative overflow-hidden`, children: [
    /* @__PURE__ */ jsx("div", { className: `absolute top-0 left-0 right-0 h-1 ${cfg.bar}` }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col lg:flex-row items-start gap-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0 space-y-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Gauge, { className: `w-5 h-5 ${cfg.color}` }),
          /* @__PURE__ */ jsx("h3", { className: "text-sm font-semibold text-slate-700 dark:text-slate-200", children: "Spending Pulse" }),
          /* @__PURE__ */ jsx("span", { className: `text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} border ${cfg.border} ${cfg.color}`, children: cfg.badge })
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: [
          cfg.label,
          " — you've spent ",
          pulse.pacePct.toFixed(0),
          "% of the expected amount for this point in the period."
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3 pt-1", children: [
          /* @__PURE__ */ jsxs("div", { className: "bg-white/60 dark:bg-slate-800/60 rounded-lg p-2.5", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1", children: [
              /* @__PURE__ */ jsx(Clock, { className: "w-3.5 h-3.5" }),
              "Time Elapsed"
            ] }),
            /* @__PURE__ */ jsxs("p", { className: "text-base font-bold text-slate-800 dark:text-slate-100", children: [
              "Day ",
              pulse.daysElapsed,
              " of ",
              pulse.daysTotal
            ] }),
            /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500", children: [
              pulse.pctTimeElapsed.toFixed(0),
              "% through period"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "bg-white/60 dark:bg-slate-800/60 rounded-lg p-2.5", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1", children: [
              /* @__PURE__ */ jsx(Activity, { className: "w-3.5 h-3.5" }),
              "Spend vs Expected"
            ] }),
            /* @__PURE__ */ jsx("p", { className: "text-base font-bold text-slate-800 dark:text-slate-100", children: formatIdr(pulse.actualSpend) }),
            /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500", children: [
              "Expected: ",
              formatIdr(pulse.expectedSpend)
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400", children: [
          /* @__PURE__ */ jsx("span", { children: "Projected period total:" }),
          /* @__PURE__ */ jsx("span", { className: `font-semibold ${pulse.projectedTotal > pulse.income ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`, children: formatIdr(pulse.projectedTotal) }),
          /* @__PURE__ */ jsx("span", { children: "vs" }),
          /* @__PURE__ */ jsx("span", { className: "font-semibold text-slate-700 dark:text-slate-300", children: formatIdr(pulse.income) }),
          /* @__PURE__ */ jsx("span", { children: "income" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "shrink-0 flex flex-col items-center", children: [
        /* @__PURE__ */ jsxs("svg", { width: "160", height: "110", viewBox: "0 0 160 110", children: [
          /* @__PURE__ */ jsx(
            "path",
            {
              d: `M ${gaugeCenter - gaugeRadius} ${gaugeCenter} A ${gaugeRadius} ${gaugeRadius} 0 0 1 ${gaugeCenter + gaugeRadius} ${gaugeCenter}`,
              fill: "none",
              stroke: "currentColor",
              strokeWidth: gaugeStroke,
              className: "text-slate-200 dark:text-slate-700",
              strokeLinecap: "round"
            }
          ),
          /* @__PURE__ */ jsx(
            "path",
            {
              d: `M ${gaugeCenter - gaugeRadius} ${gaugeCenter} A ${gaugeRadius} ${gaugeRadius} 0 0 1 ${gaugeCenter + gaugeRadius} ${gaugeCenter}`,
              fill: "none",
              stroke: gaugeColor,
              strokeWidth: gaugeStroke,
              strokeLinecap: "round",
              strokeDasharray: `${gaugeArcLength} ${gaugeCircumference}`,
              strokeDashoffset: gaugeOffset,
              style: { transition: "stroke-dashoffset 0.8s ease-out" }
            }
          ),
          /* @__PURE__ */ jsx("text", { x: gaugeCenter, y: gaugeCenter - 15, textAnchor: "middle", className: "fill-slate-400 dark:fill-slate-500", style: { fontSize: "11px" }, children: "PACE" }),
          /* @__PURE__ */ jsxs("text", { x: gaugeCenter, y: gaugeCenter + 12, textAnchor: "middle", className: "fill-slate-800 dark:fill-slate-100", style: { fontSize: "22px", fontWeight: "bold" }, children: [
            pulse.pacePct.toFixed(0),
            "%"
          ] }),
          /* @__PURE__ */ jsx("text", { x: gaugeCenter - gaugeRadius, y: gaugeCenter + 22, textAnchor: "middle", className: "fill-slate-400 dark:fill-slate-500", style: { fontSize: "10px" }, children: "0%" }),
          /* @__PURE__ */ jsx("text", { x: gaugeCenter + gaugeRadius, y: gaugeCenter + 22, textAnchor: "middle", className: "fill-slate-400 dark:fill-slate-500", style: { fontSize: "10px" }, children: "200%" })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-[11px] text-slate-400 dark:text-slate-500 mt-1", children: "% of expected spend" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-700/50 space-y-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-xs", children: [
        /* @__PURE__ */ jsx("span", { className: "w-16 text-slate-500 dark:text-slate-400 shrink-0", children: "Time" }),
        /* @__PURE__ */ jsx("div", { className: "flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5", children: /* @__PURE__ */ jsx(
          "div",
          {
            className: "bg-blue-400 dark:bg-blue-500 h-1.5 rounded-full transition-all",
            style: { width: `${pulse.pctTimeElapsed}%` }
          }
        ) }),
        /* @__PURE__ */ jsxs("span", { className: "w-10 text-right font-medium text-slate-600 dark:text-slate-300", children: [
          pulse.pctTimeElapsed.toFixed(0),
          "%"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-xs", children: [
        /* @__PURE__ */ jsx("span", { className: "w-16 text-slate-500 dark:text-slate-400 shrink-0", children: "Spend" }),
        /* @__PURE__ */ jsx("div", { className: "flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5", children: /* @__PURE__ */ jsx(
          "div",
          {
            className: `h-1.5 rounded-full transition-all ${cfg.bar}`,
            style: { width: `${Math.min(100, pulse.actualSpend / pulse.income * 100)}%` }
          }
        ) }),
        /* @__PURE__ */ jsxs("span", { className: "w-10 text-right font-medium text-slate-600 dark:text-slate-300", children: [
          (pulse.actualSpend / pulse.income * 100).toFixed(0),
          "%"
        ] })
      ] })
    ] })
  ] });
}

const SEVERITY_COLORS = {
  high: "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30",
  medium: "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30",
  low: "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"
};
const SEVERITY_BADGE = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  low: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
};
const REASON_LABELS = {
  amount_spike: "Unusual Amount",
  new_merchant: "New Merchant",
  category_outlier: "Category Outlier"
};
const REASON_ICONS = {
  amount_spike: /* @__PURE__ */ jsx(TrendingUp, { className: "w-4 h-4" }),
  new_merchant: /* @__PURE__ */ jsx(ShoppingBag, { className: "w-4 h-4" }),
  category_outlier: /* @__PURE__ */ jsx(AlertTriangle, { className: "w-4 h-4" })
};
function AnomalyAlerts({ month }) {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(/* @__PURE__ */ new Set());
  const [expanded, setExpanded] = useState(false);
  const [severityFilter, setSeverityFilter] = useState(null);
  useEffect(() => {
    if (!month) return;
    setLoading(true);
    setDismissed(/* @__PURE__ */ new Set());
    setSeverityFilter(null);
    fetch(`/api/anomalies?month=${encodeURIComponent(month)}`).then((res) => res.json()).then((data) => {
      if (Array.isArray(data)) setAnomalies(data);
      else setAnomalies([]);
    }).catch(() => setAnomalies([])).finally(() => setLoading(false));
  }, [month]);
  const dismiss = (id) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };
  const toggleFilter = (severity) => {
    setSeverityFilter((prev) => prev === severity ? null : severity);
    setExpanded(false);
  };
  const visible = anomalies.filter((a) => !dismissed.has(a.id));
  const filtered = severityFilter ? visible.filter((a) => a.severity === severityFilter) : visible;
  if (loading) return null;
  if (visible.length === 0) return null;
  const highCount = visible.filter((a) => a.severity === "high").length;
  const mediumCount = visible.filter((a) => a.severity === "medium").length;
  const lowCount = visible.filter((a) => a.severity === "low").length;
  const displayItems = expanded ? filtered : filtered.slice(0, 3);
  return /* @__PURE__ */ jsxs(Card, { className: "border-amber-200 dark:border-amber-800", children: [
    /* @__PURE__ */ jsxs(CardHeader, { className: "pb-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(AlertTriangle, { className: "w-4 h-4 text-amber-500" }),
          "Spending Anomalies Detected"
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          highCount > 0 && /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: () => toggleFilter("high"),
              className: `text-[10px] px-1.5 py-0 rounded-full font-medium transition cursor-pointer border ${severityFilter === "high" ? "bg-red-600 text-white border-red-600 ring-2 ring-red-300" : "bg-red-100 text-red-700 border-red-200 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-900/60"}`,
              children: [
                highCount,
                " high"
              ]
            }
          ),
          mediumCount > 0 && /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: () => toggleFilter("medium"),
              className: `text-[10px] px-1.5 py-0 rounded-full font-medium transition cursor-pointer border ${severityFilter === "medium" ? "bg-amber-600 text-white border-amber-600 ring-2 ring-amber-300" : "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-900/60"}`,
              children: [
                mediumCount,
                " medium"
              ]
            }
          ),
          lowCount > 0 && /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: () => toggleFilter("low"),
              className: `text-[10px] px-1.5 py-0 rounded-full font-medium transition cursor-pointer border ${severityFilter === "low" ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300" : "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/60"}`,
              children: [
                lowCount,
                " low"
              ]
            }
          ),
          severityFilter && /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setSeverityFilter(null),
              className: "text-[10px] px-1.5 py-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline",
              children: "clear"
            }
          ),
          /* @__PURE__ */ jsxs("span", { className: "text-xs text-slate-400", children: [
            filtered.length,
            " of ",
            visible.length
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-400", children: "These transactions look unusual compared to your historical spending patterns." })
    ] }),
    /* @__PURE__ */ jsxs(CardContent, { className: "space-y-2", children: [
      filtered.length === 0 ? /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-400 text-center py-3", children: [
        "No ",
        severityFilter,
        " severity anomalies found."
      ] }) : displayItems.map((anomaly) => /* @__PURE__ */ jsxs(
        "div",
        {
          className: `flex items-start gap-3 p-3 rounded-lg border ${SEVERITY_COLORS[anomaly.severity]} transition`,
          children: [
            /* @__PURE__ */ jsx("div", { className: "shrink-0 mt-0.5", children: REASON_ICONS[anomaly.reason] }),
            /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
                /* @__PURE__ */ jsx("span", { className: "font-medium text-sm text-slate-800 dark:text-slate-200 truncate", children: anomaly.title }),
                /* @__PURE__ */ jsx(
                  Badge,
                  {
                    variant: "outline",
                    className: `text-[10px] px-1.5 py-0 ${SEVERITY_BADGE[anomaly.severity]}`,
                    children: REASON_LABELS[anomaly.reason]
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400", children: [
                /* @__PURE__ */ jsx("span", { children: formatIdr(anomaly.amount) }),
                /* @__PURE__ */ jsx("span", { children: "·" }),
                /* @__PURE__ */ jsx("span", { children: anomaly.category })
              ] }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-400 dark:text-slate-500 mt-0.5", children: anomaly.detail })
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => dismiss(anomaly.id),
                className: "shrink-0 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition",
                title: "Dismiss",
                children: /* @__PURE__ */ jsx(X, { className: "w-3.5 h-3.5 text-slate-400" })
              }
            )
          ]
        },
        anomaly.id
      )),
      filtered.length > 3 && /* @__PURE__ */ jsx(
        Button,
        {
          variant: "ghost",
          size: "sm",
          className: "w-full text-xs text-slate-500",
          onClick: () => setExpanded(!expanded),
          children: expanded ? /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(ChevronUp, { className: "w-3.5 h-3.5 mr-1" }),
            "Show fewer"
          ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(ChevronDown, { className: "w-3.5 h-3.5 mr-1" }),
            "Show all ",
            filtered.length,
            " anomalies"
          ] })
        }
      )
    ] })
  ] });
}

const STORAGE_KEY$1 = "budget-alerts-dismissed";
function getDismissedAlerts() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY$1) || "{}");
  } catch {
    return {};
  }
}
function dismissAlert(periodId, category) {
  const key = `${periodId}:${category}`;
  const dismissed = getDismissedAlerts();
  dismissed[key] = true;
  localStorage.setItem(STORAGE_KEY$1, JSON.stringify(dismissed));
}
function BudgetAlerts({ summaries, categories, activeMonth, transactions, recurringTitles }) {
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState({});
  useEffect(() => {
    setDismissed(getDismissedAlerts());
  }, []);
  const alerts = useMemo(() => {
    const activeSummary = activeMonth ? summaries.find((s) => s.month === activeMonth) : summaries[summaries.length - 1];
    if (!activeSummary?.category_totals) return [];
    const categoryMap = {};
    categories.forEach((c) => {
      categoryMap[c.name] = c;
    });
    const recurringSet = new Set((recurringTitles || []).map((t) => t.toLowerCase()));
    const discretionarySpend = {};
    const periodTxs = (transactions || []).filter(
      (t) => t.period_id === activeSummary.period_id && t.done === 1 && (t.type === "cash" || t.type === "credit_expense")
    );
    for (const tx of periodTxs) {
      if (!recurringSet.has(tx.title.toLowerCase())) {
        discretionarySpend[tx.category] = (discretionarySpend[tx.category] || 0) + tx.amount;
      }
    }
    const results = [];
    for (const [cat, amount] of Object.entries(activeSummary.category_totals)) {
      const catDef = categoryMap[cat];
      const limit = catDef?.monthly_limit ?? 0;
      if (limit <= 0 || amount <= 0) continue;
      const pct = amount / limit * 100;
      const discAmt = discretionarySpend[cat] || 0;
      const discPct = discAmt / limit * 100;
      const isOver = amount > limit;
      const isAllRecurring = discAmt === 0 && amount > 0;
      if (pct < 80) continue;
      if (!isOver && isAllRecurring) continue;
      const dismissKey = `${activeSummary.period_id}:${cat}`;
      if (dismissed[dismissKey]) continue;
      results.push({
        category: cat,
        spent: amount,
        discretionarySpent: discAmt,
        limit,
        pct: Math.round(pct * 10) / 10,
        discretionaryPct: Math.round(discPct * 10) / 10,
        isOver,
        isAllRecurring,
        color: catDef?.color || "#94a3b8"
      });
    }
    results.sort((a, b) => {
      if (a.isOver !== b.isOver) return a.isOver ? -1 : 1;
      return b.pct - a.pct;
    });
    return results;
  }, [summaries, categories, activeMonth, dismissed, transactions, recurringTitles]);
  const handleDismiss = (periodId, category) => {
    dismissAlert(periodId, category);
    setDismissed(getDismissedAlerts());
  };
  if (alerts.length === 0) return null;
  const overCount = alerts.filter((a) => a.isOver).length;
  const approachingCount = alerts.filter((a) => !a.isOver).length;
  return /* @__PURE__ */ jsxs(Card, { className: "border-l-4 border-l-red-500 dark:border-l-red-400 shadow-md", children: [
    /* @__PURE__ */ jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs(CardTitle, { className: "flex items-center gap-2 text-base", children: [
        /* @__PURE__ */ jsx(AlertTriangle, { className: "h-5 w-5 text-red-500 dark:text-red-400" }),
        "Budget Alerts",
        overCount > 0 && /* @__PURE__ */ jsxs(Badge, { variant: "destructive", className: "ml-1", children: [
          overCount,
          " over"
        ] }),
        approachingCount > 0 && /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "ml-1 border-amber-400 text-amber-600 dark:text-amber-400", children: [
          approachingCount,
          " approaching"
        ] })
      ] }),
      /* @__PURE__ */ jsx(
        Button,
        {
          variant: "ghost",
          size: "sm",
          onClick: () => setCollapsed(!collapsed),
          className: "h-7 w-7 p-0",
          "aria-label": collapsed ? "Expand" : "Collapse",
          children: collapsed ? /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4" }) : /* @__PURE__ */ jsx(ChevronUp, { className: "h-4 w-4" })
        }
      )
    ] }) }),
    !collapsed && /* @__PURE__ */ jsx(CardContent, { className: "pt-0 pb-4", children: /* @__PURE__ */ jsx("div", { className: "space-y-3", children: alerts.map((alert) => {
      const visualPct = Math.min(100, alert.pct);
      const barColor = alert.isOver ? "bg-red-500" : alert.pct >= 90 ? "bg-orange-500" : "bg-amber-500";
      const bgColor = alert.isOver ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800" : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800";
      const textColor = alert.isOver ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300";
      return /* @__PURE__ */ jsxs(
        "div",
        {
          className: `relative rounded-lg border p-3 ${bgColor}`,
          children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => handleDismiss(
                  summaries.find((s) => s.month === activeMonth)?.period_id ?? 0,
                  alert.category
                ),
                className: "absolute top-2 right-2 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition",
                "aria-label": `Dismiss ${alert.category} alert`,
                children: /* @__PURE__ */ jsx(X, { className: "h-3.5 w-3.5 opacity-50" })
              }
            ),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-2", children: [
              /* @__PURE__ */ jsx(
                "div",
                {
                  className: "w-3 h-3 rounded-full shrink-0",
                  style: { backgroundColor: alert.color }
                }
              ),
              /* @__PURE__ */ jsx("span", { className: "font-semibold text-sm", children: alert.category }),
              alert.isOver ? /* @__PURE__ */ jsxs(Badge, { variant: "destructive", className: "text-xs h-5", children: [
                /* @__PURE__ */ jsx(TrendingUp, { className: "h-3 w-3 mr-0.5" }),
                "Over budget"
              ] }) : /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "text-xs h-5 border-amber-400 text-amber-600 dark:text-amber-400", children: "Approaching limit" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-xs mb-1.5", children: [
              /* @__PURE__ */ jsxs("span", { className: textColor, children: [
                formatIdr(alert.spent),
                " spent"
              ] }),
              /* @__PURE__ */ jsxs("span", { className: `font-semibold ${textColor}`, children: [
                alert.pct,
                "% of ",
                formatIdr(alert.limit)
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2", children: /* @__PURE__ */ jsx(
              "div",
              {
                className: `${barColor} h-2 rounded-full transition-all`,
                style: { width: `${visualPct}%` }
              }
            ) }),
            alert.isOver && /* @__PURE__ */ jsxs("p", { className: "text-xs text-red-600 dark:text-red-400 mt-1.5", children: [
              formatIdr(alert.spent - alert.limit),
              " over the monthly limit"
            ] })
          ]
        },
        alert.category
      );
    }) }) })
  ] });
}

const STORAGE_KEY = "dashboard-collapsed-widgets";
function useCollapsibleWidgets() {
  const [collapsed, setCollapsed] = useState(/* @__PURE__ */ new Set());
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const ids = JSON.parse(raw);
        setCollapsed(new Set(ids));
      }
    } catch {
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...collapsed]));
    } catch {
    }
  }, [collapsed]);
  const toggle = useCallback((widgetId) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(widgetId)) {
        next.delete(widgetId);
      } else {
        next.add(widgetId);
      }
      return next;
    });
  }, []);
  const isCollapsed = useCallback(
    (widgetId) => collapsed.has(widgetId),
    [collapsed]
  );
  const collapseAll = useCallback(() => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      [
        "summary-cards",
        "spending-pulse",
        "anomaly-alerts",
        "budget-alerts",
        "financial-insights",
        "outcome-breakdown",
        "transactions-table"
      ].forEach((id) => next.add(id));
      return next;
    });
  }, []);
  const expandAll = useCallback(() => {
    setCollapsed(/* @__PURE__ */ new Set());
  }, []);
  return { isCollapsed, toggle, collapseAll, expandAll, collapsedCount: collapsed.size };
}

function CollapsibleSection({
  id,
  title,
  icon,
  isCollapsed,
  onToggle,
  children,
  className = "",
  badge
}) {
  return /* @__PURE__ */ jsxs(Card, { className, children: [
    /* @__PURE__ */ jsx(CardHeader, { className: "pb-0", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: onToggle,
          className: "flex items-center gap-2 text-left hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded",
          "aria-expanded": !isCollapsed,
          "aria-controls": `widget-content-${id}`,
          children: [
            /* @__PURE__ */ jsx("span", { className: "text-slate-400 dark:text-slate-500 transition-transform duration-200", children: isCollapsed ? /* @__PURE__ */ jsx(ChevronRight, { className: "w-4 h-4" }) : /* @__PURE__ */ jsx(ChevronDown, { className: "w-4 h-4" }) }),
            /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold flex items-center gap-2", children: [
              icon,
              title,
              badge && /* @__PURE__ */ jsx("span", { className: "ml-1", children: badge })
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          variant: "ghost",
          size: "sm",
          onClick: onToggle,
          className: "h-7 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
          "aria-label": isCollapsed ? `Expand ${title}` : `Collapse ${title}`,
          children: isCollapsed ? "Show" : "Hide"
        }
      )
    ] }) }),
    /* @__PURE__ */ jsx(
      "div",
      {
        id: `widget-content-${id}`,
        className: `transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? "max-h-0 opacity-0" : "max-h-[5000px] opacity-100"}`,
        children: /* @__PURE__ */ jsx(CardContent, { className: isCollapsed ? "pt-0" : void 0, children })
      }
    )
  ] });
}

function parseCreatedTime(tx) {
  if (tx.created_time) {
    const d = new Date(tx.created_time);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(tx.date);
}
function Dashboard({ transactions, networth, summaries }) {
  const activePeriod = useMemo(() => {
    const { month, year } = getActivePeriod();
    return `${month} ${year}`;
  }, []);
  const periodOptions = useMemo(() => {
    const seen = /* @__PURE__ */ new Set();
    return summaries.filter((s) => {
      if (seen.has(s.period_id)) return false;
      seen.add(s.period_id);
      return true;
    }).map((s) => ({ id: s.period_id, month: s.month })).reverse();
  }, [summaries]);
  useMemo(
    () => summaries.find((s) => s.month === activePeriod)?.period_id ?? null,
    [summaries, activePeriod]
  );
  const [filterPeriodId, setFilterPeriodId] = useState(null);
  const [filterAllTime, setFilterAllTime] = useState(true);
  const isAllTime = filterAllTime;
  const activeSummary = useMemo(() => {
    if (isAllTime) return summaries[summaries.length - 1];
    return summaries.find((s) => s.period_id === filterPeriodId) ?? summaries[summaries.length - 1];
  }, [filterPeriodId, summaries, isAllTime]);
  const filteredSummaries = useMemo(() => {
    if (isAllTime) return summaries;
    return summaries.filter((s) => s.period_id === filterPeriodId);
  }, [filterPeriodId, summaries, isAllTime]);
  const filteredNetworth = useMemo(() => {
    if (isAllTime) return networth;
    return networth.filter((n) => n.period_id === filterPeriodId);
  }, [filterPeriodId, networth, isAllTime]);
  const filteredTransactions = useMemo(() => {
    if (!activeSummary) return [];
    if (isAllTime) return transactions.filter((t) => t.period_id === activeSummary.period_id);
    return transactions.filter((t) => t.period_id === filterPeriodId);
  }, [filterPeriodId, transactions, activeSummary, isAllTime]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const startEdit = (row) => {
    setEditingId(row.id);
    setEditForm({ ...row });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };
  const saveEdit = async () => {
    if (!editForm.id) return;
    const original = transactions.find((t) => t.id === editForm.id);
    if (!original) return;
    const updated = { ...original, ...editForm };
    await updateTransactionApi(updated.id, updated);
    setEditingId(null);
    setEditForm({});
    window.location.reload();
  };
  const handleChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };
  const latest = activeSummary;
  const latestNetworth = filteredNetworth[filteredNetworth.length - 1] ?? networth[networth.length - 1];
  const savingsRate = latest?.income > 0 ? Math.min(100, (latest.income - latest.outcome.total) / latest.income * 100) : 0;
  const cashPct = latest?.outcome.total > 0 ? Math.round(latest.outcome.cash / latest.outcome.total * 100) : 0;
  const creditPct = latest?.outcome.total > 0 ? Math.round(latest.outcome.credit_payment / latest.outcome.total * 100) : 0;
  const [txPage, setTxPage] = useState(1);
  const txPerPage = 10;
  const [categories, setCategories] = useState([]);
  const [recurringTitles, setRecurringTitles] = useState([]);
  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {
    });
    fetchRecurringTransactions().then((r) => {
      setRecurringTitles(r.filter((rx) => rx.active).map((rx) => rx.title));
    }).catch(() => {
    });
  }, []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [kickoffBanner, setKickoffBanner] = useState(null);
  const [kickoffOpen, setKickoffOpen] = useState(false);
  useEffect(() => {
    const today = /* @__PURE__ */ new Date();
    if (today.getDate() < 21) return;
    const latest2 = summaries[summaries.length - 1];
    if (!latest2) return;
    const latestDate = /* @__PURE__ */ new Date(latest2.month + " 1");
    const nextDate = new Date(latestDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    const nextMonthStr = nextDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    fetch("/api/kickoff").then((res) => res.json()).then((status) => {
      if (status.hasNextMonth) {
        setKickoffBanner(null);
        return;
      }
      fetchRecurringTransactions().then((recurring) => {
        const activeCount = recurring.filter((r) => r.active).length;
        setKickoffBanner({
          show: true,
          currentMonth: latest2.month,
          nextMonth: status.nextMonth || nextMonthStr,
          recurringCount: activeCount
        });
      }).catch(() => {
      });
    }).catch(() => {
    });
  }, [summaries]);
  const openCategoryDialog = (cat) => {
    setSelectedCategory(cat);
    setDialogOpen(true);
  };
  const categoryMap = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      map[c.name] = c;
    });
    return map;
  }, [categories]);
  const { toggleSort, sortData, isSorted } = useSortState();
  const { isCollapsed, toggle, expandAll, collapseAll } = useCollapsibleWidgets();
  const getTxCellValue = useCallback((t, key) => {
    switch (key) {
      case "paid":
        return t.done ? 1 : 0;
      case "title":
        return t.title;
      case "category":
        return t.category;
      case "date":
        return new Date(t.created_time || t.date).getTime();
      case "amount":
        return t.amount;
      case "type":
        return t.type;
      default:
        return "";
    }
  }, []);
  const sortedTransactions = useMemo(() => {
    return sortData(
      filteredTransactions,
      getTxCellValue,
      (data) => [...data].sort((a, b) => parseCreatedTime(b).getTime() - parseCreatedTime(a).getTime())
    );
  }, [filteredTransactions, sortData, getTxCellValue]);
  const totalTxPages = Math.max(1, Math.ceil(sortedTransactions.length / txPerPage));
  const pagedTransactions = sortedTransactions.slice(
    (txPage - 1) * txPerPage,
    txPage * txPerPage
  );
  const goToPage = (page) => {
    const clamped = Math.max(1, Math.min(totalTxPages, page));
    setTxPage(clamped);
  };
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ jsx(Label, { className: "text-sm font-medium text-slate-600 dark:text-slate-300", children: "Period:" }),
      /* @__PURE__ */ jsxs(Select, { value: filterPeriodId?.toString() ?? "all", onValueChange: (v) => {
        setFilterAllTime(v === "all");
        setFilterPeriodId(v === "all" ? null : parseInt(v));
        setTxPage(1);
      }, children: [
        /* @__PURE__ */ jsx(SelectTrigger, { className: "w-[160px]", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
        /* @__PURE__ */ jsxs(SelectContent, { children: [
          /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "All-time" }),
          periodOptions.map((p) => /* @__PURE__ */ jsx(SelectItem, { value: p.id.toString(), children: p.month }, p.id))
        ] })
      ] })
    ] }),
    kickoffBanner?.show && /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-900/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("p", { className: "text-sm font-semibold text-amber-800 dark:text-amber-300", children: [
          "💰 Have you received your salary for ",
          kickoffBanner.currentMonth,
          "?"
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-amber-600 dark:text-amber-400 mt-0.5", children: [
          "Confirm to start ",
          kickoffBanner.nextMonth,
          " with ",
          kickoffBanner.recurringCount,
          " recurring transaction",
          kickoffBanner.recurringCount !== 1 ? "s" : "",
          " preloaded."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2 shrink-0", children: [
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "secondary",
            size: "sm",
            onClick: () => setKickoffBanner((prev) => prev ? { ...prev, show: false } : null),
            children: "Later"
          }
        ),
        /* @__PURE__ */ jsxs(
          Button,
          {
            size: "sm",
            className: "bg-emerald-600 hover:bg-emerald-700 text-white",
            onClick: () => setKickoffOpen(true),
            children: [
              "Confirm & Start ",
              kickoffBanner.nextMonth
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx(
      MonthKickoffModal,
      {
        open: kickoffOpen,
        onOpenChange: setKickoffOpen,
        nextMonth: kickoffBanner?.nextMonth || "",
        recurringCount: kickoffBanner?.recurringCount || 0,
        onSuccess: () => {
          setKickoffBanner(null);
          window.location.reload();
        }
      }
    ),
    /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx("span", { className: "text-xs text-slate-400 dark:text-slate-500", children: "Widgets:" }),
      /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", onClick: expandAll, className: "h-7 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200", children: "Expand All" }),
      /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", onClick: collapseAll, className: "h-7 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200", children: "Collapse All" })
    ] }) }),
    /* @__PURE__ */ jsx(
      CollapsibleSection,
      {
        id: "summary-cards",
        title: "Summary Cards",
        isCollapsed: isCollapsed("summary-cards"),
        onToggle: () => toggle("summary-cards"),
        children: /* @__PURE__ */ jsx(
          DashboardSummaryCards,
          {
            summaries,
            networth,
            activeMonth: activeSummary?.month
          }
        )
      }
    ),
    /* @__PURE__ */ jsx(
      CollapsibleSection,
      {
        id: "spending-pulse",
        title: "Spending Pulse",
        isCollapsed: isCollapsed("spending-pulse"),
        onToggle: () => toggle("spending-pulse"),
        children: /* @__PURE__ */ jsx(
          SpendingPulse,
          {
            summaries,
            activeMonth: activeSummary?.month
          }
        )
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [
      /* @__PURE__ */ jsx(
        CollapsibleSection,
        {
          id: "anomaly-alerts",
          title: "Anomaly Alerts",
          isCollapsed: isCollapsed("anomaly-alerts"),
          onToggle: () => toggle("anomaly-alerts"),
          children: /* @__PURE__ */ jsx(
            AnomalyAlerts,
            {
              month: activeSummary?.month
            }
          )
        }
      ),
      /* @__PURE__ */ jsx(
        CollapsibleSection,
        {
          id: "budget-alerts",
          title: "Budget Alerts",
          isCollapsed: isCollapsed("budget-alerts"),
          onToggle: () => toggle("budget-alerts"),
          children: /* @__PURE__ */ jsx(
            BudgetAlerts,
            {
              summaries,
              categories,
              activeMonth: activeSummary?.month,
              transactions,
              recurringTitles
            }
          )
        }
      )
    ] }),
    /* @__PURE__ */ jsx(
      CollapsibleSection,
      {
        id: "financial-insights",
        title: "Financial Insights",
        isCollapsed: isCollapsed("financial-insights"),
        onToggle: () => toggle("financial-insights"),
        children: /* @__PURE__ */ jsx(
          FinancialInsights,
          {
            transactions,
            networth,
            summaries,
            categories,
            activeMonth: activeSummary?.month
          }
        )
      }
    ),
    /* @__PURE__ */ jsx(
      CollapsibleSection,
      {
        id: "outcome-breakdown",
        title: `Outcome Breakdown (${latest?.month})`,
        isCollapsed: isCollapsed("outcome-breakdown"),
        onToggle: () => toggle("outcome-breakdown"),
        children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-sm mb-1", children: [
              /* @__PURE__ */ jsx("span", { className: "text-slate-600 dark:text-slate-300", children: "Total Income" }),
              /* @__PURE__ */ jsx("span", { className: "font-semibold text-emerald-600 dark:text-emerald-400", children: formatIdr(latest?.income ?? 0) })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2", children: /* @__PURE__ */ jsx("div", { className: "bg-emerald-500 h-2 rounded-full", style: { width: "100%" } }) })
          ] }),
          (() => {
            const rawBudgetPct = latest?.income > 0 ? (latest?.outcome.total ?? 0) / latest.income * 100 : 0;
            const budgetPct = Math.max(0, rawBudgetPct);
            const visualBudgetPct = Math.min(100, budgetPct);
            const isOverBudget = budgetPct > 100;
            const budgetColor = isOverBudget ? "bg-red-600" : budgetPct > 80 ? "bg-red-500" : budgetPct > 50 ? "bg-amber-500" : "bg-emerald-500";
            const budgetTextColor = isOverBudget ? "text-red-700 dark:text-red-300" : budgetPct > 80 ? "text-red-600 dark:text-red-400" : budgetPct > 50 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400";
            return /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-sm mb-1", children: [
                /* @__PURE__ */ jsx("span", { className: "text-slate-600 dark:text-slate-300", children: "Budget Used" }),
                /* @__PURE__ */ jsxs("span", { className: `font-semibold ${budgetTextColor}`, children: [
                  budgetPct.toFixed(1),
                  "%",
                  isOverBudget && /* @__PURE__ */ jsx("span", { className: "ml-1 text-xs", children: "(Over)" })
                ] })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2", children: /* @__PURE__ */ jsx("div", { className: `${budgetColor} h-2 rounded-full transition-all`, style: { width: `${visualBudgetPct}%` } }) }),
              /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-400 mt-1", children: [
                formatIdr(latest?.outcome.total ?? 0),
                " spent of ",
                formatIdr(latest?.income ?? 0)
              ] })
            ] });
          })(),
          /* @__PURE__ */ jsx("div", { className: "border-t border-slate-200 dark:border-slate-700 md:col-span-2" }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-sm mb-1", children: [
              /* @__PURE__ */ jsx("span", { className: "text-slate-600 dark:text-slate-300", children: "Cash Expenses" }),
              /* @__PURE__ */ jsx("span", { className: "font-semibold", children: formatIdr(latest?.outcome.cash ?? 0) })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2", children: /* @__PURE__ */ jsx("div", { className: "bg-blue-500 h-2 rounded-full", style: { width: `${cashPct}%` } }) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-sm mb-1", children: [
              /* @__PURE__ */ jsx("span", { className: "text-slate-600 dark:text-slate-300", children: "Credit Payment (Prior Month)" }),
              /* @__PURE__ */ jsx("span", { className: "font-semibold", children: formatIdr(latest?.outcome.credit_payment ?? 0) })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2", children: /* @__PURE__ */ jsx("div", { className: "bg-amber-500 h-2 rounded-full", style: { width: `${creditPct}%` } }) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "md:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-700", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-sm", children: [
              /* @__PURE__ */ jsx("span", { className: "text-slate-500 dark:text-slate-400", children: "Current Month Credit Expenses" }),
              /* @__PURE__ */ jsx("span", { className: "font-semibold", children: formatIdr(latest?.outcome.credit_expenses ?? 0) })
            ] }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-400 mt-1", children: "These will be paid next month" })
          ] }),
          latest?.category_totals && Object.keys(latest.category_totals).length > 0 && /* @__PURE__ */ jsxs("div", { className: "md:col-span-2 pt-4 border-t border-slate-200 dark:border-slate-700", children: [
            /* @__PURE__ */ jsx("h3", { className: "text-sm font-semibold mb-3 text-slate-700 dark:text-slate-200", children: "Category Budgets" }),
            /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3", children: Object.entries(latest.category_totals).sort(([, a], [, b]) => b - a).map(([cat, amount]) => {
              const limit = categoryMap[cat]?.monthly_limit ?? 0;
              const catColor = categoryMap[cat]?.color;
              const trackStyle = catColor ? { backgroundColor: `${catColor}26` } : void 0;
              if (limit <= 0) {
                return /* @__PURE__ */ jsxs("div", { className: "cursor-pointer", onClick: () => openCategoryDialog(cat), children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-sm mb-1", children: [
                    /* @__PURE__ */ jsx("span", { className: "text-slate-600 dark:text-slate-300", children: cat }),
                    /* @__PURE__ */ jsx("span", { className: "font-semibold", children: formatIdr(amount) })
                  ] }),
                  /* @__PURE__ */ jsx("div", { className: "w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5", style: trackStyle, children: /* @__PURE__ */ jsx("div", { className: "h-1.5 rounded-full", style: { width: "100%", backgroundColor: catColor || "#94a3b8" } }) })
                ] }, cat);
              }
              const pct = Math.min(100, amount / limit * 100);
              const isOver = amount > limit;
              const barColor = isOver ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-emerald-500";
              const textColor = isOver ? "text-red-600 dark:text-red-400" : pct > 80 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400";
              return /* @__PURE__ */ jsxs("div", { className: "cursor-pointer", onClick: () => openCategoryDialog(cat), children: [
                /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-sm mb-1", children: [
                  /* @__PURE__ */ jsx("span", { className: "text-slate-600 dark:text-slate-300", children: cat }),
                  /* @__PURE__ */ jsxs("span", { className: `font-semibold ${textColor}`, children: [
                    formatIdr(amount),
                    " / ",
                    formatIdr(limit)
                  ] })
                ] }),
                /* @__PURE__ */ jsx("div", { className: "w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5", style: trackStyle, children: /* @__PURE__ */ jsx("div", { className: `${barColor} h-1.5 rounded-full transition-all`, style: { width: `${pct}%` } }) })
              ] }, cat);
            }) })
          ] })
        ] })
      }
    ),
    /* @__PURE__ */ jsxs(
      CollapsibleSection,
      {
        id: "transactions-table",
        title: `Transactions (${latest?.month})`,
        isCollapsed: isCollapsed("transactions-table"),
        onToggle: () => toggle("transactions-table"),
        badge: /* @__PURE__ */ jsx("a", { href: "/transactions", className: "text-xs text-blue-500 hover:text-blue-700 font-normal ml-2", children: "View all →" }),
        children: [
          /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs(Table, { children: [
            /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
              /* @__PURE__ */ jsx(SortableHeader, { sortKey: "paid", currentDirection: isSorted("paid"), onSort: toggleSort, children: "Paid" }),
              /* @__PURE__ */ jsx(SortableHeader, { sortKey: "title", currentDirection: isSorted("title"), onSort: toggleSort, children: "Title" }),
              /* @__PURE__ */ jsx(SortableHeader, { sortKey: "category", currentDirection: isSorted("category"), onSort: toggleSort, children: "Category" }),
              /* @__PURE__ */ jsx(SortableHeader, { sortKey: "date", currentDirection: isSorted("date"), onSort: toggleSort, children: "Date" }),
              /* @__PURE__ */ jsx(SortableHeader, { sortKey: "amount", currentDirection: isSorted("amount"), onSort: toggleSort, className: "text-right", children: "Amount" }),
              /* @__PURE__ */ jsx(SortableHeader, { sortKey: "type", currentDirection: isSorted("type"), onSort: toggleSort, children: "Type" }),
              /* @__PURE__ */ jsx(TableHead, {})
            ] }) }),
            /* @__PURE__ */ jsx(TableBody, { children: pagedTransactions.map((row) => {
              const createdDate = parseCreatedTime(row);
              const dateStr = isNaN(createdDate.getTime()) ? row.date : createdDate.toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });
              const typeClass = row.type === "cash" ? "text-blue-600 dark:text-blue-400" : row.type === "credit_payment" ? "text-amber-600 dark:text-amber-400" : "text-purple-600 dark:text-purple-400";
              const typeLabel = row.type === "cash" ? "Cash" : row.type === "credit_payment" ? "Credit Pay" : "Credit";
              return /* @__PURE__ */ jsxs(TableRow, { children: [
                /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(
                  Button,
                  {
                    size: "sm",
                    variant: "ghost",
                    onClick: async () => {
                      await toggleTransactionDoneApi(row.id, !row.done);
                      window.location.reload();
                    },
                    className: `h-7 text-xs font-semibold px-2 py-0 ${row.done ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"}`,
                    children: row.done ? "Paid" : "Unpaid"
                  }
                ) }),
                /* @__PURE__ */ jsxs(TableCell, { children: [
                  /* @__PURE__ */ jsx("span", { children: row.title }),
                  row.notes && /* @__PURE__ */ jsx("span", { className: "inline-flex ml-1.5 align-middle", title: row.notes, children: /* @__PURE__ */ jsx(StickyNote, { className: "w-3.5 h-3.5 text-amber-500 dark:text-amber-400 inline" }) })
                ] }),
                /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(
                  Badge,
                  {
                    variant: "secondary",
                    style: {
                      backgroundColor: categoryMap[row.category]?.color || void 0,
                      color: categoryMap[row.category]?.color ? "#fff" : void 0
                    },
                    children: row.category
                  }
                ) }),
                /* @__PURE__ */ jsx(TableCell, { className: "text-muted-foreground text-xs", children: dateStr }),
                /* @__PURE__ */ jsx(TableCell, { className: "font-medium text-right", children: formatIdr(row.amount) }),
                /* @__PURE__ */ jsx(TableCell, { className: `${typeClass} text-xs font-semibold uppercase`, children: typeLabel }),
                /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
                  /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", className: "h-7 text-xs text-blue-500 hover:text-blue-700", onClick: () => startEdit(row), children: "Edit" }),
                  /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", className: "h-7 text-xs text-red-500 hover:text-red-700", onClick: async () => {
                    if (confirm("Delete this transaction?")) {
                      await deleteTransactionApi(row.id);
                      window.location.reload();
                    }
                  }, children: "Delete" })
                ] }) })
              ] }, row.id);
            }) })
          ] }) }),
          /* @__PURE__ */ jsx(
            EditTransactionDialog,
            {
              open: editingId !== null,
              transaction: editForm,
              onChange: handleChange,
              onSave: saveEdit,
              onCancel: cancelEdit,
              periods: summaries.map((s) => ({ period_id: s.period_id, month: s.month })),
              categories: categories.map((c) => c.name)
            }
          ),
          sortedTransactions.length > txPerPage && /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mt-4", children: [
            /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: [
              "Showing ",
              (txPage - 1) * txPerPage + 1,
              "–",
              Math.min(txPage * txPerPage, sortedTransactions.length),
              " of ",
              sortedTransactions.length
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(
                Button,
                {
                  variant: "outline",
                  size: "sm",
                  onClick: () => goToPage(txPage - 1),
                  disabled: txPage <= 1,
                  children: "Previous"
                }
              ),
              /* @__PURE__ */ jsxs("span", { className: "text-xs text-slate-500 dark:text-slate-400 min-w-[3rem] text-center", children: [
                txPage,
                " / ",
                totalTxPages
              ] }),
              /* @__PURE__ */ jsx(
                Button,
                {
                  variant: "outline",
                  size: "sm",
                  onClick: () => goToPage(txPage + 1),
                  disabled: txPage >= totalTxPages,
                  children: "Next"
                }
              )
            ] })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold mb-4", children: "Cash Outcome vs Credit Payment by Month" }),
      /* @__PURE__ */ jsx(OutcomeChart, { data: filteredSummaries })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold mb-4", children: "Savings Rate Trend" }),
      /* @__PURE__ */ jsx(SavingsRateChart, { data: filteredSummaries })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-4", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold", children: "Category Spending Trend" }),
        /* @__PURE__ */ jsx("span", { className: "text-xs text-slate-500 dark:text-slate-400", children: "Top categories by total spend" })
      ] }),
      /* @__PURE__ */ jsx(CategoryTrendChart, { data: filteredSummaries, categories })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold mb-4", children: "Networth Trend" }),
        /* @__PURE__ */ jsx(NetworthChart, { data: filteredNetworth })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold mb-4", children: isAllTime ? "Latest Month Categories" : `${latest?.month ?? ""} Categories` }),
        latest?.category_totals && Object.keys(latest.category_totals).length > 0 ? /* @__PURE__ */ jsx(CategoryChart, { data: latest.category_totals, categories, onCategoryClick: openCategoryDialog }) : /* @__PURE__ */ jsx("p", { className: "text-slate-500 text-sm", children: "No category data available." })
      ] })
    ] }),
    /* @__PURE__ */ jsx(
      PeriodVsAverage,
      {
        summaries: filteredSummaries,
        categories,
        activePeriodId: filterPeriodId
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6", children: [
        /* @__PURE__ */ jsxs("p", { className: "text-sm font-medium text-slate-500 dark:text-slate-400", children: [
          "Total Income ",
          isAllTime ? "(Latest)" : `(${latest?.month ?? ""})`
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold mt-2", children: formatIdr(latest?.income ?? 0) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6", children: [
        /* @__PURE__ */ jsxs("p", { className: "text-sm font-medium text-slate-500 dark:text-slate-400", children: [
          "Total Outcome ",
          isAllTime ? "(Latest)" : `(${latest?.month ?? ""})`
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold mt-2", children: formatIdr(latest?.outcome.total ?? 0) }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-400 mt-1", children: "Cash + Credit Payment" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6", children: [
        /* @__PURE__ */ jsxs("p", { className: "text-sm font-medium text-slate-500 dark:text-slate-400", children: [
          "Net Worth ",
          isAllTime ? "(Latest)" : `(${latestNetworth?.month ?? ""})`
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold mt-2", children: formatIdr(latestNetworth?.total ?? 0) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6", children: [
        /* @__PURE__ */ jsxs("p", { className: "text-sm font-medium text-slate-500 dark:text-slate-400", children: [
          "Savings Rate ",
          isAllTime ? "(Latest)" : `(${latest?.month ?? ""})`
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "text-2xl font-bold mt-2", style: { color: savingsRate < 0 ? "#ef4444" : void 0 }, children: [
          savingsRate.toFixed(1),
          "%"
        ] }),
        /* @__PURE__ */ jsx("div", { className: "w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-3", children: /* @__PURE__ */ jsx("div", { className: `h-2 rounded-full transition-all ${savingsRate < 0 ? "bg-red-500 ml-auto" : "bg-emerald-500"}`, style: { width: `${Math.min(100, Math.abs(savingsRate))}%` } }) })
      ] })
    ] }),
    /* @__PURE__ */ jsx(Dialog, { open: dialogOpen, onOpenChange: setDialogOpen, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-2xl max-h-[85vh] overflow-y-auto", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxs(DialogTitle, { children: [
          selectedCategory,
          " — ",
          activeSummary?.month
        ] }),
        /* @__PURE__ */ jsx(DialogDescription, { children: (() => {
          const catTxs = transactions.filter((t) => t.category === selectedCategory && t.period_id === activeSummary?.period_id);
          const total = catTxs.reduce((sum, t) => sum + t.amount, 0);
          return `${catTxs.length} transaction${catTxs.length !== 1 ? "s" : ""} • Total: ${formatIdr(total)}`;
        })() })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-2 mb-4", children: [
        /* @__PURE__ */ jsx("h4", { className: "text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2", children: "Outcome by Category" }),
        /* @__PURE__ */ jsx(
          OutcomeBarChart,
          {
            data: activeSummary?.category_totals || {},
            categories,
            highlightCategory: selectedCategory,
            summaries
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-2", children: (() => {
        const catTxs = transactions.filter((t) => t.category === selectedCategory && t.period_id === activeSummary?.period_id).sort((a, b) => parseCreatedTime(b).getTime() - parseCreatedTime(a).getTime());
        if (catTxs.length === 0) {
          return /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-500", children: "No transactions found for this category." });
        }
        return /* @__PURE__ */ jsxs(Table, { children: [
          /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableHead, { children: "Title" }),
            /* @__PURE__ */ jsx(TableHead, { children: "Date" }),
            /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Amount" }),
            /* @__PURE__ */ jsx(TableHead, { children: "Type" })
          ] }) }),
          /* @__PURE__ */ jsx(TableBody, { children: catTxs.map((t) => {
            const d = parseCreatedTime(t);
            const dateStr = isNaN(d.getTime()) ? t.date : d.toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });
            const typeLabel = t.type === "cash" ? "Cash" : t.type === "credit_payment" ? "Credit Pay" : "Credit";
            return /* @__PURE__ */ jsxs(TableRow, { children: [
              /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: t.title }),
              /* @__PURE__ */ jsx(TableCell, { className: "text-muted-foreground text-xs", children: dateStr }),
              /* @__PURE__ */ jsx(TableCell, { className: "text-right font-medium", children: formatIdr(t.amount) }),
              /* @__PURE__ */ jsx(TableCell, { className: "text-xs font-semibold uppercase", children: /* @__PURE__ */ jsx(Badge, { variant: "outline", children: typeLabel }) })
            ] }, t.id);
          }) })
        ] });
      })() })
    ] }) })
  ] });
}

const $$Index = createComponent(($$result, $$props, $$slots) => {
  const transactions = getTransactions();
  const networth = getNetworth();
  const summaries = getMonthlySummary();
  const incomeRows = db.prepare("SELECT mi.period_id, mi.income, p.month FROM monthly_income mi JOIN periods p ON mi.period_id = p.id").all();
  const incomeMap = new Map(incomeRows.map((r) => [r.month, r.income]));
  for (const s of summaries) {
    const income = incomeMap.get(s.month) || 0;
    s.income = income;
    s.savings = income - s.outcome.total;
    s.savings_rate_pct = income > 0 ? Number((s.savings / income * 100).toFixed(2)) : 0;
  }
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Financial Dashboard" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"> <div> <h1 class="text-2xl font-bold">Dashboard</h1> <p class="text-slate-500 dark:text-slate-400 text-sm">Overview of income, outcome, and networth</p> </div> <a href="/add" class="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition">
+ Add Data
</a> </div> ${renderComponent($$result2, "Dashboard", Dashboard, { "transactions": transactions, "networth": networth, "summaries": summaries, "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/Dashboard", "client:component-export": "default" })} ` })}`;
}, "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/index.astro", void 0);

const $$file = "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
