import { jsx } from 'react/jsx-runtime';
import * as React from 'react';
import { c as cn } from './button_DnJ041oi.mjs';
import { cva } from 'class-variance-authority';

async function fetchTransactions(filters) {
  const params = new URLSearchParams();
  const res = await fetch(`/api/transactions?${params.toString()}`);
  return res.json();
}
async function createTransaction(tx) {
  const res = await fetch("/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tx)
  });
  return res.json();
}
async function updateTransactionApi(id, tx) {
  await fetch(`/api/transactions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tx)
  });
}
async function toggleTransactionDoneApi(id, done) {
  await fetch(`/api/transactions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ done })
  });
}
async function deleteTransactionApi(id) {
  await fetch(`/api/transactions/${id}`, { method: "DELETE" });
}
async function fetchNetworth() {
  const res = await fetch("/api/networth");
  return res.json();
}
async function createNetworth(record) {
  await fetch("/api/networth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record)
  });
}
async function updateNetworthApi(month, record) {
  await fetch(`/api/networth/${encodeURIComponent(month)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record)
  });
}

const Input = React.forwardRef(
  ({ className, type, ...props }, ref) => {
    return /* @__PURE__ */ jsx(
      "input",
      {
        type,
        className: cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        ),
        ref,
        ...props
      }
    );
  }
);
Input.displayName = "Input";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);
function Badge({ className, variant, ...props }) {
  return /* @__PURE__ */ jsx("div", { className: cn(badgeVariants({ variant }), className), ...props });
}

export { Badge as B, Input as I, fetchNetworth as a, createNetworth as b, createTransaction as c, deleteTransactionApi as d, updateTransactionApi as e, fetchTransactions as f, toggleTransactionDoneApi as t, updateNetworthApi as u };
