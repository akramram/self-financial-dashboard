import { f as createComponent, r as renderTemplate, n as renderSlot, o as renderHead, i as createAstro } from './astro/server_BN-0jZ66.mjs';
import 'kleur/colors';
import { clsx } from 'clsx';
/* empty css                       */
import { twMerge } from 'tailwind-merge';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$Astro = createAstro();
const $$Layout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Layout;
  const { title = "Financial Dashboard" } = Astro2.props;
  return renderTemplate(_a || (_a = __template(['<html lang="en"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>', "</title><script>\n      (function() {\n        const theme = localStorage.getItem('theme');\n        if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {\n          document.documentElement.classList.add('dark');\n        } else {\n          document.documentElement.classList.remove('dark');\n        }\n      })();\n    <\/script>", '</head> <body class="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 min-h-screen"> <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"> <!-- Top bar: Logo + Search + Dark toggle --> <div class="flex items-center justify-between mb-4"> <a href="/" class="text-xl sm:text-2xl font-bold tracking-tight hover:text-slate-600 dark:hover:text-slate-300 transition">\n\u{1F4B0} Financial Dashboard\n</a> <div class="flex items-center gap-2"> <!-- Command Palette Trigger --> <button id="cmdPaletteBtn" class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-200/70 dark:bg-slate-700/70 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600 transition border border-slate-200 dark:border-slate-600" aria-label="Open command palette"> <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg> <span>Search...</span> <kbd class="ml-4 px-1 py-0.5 rounded border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-800 text-[10px] font-mono">\u2318K</kbd> </button> <button id="themeToggle" class="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition" aria-label="Toggle dark mode"> <span class="dark:hidden">\u{1F319}</span> <span class="hidden dark:inline">\u2600\uFE0F</span> </button> <!-- Hamburger (mobile only) --> <button id="menuToggle" class="sm:hidden p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition" aria-label="Toggle menu"> <svg id="menuIconOpen" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg> <svg id="menuIconClose" class="w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg> </button> </div> </div> <!-- Desktop nav bar \u2014 centered, wrapping, with active page highlight --> <nav id="desktopNav" class="hidden sm:flex flex-wrap items-center justify-center gap-1.5 mb-6 p-3 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700"> <a href="/" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600">Dashboard</a> <a href="/transactions" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600">Transactions</a> <a href="/networth" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600">Networth</a> <a href="/portfolio" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600 text-violet-600 dark:text-violet-400">Portfolio</a> <a href="/budget" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600">Budget</a> <a href="/compare" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600">Compare</a> <a href="/analytics" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600">Analytics</a> <a href="/cashflow" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600">Cash Flow</a> <a href="/calendar" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600">Calendar</a> <a href="/goals" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600">Goals</a> <a href="/recurring" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600">Recurring</a> <a href="/yearly" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600">Yearly</a> <a href="/health" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600 text-indigo-600 dark:text-indigo-400">Health</a> <a href="/forecast" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600 text-rose-600 dark:text-rose-400">Forecast</a> <a href="/fire" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600 text-orange-600 dark:text-orange-400">FIRE \u{1F525}</a> <a href="/settings" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600">Settings</a> <a href="/add" class="nav-link-cta px-3 py-1.5 rounded-lg text-sm font-bold transition bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm">+ Add</a> </nav> <!-- Mobile nav dropdown --> <nav id="mobileNav" class="sm:hidden hidden mb-6 p-3 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700"> <div class="grid grid-cols-2 gap-1.5"> <a href="/" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700">Dashboard</a> <a href="/transactions" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700">Transactions</a> <a href="/networth" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700">Networth</a> <a href="/portfolio" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700 text-violet-600 dark:text-violet-400">Portfolio</a> <a href="/budget" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700">Budget</a> <a href="/compare" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700">Compare</a> <a href="/analytics" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700">Analytics</a> <a href="/cashflow" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700">Cash Flow</a> <a href="/calendar" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700">Calendar</a> <a href="/goals" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700">Goals</a> <a href="/recurring" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700">Recurring</a> <a href="/yearly" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700">Yearly</a> <a href="/health" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400">Health</a> <a href="/forecast" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700 text-rose-600 dark:text-rose-400">Forecast</a> <a href="/fire" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700 text-orange-600 dark:text-orange-400">FIRE \u{1F525}</a> <a href="/settings" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700">Settings</a> <a href="/add" class="nav-link-cta px-3 py-2.5 rounded-lg text-sm font-bold text-center transition bg-emerald-600 text-white col-span-2 hover:bg-emerald-700 shadow-sm">+ Add Data</a> </div> </nav> ', ` <footer class="mt-12 text-center text-xs text-slate-400 dark:text-slate-600 pb-8">
Financial Dashboard \xB7 Built with Astro & React
</footer> </div> <script>
      // Dark mode toggle
      const themeToggle = document.getElementById('themeToggle');
      themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
      });

      // Mobile menu toggle
      const menuToggle = document.getElementById('menuToggle');
      const mobileNav = document.getElementById('mobileNav');
      const menuIconOpen = document.getElementById('menuIconOpen');
      const menuIconClose = document.getElementById('menuIconClose');

      menuToggle.addEventListener('click', () => {
        const isOpen = !mobileNav.classList.contains('hidden');
        mobileNav.classList.toggle('hidden');
        menuIconOpen.classList.toggle('hidden');
        menuIconClose.classList.toggle('hidden');
      });

      // Active page highlighting
      function highlightActivePage() {
        const currentPath = window.location.pathname.replace(/\\/$/, '') || '/';
        document.querySelectorAll('.nav-link, .nav-link-cta').forEach(link => {
          const href = link.getAttribute('href').replace(/\\/$/, '') || '/';
          if (href === currentPath) {
            link.classList.add('bg-slate-200', 'dark:bg-slate-600');
          }
        });
      }
      highlightActivePage();
    <\/script> <!-- Command Palette -->   </body> </html>`], ['<html lang="en"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>', "</title><script>\n      (function() {\n        const theme = localStorage.getItem('theme');\n        if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {\n          document.documentElement.classList.add('dark');\n        } else {\n          document.documentElement.classList.remove('dark');\n        }\n      })();\n    <\/script>", '</head> <body class="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 min-h-screen"> <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"> <!-- Top bar: Logo + Search + Dark toggle --> <div class="flex items-center justify-between mb-4"> <a href="/" class="text-xl sm:text-2xl font-bold tracking-tight hover:text-slate-600 dark:hover:text-slate-300 transition">\n\u{1F4B0} Financial Dashboard\n</a> <div class="flex items-center gap-2"> <!-- Command Palette Trigger --> <button id="cmdPaletteBtn" class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-200/70 dark:bg-slate-700/70 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600 transition border border-slate-200 dark:border-slate-600" aria-label="Open command palette"> <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg> <span>Search...</span> <kbd class="ml-4 px-1 py-0.5 rounded border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-800 text-[10px] font-mono">\u2318K</kbd> </button> <button id="themeToggle" class="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition" aria-label="Toggle dark mode"> <span class="dark:hidden">\u{1F319}</span> <span class="hidden dark:inline">\u2600\uFE0F</span> </button> <!-- Hamburger (mobile only) --> <button id="menuToggle" class="sm:hidden p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition" aria-label="Toggle menu"> <svg id="menuIconOpen" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg> <svg id="menuIconClose" class="w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg> </button> </div> </div> <!-- Desktop nav bar \u2014 centered, wrapping, with active page highlight --> <nav id="desktopNav" class="hidden sm:flex flex-wrap items-center justify-center gap-1.5 mb-6 p-3 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700"> <a href="/" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600">Dashboard</a> <a href="/transactions" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600">Transactions</a> <a href="/networth" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600">Networth</a> <a href="/portfolio" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600 text-violet-600 dark:text-violet-400">Portfolio</a> <a href="/budget" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600">Budget</a> <a href="/compare" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600">Compare</a> <a href="/analytics" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600">Analytics</a> <a href="/cashflow" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600">Cash Flow</a> <a href="/calendar" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600">Calendar</a> <a href="/goals" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600">Goals</a> <a href="/recurring" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600">Recurring</a> <a href="/yearly" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600">Yearly</a> <a href="/health" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600 text-indigo-600 dark:text-indigo-400">Health</a> <a href="/forecast" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600 text-rose-600 dark:text-rose-400">Forecast</a> <a href="/fire" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600 text-orange-600 dark:text-orange-400">FIRE \u{1F525}</a> <a href="/settings" class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium transition hover:bg-slate-200 dark:hover:bg-slate-600">Settings</a> <a href="/add" class="nav-link-cta px-3 py-1.5 rounded-lg text-sm font-bold transition bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm">+ Add</a> </nav> <!-- Mobile nav dropdown --> <nav id="mobileNav" class="sm:hidden hidden mb-6 p-3 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700"> <div class="grid grid-cols-2 gap-1.5"> <a href="/" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700">Dashboard</a> <a href="/transactions" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700">Transactions</a> <a href="/networth" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700">Networth</a> <a href="/portfolio" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700 text-violet-600 dark:text-violet-400">Portfolio</a> <a href="/budget" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700">Budget</a> <a href="/compare" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700">Compare</a> <a href="/analytics" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700">Analytics</a> <a href="/cashflow" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700">Cash Flow</a> <a href="/calendar" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700">Calendar</a> <a href="/goals" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700">Goals</a> <a href="/recurring" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700">Recurring</a> <a href="/yearly" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700">Yearly</a> <a href="/health" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400">Health</a> <a href="/forecast" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700 text-rose-600 dark:text-rose-400">Forecast</a> <a href="/fire" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700 text-orange-600 dark:text-orange-400">FIRE \u{1F525}</a> <a href="/settings" class="nav-link px-3 py-2.5 rounded-lg text-sm font-medium text-center transition hover:bg-slate-100 dark:hover:bg-slate-700">Settings</a> <a href="/add" class="nav-link-cta px-3 py-2.5 rounded-lg text-sm font-bold text-center transition bg-emerald-600 text-white col-span-2 hover:bg-emerald-700 shadow-sm">+ Add Data</a> </div> </nav> ', ` <footer class="mt-12 text-center text-xs text-slate-400 dark:text-slate-600 pb-8">
Financial Dashboard \xB7 Built with Astro & React
</footer> </div> <script>
      // Dark mode toggle
      const themeToggle = document.getElementById('themeToggle');
      themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
      });

      // Mobile menu toggle
      const menuToggle = document.getElementById('menuToggle');
      const mobileNav = document.getElementById('mobileNav');
      const menuIconOpen = document.getElementById('menuIconOpen');
      const menuIconClose = document.getElementById('menuIconClose');

      menuToggle.addEventListener('click', () => {
        const isOpen = !mobileNav.classList.contains('hidden');
        mobileNav.classList.toggle('hidden');
        menuIconOpen.classList.toggle('hidden');
        menuIconClose.classList.toggle('hidden');
      });

      // Active page highlighting
      function highlightActivePage() {
        const currentPath = window.location.pathname.replace(/\\\\/$/, '') || '/';
        document.querySelectorAll('.nav-link, .nav-link-cta').forEach(link => {
          const href = link.getAttribute('href').replace(/\\\\/$/, '') || '/';
          if (href === currentPath) {
            link.classList.add('bg-slate-200', 'dark:bg-slate-600');
          }
        });
      }
      highlightActivePage();
    <\/script> <!-- Command Palette -->   </body> </html>`])), title, renderHead(), renderSlot($$result, $$slots["default"]));
}, "/Users/user/hermes-workspace/self-financial-dashboard/src/layouts/Layout.astro", void 0);

function cn(...inputs) {
  return twMerge(clsx(inputs));
}
function formatIdr(n) {
  if (n == null) return "IDR 0";
  return "IDR " + Math.round(n).toLocaleString("id-ID");
}
function getActivePeriod() {
  const now = /* @__PURE__ */ new Date();
  const day = now.getDate();
  if (day >= 21) {
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return {
      month: next.toLocaleDateString("en-US", { month: "long" }),
      year: next.getFullYear()
    };
  }
  return {
    month: now.toLocaleDateString("en-US", { month: "long" }),
    year: now.getFullYear()
  };
}
function getMonthSortKey(monthName) {
  const monthMap = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    oktober: 10,
    november: 11,
    december: 12,
    month: 1
  };
  const parts = monthName.toLowerCase().split(" ");
  let year = 0;
  let monthNum = 0;
  for (const part of parts) {
    if (monthMap[part]) monthNum = monthMap[part];
    else if (/^\d+$/.test(part)) year = parseInt(part, 10);
  }
  return year * 100 + monthNum;
}

export { $$Layout as $, getMonthSortKey as a, cn as c, formatIdr as f, getActivePeriod as g };
