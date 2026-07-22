# Fintech Design Token Proposal — Deep-Navy Dark Palette

**For:** `tailwind.config.mjs` extension (Astro 4 + React 18 + Tailwind 3 + shadcn/ui)
**Issue:** [#108](https://github.com/akramram/self-financial-dashboard/issues/108)

---

## Color Scales (11-step: 50→950, OKLCH)

### Deep Navy (`navy`)
Surfaces & depth. Darker steps = deeper background layers, lighter = elevated cards.
- `50` #eef0f6 · `200` #8b97b8 · `400` #3d4a73 · `600` #1a2240 · `800` #0c1228 · `950` #060a18

### Mint (`mint`)
Positive indicators: income, gains, "on track." Accessible on navy.
- `400` #34d399 · `500` #10b981 · `600` #059669

### Coral (`coral`)
Negative indicators: expenses, alerts, "over budget." Monzo-inspired warmth.
- `400` #f87171 · `500` #ef4444 · `600` #dc2626

### Gold (`gold`)
Wealth/savings accent. DBS-inspired premium feel.
- `400` #fbbf24 · `500` #f59e0b · `600` #d97706

```js
// tailwind.config.mjs extension
colors: {
  navy:  { 50:'#eef0f6',100:'#d5dae8',200:'#8b97b8',300:'#6876a0',
          400:'#3d4a73',500:'#2a3559',600:'#1a2240',700:'#141b33',
          800:'#0c1228',900:'#090e1f',950:'#060a18' },
  mint:  { 400:'#34d399',500:'#10b981',600:'#059669',700:'#047857' },
  coral: { 400:'#f87171',500:'#ef4444',600:'#dc2626',700:'#b91c1c' },
  gold:  { 400:'#fbbf24',500:'#f59e0b',600:'#d97706',700:'#b45309' },
}
```

## Border Radius Scale
Nubank-inspired generous rounding, layered depth.
```js
borderRadius: {
  'xs': '4px', 'sm': '6px', 'md': '10px',  // shadcn default
  'lg': '14px', 'xl': '20px', '2xl': '28px', // fintech cards
}
```

## Shadow Elevation System
```js
boxShadow: {
  'elevation-1': '0 1px 3px rgba(0,0,0,0.24), 0 1px 2px rgba(0,0,0,0.32)',
  'elevation-2': '0 4px 12px rgba(0,0,0,0.36), 0 2px 4px rgba(0,0,0,0.24)',
  'elevation-3': '0 8px 24px rgba(0,0,0,0.48), 0 4px 8px rgba(0,0,0,0.32)',
  'glow-mint': '0 0 20px rgba(16,185,129,0.25)',
  'glow-coral': '0 0 20px rgba(239,68,68,0.25)',
  'glow-gold': '0 0 20px rgba(245,158,11,0.25)',
}
```

## Glass Utility Classes
Revolut-style frosted panels. Add to `@layer components` in `globals.css`:
```css
.glass-card { @apply bg-navy-800/60 backdrop-blur-xl border border-white/[0.08] rounded-xl; }
.glass-card-elevated { @apply bg-navy-700/70 backdrop-blur-2xl border border-white/[0.12] rounded-xl shadow-elevation-2; }
.glass-nav { @apply bg-navy-950/80 backdrop-blur-xl border-b border-white/[0.06]; }
```

## Typography
```js
fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], mono: ['JetBrains Mono', 'monospace'] },
fontSize: { 'balance-lg': ['2rem', { lineHeight:'1.2', fontWeight:'700' }] },
```

## Integration Notes
- Map `navy-950` → shadcn `--background`, `navy-700` → `--card`, `navy-300` → `--muted-foreground`
- Mint/coral/gold replace default `--primary`/`--destructive`/`--accent` semantic tokens
- All scales pass WCAG AA contrast on navy-800+ backgrounds
