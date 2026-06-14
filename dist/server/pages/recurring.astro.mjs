/* empty css                               */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BN-0jZ66.mjs';
import 'kleur/colors';
import { f as formatIdr, $ as $$Layout } from '../chunks/utils_CXkjZU_f.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
import { n as fetchRecurringTransactions, f as fetchCategories, o as updateRecurringTransactionApi, p as deleteRecurringTransactionApi, q as createRecurringTransaction } from '../chunks/api_n5hUqc9e.mjs';
import { C as Card, a as CardHeader, b as CardTitle, c as CardContent } from '../chunks/card_CxLAH05O.mjs';
import { I as Input } from '../chunks/input_D8tTzDdf.mjs';
import { B as Button } from '../chunks/button_9ql4Vl4Q.mjs';
import { L as Label } from '../chunks/label_DUNKnuNW.mjs';
import { C as Checkbox } from '../chunks/checkbox_Dx5d9wva.mjs';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from '../chunks/select_tB8UlsQW.mjs';
import { T as Table, a as TableHeader, b as TableRow, c as TableHead, d as TableBody, e as TableCell } from '../chunks/table_DkMcun2x.mjs';
export { renderers } from '../renderers.mjs';

const TYPE_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "credit_expense", label: "Credit Expense" },
  { value: "credit_payment", label: "Credit Payment" }
];
function RecurringManager() {
  const [recurring, setRecurring] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({
    title: "",
    category: "",
    amount: "",
    type: "cash",
    payment_method: "Cash",
    done: false
  });
  useEffect(() => {
    loadData();
  }, []);
  async function loadData() {
    try {
      const [r, c] = await Promise.all([fetchRecurringTransactions(), fetchCategories()]);
      setRecurring(r);
      setCategories(c);
      setError("");
    } catch (e) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }
  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };
  const saveEdit = async () => {
    if (!editForm.id) return;
    try {
      await updateRecurringTransactionApi(editForm.id, {
        title: editForm.title,
        category: editForm.category,
        amount: editForm.amount,
        type: editForm.type,
        payment_method: editForm.payment_method,
        done: editForm.done,
        active: editForm.active
      });
      setEditingId(null);
      setEditForm({});
      await loadData();
    } catch (e) {
      setError(e.message || "Failed to update");
    }
  };
  const handleDelete = async (id) => {
    if (!confirm("Delete this recurring transaction?")) return;
    try {
      await deleteRecurringTransactionApi(id);
      await loadData();
    } catch (e) {
      setError(e.message || "Failed to delete");
    }
  };
  const handleAdd = async () => {
    if (!addForm.title.trim()) {
      setError("Title is required");
      return;
    }
    if (!addForm.category.trim()) {
      setError("Category is required");
      return;
    }
    if (!addForm.amount || isNaN(Number(addForm.amount))) {
      setError("Valid amount is required");
      return;
    }
    try {
      await createRecurringTransaction({
        title: addForm.title.trim(),
        category: addForm.category.trim(),
        amount: Number(addForm.amount),
        type: addForm.type,
        payment_method: addForm.payment_method || "Cash",
        done: addForm.done,
        active: true
      });
      setAddForm({ title: "", category: "", amount: "", type: "cash", payment_method: "Cash", done: false });
      setIsAdding(false);
      setError("");
      await loadData();
    } catch (e) {
      setError(e.message || "Failed to create");
    }
  };
  const toggleActive = async (item) => {
    try {
      await updateRecurringTransactionApi(item.id, { active: !item.active });
      await loadData();
    } catch (e) {
      setError(e.message || "Failed to toggle");
    }
  };
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsxs(CardHeader, { className: "flex flex-row items-center justify-between", children: [
      /* @__PURE__ */ jsx(CardTitle, { children: "Recurring Transactions" }),
      /* @__PURE__ */ jsx(Button, { size: "sm", onClick: () => setIsAdding((v) => !v), children: isAdding ? "Cancel" : "+ Add Recurring" })
    ] }),
    /* @__PURE__ */ jsxs(CardContent, { children: [
      error && /* @__PURE__ */ jsx("div", { className: "mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300", children: error }),
      isAdding && /* @__PURE__ */ jsxs("div", { className: "mb-6 rounded-lg border p-4 space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
            /* @__PURE__ */ jsx(Label, { children: "Title" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                type: "text",
                value: addForm.title,
                onChange: (e) => setAddForm((p) => ({ ...p, title: e.target.value })),
                placeholder: "e.g. Rent"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
            /* @__PURE__ */ jsx(Label, { children: "Category" }),
            /* @__PURE__ */ jsxs(Select, { value: addForm.category, onValueChange: (v) => setAddForm((p) => ({ ...p, category: v })), children: [
              /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Select category" }) }),
              /* @__PURE__ */ jsx(SelectContent, { children: categories.map((c) => /* @__PURE__ */ jsx(SelectItem, { value: c.name, children: c.name }, c.id)) })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
            /* @__PURE__ */ jsx(Label, { children: "Amount (IDR)" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                type: "number",
                value: addForm.amount,
                onChange: (e) => setAddForm((p) => ({ ...p, amount: e.target.value })),
                placeholder: "0"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
            /* @__PURE__ */ jsx(Label, { children: "Type" }),
            /* @__PURE__ */ jsxs(Select, { value: addForm.type, onValueChange: (v) => setAddForm((p) => ({ ...p, type: v })), children: [
              /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
              /* @__PURE__ */ jsx(SelectContent, { children: TYPE_OPTIONS.map((opt) => /* @__PURE__ */ jsx(SelectItem, { value: opt.value, children: opt.label }, opt.value)) })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
            /* @__PURE__ */ jsx(Label, { children: "Payment Method" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                type: "text",
                value: addForm.payment_method,
                onChange: (e) => setAddForm((p) => ({ ...p, payment_method: e.target.value })),
                placeholder: "e.g. Cash, BCA"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 pt-6", children: [
            /* @__PURE__ */ jsx(
              Checkbox,
              {
                id: "add-done",
                checked: addForm.done,
                onCheckedChange: (v) => setAddForm((p) => ({ ...p, done: !!v }))
              }
            ),
            /* @__PURE__ */ jsx(Label, { htmlFor: "add-done", className: "cursor-pointer", children: "Mark as paid (for credit expenses)" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsx(Button, { size: "sm", onClick: handleAdd, children: "Save Recurring" }) })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "rounded-xl border", children: /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { children: "Active" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Title" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Category" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Amount" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Type" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Paid" }),
          /* @__PURE__ */ jsx(TableHead, { className: "w-32" })
        ] }) }),
        /* @__PURE__ */ jsx(TableBody, { children: loading ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 7, className: "text-center text-muted-foreground py-6", children: "Loading..." }) }) : recurring.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 7, className: "text-center text-muted-foreground py-6", children: "No recurring transactions yet. Add one above." }) }) : recurring.map((item) => {
          const isEditing = editingId === item.id;
          if (isEditing) {
            return /* @__PURE__ */ jsxs(TableRow, { className: "bg-muted/30", children: [
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(
                Checkbox,
                {
                  checked: !!editForm.active,
                  onCheckedChange: (v) => setEditForm((p) => ({ ...p, active: !!v }))
                }
              ) }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(
                Input,
                {
                  type: "text",
                  value: editForm.title ?? "",
                  onChange: (e) => setEditForm((p) => ({ ...p, title: e.target.value })),
                  className: "h-8 text-xs"
                }
              ) }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs(
                Select,
                {
                  value: editForm.category ?? "",
                  onValueChange: (v) => setEditForm((p) => ({ ...p, category: v })),
                  children: [
                    /* @__PURE__ */ jsx(SelectTrigger, { className: "h-8 text-xs", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
                    /* @__PURE__ */ jsx(SelectContent, { children: categories.map((c) => /* @__PURE__ */ jsx(SelectItem, { value: c.name, children: c.name }, c.id)) })
                  ]
                }
              ) }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(
                Input,
                {
                  type: "number",
                  value: editForm.amount ?? 0,
                  onChange: (e) => setEditForm((p) => ({ ...p, amount: Number(e.target.value) })),
                  className: "h-8 text-xs text-right"
                }
              ) }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs(
                Select,
                {
                  value: editForm.type ?? "cash",
                  onValueChange: (v) => setEditForm((p) => ({ ...p, type: v })),
                  children: [
                    /* @__PURE__ */ jsx(SelectTrigger, { className: "h-8 text-xs", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
                    /* @__PURE__ */ jsx(SelectContent, { children: TYPE_OPTIONS.map((opt) => /* @__PURE__ */ jsx(SelectItem, { value: opt.value, children: opt.label }, opt.value)) })
                  ]
                }
              ) }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(
                Checkbox,
                {
                  checked: !!editForm.done,
                  onCheckedChange: (v) => setEditForm((p) => ({ ...p, done: !!v }))
                }
              ) }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs("div", { className: "flex gap-1", children: [
                /* @__PURE__ */ jsx(Button, { size: "sm", className: "h-7 text-xs", onClick: saveEdit, children: "Save" }),
                /* @__PURE__ */ jsx(Button, { size: "sm", variant: "secondary", className: "h-7 text-xs", onClick: cancelEdit, children: "Cancel" })
              ] }) })
            ] }, item.id);
          }
          return /* @__PURE__ */ jsxs(TableRow, { className: !item.active ? "opacity-60" : void 0, children: [
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(
              Checkbox,
              {
                checked: item.active,
                onCheckedChange: () => toggleActive(item)
              }
            ) }),
            /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: item.title }),
            /* @__PURE__ */ jsx(TableCell, { children: item.category }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: formatIdr(item.amount) }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-xs", children: item.type === "cash" ? "Cash" : item.type === "credit_expense" ? "Credit" : "Credit Pay" }),
            /* @__PURE__ */ jsx(TableCell, { children: item.done ? /* @__PURE__ */ jsx("span", { className: "text-xs text-emerald-600 font-medium", children: "Paid" }) : /* @__PURE__ */ jsx("span", { className: "text-xs text-slate-400", children: "—" }) }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", className: "h-7 text-xs text-blue-500 hover:text-blue-700", onClick: () => startEdit(item), children: "Edit" }),
              /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", className: "h-7 text-xs text-red-500 hover:text-red-700", onClick: () => handleDelete(item.id), children: "Delete" })
            ] }) })
          ] }, item.id);
        }) })
      ] }) })
    ] })
  ] });
}

const $$Recurring = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Recurring - Financial Dashboard" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="space-y-6"> <div> <h1 class="text-2xl font-bold">Recurring Transactions</h1> <p class="text-slate-500 dark:text-slate-400 text-sm">
Manage transactions that are automatically created each new month.
</p> </div> ${renderComponent($$result2, "RecurringManager", RecurringManager, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/RecurringManager", "client:component-export": "default" })} </div> ` })}`;
}, "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/recurring.astro", void 0);

const $$file = "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/recurring.astro";
const $$url = "/recurring";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Recurring,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
