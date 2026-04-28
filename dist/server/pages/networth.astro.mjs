/* empty css                               */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead, h as addAttribute } from '../chunks/astro/server_BVE5k6Zu.mjs';
import 'kleur/colors';
import { $ as $$Layout, f as formatIdr } from '../chunks/utils_Bx4nDzFr.mjs';
import { N as NetworthChart } from '../chunks/NetworthChart_BOiwreRL.mjs';
import { a as getNetworth } from '../chunks/db_BnTmBRTu.mjs';
export { renderers } from '../renderers.mjs';

const $$Networth = createComponent(($$result, $$props, $$slots) => {
  const networth = getNetworth();
  const networthReversed = [...networth].reverse();
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Networth" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-6"> <h1 class="text-2xl font-bold">Networth</h1> <p class="text-slate-500 dark:text-slate-400 text-sm">Assets and investments over time</p> </div> <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6"> <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"> <h2 class="text-lg font-semibold mb-4">Networth Trend</h2> ${renderComponent($$result2, "NetworthChart", NetworthChart, { "data": networth, "client:load": true, "client:component-hydration": "load", "client:component-path": "/root/self-financial-dashboard/src/components/NetworthChart", "client:component-export": "default" })} </div> <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"> <h2 class="text-lg font-semibold mb-4">Latest Breakdown</h2> ${networth.length > 0 ? renderTemplate`<div class="space-y-3"> ${Object.entries(networth[networth.length - 1].breakdown).map(([key, value]) => renderTemplate`<div class="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50"> <span class="text-sm font-medium">${key}</span> <span class="text-sm font-bold">${formatIdr(value)}</span> </div>`)} <div class="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center"> <span class="text-sm font-semibold">Total</span> <span class="text-lg font-bold text-violet-600 dark:text-violet-400"> ${formatIdr(networth[networth.length - 1].total)} </span> </div> </div>` : renderTemplate`<p class="text-slate-500 text-sm">No networth data available.</p>`} </div> </div> <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"> <div class="p-6 border-b border-slate-200 dark:border-slate-700"> <h2 class="text-lg font-semibold">Monthly History</h2> </div> <div class="overflow-x-auto"> <table class="w-full text-sm text-left"> <thead class="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 uppercase text-xs"> <tr> <th class="px-6 py-3 font-medium">Month</th> <th class="px-6 py-3 font-medium text-right">Total</th> <th class="px-6 py-3 font-medium text-right">MoM Change</th> <th class="px-6 py-3 font-medium text-right">MoM %</th> <th class="px-6 py-3 font-medium"></th> </tr> </thead> <tbody class="divide-y divide-slate-200 dark:divide-slate-700"> ${networthReversed.map((row) => renderTemplate`<tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30"> <td class="px-6 py-3 font-medium">${row.month}</td> <td class="px-6 py-3 font-medium text-right">${formatIdr(row.total)}</td> <td class="px-6 py-3 text-right"> ${row.month_over_month_change != null ? renderTemplate`<span${addAttribute(row.month_over_month_change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400", "class")}> ${row.month_over_month_change >= 0 ? "+" : ""}${formatIdr(row.month_over_month_change)} </span>` : renderTemplate`<span class="text-slate-400">-</span>`} </td> <td class="px-6 py-3 text-right"> ${row.month_over_month_pct != null ? renderTemplate`<span${addAttribute(row.month_over_month_pct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400", "class")}> ${row.month_over_month_pct >= 0 ? "+" : ""}${row.month_over_month_pct}%
</span>` : renderTemplate`<span class="text-slate-400">-</span>`} </td> <td class="px-6 py-3"> <a${addAttribute(`/networth/edit?month=${encodeURIComponent(row.month)}`, "href")} class="text-blue-500 hover:text-blue-700 text-xs font-medium">
Edit
</a> </td> </tr>`)} </tbody> </table> </div> </div> ` })}`;
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
