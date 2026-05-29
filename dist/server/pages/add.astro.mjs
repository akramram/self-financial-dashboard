/* empty css                               */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BN-0jZ66.mjs';
import 'kleur/colors';
import { g as getActivePeriod, $ as $$Layout } from '../chunks/utils_BV3uP8cD.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { useState, useRef, useEffect } from 'react';
import { f as fetchCategories, a as fetchNetworth, c as createNetworth } from '../chunks/api_CHTFnAPN.mjs';
import { C as Card, a as CardHeader, b as CardTitle, c as CardContent, d as CardDescription } from '../chunks/card_C3MBU-yw.mjs';
import { I as Input } from '../chunks/input_CMjf0MNb.mjs';
import { B as Button } from '../chunks/button_DWaBi1j-.mjs';
import { L as Label } from '../chunks/label_Bi9dl2vq.mjs';
import { B as Badge } from '../chunks/badge_Ck18rsVk.mjs';
import { C as Checkbox } from '../chunks/checkbox_BpCKnwT9.mjs';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription, e as DialogFooter } from '../chunks/dialog_rV5Ycyo9.mjs';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from '../chunks/select_DvSVMMD5.mjs';
export { renderers } from '../renderers.mjs';

const MONTH_OPTIONS$1 = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
const TYPE_OPTIONS = [
  { value: "cash", label: "Cash Expense" },
  { value: "credit_expense", label: "Credit Expense" },
  { value: "credit_payment", label: "Credit Payment" }
];
function AddTransactionForm() {
  const { month: defaultMonth, year: defaultYear } = getActivePeriod();
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("credit_expense");
  const [done, setDone] = useState(true);
  const [message, setMessage] = useState("");
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [categories, setCategories] = useState([]);
  const titleRef = useRef(null);
  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {
    });
  }, []);
  const buildPayload = () => {
    const monthName = `${month} ${year}`;
    const monthIdx = MONTH_OPTIONS$1.indexOf(month) + 1;
    const date = `${year}-${String(monthIdx).padStart(2, "0")}-21`;
    return {
      month: monthName,
      date,
      title,
      category: category || title.split(" ")[0],
      amount: Number(amount),
      currency: "IDR",
      type,
      payment_method: type === "cash" ? "Cash" : "Credit",
      done,
      created_time: (/* @__PURE__ */ new Date()).toISOString()
    };
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !amount) {
      setMessage("Title and amount are required.");
      return;
    }
    const payload = buildPayload();
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.status === 409) {
      setShowDuplicateDialog(true);
      return;
    }
    if (!res.ok) {
      setMessage("Failed to add transaction.");
      return;
    }
    setMessage("Transaction added successfully!");
    setTitle("");
    setCategory("");
    setAmount("");
    setTimeout(() => setMessage(""), 3e3);
    titleRef.current?.focus();
  };
  const confirmDuplicate = async () => {
    const payload = buildPayload();
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, force: true })
    });
    setShowDuplicateDialog(false);
    if (res.ok) {
      setMessage("Transaction added successfully!");
      setTitle("");
      setCategory("");
      setAmount("");
      setTimeout(() => setMessage(""), 3e3);
      titleRef.current?.focus();
    } else {
      setMessage("Failed to add transaction.");
    }
  };
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Add Transaction" }) }),
    /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
      message && /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "w-full justify-start px-3 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800", children: message }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsx(Label, { children: "Month" }),
          /* @__PURE__ */ jsxs(Select, { value: month, onValueChange: setMonth, children: [
            /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsx(SelectContent, { children: MONTH_OPTIONS$1.map((m) => /* @__PURE__ */ jsx(SelectItem, { value: m, children: m }, m)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsx(Label, { children: "Year" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "number",
              value: year,
              onChange: (e) => setYear(Number(e.target.value))
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx(Label, { children: "Title" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            type: "text",
            value: title,
            onChange: (e) => setTitle(e.target.value),
            placeholder: "e.g. 🏠 Kontrakan",
            ref: titleRef
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx(Label, { children: "Category" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            type: "text",
            value: category,
            onChange: (e) => setCategory(e.target.value),
            placeholder: "e.g. 🏠 Kontrakan",
            list: "category-list"
          }
        ),
        /* @__PURE__ */ jsx("datalist", { id: "category-list", children: categories.map((c) => /* @__PURE__ */ jsx("option", { value: c.name }, c.id)) }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Pick an existing category or type a new one" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsx(Label, { children: "Amount (IDR)" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "number",
              value: amount,
              onChange: (e) => setAmount(e.target.value),
              placeholder: "1000000"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsx(Label, { children: "Type" }),
          /* @__PURE__ */ jsxs(Select, { value: type, onValueChange: (v) => setType(v), children: [
            /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsx(SelectContent, { children: TYPE_OPTIONS.map((opt) => /* @__PURE__ */ jsx(SelectItem, { value: opt.value, children: opt.label }, opt.value)) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(
          Checkbox,
          {
            id: "done",
            checked: done,
            onCheckedChange: (v) => setDone(!!v)
          }
        ),
        /* @__PURE__ */ jsx(Label, { htmlFor: "done", className: "text-sm text-slate-600 dark:text-slate-300", children: "Paid / Done" })
      ] }),
      /* @__PURE__ */ jsx(Button, { type: "submit", className: "w-full", children: "Add Transaction" })
    ] }) }),
    /* @__PURE__ */ jsx(Dialog, { open: showDuplicateDialog, onOpenChange: setShowDuplicateDialog, children: /* @__PURE__ */ jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: "Possible Duplicate" }),
        /* @__PURE__ */ jsx(DialogDescription, { children: "A similar transaction was added within the last 24 hours. Are you sure you want to add it again?" })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "secondary", onClick: () => setShowDuplicateDialog(false), children: "Cancel" }),
        /* @__PURE__ */ jsx(Button, { onClick: confirmDuplicate, children: "Add Anyway" })
      ] })
    ] }) })
  ] });
}

const MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
function AddNetworthForm() {
  const [month, setMonth] = useState("May");
  const [year, setYear] = useState(2026);
  const [breakdown, setBreakdown] = useState({
    "CashCow Jenius": 0,
    "Saham": 0,
    "Saham Luar": 0,
    "Reksa Dana": 0,
    "Cash": 0
  });
  const [message, setMessage] = useState("");
  useEffect(() => {
    fetchNetworth().then((all) => {
      if (all.length === 0) return;
      const latest = all[all.length - 1];
      if (latest) {
        const [latestMonth, latestYear] = latest.month.split(" ");
        if (latestMonth && MONTH_OPTIONS.includes(latestMonth)) {
          setMonth(latestMonth);
        }
        if (latestYear) {
          setYear(Number(latestYear));
        }
        if (latest.breakdown && Object.keys(latest.breakdown).length > 0) {
          setBreakdown({ ...latest.breakdown });
        }
      }
    });
  }, []);
  const handleBreakdownChange = (key, value) => {
    setBreakdown((prev) => ({ ...prev, [key]: Number(value) || 0 }));
  };
  const addBreakdownItem = () => {
    const name = prompt("Enter investment name:");
    if (name) {
      setBreakdown((prev) => ({ ...prev, [name]: 0 }));
    }
  };
  const removeBreakdownItem = (key) => {
    setBreakdown((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const monthName = `${month} ${year}`;
    const monthIdx = MONTH_OPTIONS.indexOf(month) + 1;
    const date = `${year}-${String(monthIdx).padStart(2, "0")}-21`;
    const total = Object.values(breakdown).reduce((s, v) => s + v, 0);
    await createNetworth({
      month: monthName,
      date,
      total,
      currency: "IDR",
      month_over_month_change: null,
      month_over_month_pct: null,
      breakdown: { ...breakdown }
    });
    setMessage("Networth entry added successfully!");
    setTimeout(() => setMessage(""), 3e3);
  };
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Add / Update Networth" }) }),
    /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
      message && /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "w-full justify-start px-3 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800", children: message }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsx(Label, { children: "Month" }),
          /* @__PURE__ */ jsxs(Select, { value: month, onValueChange: setMonth, children: [
            /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsx(SelectContent, { children: MONTH_OPTIONS.map((m) => /* @__PURE__ */ jsx(SelectItem, { value: m, children: m }, m)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsx(Label, { children: "Year" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "number",
              value: year,
              onChange: (e) => setYear(Number(e.target.value))
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center mb-2", children: [
          /* @__PURE__ */ jsx(Label, { children: "Breakdown" }),
          /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", size: "sm", onClick: addBreakdownItem, children: "+ Add Item" })
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
              onChange: (e) => handleBreakdownChange(key, e.target.value),
              placeholder: "0",
              className: "w-32"
            }
          ),
          /* @__PURE__ */ jsx(
            Button,
            {
              type: "button",
              variant: "ghost",
              size: "sm",
              onClick: () => removeBreakdownItem(key),
              className: "text-red-500 hover:text-red-700",
              children: "✕"
            }
          )
        ] }, key)) })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "p-3 rounded-lg bg-muted", children: /* @__PURE__ */ jsxs("p", { className: "text-sm font-medium", children: [
        "Total: IDR ",
        Object.values(breakdown).reduce((s, v) => s + v, 0).toLocaleString("id-ID")
      ] }) }),
      /* @__PURE__ */ jsx(Button, { type: "submit", className: "w-full", children: "Add / Update Networth" })
    ] }) })
  ] });
}

const $$Add = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Add Data" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-6"> <h1 class="text-2xl font-bold">Add Data</h1> <p class="text-slate-500 dark:text-slate-400 text-sm">Add new transactions or update networth</p> </div> <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"> ${renderComponent($$result2, "AddTransactionForm", AddTransactionForm, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/AddTransactionForm", "client:component-export": "default" })} ${renderComponent($$result2, "AddNetworthForm", AddNetworthForm, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/AddNetworthForm", "client:component-export": "default" })} </div> ${renderComponent($$result2, "Card", Card, {}, { "default": ($$result3) => renderTemplate` ${renderComponent($$result3, "CardHeader", CardHeader, {}, { "default": ($$result4) => renderTemplate` ${renderComponent($$result4, "CardTitle", CardTitle, {}, { "default": ($$result5) => renderTemplate`Data Management` })} ${renderComponent($$result4, "CardDescription", CardDescription, {}, { "default": ($$result5) => renderTemplate`Export or back up your financial data` })} ` })} ${renderComponent($$result3, "CardContent", CardContent, {}, { "default": ($$result4) => renderTemplate` <div class="flex flex-col sm:flex-row gap-3"> ${renderComponent($$result4, "Button", Button, { "asChild": true }, { "default": ($$result5) => renderTemplate` <a href="/api/export">Export All Data (JSON)</a> ` })} </div> <p class="text-xs text-muted-foreground mt-3">
Data is stored in a local SQLite database. Export to back up your changes.
</p> ` })} ` })} ` })}`;
}, "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/add.astro", void 0);

const $$file = "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/add.astro";
const $$url = "/add";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Add,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
