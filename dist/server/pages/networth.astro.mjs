/* empty css                               */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BN-0jZ66.mjs';
import 'kleur/colors';
import { f as formatIdr, $ as $$Layout } from '../chunks/utils_CjI_A0_k.mjs';
import { N as NetworthChart } from '../chunks/NetworthChart_CLj_hk2x.mjs';
import { jsx, jsxs } from 'react/jsx-runtime';
import { useMemo, useCallback } from 'react';
import { Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { u as useSortState, S as SortableHeader } from '../chunks/SortableHeader_Df8oxM-d.mjs';
import { T as Table, a as TableHeader, b as TableRow, c as TableHead, d as TableBody, e as TableCell } from '../chunks/table_uhqG26zf.mjs';
import { B as Button } from '../chunks/button_Di4nlt-C.mjs';
import { q as getNetworth } from '../chunks/db_B4_3wji-.mjs';
export { renderers } from '../renderers.mjs';

Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);
const COLORS = [
  "#8b5cf6",
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
  "#f97316",
  "#84cc16",
  "#a855f7"
];
function NetworthComposition({ data }) {
  const sortedData = useMemo(
    () => [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [data]
  );
  const latest = sortedData[sortedData.length - 1];
  const donutData = useMemo(() => {
    if (!latest?.breakdown) return null;
    const entries = Object.entries(latest.breakdown).sort(([, a], [, b]) => b - a);
    return {
      labels: entries.map(([key]) => key),
      datasets: [{
        data: entries.map(([, val]) => val),
        backgroundColor: entries.map((_, i) => COLORS[i % COLORS.length]),
        borderColor: entries.map((_, i) => COLORS[i % COLORS.length]),
        borderWidth: 0,
        hoverBorderWidth: 2,
        hoverBorderColor: "#fff"
      }]
    };
  }, [latest]);
  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "60%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 10,
          font: { size: 11 }
        }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const total = ctx.dataset.data.reduce((s, v) => s + v, 0);
            const pct = total > 0 ? (ctx.parsed / total * 100).toFixed(1) : "0";
            return ` ${ctx.label}: ${formatIdr(ctx.parsed)} (${pct}%)`;
          }
        }
      }
    }
  };
  const allKeys = useMemo(() => {
    const set = /* @__PURE__ */ new Set();
    sortedData.forEach((d) => {
      if (d.breakdown) Object.keys(d.breakdown).forEach((k) => set.add(k));
    });
    return Array.from(set);
  }, [sortedData]);
  const barData = useMemo(() => {
    const labels = sortedData.map((d) => d.month);
    const datasets = allKeys.map((key, i) => ({
      label: key,
      data: sortedData.map((d) => d.breakdown?.[key] ?? 0),
      backgroundColor: COLORS[i % COLORS.length],
      borderWidth: 0,
      borderRadius: i === allKeys.length - 1 ? 4 : 0,
      borderSkipped: false
    }));
    return { labels, datasets };
  }, [sortedData, allKeys]);
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          padding: 14,
          usePointStyle: true,
          pointStyleWidth: 10,
          font: { size: 10 }
        }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${formatIdr(ctx.parsed.y)}`
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { font: { size: 10 } }
      },
      y: {
        stacked: true,
        ticks: {
          callback: (v) => formatIdr(v),
          font: { size: 10 }
        }
      }
    },
    interaction: {
      mode: "index",
      intersect: false
    }
  };
  const metrics = useMemo(() => {
    if (!latest?.breakdown) return [];
    const entries = Object.entries(latest.breakdown).sort(([, a], [, b]) => b - a);
    const total = latest.total || entries.reduce((s, [, v]) => s + v, 0);
    const prev = sortedData.length >= 2 ? sortedData[sortedData.length - 2] : null;
    return entries.map(([key, value]) => {
      const pct = total > 0 ? (value / total * 100).toFixed(1) : "0";
      const prevValue = prev?.breakdown?.[key];
      const change = prevValue != null ? value - prevValue : 0;
      const changePct = prevValue != null && prevValue > 0 ? (change / prevValue * 100).toFixed(1) : null;
      return { key, value, pct, change, changePct };
    });
  }, [latest, sortedData]);
  if (!latest) {
    return /* @__PURE__ */ jsx("div", { className: "py-8 text-center text-sm text-muted-foreground", children: "No networth data available." });
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-5 gap-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "lg:col-span-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold mb-2", children: "Portfolio Allocation" }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 dark:text-slate-400 mb-4", children: [
          latest.month,
          " · Total: ",
          /* @__PURE__ */ jsx("span", { className: "font-semibold text-violet-600 dark:text-violet-400", children: formatIdr(latest.total) })
        ] }),
        donutData ? /* @__PURE__ */ jsx("div", { className: "relative h-72", children: /* @__PURE__ */ jsx(Doughnut, { data: donutData, options: donutOptions }) }) : /* @__PURE__ */ jsx("p", { className: "py-12 text-center text-sm text-muted-foreground", children: "No breakdown data available." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold mb-4", children: "Investment Details" }),
        metrics.length > 0 ? /* @__PURE__ */ jsx("div", { className: "space-y-3 max-h-72 overflow-y-auto pr-1", children: metrics.map((m) => /* @__PURE__ */ jsxs(
          "div",
          {
            className: "p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-2", children: [
                /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: "inline-block w-3 h-3 rounded-full shrink-0",
                    style: { backgroundColor: COLORS[metrics.indexOf(m) % COLORS.length] }
                  }
                ),
                /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold truncate", children: m.key })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-sm mb-1", children: [
                /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Value" }),
                /* @__PURE__ */ jsx("span", { className: "font-bold", children: formatIdr(m.value) })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-sm mb-2", children: [
                /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Allocation" }),
                /* @__PURE__ */ jsxs("span", { className: "font-medium", children: [
                  m.pct,
                  "%"
                ] })
              ] }),
              m.changePct != null && /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-xs", children: [
                /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "MoM Change" }),
                /* @__PURE__ */ jsxs("span", { className: `font-semibold ${m.change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`, children: [
                  m.change >= 0 ? "+" : "",
                  formatIdr(m.change),
                  " (",
                  m.change >= 0 ? "+" : "",
                  m.changePct,
                  "%)"
                ] })
              ] })
            ]
          },
          m.key
        )) }) : /* @__PURE__ */ jsx("p", { className: "py-12 text-center text-sm text-muted-foreground", children: "No breakdown data available." })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold mb-4", children: "Composition Trend" }),
      /* @__PURE__ */ jsx("div", { className: "relative h-80", children: /* @__PURE__ */ jsx(Bar, { data: barData, options: barOptions }) })
    ] })
  ] });
}

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

const $$Networth = createComponent(($$result, $$props, $$slots) => {
  const networth = getNetworth();
  [...networth].reverse();
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Networth" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-6"> <h1 class="text-2xl font-bold">Networth</h1> <p class="text-slate-500 dark:text-slate-400 text-sm">Assets and investments over time</p> </div>  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6"> <h2 class="text-lg font-semibold mb-4">Networth Trend</h2> ${renderComponent($$result2, "NetworthChart", NetworthChart, { "data": networth, "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/NetworthChart", "client:component-export": "default" })} </div>  ${renderComponent($$result2, "NetworthComposition", NetworthComposition, { "data": networth, "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/NetworthComposition", "client:component-export": "default" })}  <div class="mt-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"> <div class="p-6 border-b border-slate-200 dark:border-slate-700"> <h2 class="text-lg font-semibold">Monthly History</h2> </div> <div class="overflow-x-auto"> ${renderComponent($$result2, "NetworthTable", NetworthTable, { "networth": networth, "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/NetworthTable", "client:component-export": "default" })} </div> </div> ` })}`;
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
