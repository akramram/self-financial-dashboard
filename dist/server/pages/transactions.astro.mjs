/* empty css                               */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BVE5k6Zu.mjs';
import 'kleur/colors';
import { B as Button, f as formatIdr, $ as $$Layout } from '../chunks/button_CObA1HLU.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { useState, useMemo } from 'react';
import { I as Input, t as toggleTransactionDoneApi, h as deleteTransactionApi, i as updateTransactionApi } from '../chunks/input_B2XQHpLE.mjs';
import { T as Table, a as TableHeader, b as TableRow, c as TableHead, d as TableBody, e as TableCell } from '../chunks/table_CQ9KJYV8.mjs';
import { B as Badge } from '../chunks/badge_rfXm3Mte.mjs';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from '../chunks/select_DQjir8sQ.mjs';
import { c as getTransactions } from '../chunks/db_B5rD-vVO.mjs';
export { renderers } from '../renderers.mjs';

function parseCreatedTime(tx) {
  if (tx.created_time) {
    const d = new Date(tx.created_time);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(tx.date);
}
const TYPE_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "credit_expense", label: "Credit Expense" },
  { value: "credit_payment", label: "Credit Payment" }
];
function TransactionTable({ transactions, showMonth = true }) {
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const rowsPerPage = 25;
  const sorted = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const da = parseCreatedTime(a);
      const db = parseCreatedTime(b);
      return db.getTime() - da.getTime();
    });
  }, [transactions]);
  let filtered = sorted;
  if (filterType !== "all") {
    filtered = filtered.filter((t) => t.type === filterType);
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (t) => t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
    );
  }
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const pageRows = filtered.slice(start, start + rowsPerPage);
  const startEdit = (row) => {
    setEditingId(row.id);
    setEditForm({ ...row });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };
  const saveEdit = async () => {
    if (!editForm.id) return;
    const original = transactions.find((t) => t.id === editForm.id);
    if (!original) return;
    const updated = { ...original, ...editForm };
    await updateTransactionApi(updated.id, updated);
    setEditingId(null);
    setEditForm({});
    window.location.reload();
  };
  const handleChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row gap-3 mb-4", children: [
      /* @__PURE__ */ jsx(
        Input,
        {
          type: "text",
          placeholder: "Search title or category...",
          value: search,
          onChange: (e) => {
            setSearch(e.target.value);
            setPage(1);
          },
          className: "flex-1"
        }
      ),
      /* @__PURE__ */ jsxs(Select, { value: filterType, onValueChange: (v) => {
        setFilterType(v);
        setPage(1);
      }, children: [
        /* @__PURE__ */ jsx(SelectTrigger, { className: "w-[160px]", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
        /* @__PURE__ */ jsxs(SelectContent, { children: [
          /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "All Types" }),
          /* @__PURE__ */ jsx(SelectItem, { value: "cash", children: "Cash" }),
          /* @__PURE__ */ jsx(SelectItem, { value: "credit_expense", children: "Credit Expense" }),
          /* @__PURE__ */ jsx(SelectItem, { value: "credit_payment", children: "Credit Payment" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "rounded-xl border", children: /* @__PURE__ */ jsxs(Table, { children: [
      /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
        /* @__PURE__ */ jsx(TableHead, { children: "Paid" }),
        showMonth && /* @__PURE__ */ jsx(TableHead, { children: "Month" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Title" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Category" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Date" }),
        /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Amount" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Type" }),
        /* @__PURE__ */ jsx(TableHead, {})
      ] }) }),
      /* @__PURE__ */ jsx(TableBody, { children: pageRows.map((row) => {
        const isEditing = editingId === row.id;
        const createdDate = parseCreatedTime(row);
        const dateStr = isNaN(createdDate.getTime()) ? row.date : createdDate.toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });
        if (isEditing) {
          return /* @__PURE__ */ jsxs(TableRow, { className: "bg-muted/30", children: [
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs("label", { className: "inline-flex items-center cursor-pointer gap-2", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "checkbox",
                  checked: !!editForm.done,
                  onChange: (e) => handleChange("done", e.target.checked),
                  className: "w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                }
              ),
              /* @__PURE__ */ jsx("span", { className: "text-xs", children: editForm.done ? "Paid" : "Unpaid" })
            ] }) }),
            showMonth && /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(
              Input,
              {
                type: "text",
                value: editForm.month ?? "",
                onChange: (e) => handleChange("month", e.target.value),
                className: "h-8 text-xs"
              }
            ) }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(
              Input,
              {
                type: "text",
                value: editForm.title ?? "",
                onChange: (e) => handleChange("title", e.target.value),
                className: "h-8 text-xs"
              }
            ) }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(
              Input,
              {
                type: "text",
                value: editForm.category ?? "",
                onChange: (e) => handleChange("category", e.target.value),
                className: "h-8 text-xs"
              }
            ) }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(
              Input,
              {
                type: "text",
                value: editForm.created_time ?? "",
                onChange: (e) => handleChange("created_time", e.target.value),
                placeholder: "Created time",
                className: "h-8 text-xs"
              }
            ) }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(
              Input,
              {
                type: "number",
                value: editForm.amount ?? 0,
                onChange: (e) => handleChange("amount", Number(e.target.value)),
                className: "h-8 text-xs text-right"
              }
            ) }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs(Select, { value: editForm.type ?? "cash", onValueChange: (v) => handleChange("type", v), children: [
              /* @__PURE__ */ jsx(SelectTrigger, { className: "h-8 text-xs", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
              /* @__PURE__ */ jsx(SelectContent, { children: TYPE_OPTIONS.map((opt) => /* @__PURE__ */ jsx(SelectItem, { value: opt.value, children: opt.label }, opt.value)) })
            ] }) }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs("div", { className: "flex gap-1", children: [
              /* @__PURE__ */ jsx(Button, { size: "sm", className: "h-7 text-xs", onClick: saveEdit, children: "Save" }),
              /* @__PURE__ */ jsx(Button, { size: "sm", variant: "secondary", className: "h-7 text-xs", onClick: cancelEdit, children: "Cancel" })
            ] }) })
          ] }, row.id);
        }
        const typeClass = row.type === "cash" ? "text-blue-600 dark:text-blue-400" : row.type === "credit_payment" ? "text-amber-600 dark:text-amber-400" : "text-purple-600 dark:text-purple-400";
        const typeLabel = row.type === "cash" ? "Cash" : row.type === "credit_payment" ? "Credit Pay" : "Credit";
        return /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(
            Button,
            {
              size: "sm",
              variant: "ghost",
              onClick: async () => {
                await toggleTransactionDoneApi(row.id, !row.done);
                window.location.reload();
              },
              className: `h-7 text-xs font-semibold px-2 py-0 ${row.done ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"}`,
              children: row.done ? "Paid" : "Unpaid"
            }
          ) }),
          showMonth && /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: row.month }),
          /* @__PURE__ */ jsx(TableCell, { children: row.title }),
          /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, { variant: "secondary", children: row.category }) }),
          /* @__PURE__ */ jsx(TableCell, { className: "text-muted-foreground text-xs", children: dateStr }),
          /* @__PURE__ */ jsx(TableCell, { className: "font-medium text-right", children: formatIdr(row.amount) }),
          /* @__PURE__ */ jsx(TableCell, { className: `${typeClass} text-xs font-semibold uppercase`, children: typeLabel }),
          /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", className: "h-7 text-xs text-blue-500 hover:text-blue-700", onClick: () => startEdit(row), children: "Edit" }),
            /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", className: "h-7 text-xs text-red-500 hover:text-red-700", onClick: async () => {
              if (confirm("Delete this transaction?")) {
                await deleteTransactionApi(row.id);
                window.location.reload();
              }
            }, children: "Delete" })
          ] }) })
        ] }, row.id);
      }) })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center mt-4", children: [
      /* @__PURE__ */ jsxs("span", { className: "text-xs text-muted-foreground", children: [
        "Showing ",
        start + 1,
        "-",
        Math.min(start + rowsPerPage, filtered.length),
        " of ",
        filtered.length
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "outline",
            size: "sm",
            onClick: () => setPage((p) => Math.max(1, p - 1)),
            disabled: page === 1,
            children: "Prev"
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "outline",
            size: "sm",
            onClick: () => setPage((p) => Math.min(totalPages, p + 1)),
            disabled: page === totalPages,
            children: "Next"
          }
        )
      ] })
    ] })
  ] });
}

const $$Transactions = createComponent(($$result, $$props, $$slots) => {
  const transactions = getTransactions();
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Transactions" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-6"> <h1 class="text-2xl font-bold">Transactions</h1> <p class="text-slate-500 dark:text-slate-400 text-sm">All cash and credit expenses</p> </div> <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"> ${renderComponent($$result2, "TransactionTable", TransactionTable, { "transactions": transactions, "showMonth": true, "client:load": true, "client:component-hydration": "load", "client:component-path": "/root/self-financial-dashboard/src/components/TransactionTable", "client:component-export": "default" })} </div> ` })}`;
}, "/root/self-financial-dashboard/src/pages/transactions.astro", void 0);

const $$file = "/root/self-financial-dashboard/src/pages/transactions.astro";
const $$url = "/transactions";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Transactions,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
