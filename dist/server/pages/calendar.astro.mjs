/* empty css                               */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BN-0jZ66.mjs';
import 'kleur/colors';
import { f as formatIdr, $ as $$Layout } from '../chunks/utils_Y21joGcU.mjs';
import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { useMemo, useState, useEffect } from 'react';
import { C as Card, a as CardHeader, b as CardTitle, c as CardContent } from '../chunks/card_B2l53C5a.mjs';
import { B as Button } from '../chunks/button_ggfKrUNv.mjs';
import { B as Badge } from '../chunks/badge_YSTf0UJ6.mjs';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from '../chunks/select_B5dRDjp1.mjs';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription } from '../chunks/dialog_DfMno1mY.mjs';
import { T as Table, a as TableHeader, b as TableRow, c as TableHead, d as TableBody, e as TableCell } from '../chunks/table_CCSrKi0d.mjs';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { p as getTransactions } from '../chunks/db_B4_3wji-.mjs';
export { renderers } from '../renderers.mjs';

function parseMonthYear(monthStr) {
  const d = /* @__PURE__ */ new Date(`${monthStr} 1`);
  if (!isNaN(d.getTime())) {
    return { year: d.getFullYear(), monthIndex: d.getMonth() };
  }
  const parts = monthStr.split(" ");
  const monthNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december"
  ];
  const monthNum = monthNames.indexOf(parts[0]?.toLowerCase());
  const year = parseInt(parts[parts.length - 1], 10);
  if (monthNum >= 0 && !isNaN(year)) {
    return { year, monthIndex: monthNum };
  }
  const now = /* @__PURE__ */ new Date();
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}
function formatDateKey(year, month, day) {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}
function parseTxDate(tx) {
  const raw = tx.created_time || tx.date;
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function SpendingCalendar({ transactions }) {
  const monthOptions = useMemo(() => {
    const set = /* @__PURE__ */ new Set();
    transactions.forEach((t) => {
      if (t.month) set.add(t.month);
    });
    return Array.from(set).sort((a, b) => {
      const da = parseMonthYear(a);
      const db = parseMonthYear(b);
      return da.year * 100 + da.monthIndex - (db.year * 100 + db.monthIndex);
    });
  }, [transactions]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (monthOptions.length > 0) return monthOptions[monthOptions.length - 1];
    const now = /* @__PURE__ */ new Date();
    return `${now.toLocaleDateString("en-US", { month: "long" })} ${now.getFullYear()}`;
  });
  useEffect(() => {
    if (monthOptions.length > 0 && !monthOptions.includes(selectedMonth)) {
      setSelectedMonth(monthOptions[monthOptions.length - 1]);
    }
  }, [monthOptions, selectedMonth]);
  const { year, monthIndex } = useMemo(() => parseMonthYear(selectedMonth), [selectedMonth]);
  const daysInMonth = useMemo(() => getDaysInMonth(year, monthIndex), [year, monthIndex]);
  const firstDay = useMemo(() => getFirstDayOfMonth(year, monthIndex), [year, monthIndex]);
  const dailyTotals = useMemo(() => {
    const map = {};
    transactions.forEach((tx) => {
      const dateKey = parseTxDate(tx);
      if (!dateKey) return;
      const raw = tx.created_time || tx.date || "";
      const d = new Date(raw);
      if (isNaN(d.getTime())) return;
      if (d.getFullYear() !== year || d.getMonth() !== monthIndex) return;
      if (!map[dateKey]) {
        map[dateKey] = { total: 0, count: 0, transactions: [] };
      }
      map[dateKey].total += tx.amount;
      map[dateKey].count += 1;
      map[dateKey].transactions.push(tx);
    });
    return map;
  }, [transactions, year, monthIndex]);
  const maxDaily = useMemo(() => {
    const totals = Object.values(dailyTotals).map((d) => d.total);
    return totals.length > 0 ? Math.max(...totals) : 0;
  }, [dailyTotals]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const openDay = (day) => {
    setSelectedDay(day);
    setDialogOpen(true);
  };
  const selectedDayKey = selectedDay != null ? formatDateKey(year, monthIndex, selectedDay) : null;
  const selectedDayData = selectedDayKey ? dailyTotals[selectedDayKey] : null;
  const goToPrevMonth = () => {
    const idx = monthOptions.indexOf(selectedMonth);
    if (idx > 0) setSelectedMonth(monthOptions[idx - 1]);
  };
  const goToNextMonth = () => {
    const idx = monthOptions.indexOf(selectedMonth);
    if (idx >= 0 && idx < monthOptions.length - 1) setSelectedMonth(monthOptions[idx + 1]);
  };
  const getHeatColor = (total) => {
    if (total === 0) return "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500";
    if (maxDaily === 0) return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
    const ratio = total / maxDaily;
    if (ratio <= 0.25) return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
    if (ratio <= 0.5) return "bg-emerald-200 dark:bg-emerald-800/40 text-emerald-800 dark:text-emerald-300";
    if (ratio <= 0.75) return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
    return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
  };
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  const today = /* @__PURE__ */ new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthIndex;
  const todayDay = today.getDate();
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "outline",
            size: "sm",
            onClick: goToPrevMonth,
            disabled: monthOptions.indexOf(selectedMonth) <= 0,
            children: /* @__PURE__ */ jsx(ChevronLeft, { className: "w-4 h-4" })
          }
        ),
        /* @__PURE__ */ jsxs(Select, { value: selectedMonth, onValueChange: setSelectedMonth, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { className: "w-[200px]", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsx(SelectContent, { children: monthOptions.map((m) => /* @__PURE__ */ jsx(SelectItem, { value: m, children: m }, m)) })
        ] }),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "outline",
            size: "sm",
            onClick: goToNextMonth,
            disabled: monthOptions.indexOf(selectedMonth) >= monthOptions.length - 1,
            children: /* @__PURE__ */ jsx(ChevronRight, { className: "w-4 h-4" })
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 text-sm text-muted-foreground", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx("span", { className: "inline-block w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-800/40" }),
          /* @__PURE__ */ jsx("span", { children: "Low" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx("span", { className: "inline-block w-3 h-3 rounded-sm bg-amber-100 dark:bg-amber-900/30" }),
          /* @__PURE__ */ jsx("span", { children: "Medium" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx("span", { className: "inline-block w-3 h-3 rounded-sm bg-red-100 dark:bg-red-900/30" }),
          /* @__PURE__ */ jsx("span", { children: "High" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(CalendarDays, { className: "w-4 h-4 text-slate-500" }),
        "Spending Heatmap — ",
        selectedMonth
      ] }) }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-7 gap-1", children: [
        WEEKDAYS.map((wd) => /* @__PURE__ */ jsx("div", { className: "text-center text-xs font-medium text-muted-foreground py-2", children: wd }, wd)),
        days.map((day, idx) => {
          if (day === null) {
            return /* @__PURE__ */ jsx("div", { className: "aspect-square" }, `empty-${idx}`);
          }
          const dateKey = formatDateKey(year, monthIndex, day);
          const data = dailyTotals[dateKey];
          const total = data?.total ?? 0;
          const count = data?.count ?? 0;
          const isToday = isCurrentMonth && day === todayDay;
          const heatClass = getHeatColor(total);
          return /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: () => openDay(day),
              className: `
                    aspect-square rounded-lg border transition-all hover:scale-105 hover:shadow-sm
                    flex flex-col items-center justify-center gap-0.5
                    ${heatClass}
                    ${isToday ? "ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-1 dark:ring-offset-slate-900" : "border-slate-200 dark:border-slate-700"}
                    ${count > 0 ? "cursor-pointer" : "cursor-default"}
                  `,
              children: [
                /* @__PURE__ */ jsx("span", { className: `text-xs font-medium ${isToday ? "text-blue-600 dark:text-blue-400" : ""}`, children: day }),
                count > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
                  /* @__PURE__ */ jsx("span", { className: "text-[10px] font-semibold leading-none", children: formatIdr(total) }),
                  /* @__PURE__ */ jsxs("span", { className: "text-[9px] opacity-70 leading-none", children: [
                    count,
                    " tx"
                  ] })
                ] })
              ]
            },
            day
          );
        })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4", children: [
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "pt-6", children: [
        /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mb-1", children: "Days with Spending" }),
        /* @__PURE__ */ jsx("div", { className: "text-2xl font-semibold", children: Object.values(dailyTotals).filter((d) => d.total > 0).length })
      ] }) }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "pt-6", children: [
        /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mb-1", children: "Total Transactions" }),
        /* @__PURE__ */ jsx("div", { className: "text-2xl font-semibold", children: Object.values(dailyTotals).reduce((s, d) => s + d.count, 0) })
      ] }) }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "pt-6", children: [
        /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mb-1", children: "Monthly Spend" }),
        /* @__PURE__ */ jsx("div", { className: "text-2xl font-semibold", children: formatIdr(Object.values(dailyTotals).reduce((s, d) => s + d.total, 0)) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(Dialog, { open: dialogOpen, onOpenChange: setDialogOpen, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-2xl max-h-[85vh] overflow-y-auto", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxs(DialogTitle, { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(CalendarDays, { className: "w-5 h-5 text-slate-500" }),
          selectedMonth,
          " ",
          selectedDay
        ] }),
        /* @__PURE__ */ jsx(DialogDescription, { children: selectedDayData ? `${selectedDayData.count} transaction${selectedDayData.count !== 1 ? "s" : ""} · Total ${formatIdr(selectedDayData.total)}` : "No transactions on this day" })
      ] }),
      selectedDayData && selectedDayData.transactions.length > 0 ? /* @__PURE__ */ jsx("div", { className: "rounded-xl border overflow-hidden", children: /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { children: "Title" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Category" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Amount" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Type" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Paid" })
        ] }) }),
        /* @__PURE__ */ jsx(TableBody, { children: selectedDayData.transactions.sort((a, b) => {
          const da = new Date(a.created_time || a.date).getTime();
          const db = new Date(b.created_time || b.date).getTime();
          return db - da;
        }).map((tx) => {
          const typeClass = tx.type === "cash" ? "text-blue-600 dark:text-blue-400" : tx.type === "credit_payment" ? "text-amber-600 dark:text-amber-400" : "text-purple-600 dark:text-purple-400";
          const typeLabel = tx.type === "cash" ? "Cash" : tx.type === "credit_payment" ? "Credit Pay" : "Credit";
          return /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: tx.title }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, { variant: "secondary", children: tx.category }) }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-right font-medium", children: formatIdr(tx.amount) }),
            /* @__PURE__ */ jsx(TableCell, { className: `${typeClass} text-xs font-semibold uppercase`, children: typeLabel }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(
              Badge,
              {
                variant: "secondary",
                className: `text-[10px] ${tx.done ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`,
                children: tx.done ? "Paid" : "Unpaid"
              }
            ) })
          ] }, tx.id);
        }) })
      ] }) }) : /* @__PURE__ */ jsx("div", { className: "py-8 text-center text-sm text-muted-foreground", children: "No transactions recorded for this day." }),
      /* @__PURE__ */ jsx("div", { className: "flex justify-end pt-2", children: /* @__PURE__ */ jsx(Button, { size: "sm", variant: "secondary", onClick: () => setDialogOpen(false), children: "Close" }) })
    ] }) })
  ] });
}

const $$Calendar = createComponent(($$result, $$props, $$slots) => {
  const transactions = getTransactions();
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Spending Calendar - Financial Dashboard" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-6"> <h1 class="text-2xl font-bold">Spending Calendar</h1> <p class="text-slate-500 dark:text-slate-400 text-sm">
Visualize daily spending intensity and drill down into individual days
</p> </div> ${renderComponent($$result2, "SpendingCalendar", SpendingCalendar, { "transactions": transactions, "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/SpendingCalendar", "client:component-export": "default" })} ` })}`;
}, "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/calendar.astro", void 0);

const $$file = "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/calendar.astro";
const $$url = "/calendar";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Calendar,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
