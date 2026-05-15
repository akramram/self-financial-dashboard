/* empty css                               */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BVE5k6Zu.mjs';
import 'kleur/colors';
import { f as formatIdr, B as Button, $ as $$Layout } from '../chunks/button_DxZ39a-H.mjs';
import { jsx, jsxs } from 'react/jsx-runtime';
import { useMemo, useState, useEffect } from 'react';
import { B as Badge, b as fetchCategories, I as Input, t as toggleTransactionDoneApi, m as deleteTransactionApi, n as updateTransactionApi } from '../chunks/badge_m88INWDZ.mjs';
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { N as NetworthChart } from '../chunks/NetworthChart_8Ak_WuMa.mjs';
import { C as Card, a as CardHeader, b as CardTitle, c as CardContent } from '../chunks/card_BrPPjHWf.mjs';
import { AlertTriangle, TrendingUp, TrendingDown, Receipt, CheckCircle, PiggyBank, Wallet } from 'lucide-react';
import { T as Table, a as TableHeader, b as TableRow, c as TableHead, d as TableBody, e as TableCell } from '../chunks/table_WY4BWlv2.mjs';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from '../chunks/select_DbBAKWvI.mjs';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription } from '../chunks/dialog_ybYIOgOo.mjs';
import { c as getTransactions, e as getNetworth, f as getMonthlySummary, h as db } from '../chunks/db_B8cbmQtY.mjs';
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
function CategoryChart({ data, categories = [], onCategoryClick }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const labels = entries.map(([k]) => k);
  const values = entries.map(([_, v]) => v);
  const colorMap = new Map(categories.map((c) => [c.name, c.color]));
  const colors = labels.map((label, i) => colorMap.get(label) || FALLBACK_COLORS$1[i % FALLBACK_COLORS$1.length]);
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
    const topCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name]) => name);
    const datasets2 = topCategories.map((cat, idx) => {
      const color = colorMap.get(cat) || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
      return {
        label: cat,
        data: sortedData.map((summary) => summary.category_totals?.[cat] ?? 0),
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

function parseCreatedTime(tx) {
  if (tx.created_time) {
    const d = new Date(tx.created_time);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(tx.date);
}
const TYPE_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "credit_expense", label: "Credit Expense" },
  { value: "credit_payment", label: "Credit Payment" }
];
function Dashboard({ transactions, networth, summaries }) {
  const months = useMemo(() => [...summaries].reverse().map((s) => s.month), [summaries]);
  const [filterMonth, setFilterMonth] = useState("all");
  const isAllTime = filterMonth === "all";
  const activeSummary = useMemo(() => {
    if (isAllTime) return summaries[summaries.length - 1];
    return summaries.find((s) => s.month === filterMonth) ?? summaries[summaries.length - 1];
  }, [filterMonth, summaries, isAllTime]);
  const filteredSummaries = useMemo(() => {
    if (isAllTime) return summaries;
    return summaries.filter((s) => s.month === filterMonth);
  }, [filterMonth, summaries, isAllTime]);
  const filteredNetworth = useMemo(() => {
    if (isAllTime) return networth;
    return networth.filter((n) => n.month === filterMonth);
  }, [filterMonth, networth, isAllTime]);
  const filteredTransactions = useMemo(() => {
    if (isAllTime) return transactions.filter((t) => t.month === activeSummary.month);
    return transactions.filter((t) => t.month === filterMonth);
  }, [filterMonth, transactions, activeSummary, isAllTime]);
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
  const savingsRate = latest?.income > 0 ? Math.max(0, Math.min(100, (latest.income - latest.outcome.total) / latest.income * 100)) : 0;
  const cashPct = latest?.outcome.total > 0 ? Math.round(latest.outcome.cash / latest.outcome.total * 100) : 0;
  const creditPct = latest?.outcome.total > 0 ? Math.round(latest.outcome.credit_payment / latest.outcome.total * 100) : 0;
  const [txPage, setTxPage] = useState(1);
  const txPerPage = 10;
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {
    });
  }, []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
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
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort(
      (a, b) => parseCreatedTime(b).getTime() - parseCreatedTime(a).getTime()
    );
  }, [filteredTransactions]);
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
      /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-slate-600 dark:text-slate-300", children: "Period:" }),
      /* @__PURE__ */ jsxs(Select, { value: filterMonth, onValueChange: (v) => {
        setFilterMonth(v);
        setTxPage(1);
      }, children: [
        /* @__PURE__ */ jsx(SelectTrigger, { className: "w-[160px]", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
        /* @__PURE__ */ jsxs(SelectContent, { children: [
          /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "All-time" }),
          months.map((m) => /* @__PURE__ */ jsx(SelectItem, { value: m, children: m }, m))
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(
      FinancialInsights,
      {
        transactions,
        networth,
        summaries,
        categories,
        activeMonth: isAllTime ? activeSummary.month : filterMonth
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6", children: [
      /* @__PURE__ */ jsxs("h2", { className: "text-lg font-semibold mb-4", children: [
        "Outcome Breakdown (",
        latest?.month,
        ")"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4", children: [
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
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center mb-4", children: [
        /* @__PURE__ */ jsxs("h2", { className: "text-lg font-semibold", children: [
          "Transactions (",
          latest?.month,
          ")"
        ] }),
        /* @__PURE__ */ jsx("a", { href: "/transactions", className: "text-xs text-blue-500 hover:text-blue-700", children: "View all →" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { children: "Paid" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Title" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Category" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Date" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Amount" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Type" }),
          /* @__PURE__ */ jsx(TableHead, {})
        ] }) }),
        /* @__PURE__ */ jsx(TableBody, { children: pagedTransactions.map((row) => {
          const isEditing = editingId === row.id;
          const typeClass = row.type === "cash" ? "text-blue-600 dark:text-blue-400" : row.type === "credit_payment" ? "text-amber-600 dark:text-amber-400" : "text-purple-600 dark:text-purple-400";
          const typeLabel = row.type === "cash" ? "Cash" : row.type === "credit_payment" ? "Credit Pay" : "Credit";
          const createdDate = parseCreatedTime(row);
          const dateStr = isNaN(createdDate.getTime()) ? row.date : createdDate.toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });
          if (isEditing) {
            return /* @__PURE__ */ jsxs(TableRow, { className: "bg-muted/30", children: [
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs("label", { className: "inline-flex items-center cursor-pointer gap-2", children: [
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    type: "checkbox",
                    checked: !!editForm.done,
                    onChange: (e) => handleChange("done", e.target.checked),
                    className: "w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  }
                ),
                /* @__PURE__ */ jsx("span", { className: "text-xs", children: editForm.done ? "Paid" : "Unpaid" })
              ] }) }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(
                Input,
                {
                  type: "text",
                  value: editForm.title ?? "",
                  onChange: (e) => handleChange("title", e.target.value),
                  className: "h-8 text-xs"
                }
              ) }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(
                Input,
                {
                  type: "text",
                  value: editForm.category ?? "",
                  onChange: (e) => handleChange("category", e.target.value),
                  className: "h-8 text-xs"
                }
              ) }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(
                Input,
                {
                  type: "text",
                  value: editForm.created_time ?? "",
                  onChange: (e) => handleChange("created_time", e.target.value),
                  className: "h-8 text-xs"
                }
              ) }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(
                Input,
                {
                  type: "number",
                  value: editForm.amount ?? 0,
                  onChange: (e) => handleChange("amount", Number(e.target.value)),
                  className: "h-8 text-xs text-right"
                }
              ) }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs(Select, { value: editForm.type ?? "cash", onValueChange: (v) => handleChange("type", v), children: [
                /* @__PURE__ */ jsx(SelectTrigger, { className: "h-8 text-xs", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
                /* @__PURE__ */ jsx(SelectContent, { children: TYPE_OPTIONS.map((opt) => /* @__PURE__ */ jsx(SelectItem, { value: opt.value, children: opt.label }, opt.value)) })
              ] }) }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs("div", { className: "flex gap-1", children: [
                /* @__PURE__ */ jsx(Button, { size: "sm", className: "h-7 text-xs", onClick: saveEdit, children: "Save" }),
                /* @__PURE__ */ jsx(Button, { size: "sm", variant: "secondary", className: "h-7 text-xs", onClick: cancelEdit, children: "Cancel" })
              ] }) })
            ] }, row.id);
          }
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
            /* @__PURE__ */ jsx(TableCell, { children: row.title }),
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
    ] }),
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
        /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold mb-4", children: isAllTime ? "Latest Month Categories" : `${latest.month} Categories` }),
        latest?.category_totals && Object.keys(latest.category_totals).length > 0 ? /* @__PURE__ */ jsx(CategoryChart, { data: latest.category_totals, categories, onCategoryClick: openCategoryDialog }) : /* @__PURE__ */ jsx("p", { className: "text-slate-500 text-sm", children: "No category data available." })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6", children: [
        /* @__PURE__ */ jsxs("p", { className: "text-sm font-medium text-slate-500 dark:text-slate-400", children: [
          "Total Income ",
          isAllTime ? "(Latest)" : `(${latest.month})`
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold mt-2", children: formatIdr(latest?.income ?? 0) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6", children: [
        /* @__PURE__ */ jsxs("p", { className: "text-sm font-medium text-slate-500 dark:text-slate-400", children: [
          "Total Outcome ",
          isAllTime ? "(Latest)" : `(${latest.month})`
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
          isAllTime ? "(Latest)" : `(${latest.month})`
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "text-2xl font-bold mt-2", children: [
          savingsRate.toFixed(1),
          "%"
        ] }),
        /* @__PURE__ */ jsx("div", { className: "w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-3", children: /* @__PURE__ */ jsx("div", { className: "bg-emerald-500 h-2 rounded-full transition-all", style: { width: `${Math.min(100, savingsRate)}%` } }) })
      ] })
    ] }),
    /* @__PURE__ */ jsx(Dialog, { open: dialogOpen, onOpenChange: setDialogOpen, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-2xl max-h-[80vh] overflow-y-auto", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxs(DialogTitle, { children: [
          selectedCategory,
          " — ",
          isAllTime ? activeSummary.month : filterMonth
        ] }),
        /* @__PURE__ */ jsx(DialogDescription, { children: (() => {
          const targetMonth = isAllTime ? activeSummary.month : filterMonth;
          const catTxs = transactions.filter((t) => t.category === selectedCategory && t.month === targetMonth);
          const total = catTxs.reduce((sum, t) => sum + t.amount, 0);
          return `${catTxs.length} transaction${catTxs.length !== 1 ? "s" : ""} • Total: ${formatIdr(total)}`;
        })() })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-2", children: (() => {
        const targetMonth = isAllTime ? activeSummary.month : filterMonth;
        const catTxs = transactions.filter((t) => t.category === selectedCategory && t.month === targetMonth).sort((a, b) => parseCreatedTime(b).getTime() - parseCreatedTime(a).getTime());
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
  const incomeRows = db.prepare("SELECT month, income FROM monthly_income").all();
  const incomeMap = new Map(incomeRows.map((r) => [r.month, r.income]));
  for (const s of summaries) {
    const income = incomeMap.get(s.month) || 0;
    s.income = income;
    s.savings = income - s.outcome.total;
    s.savings_rate_pct = income > 0 ? Number((s.savings / income * 100).toFixed(2)) : 0;
  }
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Financial Dashboard" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"> <div> <h1 class="text-2xl font-bold">Dashboard</h1> <p class="text-slate-500 dark:text-slate-400 text-sm">Overview of income, outcome, and networth</p> </div> <a href="/add" class="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition">
+ Add Data
</a> </div> ${renderComponent($$result2, "Dashboard", Dashboard, { "transactions": transactions, "networth": networth, "summaries": summaries, "client:load": true, "client:component-hydration": "load", "client:component-path": "/root/self-financial-dashboard/src/components/Dashboard", "client:component-export": "default" })} ` })}`;
}, "/root/self-financial-dashboard/src/pages/index.astro", void 0);

const $$file = "/root/self-financial-dashboard/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
