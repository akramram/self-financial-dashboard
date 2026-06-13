/* empty css                               */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BN-0jZ66.mjs';
import 'kleur/colors';
import { f as formatIdr, $ as $$Layout } from '../chunks/utils_Blj5YLOJ.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { f as fetchCategories, A as toggleTransactionDoneApi, B as deleteTransactionApi, C as updateTransactionApi, D as deleteTransactionsBulkApi, E as updateTransactionsBulkApi } from '../chunks/api_BDzHS_4o.mjs';
import { u as useSortState, S as SortableHeader } from '../chunks/SortableHeader_CFrJuLsX.mjs';
import { E as EditTransactionDialog } from '../chunks/EditTransactionDialog_BMEoXFU2.mjs';
import { StickyNote } from 'lucide-react';
import { T as Table, a as TableHeader, b as TableRow, c as TableHead, d as TableBody, e as TableCell } from '../chunks/table_C3KRA4ed.mjs';
import { I as Input } from '../chunks/input_oLb95eej.mjs';
import { B as Button } from '../chunks/button_Vng4eZC1.mjs';
import { B as Badge } from '../chunks/badge_CkSn0lpM.mjs';
import { C as Checkbox } from '../chunks/checkbox_CDAgyxgq.mjs';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from '../chunks/select_CRipy8Bp.mjs';
import { n as getTransactions } from '../chunks/db_D20tYf13.mjs';
export { renderers } from '../renderers.mjs';

function parseCreatedTime(tx) {
  if (tx.created_time) {
    const d = new Date(tx.created_time);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(tx.date);
}
function TransactionTable({ transactions, showMonth = true }) {
  const getInitialState = () => {
    if (typeof window === "undefined") return { page: 1, filterType: "all", filterMonth: "all", search: "", dateFrom: "", dateTo: "", amountMin: "", amountMax: "" };
    const params = new URLSearchParams(window.location.search);
    return {
      page: Math.max(1, parseInt(params.get("page") || "1", 10) || 1),
      filterType: params.get("type") || "all",
      filterMonth: params.get("month") || "all",
      search: params.get("search") || "",
      dateFrom: params.get("dateFrom") || "",
      dateTo: params.get("dateTo") || "",
      amountMin: params.get("amountMin") || "",
      amountMax: params.get("amountMax") || ""
    };
  };
  const initial = getInitialState();
  const [page, setPage] = useState(initial.page);
  const [filterType, setFilterType] = useState(initial.filterType);
  const [filterMonth, setFilterMonth] = useState(initial.filterMonth);
  const [search, setSearch] = useState(initial.search);
  const [dateFrom, setDateFrom] = useState(initial.dateFrom);
  const [dateTo, setDateTo] = useState(initial.dateTo);
  const [amountMin, setAmountMin] = useState(initial.amountMin);
  const [amountMax, setAmountMax] = useState(initial.amountMax);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [selected, setSelected] = useState(/* @__PURE__ */ new Set());
  const [bulkCategory, setBulkCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const rowsPerPage = 25;
  const { toggleSort, sortData, isSorted } = useSortState();
  const getCellValue = useCallback((t, key) => {
    switch (key) {
      case "paid":
        return t.done ? 1 : 0;
      case "month":
        return t.month;
      case "title":
        return t.title;
      case "category":
        return t.category;
      case "date":
        return new Date(t.created_time || t.date).getTime();
      case "amount":
        return t.amount;
      case "type":
        return t.type;
      default:
        return "";
    }
  }, []);
  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {
    });
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (page > 1) params.set("page", String(page));
    else params.delete("page");
    if (filterType !== "all") params.set("type", filterType);
    else params.delete("type");
    if (filterMonth !== "all") params.set("month", filterMonth);
    else params.delete("month");
    if (search.trim()) params.set("search", search.trim());
    else params.delete("search");
    if (dateFrom) params.set("dateFrom", dateFrom);
    else params.delete("dateFrom");
    if (dateTo) params.set("dateTo", dateTo);
    else params.delete("dateTo");
    if (amountMin) params.set("amountMin", amountMin);
    else params.delete("amountMin");
    if (amountMax) params.set("amountMax", amountMax);
    else params.delete("amountMax");
    const newUrl = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
    window.history.replaceState({}, "", newUrl);
  }, [page, filterType, filterMonth, search, dateFrom, dateTo, amountMin, amountMax]);
  const categoryMap = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      map[c.name] = c;
    });
    return map;
  }, [categories]);
  const monthOptions = useMemo(() => {
    const set = /* @__PURE__ */ new Set();
    transactions.forEach((t) => {
      if (t.month) set.add(t.month);
    });
    return Array.from(set).sort((a, b) => {
      const da = new Date(a);
      const db = new Date(b);
      return db.getTime() - da.getTime();
    });
  }, [transactions]);
  const sorted = useMemo(() => {
    return sortData(
      transactions,
      getCellValue,
      (data) => [...data].sort((a, b) => parseCreatedTime(b).getTime() - parseCreatedTime(a).getTime())
    );
  }, [transactions, sortData, getCellValue]);
  let filtered = sorted;
  if (filterType !== "all") {
    filtered = filtered.filter((t) => t.type === filterType);
  }
  if (filterMonth !== "all") {
    filtered = filtered.filter((t) => t.month === filterMonth);
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (t) => t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || (t.notes || "").toLowerCase().includes(q)
    );
  }
  if (dateFrom) {
    const fromTime = new Date(dateFrom).getTime();
    filtered = filtered.filter((t) => new Date(t.date).getTime() >= fromTime);
  }
  if (dateTo) {
    const toTime = new Date(dateTo).getTime();
    filtered = filtered.filter((t) => new Date(t.date).getTime() <= toTime);
  }
  if (amountMin) {
    const min = Number(amountMin);
    if (!isNaN(min)) filtered = filtered.filter((t) => t.amount >= min);
  }
  if (amountMax) {
    const max = Number(amountMax);
    if (!isNaN(max)) filtered = filtered.filter((t) => t.amount <= max);
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
  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    const allSelected = pageRows.every((r) => selected.has(r.id));
    setSelected((prev) => {
      const next = new Set(prev);
      pageRows.forEach((r) => {
        if (allSelected) next.delete(r.id);
        else next.add(r.id);
      });
      return next;
    });
  };
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} transactions?`)) return;
    await deleteTransactionsBulkApi(Array.from(selected));
    setSelected(/* @__PURE__ */ new Set());
    window.location.reload();
  };
  const handleBulkCategoryChange = async (newCategory) => {
    if (!newCategory || selected.size === 0) return;
    if (!confirm(`Reassign ${selected.size} transaction(s) to category "${newCategory}"?`)) return;
    await updateTransactionsBulkApi(Array.from(selected), { category: newCategory });
    setBulkCategory("");
    setSelected(/* @__PURE__ */ new Set());
    window.location.reload();
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
      ] }),
      /* @__PURE__ */ jsxs(Select, { value: filterMonth, onValueChange: (v) => {
        setFilterMonth(v);
        setPage(1);
      }, children: [
        /* @__PURE__ */ jsx(SelectTrigger, { className: "w-[180px]", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "All Months" }) }),
        /* @__PURE__ */ jsxs(SelectContent, { children: [
          /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "All Months" }),
          monthOptions.map((m) => /* @__PURE__ */ jsx(SelectItem, { value: m, children: m }, m))
        ] })
      ] }),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "sm",
          variant: "outline",
          onClick: () => {
            const exportData = filtered.map((t) => ({
              date: t.date,
              description: t.title,
              amount: t.amount,
              type: t.type,
              category: t.category,
              paid: t.done,
              notes: t.notes || ""
            }));
            if (exportData.length === 0) {
              alert("No transactions found for this month");
              return;
            }
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            const fileName = filterMonth !== "all" ? `transactions-${filterMonth}.json` : "transactions-all.json";
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          },
          children: "Export JSON"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row gap-3 mb-4", children: [
      /* @__PURE__ */ jsx(
        Input,
        {
          type: "date",
          placeholder: "From date",
          value: dateFrom,
          onChange: (e) => {
            setDateFrom(e.target.value);
            setPage(1);
          },
          className: "w-full sm:w-[150px]"
        }
      ),
      /* @__PURE__ */ jsx(
        Input,
        {
          type: "date",
          placeholder: "To date",
          value: dateTo,
          onChange: (e) => {
            setDateTo(e.target.value);
            setPage(1);
          },
          className: "w-full sm:w-[150px]"
        }
      ),
      /* @__PURE__ */ jsx(
        Input,
        {
          type: "number",
          placeholder: "Min amount",
          value: amountMin,
          onChange: (e) => {
            setAmountMin(e.target.value);
            setPage(1);
          },
          className: "w-full sm:w-[130px]"
        }
      ),
      /* @__PURE__ */ jsx(
        Input,
        {
          type: "number",
          placeholder: "Max amount",
          value: amountMax,
          onChange: (e) => {
            setAmountMax(e.target.value);
            setPage(1);
          },
          className: "w-full sm:w-[130px]"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "sm",
          variant: "secondary",
          onClick: () => {
            setDateFrom("");
            setDateTo("");
            setAmountMin("");
            setAmountMax("");
            setPage(1);
          },
          className: "shrink-0",
          children: "Clear Ranges"
        }
      )
    ] }),
    selected.size > 0 && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mb-3 flex-wrap", children: [
      /* @__PURE__ */ jsxs("span", { className: "text-sm text-slate-600 dark:text-slate-300", children: [
        selected.size,
        " selected"
      ] }),
      /* @__PURE__ */ jsxs(Select, { value: bulkCategory, onValueChange: handleBulkCategoryChange, children: [
        /* @__PURE__ */ jsx(SelectTrigger, { className: "w-[200px]", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Reassign category..." }) }),
        /* @__PURE__ */ jsx(SelectContent, { children: categories.map((cat) => /* @__PURE__ */ jsx(SelectItem, { value: cat.name, children: cat.name }, cat.name)) })
      ] }),
      /* @__PURE__ */ jsx(Button, { size: "sm", variant: "destructive", onClick: handleBulkDelete, children: "Delete Selected" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "rounded-xl border", children: /* @__PURE__ */ jsxs(Table, { children: [
      /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
        /* @__PURE__ */ jsx(TableHead, { className: "w-10", children: /* @__PURE__ */ jsx(
          Checkbox,
          {
            checked: pageRows.length > 0 && pageRows.every((r) => selected.has(r.id)),
            onCheckedChange: toggleSelectAll,
            "aria-label": "Select all"
          }
        ) }),
        /* @__PURE__ */ jsx(SortableHeader, { sortKey: "paid", currentDirection: isSorted("paid"), onSort: toggleSort, children: "Paid" }),
        showMonth && /* @__PURE__ */ jsx(SortableHeader, { sortKey: "month", currentDirection: isSorted("month"), onSort: toggleSort, children: "Month" }),
        /* @__PURE__ */ jsx(SortableHeader, { sortKey: "title", currentDirection: isSorted("title"), onSort: toggleSort, children: "Title" }),
        /* @__PURE__ */ jsx(SortableHeader, { sortKey: "category", currentDirection: isSorted("category"), onSort: toggleSort, children: "Category" }),
        /* @__PURE__ */ jsx(SortableHeader, { sortKey: "date", currentDirection: isSorted("date"), onSort: toggleSort, children: "Date" }),
        /* @__PURE__ */ jsx(SortableHeader, { sortKey: "amount", currentDirection: isSorted("amount"), onSort: toggleSort, className: "text-right", children: "Amount" }),
        /* @__PURE__ */ jsx(SortableHeader, { sortKey: "type", currentDirection: isSorted("type"), onSort: toggleSort, children: "Type" }),
        /* @__PURE__ */ jsx(TableHead, {})
      ] }) }),
      /* @__PURE__ */ jsx(TableBody, { children: pageRows.map((row) => {
        const createdDate = parseCreatedTime(row);
        const dateStr = isNaN(createdDate.getTime()) ? row.date : createdDate.toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });
        const typeClass = row.type === "cash" ? "text-blue-600 dark:text-blue-400" : row.type === "credit_payment" ? "text-amber-600 dark:text-amber-400" : "text-purple-600 dark:text-purple-400";
        const typeLabel = row.type === "cash" ? "Cash" : row.type === "credit_payment" ? "Credit Pay" : "Credit";
        return /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(
            Checkbox,
            {
              checked: selected.has(row.id),
              onCheckedChange: () => toggleSelect(row.id),
              "aria-label": `Select ${row.title}`
            }
          ) }),
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
          /* @__PURE__ */ jsxs(TableCell, { children: [
            /* @__PURE__ */ jsx("span", { children: row.title }),
            row.notes && /* @__PURE__ */ jsx("span", { className: "inline-flex ml-1.5 align-middle", title: row.notes, children: /* @__PURE__ */ jsx(StickyNote, { className: "w-3.5 h-3.5 text-amber-500 dark:text-amber-400 inline" }) })
          ] }),
          /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(
            Badge,
            {
              variant: "secondary",
              style: {
                backgroundColor: categoryMap[row.category]?.color || void 0,
                color: categoryMap[row.category]?.color ? "#fff" : void 0
              },
              children: row.category
            }
          ) }),
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
    ] }),
    /* @__PURE__ */ jsx(
      EditTransactionDialog,
      {
        open: editingId !== null,
        transaction: editForm,
        onChange: handleChange,
        onSave: saveEdit,
        onCancel: cancelEdit,
        showMonth,
        months: monthOptions,
        categories: categories.map((c) => c.name)
      }
    )
  ] });
}

const $$Transactions = createComponent(($$result, $$props, $$slots) => {
  const transactions = getTransactions();
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Transactions" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-6"> <h1 class="text-2xl font-bold">Transactions</h1> <p class="text-slate-500 dark:text-slate-400 text-sm">All cash and credit expenses</p> </div> <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"> ${renderComponent($$result2, "TransactionTable", TransactionTable, { "transactions": transactions, "showMonth": true, "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/TransactionTable", "client:component-export": "default" })} </div> ` })}`;
}, "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/transactions.astro", void 0);

const $$file = "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/transactions.astro";
const $$url = "/transactions";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Transactions,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
