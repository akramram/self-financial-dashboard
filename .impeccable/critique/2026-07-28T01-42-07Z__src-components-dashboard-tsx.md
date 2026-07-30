---
target: src/components/Dashboard.tsx
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
p2_count: 2
timestamp: 2026-07-28T01-42-07Z
slug: src-components-dashboard-tsx
---
# Design Critique: Financial Dashboard (Dashboard.tsx)

**Method: dual-agent (A: design-review · B: detector+browser)**
**Target: `src/components/Dashboard.tsx`** · Slug: `src-components-dashboard-tsx`

---

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Good feedback — paid toggles, toast notifications, spending pulse gauge. No global loading bar on navigation. |
| 2 | Match System / Real World | 3 | Uses familiar finance terminology. "Credit Payment (Prior Month)" is clear. Mix of EN/ID labels (Tagihan, Istri) is intentional for user. |
| 3 | User Control and Freedom | 2 | No undo on delete (only confirm dialog). Cannot dismiss/collapse individual dashboard sections independently. No way to go back from an accidental filter change except re-selecting. |
| 4 | Consistency and Standards | 2 | Off-palette colors: purple-400, indigo-600, violet-500, cyan-400, amber-400 used ad-hoc across components. Dashboard itself mixes Tailwind default colors (purple, cyan, amber) with custom navy/mint/coral/gold palette. |
| 5 | Error Prevention | 2 | Delete has confirm dialog. No duplicate entry detection on add. No validation on amount input beyond required field. Credit card payment auto-generation has no override. |
| 6 | Recognition Rather Than Recall | 3 | Icons are labeled. Sidebar nav items have text. Bottom tabs have labels. Good discoverability. |
| 7 | Flexibility and Efficiency of Use | 2 | Shift+N shortcut for quick add exists. No keyboard nav for transaction table. No saved filter presets. No bulk edit on dashboard table. |
| 8 | Aesthetic and Minimalist Design | 2 | Dashboard has 6 sections (PULSE, FLOW, ACT, INSIGHTS, FEED, CHARTS) on one page — high density. Many sections compete for attention. 6 charts at the bottom is cluttered. Section eyebrows (PULSE/FLOW/ACT/etc) at text-white/20 are barely visible. |
| 9 | Error Recovery | 2 | Toast notifications show success. Error states show generic messages. No retry on API failure. Form errors not shown inline. |
| 10 | Help and Documentation | 1 | No contextual help, tooltips, or onboarding. First-time users see dense dashboard with no guidance. No FAQ or help page. |
| **Total** | | **22/40** | **Acceptable — significant improvements needed** |

---

## Design Specificity Verdict

**LLM Assessment**: The dashboard has a distinctive visual identity — the dark navy glass-morphism aesthetic with mint accent is grounded and intentional. However, the specificity falls apart in secondary screens where AI-generated tells proliferate: violet/purple gradients (SpendingStreaks, SpendingDna, Achievements), indigo text colors (BudgetRecommendations, CategoryMatrix), and side-tab accent borders (RecurringCostAnalyzer, WhatIfPlanner, BudgetAlerts). These are textbook AI-UI patterns that undermine the otherwise custom navy/mint system.

The primary dashboard (Dashboard.tsx) itself has off-palette leaks: `text-purple-400` for credit expenses, `text-cyan-400` for cash type labels, `bg-purple-500` for progress bars — none of which belong to the defined navy/mint/coral/gold palette in tailwind.config.mjs.

**Deterministic scan**: 29 findings across 16 files.
- 14x `ai-color-palette`: purple/violet/indigo/fuchsia colors detected in 8 components
- 8x `border-accent-on-rounded`: border + rounded combination creating ghost cards in 6 components
- 6x `side-tab`: `border-l-4` accent on cards in 4 components
- 1x `flat-type-hierarchy`: Layout.astro uses only 12px/14px/18px (ratio 1.5:1)

---

## Overall Impression

The FinDash dashboard has a strong foundation: the glass-morphism navy aesthetic, mint accent system, and well-structured data hierarchy show real craft. But the single-page dashboard is overloaded with 6 dense sections, secondary pages are riddled with AI-generated color tells that break the design system, and the typography hierarchy is too flat to guide attention. The biggest opportunity is **consolidation and palette discipline** — fixing off-palette colors and establishing a proper type scale would transform this from "good fintech dashboard" to "distinctly FinDash."

---

## What's Working

1. **Glass-morphism card system**: The `glass-card` / `glass-card-elevated` pattern with `backdrop-blur-xl` and `border border-white/[0.08]` creates a cohesive, premium fintech feel. Consistent across the primary dashboard.

2. **Spending Pulse gauge**: The SVG pace gauge with "Over Pace" indicator is product-specific, visually distinctive, and communicates complex data (spend vs time vs budget) in one compelling visualization.

3. **Salary period system**: The 21st→20th cycle convention is deeply integrated — kickoff flow, period filtering, recurring auto-generation. This is not a generic finance app; it matches a specific real-world payroll cycle.

---

## Priority Issues

### [P1] Off-palette colors break the design system across 8+ components
**Why it matters**: The defined palette is navy/mint/coral/gold. But purple, violet, indigo, fuchsia, and cyan appear throughout secondary pages, creating visual inconsistency and AI-generated UI tells. Users moving from dashboard to /streaks or /analytics see a different color world.
**Fix**: Replace all purple/violet/indigo/fuchsia with palette-aligned equivalents:
- `text-purple-400` → `text-coral-400` or `text-mint-400` (context-dependent)
- `text-indigo-*` → `text-mint-500` or `text-navy-300`
- `text-violet-*` → `text-gold-400` or `text-mint-500`
- `text-cyan-400` → `text-mint-400`
- `bg-gradient violet/purple/fuchsia` → navy/mint gradients
- `text-amber-400` → `text-gold-400`
**Suggested command**: `polish`

### [P1] Side-tab accent borders (border-l-4) on rounded cards — AI UI tell
**Why it matters**: The detector flagged 6 instances of `border-l-4` on glass cards. This is a textbook AI-generated UI pattern. The project's own glass-card component doesn't use side borders — these are ad-hoc additions in RecurringCostAnalyzer, WhatIfPlanner, BudgetAlerts, BudgetReport.
**Fix**: Remove `border-l-4` and `border-l-{color}-500` classes. Replace with a subtle full border, a left-positioned icon with color, or a small colored dot indicator.
**Suggested command**: `polish`

### [P1] Flat typography hierarchy — only 3 sizes across the layout
**Why it matters**: The detector found only 12px, 14px, and 18px used in Layout.astro (ratio 1.5:1). A proper hierarchy needs at least 4-5 steps with a 1.25+ ratio between each. The dashboard has good large numbers (text-4xl) but the surrounding hierarchy is flat — section headings, card titles, and body text are too similar in size.
**Fix**: Establish a type scale: 12px (label) → 14px (body) → 16px (card title) → 20px (section heading) → 30px/36px (display). Apply consistently.
**Suggested command**: `typeset`

### [P2] Dashboard information overload — 6 sections on one page
**Why it matters**: PULSE (summary + gauge), FLOW (categories + budgets + credit), ACT (add/kickoff), INSIGHTS (net worth + runway + insights), FEED (transaction table), CHARTS (6 charts). Cognitive load checklist fails: single focus (no — multiple competing sections), chunking (partially — sections exist but all visible), minimal choices (no — user sees 20+ data points at once).
**Fix**: Make CHARTS collapsible by default (show 2, expand for more). Move INSIGHTS section below FEED or into a sidebar. Make the SpendingPulse the clear hero element at the top.
**Suggested command**: `distill`

### [P2] Uppercase section eyebrows at text-white/20 are nearly invisible
**Why it matters**: PULSE, FLOW, ACT, INSIGHTS, FEED, CHARTS labels use `text-xs uppercase tracking-wider text-white/20` — that's 20% opacity white on a dark navy background, which fails WCAG contrast requirements. They're decorative noise rather than functional navigation.
**Fix**: Increase to `text-white/40` minimum for contrast, or replace with a more prominent section divider (e.g., `text-mint-400/60` with a small icon).
**Suggested command**: `polish`

---

## Persona Red Flags

**Alex (Power User)**:
- Transaction table on dashboard is limited to 10 rows with no quick filter or search — must navigate to /transactions for any real filtering.
- No keyboard navigation in the table (arrow keys, enter to edit).
- Cannot customize which sections appear on the dashboard or re-order them.
- Month kickoff button ("Start September 2026") is prominent but has no undo if triggered accidentally.

**Casey (Distracted Mobile User)**:
- Dashboard is extremely long on mobile — 6 sections require significant scrolling.
- The Spending Pulse gauge section is tall and pushes the actual transaction data far down.
- Bottom tab bar has 4 tabs + center FAB, but "Analytics" and "Planning" are vague — no indication of what's inside.
- No lazy loading — all charts render on page load, potentially slow on 3G.
- Touch targets for table row edit/delete buttons may be too small (icon-only buttons in a tight row).

---

## Minor Observations

- Loading spinners use different colors per component: `border-indigo-500`, `border-blue-600`, `border-emerald-500`, `border-mint-500/40`, `border-slate-600` — should be standardized.
- `text-amber-400` is used in Dashboard.tsx for credit payments but `gold-400` is the palette equivalent.
- The `purple-400` used for credit expenses in Dashboard.tsx Credit Snapshot has no corresponding palette token.
- RecurringCostAnalyzer uses 4 different `border-l-4 border-l-{color}` variants (blue, emerald, amber, violet) as category indicators — these are all off-palette and use the AI side-tab pattern.
- "Financial Dashboard · Built with Astro & React" footer is developer-facing copy, not user-facing.

---

## Questions to Consider

- Should the dashboard split into tabs (Overview / Feed / Charts) rather than one long scroll?
- Would a command palette (Cmd+K) for navigation reduce the need for the overloaded sidebar?
- What if credit expenses used the gold accent instead of purple — tying them to the existing "credit payment = amber/gold" visual language?
- Does the dashboard need a dark-mode-only approach, or is the light theme actively used?

---

## Run Notes

- Target slug: `src-components-dashboard-tsx` ✓
- Ignore list: none (.impeccable/critique/ignore.md not found)
- Assessment independence: dual-agent (A and B ran as isolated sub-agents)
- CLI detector: ran successfully, 29 findings across 16 files
- Browser visualization: login + dashboard snapshot captured. Vision analysis unavailable (provider limitation). DOM snapshot used as fallback.
- Overlay injection: not performed (no mutable browser injection available)
- Live server: not needed (app already running on :4321)
- Temp-file cleanup: pending after persistence
