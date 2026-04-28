/* empty css                                  */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_BVE5k6Zu.mjs';
import 'kleur/colors';
import { $ as $$Layout } from '../../chunks/Layout_DTBKtYAs.mjs';
import { jsx, jsxs } from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
import { f as fetchNetworth, u as updateNetworthApi } from '../../chunks/api_BJrEQ3uz.mjs';
import { f as formatIdr } from '../../chunks/utils_DHI1a69c.mjs';
export { renderers } from '../../renderers.mjs';

function NetworthEditForm() {
  const [month, setMonth] = useState("");
  const [breakdown, setBreakdown] = useState({});
  const [message, setMessage] = useState("");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get("month") || "";
    setMonth(m);
    fetchNetworth().then((all) => {
      const found = all.find((n) => n.month === m);
      if (found) {
        setBreakdown({ ...found.breakdown });
      }
      setLoaded(true);
    });
  }, []);
  const handleChange = (key, value) => {
    setBreakdown((prev) => ({ ...prev, [key]: Number(value) || 0 }));
  };
  const addItem = () => {
    const name = window.prompt("Enter investment name:");
    if (name) {
      setBreakdown((prev) => ({ ...prev, [name]: 0 }));
    }
  };
  const removeItem = (key) => {
    setBreakdown((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!month) return;
    const total2 = Object.values(breakdown).reduce((s, v) => s + v, 0);
    await updateNetworthApi(month, { month, date: "", total: total2, currency: "IDR", breakdown });
    setMessage("Networth updated successfully!");
    setTimeout(() => setMessage(""), 3e3);
  };
  const total = Object.values(breakdown).reduce((s, v) => s + v, 0);
  if (!loaded) {
    return /* @__PURE__ */ jsx("p", { className: "text-slate-500 text-sm", children: "Loading..." });
  }
  return /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-4 max-w-xl", children: [
    message && /* @__PURE__ */ jsx("div", { className: "p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 text-sm", children: message }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1", children: "Month" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "text",
          value: month,
          readOnly: true,
          className: "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700/50"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center mb-2", children: [
        /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-slate-500 dark:text-slate-400", children: "Breakdown" }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: addItem,
            className: "text-xs px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600",
            children: "+ Add Item"
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: "space-y-2", children: Object.entries(breakdown).map(([key, value]) => /* @__PURE__ */ jsxs("div", { className: "flex gap-2 items-center", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            value: key,
            readOnly: true,
            className: "flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700/50 text-sm"
          }
        ),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "number",
            value,
            onChange: (e) => handleChange(key, e.target.value),
            placeholder: "0",
            className: "w-40 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => removeItem(key),
            className: "text-red-500 hover:text-red-700 text-xs px-2",
            children: "Remove"
          }
        )
      ] }, key)) })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "p-3 rounded-lg bg-slate-100 dark:bg-slate-700/50", children: /* @__PURE__ */ jsxs("p", { className: "text-sm font-medium", children: [
      "Total: ",
      formatIdr(total)
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "flex gap-3", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "submit",
          className: "px-4 py-2 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 transition",
          children: "Save Changes"
        }
      ),
      /* @__PURE__ */ jsx(
        "a",
        {
          href: "/networth",
          className: "px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition",
          children: "Cancel"
        }
      )
    ] })
  ] });
}

const $$Edit = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Edit Networth" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-6"> <h1 class="text-2xl font-bold">Edit Networth</h1> <p class="text-slate-500 dark:text-slate-400 text-sm">Modify the investment breakdown for a month</p> </div> <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"> ${renderComponent($$result2, "NetworthEditForm", NetworthEditForm, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/Documents/Projects/dashboard/astro-app/src/components/NetworthEditForm", "client:component-export": "default" })} </div> ` })}`;
}, "/Users/user/Documents/Projects/dashboard/astro-app/src/pages/networth/edit.astro", void 0);

const $$file = "/Users/user/Documents/Projects/dashboard/astro-app/src/pages/networth/edit.astro";
const $$url = "/networth/edit";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Edit,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
