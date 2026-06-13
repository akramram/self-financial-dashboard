import { jsx, jsxs } from 'react/jsx-runtime';
import 'react';
import 'clsx';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle } from './dialog_DfMno1mY.mjs';
import { I as Input } from './input_DnZKLWYU.mjs';
import { L as Label } from './label_OcnW5WOo.mjs';
import { B as Button } from './button_ggfKrUNv.mjs';
import { C as Checkbox } from './checkbox_Chb43CU7.mjs';

const TYPE_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "credit_expense", label: "Credit Expense" },
  { value: "credit_payment", label: "Credit Payment" }
];
function EditTransactionDialog({
  open,
  transaction,
  onChange,
  onSave,
  onCancel,
  showMonth = false,
  months = [],
  periods = [],
  categories = []
}) {
  if (!transaction) return null;
  const periodOptions = periods.length > 0 ? periods : months.map((m, i) => ({ period_id: i, month: m }));
  return /* @__PURE__ */ jsx(Dialog, { open, onOpenChange: (v) => {
    if (!v) onCancel();
  }, children: /* @__PURE__ */ jsxs(DialogContent, { className: "sm:max-w-[480px]", children: [
    /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: "Edit Transaction" }) }),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-4 py-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(
          Checkbox,
          {
            id: "edit-done",
            checked: !!transaction.done,
            onCheckedChange: (v) => onChange("done", !!v)
          }
        ),
        /* @__PURE__ */ jsx(Label, { htmlFor: "edit-done", className: "text-sm font-medium", children: transaction.done ? "Paid" : "Unpaid" })
      ] }),
      showMonth && /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "edit-period", className: "text-xs text-muted-foreground", children: "Period" }),
        /* @__PURE__ */ jsxs(
          "select",
          {
            id: "edit-period",
            value: transaction.period_id ?? "",
            onChange: (e) => onChange("period_id", parseInt(e.target.value)),
            className: "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            children: [
              /* @__PURE__ */ jsx("option", { value: "", disabled: true, children: "Select period" }),
              periodOptions.map((p) => /* @__PURE__ */ jsx("option", { value: p.period_id, children: p.month }, p.period_id))
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "edit-title", className: "text-xs text-muted-foreground", children: "Title" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: "edit-title",
            type: "text",
            value: transaction.title ?? "",
            onChange: (e) => onChange("title", e.target.value)
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "edit-category", className: "text-xs text-muted-foreground", children: "Category" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "edit-category",
            list: "category-list",
            type: "text",
            value: transaction.category ?? "",
            onChange: (e) => onChange("category", e.target.value),
            className: "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          }
        ),
        /* @__PURE__ */ jsx("datalist", { id: "category-list", children: categories.map((c) => /* @__PURE__ */ jsx("option", { value: c }, c)) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "edit-amount", className: "text-xs text-muted-foreground", children: "Amount" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: "edit-amount",
            type: "number",
            value: transaction.amount ?? "",
            onChange: (e) => onChange("amount", parseFloat(e.target.value) || 0)
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "edit-type", className: "text-xs text-muted-foreground", children: "Type" }),
        /* @__PURE__ */ jsx(
          "select",
          {
            id: "edit-type",
            value: transaction.type ?? "",
            onChange: (e) => onChange("type", e.target.value),
            className: "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            children: TYPE_OPTIONS.map((opt) => /* @__PURE__ */ jsx("option", { value: opt.value, children: opt.label }, opt.value))
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "edit-payment", className: "text-xs text-muted-foreground", children: "Payment Method" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: "edit-payment",
            type: "text",
            value: transaction.payment_method ?? "",
            onChange: (e) => onChange("payment_method", e.target.value)
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "edit-notes", className: "text-xs text-muted-foreground", children: "Notes" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: "edit-notes",
            type: "text",
            value: transaction.notes ?? "",
            onChange: (e) => onChange("notes", e.target.value)
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2", children: [
      /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: onCancel, children: "Cancel" }),
      /* @__PURE__ */ jsx(Button, { onClick: onSave, children: "Save" })
    ] })
  ] }) });
}

export { EditTransactionDialog as E };
