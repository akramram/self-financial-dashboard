/* empty css                                  */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_BVE5k6Zu.mjs';
import 'kleur/colors';
import { B as Button, f as formatIdr, $ as $$Layout } from '../../chunks/button_wMNCUa4_.mjs';
import { jsx, jsxs } from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
import { a as fetchNetworth, I as Input, u as updateNetworthApi } from '../../chunks/input_Czu6wWQP.mjs';
import { C as Card, a as CardHeader, b as CardTitle, c as CardContent, L as Label } from '../../chunks/label_6ZlTdnTM.mjs';
import { B as Badge } from '../../chunks/badge_DgQx8syk.mjs';
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
  return /* @__PURE__ */ jsxs(Card, { className: "max-w-xl", children: [
    /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Edit Networth" }) }),
    /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
      message && /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "w-full justify-start px-3 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800", children: message }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx(Label, { children: "Month" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            type: "text",
            value: month,
            readOnly: true,
            className: "bg-muted"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center mb-2", children: [
          /* @__PURE__ */ jsx(Label, { children: "Breakdown" }),
          /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", size: "sm", onClick: addItem, children: "+ Add Item" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "space-y-2", children: Object.entries(breakdown).map(([key, value]) => /* @__PURE__ */ jsxs("div", { className: "flex gap-2 items-center", children: [
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "text",
              value: key,
              readOnly: true,
              className: "flex-1 bg-muted"
            }
          ),
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "number",
              value,
              onChange: (e) => handleChange(key, e.target.value),
              placeholder: "0",
              className: "w-40"
            }
          ),
          /* @__PURE__ */ jsx(
            Button,
            {
              type: "button",
              variant: "ghost",
              size: "sm",
              onClick: () => removeItem(key),
              className: "text-red-500 hover:text-red-700",
              children: "Remove"
            }
          )
        ] }, key)) })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "p-3 rounded-lg bg-muted", children: /* @__PURE__ */ jsxs("p", { className: "text-sm font-medium", children: [
        "Total: ",
        formatIdr(total)
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-3", children: [
        /* @__PURE__ */ jsx(Button, { type: "submit", children: "Save Changes" }),
        /* @__PURE__ */ jsx(Button, { variant: "secondary", asChild: true, children: /* @__PURE__ */ jsx("a", { href: "/networth", children: "Cancel" }) })
      ] })
    ] }) })
  ] });
}

const $$Edit = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Edit Networth" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-6"> <h1 class="text-2xl font-bold">Edit Networth</h1> <p class="text-slate-500 dark:text-slate-400 text-sm">Modify the investment breakdown for a month</p> </div> <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"> ${renderComponent($$result2, "NetworthEditForm", NetworthEditForm, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/root/self-financial-dashboard/src/components/NetworthEditForm", "client:component-export": "default" })} </div> ` })}`;
}, "/root/self-financial-dashboard/src/pages/networth/edit.astro", void 0);

const $$file = "/root/self-financial-dashboard/src/pages/networth/edit.astro";
const $$url = "/networth/edit";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Edit,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
