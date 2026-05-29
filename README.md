# Self Financial Dashboard

Personal finance tracker built with **Astro 4 + React 18 + Tailwind CSS 3** and **better-sqlite3**.

Deployed as a standalone Node.js server via `@astrojs/node`.

## Features

- **Dashboard** — monthly overview with income, expenses, savings rate, and net cash flow
- **Transactions** — add, edit, and track cash expenses, credit card expenses, and credit card payments
- **Month Kickoff** — preloads recurring transactions for new salary periods automatically
- **Category Spending Trend** — line chart showing top category spending over time
- **Budget Report** — category-level budget tracking with progress bars and budget vs actual chart (`/budget`)
- **Category Management** — CRUD with color picker and monthly budget limits (`/settings`)
- **Income Settings** — configure monthly income per period (`/settings`)
- **Cashflow Report** — cash flow breakdown with waterfall visualization
- **Yearly Report** — annual aggregates with year-over-year comparison
- **Spending Calendar** — daily spending heatmap
- **Networth Tracker** — track net worth over time with breakdown by category
- **Recurring Transactions** — manage templates that auto-populate on month kickoff
- **Data Export/Import** — export and import data as JSON for backup

## Salary Period Convention

Periods follow a **salary cycle**: each month starts on the **21st** and ends on the **20th** of the following calendar month.

- Period name is the month it **ends** in (e.g., "June 2026" covers May 21 – June 20)
- On or after the 21st → a new period begins
- On the 1st–20th → still in the previous period

## Tech Stack

- **Framework:** Astro 4 (SSR via `@astrojs/node`)
- **UI:** React 18 + Tailwind CSS 3 + shadcn/ui
- **Charts:** Chart.js + react-chartjs-2
- **Database:** better-sqlite3
- **Deployment:** PM2 on homelab3

## Getting Started

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Project Structure

```
src/
├── components/        # React components
│   ├── ui/           # shadcn/ui primitives
│   ├── Dashboard.tsx
│   ├── AddTransactionForm.tsx
│   ├── BudgetReport.tsx
│   ├── CategorySettings.tsx
│   └── ...
├── lib/
│   ├── db.ts         # SQLite schema, queries, connection
│   ├── api.ts        # API helper functions
│   ├── data.ts       # TypeScript types and static data
│   └── utils.ts      # Utility functions (formatIdr, getActivePeriod)
├── pages/
│   ├── api/          # API routes (transactions, networth, summary, kickoff)
│   ├── index.astro   # Dashboard
│   ├── budget.astro  # Budget Report
│   ├── settings.astro
│   ├── transactions.astro
│   └── ...
└── layouts/
    └── Layout.astro
```

## License

MIT
