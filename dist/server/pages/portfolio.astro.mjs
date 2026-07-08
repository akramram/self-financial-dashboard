/* empty css                                        */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BN-0jZ66.mjs';
import 'kleur/colors';
import { $ as $$Layout } from '../chunks/utils_Dm1NQFdF.mjs';
import { N as NetworthComposition } from '../chunks/NetworthComposition_Br1yFRG2.mjs';
import { r as getNetworth } from '../chunks/db_BgiJApmW.mjs';
export { renderers } from '../renderers.mjs';

const $$Portfolio = createComponent(($$result, $$props, $$slots) => {
  const networth = getNetworth();
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Investment Portfolio \xB7 Financial Dashboard" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-6"> <h1 class="text-2xl font-bold">Investment Portfolio</h1> <p class="text-slate-500 dark:text-slate-400 text-sm">Portfolio allocation and breakdown from networth data</p> </div> ${renderComponent($$result2, "NetworthComposition", NetworthComposition, { "data": networth, "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/NetworthComposition", "client:component-export": "default" })} ` })}`;
}, "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/portfolio.astro", void 0);

const $$file = "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/portfolio.astro";
const $$url = "/portfolio";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Portfolio,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
