/* empty css                               */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BN-0jZ66.mjs';
import 'kleur/colors';
import { f as formatIdr, $ as $$Layout } from '../chunks/utils_CS_NAiYc.mjs';
import { N as NetworthChart } from '../chunks/NetworthChart_B9BJxM8D.mjs';
import { N as NetworthComposition } from '../chunks/NetworthComposition_Cyu2lawh.mjs';
import { jsx, jsxs } from 'react/jsx-runtime';
import { useCallback, useMemo } from 'react';
import { u as useSortState, S as SortableHeader } from '../chunks/SortableHeader_xUJEDrNx.mjs';
import { T as Table, a as TableHeader, b as TableRow, c as TableHead, d as TableBody, e as TableCell } from '../chunks/table_DAWfnRUr.mjs';
import { B as Button } from '../chunks/button_uxMUSjfb.mjs';
import { q as getNetworth } from '../chunks/db_B4_3wji-.mjs';
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
