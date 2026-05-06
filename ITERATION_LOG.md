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

---

## Iteration 6 — FIN-017
**Date:** 2025-04-30
**Issue:** #3
**Branch:** `feat/FIN-017`
**PR:** #14

### What changed
- Added `categories` table to SQLite schema (additive migration): `id`, `name` (unique), `color`, `monthly_limit`, `created_at`
- Added category CRUD DB helpers: `getCategories()`, `getCategoryById()`, `getCategoryByName()`, `insertCategory()`, `updateCategory()`, `deleteCategory()`
- Added `Category` interface to `src/lib/data.ts`
- Created `/api/categories` (GET/POST) and `/api/categories/[id]` (GET/PUT/DELETE) API routes
- Added category API helpers to `src/lib/api.ts`: `fetchCategories()`, `createCategory()`, `updateCategoryApi()`, `deleteCategoryApi()`
- Created `CategorySettings.tsx` component with shadcn/ui `Card`, `Table`, `Input`, `Button`, `Label`
  - Inline add form with name, monthly limit, native color picker + 18 preset color swatches
  - Inline edit per row
  - Delete with confirmation dialog
- Created `/settings` Astro page hosting `CategorySettings`
- Added **Settings** link to desktop and mobile nav in `Layout.astro`

### Build status
✅ Passes — live at `http://192.168.0.6:4321`

### What's next
FIN-018: Implement Category-Level Budget Targets

---

## Iteration 7 — FIN-018
**Date:** 2025-05-01
**Issue:** #4
**Branch:** main
**PR:** N/A (direct)

### What changed
- Fetched categories client-side in `Dashboard.tsx` via `fetchCategories()`
- Built `categoryMap` lookup for quick limit resolution
- Added **Category Budgets** section inside the Outcome Breakdown card
  - Lists every category from `category_totals`, sorted by spend (descending)
  - Shows `amount / limit` text with color-coded thresholds (green <50%, amber 50-80%, red >80% / over-budget)
  - Displays a compact progress bar per category
  - Categories with no limit show spend amount with a neutral gray bar

### Build status
✅ Passes

---

## Iteration 8 — FIN-019
**Date:** 2025-05-01
**Issue:** #5
**Branch:** main
**PR:** N/A (direct)

### What changed
- Installed shadcn/ui `Checkbox` component
- Added bulk selection state (`Set<number>`) to `TransactionTable.tsx`
- Added **select-all** header checkbox and per-row checkboxes
- Added bulk action bar above the table showing count + **Delete Selected** button (destructive variant)
- Added `deleteTransactionsBulkApi()` to `src/lib/api.ts`
- Added `deleteTransactionsBulk(ids)` DB helper in `src/lib/db.ts`
- Added `DELETE /api/transactions` bulk endpoint in `src/pages/api/transactions/index.ts`

### Build status
✅ Passes

---

## Iteration 9 — FIN-020
**Date:** 2025-05-01
**Issue:** #6
**Branch:** main
**PR:** N/A (direct)

### What changed
- Added `findDuplicateTransaction()` to `src/lib/db.ts`
  - Checks for same `title`, `amount`, `category`, and `type` within last 24 hours
- Updated `POST /api/transactions` to run duplicate check
  - Returns `409 Conflict` with `{ duplicate: true, duplicateId, message }` if match found and `force` is not set
- Updated `AddTransactionForm.tsx`
  - On 409 response, opens a shadcn `Dialog` asking "A similar transaction was added within the last 24 hours. Are you sure you want to add it again?"
  - **Add Anyway** resubmits with `force: true`
  - **Cancel** closes dialog without adding

### Build status
✅ Passes

---

## Hotfix — TypeScript Errors
**Date:** 2025-05-01
**Branch:** main

### What changed
- Fixed `IncomeOutcomeChart.tsx`: changed import from `../lib/dataStore` to `../lib/data` for `MonthlySummary`
- Fixed `NetworthChart.tsx`: changed import from `../lib/dataStore` to `../lib/data` for `NetworthRecord`
- Fixed `src/lib/data.ts`: changed `monthlySummaryJson as MonthlySummary[]` to `monthlySummaryJson as unknown as MonthlySummary[]` to suppress strict overlap error caused by undefined category values in JSON

### Build status
✅ Passes — `tsc --noEmit` clean

---

## Iteration 10 — FIN-023
**Date:** 2025-05-01
**Issue:** #17
**Branch:** `feat/FIN-023`
**PR:** #18

### What changed
- Added DB helpers for `monthly_income`: `getMonthlyIncome()`, `getMonthlyIncomeByMonth()`, `upsertMonthlyIncome()`, `deleteMonthlyIncome()`
- Added API routes: `GET /api/income`, `POST /api/income`, `PUT /api/income/[month]`, `DELETE /api/income/[month]`
- Added client API helpers in `src/lib/api.ts`: `fetchMonthlyIncome()`, `upsertMonthlyIncomeApi()`, `updateMonthlyIncomeApi()`, `deleteMonthlyIncomeApi()`
- Created `IncomeSettings.tsx` component with shadcn/ui Card, Table, Input, Button, Label
  - Inline add form with month/year selector, income, and other income fields
  - Inline edit per row
  - Delete with confirmation
- Integrated `IncomeSettings` into `/settings` page above Category Settings

### Build status
✅ Passes — live at `http://192.168.0.6:4321`

### What's next
FIN-024: Add JSON/CSV export UI button since the `/api/export` endpoint already exists but has no UI exposure.

---

## Iteration 11 — FIN-024
**Date:** 2026-05-03
**Issue:** #19
**Branch:** `feat/FIN-024`
**PR:** #19 (merged)

### What changed
- Enhanced `/api/export` to support `?format=csv` with `?type=transactions|networth|summary`
  - JSON export remains the default (`?format=json`)
  - CSV values are properly escaped for commas, quotes, and newlines
- Created `ExportData.tsx` component with shadcn/ui `Card` and `Button`
- Added 4 export buttons on `/settings` page:
  - Export JSON (All data)
  - Export Transactions CSV
  - Export Networth CSV
  - Export Monthly Summary CSV
- Files are downloaded client-side via Blob URLs with date-stamped filenames

### Build status
✅ Passes — live at `http://192.168.0.6:4321`

---

## Iteration 12 — Schema Bugfix
**Date:** 2026-05-06
**Issue:** #20
**Branch:** `fix/monthly-income-schema`
**PR:** #21 (merged)

### What changed
- Added missing `CREATE TABLE IF NOT EXISTS monthly_income` to `initSchema()` in `src/lib/db.ts`
  - Schema: `month TEXT PRIMARY KEY`, `date TEXT NOT NULL`, `income REAL NOT NULL DEFAULT 0`, `other_income REAL NOT NULL DEFAULT 0`
  - Uses `IF NOT EXISTS` so existing production DB is unaffected
- This fixes a crash on fresh installs / DB resets whenever any code queries `monthly_income`

### Build status
✅ Passes

---