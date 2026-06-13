/* empty css                               */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BN-0jZ66.mjs';
import 'kleur/colors';
import { f as formatIdr, $ as $$Layout } from '../chunks/utils_Y21joGcU.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { useState, useCallback, useEffect } from 'react';
import { C as Card, c as CardContent, a as CardHeader, b as CardTitle, d as CardDescription } from '../chunks/card_B2l53C5a.mjs';
import { B as Button } from '../chunks/button_ggfKrUNv.mjs';
import '../chunks/input_DnZKLWYU.mjs';
import { L as Label } from '../chunks/label_OcnW5WOo.mjs';
import { B as Badge } from '../chunks/badge_YSTf0UJ6.mjs';
import { Sliders, HelpCircle, Target, Wallet, Clock, PiggyBank, TrendingUp, Info, Flame } from 'lucide-react';
export { renderers } from '../renderers.mjs';

function FireCalculator() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wr, setWr] = useState(4);
  const [er, setEr] = useState(7);
  const [inf, setInf] = useState(3);
  const [showHelp, setShowHelp] = useState(false);
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/fire?wr=${wr}&er=${er}&inf=${inf}`);
      if (!res.ok) {
        const json2 = await res.json();
        setError(json2.error || "Failed to load FIRE data");
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError("Failed to connect to the server");
    } finally {
      setLoading(false);
    }
  }, [wr, er, inf]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  if (loading) {
    return /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center py-20", children: [
      /* @__PURE__ */ jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 dark:border-slate-300" }),
      /* @__PURE__ */ jsx("span", { className: "ml-3 text-slate-500", children: "Crunching the numbers..." })
    ] });
  }
  if (error) {
    return /* @__PURE__ */ jsx(Card, { className: "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20", children: /* @__PURE__ */ jsx(CardContent, { className: "pt-6 text-center", children: /* @__PURE__ */ jsx("p", { className: "text-red-700 dark:text-red-300", children: error }) }) });
  }
  if (!data) return null;
  const {
    monthlyExpenses,
    annualExpenses,
    monthlyIncome,
    monthlySavings,
    currentNetworth,
    savingsRate,
    fireNumber,
    progressPct,
    yearsToFi,
    projectedFiDate,
    monthlyContributionNeeded,
    projection,
    params
  } = data;
  const isFi = currentNetworth >= fireNumber;
  const isNegativeSavings = monthlySavings < 0;
  const chartHeight = 200;
  const maxBalance = projection.length > 0 ? Math.max(fireNumber, projection[projection.length - 1].balance) : fireNumber;
  const fiThresholdY = fireNumber / maxBalance;
  const formatYears = (y) => {
    if (y === null) return "N/A";
    if (y === 0) return "Now";
    if (y < 1) return `${Math.round(y * 12)} months`;
    return `${y.toFixed(1)} years`;
  };
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsxs(CardHeader, { className: "pb-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(Sliders, { className: "w-5 h-5 text-slate-500" }),
            /* @__PURE__ */ jsx(CardTitle, { className: "text-lg", children: "Adjust Assumptions" })
          ] }),
          /* @__PURE__ */ jsxs(
            Button,
            {
              variant: "ghost",
              size: "sm",
              onClick: () => setShowHelp(!showHelp),
              className: "text-xs",
              children: [
                /* @__PURE__ */ jsx(HelpCircle, { className: "w-4 h-4 mr-1" }),
                showHelp ? "Hide Help" : "What do these mean?"
              ]
            }
          )
        ] }),
        showHelp && /* @__PURE__ */ jsxs(CardDescription, { className: "pt-2 space-y-1 text-xs", children: [
          /* @__PURE__ */ jsxs("p", { children: [
            /* @__PURE__ */ jsx("strong", { children: "Withdrawal Rate:" }),
            ' The % of your portfolio you withdraw annually in retirement. The "4% Rule" is standard.'
          ] }),
          /* @__PURE__ */ jsxs("p", { children: [
            /* @__PURE__ */ jsx("strong", { children: "Expected Return:" }),
            " Your assumed annual investment return (after fees). Historical S&P 500: ~7% after inflation."
          ] }),
          /* @__PURE__ */ jsxs("p", { children: [
            /* @__PURE__ */ jsx("strong", { children: "Inflation:" }),
            " How much prices rise each year. Affects your purchasing power and real returns."
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs(Label, { className: "text-xs text-slate-500 mb-1 block", children: [
            "Withdrawal Rate: ",
            /* @__PURE__ */ jsxs("span", { className: "font-semibold text-slate-700 dark:text-slate-300", children: [
              wr,
              "%"
            ] })
          ] }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "range",
              min: 2,
              max: 8,
              step: 0.5,
              value: wr,
              onChange: (e) => setWr(parseFloat(e.target.value)),
              className: "w-full accent-emerald-600"
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-[10px] text-slate-400", children: [
            /* @__PURE__ */ jsx("span", { children: "2% (conservative)" }),
            /* @__PURE__ */ jsx("span", { children: "8% (aggressive)" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs(Label, { className: "text-xs text-slate-500 mb-1 block", children: [
            "Expected Return: ",
            /* @__PURE__ */ jsxs("span", { className: "font-semibold text-slate-700 dark:text-slate-300", children: [
              er,
              "%"
            ] })
          ] }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "range",
              min: 2,
              max: 14,
              step: 0.5,
              value: er,
              onChange: (e) => setEr(parseFloat(e.target.value)),
              className: "w-full accent-blue-600"
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-[10px] text-slate-400", children: [
            /* @__PURE__ */ jsx("span", { children: "2% (bonds)" }),
            /* @__PURE__ */ jsx("span", { children: "14% (aggressive)" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs(Label, { className: "text-xs text-slate-500 mb-1 block", children: [
            "Inflation: ",
            /* @__PURE__ */ jsxs("span", { className: "font-semibold text-slate-700 dark:text-slate-300", children: [
              inf,
              "%"
            ] })
          ] }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "range",
              min: 0,
              max: 8,
              step: 0.5,
              value: inf,
              onChange: (e) => setInf(parseFloat(e.target.value)),
              className: "w-full accent-amber-600"
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-[10px] text-slate-400", children: [
            /* @__PURE__ */ jsx("span", { children: "0%" }),
            /* @__PURE__ */ jsx("span", { children: "8% (high)" })
          ] })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-4", children: [
      /* @__PURE__ */ jsx(Card, { className: isFi ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10" : "", children: /* @__PURE__ */ jsxs(CardContent, { className: "pt-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-2", children: [
          /* @__PURE__ */ jsx(Target, { className: `w-4 h-4 ${isFi ? "text-emerald-500" : "text-slate-500"}` }),
          /* @__PURE__ */ jsx("span", { className: "text-xs font-medium text-slate-500", children: "FIRE Number" })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold", children: formatIdr(fireNumber) }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-400 mt-1", children: [
          Math.round(params.withdrawalRate * 100),
          "% rule: ",
          Math.round(1 / params.withdrawalRate),
          "× annual expenses"
        ] })
      ] }) }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "pt-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-2", children: [
          /* @__PURE__ */ jsx(Wallet, { className: "w-4 h-4 text-slate-500" }),
          /* @__PURE__ */ jsx("span", { className: "text-xs font-medium text-slate-500", children: "Current Networth" })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold", children: formatIdr(currentNetworth) }),
        /* @__PURE__ */ jsx("div", { className: "w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-2", children: /* @__PURE__ */ jsx(
          "div",
          {
            className: `h-2 rounded-full transition-all ${progressPct >= 100 ? "bg-emerald-500" : "bg-blue-500"}`,
            style: { width: `${Math.min(100, progressPct)}%` }
          }
        ) }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-400 mt-1", children: [
          progressPct,
          "% of FIRE target"
        ] })
      ] }) }),
      /* @__PURE__ */ jsx(Card, { className: isFi ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10" : "", children: /* @__PURE__ */ jsxs(CardContent, { className: "pt-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-2", children: [
          /* @__PURE__ */ jsx(Clock, { className: `w-4 h-4 ${isFi ? "text-emerald-500" : "text-slate-500"}` }),
          /* @__PURE__ */ jsx("span", { className: "text-xs font-medium text-slate-500", children: "Time to FI" })
        ] }),
        /* @__PURE__ */ jsx("p", { className: `text-2xl font-bold ${isFi ? "text-emerald-600 dark:text-emerald-400" : ""}`, children: formatYears(yearsToFi) }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-400 mt-1", children: projectedFiDate || "—" })
      ] }) }),
      /* @__PURE__ */ jsx(Card, { className: isNegativeSavings ? "border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10" : "", children: /* @__PURE__ */ jsxs(CardContent, { className: "pt-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-2", children: [
          /* @__PURE__ */ jsx(PiggyBank, { className: `w-4 h-4 ${isNegativeSavings ? "text-red-500" : "text-emerald-500"}` }),
          /* @__PURE__ */ jsx("span", { className: "text-xs font-medium text-slate-500", children: "Monthly Savings" })
        ] }),
        /* @__PURE__ */ jsx("p", { className: `text-2xl font-bold ${isNegativeSavings ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`, children: formatIdr(monthlySavings) }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-400 mt-1", children: [
          "Savings rate: ",
          savingsRate,
          "%"
        ] })
      ] }) })
    ] }),
    projection.length > 1 && /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsxs(CardHeader, { className: "pb-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(TrendingUp, { className: "w-5 h-5 text-slate-500" }),
          /* @__PURE__ */ jsx(CardTitle, { className: "text-lg", children: "Journey to Financial Independence" })
        ] }),
        /* @__PURE__ */ jsx(CardDescription, { children: "Projected networth growth with your current savings rate and assumptions" })
      ] }),
      /* @__PURE__ */ jsxs(CardContent, { children: [
        /* @__PURE__ */ jsxs("div", { className: "relative", style: { height: chartHeight + 60 }, children: [
          /* @__PURE__ */ jsxs("div", { className: "relative", style: { height: chartHeight }, children: [
            /* @__PURE__ */ jsx(
              "div",
              {
                className: "absolute left-0 right-0 border-t-2 border-dashed border-emerald-400/60 z-10",
                style: { bottom: `${fiThresholdY * 100}%` },
                children: /* @__PURE__ */ jsx("span", { className: "absolute right-0 -top-3 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold", children: "FI Target" })
              }
            ),
            /* @__PURE__ */ jsx("div", { className: "absolute inset-0 flex items-end gap-px", children: projection.map((p, i) => {
              const barHeight = p.balance / maxBalance * 100;
              const isPastFi = p.balance >= fireNumber;
              return /* @__PURE__ */ jsxs(
                "div",
                {
                  className: "flex-1 flex flex-col justify-end group relative",
                  style: { height: "100%" },
                  children: [
                    /* @__PURE__ */ jsx(
                      "div",
                      {
                        className: `w-full rounded-t transition-all ${isPastFi ? "bg-emerald-500/80 dark:bg-emerald-400/80" : "bg-blue-500/60 dark:bg-blue-400/60"}`,
                        style: { height: `${barHeight}%` }
                      }
                    ),
                    /* @__PURE__ */ jsx("div", { className: "absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20", children: /* @__PURE__ */ jsxs("div", { className: "bg-slate-800 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-lg", children: [
                      /* @__PURE__ */ jsx("p", { className: "font-semibold", children: p.date }),
                      /* @__PURE__ */ jsxs("p", { children: [
                        "Balance: ",
                        formatIdr(p.balance)
                      ] }),
                      /* @__PURE__ */ jsxs("p", { children: [
                        "Contrib: ",
                        formatIdr(p.contributions)
                      ] })
                    ] }) })
                  ]
                },
                i
              );
            }) })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "flex gap-px mt-1", children: projection.map((p, i) => {
            const showLabel = i === 0 || i === projection.length - 1 || p.balance >= fireNumber && projection[i - 1]?.balance < fireNumber || i % 5 === 0;
            return /* @__PURE__ */ jsx("div", { className: "flex-1 text-center", children: showLabel && /* @__PURE__ */ jsx("span", { className: "text-[10px] text-slate-400 whitespace-nowrap", children: p.year === 0 ? "Now" : `Y${p.year}` }) }, i);
          }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 mt-4 text-xs text-slate-500", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsx("div", { className: "w-3 h-3 rounded bg-blue-500/60" }),
            /* @__PURE__ */ jsx("span", { children: "Accumulation phase" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsx("div", { className: "w-3 h-3 rounded bg-emerald-500/80" }),
            /* @__PURE__ */ jsx("span", { children: "Financially Independent" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsx("div", { className: "w-3 h-0 border-t-2 border-dashed border-emerald-400" }),
            /* @__PURE__ */ jsx("span", { children: "FIRE Target" })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxs(CardTitle, { className: "text-base flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Wallet, { className: "w-4 h-4 text-slate-500" }),
          "Monthly Cash Flow"
        ] }) }),
        /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm text-slate-600 dark:text-slate-400", children: "Monthly Income" }),
            /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold text-emerald-600 dark:text-emerald-400", children: formatIdr(monthlyIncome) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm text-slate-600 dark:text-slate-400", children: "Monthly Expenses" }),
            /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold text-red-600 dark:text-red-400", children: formatIdr(monthlyExpenses) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between", children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: "Monthly Savings" }),
            /* @__PURE__ */ jsx("span", { className: `text-sm font-bold ${monthlySavings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`, children: formatIdr(monthlySavings) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm text-slate-600 dark:text-slate-400", children: "Savings Rate" }),
            /* @__PURE__ */ jsxs("span", { className: `text-sm font-semibold ${savingsRate >= 20 ? "text-emerald-600" : savingsRate >= 0 ? "text-amber-600" : "text-red-600"}`, children: [
              savingsRate,
              "%",
              savingsRate >= 50 && /* @__PURE__ */ jsx(Badge, { className: "ml-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px]", children: "Super Saver" })
            ] })
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxs(CardTitle, { className: "text-base flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Info, { className: "w-4 h-4 text-slate-500" }),
          "The Math Behind Your Number"
        ] }) }),
        /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "space-y-3 text-sm", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ jsx("span", { className: "text-slate-600 dark:text-slate-400", children: "Annual Expenses" }),
            /* @__PURE__ */ jsx("span", { className: "font-semibold", children: formatIdr(annualExpenses) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ jsx("span", { className: "text-slate-600 dark:text-slate-400", children: "Withdrawal Rate" }),
            /* @__PURE__ */ jsxs("span", { className: "font-semibold", children: [
              params.withdrawalRate * 100,
              "%"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ jsx("span", { className: "text-slate-600 dark:text-slate-400", children: "Multiplier (1 ÷ WR)" }),
            /* @__PURE__ */ jsxs("span", { className: "font-semibold", children: [
              Math.round(1 / params.withdrawalRate),
              "×"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between", children: [
            /* @__PURE__ */ jsx("span", { className: "font-medium", children: "FIRE Number" }),
            /* @__PURE__ */ jsx("span", { className: "font-bold text-lg", children: formatIdr(fireNumber) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-xs text-slate-500", children: [
            /* @__PURE__ */ jsx("span", { children: "Real Return (after inflation)" }),
            /* @__PURE__ */ jsxs("span", { className: "font-mono", children: [
              (((1 + params.expectedReturn) / (1 + params.inflation) - 1) * 100).toFixed(2),
              "%"
            ] })
          ] }),
          !isFi && monthlyContributionNeeded > 0 && monthlySavings <= 0 && /* @__PURE__ */ jsx("div", { className: "mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800", children: /* @__PURE__ */ jsxs("p", { className: "text-xs text-amber-800 dark:text-amber-300 font-medium", children: [
            "To reach FI in 10 years, you'd need to save ",
            formatIdr(monthlyContributionNeeded),
            " per month."
          ] }) })
        ] }) })
      ] })
    ] }),
    !isFi && /* @__PURE__ */ jsx(Card, { className: "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10", children: /* @__PURE__ */ jsx(CardContent, { className: "pt-6", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
      /* @__PURE__ */ jsx(Flame, { className: "w-5 h-5 text-orange-500 mt-0.5 shrink-0" }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h3", { className: "font-semibold text-sm mb-2", children: "Ways to reach FI faster:" }),
        /* @__PURE__ */ jsxs("ul", { className: "text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside", children: [
          savingsRate < 50 && /* @__PURE__ */ jsxs("li", { children: [
            "Increase your savings rate from ",
            savingsRate,
            "% to 50%+ for dramatic acceleration"
          ] }),
          monthlyExpenses > 0 && /* @__PURE__ */ jsxs("li", { children: [
            "Reducing monthly expenses by 10% (",
            formatIdr(Math.round(monthlyExpenses * 0.1)),
            ") lowers your FIRE number by ",
            formatIdr(Math.round(fireNumber * 0.1))
          ] }),
          /* @__PURE__ */ jsx("li", { children: "Invest in low-cost index funds to maximize your expected return" }),
          /* @__PURE__ */ jsx("li", { children: "Consider side income streams to boost your monthly savings" }),
          /* @__PURE__ */ jsx("li", { children: "Track your progress monthly — consistency beats timing the market" })
        ] })
      ] })
    ] }) }) }),
    isFi && /* @__PURE__ */ jsx(Card, { className: "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10", children: /* @__PURE__ */ jsxs(CardContent, { className: "pt-6 text-center", children: [
      /* @__PURE__ */ jsx(Flame, { className: "w-10 h-10 text-emerald-500 mx-auto mb-2" }),
      /* @__PURE__ */ jsx("h3", { className: "text-lg font-bold text-emerald-700 dark:text-emerald-300", children: "🎉 Congratulations — You're Financially Independent!" }),
      /* @__PURE__ */ jsxs("p", { className: "text-sm text-emerald-600 dark:text-emerald-400 mt-1", children: [
        "Your networth of ",
        formatIdr(currentNetworth),
        " exceeds your FIRE number of ",
        formatIdr(fireNumber),
        ". Your portfolio can sustain ",
        formatIdr(annualExpenses),
        "/year at ",
        params.withdrawalRate * 100,
        "% withdrawal."
      ] })
    ] }) })
  ] });
}

const $$Fire = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "FIRE Calculator - Financial Dashboard" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-6"> <h1 class="text-2xl font-bold flex items-center gap-2"> <span>🔥</span> FIRE Calculator
</h1> <p class="text-slate-500 dark:text-slate-400 text-sm">
Financial Independence, Retire Early. See how far you are from financial freedom and what it will take to get there.
</p> </div> ${renderComponent($$result2, "FireCalculator", FireCalculator, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/FireCalculator", "client:component-export": "default" })} ` })}`;
}, "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/fire.astro", void 0);

const $$file = "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/fire.astro";
const $$url = "/fire";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Fire,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
