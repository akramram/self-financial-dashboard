/* empty css                               */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BN-0jZ66.mjs';
import 'kleur/colors';
import { f as formatIdr, $ as $$Layout } from '../chunks/utils_B5Myb6nO.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { useMemo, useState } from 'react';
import { C as Card, a as CardHeader, b as CardTitle, c as CardContent } from '../chunks/card_DQjFT-ZO.mjs';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from '../chunks/select_BdQoKGwf.mjs';
import { T as Table, a as TableHeader, b as TableRow, c as TableHead, d as TableBody, e as TableCell } from '../chunks/table_K3ijaacM.mjs';
import { B as Badge } from '../chunks/badge_D2r9e7Nn.mjs';
import { B as Button } from '../chunks/button_ya11cJX2.mjs';
import { Crosshair, ArrowLeftRight, Wallet, Receipt, PiggyBank, TrendingUp, Landmark, Banknote, CreditCard, TrendingDown } from 'lucide-react';
import { Chart, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { p as getTransactions, q as getNetworth, g as getMonthlySummary, a as getCategories, d as db } from '../chunks/db_DFS0dPqt.mjs';
export { renderers } from '../renderers.mjs';

Chart.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);
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
  "#6366f1",
  "#14b8a6",
  "#a855f7",
  "#e11d48",
  "#0ea5e9",
  "#d946ef"
];
function CategoryRadarChart({
  leftSummary,
  rightSummary,
  leftMonth,
  rightMonth,
  categories
}) {
  const chartData = useMemo(() => {
    const allCats = /* @__PURE__ */ new Set();
    if (leftSummary?.category_totals) {
      Object.keys(leftSummary.category_totals).forEach((c) => allCats.add(c));
    }
    if (rightSummary?.category_totals) {
      Object.keys(rightSummary.category_totals).forEach((c) => allCats.add(c));
    }
    const sorted = Array.from(allCats).map((cat) => ({
      name: cat,
      left: leftSummary?.category_totals?.[cat] ?? 0,
      right: rightSummary?.category_totals?.[cat] ?? 0,
      total: (leftSummary?.category_totals?.[cat] ?? 0) + (rightSummary?.category_totals?.[cat] ?? 0)
    })).sort((a, b) => b.total - a.total).slice(0, 12);
    const labels = sorted.map((s) => s.name);
    const leftValues = sorted.map((s) => s.left);
    const rightValues = sorted.map((s) => s.right);
    const colorMap = new Map(categories.map((c) => [c.name, c.color]));
    const leftColors = sorted.map(
      (s, i) => colorMap.get(s.name) || FALLBACK_COLORS[i % FALLBACK_COLORS.length]
    );
    const rightColors = sorted.map(
      (s, i) => colorMap.get(s.name) || FALLBACK_COLORS[i % FALLBACK_COLORS.length]
    );
    return {
      labels,
      datasets: [
        {
          label: leftMonth,
          data: leftValues,
          backgroundColor: "rgba(59, 130, 246, 0.15)",
          borderColor: "rgba(59, 130, 246, 0.8)",
          borderWidth: 2,
          pointBackgroundColor: leftColors,
          pointBorderColor: leftColors,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: rightMonth,
          data: rightValues,
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          borderColor: "rgba(239, 68, 68, 0.8)",
          borderWidth: 2,
          pointBackgroundColor: rightColors,
          pointBorderColor: rightColors,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };
  }, [leftSummary, rightSummary, leftMonth, rightMonth, categories]);
  const hasData = chartData.labels.length > 0;
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        ticks: {
          display: true,
          backdropColor: "transparent",
          font: { size: 10 },
          callback: (value) => {
            if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
            if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
            return String(value);
          }
        },
        pointLabels: {
          font: { size: 11, weight: "bold" },
          color: "#64748b"
        },
        grid: {
          color: "rgba(148, 163, 184, 0.2)"
        },
        angleLines: {
          color: "rgba(148, 163, 184, 0.2)"
        }
      }
    },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { size: 12 }
        }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const label = ctx.dataset.label || "";
            const value = ctx.raw;
            return `${label}: ${formatIdr(value)}`;
          }
        }
      }
    }
  };
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold flex items-center gap-2", children: [
      /* @__PURE__ */ jsx(Crosshair, { className: "w-4 h-4 text-slate-500" }),
      "Category Spending Radar"
    ] }) }),
    /* @__PURE__ */ jsx(CardContent, { children: hasData ? /* @__PURE__ */ jsx("div", { className: "h-[400px] w-full", children: /* @__PURE__ */ jsx(Radar, { data: chartData, options }) }) : /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center h-[200px] text-muted-foreground text-sm", children: "No category data available for the selected periods." }) })
  ] });
}

function DeltaValue({ current, previous, isPct, inverse }) {
  if (previous === 0 && current === 0) {
    return /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: "—" });
  }
  if (previous === 0) {
    return /* @__PURE__ */ jsx("span", { className: "text-xs text-emerald-600 dark:text-emerald-400 font-medium", children: "New" });
  }
  const change = current - previous;
  const isPositive = change > 0;
  const isGood = inverse ? !isPositive : isPositive;
  const colorClass = isGood ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
  const prefix = change > 0 ? "+" : "";
  return /* @__PURE__ */ jsxs("span", { className: `text-xs font-medium ${colorClass}`, children: [
    prefix,
    isPct ? `${change.toFixed(1)}%` : formatIdr(change)
  ] });
}
function MonthComparison({ transactions, networth, summaries, categories }) {
  const months = useMemo(() => {
    return [...summaries].reverse().map((s) => s.month);
  }, [summaries]);
  const [leftMonth, setLeftMonth] = useState(months[1] ?? months[0] ?? "");
  const [rightMonth, setRightMonth] = useState(months[0] ?? "");
  const leftSummary = useMemo(() => summaries.find((s) => s.month === leftMonth), [summaries, leftMonth]);
  const rightSummary = useMemo(() => summaries.find((s) => s.month === rightMonth), [summaries, rightMonth]);
  const leftNetworth = useMemo(() => networth.find((n) => n.month === leftMonth), [networth, leftMonth]);
  const rightNetworth = useMemo(() => networth.find((n) => n.month === rightMonth), [networth, rightMonth]);
  const leftPeriodId = leftSummary?.period_id;
  const rightPeriodId = rightSummary?.period_id;
  const leftTxs = useMemo(() => transactions.filter((t) => t.period_id === leftPeriodId), [transactions, leftPeriodId]);
  const rightTxs = useMemo(() => transactions.filter((t) => t.period_id === rightPeriodId), [transactions, rightPeriodId]);
  const categoryMap = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      map[c.name] = c;
    });
    return map;
  }, [categories]);
  const categoryComparison = useMemo(() => {
    const allCats = /* @__PURE__ */ new Set();
    if (leftSummary?.category_totals) Object.keys(leftSummary.category_totals).forEach((c) => allCats.add(c));
    if (rightSummary?.category_totals) Object.keys(rightSummary.category_totals).forEach((c) => allCats.add(c));
    return Array.from(allCats).map((cat) => {
      const leftAmt = leftSummary?.category_totals?.[cat] ?? 0;
      const rightAmt = rightSummary?.category_totals?.[cat] ?? 0;
      return {
        name: cat,
        left: leftAmt,
        right: rightAmt,
        delta: rightAmt - leftAmt,
        color: categoryMap[cat]?.color
      };
    }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }, [leftSummary, rightSummary, categoryMap]);
  const txCountLeft = leftTxs.length;
  const txCountRight = rightTxs.length;
  const avgTxLeft = txCountLeft > 0 ? (leftSummary?.outcome.total ?? 0) / txCountLeft : 0;
  const avgTxRight = txCountRight > 0 ? (rightSummary?.outcome.total ?? 0) / txCountRight : 0;
  const MetricCard = ({
    label,
    icon,
    leftValue,
    rightValue,
    isPct,
    inverse,
    format = formatIdr
  }) => /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "pt-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-3", children: [
      /* @__PURE__ */ jsx("div", { className: "p-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300", children: icon }),
      /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground font-medium", children: label })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground mb-0.5", children: leftMonth }),
        /* @__PURE__ */ jsx("p", { className: "text-base font-semibold", children: format(leftValue) })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground mb-0.5", children: rightMonth }),
        /* @__PURE__ */ jsx("p", { className: "text-base font-semibold", children: format(rightValue) }),
        /* @__PURE__ */ jsx("div", { className: "mt-1", children: /* @__PURE__ */ jsx(DeltaValue, { current: rightValue, previous: leftValue, isPct, inverse }) })
      ] })
    ] })
  ] }) });
  const handleSwap = () => {
    setLeftMonth(rightMonth);
    setRightMonth(leftMonth);
  };
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row items-start sm:items-center gap-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-slate-600 dark:text-slate-300", children: "Month A:" }),
        /* @__PURE__ */ jsxs(Select, { value: leftMonth, onValueChange: setLeftMonth, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { className: "w-[180px]", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsx(SelectContent, { children: months.map((m) => /* @__PURE__ */ jsx(SelectItem, { value: m, children: m }, m)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx("span", { className: "hidden sm:inline text-slate-400", children: "vs" }),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "ghost",
            size: "icon",
            className: "h-8 w-8",
            onClick: handleSwap,
            title: "Swap months",
            children: /* @__PURE__ */ jsx(ArrowLeftRight, { className: "w-4 h-4" })
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-slate-600 dark:text-slate-300", children: "Month B:" }),
        /* @__PURE__ */ jsxs(Select, { value: rightMonth, onValueChange: setRightMonth, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { className: "w-[180px]", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsx(SelectContent, { children: months.map((m) => /* @__PURE__ */ jsx(SelectItem, { value: m, children: m }, m)) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", children: [
      /* @__PURE__ */ jsx(
        MetricCard,
        {
          label: "Income",
          icon: /* @__PURE__ */ jsx(Wallet, { className: "w-4 h-4" }),
          leftValue: leftSummary?.income ?? 0,
          rightValue: rightSummary?.income ?? 0
        }
      ),
      /* @__PURE__ */ jsx(
        MetricCard,
        {
          label: "Total Spending",
          icon: /* @__PURE__ */ jsx(Receipt, { className: "w-4 h-4" }),
          leftValue: leftSummary?.outcome.total ?? 0,
          rightValue: rightSummary?.outcome.total ?? 0,
          inverse: true
        }
      ),
      /* @__PURE__ */ jsx(
        MetricCard,
        {
          label: "Savings",
          icon: /* @__PURE__ */ jsx(PiggyBank, { className: "w-4 h-4" }),
          leftValue: leftSummary?.savings ?? 0,
          rightValue: rightSummary?.savings ?? 0
        }
      ),
      /* @__PURE__ */ jsx(
        MetricCard,
        {
          label: "Savings Rate",
          icon: /* @__PURE__ */ jsx(TrendingUp, { className: "w-4 h-4" }),
          leftValue: leftSummary?.savings_rate_pct ?? 0,
          rightValue: rightSummary?.savings_rate_pct ?? 0,
          isPct: true,
          format: (n) => `${n.toFixed(1)}%`
        }
      ),
      /* @__PURE__ */ jsx(
        MetricCard,
        {
          label: "Networth",
          icon: /* @__PURE__ */ jsx(Landmark, { className: "w-4 h-4" }),
          leftValue: leftNetworth?.total ?? 0,
          rightValue: rightNetworth?.total ?? 0
        }
      ),
      /* @__PURE__ */ jsx(
        MetricCard,
        {
          label: "Avg. per Transaction",
          icon: /* @__PURE__ */ jsx(Banknote, { className: "w-4 h-4" }),
          leftValue: avgTxLeft,
          rightValue: avgTxRight,
          inverse: true
        }
      )
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(CreditCard, { className: "w-4 h-4 text-slate-500" }),
        "Cash vs Credit Breakdown"
      ] }) }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-slate-700 dark:text-slate-200", children: leftMonth }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-sm", children: [
              /* @__PURE__ */ jsx("span", { className: "text-slate-500 dark:text-slate-400", children: "Cash Expenses" }),
              /* @__PURE__ */ jsx("span", { className: "font-medium", children: formatIdr(leftSummary?.outcome.cash ?? 0) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-sm", children: [
              /* @__PURE__ */ jsx("span", { className: "text-slate-500 dark:text-slate-400", children: "Credit Payment" }),
              /* @__PURE__ */ jsx("span", { className: "font-medium", children: formatIdr(leftSummary?.outcome.credit_payment ?? 0) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-sm", children: [
              /* @__PURE__ */ jsx("span", { className: "text-slate-500 dark:text-slate-400", children: "Credit Expenses" }),
              /* @__PURE__ */ jsx("span", { className: "font-medium", children: formatIdr(leftSummary?.outcome.credit_expenses ?? 0) })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-slate-700 dark:text-slate-200", children: rightMonth }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-sm", children: [
              /* @__PURE__ */ jsx("span", { className: "text-slate-500 dark:text-slate-400", children: "Cash Expenses" }),
              /* @__PURE__ */ jsx("span", { className: "font-medium", children: formatIdr(rightSummary?.outcome.cash ?? 0) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-sm", children: [
              /* @__PURE__ */ jsx("span", { className: "text-slate-500 dark:text-slate-400", children: "Credit Payment" }),
              /* @__PURE__ */ jsx("span", { className: "font-medium", children: formatIdr(rightSummary?.outcome.credit_payment ?? 0) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-sm", children: [
              /* @__PURE__ */ jsx("span", { className: "text-slate-500 dark:text-slate-400", children: "Credit Expenses" }),
              /* @__PURE__ */ jsx("span", { className: "font-medium", children: formatIdr(rightSummary?.outcome.credit_expenses ?? 0) })
            ] })
          ] })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(
      CategoryRadarChart,
      {
        leftSummary,
        rightSummary,
        leftMonth,
        rightMonth,
        categories
      }
    ),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(TrendingDown, { className: "w-4 h-4 text-slate-500" }),
        "Category Comparison"
      ] }) }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", { className: "rounded-xl border overflow-hidden", children: /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { children: "Category" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: leftMonth }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: rightMonth }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Delta" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Change" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Status" })
        ] }) }),
        /* @__PURE__ */ jsxs(TableBody, { children: [
          categoryComparison.map((row) => {
            const isUp = row.delta > 0;
            const isDown = row.delta < 0;
            row.delta === 0;
            const pct = row.left > 0 ? row.delta / row.left * 100 : row.right > 0 ? 100 : 0;
            return /* @__PURE__ */ jsxs(TableRow, { children: [
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: "inline-block w-3 h-3 rounded-full shrink-0",
                    style: { backgroundColor: row.color || "#94a3b8" }
                  }
                ),
                /* @__PURE__ */ jsx("span", { className: "font-medium", children: row.name })
              ] }) }),
              /* @__PURE__ */ jsx(TableCell, { className: "text-right text-muted-foreground", children: formatIdr(row.left) }),
              /* @__PURE__ */ jsx(TableCell, { className: "text-right font-medium", children: formatIdr(row.right) }),
              /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: /* @__PURE__ */ jsxs("span", { className: `text-sm font-medium ${isUp ? "text-red-600 dark:text-red-400" : isDown ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`, children: [
                isUp ? "+" : "",
                formatIdr(row.delta)
              ] }) }),
              /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: row.left > 0 ? /* @__PURE__ */ jsxs("span", { className: `text-sm font-medium ${isUp ? "text-red-600 dark:text-red-400" : isDown ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`, children: [
                isUp ? "+" : "",
                pct.toFixed(1),
                "%"
              ] }) : /* @__PURE__ */ jsx("span", { className: "text-sm text-muted-foreground", children: "—" }) }),
              /* @__PURE__ */ jsx(TableCell, { children: isUp ? /* @__PURE__ */ jsx(Badge, { variant: "destructive", className: "text-[10px]", children: "Up" }) : isDown ? /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", children: "Down" }) : /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "text-[10px]", children: "Same" }) })
            ] }, row.name);
          }),
          categoryComparison.length === 0 && /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 6, className: "text-center text-muted-foreground py-8", children: "No category data available for the selected months." }) })
        ] })
      ] }) }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold", children: [
          "Top Transactions — ",
          leftMonth
        ] }) }),
        /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          [...leftTxs].sort((a, b) => b.amount - a.amount).slice(0, 5).map((tx) => /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50", children: [
            /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm font-medium truncate", children: tx.title }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: tx.category })
            ] }),
            /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold shrink-0", children: formatIdr(tx.amount) })
          ] }, tx.id)),
          leftTxs.length === 0 && /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground text-center py-4", children: "No transactions" })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold", children: [
          "Top Transactions — ",
          rightMonth
        ] }) }),
        /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          [...rightTxs].sort((a, b) => b.amount - a.amount).slice(0, 5).map((tx) => /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50", children: [
            /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm font-medium truncate", children: tx.title }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: tx.category })
            ] }),
            /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold shrink-0", children: formatIdr(tx.amount) })
          ] }, tx.id)),
          rightTxs.length === 0 && /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground text-center py-4", children: "No transactions" })
        ] }) })
      ] })
    ] })
  ] });
}

const $$Compare = createComponent(($$result, $$props, $$slots) => {
  const transactions = getTransactions();
  const networth = getNetworth();
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
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Compare Months - Financial Dashboard" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-6"> <h1 class="text-2xl font-bold">Compare Months</h1> <p class="text-slate-500 dark:text-slate-400 text-sm">
Side-by-side comparison of income, spending, categories, and networth between two months.
</p> </div> ${renderComponent($$result2, "MonthComparison", MonthComparison, { "transactions": transactions, "networth": networth, "summaries": summaries, "categories": categories, "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/MonthComparison", "client:component-export": "default" })} ` })}`;
}, "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/compare.astro", void 0);

const $$file = "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/compare.astro";
const $$url = "/compare";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Compare,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
