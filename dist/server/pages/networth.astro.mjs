/* empty css                               */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BVE5k6Zu.mjs';
import 'kleur/colors';
import { f as formatIdr, B as Button, $ as $$Layout } from '../chunks/button_CiITpdQ-.mjs';
import { N as NetworthChart } from '../chunks/NetworthChart_D9IFMBnw.mjs';
import { jsx, jsxs } from 'react/jsx-runtime';
import 'react';
import { T as Table, a as TableHeader, b as TableRow, c as TableHead, d as TableBody, e as TableCell } from '../chunks/table_bMQ14wB_.mjs';
import { e as getNetworth } from '../chunks/db_CjJXfo23.mjs';
export { renderers } from '../renderers.mjs';

function NetworthTable({ networth }) {
  const networthReversed = [...networth].reverse();
  return /* @__PURE__ */ jsx("div", { className: "rounded-xl border overflow-hidden", children: /* @__PURE__ */ jsxs(Table, { children: [
    /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
      /* @__PURE__ */ jsx(TableHead, { children: "Month" }),
      /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Total" }),
      /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "MoM Change" }),
      /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "MoM %" }),
      /* @__PURE__ */ jsx(TableHead, {})
    ] }) }),
    /* @__PURE__ */ jsx(TableBody, { children: networthReversed.map((row) => /* @__PURE__ */ jsxs(TableRow, { children: [
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
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Networth" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-6"> <h1 class="text-2xl font-bold">Networth</h1> <p class="text-slate-500 dark:text-slate-400 text-sm">Assets and investments over time</p> </div> <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6"> <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"> <h2 class="text-lg font-semibold mb-4">Networth Trend</h2> ${renderComponent($$result2, "NetworthChart", NetworthChart, { "data": networth, "client:load": true, "client:component-hydration": "load", "client:component-path": "/root/self-financial-dashboard/src/components/NetworthChart", "client:component-export": "default" })} </div> <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"> <h2 class="text-lg font-semibold mb-4">Latest Breakdown</h2> ${networth.length > 0 ? renderTemplate`<div class="space-y-3"> ${Object.entries(networth[networth.length - 1].breakdown).map(([key, value]) => renderTemplate`<div class="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50"> <span class="text-sm font-medium">${key}</span> <span class="text-sm font-bold">${formatIdr(value)}</span> </div>`)} <div class="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center"> <span class="text-sm font-semibold">Total</span> <span class="text-lg font-bold text-violet-600 dark:text-violet-400"> ${formatIdr(networth[networth.length - 1].total)} </span> </div> </div>` : renderTemplate`<p class="text-slate-500 text-sm">No networth data available.</p>`} </div> </div> <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"> <div class="p-6 border-b border-slate-200 dark:border-slate-700"> <h2 class="text-lg font-semibold">Monthly History</h2> </div> <div class="overflow-x-auto"> ${renderComponent($$result2, "NetworthTable", NetworthTable, { "networth": networth, "client:load": true, "client:component-hydration": "load", "client:component-path": "/root/self-financial-dashboard/src/components/NetworthTable", "client:component-export": "default" })} </div> </div> ` })}`;
}, "/root/self-financial-dashboard/src/pages/networth.astro", void 0);

const $$file = "/root/self-financial-dashboard/src/pages/networth.astro";
const $$url = "/networth";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Networth,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
