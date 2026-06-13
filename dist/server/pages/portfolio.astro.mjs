/* empty css                               */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BN-0jZ66.mjs';
import 'kleur/colors';
import { f as formatIdr, $ as $$Layout } from '../chunks/utils_Y21joGcU.mjs';
import { jsx, jsxs } from 'react/jsx-runtime';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { i as fetchInvestments, j as fetchPortfolioSummary, k as updateInvestmentApi, l as createInvestmentApi, m as deleteInvestmentApi } from '../chunks/api_n5hUqc9e.mjs';
import { T as Table, a as TableHeader, b as TableRow, c as TableHead, d as TableBody, e as TableCell } from '../chunks/table_CCSrKi0d.mjs';
import { B as Button } from '../chunks/button_ggfKrUNv.mjs';
import { B as Badge } from '../chunks/badge_YSTf0UJ6.mjs';
import { I as Input } from '../chunks/input_DnZKLWYU.mjs';
import { L as Label } from '../chunks/label_OcnW5WOo.mjs';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from '../chunks/select_B5dRDjp1.mjs';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription } from '../chunks/dialog_DfMno1mY.mjs';
import { C as Card, c as CardContent, a as CardHeader, b as CardTitle } from '../chunks/card_B2l53C5a.mjs';
import { u as useSortState, S as SortableHeader } from '../chunks/SortableHeader_BhkB3apU.mjs';
import { TrendingUp, TrendingDown, PieChart, Wallet, Plus, Pencil, Trash2, Building2, Landmark, Globe, Coins } from 'lucide-react';
export { renderers } from '../renderers.mjs';

Chart.register(ArcElement, Tooltip, Legend);
const TYPE_OPTIONS = [
  { value: "stock", label: "Stock" },
  { value: "crypto", label: "Crypto" },
  { value: "etf", label: "ETF" },
  { value: "bond", label: "Bond" },
  { value: "mutual_fund", label: "Mutual Fund" },
  { value: "real_estate", label: "Real Estate" },
  { value: "other", label: "Other" }
];
const TYPE_COLORS = {
  stock: "#3b82f6",
  crypto: "#f59e0b",
  etf: "#8b5cf6",
  bond: "#10b981",
  mutual_fund: "#06b6d4",
  real_estate: "#ef4444",
  other: "#6b7280"
};
const TYPE_ICONS = {
  stock: /* @__PURE__ */ jsx(Building2, { className: "w-4 h-4" }),
  crypto: /* @__PURE__ */ jsx(Coins, { className: "w-4 h-4" }),
  etf: /* @__PURE__ */ jsx(Globe, { className: "w-4 h-4" }),
  bond: /* @__PURE__ */ jsx(Landmark, { className: "w-4 h-4" }),
  mutual_fund: /* @__PURE__ */ jsx(Wallet, { className: "w-4 h-4" }),
  real_estate: /* @__PURE__ */ jsx(Building2, { className: "w-4 h-4" }),
  other: /* @__PURE__ */ jsx(Wallet, { className: "w-4 h-4" })
};
const DONUT_COLORS = [
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#10b981",
  "#06b6d4",
  "#ef4444",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
  "#f97316",
  "#84cc16",
  "#a855f7"
];
const EMPTY_FORM = {
  name: "",
  ticker: "",
  type: "stock",
  quantity: 0,
  avg_purchase_price: 0,
  current_price: 0,
  currency: "IDR",
  platform: "",
  notes: "",
  purchase_date: ""
};
function PortfolioTracker() {
  const [investments, setInvestments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [invData, sumData] = await Promise.all([
        fetchInvestments(),
        fetchPortfolioSummary()
      ]);
      setInvestments(invData);
      setSummary(sumData);
    } catch (err) {
      setError(err.message || "Failed to load portfolio data");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadData();
  }, [loadData]);
  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };
  const openEdit = (inv) => {
    setEditingId(inv.id);
    setForm({ ...inv });
    setDialogOpen(true);
  };
  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };
  const handleSave = async () => {
    if (!form.name) return;
    try {
      setSaving(true);
      if (editingId) {
        await updateInvestmentApi(editingId, form);
      } else {
        await createInvestmentApi(form);
      }
      setDialogOpen(false);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to save investment");
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async (id) => {
    try {
      await deleteInvestmentApi(id);
      setDeleteConfirmId(null);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to delete investment");
    }
  };
  const { toggleSort, sortData, isSorted } = useSortState();
  const getCellValue = useCallback((inv, key) => {
    switch (key) {
      case "name":
        return inv.name;
      case "ticker":
        return inv.ticker;
      case "type":
        return inv.type;
      case "quantity":
        return inv.quantity;
      case "avg_purchase_price":
        return inv.avg_purchase_price;
      case "current_price":
        return inv.current_price;
      case "invested":
        return inv.avg_purchase_price * inv.quantity;
      case "current_value":
        return inv.current_price * inv.quantity;
      case "gain_loss":
        return (inv.current_price - inv.avg_purchase_price) * inv.quantity;
      case "gain_loss_pct":
        return inv.avg_purchase_price > 0 ? (inv.current_price - inv.avg_purchase_price) / inv.avg_purchase_price * 100 : 0;
      default:
        return "";
    }
  }, []);
  const sortedInvestments = useMemo(() => {
    return sortData(
      investments,
      getCellValue,
      (data) => [...data].sort((a, b) => {
        const valA = a.current_price * a.quantity;
        const valB = b.current_price * b.quantity;
        return valB - valA;
      })
    );
  }, [investments, sortData, getCellValue]);
  const donutData = useMemo(() => {
    if (!summary?.byType) return null;
    const entries = Object.entries(summary.byType).filter(([, v]) => v.currentValue > 0).sort(([, a], [, b]) => b.currentValue - a.currentValue);
    if (entries.length === 0) return null;
    return {
      labels: entries.map(([key]) => {
        const label = TYPE_OPTIONS.find((t) => t.value === key)?.label || key;
        return label;
      }),
      datasets: [{
        data: entries.map(([, val]) => val.currentValue),
        backgroundColor: entries.map(([key], i) => TYPE_COLORS[key] || DONUT_COLORS[i % DONUT_COLORS.length]),
        borderColor: entries.map(([key], i) => TYPE_COLORS[key] || DONUT_COLORS[i % DONUT_COLORS.length]),
        borderWidth: 0,
        hoverBorderWidth: 2,
        hoverBorderColor: "#fff"
      }]
    };
  }, [summary]);
  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 10,
          font: { size: 11 }
        }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const total = ctx.dataset.data.reduce((s, v) => s + v, 0);
            const pct = total > 0 ? (ctx.parsed / total * 100).toFixed(1) : "0";
            return ` ${ctx.label}: ${formatIdr(ctx.parsed)} (${pct}%)`;
          }
        }
      }
    }
  };
  if (loading) {
    return /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center py-16", children: /* @__PURE__ */ jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    error && /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300", children: [
      error,
      /* @__PURE__ */ jsx("button", { onClick: () => setError(null), className: "ml-2 underline hover:no-underline", children: "Dismiss" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-5 gap-3", children: [
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 mb-1", children: "Total Invested" }),
        /* @__PURE__ */ jsx("p", { className: "text-lg font-bold text-slate-800 dark:text-slate-100", children: formatIdr(summary?.totalInvested ?? 0) })
      ] }) }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 mb-1", children: "Current Value" }),
        /* @__PURE__ */ jsx("p", { className: "text-lg font-bold text-slate-800 dark:text-slate-100", children: formatIdr(summary?.totalCurrentValue ?? 0) })
      ] }) }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 mb-1", children: "Total Gain/Loss" }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
          (summary?.totalGainLoss ?? 0) >= 0 ? /* @__PURE__ */ jsx(TrendingUp, { className: "w-4 h-4 text-emerald-500" }) : /* @__PURE__ */ jsx(TrendingDown, { className: "w-4 h-4 text-red-500" }),
          /* @__PURE__ */ jsx("p", { className: `text-lg font-bold ${(summary?.totalGainLoss ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`, children: formatIdr(summary?.totalGainLoss ?? 0) })
        ] })
      ] }) }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 mb-1", children: "Return" }),
        /* @__PURE__ */ jsxs("p", { className: `text-lg font-bold ${(summary?.totalGainLossPct ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`, children: [
          (summary?.totalGainLossPct ?? 0) >= 0 ? "+" : "",
          (summary?.totalGainLossPct ?? 0).toFixed(2),
          "%"
        ] })
      ] }) }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 mb-1", children: "Holdings" }),
        /* @__PURE__ */ jsx("p", { className: "text-lg font-bold text-slate-800 dark:text-slate-100", children: summary?.holdingsCount ?? 0 })
      ] }) })
    ] }),
    donutData && /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [
      /* @__PURE__ */ jsxs(Card, { className: "lg:col-span-1", children: [
        /* @__PURE__ */ jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(PieChart, { className: "w-4 h-4 text-slate-500" }),
          "Allocation by Type"
        ] }) }),
        /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", { className: "h-64", children: /* @__PURE__ */ jsx(Doughnut, { data: donutData, options: donutOptions }) }) })
      ] }),
      /* @__PURE__ */ jsxs(Card, { className: "lg:col-span-2", children: [
        /* @__PURE__ */ jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Wallet, { className: "w-4 h-4 text-slate-500" }),
          "Breakdown by Type"
        ] }) }),
        /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", { className: "space-y-3", children: Object.entries(summary?.byType ?? {}).map(([type, data]) => {
          const pct = summary && summary.totalCurrentValue > 0 ? data.currentValue / summary.totalCurrentValue * 100 : 0;
          const gainLoss = data.currentValue - data.invested;
          const gainLossPct = data.invested > 0 ? (data.currentValue - data.invested) / data.invested * 100 : 0;
          const label = TYPE_OPTIONS.find((t) => t.value === type)?.label || type;
          return /* @__PURE__ */ jsxs(
            "div",
            {
              className: "flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50",
              children: [
                /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    style: { backgroundColor: `${TYPE_COLORS[type] || "#6b7280"}20` },
                    children: /* @__PURE__ */ jsx("span", { style: { color: TYPE_COLORS[type] || "#6b7280" }, children: TYPE_ICONS[type] || TYPE_ICONS.other })
                  }
                ),
                /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-baseline", children: [
                    /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-200", children: label }),
                    /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold text-slate-800 dark:text-slate-100", children: formatIdr(data.currentValue) })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center mt-0.5", children: [
                    /* @__PURE__ */ jsxs("span", { className: "text-xs text-slate-500 dark:text-slate-400", children: [
                      data.count,
                      " holding",
                      data.count !== 1 ? "s" : "",
                      " · ",
                      pct.toFixed(1),
                      "% of portfolio"
                    ] }),
                    /* @__PURE__ */ jsxs("span", { className: `text-xs font-medium ${gainLoss >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`, children: [
                      gainLoss >= 0 ? "+" : "",
                      gainLossPct.toFixed(2),
                      "%"
                    ] })
                  ] }),
                  /* @__PURE__ */ jsx("div", { className: "w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-1.5", children: /* @__PURE__ */ jsx(
                    "div",
                    {
                      className: "h-1.5 rounded-full",
                      style: {
                        width: `${pct}%`,
                        backgroundColor: TYPE_COLORS[type] || "#6b7280"
                      }
                    }
                  ) })
                ] })
              ]
            },
            type
          );
        }) }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center", children: [
        /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Wallet, { className: "w-4 h-4 text-slate-500" }),
          "Holdings (",
          investments.length,
          ")"
        ] }),
        /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: openAdd, className: "bg-emerald-600 hover:bg-emerald-700 text-white", children: [
          /* @__PURE__ */ jsx(Plus, { className: "w-4 h-4 mr-1" }),
          "Add Holding"
        ] })
      ] }) }),
      /* @__PURE__ */ jsx(CardContent, { className: "pt-0", children: investments.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "text-center py-12 text-slate-500 dark:text-slate-400", children: [
        /* @__PURE__ */ jsx(Wallet, { className: "w-10 h-10 mx-auto mb-3 opacity-30" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: "No investments tracked yet" }),
        /* @__PURE__ */ jsx("p", { className: "text-xs mt-1", children: "Add your first holding to start tracking your portfolio." }),
        /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: openAdd, className: "mt-4 bg-emerald-600 hover:bg-emerald-700 text-white", children: [
          /* @__PURE__ */ jsx(Plus, { className: "w-4 h-4 mr-1" }),
          "Add First Holding"
        ] })
      ] }) : /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(SortableHeader, { sortKey: "name", currentDirection: isSorted("name"), onSort: toggleSort, children: "Name" }),
          /* @__PURE__ */ jsx(SortableHeader, { sortKey: "ticker", currentDirection: isSorted("ticker"), onSort: toggleSort, children: "Ticker" }),
          /* @__PURE__ */ jsx(SortableHeader, { sortKey: "type", currentDirection: isSorted("type"), onSort: toggleSort, children: "Type" }),
          /* @__PURE__ */ jsx(SortableHeader, { sortKey: "quantity", currentDirection: isSorted("quantity"), onSort: toggleSort, className: "text-right", children: "Qty" }),
          /* @__PURE__ */ jsx(SortableHeader, { sortKey: "avg_purchase_price", currentDirection: isSorted("avg_purchase_price"), onSort: toggleSort, className: "text-right", children: "Avg Price" }),
          /* @__PURE__ */ jsx(SortableHeader, { sortKey: "current_price", currentDirection: isSorted("current_price"), onSort: toggleSort, className: "text-right", children: "Current" }),
          /* @__PURE__ */ jsx(SortableHeader, { sortKey: "invested", currentDirection: isSorted("invested"), onSort: toggleSort, className: "text-right", children: "Invested" }),
          /* @__PURE__ */ jsx(SortableHeader, { sortKey: "current_value", currentDirection: isSorted("current_value"), onSort: toggleSort, className: "text-right", children: "Value" }),
          /* @__PURE__ */ jsx(SortableHeader, { sortKey: "gain_loss_pct", currentDirection: isSorted("gain_loss_pct"), onSort: toggleSort, className: "text-right", children: "P/L" }),
          /* @__PURE__ */ jsx(TableHead, {})
        ] }) }),
        /* @__PURE__ */ jsx(TableBody, { children: sortedInvestments.map((inv) => {
          const invested = inv.avg_purchase_price * inv.quantity;
          const currentValue = inv.current_price * inv.quantity;
          const gainLoss = currentValue - invested;
          const gainLossPct = invested > 0 ? gainLoss / invested * 100 : 0;
          return /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableCell, { className: "font-medium text-sm", children: inv.name }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-xs text-slate-500 dark:text-slate-400 font-mono", children: inv.ticker || "—" }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(
              Badge,
              {
                variant: "secondary",
                className: "text-[10px] px-1.5 py-0",
                style: {
                  backgroundColor: `${TYPE_COLORS[inv.type] || "#6b7280"}20`,
                  color: TYPE_COLORS[inv.type] || "#6b7280"
                },
                children: TYPE_OPTIONS.find((t) => t.value === inv.type)?.label || inv.type
              }
            ) }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-right text-sm", children: inv.quantity.toLocaleString() }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-right text-sm", children: formatIdr(inv.avg_purchase_price) }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-right text-sm", children: formatIdr(inv.current_price) }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-right text-sm text-slate-600 dark:text-slate-300", children: formatIdr(invested) }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-right text-sm font-medium", children: formatIdr(currentValue) }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-end gap-1", children: [
              gainLoss >= 0 ? /* @__PURE__ */ jsx(TrendingUp, { className: "w-3 h-3 text-emerald-500" }) : /* @__PURE__ */ jsx(TrendingDown, { className: "w-3 h-3 text-red-500" }),
              /* @__PURE__ */ jsxs("span", { className: `text-xs font-semibold ${gainLoss >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`, children: [
                gainLoss >= 0 ? "+" : "",
                gainLossPct.toFixed(2),
                "%"
              ] })
            ] }) }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
              /* @__PURE__ */ jsx(
                Button,
                {
                  size: "sm",
                  variant: "ghost",
                  onClick: () => openEdit(inv),
                  className: "h-7 w-7 p-0",
                  children: /* @__PURE__ */ jsx(Pencil, { className: "w-3.5 h-3.5" })
                }
              ),
              /* @__PURE__ */ jsx(
                Button,
                {
                  size: "sm",
                  variant: "ghost",
                  onClick: () => setDeleteConfirmId(inv.id),
                  className: "h-7 w-7 p-0 text-red-500 hover:text-red-700",
                  children: /* @__PURE__ */ jsx(Trash2, { className: "w-3.5 h-3.5" })
                }
              )
            ] }) })
          ] }, inv.id);
        }) })
      ] }) }) })
    ] }),
    /* @__PURE__ */ jsx(Dialog, { open: dialogOpen, onOpenChange: setDialogOpen, children: /* @__PURE__ */ jsxs(DialogContent, { className: "sm:max-w-lg", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: editingId ? "Edit Holding" : "Add Holding" }),
        /* @__PURE__ */ jsx(DialogDescription, { children: editingId ? "Update investment details." : "Add a new investment to your portfolio." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4 py-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "col-span-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "inv-name", children: "Name *" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "inv-name",
              value: form.name || "",
              onChange: (e) => handleChange("name", e.target.value),
              placeholder: "e.g. Apple Inc."
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "inv-ticker", children: "Ticker" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "inv-ticker",
              value: form.ticker || "",
              onChange: (e) => handleChange("ticker", e.target.value),
              placeholder: "e.g. AAPL"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "inv-type", children: "Type" }),
          /* @__PURE__ */ jsxs(
            Select,
            {
              value: form.type || "stock",
              onValueChange: (v) => handleChange("type", v),
              children: [
                /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
                /* @__PURE__ */ jsx(SelectContent, { children: TYPE_OPTIONS.map((opt) => /* @__PURE__ */ jsx(SelectItem, { value: opt.value, children: opt.label }, opt.value)) })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "inv-qty", children: "Quantity" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "inv-qty",
              type: "number",
              step: "any",
              min: "0",
              value: form.quantity || 0,
              onChange: (e) => handleChange("quantity", parseFloat(e.target.value) || 0)
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "inv-platform", children: "Platform" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "inv-platform",
              value: form.platform || "",
              onChange: (e) => handleChange("platform", e.target.value),
              placeholder: "e.g. IBKR"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "inv-avg-price", children: "Avg Purchase Price" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "inv-avg-price",
              type: "number",
              step: "any",
              min: "0",
              value: form.avg_purchase_price || 0,
              onChange: (e) => handleChange("avg_purchase_price", parseFloat(e.target.value) || 0)
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "inv-current-price", children: "Current Price" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "inv-current-price",
              type: "number",
              step: "any",
              min: "0",
              value: form.current_price || 0,
              onChange: (e) => handleChange("current_price", parseFloat(e.target.value) || 0)
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "inv-purchase-date", children: "Purchase Date" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "inv-purchase-date",
              type: "date",
              value: form.purchase_date || "",
              onChange: (e) => handleChange("purchase_date", e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "col-span-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "inv-notes", children: "Notes" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "inv-notes",
              value: form.notes || "",
              onChange: (e) => handleChange("notes", e.target.value),
              placeholder: "Optional notes..."
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2 pt-2", children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setDialogOpen(false), disabled: saving, children: "Cancel" }),
        /* @__PURE__ */ jsx(
          Button,
          {
            onClick: handleSave,
            disabled: saving || !form.name,
            className: "bg-emerald-600 hover:bg-emerald-700 text-white",
            children: saving ? "Saving..." : editingId ? "Save Changes" : "Add Holding"
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(Dialog, { open: deleteConfirmId !== null, onOpenChange: () => setDeleteConfirmId(null), children: /* @__PURE__ */ jsxs(DialogContent, { className: "sm:max-w-sm", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: "Delete Holding?" }),
        /* @__PURE__ */ jsx(DialogDescription, { children: "This will permanently remove this investment from your portfolio. This action cannot be undone." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2 pt-2", children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setDeleteConfirmId(null), children: "Cancel" }),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "destructive",
            onClick: () => deleteConfirmId && handleDelete(deleteConfirmId),
            children: "Delete"
          }
        )
      ] })
    ] }) })
  ] });
}

const $$Portfolio = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Investment Portfolio \xB7 Financial Dashboard" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-6"> <h1 class="text-2xl font-bold">Investment Portfolio</h1> <p class="text-slate-500 dark:text-slate-400 text-sm">Track your individual holdings, cost basis, and performance</p> </div> ${renderComponent($$result2, "PortfolioTracker", PortfolioTracker, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/PortfolioTracker", "client:component-export": "default" })} ` })}`;
}, "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/portfolio.astro", void 0);

const $$file = "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/portfolio.astro";
const $$url = "/portfolio";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Portfolio,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
