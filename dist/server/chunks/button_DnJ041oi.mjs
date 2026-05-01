import { f as createComponent, r as renderTemplate, k as renderSlot, l as renderHead, i as createAstro } from './astro/server_BVE5k6Zu.mjs';
import 'kleur/colors';
import { clsx } from 'clsx';
/* empty css                       */
import { jsx } from 'react/jsx-runtime';
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Astro = createAstro();
const $$Layout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Layout;
  const { title = "Financial Dashboard" } = Astro2.props;
  return renderTemplate(_a || (_a = __template(['<html lang="en" class="dark"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>', "</title>", '</head> <body class="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 min-h-screen"> <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"> <!-- Nav --> <nav class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4"> <div class="flex items-center gap-4"> <a href="/" class="text-2xl font-bold tracking-tight hover:text-slate-600 dark:hover:text-slate-300 transition">\nFinancial Dashboard\n</a> <div class="hidden sm:flex items-center gap-2 text-sm"> <a href="/" class="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition">Dashboard</a> <a href="/transactions" class="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition">Transactions</a> <a href="/networth" class="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition">Networth</a> <a href="/add" class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition">+ Add Data</a> </div> </div> <div class="flex items-center gap-2"> <button id="themeToggle" class="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition">\nToggle Dark\n</button> </div> </nav> <!-- Mobile nav --> <div class="flex sm:hidden items-center gap-2 text-sm mb-6 overflow-x-auto pb-2"> <a href="/" class="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 whitespace-nowrap">Dashboard</a> <a href="/transactions" class="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 whitespace-nowrap">Transactions</a> <a href="/networth" class="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 whitespace-nowrap">Networth</a> <a href="/add" class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white whitespace-nowrap">+ Add</a> </div> ', ` <footer class="mt-12 text-center text-xs text-slate-400 dark:text-slate-600 pb-8">
Financial Dashboard \xB7 Built with Astro & React
</footer> </div> <script>
      const themeToggle = document.getElementById('themeToggle');
      themeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
      });
    <\/script> </body> </html>`])), title, renderHead(), renderSlot($$result, $$slots["default"]));
}, "/root/self-financial-dashboard/src/layouts/Layout.astro", void 0);

function cn(...inputs) {
  return twMerge(clsx(inputs));
}
function formatIdr(n) {
  if (n == null) return "IDR 0";
  return "IDR " + Math.round(n).toLocaleString("id-ID");
}

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return /* @__PURE__ */ jsx(
      Comp,
      {
        className: cn(buttonVariants({ variant, size, className })),
        ref,
        ...props
      }
    );
  }
);
Button.displayName = "Button";

export { $$Layout as $, Button as B, cn as c, formatIdr as f };
