/* empty css                               */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BN-0jZ66.mjs';
import 'kleur/colors';
import { f as formatIdr, $ as $$Layout } from '../chunks/utils_JbfoWkNO.mjs';
import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { useMemo, useState } from 'react';
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { C as Card, c as CardContent, a as CardHeader, b as CardTitle } from '../chunks/card_CCET0Yjm.mjs';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from '../chunks/select_DnqrgBja.mjs';
import { L as Label } from '../chunks/label_BCCOrEL_.mjs';
import { B as Badge } from '../chunks/badge_DvkSPMv8.mjs';
import { Wallet, TrendingDown, PiggyBank, Minus, ArrowDown, ArrowUp } from 'lucide-react';
import { g as getMonthlySummary, a as getCategories, d as db } from '../chunks/db_535bmtRB.mjs';
export { renderers } from '../renderers.mjs';

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
function CashFlowWaterfall({ summaries, categories }) {
  const months = useMemo(() => [...summaries].reverse().map((s) => s.month), [summaries]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return months[0] ?? "";
  });
  const categoryMap = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      map[c.name] = c;
    });
    return map;
  }, [categories]);
  const summary = useMemo(() => {
    return summaries.find((s) => s.month === selectedMonth);
  }, [summaries, selectedMonth]);
  const { items, totalIncome, totalSpent, totalSavings } = useMemo(() => {
    if (!summary || !summary.category_totals) {
      return { items: [], totalIncome: 0, totalSpent: 0, totalSavings: 0 };
    }
    const income = summary.income || 0;
    const cats = summary.category_totals;
    const sortedCats = Object.entries(cats).sort(([, a], [, b]) => b - a);
    const waterfallItems = [];
    waterfallItems.push({
      label: "💰 Income",
      amount: income,
      base: 0,
      isPositive: true,
      isTotal: true,
      isSubtotal: false,
      color: "#10b981",
      // emerald
      type: "income"
    });
    let running = income;
    sortedCats.forEach(([catName, amount]) => {
      const newRunning = running - amount;
      waterfallItems.push({
        label: catName,
        amount: -amount,
        base: newRunning,
        isPositive: false,
        isTotal: false,
        isSubtotal: false,
        color: categoryMap[catName]?.color || "#6366f1",
        type: "category"
      });
      running = newRunning;
    });
    const savings = running;
    waterfallItems.push({
      label: "🏦 Remaining",
      amount: savings,
      base: 0,
      isPositive: savings >= 0,
      isTotal: false,
      isSubtotal: true,
      color: savings >= 0 ? "#10b981" : "#ef4444",
      type: "savings"
    });
    return {
      items: waterfallItems,
      totalIncome: income,
      totalSpent: sortedCats.reduce((s, [, a]) => s + a, 0),
      totalSavings: savings
    };
  }, [summary, categoryMap]);
  const chartData = useMemo(() => {
    if (items.length === 0) return null;
    return {
      labels: items.map((i) => i.label),
      datasets: [
        {
          label: "Cash Flow",
          data: items.map((i) => {
            if (i.isTotal || i.isSubtotal) {
              return [0, i.amount];
            } else {
              const top = i.base + Math.abs(i.amount);
              return [i.base, top];
            }
          }),
          backgroundColor: items.map((i) => {
            if (i.type === "category") {
              return i.color + "CC";
            }
            return i.color;
          }),
          borderColor: items.map((i) => i.color),
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false
        }
        // Connector lines (thin invisible dataset to simulate connectors)
      ]
    };
  }, [items]);
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const item = items[ctx.dataIndex];
            if (!item) return "";
            const val = Math.abs(item.amount);
            if (item.type === "income") return `Income: ${formatIdr(val)}`;
            if (item.type === "savings") return `Remaining: ${formatIdr(val)} (${totalIncome > 0 ? (val / totalIncome * 100).toFixed(1) : 0}%)`;
            return `${item.label}: -${formatIdr(val)} (${totalIncome > 0 ? (val / totalIncome * 100).toFixed(1) : 0}% of income)`;
          },
          afterLabel: (ctx) => {
            const item = items[ctx.dataIndex];
            if (!item) return "";
            if (item.type === "income") return `Starting point`;
            if (item.type === "savings") {
              return item.amount >= 0 ? `✅ Positive savings` : `⚠️ Over budget by ${formatIdr(Math.abs(item.amount))}`;
            }
            const catLimit = categoryMap[item.label]?.monthly_limit ?? 0;
            if (catLimit > 0) {
              const pct = (Math.abs(item.amount) / catLimit * 100).toFixed(0);
              return `Budget: ${formatIdr(catLimit)} (${pct}% used)`;
            }
            return `No budget limit set`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => {
            if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
            if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
            return value;
          }
        }
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 30,
          font: { size: 11 }
        }
      }
    }
  };
  const savingsRate = totalIncome > 0 ? totalSavings / totalIncome * 100 : 0;
  const largestCategory = useMemo(() => {
    if (!summary?.category_totals) return null;
    let max = { name: "", amount: 0 };
    Object.entries(summary.category_totals).forEach(([cat, amount]) => {
      if (amount > max.amount) max = { name: cat, amount };
    });
    return max.name ? max : null;
  }, [summary]);
  const overBudgetCategories = useMemo(() => {
    if (!summary?.category_totals) return [];
    return Object.entries(summary.category_totals).filter(([cat, amount]) => {
      const limit = categoryMap[cat]?.monthly_limit ?? 0;
      return limit > 0 && amount > limit;
    }).map(([cat, amount]) => ({
      name: cat,
      amount,
      limit: categoryMap[cat].monthly_limit,
      over: amount - categoryMap[cat].monthly_limit
    }));
  }, [summary, categoryMap]);
  const categoryBreakdown = useMemo(() => {
    if (!summary?.category_totals) return [];
    return Object.entries(summary.category_totals).sort(([, a], [, b]) => b - a).map(([cat, amount]) => ({
      name: cat,
      amount,
      pct: totalSpent > 0 ? amount / totalSpent * 100 : 0,
      color: categoryMap[cat]?.color,
      limit: categoryMap[cat]?.monthly_limit ?? 0
    }));
  }, [summary, totalSpent, categoryMap]);
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ jsx(Label, { className: "text-sm font-medium text-slate-600 dark:text-slate-300", children: "Month:" }),
      /* @__PURE__ */ jsxs(Select, { value: selectedMonth, onValueChange: setSelectedMonth, children: [
        /* @__PURE__ */ jsx(SelectTrigger, { className: "w-[180px]", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
        /* @__PURE__ */ jsx(SelectContent, { children: months.map((m) => /* @__PURE__ */ jsx(SelectItem, { value: m, children: m }, m)) })
      ] })
    ] }),
    !summary ? /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "py-12 text-center text-muted-foreground", children: /* @__PURE__ */ jsx("p", { children: "No data available for the selected month." }) }) }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", children: [
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "pt-6", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: "p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30", children: /* @__PURE__ */ jsx(Wallet, { className: "w-5 h-5 text-emerald-600 dark:text-emerald-400" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Total Income" }),
            /* @__PURE__ */ jsx("p", { className: "text-lg font-semibold text-emerald-600 dark:text-emerald-400", children: formatIdr(totalIncome) })
          ] })
        ] }) }) }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "pt-6", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: "p-2 rounded-lg bg-red-100 dark:bg-red-900/30", children: /* @__PURE__ */ jsx(TrendingDown, { className: "w-5 h-5 text-red-600 dark:text-red-400" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Total Spent" }),
            /* @__PURE__ */ jsx("p", { className: "text-lg font-semibold text-red-600 dark:text-red-400", children: formatIdr(totalSpent) }),
            /* @__PURE__ */ jsx("p", { className: "text-[10px] text-muted-foreground", children: totalIncome > 0 ? `${(totalSpent / totalIncome * 100).toFixed(1)}% of income` : "" })
          ] })
        ] }) }) }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "pt-6", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: `p-2 rounded-lg ${totalSavings >= 0 ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"}`, children: /* @__PURE__ */ jsx(PiggyBank, { className: `w-5 h-5 ${totalSavings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}` }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Remaining" }),
            /* @__PURE__ */ jsx("p", { className: `text-lg font-semibold ${totalSavings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`, children: formatIdr(totalSavings) }),
            /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-muted-foreground", children: [
              "Savings rate: ",
              savingsRate.toFixed(1),
              "%"
            ] })
          ] })
        ] }) }) }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "pt-6", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: "p-2 rounded-lg bg-slate-100 dark:bg-slate-700", children: /* @__PURE__ */ jsx(Minus, { className: "w-5 h-5 text-slate-600 dark:text-slate-300" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Categories" }),
            /* @__PURE__ */ jsx("p", { className: "text-lg font-semibold", children: categoryBreakdown.length }),
            /* @__PURE__ */ jsx("p", { className: "text-[10px] text-muted-foreground", children: largestCategory ? `Largest: ${largestCategory.name}` : "—" })
          ] })
        ] }) }) })
      ] }),
      overBudgetCategories.length > 0 && /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-4", children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-red-800 dark:text-red-300 mb-2", children: "⚠️ Over Budget Categories" }),
        /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2", children: overBudgetCategories.map((cat) => /* @__PURE__ */ jsxs(Badge, { variant: "destructive", className: "text-xs", children: [
          cat.name,
          ": over by ",
          formatIdr(cat.over)
        ] }, cat.name)) })
      ] }),
      chartData && items.length > 1 && /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(ArrowDown, { className: "w-4 h-4 text-slate-500" }),
          "Cash Flow Waterfall — ",
          selectedMonth
        ] }) }),
        /* @__PURE__ */ jsxs(CardContent, { children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground mb-4", children: "Shows how your income flows through each spending category to your remaining savings. Green bars increase your balance; colored bars show category spending; the final bar shows what's left." }),
          /* @__PURE__ */ jsx("div", { className: "relative", style: { height: Math.max(300, items.length * 30 + 100) }, children: /* @__PURE__ */ jsx(Bar, { data: chartData, options: chartOptions }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(TrendingDown, { className: "w-4 h-4 text-slate-500" }),
          "Detailed Breakdown"
        ] }) }),
        /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20", children: [
            /* @__PURE__ */ jsx("span", { className: "text-lg", children: "💰" }),
            /* @__PURE__ */ jsx("span", { className: "flex-1 font-medium text-sm", children: "Total Income" }),
            /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold text-emerald-600 dark:text-emerald-400", children: formatIdr(totalIncome) }),
            /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground w-12 text-right", children: "100%" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 px-3", children: [
            /* @__PURE__ */ jsx("div", { className: "h-px flex-1 bg-slate-200 dark:bg-slate-700" }),
            /* @__PURE__ */ jsx(ArrowDown, { className: "w-3 h-3 text-slate-400" })
          ] }),
          categoryBreakdown.map((cat) => {
            const isOverBudget = cat.limit > 0 && cat.amount > cat.limit;
            return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition", children: [
              /* @__PURE__ */ jsx(
                "span",
                {
                  className: "w-3 h-3 rounded-full shrink-0",
                  style: { backgroundColor: cat.color || "#94a3b8" }
                }
              ),
              /* @__PURE__ */ jsx("span", { className: "flex-1 font-medium text-sm truncate", children: cat.name }),
              /* @__PURE__ */ jsxs("span", { className: `text-sm font-semibold ${isOverBudget ? "text-red-600 dark:text-red-400" : ""}`, children: [
                "-",
                formatIdr(cat.amount)
              ] }),
              /* @__PURE__ */ jsxs("span", { className: "text-xs text-muted-foreground w-12 text-right", children: [
                cat.pct.toFixed(1),
                "%"
              ] }),
              isOverBudget && /* @__PURE__ */ jsx(Badge, { variant: "destructive", className: "text-[10px] px-1.5 py-0", children: "Over" })
            ] }, cat.name);
          }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 px-3", children: [
            /* @__PURE__ */ jsx("div", { className: "h-px flex-1 bg-slate-200 dark:bg-slate-700" }),
            /* @__PURE__ */ jsx(ArrowUp, { className: "w-3 h-3 text-slate-400" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: `flex items-center gap-3 p-3 rounded-lg ${totalSavings >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-red-50 dark:bg-red-900/20"}`, children: [
            /* @__PURE__ */ jsx("span", { className: "text-lg", children: "🏦" }),
            /* @__PURE__ */ jsx("span", { className: "flex-1 font-medium text-sm", children: "Remaining (Savings)" }),
            /* @__PURE__ */ jsx("span", { className: `text-sm font-semibold ${totalSavings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`, children: formatIdr(totalSavings) }),
            /* @__PURE__ */ jsxs("span", { className: `text-xs w-12 text-right ${totalSavings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`, children: [
              savingsRate.toFixed(1),
              "%"
            ] })
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(PiggyBank, { className: "w-4 h-4 text-slate-500" }),
          "Savings Rate Indicator"
        ] }) }),
        /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-sm", children: [
            /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Savings Rate" }),
            /* @__PURE__ */ jsxs("span", { className: `font-semibold ${savingsRate < 0 ? "text-red-600 dark:text-red-400" : savingsRate < 20 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`, children: [
              savingsRate.toFixed(1),
              "%"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "relative w-full h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden", children: [
            /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-red-200 dark:bg-red-900/30", style: { width: "10%" } }),
            /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-amber-200 dark:bg-amber-900/30", style: { left: "10%", width: "10%" } }),
            /* @__PURE__ */ jsx(
              "div",
              {
                className: `absolute top-0 left-0 h-full rounded-full transition-all ${savingsRate < 0 ? "bg-red-500" : savingsRate < 20 ? "bg-amber-500" : "bg-emerald-500"}`,
                style: { width: `${Math.min(100, Math.max(0, savingsRate))}%` }
              }
            ),
            /* @__PURE__ */ jsx("div", { className: "absolute top-0 h-full w-0.5 bg-slate-400 dark:bg-slate-500", style: { left: "20%" }, title: "20% target" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-[10px] text-muted-foreground", children: [
            /* @__PURE__ */ jsx("span", { children: "0%" }),
            /* @__PURE__ */ jsx("span", { className: "text-red-500", children: "Risky" }),
            /* @__PURE__ */ jsx("span", { className: "text-amber-500", children: "Caution" }),
            /* @__PURE__ */ jsx("span", { className: "text-emerald-500", style: { position: "relative", left: "0%" }, children: "20% target" }),
            /* @__PURE__ */ jsx("span", { children: "100%" })
          ] }),
          savingsRate < 0 && /* @__PURE__ */ jsx("p", { className: "text-xs text-red-600 dark:text-red-400 mt-2", children: "⚠️ You're spending more than you earn! Review your largest categories above." }),
          savingsRate >= 0 && savingsRate < 20 && /* @__PURE__ */ jsx("p", { className: "text-xs text-amber-600 dark:text-amber-400 mt-2", children: "💡 Your savings rate is below the recommended 20%. Consider reducing spending in your top categories." }),
          savingsRate >= 20 && savingsRate < 50 && /* @__PURE__ */ jsx("p", { className: "text-xs text-emerald-600 dark:text-emerald-400 mt-2", children: "✅ Good savings rate! You're on track with healthy financial habits." }),
          savingsRate >= 50 && /* @__PURE__ */ jsx("p", { className: "text-xs text-emerald-600 dark:text-emerald-400 mt-2", children: "🎉 Excellent savings rate above 50%! You're building wealth rapidly." })
        ] }) })
      ] })
    ] })
  ] });
}

const $$Cashflow = createComponent(($$result, $$props, $$slots) => {
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
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Cash Flow - Financial Dashboard" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-6"> <h1 class="text-2xl font-bold">Cash Flow Waterfall</h1> <p class="text-slate-500 dark:text-slate-400 text-sm">
Visualize how your income flows through spending categories to savings
</p> </div> ${renderComponent($$result2, "CashFlowWaterfall", CashFlowWaterfall, { "summaries": summaries, "categories": categories, "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/CashFlowWaterfall", "client:component-export": "default" })} ` })}`;
}, "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/cashflow.astro", void 0);

const $$file = "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/cashflow.astro";
const $$url = "/cashflow";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Cashflow,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
