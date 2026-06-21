/* empty css                               */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BN-0jZ66.mjs';
import 'kleur/colors';
import { f as formatIdr, $ as $$Layout } from '../chunks/utils_JbfoWkNO.mjs';
import { N as NetworthChart } from '../chunks/NetworthChart_Co1o7VWu.mjs';
import { N as NetworthComposition } from '../chunks/NetworthComposition_CRX6ILnm.mjs';
import { jsx, jsxs } from 'react/jsx-runtime';
import { useCallback, useMemo, useState } from 'react';
import { u as useSortState, S as SortableHeader } from '../chunks/SortableHeader_DQsL8xig.mjs';
import { T as Table, a as TableHeader, b as TableRow, c as TableHead, d as TableBody, e as TableCell } from '../chunks/table_DaH70Rt2.mjs';
import { B as Button } from '../chunks/button_C0m7HTLc.mjs';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { C as Card, c as CardContent, a as CardHeader, b as CardTitle } from '../chunks/card_CCET0Yjm.mjs';
import { L as Label } from '../chunks/label_BCCOrEL_.mjs';
import { B as Badge } from '../chunks/badge_DvkSPMv8.mjs';
import { TrendingUp, Calendar, PiggyBank, Percent } from 'lucide-react';
import { q as getNetworth } from '../chunks/db_TxX34wAz.mjs';
export { renderers } from '../renderers.mjs';

function NetworthTable({ networth }) {
  const { toggleSort, sortData, isSorted } = useSortState();
  const getCellValue = useCallback((row, key) => {
    switch (key) {
      case "month":
        return row.month;
      case "total":
        return row.total;
      case "change":
        return row.month_over_month_change ?? 0;
      case "pct":
        return row.month_over_month_pct ?? 0;
      default:
        return "";
    }
  }, []);
  const sortedRows = useMemo(() => {
    return sortData(networth, getCellValue, (data) => [...data].reverse());
  }, [networth, sortData, getCellValue]);
  return /* @__PURE__ */ jsx("div", { className: "rounded-xl border overflow-hidden", children: /* @__PURE__ */ jsxs(Table, { children: [
    /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
      /* @__PURE__ */ jsx(SortableHeader, { sortKey: "month", currentDirection: isSorted("month"), onSort: toggleSort, children: "Month" }),
      /* @__PURE__ */ jsx(SortableHeader, { sortKey: "total", currentDirection: isSorted("total"), onSort: toggleSort, className: "text-right", children: "Total" }),
      /* @__PURE__ */ jsx(SortableHeader, { sortKey: "change", currentDirection: isSorted("change"), onSort: toggleSort, className: "text-right", children: "MoM Change" }),
      /* @__PURE__ */ jsx(SortableHeader, { sortKey: "pct", currentDirection: isSorted("pct"), onSort: toggleSort, className: "text-right", children: "MoM %" }),
      /* @__PURE__ */ jsx(TableHead, {})
    ] }) }),
    /* @__PURE__ */ jsx(TableBody, { children: sortedRows.map((row) => /* @__PURE__ */ jsxs(TableRow, { children: [
      /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: row.month }),
      /* @__PURE__ */ jsx(TableCell, { className: "font-medium text-right", children: formatIdr(row.total) }),
      /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: row.month_over_month_change != null ? /* @__PURE__ */ jsxs("span", { className: row.month_over_month_change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400", children: [
        row.month_over_month_change >= 0 ? "+" : "",
        formatIdr(row.month_over_month_change)
      ] }) : /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "-" }) }),
      /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: row.month_over_month_pct != null ? /* @__PURE__ */ jsxs("span", { className: row.month_over_month_pct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400", children: [
        row.month_over_month_pct >= 0 ? "+" : "",
        row.month_over_month_pct,
        "%"
      ] }) : /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "-" }) }),
      /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", className: "h-7 text-xs text-blue-500 hover:text-blue-700", asChild: true, children: /* @__PURE__ */ jsx("a", { href: `/networth/edit?month=${encodeURIComponent(row.month)}`, children: "Edit" }) }) })
    ] }, row.month)) })
  ] }) });
}

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend);
function NetworthProjection({ data }) {
  const [projectionMonths, setProjectionMonths] = useState(24);
  const [monthlyContribution, setMonthlyContribution] = useState(0);
  const [annualReturnRate, setAnnualReturnRate] = useState(7);
  const sortedData = useMemo(() => {
    return [...data].filter((d) => d.total > 0).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data]);
  const avgMonthlySavings = useMemo(() => {
    if (sortedData.length < 3) return 0;
    const recent = sortedData.slice(-6);
    const changes = [];
    for (let i = 1; i < recent.length; i++) {
      changes.push(recent[i].total - recent[i - 1].total);
    }
    const avg = changes.reduce((s, c) => s + c, 0) / changes.length;
    return Math.max(0, Math.round(avg));
  }, [sortedData]);
  const effectiveContribution = monthlyContribution || avgMonthlySavings;
  const projectedData = useMemo(() => {
    if (sortedData.length === 0) return { labels: [], values: [], summary: null };
    const lastRecord = sortedData[sortedData.length - 1];
    const lastValue = lastRecord.total;
    const lastDate = new Date(lastRecord.date);
    const monthlyReturn = Math.pow(1 + annualReturnRate / 100, 1 / 12) - 1;
    const labels = [];
    const values = [];
    let currentValue = lastValue;
    for (let i = 1; i <= projectionMonths; i++) {
      currentValue = currentValue + effectiveContribution + currentValue * monthlyReturn;
      const projectedDate = new Date(lastDate);
      projectedDate.setMonth(projectedDate.getMonth() + i);
      const monthLabel = projectedDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short"
      });
      labels.push(monthLabel);
      values.push(Math.round(currentValue));
    }
    const summary2 = {
      at12: values[11] ?? null,
      at24: values[23] ?? null,
      at36: values[35] ?? null,
      lastValue,
      totalContributions: effectiveContribution * projectionMonths,
      investmentGains: values[projectionMonths - 1] - lastValue - effectiveContribution * projectionMonths
    };
    return { labels, values, summary: summary2 };
  }, [sortedData, projectionMonths, effectiveContribution, annualReturnRate]);
  const historicalLabels = sortedData.map((d) => d.month);
  const historicalValues = sortedData.map((d) => d.total);
  const chartData = {
    labels: [...historicalLabels, ...projectedData.labels],
    datasets: [
      {
        label: "Historical Net Worth",
        data: [...historicalValues, ...Array(projectedData.labels.length).fill(null)],
        borderColor: "#8b5cf6",
        backgroundColor: "rgba(139, 92, 246, 0.08)",
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2
      },
      {
        label: "Projected Net Worth",
        data: [
          ...Array(historicalValues.length - 1).fill(null),
          historicalValues[historicalValues.length - 1],
          ...projectedData.values
        ],
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245, 158, 11, 0.05)",
        borderDash: [8, 4],
        borderWidth: 2.5,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
        fill: false
      }
    ]
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: "index"
    },
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: { boxWidth: 12, font: { size: 11 }, usePointStyle: true }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            if (ctx.raw == null) return "";
            const label = ctx.dataset.label || "";
            return `${label}: ${formatIdr(ctx.raw)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 10 },
          maxRotation: 45,
          callback: function(_val, index) {
            const totalLabels = historicalLabels.length + projectedData.labels.length;
            if (totalLabels > 24 && index % 3 !== 0 && index !== totalLabels - 1) return "";
            if (totalLabels > 12 && index % 2 !== 0 && index !== totalLabels - 1) return "";
            return this.getLabelForValue(index);
          }
        }
      },
      y: {
        beginAtZero: false,
        ticks: {
          font: { size: 10 },
          callback: (val) => {
            const n = Number(val);
            if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
            if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
            if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
            return val;
          }
        }
      }
    }
  };
  if (sortedData.length === 0) {
    return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "py-8 text-center text-slate-400", children: /* @__PURE__ */ jsx("p", { children: "Add net worth data to see projections." }) }) });
  }
  const summary = projectedData.summary;
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(TrendingUp, { className: "w-4 h-4 text-violet-500" }),
        "Projection Settings"
      ] }) }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs(Label, { className: "text-xs text-slate-500 flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsx(Calendar, { className: "w-3.5 h-3.5" }),
              "Projection Period"
            ] }),
            /* @__PURE__ */ jsxs(Badge, { variant: "secondary", className: "text-xs font-mono", children: [
              projectionMonths,
              " months"
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "flex gap-2", children: [12, 24, 36, 60].map((m) => /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setProjectionMonths(m),
              className: `px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${projectionMonths === m ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 ring-1 ring-violet-300 dark:ring-violet-700" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`,
              children: m >= 12 ? `${m / 12}y` : `${m}m`
            },
            m
          )) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs(Label, { className: "text-xs text-slate-500 flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsx(PiggyBank, { className: "w-3.5 h-3.5" }),
              "Monthly Savings"
            ] }),
            /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "text-xs font-mono", children: formatIdr(effectiveContribution) })
          ] }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "range",
              min: 0,
              max: Math.max(avgMonthlySavings * 3, 1e7),
              step: 1e5,
              value: monthlyContribution || avgMonthlySavings,
              onChange: (e) => setMonthlyContribution(Number(e.target.value)),
              className: "w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-[10px] text-slate-400", children: [
            /* @__PURE__ */ jsx("span", { children: formatIdr(0) }),
            /* @__PURE__ */ jsx("span", { children: formatIdr(Math.max(avgMonthlySavings * 3, 1e7)) })
          ] }),
          monthlyContribution === 0 && avgMonthlySavings > 0 && /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-slate-400 italic", children: [
            "Auto: ",
            formatIdr(avgMonthlySavings),
            "/mo (from ",
            sortedData.length,
            "-period avg)"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs(Label, { className: "text-xs text-slate-500 flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsx(Percent, { className: "w-3.5 h-3.5" }),
              "Annual Return"
            ] }),
            /* @__PURE__ */ jsxs(Badge, { variant: "secondary", className: "text-xs font-mono", children: [
              annualReturnRate,
              "%"
            ] })
          ] }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "range",
              min: 0,
              max: 20,
              step: 0.5,
              value: annualReturnRate,
              onChange: (e) => setAnnualReturnRate(Number(e.target.value)),
              className: "w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-[10px] text-slate-400", children: [
            /* @__PURE__ */ jsx("span", { children: "0%" }),
            /* @__PURE__ */ jsx("span", { children: "10%" }),
            /* @__PURE__ */ jsx("span", { children: "20%" })
          ] })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsxs(CardHeader, { className: "pb-2", children: [
        /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(TrendingUp, { className: "w-4 h-4 text-violet-500" }),
          "Net Worth Projection"
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-400", children: [
          "Solid line = historical. Dashed amber line = projected with ",
          effectiveContribution > 0 ? `${formatIdr(effectiveContribution)}/mo contributions` : "no additional contributions",
          " and ",
          annualReturnRate,
          "% annual return."
        ] })
      ] }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", { className: "h-[350px]", children: /* @__PURE__ */ jsx(Line, { data: chartData, options: chartOptions }) }) })
    ] }),
    summary && /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: [
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "pt-4 pb-4", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 mb-1", children: "Current Net Worth" }),
        /* @__PURE__ */ jsx("p", { className: "text-lg font-bold text-slate-800 dark:text-slate-100", children: formatIdr(summary.lastValue) })
      ] }) }),
      summary.at12 && /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "pt-4 pb-4", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 mb-1", children: "In 12 Months" }),
        /* @__PURE__ */ jsx("p", { className: "text-lg font-bold text-amber-600 dark:text-amber-400", children: formatIdr(summary.at12) }),
        /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-slate-400", children: [
          "+",
          formatIdr(summary.at12 - summary.lastValue),
          " (",
          summary.lastValue > 0 ? ((summary.at12 / summary.lastValue - 1) * 100).toFixed(1) : 0,
          "%)"
        ] })
      ] }) }),
      summary.at24 && /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "pt-4 pb-4", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 mb-1", children: "In 24 Months" }),
        /* @__PURE__ */ jsx("p", { className: "text-lg font-bold text-amber-600 dark:text-amber-400", children: formatIdr(summary.at24) }),
        /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-slate-400", children: [
          "+",
          formatIdr(summary.at24 - summary.lastValue),
          " (",
          summary.lastValue > 0 ? ((summary.at24 / summary.lastValue - 1) * 100).toFixed(1) : 0,
          "%)"
        ] })
      ] }) }),
      summary.at36 && /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "pt-4 pb-4", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 mb-1", children: "In 36 Months" }),
        /* @__PURE__ */ jsx("p", { className: "text-lg font-bold text-amber-600 dark:text-amber-400", children: formatIdr(summary.at36) }),
        /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-slate-400", children: [
          "+",
          formatIdr(summary.at36 - summary.lastValue),
          " (",
          summary.lastValue > 0 ? ((summary.at36 / summary.lastValue - 1) * 100).toFixed(1) : 0,
          "%)"
        ] })
      ] }) })
    ] }),
    summary && summary.totalContributions > 0 && /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "pt-4 pb-4", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-6 text-sm", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("span", { className: "text-slate-500", children: "Total contributions: " }),
        /* @__PURE__ */ jsx("span", { className: "font-semibold", children: formatIdr(summary.totalContributions) })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("span", { className: "text-slate-500", children: "Investment returns: " }),
        /* @__PURE__ */ jsxs("span", { className: `font-semibold ${summary.investmentGains >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`, children: [
          summary.investmentGains >= 0 ? "+" : "",
          formatIdr(summary.investmentGains)
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("span", { className: "text-slate-500", children: "Projected total: " }),
        /* @__PURE__ */ jsx("span", { className: "font-semibold text-violet-600 dark:text-violet-400", children: formatIdr(summary.lastValue + summary.totalContributions + summary.investmentGains) })
      ] })
    ] }) }) })
  ] });
}

const $$Networth = createComponent(($$result, $$props, $$slots) => {
  const networth = getNetworth();
  [...networth].reverse();
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Networth" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-6"> <h1 class="text-2xl font-bold">Networth</h1> <p class="text-slate-500 dark:text-slate-400 text-sm">Assets and investments over time</p> </div>  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6"> <h2 class="text-lg font-semibold mb-4">Networth Trend</h2> ${renderComponent($$result2, "NetworthChart", NetworthChart, { "data": networth, "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/NetworthChart", "client:component-export": "default" })} </div>  ${renderComponent($$result2, "NetworthProjection", NetworthProjection, { "data": networth, "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/NetworthProjection", "client:component-export": "default" })}  ${renderComponent($$result2, "NetworthComposition", NetworthComposition, { "data": networth, "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/NetworthComposition", "client:component-export": "default" })}  <div class="mt-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"> <div class="p-6 border-b border-slate-200 dark:border-slate-700"> <h2 class="text-lg font-semibold">Monthly History</h2> </div> <div class="overflow-x-auto"> ${renderComponent($$result2, "NetworthTable", NetworthTable, { "networth": networth, "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/NetworthTable", "client:component-export": "default" })} </div> </div> ` })}`;
}, "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/networth.astro", void 0);

const $$file = "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/networth.astro";
const $$url = "/networth";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Networth,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
