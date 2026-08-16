# FinDash Design System

Fintech design: navy glass morphism, mint/coral/gold accents. Dual-mode (light + dark) via Tailwind `darkMode: ['class']`.

## Type Scale

| Role | Class | Size | Weight | Usage |
|------|-------|------|--------|-------|
| Label | `text-xs` | 12px | 500 | Badges, metadata, section eyebrows (uppercase + `tracking-wider`) |
| Micro | `text-[10px]` | 10px | 600 | Sidebar group headers only |
| Body | `text-sm` | 14px | 400 | Default body text, descriptions, table cells |
| Title | `text-base` | 16px | 600 | Card titles, list item titles |
| Heading | `text-lg`–`text-xl` | 18–20px | 600–700 | Section headings, widget headers |
| Display | `text-2xl`–`text-4xl` | 24–36px | 700 | Key numbers (AnimatedCounter), page titles (`text-xl`), balance hero |

Rules:
- Minimum 4 distinct sizes per page; keep ≥1.25 ratio between adjacent heading steps.
- Section eyebrow labels: `text-xs uppercase tracking-wider text-slate-500 dark:text-white/40` — dark-mode opacity must be ≥ `/40` for WCAG AA contrast on navy.
- Never render text below `text-white/25` opacity in dark mode for readable content (placeholders excepted).

## Contrast Rules (WCAG AA)

- Text on saturated button backgrounds (`bg-emerald-600`, `bg-red-600`, `bg-mint-600` ≥600 shades): use `text-white`, never `text-slate-900`.
- On light accent backgrounds (`bg-mint-600` mint is light enough, `bg-gold-600`): `text-slate-900` is correct.
- Destructive inline buttons: `text-red-500 dark:text-red-300`, not gray.

## Known Detector False Positives

- `border-accent-on-rounded` on `animate-spin rounded-full border-b-2` loading spinners — spinner ring, not a card accent. Safe to ignore.
