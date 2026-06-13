/* empty css                               */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BN-0jZ66.mjs';
import 'kleur/colors';
import { f as formatIdr, $ as $$Layout } from '../chunks/utils_Y21joGcU.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { f as fetchCategories, r as updateCategoryApi, s as deleteCategoryApi, t as createCategory, v as fetchMonthlyIncome, w as updateMonthlyIncomeApi, x as deleteMonthlyIncomeApi, y as upsertMonthlyIncomeApi, z as importDataApi } from '../chunks/api_n5hUqc9e.mjs';
import { C as Card, a as CardHeader, b as CardTitle, c as CardContent } from '../chunks/card_B2l53C5a.mjs';
import { I as Input } from '../chunks/input_DnZKLWYU.mjs';
import { B as Button } from '../chunks/button_ggfKrUNv.mjs';
import { L as Label } from '../chunks/label_OcnW5WOo.mjs';
import { T as Table, a as TableHeader, b as TableRow, c as TableHead, d as TableBody, e as TableCell } from '../chunks/table_CCSrKi0d.mjs';
import { Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from '../chunks/select_B5dRDjp1.mjs';
import { B as Badge } from '../chunks/badge_YSTf0UJ6.mjs';
export { renderers } from '../renderers.mjs';

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#78716c",
  "#475569"
];
function CategorySettings() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    color: "#3b82f6",
    monthly_limit: ""
  });
  useEffect(() => {
    loadCategories();
  }, []);
  async function loadCategories() {
    try {
      const rows = await fetchCategories();
      setCategories(rows);
      setError("");
    } catch (e) {
      setError("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }
  const startEdit = (cat) => {
    setEditingId(cat.id);
    setEditForm({ ...cat });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };
  const saveEdit = async () => {
    if (!editForm.id || !editForm.name) return;
    try {
      await updateCategoryApi(editForm.id, {
        name: editForm.name,
        color: editForm.color,
        monthly_limit: editForm.monthly_limit ?? 0
      });
      setEditingId(null);
      setEditForm({});
      await loadCategories();
    } catch (e) {
      setError(e.message || "Failed to update category");
    }
  };
  const handleDelete = async (id) => {
    if (!confirm("Delete this category?")) return;
    try {
      await deleteCategoryApi(id);
      await loadCategories();
    } catch (e) {
      setError(e.message || "Failed to delete category");
    }
  };
  const handleAdd = async () => {
    if (!addForm.name.trim()) {
      setError("Category name is required");
      return;
    }
    try {
      await createCategory({
        name: addForm.name.trim(),
        color: addForm.color,
        monthly_limit: addForm.monthly_limit ? Number(addForm.monthly_limit) : 0
      });
      setAddForm({ name: "", color: "#3b82f6", monthly_limit: "" });
      setIsAdding(false);
      setError("");
      await loadCategories();
    } catch (e) {
      setError(e.message || "Failed to create category");
    }
  };
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsxs(CardHeader, { className: "flex flex-row items-center justify-between", children: [
      /* @__PURE__ */ jsx(CardTitle, { children: "Categories" }),
      /* @__PURE__ */ jsx(Button, { size: "sm", onClick: () => setIsAdding((v) => !v), children: isAdding ? "Cancel" : "+ Add Category" })
    ] }),
    /* @__PURE__ */ jsxs(CardContent, { children: [
      error && /* @__PURE__ */ jsx("div", { className: "mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300", children: error }),
      isAdding && /* @__PURE__ */ jsxs("div", { className: "mb-6 rounded-lg border p-4 space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
            /* @__PURE__ */ jsx(Label, { children: "Name" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                type: "text",
                value: addForm.name,
                onChange: (e) => setAddForm((p) => ({ ...p, name: e.target.value })),
                placeholder: "e.g. Groceries"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
            /* @__PURE__ */ jsx(Label, { children: "Monthly Limit (IDR)" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                type: "number",
                value: addForm.monthly_limit,
                onChange: (e) => setAddForm((p) => ({ ...p, monthly_limit: e.target.value })),
                placeholder: "0"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
            /* @__PURE__ */ jsx(Label, { children: "Color" }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "color",
                  value: addForm.color,
                  onChange: (e) => setAddForm((p) => ({ ...p, color: e.target.value })),
                  className: "h-9 w-9 rounded cursor-pointer border-0 p-0"
                }
              ),
              /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1", children: PRESET_COLORS.map((c) => /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => setAddForm((p) => ({ ...p, color: c })),
                  className: "h-5 w-5 rounded-full border border-slate-200 dark:border-slate-700",
                  style: { backgroundColor: c }
                },
                c
              )) })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsx(Button, { size: "sm", onClick: handleAdd, children: "Save Category" }) })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "rounded-xl border", children: /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { className: "w-12", children: "Color" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Name" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Monthly Limit" }),
          /* @__PURE__ */ jsx(TableHead, { className: "w-32" })
        ] }) }),
        /* @__PURE__ */ jsx(TableBody, { children: loading ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 4, className: "text-center text-muted-foreground py-6", children: "Loading..." }) }) : categories.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 4, className: "text-center text-muted-foreground py-6", children: "No categories yet. Add one above." }) }) : categories.map((cat) => {
          const isEditing = editingId === cat.id;
          if (isEditing) {
            return /* @__PURE__ */ jsxs(TableRow, { className: "bg-muted/30", children: [
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(
                "input",
                {
                  type: "color",
                  value: editForm.color || "#3b82f6",
                  onChange: (e) => setEditForm((p) => ({ ...p, color: e.target.value })),
                  className: "h-8 w-8 rounded cursor-pointer border-0 p-0"
                }
              ) }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(
                Input,
                {
                  type: "text",
                  value: editForm.name ?? "",
                  onChange: (e) => setEditForm((p) => ({ ...p, name: e.target.value })),
                  className: "h-8 text-xs"
                }
              ) }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(
                Input,
                {
                  type: "number",
                  value: editForm.monthly_limit ?? 0,
                  onChange: (e) => setEditForm((p) => ({ ...p, monthly_limit: Number(e.target.value) })),
                  className: "h-8 text-xs text-right"
                }
              ) }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs("div", { className: "flex gap-1", children: [
                /* @__PURE__ */ jsx(Button, { size: "sm", className: "h-7 text-xs", onClick: saveEdit, children: "Save" }),
                /* @__PURE__ */ jsx(Button, { size: "sm", variant: "secondary", className: "h-7 text-xs", onClick: cancelEdit, children: "Cancel" })
              ] }) })
            ] }, cat.id);
          }
          return /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(
              "div",
              {
                className: "h-5 w-5 rounded-full border border-slate-200 dark:border-slate-700",
                style: { backgroundColor: cat.color }
              }
            ) }),
            /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: cat.name }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: cat.monthly_limit > 0 ? formatIdr(cat.monthly_limit) : "-" }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", className: "h-7 text-xs text-blue-500 hover:text-blue-700", onClick: () => startEdit(cat), children: "Edit" }),
              /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", className: "h-7 text-xs text-red-500 hover:text-red-700", onClick: () => handleDelete(cat.id), children: "Delete" })
            ] }) })
          ] }, cat.id);
        }) })
      ] }) })
    ] })
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
function IncomeSettings() {
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingMonth, setEditingMonth] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newMonth, setNewMonth] = useState("January");
  const [newYear, setNewYear] = useState((/* @__PURE__ */ new Date()).getFullYear());
  const [newIncome, setNewIncome] = useState("");
  const [newOtherIncome, setNewOtherIncome] = useState("");
  useEffect(() => {
    fetchMonthlyIncome().then((rows) => {
      setIncomes(rows);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);
  const sortedIncomes = useMemo(() => {
    return [...incomes].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [incomes]);
  const startEdit = (row) => {
    setEditingMonth(row.month);
    setEditForm({ ...row });
  };
  const cancelEdit = () => {
    setEditingMonth(null);
    setEditForm({});
  };
  const saveEdit = async () => {
    if (!editingMonth || editForm.income == null) return;
    await updateMonthlyIncomeApi(editingMonth, {
      income: Number(editForm.income),
      other_income: Number(editForm.other_income ?? 0)
    });
    setIncomes(
      (prev) => prev.map(
        (i) => i.month === editingMonth ? { ...i, income: Number(editForm.income), other_income: Number(editForm.other_income ?? 0) } : i
      )
    );
    setEditingMonth(null);
    setEditForm({});
  };
  const handleDelete = async (month) => {
    if (!confirm(`Delete income entry for ${month}?`)) return;
    await deleteMonthlyIncomeApi(month);
    setIncomes((prev) => prev.filter((i) => i.month !== month));
  };
  const handleAdd = async (e) => {
    e.preventDefault();
    const monthName = `${newMonth} ${newYear}`;
    const monthIdx = MONTH_OPTIONS.indexOf(newMonth) + 1;
    const date = `${newYear}-${String(monthIdx).padStart(2, "0")}-21`;
    const incomeVal = Number(newIncome);
    if (!newIncome || isNaN(incomeVal)) return;
    await upsertMonthlyIncomeApi({
      month: monthName,
      date,
      income: incomeVal,
      other_income: Number(newOtherIncome || 0)
    });
    setIncomes((prev) => {
      const filtered = prev.filter((i) => i.month !== monthName);
      return [...filtered, { month: monthName, date, income: incomeVal, other_income: Number(newOtherIncome || 0) }];
    });
    setNewMonth("January");
    setNewYear((/* @__PURE__ */ new Date()).getFullYear());
    setNewIncome("");
    setNewOtherIncome("");
  };
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Monthly Income" }) }),
    /* @__PURE__ */ jsxs(CardContent, { className: "space-y-6", children: [
      /* @__PURE__ */ jsxs("form", { onSubmit: handleAdd, className: "flex flex-col sm:flex-row gap-3 items-end", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1.5 flex-1", children: [
          /* @__PURE__ */ jsx(Label, { children: "Month" }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsx(
              "select",
              {
                value: newMonth,
                onChange: (e) => setNewMonth(e.target.value),
                className: "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
                children: MONTH_OPTIONS.map((m) => /* @__PURE__ */ jsx("option", { value: m, children: m }, m))
              }
            ),
            /* @__PURE__ */ jsx(
              Input,
              {
                type: "number",
                value: newYear,
                onChange: (e) => setNewYear(Number(e.target.value)),
                className: "w-28"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1.5 flex-1", children: [
          /* @__PURE__ */ jsx(Label, { children: "Income" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "number",
              value: newIncome,
              onChange: (e) => setNewIncome(e.target.value),
              placeholder: "0"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1.5 flex-1", children: [
          /* @__PURE__ */ jsx(Label, { children: "Other Income" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "number",
              value: newOtherIncome,
              onChange: (e) => setNewOtherIncome(e.target.value),
              placeholder: "0"
            }
          )
        ] }),
        /* @__PURE__ */ jsx(Button, { type: "submit", className: "h-9", children: "Add / Update" })
      ] }),
      loading ? /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Loading..." }) : sortedIncomes.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "No income entries yet." }) : /* @__PURE__ */ jsx("div", { className: "rounded-xl border", children: /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { children: "Month" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Income" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Other Income" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Total" }),
          /* @__PURE__ */ jsx(TableHead, {})
        ] }) }),
        /* @__PURE__ */ jsx(TableBody, { children: sortedIncomes.map((row) => {
          const isEditing = editingMonth === row.month;
          if (isEditing) {
            return /* @__PURE__ */ jsxs(TableRow, { className: "bg-muted/30", children: [
              /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: row.month }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(
                Input,
                {
                  type: "number",
                  value: editForm.income ?? 0,
                  onChange: (e) => setEditForm((prev) => ({ ...prev, income: Number(e.target.value) })),
                  className: "h-8 text-xs text-right"
                }
              ) }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(
                Input,
                {
                  type: "number",
                  value: editForm.other_income ?? 0,
                  onChange: (e) => setEditForm((prev) => ({ ...prev, other_income: Number(e.target.value) })),
                  className: "h-8 text-xs text-right"
                }
              ) }),
              /* @__PURE__ */ jsx(TableCell, { className: "text-right text-xs text-muted-foreground", children: formatIdr((editForm.income ?? 0) + (editForm.other_income ?? 0)) }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs("div", { className: "flex gap-1", children: [
                /* @__PURE__ */ jsx(Button, { size: "sm", className: "h-7 text-xs", onClick: saveEdit, children: "Save" }),
                /* @__PURE__ */ jsx(Button, { size: "sm", variant: "secondary", className: "h-7 text-xs", onClick: cancelEdit, children: "Cancel" })
              ] }) })
            ] }, row.month);
          }
          return /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: row.month }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: formatIdr(row.income) }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: formatIdr(row.other_income ?? 0) }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-right font-semibold", children: formatIdr(row.income + (row.other_income ?? 0)) }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", className: "h-7 text-xs text-blue-500 hover:text-blue-700", onClick: () => startEdit(row), children: "Edit" }),
              /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", className: "h-7 text-xs text-red-500 hover:text-red-700", onClick: () => handleDelete(row.month), children: "Delete" })
            ] }) })
          ] }, row.month);
        }) })
      ] }) })
    ] })
  ] });
}

function ExportData() {
  const [loading, setLoading] = useState(null);
  const triggerDownload = async (url, filename) => {
    setLoading(filename);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (e) {
      alert("Export failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };
  const dateSuffix = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsxs(CardTitle, { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx(Download, { className: "h-5 w-5" }),
      "Data Export"
    ] }) }),
    /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-3", children: [
      /* @__PURE__ */ jsxs(
        Button,
        {
          variant: "outline",
          onClick: () => triggerDownload("/api/export?format=json", `financial-data-${dateSuffix}.json`),
          disabled: loading === `financial-data-${dateSuffix}.json`,
          children: [
            /* @__PURE__ */ jsx(FileJson, { className: "h-4 w-4 mr-2" }),
            loading === `financial-data-${dateSuffix}.json` ? "Exporting…" : "Export JSON (All)"
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        Button,
        {
          variant: "outline",
          onClick: () => triggerDownload("/api/export?format=csv&type=transactions", `transactions-${dateSuffix}.csv`),
          disabled: loading === `transactions-${dateSuffix}.csv`,
          children: [
            /* @__PURE__ */ jsx(FileSpreadsheet, { className: "h-4 w-4 mr-2" }),
            loading === `transactions-${dateSuffix}.csv` ? "Exporting…" : "Export Transactions CSV"
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        Button,
        {
          variant: "outline",
          onClick: () => triggerDownload("/api/export?format=csv&type=networth", `networth-${dateSuffix}.csv`),
          disabled: loading === `networth-${dateSuffix}.csv`,
          children: [
            /* @__PURE__ */ jsx(FileSpreadsheet, { className: "h-4 w-4 mr-2" }),
            loading === `networth-${dateSuffix}.csv` ? "Exporting…" : "Export Networth CSV"
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        Button,
        {
          variant: "outline",
          onClick: () => triggerDownload("/api/export?format=csv&type=summary", `monthly-summary-${dateSuffix}.csv`),
          disabled: loading === `monthly-summary-${dateSuffix}.csv`,
          children: [
            /* @__PURE__ */ jsx(FileSpreadsheet, { className: "h-4 w-4 mr-2" }),
            loading === `monthly-summary-${dateSuffix}.csv` ? "Exporting…" : "Export Summary CSV"
          ]
        }
      )
    ] }) })
  ] });
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}
function parseCsv(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}
function detectImportType(data) {
  if (data && Array.isArray(data.transactions) && data.transactions.length > 0) return "transactions";
  if (data && Array.isArray(data.networth) && data.networth.length > 0) return "networth";
  if (data && Array.isArray(data.monthly_income) && data.monthly_income.length > 0) return "monthly_income";
  if (data && Array.isArray(data.monthlySummary) && data.monthlySummary.length > 0) return "monthly_income";
  return null;
}
function extractRows(data, detectedType) {
  if (!data) return { rows: [], type: null };
  if (Array.isArray(data)) return { rows: data, type: detectedType };
  if (detectedType === "transactions" && Array.isArray(data.transactions)) return { rows: data.transactions, type: "transactions" };
  if (detectedType === "networth" && Array.isArray(data.networth)) return { rows: data.networth, type: "networth" };
  if (detectedType === "monthly_income" && Array.isArray(data.monthly_income)) return { rows: data.monthly_income, type: "monthly_income" };
  if (Array.isArray(data.monthly_income)) return { rows: data.monthly_income, type: "monthly_income" };
  return { rows: [], type: null };
}
function ImportData() {
  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [format, setFormat] = useState("json");
  const [importType, setImportType] = useState("transactions");
  const [previewRows, setPreviewRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const handleFileChange = useCallback(async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setResult(null);
    setError("");
    const text = await selected.text();
    setFileContent(text);
    const isCsv = selected.name.toLowerCase().endsWith(".csv");
    const detectedFormat = isCsv ? "csv" : "json";
    setFormat(detectedFormat);
    if (detectedFormat === "csv") {
      const rows = parseCsv(text);
      setAllRows(rows);
      setPreviewRows(rows.slice(0, 5));
      const headers = text.trim().split("\n")[0]?.toLowerCase() || "";
      if (headers.includes("title") && headers.includes("category")) {
        setImportType("transactions");
      } else if (headers.includes("investment") || headers.includes("total")) {
        setImportType("networth");
      } else if (headers.includes("income")) {
        setImportType("monthly_income");
      }
    } else {
      try {
        const json = JSON.parse(text);
        const detectedType = detectImportType(json);
        const { rows, type } = extractRows(json, detectedType);
        setAllRows(rows);
        setPreviewRows(rows.slice(0, 5));
        if (type) setImportType(type);
      } catch {
        setError("Invalid JSON file");
        setAllRows([]);
        setPreviewRows([]);
      }
    }
  }, []);
  const handleImport = async () => {
    if (allRows.length === 0) {
      setError("No data to import");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await importDataApi(importType, allRows);
      setResult(res);
      if (res.errors > 0) {
        setError(`${res.errors} rows failed to import`);
      }
    } catch (err) {
      setError(err.message || "Import failed");
    } finally {
      setLoading(false);
    }
  };
  const previewHeaders = previewRows.length > 0 ? Object.keys(previewRows[0]) : [];
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Import Data" }) }),
    /* @__PURE__ */ jsxs(CardContent, { className: "space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "import-file", children: "File (JSON or CSV)" }),
        /* @__PURE__ */ jsx(Input, { id: "import-file", type: "file", accept: ".json,.csv", onChange: handleFileChange })
      ] }),
      file && /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1 flex-1", children: [
          /* @__PURE__ */ jsx(Label, { children: "Detected Format" }),
          /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground capitalize", children: format })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1 flex-1", children: [
          /* @__PURE__ */ jsx(Label, { children: "Import Type" }),
          /* @__PURE__ */ jsxs(Select, { value: importType, onValueChange: (v) => setImportType(v), children: [
            /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsx(SelectItem, { value: "transactions", children: "Transactions" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "networth", children: "Networth" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "monthly_income", children: "Monthly Income" })
            ] })
          ] })
        ] })
      ] }),
      previewRows.length > 0 && /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxs(Label, { children: [
            "Preview (",
            allRows.length,
            " rows)"
          ] }),
          /* @__PURE__ */ jsx(Badge, { variant: "secondary", children: "First 5 rows shown" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "rounded-xl border overflow-hidden", children: /* @__PURE__ */ jsxs(Table, { children: [
          /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsx(TableRow, { children: previewHeaders.map((h) => /* @__PURE__ */ jsx(TableHead, { children: h }, h)) }) }),
          /* @__PURE__ */ jsx(TableBody, { children: previewRows.map((row, idx) => /* @__PURE__ */ jsx(TableRow, { children: previewHeaders.map((h) => /* @__PURE__ */ jsx(TableCell, { className: "text-xs max-w-[200px] truncate", children: String(row[h] ?? "") }, h)) }, idx)) })
        ] }) })
      ] }),
      error && /* @__PURE__ */ jsx("div", { className: "text-sm text-red-600 dark:text-red-400", children: error }),
      result && /* @__PURE__ */ jsxs("div", { className: "rounded-lg bg-slate-50 dark:bg-slate-800 p-3 space-y-1", children: [
        /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: "Import Result" }),
        /* @__PURE__ */ jsxs("div", { className: "text-sm text-muted-foreground", children: [
          /* @__PURE__ */ jsx("span", { className: "text-emerald-600 font-medium", children: result.imported }),
          " imported,",
          " ",
          /* @__PURE__ */ jsx("span", { className: "text-amber-600 font-medium", children: result.skipped }),
          " skipped,",
          " ",
          /* @__PURE__ */ jsx("span", { className: "text-red-600 font-medium", children: result.errors }),
          " errors"
        ] })
      ] }),
      file && allRows.length > 0 && /* @__PURE__ */ jsx(Button, { onClick: handleImport, disabled: loading, children: loading ? "Importing..." : `Import ${allRows.length} Rows` })
    ] })
  ] });
}

const $$Settings = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Settings - Financial Dashboard" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="space-y-6"> <h1 class="text-2xl font-bold">Settings</h1> ${renderComponent($$result2, "ExportData", ExportData, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/ExportData", "client:component-export": "default" })} ${renderComponent($$result2, "ImportData", ImportData, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/ImportData", "client:component-export": "default" })} ${renderComponent($$result2, "IncomeSettings", IncomeSettings, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/IncomeSettings", "client:component-export": "default" })} ${renderComponent($$result2, "CategorySettings", CategorySettings, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/CategorySettings", "client:component-export": "default" })} </div> ` })}`;
}, "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/settings.astro", void 0);

const $$file = "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/settings.astro";
const $$url = "/settings";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Settings,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
