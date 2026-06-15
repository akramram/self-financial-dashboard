/* empty css                               */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BN-0jZ66.mjs';
import 'kleur/colors';
import { f as formatIdr, $ as $$Layout } from '../chunks/utils_CS_NAiYc.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { f as fetchCategories, v as toggleTransactionDoneApi, w as deleteTransactionApi, x as updateTransactionApi, y as deleteTransactionsBulkApi, z as updateTransactionsBulkApi } from '../chunks/api_CEy8D9Rv.mjs';
import { u as useSortState, S as SortableHeader } from '../chunks/SortableHeader_xUJEDrNx.mjs';
import { E as EditTransactionDialog } from '../chunks/EditTransactionDialog_T9YLY7qh.mjs';
import { StickyNote } from 'lucide-react';
import { T as Table, a as TableHeader, b as TableRow, c as TableHead, d as TableBody, e as TableCell } from '../chunks/table_DAWfnRUr.mjs';
import { I as Input } from '../chunks/input_6zQN70xj.mjs';
import { B as Button } from '../chunks/button_uxMUSjfb.mjs';
import { B as Badge } from '../chunks/badge_BUvRBBXW.mjs';
import { C as Checkbox } from '../chunks/checkbox_NvLsOild.mjs';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from '../chunks/select_DWTbmS1e.mjs';
import { p as getTransactions, o as getAllPeriods } from '../chunks/db_B4_3wji-.mjs';
export { renderers } from '../renderers.mjs';

function parseCreatedTime(tx) {
  if (tx.created_time) {
    const d = new Date(tx.created_time);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(tx.date);
}
function TransactionTable({ transactions, showMonth = true, periods = [] }) {
  const periodIdToMonth = useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    periods.forEach((p) => map.set(p.period_id, p.month));
    return map;
  }, [periods]);
  const monthOptions = useMemo(() => {
    return [...periods].sort((a, b) => b.period_id - a.period_id);
  }, [periods]);
  const getInitialState = () => {
    if (typeof window === "undefined") return { page: 1, filterType: "all", filterPeriodId: "all", search: "", dateFrom: "", dateTo: "", amountMin: "", amountMax: "" };
    const params = new URLSearchParams(window.location.search);
    return {
      page: Math.max(1, parseInt(params.get("page") || "1", 10) || 1),
      filterType: params.get("type") || "all",
      filterPeriodId: params.get("period_id") || "all",
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
  const [filterPeriodId, setFilterPeriodId] = useState(initial.filterPeriodId);
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
        return periodIdToMonth.get(t.period_id) || "";
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
  }, [periodIdToMonth]);
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
    if (filterPeriodId !== "all") params.set("period_id", filterPeriodId);
    else params.delete("period_id");
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
    const qs = params.toString();
    const url = window.location.pathname + (qs ? "?" + qs : "");
    window.history.replaceState(null, "", url);
  }, [page, filterType, filterPeriodId, search, dateFrom, dateTo, amountMin, amountMax]);
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
  if (filterPeriodId !== "all") {
    const pid = parseInt(filterPeriodId, 10);
    filtered = filtered.filter((t) => t.period_id === pid);
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
    const min = parseFloat(amountMin);
    if (!isNaN(min)) filtered = filtered.filter((t) => t.amount >= min);
  }
  if (amountMax) {
    const max = parseFloat(amountMax);
    if (!isNaN(max)) filtered = filtered.filter((t) => t.amount <= max);
  }
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);
  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selected.size === pageRows.length) {
      setSelected(/* @__PURE__ */ new Set());
    } else {
      setSelected(new Set(pageRows.map((r) => r.id)));
    }
  };
  const handleSave = async () => {
    if (!editingId) return;
    const { id, ...updates } = editForm;
    if (updates.period_id) updates.period_id = Number(updates.period_id);
    await updateTransactionApi(editingId, updates);
    setEditingId(null);
    setEditForm({});
    window.location.reload();
  };
  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} transactions?`)) return;
    await deleteTransactionsBulkApi(Array.from(selected));
    setSelected(/* @__PURE__ */ new Set());
    window.location.reload();
  };
  const handleBulkCategory = async () => {
    if (selected.size === 0 || !bulkCategory) return;
    await updateTransactionsBulkApi(Array.from(selected), { category: bulkCategory });
    setSelected(/* @__PURE__ */ new Set());
    setBulkCategory("");
    window.location.reload();
  };
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row gap-3 mb-4", children: [
      /* @__PURE__ */ jsx(
        Input,
        {
          placeholder: "Search title or category...",
          value: search,
          onChange: (e) => {
            setSearch(e.target.value);
            setPage(1);
          },
          className: "max-w-xs"
        }
      ),
      /* @__PURE__ */ jsxs(Select, { value: filterType, onValueChange: (v) => {
        setFilterType(v);
        setPage(1);
      }, children: [
        /* @__PURE__ */ jsx(SelectTrigger, { className: "w-[140px]", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "All Types" }) }),
        /* @__PURE__ */ jsxs(SelectContent, { children: [
          /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "All Types" }),
          /* @__PURE__ */ jsx(SelectItem, { value: "cash", children: "Cash" }),
          /* @__PURE__ */ jsx(SelectItem, { value: "credit_expense", children: "Credit Expense" }),
          /* @__PURE__ */ jsx(SelectItem, { value: "credit_payment", children: "Credit Payment" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Select, { value: filterPeriodId, onValueChange: (v) => {
        setFilterPeriodId(v);
        setPage(1);
      }, children: [
        /* @__PURE__ */ jsx(SelectTrigger, { className: "w-[180px]", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "All Periods" }) }),
        /* @__PURE__ */ jsxs(SelectContent, { children: [
          /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "All Periods" }),
          monthOptions.map((p) => /* @__PURE__ */ jsx(SelectItem, { value: p.period_id.toString(), children: p.month }, p.period_id))
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
              notes: t.notes || "",
              period: periodIdToMonth.get(t.period_id) || ""
            }));
            if (exportData.length === 0) {
              alert("No transactions found for this period");
              return;
            }
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            const fileName = filterPeriodId !== "all" ? `transactions-${filterPeriodId}.json` : "transactions-all.json";
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
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2 items-center", children: [
        /* @__PURE__ */ jsx("label", { className: "text-xs text-slate-500", children: "From" }),
        /* @__PURE__ */ jsx(Input, { type: "date", value: dateFrom, onChange: (e) => {
          setDateFrom(e.target.value);
          setPage(1);
        }, className: "w-auto text-xs" }),
        /* @__PURE__ */ jsx("label", { className: "text-xs text-slate-500", children: "To" }),
        /* @__PURE__ */ jsx(Input, { type: "date", value: dateTo, onChange: (e) => {
          setDateTo(e.target.value);
          setPage(1);
        }, className: "w-auto text-xs" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2 items-center", children: [
        /* @__PURE__ */ jsx("label", { className: "text-xs text-slate-500", children: "Min" }),
        /* @__PURE__ */ jsx(Input, { type: "number", placeholder: "Amount", value: amountMin, onChange: (e) => {
          setAmountMin(e.target.value);
          setPage(1);
        }, className: "w-28 text-xs" }),
        /* @__PURE__ */ jsx("label", { className: "text-xs text-slate-500", children: "Max" }),
        /* @__PURE__ */ jsx(Input, { type: "number", placeholder: "Amount", value: amountMax, onChange: (e) => {
          setAmountMax(e.target.value);
          setPage(1);
        }, className: "w-28 text-xs" })
      ] })
    ] }),
    selected.size > 0 && /* @__PURE__ */ jsxs("div", { className: "flex gap-2 mb-4 items-center", children: [
      /* @__PURE__ */ jsxs("span", { className: "text-xs text-slate-500", children: [
        selected.size,
        " selected"
      ] }),
      /* @__PURE__ */ jsxs(
        "select",
        {
          value: bulkCategory,
          onChange: (e) => setBulkCategory(e.target.value),
          className: "text-xs border rounded px-2 py-1",
          children: [
            /* @__PURE__ */ jsx("option", { value: "", children: "Change category..." }),
            categories.map((c) => /* @__PURE__ */ jsx("option", { value: c.name, children: c.name }, c.id))
          ]
        }
      ),
      /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", onClick: handleBulkCategory, disabled: !bulkCategory, children: "Apply" }),
      /* @__PURE__ */ jsx(Button, { size: "sm", variant: "destructive", onClick: handleBulkDelete, children: "Delete" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs(Table, { children: [
      /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
        /* @__PURE__ */ jsx(TableHead, { className: "w-10", children: /* @__PURE__ */ jsx(
          Checkbox,
          {
            checked: selected.size === pageRows.length && pageRows.length > 0,
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
          showMonth && /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: periodIdToMonth.get(row.period_id) || "" }),
          /* @__PURE__ */ jsxs(TableCell, { children: [
            /* @__PURE__ */ jsx("span", { children: row.title }),
            row.notes && /* @__PURE__ */ jsx(StickyNote, { className: "inline ml-1.5 align-middle w-3.5 h-3.5 text-amber-500 dark:text-amber-400", title: row.notes })
          ] }),
          /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, { variant: "secondary", children: row.category }) }),
          /* @__PURE__ */ jsx(TableCell, { className: "text-muted-foreground text-xs", children: dateStr }),
          /* @__PURE__ */ jsx(TableCell, { className: "font-medium text-right", children: formatIdr(row.amount) }),
          /* @__PURE__ */ jsx(TableCell, { className: `${typeClass} text-xs font-semibold uppercase`, children: typeLabel }),
          /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsx(
              Button,
              {
                size: "sm",
                variant: "ghost",
                onClick: () => {
                  setEditingId(row.id);
                  setEditForm({ ...row });
                },
                className: "h-7 text-xs text-blue-500 hover:text-blue-700",
                children: "Edit"
              }
            ),
            /* @__PURE__ */ jsx(
              Button,
              {
                size: "sm",
                variant: "ghost",
                onClick: async () => {
                  if (!confirm("Delete?")) return;
                  await deleteTransactionApi(row.id);
                  window.location.reload();
                },
                className: "h-7 text-xs text-red-500 hover:text-red-700",
                children: "Delete"
              }
            )
          ] }) })
        ] }, row.id);
      }) })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mt-4", children: [
      /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: [
        "Showing ",
        (safePage - 1) * rowsPerPage + 1,
        "–",
        Math.min(safePage * rowsPerPage, filtered.length),
        " of ",
        filtered.length
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(
          Button,
          {
            size: "sm",
            variant: "outline",
            onClick: () => setPage((p) => Math.max(1, p - 1)),
            disabled: safePage <= 1,
            children: "Previous"
          }
        ),
        /* @__PURE__ */ jsxs("span", { className: "text-xs text-slate-500 dark:text-slate-400 min-w-[3rem] text-center", children: [
          safePage,
          " / ",
          totalPages
        ] }),
        /* @__PURE__ */ jsx(
          Button,
          {
            size: "sm",
            variant: "outline",
            onClick: () => setPage((p) => Math.min(totalPages, p + 1)),
            disabled: safePage >= totalPages,
            children: "Next"
          }
        )
      ] })
    ] }),
    editingId && /* @__PURE__ */ jsx(
      EditTransactionDialog,
      {
        open: true,
        transaction: editForm,
        onChange: (field, value) => setEditForm((prev) => ({ ...prev, [field]: value })),
        onSave: handleSave,
        onCancel: () => {
          setEditingId(null);
          setEditForm({});
        },
        months: monthOptions.map((p) => p.month)
      }
    )
  ] });
}

const $$Transactions = createComponent(($$result, $$props, $$slots) => {
  const transactions = getTransactions();
  const periods = getAllPeriods().map((p) => ({ period_id: p.id, month: p.month }));
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Transactions" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-6"> <h1 class="text-2xl font-bold">Transactions</h1> <p class="text-slate-500 dark:text-slate-400 text-sm">All cash and credit expenses</p> </div> <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"> ${renderComponent($$result2, "TransactionTable", TransactionTable, { "transactions": transactions, "showMonth": true, "periods": periods, "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/TransactionTable", "client:component-export": "default" })} </div> ` })}`;
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
