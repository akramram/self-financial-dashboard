/* empty css                                        */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BN-0jZ66.mjs';
import 'kleur/colors';
import { f as formatIdr, $ as $$Layout } from '../chunks/utils_Dm1NQFdF.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { useMemo, useState } from 'react';
import { b as fetchTransactions } from '../chunks/api_B85Pj26R.mjs';
import { C as Card, a as CardContent, b as CardHeader, c as CardTitle } from '../chunks/card_Davj9yGI.mjs';
import { B as Button } from '../chunks/button_Br1WsJzs.mjs';
import { B as Badge } from '../chunks/badge_B_lPct8T.mjs';
import { T as Table, a as TableHeader, b as TableRow, c as TableHead, d as TableBody, e as TableCell } from '../chunks/table_B4ZDQe-_.mjs';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from '../chunks/select_CUJ65ghu.mjs';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription } from '../chunks/dialog_BsSkt0Aj.mjs';
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Wallet, TrendingDown, PiggyBank, AlertTriangle, Receipt, ArrowUpDown } from 'lucide-react';
import { a as getMonthlySummary, b as getCategories, d as db } from '../chunks/db_BgiJApmW.mjs';
export { renderers } from '../renderers.mjs';

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
function BudgetReport({ summaries, categories }) {
  const months = useMemo(() => [...summaries].reverse().map((s) => s.month), [summaries]);
  const [filterMonth, setFilterMonth] = useState("all");
  const [sortKey, setSortKey] = useState("pct");
  const [sortDir, setSortDir] = useState("desc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categoryTransactions, setCategoryTransactions] = useState([]);
  const [dialogLoading, setDialogLoading] = useState(false);
  const isAllTime = filterMonth === "all";
  const categoryMap = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      map[c.name] = c;
    });
    return map;
  }, [categories]);
  const categoryStats = useMemo(() => {
    const stats = {};
    const activeSummaries = isAllTime ? summaries : summaries.filter((s) => s.month === filterMonth);
    activeSummaries.forEach((summary) => {
      if (!summary.category_totals) return;
      Object.entries(summary.category_totals).forEach(([cat, amount]) => {
        if (!stats[cat]) {
          stats[cat] = { spent: 0, limit: categoryMap[cat]?.monthly_limit ?? 0, months: 0 };
        }
        stats[cat].spent += amount;
        stats[cat].months += 1;
      });
    });
    categories.forEach((cat) => {
      if (!stats[cat.name] && cat.monthly_limit > 0) {
        stats[cat.name] = { spent: 0, limit: cat.monthly_limit, months: 0 };
      }
    });
    const totalPeriods = activeSummaries.length;
    return Object.entries(stats).map(([name, data]) => {
      const periodCount = isAllTime ? data.months > 0 ? data.months : totalPeriods : 1;
      const effectiveLimit = data.limit * periodCount;
      return {
        name,
        spent: data.spent,
        limit: effectiveLimit,
        remaining: effectiveLimit - data.spent,
        pct: effectiveLimit > 0 ? data.spent / effectiveLimit * 100 : data.spent > 0 ? 101 : 0,
        color: categoryMap[name]?.color,
        months: data.months
      };
    });
  }, [summaries, filterMonth, isAllTime, categories, categoryMap]);
  const sortedStats = useMemo(() => {
    const sorted = [...categoryStats];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "limit") cmp = a.limit - b.limit;
      else if (sortKey === "spent") cmp = a.spent - b.spent;
      else if (sortKey === "remaining") cmp = a.remaining - b.remaining;
      else if (sortKey === "pct") cmp = a.pct - b.pct;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [categoryStats, sortKey, sortDir]);
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };
  const totalBudget = categoryStats.reduce((s, c) => s + c.limit, 0);
  const totalSpent = categoryStats.reduce((s, c) => s + c.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overspentCount = categoryStats.filter((c) => c.limit > 0 && c.spent > c.limit).length;
  const nearLimitCount = categoryStats.filter((c) => c.limit > 0 && c.spent <= c.limit && c.pct >= 80).length;
  const chartCategories = useMemo(() => {
    return [...sortedStats].filter((c) => c.limit > 0 || c.spent > 0).sort((a, b) => b.spent - a.spent).slice(0, 12);
  }, [sortedStats]);
  const chartData = {
    labels: chartCategories.map((c) => c.name),
    datasets: [
      {
        label: "Budget",
        data: chartCategories.map((c) => c.limit),
        backgroundColor: "rgba(148, 163, 184, 0.5)",
        borderColor: "rgba(148, 163, 184, 0.8)",
        borderWidth: 1,
        borderRadius: 4
      },
      {
        label: "Spent",
        data: chartCategories.map((c) => c.spent),
        backgroundColor: chartCategories.map(
          (c) => c.spent > c.limit && c.limit > 0 ? "rgba(239, 68, 68, 0.7)" : "rgba(59, 130, 246, 0.7)"
        ),
        borderColor: chartCategories.map(
          (c) => c.spent > c.limit && c.limit > 0 ? "rgba(239, 68, 68, 1)" : "rgba(59, 130, 246, 1)"
        ),
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
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
            if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
            if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
            return value;
          }
        }
      },
      x: {
        ticks: { maxRotation: 45, minRotation: 0, font: { size: 11 } }
      }
    }
  };
  const SortHeader = ({ label, sortKeyValue }) => /* @__PURE__ */ jsxs(
    "button",
    {
      className: "flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 transition",
      onClick: () => handleSort(sortKeyValue),
      children: [
        label,
        /* @__PURE__ */ jsx(ArrowUpDown, { className: "w-3 h-3 opacity-50" })
      ]
    }
  );
  const openCategoryDialog = async (catName) => {
    setSelectedCategory(catName);
    setDialogOpen(true);
    setDialogLoading(true);
    setCategoryTransactions([]);
    try {
      const rows = await fetchTransactions({
        month: isAllTime ? void 0 : filterMonth,
        category: catName
      });
      setCategoryTransactions(rows);
    } catch (e) {
      setCategoryTransactions([]);
    } finally {
      setDialogLoading(false);
    }
  };
  const dialogTotal = categoryTransactions.reduce((s, t) => s + t.amount, 0);
  const overBudgetPeriods = useMemo(() => {
    if (!selectedCategory) return /* @__PURE__ */ new Set();
    const cat = categoryMap[selectedCategory];
    if (!cat || cat.monthly_limit <= 0) return /* @__PURE__ */ new Set();
    const periods = /* @__PURE__ */ new Set();
    summaries.forEach((s) => {
      const spent = s.category_totals?.[selectedCategory] ?? 0;
      if (spent > cat.monthly_limit) {
        periods.add(s.period_id);
      }
    });
    return periods;
  }, [summaries, selectedCategory, categoryMap]);
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-slate-600 dark:text-slate-300", children: "Period:" }),
      /* @__PURE__ */ jsxs(Select, { value: filterMonth, onValueChange: setFilterMonth, children: [
        /* @__PURE__ */ jsx(SelectTrigger, { className: "w-[180px]", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
        /* @__PURE__ */ jsxs(SelectContent, { children: [
          /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "All Months" }),
          months.map((m) => /* @__PURE__ */ jsx(SelectItem, { value: m, children: m }, m))
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", children: [
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "pt-6", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "p-2 rounded-lg bg-slate-100 dark:bg-slate-700", children: /* @__PURE__ */ jsx(Wallet, { className: "w-5 h-5 text-slate-600 dark:text-slate-300" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Total Budget" }),
          /* @__PURE__ */ jsx("p", { className: "text-lg font-semibold", children: formatIdr(totalBudget) })
        ] })
      ] }) }) }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "pt-6", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "p-2 rounded-lg bg-red-100 dark:bg-red-900/30", children: /* @__PURE__ */ jsx(TrendingDown, { className: "w-5 h-5 text-red-600 dark:text-red-400" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Total Spent" }),
          /* @__PURE__ */ jsx("p", { className: "text-lg font-semibold", children: formatIdr(totalSpent) })
        ] })
      ] }) }) }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "pt-6", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: `p-2 rounded-lg ${totalRemaining >= 0 ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"}`, children: /* @__PURE__ */ jsx(PiggyBank, { className: `w-5 h-5 ${totalRemaining >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}` }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Remaining" }),
          /* @__PURE__ */ jsx("p", { className: `text-lg font-semibold ${totalRemaining >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`, children: formatIdr(totalRemaining) })
        ] })
      ] }) }) }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "pt-6", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30", children: /* @__PURE__ */ jsx(AlertTriangle, { className: "w-5 h-5 text-amber-600 dark:text-amber-400" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Alerts" }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-2 mt-0.5", children: [
            overspentCount > 0 && /* @__PURE__ */ jsxs(Badge, { variant: "destructive", className: "text-[10px] px-1.5 py-0", children: [
              overspentCount,
              " Over"
            ] }),
            nearLimitCount > 0 && /* @__PURE__ */ jsxs(Badge, { variant: "secondary", className: "text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", children: [
              nearLimitCount,
              " Near"
            ] }),
            overspentCount === 0 && nearLimitCount === 0 && /* @__PURE__ */ jsx("span", { className: "text-sm text-emerald-600 dark:text-emerald-400 font-medium", children: "All Good" })
          ] })
        ] })
      ] }) }) })
    ] }),
    chartCategories.length > 0 && /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base font-semibold", children: "Budget vs Actual" }) }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", { className: "relative h-80", children: /* @__PURE__ */ jsx(Bar, { data: chartData, options: chartOptions }) }) })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base font-semibold", children: "Category Breakdown" }) }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", { className: "rounded-xl border overflow-hidden", children: /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { children: /* @__PURE__ */ jsx(SortHeader, { label: "Category", sortKeyValue: "name" }) }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: /* @__PURE__ */ jsx(SortHeader, { label: "Budget", sortKeyValue: "limit" }) }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: /* @__PURE__ */ jsx(SortHeader, { label: "Spent", sortKeyValue: "spent" }) }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: /* @__PURE__ */ jsx(SortHeader, { label: "Remaining", sortKeyValue: "remaining" }) }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: /* @__PURE__ */ jsx(SortHeader, { label: "Used", sortKeyValue: "pct" }) }),
          /* @__PURE__ */ jsx(TableHead, { children: "Status" })
        ] }) }),
        /* @__PURE__ */ jsxs(TableBody, { children: [
          sortedStats.map((row) => {
            const isOver = row.limit > 0 && row.spent > row.limit;
            const isNear = row.limit > 0 && row.spent <= row.limit && row.pct >= 80;
            const hasLimit = row.limit > 0;
            return /* @__PURE__ */ jsxs(
              TableRow,
              {
                className: "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition",
                onClick: () => openCategoryDialog(row.name),
                children: [
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
                  /* @__PURE__ */ jsx(TableCell, { className: "text-right text-muted-foreground", children: hasLimit ? formatIdr(row.limit) : "—" }),
                  /* @__PURE__ */ jsx(TableCell, { className: "text-right font-medium", children: formatIdr(row.spent) }),
                  /* @__PURE__ */ jsx(TableCell, { className: `text-right font-medium ${row.remaining < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`, children: hasLimit ? formatIdr(row.remaining) : "—" }),
                  /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: hasLimit ? /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-end gap-2", children: [
                    /* @__PURE__ */ jsxs("span", { className: `text-xs font-semibold ${isOver ? "text-red-600 dark:text-red-400" : isNear ? "text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-300"}`, children: [
                      row.pct.toFixed(0),
                      "%"
                    ] }),
                    /* @__PURE__ */ jsx("div", { className: "w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5", children: /* @__PURE__ */ jsx(
                      "div",
                      {
                        className: `h-1.5 rounded-full transition-all ${isOver ? "bg-red-500" : isNear ? "bg-amber-500" : "bg-emerald-500"}`,
                        style: { width: `${Math.min(100, row.pct)}%` }
                      }
                    ) })
                  ] }) : /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: "No limit" }) }),
                  /* @__PURE__ */ jsx(TableCell, { children: isOver ? /* @__PURE__ */ jsx(Badge, { variant: "destructive", className: "text-[10px]", children: "Over" }) : isNear ? /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", children: "Near Limit" }) : /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", children: "On Track" }) })
                ]
              },
              row.name
            );
          }),
          sortedStats.length === 0 && /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 6, className: "text-center text-muted-foreground py-8", children: "No budget data available for this period." }) })
        ] })
      ] }) }) })
    ] }),
    /* @__PURE__ */ jsx(Dialog, { open: dialogOpen, onOpenChange: setDialogOpen, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-3xl max-h-[85vh] overflow-y-auto", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxs(DialogTitle, { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Receipt, { className: "w-5 h-5 text-slate-500" }),
          selectedCategory,
          " — Transactions"
        ] }),
        /* @__PURE__ */ jsxs(DialogDescription, { children: [
          isAllTime ? "All months" : filterMonth,
          " · ",
          categoryTransactions.length,
          " transaction",
          categoryTransactions.length !== 1 ? "s" : "",
          " · Total ",
          formatIdr(dialogTotal)
        ] })
      ] }),
      dialogLoading ? /* @__PURE__ */ jsx("div", { className: "py-8 text-center text-sm text-muted-foreground", children: "Loading transactions..." }) : categoryTransactions.length === 0 ? /* @__PURE__ */ jsx("div", { className: "py-8 text-center text-sm text-muted-foreground", children: "No transactions found for this category." }) : /* @__PURE__ */ jsx("div", { className: "rounded-xl border overflow-hidden", children: /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { children: "Title" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Date" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Amount" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Type" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Status" })
        ] }) }),
        /* @__PURE__ */ jsx(TableBody, { children: categoryTransactions.map((tx) => {
          const isOverBudget = overBudgetPeriods.has(tx.period_id);
          const typeClass = tx.type === "cash" ? "text-blue-600 dark:text-blue-400" : tx.type === "credit_payment" ? "text-amber-600 dark:text-amber-400" : "text-purple-600 dark:text-purple-400";
          const typeLabel = tx.type === "cash" ? "Cash" : tx.type === "credit_payment" ? "Credit Pay" : "Credit";
          const dateObj = tx.created_time ? new Date(tx.created_time) : new Date(tx.date);
          const dateStr = isNaN(dateObj.getTime()) ? tx.date : dateObj.toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });
          return /* @__PURE__ */ jsxs(
            TableRow,
            {
              className: isOverBudget ? "border-l-2 border-l-red-500 bg-red-50/60 dark:bg-red-950/30" : "",
              children: [
                /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: tx.title }),
                /* @__PURE__ */ jsx(TableCell, { className: "text-muted-foreground text-xs", children: dateStr }),
                /* @__PURE__ */ jsx(TableCell, { className: "text-right font-medium", children: formatIdr(tx.amount) }),
                /* @__PURE__ */ jsx(TableCell, { className: `${typeClass} text-xs font-semibold uppercase`, children: typeLabel }),
                /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                  isOverBudget && /* @__PURE__ */ jsx(Badge, { variant: "destructive", className: "text-[10px] whitespace-nowrap", children: "Over Budget" }),
                  /* @__PURE__ */ jsx(
                    Badge,
                    {
                      variant: "secondary",
                      className: `text-[10px] ${tx.done ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`,
                      children: tx.done ? "Paid" : "Unpaid"
                    }
                  )
                ] }) })
              ]
            },
            tx.id
          );
        }) })
      ] }) }),
      /* @__PURE__ */ jsx("div", { className: "flex justify-end pt-2", children: /* @__PURE__ */ jsx(Button, { size: "sm", variant: "secondary", onClick: () => setDialogOpen(false), children: "Close" }) })
    ] }) })
  ] });
}

const $$Budget = createComponent(($$result, $$props, $$slots) => {
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
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Budget Report - Financial Dashboard" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-6"> <h1 class="text-2xl font-bold">Budget Report</h1> <p class="text-slate-500 dark:text-slate-400 text-sm">Track category budgets and spending against limits</p> </div> ${renderComponent($$result2, "BudgetReport", BudgetReport, { "summaries": summaries, "categories": categories, "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/BudgetReport", "client:component-export": "default" })} ` })}`;
}, "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/budget.astro", void 0);

const $$file = "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/budget.astro";
const $$url = "/budget";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Budget,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
