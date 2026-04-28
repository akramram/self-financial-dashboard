/* empty css                               */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BVE5k6Zu.mjs';
import 'kleur/colors';
import { f as formatIdr, $ as $$Layout } from '../chunks/utils_BtLgDIxw.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { useState, useMemo } from 'react';
import { t as toggleTransactionDoneApi, d as deleteTransactionApi, b as updateTransactionApi } from '../chunks/api_DIaGD6bk.mjs';
import { g as getTransactions } from '../chunks/db_BnTmBRTu.mjs';
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
        "input",
        {
          type: "text",
          placeholder: "Search title or category...",
          value: search,
          onChange: (e) => {
            setSearch(e.target.value);
            setPage(1);
          },
          className: "px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm flex-1"
        }
      ),
      /* @__PURE__ */ jsxs(
        "select",
        {
          value: filterType,
          onChange: (e) => {
            setFilterType(e.target.value);
            setPage(1);
          },
          className: "px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm",
          children: [
            /* @__PURE__ */ jsx("option", { value: "all", children: "All Types" }),
            /* @__PURE__ */ jsx("option", { value: "cash", children: "Cash" }),
            /* @__PURE__ */ jsx("option", { value: "credit_expense", children: "Credit Expense" }),
            /* @__PURE__ */ jsx("option", { value: "credit_payment", children: "Credit Payment" })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsx("div", { className: "overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-sm text-left", children: [
      /* @__PURE__ */ jsx("thead", { className: "bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 uppercase text-xs", children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Paid" }),
        showMonth && /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Month" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Title" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Category" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Date" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium text-right", children: "Amount" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Type" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-slate-200 dark:divide-slate-700", children: pageRows.map((row) => {
        const isEditing = editingId === row.id;
        const createdDate = parseCreatedTime(row);
        const dateStr = isNaN(createdDate.getTime()) ? row.date : createdDate.toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });
        if (isEditing) {
          return /* @__PURE__ */ jsxs("tr", { className: "bg-slate-50 dark:bg-slate-700/30", children: [
            /* @__PURE__ */ jsx("td", { className: "px-4 py-2", children: /* @__PURE__ */ jsxs("label", { className: "inline-flex items-center cursor-pointer", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "checkbox",
                  checked: !!editForm.done,
                  onChange: (e) => handleChange("done", e.target.checked),
                  className: "w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                }
              ),
              /* @__PURE__ */ jsx("span", { className: "ml-2 text-xs", children: editForm.done ? "Paid" : "Unpaid" })
            ] }) }),
            showMonth && /* @__PURE__ */ jsx("td", { className: "px-4 py-2", children: /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                value: editForm.month ?? "",
                onChange: (e) => handleChange("month", e.target.value),
                className: "w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
              }
            ) }),
            /* @__PURE__ */ jsx("td", { className: "px-4 py-2", children: /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                value: editForm.title ?? "",
                onChange: (e) => handleChange("title", e.target.value),
                className: "w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
              }
            ) }),
            /* @__PURE__ */ jsx("td", { className: "px-4 py-2", children: /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                value: editForm.category ?? "",
                onChange: (e) => handleChange("category", e.target.value),
                className: "w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
              }
            ) }),
            /* @__PURE__ */ jsx("td", { className: "px-4 py-2", children: /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                value: editForm.created_time ?? "",
                onChange: (e) => handleChange("created_time", e.target.value),
                placeholder: "Created time",
                className: "w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
              }
            ) }),
            /* @__PURE__ */ jsx("td", { className: "px-4 py-2", children: /* @__PURE__ */ jsx(
              "input",
              {
                type: "number",
                value: editForm.amount ?? 0,
                onChange: (e) => handleChange("amount", Number(e.target.value)),
                className: "w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-right"
              }
            ) }),
            /* @__PURE__ */ jsx("td", { className: "px-4 py-2", children: /* @__PURE__ */ jsx(
              "select",
              {
                value: editForm.type ?? "cash",
                onChange: (e) => handleChange("type", e.target.value),
                className: "w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs",
                children: TYPE_OPTIONS.map((opt) => /* @__PURE__ */ jsx("option", { value: opt.value, children: opt.label }, opt.value))
              }
            ) }),
            /* @__PURE__ */ jsx("td", { className: "px-4 py-2", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-1", children: [
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: saveEdit,
                  className: "px-2 py-1 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-700",
                  children: "Save"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: cancelEdit,
                  className: "px-2 py-1 rounded bg-slate-300 dark:bg-slate-600 text-xs hover:bg-slate-400 dark:hover:bg-slate-500",
                  children: "Cancel"
                }
              )
            ] }) })
          ] }, row.id);
        }
        const typeClass = row.type === "cash" ? "text-blue-600 dark:text-blue-400" : row.type === "credit_payment" ? "text-amber-600 dark:text-amber-400" : "text-purple-600 dark:text-purple-400";
        const typeLabel = row.type === "cash" ? "Cash" : row.type === "credit_payment" ? "Credit Pay" : "Credit";
        return /* @__PURE__ */ jsxs("tr", { className: "hover:bg-slate-50 dark:hover:bg-slate-700/30", children: [
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsx(
            "button",
            {
              onClick: async () => {
                await toggleTransactionDoneApi(row.id, !row.done);
                window.location.reload();
              },
              className: `px-2 py-1 rounded text-xs font-semibold transition-colors ${row.done ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"}`,
              children: row.done ? "Paid" : "Unpaid"
            }
          ) }),
          showMonth && /* @__PURE__ */ jsx("td", { className: "px-4 py-3 font-medium", children: row.month }),
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: row.title }),
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsx("span", { className: "px-2 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-700", children: row.category }) }),
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-slate-500 dark:text-slate-400 text-xs", children: dateStr }),
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3 font-medium text-right", children: formatIdr(row.amount) }),
          /* @__PURE__ */ jsx("td", { className: `px-4 py-3 ${typeClass} text-xs font-semibold uppercase`, children: typeLabel }),
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => startEdit(row),
                className: "text-blue-500 hover:text-blue-700 text-xs",
                children: "Edit"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: async () => {
                  if (confirm("Delete this transaction?")) {
                    await deleteTransactionApi(row.id);
                    window.location.reload();
                  }
                },
                className: "text-red-500 hover:text-red-700 text-xs",
                children: "Delete"
              }
            )
          ] }) })
        ] }, row.id);
      }) })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center mt-4", children: [
      /* @__PURE__ */ jsxs("span", { className: "text-xs text-slate-500 dark:text-slate-400", children: [
        "Showing ",
        start + 1,
        "-",
        Math.min(start + rowsPerPage, filtered.length),
        " of ",
        filtered.length
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setPage((p) => Math.max(1, p - 1)),
            disabled: page === 1,
            className: "px-3 py-1 rounded bg-slate-200 dark:bg-slate-700 text-xs hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50",
            children: "Prev"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setPage((p) => Math.min(totalPages, p + 1)),
            disabled: page === totalPages,
            className: "px-3 py-1 rounded bg-slate-200 dark:bg-slate-700 text-xs hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50",
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
