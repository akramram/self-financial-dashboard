/* empty css                               */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BVE5k6Zu.mjs';
import 'kleur/colors';
import { $ as $$Layout } from '../chunks/Layout_DTBKtYAs.mjs';
import { jsx, jsxs } from 'react/jsx-runtime';
import { useMemo, useState } from 'react';
import { f as formatIdr } from '../chunks/utils_DHI1a69c.mjs';
import { d as deleteTransactionApi, b as updateTransactionApi } from '../chunks/api_BJrEQ3uz.mjs';
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { N as NetworthChart } from '../chunks/NetworthChart_C1B5wj2W.mjs';
import { g as getTransactions, a as getNetworth, b as getMonthlySummary, d as db } from '../chunks/db_CdWsZrN7.mjs';
export { renderers } from '../renderers.mjs';

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
function CashOutcomeChart({ data }) {
  const labels = data.map((d) => d.month);
  const cashOutcomes = data.map((d) => d.outcome.cash);
  const chartData = {
    labels,
    datasets: [
      {
        label: "Cash Outcome",
        data: cashOutcomes,
        backgroundColor: "#3b82f6",
        borderRadius: 4
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
          label: (ctx) => `Cash Outcome: ${formatIdr(ctx.parsed.y)}`
        }
      }
    },
    scales: {
      y: { beginAtZero: true }
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "relative h-72", children: /* @__PURE__ */ jsx(Bar, { data: chartData, options }) });
}

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
function CreditPaymentChart({ data }) {
  const labels = data.map((d) => d.month);
  const creditPayments = data.map((d) => d.outcome.credit_payment);
  const chartData = {
    labels,
    datasets: [
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
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `Credit Payment: ${formatIdr(ctx.parsed.y)}`
        }
      }
    },
    scales: {
      y: { beginAtZero: true }
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "relative h-72", children: /* @__PURE__ */ jsx(Bar, { data: chartData, options }) });
}

Chart.register(ArcElement, Tooltip, Legend);
function CategoryChart({ data }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const labels = entries.map(([k]) => k);
  const values = entries.map(([_, v]) => v);
  const colors = [
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
    plugins: {
      legend: {
        position: "right",
        labels: { boxWidth: 12, font: { size: 11 } }
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
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-slate-600 dark:text-slate-300", children: "Period:" }),
      /* @__PURE__ */ jsxs(
        "select",
        {
          value: filterMonth,
          onChange: (e) => setFilterMonth(e.target.value),
          className: "px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm",
          children: [
            /* @__PURE__ */ jsx("option", { value: "all", children: "All-time" }),
            months.map((m) => /* @__PURE__ */ jsx("option", { value: m, children: m }, m))
          ]
        }
      )
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
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold mb-4", children: "Cash Outcome by Month" }),
        /* @__PURE__ */ jsx(CashOutcomeChart, { data: filteredSummaries })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold mb-4", children: "Credit Payment by Month" }),
        /* @__PURE__ */ jsx(CreditPaymentChart, { data: filteredSummaries })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold mb-4", children: "Networth Trend" }),
        /* @__PURE__ */ jsx(NetworthChart, { data: filteredNetworth })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold mb-4", children: isAllTime ? "Latest Month Categories" : `${latest.month} Categories` }),
        latest?.category_totals && Object.keys(latest.category_totals).length > 0 ? /* @__PURE__ */ jsx(CategoryChart, { data: latest.category_totals }) : /* @__PURE__ */ jsx("p", { className: "text-slate-500 text-sm", children: "No category data available." })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6", children: [
      /* @__PURE__ */ jsxs("h2", { className: "text-lg font-semibold mb-4", children: [
        "Outcome Breakdown (",
        latest?.month,
        ")"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-4 max-w-xl", children: [
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
        /* @__PURE__ */ jsxs("div", { className: "pt-4 border-t border-slate-200 dark:border-slate-700", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-sm", children: [
            /* @__PURE__ */ jsx("span", { className: "text-slate-500 dark:text-slate-400", children: "Current Month Credit Expenses" }),
            /* @__PURE__ */ jsx("span", { className: "font-semibold", children: formatIdr(latest?.outcome.credit_expenses ?? 0) })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-400 mt-1", children: "These will be paid next month" })
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
      /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-sm text-left", children: [
        /* @__PURE__ */ jsx("thead", { className: "bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 uppercase text-xs", children: /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Title" }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Category" }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Date" }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium text-right", children: "Amount" }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Type" }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium" })
        ] }) }),
        /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-slate-200 dark:divide-slate-700", children: filteredTransactions.sort((a, b) => parseCreatedTime(b).getTime() - parseCreatedTime(a).getTime()).slice(0, 10).map((row) => {
          const isEditing = editingId === row.id;
          const typeClass = row.type === "cash" ? "text-blue-600 dark:text-blue-400" : row.type === "credit_payment" ? "text-amber-600 dark:text-amber-400" : "text-purple-600 dark:text-purple-400";
          const typeLabel = row.type === "cash" ? "Cash" : row.type === "credit_payment" ? "Credit Pay" : "Credit";
          const createdDate = parseCreatedTime(row);
          const dateStr = isNaN(createdDate.getTime()) ? row.date : createdDate.toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });
          if (isEditing) {
            return /* @__PURE__ */ jsxs("tr", { className: "bg-slate-50 dark:bg-slate-700/30", children: [
              /* @__PURE__ */ jsx("td", { className: "px-4 py-2", children: /* @__PURE__ */ jsx(
                "input",
                {
                  type: "text",
                  value: editForm.title ?? "",
                  onChange: (e) => handleChange("title", e.target.value),
                  className: "w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                }
              ) }),
              /* @__PURE__ */ jsx("td", { className: "px-4 py-2", children: /* @__PURE__ */ jsx(
                "input",
                {
                  type: "text",
                  value: editForm.category ?? "",
                  onChange: (e) => handleChange("category", e.target.value),
                  className: "w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                }
              ) }),
              /* @__PURE__ */ jsx("td", { className: "px-4 py-2", children: /* @__PURE__ */ jsx(
                "input",
                {
                  type: "text",
                  value: editForm.created_time ?? "",
                  onChange: (e) => handleChange("created_time", e.target.value),
                  className: "w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                }
              ) }),
              /* @__PURE__ */ jsx("td", { className: "px-4 py-2", children: /* @__PURE__ */ jsx(
                "input",
                {
                  type: "number",
                  value: editForm.amount ?? 0,
                  onChange: (e) => handleChange("amount", Number(e.target.value)),
                  className: "w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-right"
                }
              ) }),
              /* @__PURE__ */ jsx("td", { className: "px-4 py-2", children: /* @__PURE__ */ jsx(
                "select",
                {
                  value: editForm.type ?? "cash",
                  onChange: (e) => handleChange("type", e.target.value),
                  className: "w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs",
                  children: TYPE_OPTIONS.map((opt) => /* @__PURE__ */ jsx("option", { value: opt.value, children: opt.label }, opt.value))
                }
              ) }),
              /* @__PURE__ */ jsx("td", { className: "px-4 py-2", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-1", children: [
                /* @__PURE__ */ jsx("button", { onClick: saveEdit, className: "px-2 py-1 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-700", children: "Save" }),
                /* @__PURE__ */ jsx("button", { onClick: cancelEdit, className: "px-2 py-1 rounded bg-slate-300 dark:bg-slate-600 text-xs hover:bg-slate-400 dark:hover:bg-slate-500", children: "Cancel" })
              ] }) })
            ] }, row.id);
          }
          return /* @__PURE__ */ jsxs("tr", { className: "hover:bg-slate-50 dark:hover:bg-slate-700/30", children: [
            /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: row.title }),
            /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsx("span", { className: "px-2 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-700", children: row.category }) }),
            /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-slate-500 dark:text-slate-400 text-xs", children: dateStr }),
            /* @__PURE__ */ jsx("td", { className: "px-4 py-3 font-medium text-right", children: formatIdr(row.amount) }),
            /* @__PURE__ */ jsx("td", { className: `px-4 py-3 ${typeClass} text-xs font-semibold uppercase`, children: typeLabel }),
            /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsx("button", { onClick: () => startEdit(row), className: "text-blue-500 hover:text-blue-700 text-xs", children: "Edit" }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: async () => {
                    if (confirm("Delete this transaction?")) {
                      await deleteTransactionApi(row.id);
                      window.location.reload();
                    }
                  },
                  className: "text-red-500 hover:text-red-700 text-xs",
                  children: "Delete"
                }
              )
            ] }) })
          ] }, row.id);
        }) })
      ] }) })
    ] })
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
</a> </div> ${renderComponent($$result2, "Dashboard", Dashboard, { "transactions": transactions, "networth": networth, "summaries": summaries, "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/Documents/Projects/dashboard/astro-app/src/components/Dashboard", "client:component-export": "default" })} ` })}`;
}, "/Users/user/Documents/Projects/dashboard/astro-app/src/pages/index.astro", void 0);

const $$file = "/Users/user/Documents/Projects/dashboard/astro-app/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
