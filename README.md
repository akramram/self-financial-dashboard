# Self Financial Dashboard

Personal finance tracker built with **Astro 4 + React 18 + Tailwind CSS 3** and **better-sqlite3**.

Deployed as a standalone Node.js server via `@astrojs/node` on homelab3 (PM2, port 4321).

## Features

- **Dashboard** — monthly overview with income, expenses, savings rate, net cash flow, summary cards with sparklines, and spending pulse gauge
- **Anomaly Alerts** — flags unusual transactions (amount spikes, new merchants, category outliers) with severity chip filters
- **Budget Alerts** — surfaces categories approaching or exceeding monthly limits
- **Financial Insights** — AI-generated observations about spending patterns
- **Collapsible Widgets** — expand/collapse dashboard sections; anomaly and budget alerts side-by-side on desktop
- **Transactions** — add, edit, and track cash expenses, credit card expenses, and credit card payments
- **Month Kickoff** — preloads recurring transactions for new salary periods automatically
- **Compare Months** — side-by-side comparison of income, spending, categories, and networth between two months with swap button and smart defaults (latest 2 months)
- **Investment Portfolio** — portfolio allocation donut, investment breakdown by type with MoM changes, and composition trend (pulled from networth data)
- **Networth Tracker** — track net worth over time with breakdown by investment type
- **Category Budgets** — budget tracking with progress bars and category comparison (`/budget`)
- **Category Management** — CRUD with color picker and monthly budget limits (`/settings`)
- **Cashflow Report** — cash flow breakdown with waterfall visualization
- **Yearly Report** — annual aggregates with year-over-year comparison
- **Spending Calendar** — daily spending heatmap
- **Recurring Transactions** — manage templates that auto-populate on month kickoff
- **Goals Tracker** — savings and financial goal tracking
- **FIRE Calculator** — retirement planning with withdrawal rate simulations
- **Forecast** — income/expense projections
- **Health Score** — financial health metrics
- **Analytics** — advanced spending analytics
- **Data Export/Import** — backup and restore as JSON

## Salary Period Convention

Periods follow a **salary cycle**: each month starts on the **21st** and ends on the **20th** of the following calendar month.

- Period name is the month it **ends** in (e.g., "June 2026" covers May 21 – June 20)
- On or after the 21st → a new period begins
- On the 1st–20th → still in the previous period
- All data references use `period_id` (FK to `periods` table) — the old `month` text column was removed in June 2026

## Tech Stack

- **Framework:** Astro 4 (SSR via `@astrojs/node`)
- **UI:** React 18 + Tailwind CSS 3 + shadcn/ui
- **Charts:** Chart.js + react-chartjs-2
- **Database:** better-sqlite3 (WAL mode)
- **Deployment:** PM2 on homelab3 (192.168.0.6)

## Getting Started

```bash
npm install
npm run dev        # Development server
npm run build      # Production build
```

Production restart:
```bash
pm2 restart financial-dashboard
# or full rebuild:
pm2 stop financial-dashboard && rm -rf dist/ && npm run build && pm2 start financial-dashboard
```

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui primitives
│   ├── Dashboard.tsx          # Main dashboard
│   ├── AnomalyAlerts.tsx      # Anomaly detection with chip filters
│   ├── BudgetAlerts.tsx       # Budget limit alerts
│   ├── FinancialInsights.tsx  # AI spending observations
│   ├── SpendingPulse.tsx      # Real-time burn rate gauge
│   ├── DashboardSummaryCards.tsx  # Summary cards with sparklines
│   ├── MonthComparison.tsx    # Side-by-side month comparison
│   ├── NetworthChart.tsx      # Networth trend line chart
│   ├── NetworthComposition.tsx # Portfolio donut + breakdown
│   ├── TransactionTable.tsx   # Transactions list
│   ├── EditTransactionDialog.tsx
│   ├── CollapsibleSection.tsx
│   └── ...
├── hooks/
│   ├── useSortState.ts        # Sortable table hook
│   └── useCollapsibleWidgets.ts
├── lib/
│   ├── db.ts           # SQLite schema, queries, connection
│   ├── api.ts          # API helper functions
│   ├── data.ts         # TypeScript types
│   └── utils.ts        # formatIdr, getActivePeriod
├── pages/
│   ├── api/            # REST API routes
│   ├── index.astro     # Dashboard
│   ├── transactions.astro
│   ├── networth.astro
│   ├── compare.astro   # Month comparison
│   ├── portfolio.astro # Investment portfolio
│   ├── budget.astro
│   ├── analytics.astro
│   ├── calendar.astro
│   ├── cashflow.astro
│   ├── fire.astro      # FIRE calculator
│   ├── forecast.astro
│   ├── goals.astro
│   ├── health.astro
│   ├── yearly.astro
│   ├── recurring.astro
│   ├── settings.astro
│   └── add.astro
└── layouts/
    └── Layout.astro
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `periods` | Salary period definitions (id, month, start_date, end_date) |
| `transactions` | Expenses/payments with `period_id` FK |
| `networth` | Monthly net worth snapshots with `period_id` FK |
| `networth_breakdown` | Per-investment breakdown per period |
| `categories` | Spending categories with color + monthly budget limit |
| `monthly_income` | Income tracking per period |
| `recurring_transactions` | Template for repeat expenses |
| `goals` | Savings/financial goals tracker |

## License

MIT
