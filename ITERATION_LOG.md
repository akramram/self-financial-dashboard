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

## Iteration 22 — Fix: Allow Negative Savings Rate Display

**Date:** 2026-05-18
**Commit:** bf3cc70

### What changed
- Removed `Math.max(0, ...)` clamp from savings rate calculation in `Dashboard.tsx`
- Savings rate can now display negative values (e.g., May 2026 shows -10.7% instead of 0%)
- Progress bar width clamped to `Math.max(0, Math.min(100, savingsRate))` to prevent invalid CSS
- Negative rates show red text and red progress bar; positive rates remain emerald

### Files changed
- `src/components/Dashboard.tsx`

### Why it matters
When total spending exceeds income (e.g., May 2026: income 18.5M vs outcome 20.5M), the savings rate should accurately reflect the deficit. Previously it falsely showed 0%, hiding the fact that the user was overspending.

### Build status
✅ Passes — `npm run build` clean

## Iteration 23 — FIN-033: Recurring Transactions & Monthly Salary Kickoff

**Date:** 2026-05-19
**Issue:** #36
**PR:** #37
**Commit:** d596451

### What changed
- Added `recurring_transactions` SQLite table with full CRUD API (`/api/recurring`)
- Created `/recurring` page with `RecurringManager.tsx` for managing recurring expenses
- Added `/api/kickoff` endpoint: creates new month with salary income + preloads all active recurring transactions
- Created `MonthKickoffModal.tsx` for salary input and kickoff confirmation
- Integrated salary banner into `Dashboard.tsx`: appears after the 25th when next month doesn't exist yet
- Added "Recurring" nav link to desktop and mobile navigation in `Layout.astro`

### Files changed
- `src/lib/db.ts` — New `recurring_transactions` table + CRUD helpers
- `src/lib/data.ts` — Added `RecurringTransaction` interface
- `src/lib/api.ts` — Added recurring & kickoff API helpers
- `src/pages/api/recurring/index.ts` — GET/POST recurring transactions
- `src/pages/api/recurring/[id].ts` — PUT/DELETE recurring transactions
- `src/pages/api/kickoff.ts` — GET status / POST create new month
- `src/components/RecurringManager.tsx` — CRUD UI for recurring transactions
- `src/components/MonthKickoffModal.tsx` — Salary input + kickoff confirmation modal
- `src/components/Dashboard.tsx` — Integrated salary kickoff banner
- `src/layouts/Layout.astro` — Added Recurring nav link
- `src/pages/recurring.astro` — New page

### Build status
✅ Passes — `npm run build` clean

## Iteration 24 — FIN-035: Export JSON for Specific Month

**Date:** 2026-05-21
**Issue:** [#38](https://github.com/akramram/self-financial-dashboard/issues/38)
**Branch:** `feat/FIN-035`
**PR:** [#39](https://github.com/akramram/self-financial-dashboard/pull/39)

### What changed
- Added **Export JSON** button next to the month/type filter row in `TransactionTable.tsx`
- Exports all currently filtered transactions (respects month + type + search filters, NOT paginated)
- Exported JSON shape: `date`, `description` (title), `amount`, `type`, `category`, `paid` (done)
- File name: `transactions-YYYY-MM.json` when a specific month is selected, `transactions-all.json` otherwise
- Shows `alert('No transactions found for this month')` when the filtered set is empty

### Files changed
- `src/components/TransactionTable.tsx`

### Why it matters
Users can now download transaction data for a specific month as structured JSON, making it easy to archive, share, or process in external tools.

### Build status
✅ Passes — `npm run build` clean

## Iteration 25 — FIN-036: Date Range and Amount Range Filters

**Date:** 2026-05-21
**Issue:** [#40](https://github.com/akramram/self-financial-dashboard/issues/40)
**Branch:** `feat/FIN-036`
**PR:** [#41](https://github.com/akramram/self-financial-dashboard/pull/41)

### What changed
- Added **date range** filters to `TransactionTable.tsx`: `From date` and `To date` HTML date pickers
- Added **amount range** filters: `Min amount` and `Max amount` number inputs
- All range filters compose with existing search, type, and month filters
- Filter state synced to URL query params (`dateFrom`, `dateTo`, `amountMin`, `amountMax`) and restored on mount
- Added **Clear Ranges** button to reset all four range inputs at once
- Filters apply to the full dataset (not just the current page)

### Files changed
- `src/components/TransactionTable.tsx`

### Why it matters
Users can now drill down to transactions within a specific date window or amount bracket, making it easier to reconcile statements, find large expenses, or audit a time period.

### Build status
✅ Passes — `npm run build` clean

## Iteration 26 — Fix: Move Month Kickoff Trigger to 21st

**Date:** 2026-05-22
**Issue:** [#42](https://github.com/akramram/self-financial-dashboard/issues/42)
**Branch:** `feat/FIN-035`
**PR:** [#43](https://github.com/akramram/self-financial-dashboard/pull/43)
**Commit:** 721c4a0

### What changed
- Changed `today.getDate() < 26` to `today.getDate() < 21` in `Dashboard.tsx`
- The salary kickoff banner now appears starting on the **21st** of each month instead of the 25th
- Gives users 4 extra days to prepare the new month before it starts

### Files changed
- `src/components/Dashboard.tsx`

### Build status
✅ Passes — `npm run build` clean

## Iteration 27 — FIN-038: Category Autocomplete on Add Transaction Form

**Date:** 2026-05-22
**Issue:** [#44](https://github.com/akramram/self-financial-dashboard/issues/44)
**Branch:** `feat/FIN-038`
**PR:** [#45](https://github.com/akramram/self-financial-dashboard/pull/45)
**Commit:** 5704c16

### What changed
- Fetched existing categories on mount via `fetchCategories()` in `AddTransactionForm.tsx`
- Replaced the free-text Category `<Input>` with an autocomplete input backed by a native HTML `<datalist>`
- Users can pick an existing category from the dropdown or type a new one freely
- Zero new dependencies — uses existing shadcn `Input` + browser-native `datalist`
- Updated helper text from "Leave blank to use first word of title" to "Pick an existing category or type a new one"

### Files changed
- `src/components/AddTransactionForm.tsx`

### Build status
✅ Passes — `npm run build` clean

## Iteration 28 — FIN-039: Show All Categories in Category Spending Trend

**Date:** 2026-05-22
**Issue:** [#46](https://github.com/akramram/self-financial-dashboard/issues/46)
**Branch:** `feat/FIN-039`
**PR:** [#47](https://github.com/akramram/self-financial-dashboard/pull/47)
**Commit:** 8e38fd3

### What changed
- Removed the `.slice(0, 6)` limit in `CategoryTrendChart.tsx`
- The Category Spending Trend line chart now displays **all** categories instead of only the top 6 by total spend
- Categories are still sorted by total spend (descending) for consistent legend ordering

### Files changed
- `src/components/CategoryTrendChart.tsx`

### Build status
✅ Passes — `npm run build` clean

## Iteration 29 — FIN-040: Hide Zero-Spend Categories from Category Spending Trend

**Date:** 2026-05-22
**Issue:** [#48](https://github.com/akramram/self-financial-dashboard/issues/48)
**Branch:** `feat/FIN-040`
**PR:** [#49](https://github.com/akramram/self-financial-dashboard/pull/49)
**Commit:** 6de5a0f

### What changed
- Added `.filter(([_, total]) => total > 0)` in `CategoryTrendChart.tsx`
- Categories with 0 total spend across all months are now excluded from the line chart and legend
- Keeps the chart focused on categories that actually have spending data

### Files changed
- `src/components/CategoryTrendChart.tsx`

### Build status
✅ Passes — `npm run build` clean

## Iteration 30 — Test Coverage: RecurringCostAnalyzer

**Date:** 2026-07-13
**Type:** Test coverage (autonomous cron)
**Branch:** `main`

### What changed
- Added 8 new DB layer tests for `getRecurringCostAnalysis()` logic in `src/__tests__/db.test.ts`:
  - Empty result when no recurring transactions exist
  - Monthly/annual totals computed from active items only (paused excluded)
  - Category grouping (multiple items in same category aggregate correctly)
  - Payment type grouping (cash / credit_expense / credit_payment)
  - Largest item identification
  - Average per item computation
  - Temporary item counting (items with `end_date`)
  - Paused vs active item separation
- Added 3 new API tests for `GET /api/recurring-cost` in `src/__tests__/api.test.ts`:
  - Returns full analysis result as JSON with correct status
  - Returns correct shape for empty recurring list
  - Returns `application/json` Content-Type header
- Added `getRecurringCostAnalysis` to the `vi.mock('../lib/db')` factory

### Files changed
- `src/__tests__/db.test.ts` — +8 tests in new `DB — Recurring Cost Analysis` describe block
- `src/__tests__/api.test.ts` — +3 tests in new `API — GET /api/recurring-cost` describe block

### Test results
✅ 66 tests passed (37 DB + 29 API), up from 55. Duration: 412ms.

### Build status
✅ Passes — `npm run build` clean

## Iteration 31 — FIN-092: Emergency Fund Runway Analysis

**Date:** 2026-07-17
**Type:** Feature (autonomous cron — Wayfinder innovation pipeline)
**Issue:** [#92](https://github.com/akramram/self-financial-dashboard/issues/92)
**Branch:** `feature/issue-92-runway` (merged to main, deleted)

### What changed
Menambahkan widget Emergency Fund Runway — analisis ketahanan finansial yang menghitung berapa lama pengguna bisa bertahan tanpa pendapatan.

**Komponen & file baru:**
- `src/pages/api/runway.ts` — API endpoint `GET /api/runway` yang menghitung:
  - Aset likuid (dengan faktor likuiditas per instrumen)
  - Pengeluaran bulanan rata-rata (3 periode terakhir, done=1, type cash/credit_expense)
  - Runway dalam bulan = aset likuid / pengeluaran
  - Cakupan biaya tetap = aset likuid / recurring obligations aktif
  - History 6 bulan terakhir untuk sparkline
  - Rekomendasi otomatis berdasarkan status
- `src/components/RunwayAnalysis.tsx` — widget dengan:
  - SVG gauge melingkar (skala 0-12 bulan)
  - Liquidity bar (visual proporsi aset berdasarkan tingkat likuiditas)
  - Key metrics (liquid assets, total assets, monthly expense, fixed coverage)
  - Trend sparkline (6 bulan)
  - Rekomendasi kontekstual
  - Status: critical (<1 bln), caution (1-3 bln), healthy (3-6 bln), strong (6+ bln)
- `src/pages/runway.astro` — halaman detail dengan metodologi perhitungan

**Integrasi:**
- `src/components/Dashboard.tsx` — widget compact (collapsible) setelah SafeToSpend
- `src/layouts/Layout.astro` — link navigasi di dropdown Planning (desktop + mobile)

**Likuiditas klasifikasi:**
| Instrumen | Faktor Likuiditas | Alasan |
|-----------|-------------------|--------|
| Cash / Jenius / Tabungan | 100% | Instant access |
| Reksa Dana / Mutual Fund | 90% | 1-3 hari settlement |
| Saham Lokal | 50% | Volatile, butuh timing jual |
| Saham Luar Negeri | 30% | Friction mata uang & pajak |
| Crypto | 80% | Likuid tapi volatile |

### Test results
✅ 106 tests passed (52 DB + 29 API + 25 component), up from 100. Duration: 1.7s.
- 6 new DB tests: liquidity factor computation, expense averaging, recurring obligations sum, unpaid exclusion, runway formula, status classification

### Build status
✅ Passes — `npm run build` clean

### Real data output
- Aset Likuid: IDR 17,290,459
- Total Aset: IDR 30,882,652
- Pengeluaran/Bulan: IDR 16,087,366
- Runway: 1.07 bulan (status: Hati-hati)
- Cakupan Biaya Tetap: 1.99 bulan

---

## Sesi Cron — 18 Juli 2026: Triple bug fix (issues #93, #94, #95)

### Ringkasan
Sesi ini merampungkan 3 bug yang ditemukan dari pemeriksaan `npx tsc --noEmit` dan review perubahan uncommitted. Semua fix berakar pada pola pitfall yang sudah terdokumentasi di skill development.

### Issue yang diselesaikan

| # | Judul | Akar masalah |
|---|-------|--------------|
| #93 | BudgetReport: dialog transaksi kategori mengabaikan filter period | Sisa migrasi `month` -> `period_id`. `fetchTransactions({ month })` diabaikan runtime karena type signature hanya terima `periodId`. Fix: resolve `filterMonth` ke `periodId` via lookup `summaries`. |
| #94 | Runway API: field `tips` hilang dari response object | Pitfall "API Response Object Missing Computed Fields". `tips` di-deklarasi di interface dan dipakai `RunwayAnalysis.tsx` tapi lupa dimasukkan ke response object. |
| #95 | TransactionTable: filter rentang tanggal menggunakan `date` (period marker) bukan `created_time` | `date` selalu tanggal 21 (period start), bukan timestamp transaksi aktual. Fix: pakai `parseCreatedTime(t)` untuk konsistensi dengan sorting dan heatmap. |

### Verifikasi
- `npx tsc --noEmit` -- 0 error untuk ketiga file yang di-fix
- `npx vitest run` -- 106/106 tests passed
- `npm run build` -- sukses (0 errors)
- PM2 restart -- online, tanpa error di log
- `curl /api/runway` -- field `tips` hadir sebagai array
- CSS hash match (HTTP 200, bukan 404 stale)

### Catatan
- Perubahan UX yang belum ter-commit pada `DashboardSummaryCards.tsx` (grid 4 menjadi 2 kolom) ditinggalkan uncommitted karena memerlukan konteks/spesifikasi lebih lanjut.
- Tidak ada perubahan skema DB atau API contract. Semua perubahan backward compatible.

---

## Sesi Cron — 19 Juli 2026: FIN-#96 Goal Trajectory Projection (autonomous Wayfinder pipeline)

### Ringkasan
Backlog issue open habis. Pipeline Wayfinder mengidentifikasi gap inovasi: `GoalsTracker.tsx` hanya punya perhitungan status on-track **linear statis** (`progress >= timeProgress`) dan `monthlyRate = sisa/(daysTotal/30)` tanpa mempertimbangkan kapasitas tabungan historis. Dibuat issue #96 lalu dieksekusi end-to-end.

### Issue
[#96 — Goal Trajectory Projection — proyeksi pencapaian goal berbasis trend tabungan aktual](https://github.com/akramram/self-financial-dashboard/issues/96)

### Branch
`feature/issue-96-goal-trajectory` (merged to main, deleted)

### Apa yang berubah
Widget **Goal Trajectory** baru di halaman `/goals` yang memproyeksikan kapan setiap goal aktif akan tercapai berdasarkan kecepatan tabungan historis (net worth growth rate, default window 6 periode).

**File baru:**
- `src/lib/goalTrajectory.ts` — pure function `analyzeGoalTrajectory()` yang menghitung projected_date, status (`ahead`/`on_track`/`at_risk`/`behind`/`completed`), `projected_gap_idr` (kekurangan di tanggal target), `required_monthly` (tabungan per bulan untuk tepat waktu). Tidak ada akses DB — input murni dari parameter, deterministic dan unit-testable.
- `src/pages/api/goal-trajectory.ts` — GET endpoint dengan optional `?window=N` override (1-24).
- `src/components/GoalTrajectory.tsx` — widget React `client:only="react"` yang fetch via API (menghindari Astro devalue prop serialization bug). Menampilkan: summary badges, sparkline trend net worth, per-goal card dengan progress, projected vs target date, gap analysis, dan rekomendasi otomatis.

**File yang dimodifikasi:**
- `src/pages/goals.astro` — integrasi widget di atas `GoalsTracker`.
- `src/__tests__/goalTrajectory.test.ts` — 20 unit test untuk pure function.
- `src/__tests__/api.test.ts` — +5 API test untuk endpoint goal-trajectory.

**Algoritma proyeksi:**
- `average_monthly_savings = (networth_last - networth_first) / (days_between / 30)` dengan window default 6 periode terakhir.
- `projected_months = remaining / avg_monthly_savings`
- `projected_date = today + projected_months * 30 days`
- Status berdasarkan `days_delta = projected_date - target_date`:
  - `ahead`: ≤ -14 hari (≥ 2 minggu lebih cepat)
  - `on_track`: ±14 hari
  - `at_risk`: telat 14-60 hari
  - `behind`: telat > 60 hari atau avg_savings ≤ 0

**Edge cases ditangani:**
- Networth < 2 entri → `has_sufficient_data: false`, setiap goal diberi status `behind` dengan `projected_date: null` dan pesan "data belum cukup".
- Goal completed → skip dari output.
- Tabungan negatif (networth menurun) → status `behind` dengan pesan sesuai.
- Tidak ada goal aktif → empty state dengan CTA.

**Hasil data nyata (live `/api/goal-trajectory`):**
- Fast Charger: status `behind`, proyeksi 2027-07-07 (target 2026-07-10 sudah lewat), gap IDR 1.60M.
- EV Battery: status `behind`, proyeksi 2030-12-05 (target 2029-01-03), gap IDR 3.18M.
- Rata-rata tabungan 6 periode terakhir: IDR 135,927/bulan.

### Test results
✅ 131/131 tests passed (sebelumnya 106 + 25 baru: 20 unit + 5 API). Duration: 3.77s.

### Build status
✅ `npm run build` sukses, 0 errors.
✅ PM2 restart online, HTTP 200 untuk `/`, `/goals`, `/api/goal-trajectory`.
✅ CSS hash HTTP 200 (bukan 404 stale).
✅ Chunk `GoalTrajectory.B6e4rnH-.js` ter-build dan ter-serve dengan benar.

### Catatan
- Komponen sengaja menggunakan `client:only="react"` (bukan `client:load`) untuk menghindari potential Astro devalue serialization issue dengan tipe data nested (GoalTrajectoryResult).
- Tidak ada perubahan skema DB, tidak mengubah komponen GoalsTracker eksisting, tidak menambah tabel baru.
- Backward compatible: semua API eksisting tidak tersentuh.
- Memakai shadcn/ui (Card, Badge, Progress) — konsisten dengan standar proyek. Tidak ada LegionUI.
