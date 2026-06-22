/* empty css                               */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BN-0jZ66.mjs';
import 'kleur/colors';
import { f as formatIdr, $ as $$Layout } from '../chunks/utils_JbfoWkNO.mjs';
import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { useMemo, useState } from 'react';
import { C as Card, c as CardContent, a as CardHeader, b as CardTitle } from '../chunks/card_CCET0Yjm.mjs';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from '../chunks/select_DnqrgBja.mjs';
import { T as Table, a as TableHeader, b as TableRow, c as TableHead, d as TableBody, e as TableCell } from '../chunks/table_DaH70Rt2.mjs';
import '../chunks/badge_DvkSPMv8.mjs';
import { Chart, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Wallet, Receipt, PiggyBank, TrendingUp, CalendarDays, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { g as getMonthlySummary, a as getCategories, d as db } from '../chunks/db_535bmtRB.mjs';
export { renderers } from '../renderers.mjs';

Chart.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);
function getYearFromMonth(monthStr) {
  const d = /* @__PURE__ */ new Date(monthStr + " 1");
  return isNaN(d.getTime()) ? 0 : d.getFullYear();
}
function DeltaBadge({ current, previous }) {
  if (previous === 0 && current === 0) {
    return /* @__PURE__ */ jsxs("span", { className: "text-xs text-muted-foreground flex items-center gap-1", children: [
      /* @__PURE__ */ jsx(Minus, { className: "w-3 h-3" }),
      " 0%"
    ] });
  }
  if (previous === 0) {
    return /* @__PURE__ */ jsxs("span", { className: "text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1", children: [
      /* @__PURE__ */ jsx(ArrowUpRight, { className: "w-3 h-3" }),
      " New"
    ] });
  }
  const change = current - previous;
  const pct = change / Math.abs(previous) * 100;
  const isPositive = change > 0;
  const colorClass = isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  return /* @__PURE__ */ jsxs("span", { className: `text-xs flex items-center gap-1 font-medium ${colorClass}`, children: [
    /* @__PURE__ */ jsx(Icon, { className: "w-3 h-3" }),
    Math.abs(pct).toFixed(1),
    "%"
  ] });
}
function YearlyReport({ summaries, categories }) {
  const years = useMemo(() => {
    const set = /* @__PURE__ */ new Set();
    summaries.forEach((s) => {
      const y = getYearFromMonth(s.month);
      if (y > 0) set.add(y);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [summaries]);
  const [selectedYear, setSelectedYear] = useState(years[0] ?? (/* @__PURE__ */ new Date()).getFullYear());
  const yearSummaries = useMemo(() => {
    return summaries.filter((s) => getYearFromMonth(s.month) === selectedYear).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [summaries, selectedYear]);
  const prevYearSummaries = useMemo(() => {
    return summaries.filter((s) => getYearFromMonth(s.month) === selectedYear - 1).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [summaries, selectedYear]);
  const totals = useMemo(() => {
    const income = yearSummaries.reduce((s, m) => s + m.income, 0);
    const spending = yearSummaries.reduce((s, m) => s + m.outcome.total, 0);
    const savings = yearSummaries.reduce((s, m) => s + m.savings, 0);
    const avgSavingsRate = yearSummaries.length > 0 ? yearSummaries.reduce((s, m) => s + m.savings_rate_pct, 0) / yearSummaries.length : 0;
    const cash = yearSummaries.reduce((s, m) => s + m.outcome.cash, 0);
    const credit = yearSummaries.reduce((s, m) => s + m.outcome.credit_payment, 0);
    return { income, spending, savings, avgSavingsRate, cash, credit };
  }, [yearSummaries]);
  const prevTotals = useMemo(() => {
    const income = prevYearSummaries.reduce((s, m) => s + m.income, 0);
    const spending = prevYearSummaries.reduce((s, m) => s + m.outcome.total, 0);
    const savings = prevYearSummaries.reduce((s, m) => s + m.savings, 0);
    const avgSavingsRate = prevYearSummaries.length > 0 ? prevYearSummaries.reduce((s, m) => s + m.savings_rate_pct, 0) / prevYearSummaries.length : 0;
    return { income, spending, savings, avgSavingsRate };
  }, [prevYearSummaries]);
  const categoryTotals = useMemo(() => {
    const map = {};
    yearSummaries.forEach((s) => {
      if (!s.category_totals) return;
      Object.entries(s.category_totals).forEach(([cat, amt]) => {
        map[cat] = (map[cat] || 0) + amt;
      });
    });
    return map;
  }, [yearSummaries]);
  const colorMap = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      map[c.name] = c.color;
    });
    return map;
  }, [categories]);
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
  const barChartData = {
    labels: yearSummaries.map((s) => s.month),
    datasets: [
      {
        label: "Income",
        data: yearSummaries.map((s) => s.income),
        backgroundColor: "#10b981",
        borderRadius: 4
      },
      {
        label: "Spending",
        data: yearSummaries.map((s) => s.outcome.total),
        backgroundColor: "#ef4444",
        borderRadius: 4
      },
      {
        label: "Savings",
        data: yearSummaries.map((s) => s.savings),
        backgroundColor: "#3b82f6",
        borderRadius: 4
      }
    ]
  };
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top", labels: { usePointStyle: true, padding: 16 } },
      tooltip: {
        callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatIdr(ctx.parsed.y)}` }
      }
    },
    scales: {
      y: { beginAtZero: true, ticks: { callback: (value) => value >= 1e6 ? `${(value / 1e6).toFixed(1)}M` : value >= 1e3 ? `${(value / 1e3).toFixed(0)}K` : value } },
      x: { ticks: { maxRotation: 45, minRotation: 0 } }
    }
  };
  const catEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const doughnutData = {
    labels: catEntries.map(([k]) => k),
    datasets: [
      {
        data: catEntries.map(([_, v]) => v),
        backgroundColor: catEntries.map(([k], i) => colorMap[k] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]),
        borderWidth: 0
      }
    ]
  };
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "right", labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatIdr(ctx.parsed)}` } }
    }
  };
  const allYearsStats = useMemo(() => {
    const stats = {};
    summaries.forEach((s) => {
      const y = getYearFromMonth(s.month);
      if (!stats[y]) stats[y] = { income: 0, spending: 0, savings: 0, months: 0 };
      stats[y].income += s.income;
      stats[y].spending += s.outcome.total;
      stats[y].savings += s.savings;
      stats[y].months += 1;
    });
    return Object.entries(stats).map(([year, data]) => ({
      year: Number(year),
      ...data,
      avgSavingsRate: data.income > 0 ? data.savings / data.income * 100 : 0
    })).sort((a, b) => b.year - a.year);
  }, [summaries]);
  const topSpendingMonths = useMemo(() => {
    return [...yearSummaries].sort((a, b) => b.outcome.total - a.outcome.total).slice(0, 3);
  }, [yearSummaries]);
  const topSavingsMonths = useMemo(() => {
    return [...yearSummaries].sort((a, b) => b.savings - a.savings).slice(0, 3);
  }, [yearSummaries]);
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-slate-600 dark:text-slate-300", children: "Year:" }),
      /* @__PURE__ */ jsxs(Select, { value: String(selectedYear), onValueChange: (v) => setSelectedYear(Number(v)), children: [
        /* @__PURE__ */ jsx(SelectTrigger, { className: "w-[140px]", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
        /* @__PURE__ */ jsx(SelectContent, { children: years.map((y) => /* @__PURE__ */ jsx(SelectItem, { value: String(y), children: y }, y)) })
      ] })
    ] }),
    yearSummaries.length === 0 ? /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "py-12 text-center text-muted-foreground", children: [
      "No data available for ",
      selectedYear,
      "."
    ] }) }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", children: [
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "pt-6", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: "p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30", children: /* @__PURE__ */ jsx(Wallet, { className: "w-5 h-5 text-emerald-600 dark:text-emerald-400" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Total Income" }),
            /* @__PURE__ */ jsx("p", { className: "text-lg font-semibold", children: formatIdr(totals.income) }),
            /* @__PURE__ */ jsx(DeltaBadge, { current: totals.income, previous: prevTotals.income })
          ] })
        ] }) }) }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "pt-6", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: "p-2 rounded-lg bg-red-100 dark:bg-red-900/30", children: /* @__PURE__ */ jsx(Receipt, { className: "w-5 h-5 text-red-600 dark:text-red-400" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Total Spending" }),
            /* @__PURE__ */ jsx("p", { className: "text-lg font-semibold", children: formatIdr(totals.spending) }),
            /* @__PURE__ */ jsxs("span", { className: "text-xs text-muted-foreground", children: [
              "vs ",
              formatIdr(prevTotals.spending),
              " last year"
            ] })
          ] })
        ] }) }) }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "pt-6", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: `p-2 rounded-lg ${totals.savings >= 0 ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"}`, children: /* @__PURE__ */ jsx(PiggyBank, { className: `w-5 h-5 ${totals.savings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}` }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Total Savings" }),
            /* @__PURE__ */ jsx("p", { className: `text-lg font-semibold ${totals.savings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`, children: formatIdr(totals.savings) }),
            /* @__PURE__ */ jsx(DeltaBadge, { current: totals.savings, previous: prevTotals.savings })
          ] })
        ] }) }) }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "pt-6", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: "p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30", children: /* @__PURE__ */ jsx(TrendingUp, { className: "w-5 h-5 text-blue-600 dark:text-blue-400" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Avg Savings Rate" }),
            /* @__PURE__ */ jsxs("p", { className: "text-lg font-semibold", children: [
              totals.avgSavingsRate.toFixed(1),
              "%"
            ] }),
            /* @__PURE__ */ jsxs("span", { className: "text-xs text-muted-foreground", children: [
              prevTotals.avgSavingsRate.toFixed(1),
              "% last year"
            ] })
          ] })
        ] }) }) })
      ] }),
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(CalendarDays, { className: "w-4 h-4 text-slate-500" }),
          "Monthly Breakdown — ",
          selectedYear
        ] }) }),
        /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", { className: "relative h-80", children: /* @__PURE__ */ jsx(Bar, { data: barChartData, options: barOptions }) }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [
        /* @__PURE__ */ jsxs(Card, { children: [
          /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base font-semibold", children: "Top Spending Categories" }) }),
          /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", { className: "relative h-72", children: /* @__PURE__ */ jsx(Doughnut, { data: doughnutData, options: doughnutOptions }) }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
          /* @__PURE__ */ jsxs(Card, { children: [
            /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base font-semibold", children: "Top Spending Months" }) }),
            /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
              topSpendingMonths.map((m, i) => /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxs("span", { className: "text-xs font-semibold text-slate-400 w-4", children: [
                    "#",
                    i + 1
                  ] }),
                  /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: m.month })
                ] }),
                /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold", children: formatIdr(m.outcome.total) })
              ] }, m.month)),
              topSpendingMonths.length === 0 && /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground text-center py-4", children: "No data" })
            ] }) })
          ] }),
          /* @__PURE__ */ jsxs(Card, { children: [
            /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base font-semibold", children: "Top Savings Months" }) }),
            /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
              topSavingsMonths.map((m, i) => /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxs("span", { className: "text-xs font-semibold text-slate-400 w-4", children: [
                    "#",
                    i + 1
                  ] }),
                  /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: m.month })
                ] }),
                /* @__PURE__ */ jsx("span", { className: `text-sm font-semibold ${m.savings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`, children: formatIdr(m.savings) })
              ] }, m.month)),
              topSavingsMonths.length === 0 && /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground text-center py-4", children: "No data" })
            ] }) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base font-semibold", children: "Spending Composition" }) }),
        /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "p-4 rounded-lg border bg-slate-50 dark:bg-slate-800/50", children: [
            /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground mb-1", children: "Cash Expenses" }),
            /* @__PURE__ */ jsx("p", { className: "text-xl font-semibold", children: formatIdr(totals.cash) }),
            /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground mt-1", children: [
              totals.spending > 0 ? (totals.cash / totals.spending * 100).toFixed(1) : 0,
              "% of total"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "p-4 rounded-lg border bg-slate-50 dark:bg-slate-800/50", children: [
            /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground mb-1", children: "Credit Payments" }),
            /* @__PURE__ */ jsx("p", { className: "text-xl font-semibold", children: formatIdr(totals.credit) }),
            /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground mt-1", children: [
              totals.spending > 0 ? (totals.credit / totals.spending * 100).toFixed(1) : 0,
              "% of total"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "p-4 rounded-lg border bg-slate-50 dark:bg-slate-800/50", children: [
            /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground mb-1", children: "Monthly Average" }),
            /* @__PURE__ */ jsx("p", { className: "text-xl font-semibold", children: formatIdr(totals.spending / yearSummaries.length) }),
            /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground mt-1", children: [
              "across ",
              yearSummaries.length,
              " month",
              yearSummaries.length !== 1 ? "s" : ""
            ] })
          ] })
        ] }) })
      ] }),
      allYearsStats.length > 1 && /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base font-semibold", children: "Year-over-Year Comparison" }) }),
        /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", { className: "rounded-xl border overflow-hidden", children: /* @__PURE__ */ jsxs(Table, { children: [
          /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableHead, { children: "Year" }),
            /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Months" }),
            /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Income" }),
            /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Spending" }),
            /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Savings" }),
            /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Savings Rate" }),
            /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "YoY Savings" })
          ] }) }),
          /* @__PURE__ */ jsx(TableBody, { children: allYearsStats.map((row, idx) => {
            const prev = allYearsStats[idx + 1];
            const savingsChange = prev ? row.savings - prev.savings : 0;
            const savingsPct = prev && prev.savings !== 0 ? savingsChange / Math.abs(prev.savings) * 100 : null;
            const isUp = savingsChange > 0;
            return /* @__PURE__ */ jsxs(TableRow, { className: row.year === selectedYear ? "bg-slate-50 dark:bg-slate-800/50" : void 0, children: [
              /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: row.year }),
              /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: row.months }),
              /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: formatIdr(row.income) }),
              /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: formatIdr(row.spending) }),
              /* @__PURE__ */ jsx(TableCell, { className: `text-right font-medium ${row.savings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`, children: formatIdr(row.savings) }),
              /* @__PURE__ */ jsxs(TableCell, { className: "text-right", children: [
                row.avgSavingsRate.toFixed(1),
                "%"
              ] }),
              /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: prev ? /* @__PURE__ */ jsxs("span", { className: `text-xs font-medium ${isUp ? "text-emerald-600 dark:text-emerald-400" : savingsChange < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`, children: [
                isUp ? "+" : "",
                formatIdr(savingsChange),
                savingsPct !== null && /* @__PURE__ */ jsxs("span", { className: "ml-1", children: [
                  "(",
                  isUp ? "+" : "",
                  savingsPct.toFixed(1),
                  "%)"
                ] })
              ] }) : /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: "—" }) })
            ] }, row.year);
          }) })
        ] }) }) })
      ] })
    ] })
  ] });
}

const $$Yearly = createComponent(($$result, $$props, $$slots) => {
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
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Yearly Report - Financial Dashboard" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-6"> <h1 class="text-2xl font-bold">Yearly Report</h1> <p class="text-slate-500 dark:text-slate-400 text-sm">
Annual aggregates, year-over-year trends, and spending breakdowns by year.
</p> </div> ${renderComponent($$result2, "YearlyReport", YearlyReport, { "summaries": summaries, "categories": categories, "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/YearlyReport", "client:component-export": "default" })} ` })}`;
}, "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/yearly.astro", void 0);

const $$file = "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/yearly.astro";
const $$url = "/yearly";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Yearly,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
