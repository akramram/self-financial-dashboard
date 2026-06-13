/* empty css                               */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BN-0jZ66.mjs';
import 'kleur/colors';
import { $ as $$Layout } from '../chunks/utils_Y21joGcU.mjs';
import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { useMemo, useState, useEffect } from 'react';
import { C as Card, c as CardContent, a as CardHeader, b as CardTitle } from '../chunks/card_B2l53C5a.mjs';
import { B as Badge } from '../chunks/badge_YSTf0UJ6.mjs';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from '../chunks/select_B5dRDjp1.mjs';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Heart, ArrowUpRight, ArrowDownRight, Minus, Trophy, Activity, Lightbulb, Wallet, TrendingUp, Target, PiggyBank } from 'lucide-react';
import { g as getMonthlySummary, a as getCategories, d as db } from '../chunks/db_B4_3wji-.mjs';
export { renderers } from '../renderers.mjs';

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);
function ScoreGauge({ score, grade, gradeColor }) {
  const radius = 70;
  const stroke = 12;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - score / 100 * circumference;
  const colorMap = {
    emerald: "#10b981",
    green: "#22c55e",
    yellow: "#eab308",
    amber: "#f59e0b",
    orange: "#f97316",
    red: "#ef4444"
  };
  const mainColor = colorMap[gradeColor] || "#6b7280";
  const bgColor = gradeColor === "emerald" || gradeColor === "green" ? "bg-emerald-50 dark:bg-emerald-950/30" : gradeColor === "yellow" || gradeColor === "amber" ? "bg-amber-50 dark:bg-amber-950/30" : gradeColor === "orange" ? "bg-orange-50 dark:bg-orange-950/30" : "bg-red-50 dark:bg-red-950/30";
  const textColor = gradeColor === "emerald" || gradeColor === "green" ? "text-emerald-700 dark:text-emerald-300" : gradeColor === "yellow" || gradeColor === "amber" ? "text-amber-700 dark:text-amber-300" : gradeColor === "orange" ? "text-orange-700 dark:text-orange-300" : "text-red-700 dark:text-red-300";
  const badgeBg = gradeColor === "emerald" || gradeColor === "green" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" : gradeColor === "yellow" || gradeColor === "amber" ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" : gradeColor === "orange" ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  return /* @__PURE__ */ jsxs("div", { className: `flex flex-col items-center justify-center p-8 rounded-2xl ${bgColor} border border-slate-200 dark:border-slate-700`, children: [
    /* @__PURE__ */ jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsxs("svg", { height: radius * 2, width: radius * 2, className: "-rotate-90", children: [
        /* @__PURE__ */ jsx(
          "circle",
          {
            stroke: "currentColor",
            fill: "transparent",
            strokeWidth: stroke,
            className: "text-slate-200 dark:text-slate-700",
            r: normalizedRadius,
            cx: radius,
            cy: radius
          }
        ),
        /* @__PURE__ */ jsx(
          "circle",
          {
            stroke: mainColor,
            fill: "transparent",
            strokeWidth: stroke,
            strokeLinecap: "round",
            strokeDasharray: `${circumference} ${circumference}`,
            style: { strokeDashoffset: offset, transition: "stroke-dashoffset 1s ease-in-out" },
            r: normalizedRadius,
            cx: radius,
            cy: radius
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center rotate-0", children: [
        /* @__PURE__ */ jsx("span", { className: `text-4xl font-bold ${textColor}`, children: score }),
        /* @__PURE__ */ jsx("span", { className: "text-xs text-slate-500 dark:text-slate-400", children: "/ 100" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-4 flex items-center gap-2", children: /* @__PURE__ */ jsx(Badge, { className: `${badgeBg} text-lg px-3 py-1`, children: grade }) }),
    /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-slate-600 dark:text-slate-400", children: "Financial Health Score" })
  ] });
}
function FactorIcon({ icon, score, maxScore }) {
  const pct = score / maxScore * 100;
  const color = pct >= 80 ? "text-emerald-500" : pct >= 60 ? "text-amber-500" : pct >= 40 ? "text-orange-500" : "text-red-500";
  const iconMap = {
    "piggy-bank": /* @__PURE__ */ jsx(PiggyBank, { className: color }),
    "target": /* @__PURE__ */ jsx(Target, { className: color }),
    "trending-up": /* @__PURE__ */ jsx(TrendingUp, { className: color }),
    "wallet": /* @__PURE__ */ jsx(Wallet, { className: color }),
    "activity": /* @__PURE__ */ jsx(Activity, { className: color })
  };
  return /* @__PURE__ */ jsx(Fragment, { children: iconMap[icon] || /* @__PURE__ */ jsx(Heart, { className: color }) });
}
function FactorCard({ factor }) {
  const pct = factor.score / factor.maxScore * 100;
  const barColor = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : pct >= 40 ? "bg-orange-500" : "bg-red-500";
  return /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(FactorIcon, { icon: factor.icon, score: factor.score, maxScore: factor.maxScore }),
        /* @__PURE__ */ jsx("span", { className: "font-medium text-sm text-slate-700 dark:text-slate-200", children: factor.name })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
        /* @__PURE__ */ jsx("span", { className: "text-sm font-bold text-slate-800 dark:text-slate-100", children: factor.score }),
        /* @__PURE__ */ jsxs("span", { className: "text-xs text-slate-400", children: [
          "/",
          factor.maxScore
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mb-2", children: /* @__PURE__ */ jsx(
      "div",
      {
        className: `${barColor} h-2 rounded-full transition-all duration-700`,
        style: { width: `${pct}%` }
      }
    ) }),
    /* @__PURE__ */ jsx("div", { className: "flex justify-between items-center", children: /* @__PURE__ */ jsx("span", { className: "text-xs text-slate-500 dark:text-slate-400", children: factor.label }) }),
    /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-1", children: factor.detail })
  ] });
}
function HealthScore({ summaries, categories }) {
  const months = useMemo(() => [...summaries].reverse().map((s) => s.month), [summaries]);
  const [selectedMonth, setSelectedMonth] = useState(months[0] || "all");
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const params = selectedMonth !== "all" ? `?month=${encodeURIComponent(selectedMonth)}` : "";
    fetch(`/api/health${params}`).then((res) => res.json()).then((data) => setHealthData(data)).catch(() => {
    }).finally(() => setLoading(false));
  }, [selectedMonth]);
  const trendChart = useMemo(() => {
    if (!healthData?.history) return null;
    return {
      labels: healthData.history.map((h) => h.month),
      datasets: [
        {
          label: "Health Score",
          data: healthData.history.map((h) => h.score),
          borderColor: "#6366f1",
          backgroundColor: "rgba(99, 102, 241, 0.1)",
          fill: true,
          tension: 0.3,
          pointBackgroundColor: healthData.history.map((h) => h.score >= 80 ? "#10b981" : h.score >= 50 ? "#f59e0b" : "#ef4444"),
          pointRadius: 5,
          pointHoverRadius: 7
        }
      ]
    };
  }, [healthData]);
  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `Score: ${ctx.parsed.y}/100`
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: { color: "rgba(148, 163, 184, 0.15)" },
        ticks: {
          callback: (value) => `${value}`,
          font: { size: 11 },
          color: "#94a3b8"
        }
      },
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 10 },
          color: "#94a3b8",
          maxRotation: 45
        }
      }
    }
  };
  if (loading) {
    return /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center py-20", children: [
      /* @__PURE__ */ jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" }),
      /* @__PURE__ */ jsx("span", { className: "ml-3 text-slate-500", children: "Calculating health score..." })
    ] });
  }
  if (!healthData) {
    return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "py-12 text-center", children: [
      /* @__PURE__ */ jsx(Heart, { className: "mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" }),
      /* @__PURE__ */ jsx("p", { className: "text-slate-500 dark:text-slate-400", children: "Not enough data to calculate health score." }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-400 dark:text-slate-500 mt-1", children: "Add transactions and income data to get started." })
    ] }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-slate-600 dark:text-slate-300", children: "Period:" }),
      /* @__PURE__ */ jsxs(Select, { value: selectedMonth, onValueChange: setSelectedMonth, children: [
        /* @__PURE__ */ jsx(SelectTrigger, { className: "w-[180px]", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
        /* @__PURE__ */ jsxs(SelectContent, { children: [
          /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "Latest Month" }),
          months.map((m) => /* @__PURE__ */ jsx(SelectItem, { value: m, children: m }, m))
        ] })
      ] }),
      /* @__PURE__ */ jsx("span", { className: "text-xs text-slate-400 ml-2", children: healthData.month })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "lg:col-span-1", children: [
        /* @__PURE__ */ jsx(
          ScoreGauge,
          {
            score: healthData.overall,
            grade: healthData.grade,
            gradeColor: healthData.gradeColor
          }
        ),
        healthData.trend !== "new" && healthData.prevScore !== null && /* @__PURE__ */ jsx("div", { className: "mt-4 flex items-center justify-center gap-2", children: healthData.trend === "up" ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(ArrowUpRight, { className: "text-emerald-500" }),
          /* @__PURE__ */ jsxs("span", { className: "text-sm font-medium text-emerald-600 dark:text-emerald-400", children: [
            "+",
            healthData.overall - healthData.prevScore,
            " pts from last month"
          ] })
        ] }) : healthData.trend === "down" ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(ArrowDownRight, { className: "text-red-500" }),
          /* @__PURE__ */ jsxs("span", { className: "text-sm font-medium text-red-600 dark:text-red-400", children: [
            healthData.overall - healthData.prevScore,
            " pts from last month"
          ] })
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Minus, { className: "text-slate-500" }),
          /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-slate-600 dark:text-slate-400", children: "No change from last month" })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-4", children: [
          /* @__PURE__ */ jsx(Trophy, { className: "h-5 w-5 text-indigo-500" }),
          /* @__PURE__ */ jsx("h3", { className: "text-lg font-semibold text-slate-700 dark:text-slate-200", children: "Score History" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "h-[220px]", children: trendChart && healthData.history.length > 1 ? /* @__PURE__ */ jsx(Line, { data: trendChart, options: trendOptions }) : /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center h-full text-slate-400 text-sm", children: "Need at least 2 months of data for trend chart" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-4", children: [
        /* @__PURE__ */ jsx(Activity, { className: "h-5 w-5 text-indigo-500" }),
        /* @__PURE__ */ jsx("h3", { className: "text-lg font-semibold text-slate-700 dark:text-slate-200", children: "Factor Breakdown" }),
        /* @__PURE__ */ jsx("span", { className: "text-xs text-slate-400", children: "Each factor contributes 0-20 points" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: healthData.factors.map((factor) => /* @__PURE__ */ jsx(FactorCard, { factor }, factor.name)) })
    ] }),
    healthData.tips.length > 0 && /* @__PURE__ */ jsxs(Card, { className: "border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20", children: [
      /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxs(CardTitle, { className: "flex items-center gap-2 text-base", children: [
        /* @__PURE__ */ jsx(Lightbulb, { className: "h-5 w-5 text-indigo-500" }),
        "Improvement Tips"
      ] }) }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("ul", { className: "space-y-2", children: healthData.tips.map((tip, i) => /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300", children: [
        /* @__PURE__ */ jsx("span", { className: "text-indigo-400 mt-0.5", children: "•" }),
        /* @__PURE__ */ jsx("span", { children: tip })
      ] }, i)) }) })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "How is the score calculated?" }) }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-300", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h4", { className: "font-medium text-slate-700 dark:text-slate-200 mb-1", children: "🎯 Savings Rate (0-20)" }),
          /* @__PURE__ */ jsx("p", { children: "Higher savings rates = better score. 30%+ savings earns full points." })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h4", { className: "font-medium text-slate-700 dark:text-slate-200 mb-1", children: "🎯 Budget Adherence (0-20)" }),
          /* @__PURE__ */ jsx("p", { children: "Based on how many categories stay within their monthly limits." })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h4", { className: "font-medium text-slate-700 dark:text-slate-200 mb-1", children: "📈 Networth Growth (0-20)" }),
          /* @__PURE__ */ jsx("p", { children: "Measures month-over-month networth change. 5%+ growth = full points." })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h4", { className: "font-medium text-slate-700 dark:text-slate-200 mb-1", children: "💰 Spending Control (0-20)" }),
          /* @__PURE__ */ jsx("p", { children: "Reward for spending well below income. Under 50% = full points." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "md:col-span-2", children: [
          /* @__PURE__ */ jsx("h4", { className: "font-medium text-slate-700 dark:text-slate-200 mb-1", children: "🔄 Consistency (0-20)" }),
          /* @__PURE__ */ jsx("p", { children: "Measures stability of savings rate over 3 months. Low variance = high score." })
        ] })
      ] }) })
    ] })
  ] });
}

const $$Health = createComponent(($$result, $$props, $$slots) => {
  const summaries = getMonthlySummary();
  const categories = getCategories();
  const incomeRows = db.prepare("SELECT mi.period_id, mi.income, p.month FROM monthly_income mi JOIN periods p ON mi.period_id = p.id").all();
  const incomeMap = new Map(incomeRows.map((r) => [r.month, r.income]));
  for (const s of summaries) {
    const income = incomeMap.get(s.month) || 0;
    s.income = income;
    s.savings = income - s.outcome.total;
    s.savings_rate_pct = income > 0 ? Number((s.savings / income * 100).toFixed(2)) : 0;
  }
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Health Score - Financial Dashboard" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-6"> <h1 class="text-2xl font-bold">Financial Health Score</h1> <p class="text-slate-500 dark:text-slate-400 text-sm">
A composite score (0-100) based on savings rate, budget adherence, networth growth, spending control, and consistency.
</p> </div> ${renderComponent($$result2, "HealthScore", HealthScore, { "summaries": summaries, "categories": categories, "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/HealthScore", "client:component-export": "default" })} ` })}`;
}, "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/health.astro", void 0);

const $$file = "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/health.astro";
const $$url = "/health";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Health,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
