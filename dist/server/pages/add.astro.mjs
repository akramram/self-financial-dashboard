/* empty css                               */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BVE5k6Zu.mjs';
import 'kleur/colors';
import { c as cn, $ as $$Layout } from '../chunks/utils_Bx4nDzFr.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import * as React from 'react';
import { useState } from 'react';
import { c as createTransaction, a as createNetworth } from '../chunks/api_DIaGD6bk.mjs';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
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
function AddTransactionForm() {
  const [month, setMonth] = useState("May");
  const [year, setYear] = useState(2026);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("cash");
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !amount) {
      setMessage("Title and amount are required.");
      return;
    }
    const monthName = `${month} ${year}`;
    const date = `${year}-${String(MONTH_OPTIONS$1.indexOf(month) + 1).padStart(2, "0")}-01`;
    await createTransaction({
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
    });
    setMessage("Transaction added successfully!");
    setTitle("");
    setCategory("");
    setAmount("");
    setTimeout(() => setMessage(""), 3e3);
  };
  return /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
    message && /* @__PURE__ */ jsx("div", { className: "p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 text-sm", children: message }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1", children: "Month" }),
        /* @__PURE__ */ jsx(
          "select",
          {
            value: month,
            onChange: (e) => setMonth(e.target.value),
            className: "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800",
            children: MONTH_OPTIONS$1.map((m) => /* @__PURE__ */ jsx("option", { value: m, children: m }, m))
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1", children: "Year" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "number",
            value: year,
            onChange: (e) => setYear(Number(e.target.value)),
            className: "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1", children: "Title" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "text",
          value: title,
          onChange: (e) => setTitle(e.target.value),
          placeholder: "e.g. 🏠 Kontrakan",
          className: "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1", children: "Category" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "text",
          value: category,
          onChange: (e) => setCategory(e.target.value),
          placeholder: "e.g. 🏠 Kontrakan",
          className: "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
        }
      ),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-400 mt-1", children: "Leave blank to use first word of title" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1", children: "Amount (IDR)" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "number",
            value: amount,
            onChange: (e) => setAmount(e.target.value),
            placeholder: "1000000",
            className: "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1", children: "Type" }),
        /* @__PURE__ */ jsxs(
          "select",
          {
            value: type,
            onChange: (e) => setType(e.target.value),
            className: "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800",
            children: [
              /* @__PURE__ */ jsx("option", { value: "cash", children: "Cash Expense" }),
              /* @__PURE__ */ jsx("option", { value: "credit_expense", children: "Credit Expense" }),
              /* @__PURE__ */ jsx("option", { value: "credit_payment", children: "Credit Payment" })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx(
        "input",
        {
          id: "done",
          type: "checkbox",
          checked: done,
          onChange: (e) => setDone(e.target.checked),
          className: "rounded border-slate-300"
        }
      ),
      /* @__PURE__ */ jsx("label", { htmlFor: "done", className: "text-sm text-slate-600 dark:text-slate-300", children: "Paid / Done" })
    ] }),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "submit",
        className: "w-full px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition",
        children: "Add Transaction"
      }
    )
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
    const date = `${year}-${String(MONTH_OPTIONS.indexOf(month) + 1).padStart(2, "0")}-01`;
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
  return /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
    message && /* @__PURE__ */ jsx("div", { className: "p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 text-sm", children: message }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1", children: "Month" }),
        /* @__PURE__ */ jsx(
          "select",
          {
            value: month,
            onChange: (e) => setMonth(e.target.value),
            className: "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800",
            children: MONTH_OPTIONS.map((m) => /* @__PURE__ */ jsx("option", { value: m, children: m }, m))
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1", children: "Year" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "number",
            value: year,
            onChange: (e) => setYear(Number(e.target.value)),
            className: "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center mb-2", children: [
        /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-slate-500 dark:text-slate-400", children: "Breakdown" }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: addBreakdownItem,
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
            onChange: (e) => handleBreakdownChange(key, e.target.value),
            placeholder: "0",
            className: "w-32 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => removeBreakdownItem(key),
            className: "text-red-500 hover:text-red-700 text-xs px-2",
            children: "✕"
          }
        )
      ] }, key)) })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "p-3 rounded-lg bg-slate-100 dark:bg-slate-700/50", children: /* @__PURE__ */ jsxs("p", { className: "text-sm font-medium", children: [
      "Total: IDR ",
      Object.values(breakdown).reduce((s, v) => s + v, 0).toLocaleString("id-ID")
    ] }) }),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "submit",
        className: "w-full px-4 py-2 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 transition",
        children: "Add / Update Networth"
      }
    )
  ] });
}

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return /* @__PURE__ */ jsx(
      Comp,
      {
        className: cn(buttonVariants({ variant, size, className })),
        ref,
        ...props
      }
    );
  }
);
Button.displayName = "Button";

const Card = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "div",
  {
    ref,
    className: cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    ),
    ...props
  }
));
Card.displayName = "Card";
const CardHeader = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "div",
  {
    ref,
    className: cn("flex flex-col space-y-1.5 p-6", className),
    ...props
  }
));
CardHeader.displayName = "CardHeader";
const CardTitle = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "div",
  {
    ref,
    className: cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    ),
    ...props
  }
));
CardTitle.displayName = "CardTitle";
const CardDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "div",
  {
    ref,
    className: cn("text-sm text-muted-foreground", className),
    ...props
  }
));
CardDescription.displayName = "CardDescription";
const CardContent = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("div", { ref, className: cn("p-6 pt-0", className), ...props }));
CardContent.displayName = "CardContent";
const CardFooter = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "div",
  {
    ref,
    className: cn("flex items-center p-6 pt-0", className),
    ...props
  }
));
CardFooter.displayName = "CardFooter";

const $$Add = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Add Data" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-6"> <h1 class="text-2xl font-bold">Add Data</h1> <p class="text-slate-500 dark:text-slate-400 text-sm">Add new transactions or update networth</p> </div> <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"> <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"> <h2 class="text-lg font-semibold mb-4">Add Transaction</h2> ${renderComponent($$result2, "AddTransactionForm", AddTransactionForm, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/root/self-financial-dashboard/src/components/AddTransactionForm", "client:component-export": "default" })} </div> <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"> <h2 class="text-lg font-semibold mb-4">Add / Update Networth</h2> ${renderComponent($$result2, "AddNetworthForm", AddNetworthForm, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/root/self-financial-dashboard/src/components/AddNetworthForm", "client:component-export": "default" })} </div> </div> ${renderComponent($$result2, "Card", Card, {}, { "default": ($$result3) => renderTemplate` ${renderComponent($$result3, "CardHeader", CardHeader, {}, { "default": ($$result4) => renderTemplate` ${renderComponent($$result4, "CardTitle", CardTitle, {}, { "default": ($$result5) => renderTemplate`Data Management` })} ${renderComponent($$result4, "CardDescription", CardDescription, {}, { "default": ($$result5) => renderTemplate`Export or back up your financial data` })} ` })} ${renderComponent($$result3, "CardContent", CardContent, {}, { "default": ($$result4) => renderTemplate` <div class="flex flex-col sm:flex-row gap-3"> ${renderComponent($$result4, "Button", Button, { "asChild": true }, { "default": ($$result5) => renderTemplate` <a href="/api/export">Export All Data (JSON)</a> ` })} </div> <p class="text-xs text-muted-foreground mt-3">
Data is stored in a local SQLite database. Export to back up your changes.
</p> ` })} ` })} ` })}`;
}, "/root/self-financial-dashboard/src/pages/add.astro", void 0);

const $$file = "/root/self-financial-dashboard/src/pages/add.astro";
const $$url = "/add";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Add,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
