# Financial Dashboard — Iteration Guide

## Project Overview
Astro 4 + React 18 + Tailwind CSS 3 + better-sqlite3 personal finance tracker.
Deployed as standalone Node server via `@astrojs/node`.

## What to Iterate On
Prioritized epic backlog:

1. **[FIN-015]** Initialize shadcn/ui Ecosystem — Install shadcn/ui React, core components (Button, Input, Card, Table, Dialog, Select)
2. **[FIN-016]** Refactor Existing Tables & Forms — Migrate Transactions/Networth tables and Add/Edit forms to shadcn
3. **[FIN-017]** Build Category Settings Module — `/settings` page with CRUD for categories + color picker
4. **[FIN-018]** Implement Category-Level Budget Targets — Add "Monthly Limit" to categories, update dashboard progress bars
5. **[FIN-019]** Implement Bulk Table Actions — Checkbox selection + bulk delete on Transactions table
6. **[FIN-020]** Add Duplicate Entry Guardrail — Backend flag for identical entries within 24h + confirmation dialog

## What NOT to Change
- `data/financial.db` and its schema migration logic in `src/lib/db.ts` (except additive migrations)
- The SQLite database file itself — never delete or overwrite
- API route URLs (`/api/transactions`, `/api/networth`, etc.) — keep backward compatible
- Existing data in the database

## Approach / Rules
- Use **shadcn/ui React** (not Svelte/Vue) — this is a React project
- Install via `npx shadcn@latest add <component>` or manual copy
- Components go in `src/components/ui/`
- Keep existing API endpoints, only add new ones
- Run `npm run build` after changes to verify
- Use conventional commits: `feat(FIN-015): ...`
- Each ticket = one branch = one PR

## Key Files
| File | Purpose |
|------|---------|
| `src/lib/db.ts` | SQLite schema, queries, DB connection |
| `src/lib/api.ts` | API helper functions |
| `src/lib/data.ts` | Data types and static JSON imports |
| `src/components/Dashboard.tsx` | Main dashboard view |
| `src/components/TransactionTable.tsx` | Transactions list table |
| `src/components/NetworthChart.tsx` | Networth chart |
| `src/components/AddTransactionForm.tsx` | Add transaction form |
| `src/components/AddNetworthForm.tsx` | Add networth form |
| `src/components/NetworthEditForm.tsx` | Edit networth form |
| `src/pages/index.astro` | Dashboard page |
| `src/pages/transactions.astro` | Transactions page |
| `src/pages/networth.astro` | Networth page |
| `src/pages/add.astro` | Add data page |
| `src/pages/api/transactions.ts` | Transaction API routes |
| `src/pages/api/networth.ts` | Networth API routes |
| `astro.config.mjs` | Astro config |
| `tailwind.config.mjs` | Tailwind config |

## Current State
- UI uses native Tailwind classes (no component library)
- Tables are raw HTML `<table>` elements
- Forms are raw HTML `<input>` elements
- No category management UI exists
- No budget targets exist
- No bulk actions exist
- No duplicate detection exists

## Agent skills

### Issue tracker

GitHub Issues on `akramram/self-financial-dashboard`. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.
