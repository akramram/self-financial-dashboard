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
## Iteration 13 — FIN-025
**Date:** 2026-05-08
**Issue:** #22
**Branch:** `feat/FIN-025`
**PR:** #23

### What changed
- **CategoryChart**: added `categories` prop; uses category colors from Settings instead of hardcoded palette. Unknown categories fall back to the original palette.
- **Dashboard**: passes fetched `categories` to `CategoryChart`. Category badges in the inline transaction table now use the category color as background with white text. Category budget progress bars use the category color at 15% opacity (`#RRGGBB26`) for the track background; no-limit categories use the category color for the fill itself.
- **TransactionTable**: fetches categories client-side and applies category colors to category badges.

### Build status
✅ Passes — live at `http://192.168.0.6:4321`

---

## Iteration 14 — Dark Mode Persistence
**Date:** 2026-05-12
**Issue:** #26
**Branch:** `fix/dark-mode-persistence`
**PR:** #27 (merged)

### What changed
- Removed hardcoded `class="dark"` from `<html>` in `Layout.astro`
- Added inline `<script>` in `<head>` that reads `localStorage.theme` and applies the `dark` class before the page renders, preventing FOUC
- Updated toggle button script to save the active theme preference to `localStorage`
- Defaults to dark mode if no preference is saved (matches original behavior)
- Theme preference now persists across all page navigations in the MPA

### Build status
✅ Passes — live at `http://192.168.0.6:4321`

---

## Iteration 15 — FIN-027
**Date:** 2026-05-12
**Issue:** #28
**Branch:** `feat/FIN-027`
**PR:** #29 (merged)

### What changed
- Added `POST /api/import` endpoint supporting JSON and CSV import for transactions, networth, and monthly_income
- Added `importDataApi()` client helper in `src/lib/api.ts`
- Created `ImportData.tsx` component with:
  - File upload (JSON or CSV)
  - Auto-detection of format and data type from JSON keys
  - Manual type selection for CSV
  - Preview table showing first 5 rows
  - Import summary (imported / skipped / errors)
- Integrated `ImportData` into `/settings` page between Export and Income settings

### Build status
✅ Passes — live at `http://192.168.0.6:4321`

---

## Iteration 16 — FIN-028
**Date:** 2026-05-14
**Issue:** N/A (autonomous innovation)
**Branch:** `main`
**PR:** Pushed directly

### What changed
- Created `CategoryTrendChart.tsx` — a new Line chart visualization using Chart.js
  - Automatically identifies the top 6 categories by total spend across all time
  - Renders a multi-line trend chart with one line per category
  - Uses category colors from Settings; falls back to a curated 10-color palette
  - Y-axis uses compact formatting (1M, 1K) for readability
  - Interactive legend (click to hide/show lines) and index-mode tooltips
- Integrated the chart into `Dashboard.tsx` between the Savings Rate Trend and the Networth/Category doughnut row
- Chart respects the month filter: when a specific month is selected, it shows data only for that month (single point per category)

### Why it matters
Users can now visually track which spending categories are growing or shrinking over time — a critical personal finance insight that was previously impossible to see at a glance.

### Build status
✅ Passes — `npm run build` clean

---

## Iteration 17 — FIN-029
**Date:** 2026-05-15
**Issue:** N/A (autonomous innovation)
**Branch:** `main`
**PR:** Pushed directly

### What changed
- Created `FinancialInsights.tsx` — a new Smart Insights widget for the dashboard
  - Budget alerts: flags categories over budget (red) or near limit >=80% (amber)
  - Spending trend: compares current month total spending vs previous month with % change
  - Unpaid bills tracker: counts unpaid transactions and shows their total amount
  - Networth trend: shows month-over-month change with amount and percentage
  - Savings rate health: warns on negative/low savings (<10%), celebrates healthy rates
- Integrated the widget into `Dashboard.tsx` directly below the month filter
  - Receives `transactions`, `networth`, `summaries`, `categories`, and `activeMonth` props
  - Fully reactive to month filter changes (works for both All-time and specific months)
- Uses existing shadcn/ui `Card`, `CardHeader`, `CardTitle`, `CardContent`, and `Badge` components
- Uses `lucide-react` icons: `TrendingUp`, `TrendingDown`, `AlertTriangle`, `CheckCircle`, `Wallet`, `PiggyBank`, `Receipt`
- Color-coded insight cards with dark-mode support (emerald for good, amber for watch, red for alert)
- No DB schema or API changes required — computes entirely from existing client-side data

### Why it matters
Previously, users had to manually scan category budgets, compare months, and check unpaid statuses across different parts of the dashboard. The Insights widget surfaces actionable intelligence automatically, helping users catch overspending, missed payments, and savings trends at a glance.

### Build status
✅ Passes — `npm run build` clean

---

---

## Iteration 18 — FIN-030
**Date:** 2026-05-18
**Issue:** [#31](https://github.com/akramram/self-financial-dashboard/issues/31)
**Branch:** `feat/FIN-030`
**PR:** [#32](https://github.com/akramram/self-financial-dashboard/pull/32)

### What changed
- Updated `AddTransactionForm.tsx` default state:
  - `type` default changed from `'cash'` → `'credit_expense'`
  - `done` default changed from `false` → `true`
- This means every new transaction form now opens with **Credit Expense** selected and **Paid/Done** already checked.

### Why it matters
Reduces friction for the most common entry pattern (credit card expenses that are already paid). Users no longer need to manually switch type and check the paid box on every transaction.

### Build status
✅ Passes — `npm run build` clean

---

## Iteration 19 — FIN-031
**Date:** 2026-05-18
**Issue:** [#30](https://github.com/akramram/self-financial-dashboard/issues/30)
**Branch:** `feat/FIN-031`
**PR:** [#33](https://github.com/akramram/self-financial-dashboard/pull/33)

### What changed
- Created `OutcomeBarChart.tsx` — a new reusable horizontal bar chart component using Chart.js
  - Displays outcome grouped by category for a single month (default mode)
  - Supports an optional trend mode (single category across all months) when `summaries` prop is passed
  - Uses category colors from Settings; falls back to a curated 10-color palette
  - Highlights a selected category with full opacity + 2px border; dims others to 25% opacity
  - Y-axis uses compact formatting (1M, 1K) for readability
  - Responsive layout with fixed 256px height
- Integrated the chart into `Dashboard.tsx` inside the category transactions dialog
  - Chart renders above the transaction table when a category is clicked from the doughnut chart
  - Uses `activeSummary.category_totals` which already filters to `done=1` and aggregates `cash` + `credit_expense`
  - Dialog max-height increased from `80vh` to `85vh` to accommodate the chart without excessive scrolling

### Why it matters
Users can now see a visual breakdown of where their money went for the selected month immediately upon opening a category dialog. Previously, they only saw raw transaction rows with no comparative context. The highlighted category makes it easy to spot the selected category's relative share at a glance.

### Build status
✅ Passes — `npm run build` clean

## Iteration 20 — FIN-032: Month Filter on Transaction Page

**Date:** 2026-05-18
**Branch:** feat/FIN-032
**PR:** #35
**Issue:** #34

### What changed
- Added month filter dropdown to `TransactionTable` component
- Filter options dynamically derived from all unique `month` values in transactions, sorted descending (newest first)
- Works in combination with existing type filter and search input
- Selecting "All Months" resets the filter

### Files changed
- `src/components/TransactionTable.tsx`

### Why it matters
Users can now quickly narrow down transactions to a specific billing/reporting month instead of scrolling through paginated results across all months. Useful for reconciling monthly statements.

### Build status
✅ Passes — `npm run build` clean

## Iteration 21 — Fix: Persist Filters & Pagination on Transaction Page

**Date:** 2026-05-18
**Commit:** 01cfe00

### What changed
- `TransactionTable` now syncs filter state (type, month, search) and page number to URL query params via `history.replaceState`
- On mount, it reads the URL to restore the previous filter/pagination state
- This means `window.location.reload()` after save/delete/toggle no longer resets filters

### Files changed
- `src/components/TransactionTable.tsx`

### Why it matters
Users no longer lose their place (filters, search, page) when editing, deleting, or toggling a transaction. The URL becomes shareable/bookmarkable for specific filtered views.

### Build status
✅ Passes — `npm run build` clean
