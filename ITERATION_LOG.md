# Iteration Log

## Baseline (Pre-Iteration)
**Date:** 2025-04-28
**Branch:** main
**Issues Created:** #1-#6

### Current State
- Astro 4 + React 18 + Tailwind CSS 3 + better-sqlite3
- UI uses native Tailwind classes (no component library)
- Tables are raw HTML `<table>` elements
- Forms are raw HTML `<input>` elements
- No category management UI exists
- No budget targets exist
- No bulk actions exist
- No duplicate detection exists
- DB at `data/financial.db` with transactions, networth, monthly_income tables

### Issue Backlog
| # | Issue | Epic | Status |
|---|-------|------|--------|
| #1 | [FIN-015] Initialize shadcn/ui Ecosystem | Epic 1 | Open |
| #2 | [FIN-016] Refactor Existing Tables & Forms | Epic 1 | Open |
| #3 | [FIN-017] Build Category Settings Module | Epic 2 | Open |
| #4 | [FIN-018] Category-Level Budget Targets | Epic 2 | Open |
| #5 | [FIN-019] Bulk Table Actions | Epic 3 | Open |
| #6 | [FIN-020] Duplicate Entry Guardrail | Epic 3 | Open |

---

(Iterations will be appended below)

---

## Iteration 1 — FIN-015
**Date:** 2025-04-28
**Issue:** #1
**Branch:** `feat/FIN-015`
**PR:** #7

### What changed
- Installed shadcn/ui React ecosystem (`tailwindcss-animate`, `tailwind-merge`, `class-variance-authority`)
- Configured `tailwind.config.mjs` with shadcn theme tokens
- Created `src/lib/utils.ts` with `cn()` helper
- Created `src/styles/globals.css` with CSS variables
- Created `components.json`
- Updated `tsconfig.json` with `@/*` path alias
- Imported globals.css in `Layout.astro`
- Installed core components: Button, Input, Card, Table, Dialog, Select
- Added demo usage on `add.astro` (Card + Button)

### Build status
✅ Passes

---

## Iteration 2 — FIN-021 (Manual Trigger)
**Date:** 2025-04-28
**Issue:** #7 (created manually)
**Branch:** `feat/FIN-021-outcome-breakdown-income-budget`
**PR:** Merged to main

### What changed
- Added **Total Income** line to Outcome Breakdown card on Dashboard
- Added **Budget Used** progress bar showing `outcome.total / income` percentage
- Color-coded thresholds: green (<50%), amber (50-80%), red (>80%)
- Shows "X spent of Y" detail text under the bar
- Works for both All-time (latest month) and filtered month views
- No DB/schema changes — uses existing MonthlySummary data

### Build status
✅ Passes — live at `http://192.168.0.6:4321`

---

## Iteration 3 — FIN-022 (Manual Trigger)
**Date:** 2025-04-28
**Issue:** User request
**Branch:** `feat/FIN-022-paid-toggle-outcome-filter`
**PR:** Merged to main

### What changed
- **Outcome Breakdown** now only includes **paid transactions** (`done = 1`) in all calculations
  - Updated `getMonthlySummary()` in `src/lib/db.ts` to filter `WHERE done = 1`
- Added **Paid/Unpaid toggle button** as the **first column** in transaction tables:
  - `Dashboard.tsx` inline transaction table
  - `TransactionTable.tsx` (used on `/transactions` page)
- Toggle button styling:
  - Green badge for **Paid** transactions
  - Red badge for **Unpaid** transactions
- Clicking the badge toggles the `done` status via API and refreshes the page
- Also added `done` checkbox to the inline **Edit** row in both tables
- Added `toggleTransactionDoneApi()` helper to `src/lib/api.ts`

### Build status
✅ Passes — live at `http://192.168.0.6:4321`

### What's next
FIN-016: Refactor existing tables and forms to shadcn/ui components

---

## Iteration 4 — UI Reorder & Pagination
**Date:** 2025-04-28
**Issue:** #10
**Branch:** main (direct)
**PR:** N/A

### What changed
- Moved **Outcome Breakdown** card to top section of Dashboard
- Moved **This Month Transactions** card to top section
- Moved **Summary/Totals** cards to bottom of dashboard
- Added pagination controls to current month transaction table (10 per page)
- Reset page to 1 when month filter changes

### Build status
✅ Passes

---

## Iteration 5 — FIN-016
**Date:** 2025-04-29
**Issue:** #2
**Branch:** `feat/FIN-016`
**PR:** #13

### What changed
- **TransactionTable.tsx**: Migrated raw `<table>` to shadcn/ui `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`. Replaced native `<input>`, `<select>`, `<button>` with shadcn `Input`, `Select`, `Button`, `Badge`.
- **Dashboard.tsx**: Refactored inline transaction table with same shadcn/ui components. Replaced month filter `<select>` with shadcn `Select`.
- **AddTransactionForm.tsx**: Wrapped in `Card`. Replaced all native inputs/selects/buttons with shadcn `Input`, `Select`, `Button`, `Label`, `Badge`.
- **AddNetworthForm.tsx**: Wrapped in `Card`. Replaced all native inputs/selects/buttons with shadcn `Input`, `Select`, `Button`, `Label`, `Badge`.
- **NetworthEditForm.tsx**: Wrapped in `Card`. Replaced all native inputs/buttons with shadcn `Input`, `Button`, `Label`, `Badge`.
- **NetworthTable.tsx**: New component extracted from `networth.astro` server-rendered table, now using shadcn `Table` + `Button`.
- **networth.astro**: Replaced raw HTML table with `<NetworthTable client:load />`.
- **add.astro**: Removed redundant wrapper divs since forms now self-wrap in `Card`.
- Installed additional shadcn components: `label`, `badge`.

### Build status
✅ Passes — live at `http://192.168.0.6:4321`

### What's next
FIN-017: Build Category Settings Module