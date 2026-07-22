// src/lib/chartConfig.ts
// Fintech palette global defaults for Chart.js v4 (chart.js ^4.4.0).
//
// Import once at app root:
//   import '../lib/chartConfig';
// The side-effect applies global defaults to Chart.defaults.
// Individual chart components can still override any option locally.
// Merge order: global defaults < chart-type defaults < per-chart options.

import { Chart as ChartJS } from 'chart.js';

// ─── Fintech Palette Tokens ─────────────────────────────
export const FP = {
  bg:           '#0f172a',                     // slate-900
  grid:         'rgba(51, 65, 85, 0.12)',      // slate-700 / 12%
  text:         '#94a3b8',                     // slate-400
  textMuted:    '#64748b',                     // slate-500
  white:        '#f8fafc',                     // slate-50
  // Dataset accent colours
  mint:         '#2dd4bf',                     // teal-400
  coral:        '#fb7185',                     // rose-400
  gold:         '#fbbf24',                     // amber-400
  // Glass tooltip
  glassBg:      'rgba(15, 23, 42, 0.92)',      // slate-900 / 92%
  glassBorder:  'rgba(51, 65, 85, 0.5)',       // slate-700 / 50%
} as const;

// ─── Apply Global Defaults ──────────────────────────────
export function applyFintechDefaults(): void {
  const D = ChartJS.defaults;

  // --- Global colours ---
  D.color = FP.text;
  D.borderColor = FP.grid;
  D.backgroundColor = 'transparent';

  // --- Tooltip — glass-style ---
  if (D.plugins?.tooltip) {
    D.plugins.tooltip.backgroundColor = FP.glassBg;
    D.plugins.tooltip.titleColor = FP.white;
    D.plugins.tooltip.bodyColor = FP.text;
    D.plugins.tooltip.borderColor = FP.glassBorder;
    D.plugins.tooltip.borderWidth = 1;
    D.plugins.tooltip.cornerRadius = 8;
    D.plugins.tooltip.padding = 10;
    D.plugins.tooltip.titleFont = { weight: 'bold', size: 12 };
    D.plugins.tooltip.bodyFont = { size: 11 };
  }

  // --- Legend ---
  if (D.plugins?.legend?.labels) {
    D.plugins.legend.labels.color = FP.text;
    D.plugins.legend.labels.usePointStyle = true;
    D.plugins.legend.labels.pointStyleWidth = 8;
    D.plugins.legend.labels.padding = 16;
    D.plugins.legend.labels.font = { size: 11 };
  }

  // ─── Scales: grid, ticks, border ─────────────────
  // Chart.js v4 types key `defaults.scales` by scale type.
  // Apply to both category + linear; individual charts override if needed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const st of ['category', 'linear'] as const) {
    const scale = D.scales[st] as any;
    if (!scale) continue; // SSR safety: scale type may not be registered yet
    scale.grid = scale.grid || {};
    scale.grid.color = FP.grid;
    scale.grid.drawTicks = true;
    scale.grid.tickColor = FP.grid;
    scale.ticks = scale.ticks || {};
    scale.ticks.color = FP.textMuted;
    scale.ticks.font = { size: 10 };
    scale.ticks.padding = 8;
    scale.border = scale.border || {};
    scale.border.display = false;
  }

  // ─── Element defaults ──────────────────────────────
  if (D.elements?.bar) {
    D.elements.bar.borderRadius = 4;
    D.elements.bar.borderSkipped = false;
  }
  if (D.elements?.point) {
    D.elements.point.radius = 3;
    D.elements.point.hoverRadius = 6;
    D.elements.point.borderWidth = 2;
    D.elements.point.borderColor = FP.white;
  }
  if (D.elements?.line) {
    D.elements.line.tension = 0.3;
    D.elements.line.borderWidth = 2;
  }
  if (D.elements?.arc) {
    D.elements.arc.borderWidth = 0;
  }
}

// ─── Gradient Fill Helper ───────────────────────────────
// Gradients depend on the canvas context at render time, so
// they CANNOT be set globally. Use this in a dataset's
// `backgroundColor` scriptable option.
//
// Usage inside a dataset:
//   backgroundColor: (ctx: ScriptableContext<'line'>) => {
//     const { chart } = ctx;
//     if (!chart.chartArea) return FP.mint;
//     return getAreaGradient(chart.ctx, chart.chartArea, FP.mint);
//   },

export function getAreaGradient(
  ctx: CanvasRenderingContext2D,
  chartArea: { top: number; bottom: number },
  color: string,
  topAlpha = 0.25,
  bottomAlpha = 0.02,
): CanvasGradient {
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, hexToRgba(color, topAlpha));
  gradient.addColorStop(1, hexToRgba(color, bottomAlpha));
  return gradient;
}

/** '#2dd4bf' + 0.25 → 'rgba(45, 212, 191, 0.25)' */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ─── Auto-apply on import ───────────────────────────────
applyFintechDefaults();
