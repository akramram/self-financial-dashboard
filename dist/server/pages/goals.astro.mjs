/* empty css                                        */
import { f as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BN-0jZ66.mjs';
import 'kleur/colors';
import { f as formatIdr, $ as $$Layout } from '../chunks/utils_Dm1NQFdF.mjs';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { e as fetchGoals, u as updateGoalApi, g as createGoalApi, h as deleteGoalApi } from '../chunks/api_B85Pj26R.mjs';
import { C as Card, a as CardContent, b as CardHeader, c as CardTitle, d as CardDescription } from '../chunks/card_Davj9yGI.mjs';
import { B as Button } from '../chunks/button_Br1WsJzs.mjs';
import { B as Badge } from '../chunks/badge_B_lPct8T.mjs';
import { I as Input } from '../chunks/input_iPhZt7ob.mjs';
import { L as Label } from '../chunks/label_BzcOJTTH.mjs';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription, e as DialogFooter } from '../chunks/dialog_BsSkt0Aj.mjs';
import { Target, TrendingUp, Clock, Plus, Pencil, Trash2, AlertCircle, CheckCircle2, Circle, Star, Shield, Gift, Heart, GraduationCap, Plane, Car, Home, Wallet, PiggyBank } from 'lucide-react';
import { r as getNetworth } from '../chunks/db_BgiJApmW.mjs';
export { renderers } from '../renderers.mjs';

const ICON_MAP = {
  savings: /* @__PURE__ */ jsx(PiggyBank, { className: "w-5 h-5" }),
  wallet: /* @__PURE__ */ jsx(Wallet, { className: "w-5 h-5" }),
  home: /* @__PURE__ */ jsx(Home, { className: "w-5 h-5" }),
  car: /* @__PURE__ */ jsx(Car, { className: "w-5 h-5" }),
  travel: /* @__PURE__ */ jsx(Plane, { className: "w-5 h-5" }),
  education: /* @__PURE__ */ jsx(GraduationCap, { className: "w-5 h-5" }),
  health: /* @__PURE__ */ jsx(Heart, { className: "w-5 h-5" }),
  gift: /* @__PURE__ */ jsx(Gift, { className: "w-5 h-5" }),
  insurance: /* @__PURE__ */ jsx(Shield, { className: "w-5 h-5" }),
  star: /* @__PURE__ */ jsx(Star, { className: "w-5 h-5" }),
  target: /* @__PURE__ */ jsx(Target, { className: "w-5 h-5" })
};
const ICON_OPTIONS = Object.keys(ICON_MAP);
const COLOR_OPTIONS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#64748b",
  "#a855f7"
];
const emptyForm = {
  name: "",
  description: "",
  target_amount: "",
  current_amount: "0",
  start_date: "",
  target_date: "",
  color: "#6366f1",
  icon: "savings"
};
function daysBetween(d1, d2) {
  const a = new Date(d1);
  const b = new Date(d2);
  const diffMs = b.getTime() - a.getTime();
  return Math.max(0, Math.ceil(diffMs / (1e3 * 60 * 60 * 24)));
}
function CircularProgress({ progress, color, size = 80, strokeWidth = 6 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - Math.min(100, Math.max(0, progress)) / 100 * circumference;
  return /* @__PURE__ */ jsxs("svg", { width: size, height: size, className: "transform -rotate-90", children: [
    /* @__PURE__ */ jsx(
      "circle",
      {
        cx: size / 2,
        cy: size / 2,
        r: radius,
        stroke: "currentColor",
        strokeWidth,
        fill: "none",
        className: "text-slate-200 dark:text-slate-700"
      }
    ),
    /* @__PURE__ */ jsx(
      "circle",
      {
        cx: size / 2,
        cy: size / 2,
        r: radius,
        stroke: color,
        strokeWidth,
        fill: "none",
        strokeLinecap: "round",
        strokeDasharray: circumference,
        strokeDashoffset: offset,
        className: "transition-all duration-500 ease-out"
      }
    )
  ] });
}
function GoalsTracker({ networth }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [contributeTo, setContributeTo] = useState(null);
  const [contributeAmount, setContributeAmount] = useState("");
  const loadGoals = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchGoals();
      setGoals(data);
    } catch (err) {
      console.error("Failed to load goals:", err);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadGoals();
  }, [loadGoals]);
  const activeGoals = useMemo(() => goals.filter((g) => !g.completed), [goals]);
  const completedGoals = useMemo(() => goals.filter((g) => g.completed), [goals]);
  const totalTarget = useMemo(() => activeGoals.reduce((s, g) => s + g.target_amount, 0), [activeGoals]);
  const totalSaved = useMemo(() => activeGoals.reduce((s, g) => s + g.current_amount, 0), [activeGoals]);
  const overallProgress = useMemo(() => totalTarget > 0 ? totalSaved / totalTarget * 100 : 0, [totalTarget, totalSaved]);
  const latestNetworth = networth.length > 0 ? networth[networth.length - 1] : null;
  const validateForm = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = "Name is required";
    if (!form.target_amount || Number(form.target_amount) <= 0) errors.target_amount = "Enter a valid target amount";
    if (!form.start_date) errors.start_date = "Start date is required";
    if (!form.target_date) errors.target_date = "Target date is required";
    if (form.start_date && form.target_date && new Date(form.target_date) <= new Date(form.start_date)) {
      errors.target_date = "Target must be after start date";
    }
    if (form.current_amount && Number(form.current_amount) < 0) errors.current_amount = "Cannot be negative";
    if (form.current_amount && form.target_amount && Number(form.current_amount) > Number(form.target_amount)) {
      errors.current_amount = "Cannot exceed target";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const openCreateDialog = () => {
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const sixMonths = new Date(Date.now() + 180 * 24 * 60 * 60 * 1e3).toISOString().slice(0, 10);
    setEditingGoal(null);
    setForm({ ...emptyForm, start_date: today, target_date: sixMonths });
    setFormErrors({});
    setDialogOpen(true);
  };
  const openEditDialog = (goal) => {
    setEditingGoal(goal);
    setForm({
      name: goal.name,
      description: goal.description,
      target_amount: String(goal.target_amount),
      current_amount: String(goal.current_amount),
      start_date: goal.start_date,
      target_date: goal.target_date,
      color: goal.color,
      icon: goal.icon
    });
    setFormErrors({});
    setDialogOpen(true);
  };
  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      if (editingGoal) {
        await updateGoalApi(editingGoal.id, {
          name: form.name,
          description: form.description,
          target_amount: Number(form.target_amount),
          current_amount: Number(form.current_amount),
          start_date: form.start_date,
          target_date: form.target_date,
          color: form.color,
          icon: form.icon
        });
      } else {
        await createGoalApi({
          name: form.name,
          description: form.description,
          target_amount: Number(form.target_amount),
          current_amount: Number(form.current_amount),
          start_date: form.start_date,
          target_date: form.target_date,
          color: form.color,
          icon: form.icon
        });
      }
      setDialogOpen(false);
      await loadGoals();
    } catch (err) {
      setFormErrors({ name: err.message });
    }
  };
  const handleDelete = async (id) => {
    try {
      await deleteGoalApi(id);
      setDeleteConfirm(null);
      await loadGoals();
    } catch (err) {
      console.error("Failed to delete goal:", err);
    }
  };
  const handleToggleComplete = async (goal) => {
    try {
      const newCompleted = !goal.completed;
      const newCurrent = newCompleted ? goal.target_amount : goal.current_amount;
      await updateGoalApi(goal.id, { completed: newCompleted, current_amount: newCurrent });
      await loadGoals();
    } catch (err) {
      console.error("Failed to toggle goal:", err);
    }
  };
  const handleContribute = async () => {
    if (!contributeTo || !contributeAmount) return;
    const amount = Number(contributeAmount);
    if (amount <= 0 || isNaN(amount)) return;
    try {
      const newCurrent = contributeTo.current_amount + amount;
      const completed = newCurrent >= contributeTo.target_amount;
      await updateGoalApi(contributeTo.id, {
        current_amount: completed ? contributeTo.target_amount : newCurrent,
        completed
      });
      setContributeTo(null);
      setContributeAmount("");
      await loadGoals();
    } catch (err) {
      console.error("Failed to contribute:", err);
    }
  };
  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };
  if (loading) {
    return /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center py-12", children: /* @__PURE__ */ jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", children: [
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "p-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400", children: /* @__PURE__ */ jsx(Target, { className: "w-5 h-5" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Active Goals" }),
          /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold", children: activeGoals.length })
        ] })
      ] }) }) }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "p-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400", children: /* @__PURE__ */ jsx(TrendingUp, { className: "w-5 h-5" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Total Saved" }),
          /* @__PURE__ */ jsx("p", { className: "text-lg font-bold", children: formatIdr(totalSaved) })
        ] })
      ] }) }) }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "p-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400", children: /* @__PURE__ */ jsx(Clock, { className: "w-5 h-5" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Remaining" }),
          /* @__PURE__ */ jsx("p", { className: "text-lg font-bold", children: formatIdr(Math.max(0, totalTarget - totalSaved)) })
        ] })
      ] }) }) }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "p-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx(
            CircularProgress,
            {
              progress: overallProgress,
              color: overallProgress >= 100 ? "#22c55e" : "#6366f1",
              size: 44,
              strokeWidth: 4
            }
          ),
          /* @__PURE__ */ jsxs("span", { className: "absolute inset-0 flex items-center justify-center text-xs font-bold", children: [
            Math.round(overallProgress),
            "%"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Overall Progress" }),
          /* @__PURE__ */ jsxs("p", { className: "text-sm font-semibold", children: [
            formatIdr(totalSaved),
            " / ",
            formatIdr(totalTarget)
          ] })
        ] })
      ] }) }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold", children: "Your Goals" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: activeGoals.length > 0 ? `Track your progress across ${activeGoals.length} active goal${activeGoals.length !== 1 ? "s" : ""}` : "No active goals yet — create one to get started" })
      ] }),
      /* @__PURE__ */ jsxs(Button, { onClick: openCreateDialog, className: "bg-indigo-600 hover:bg-indigo-700 text-white gap-2", children: [
        /* @__PURE__ */ jsx(Plus, { className: "w-4 h-4" }),
        "New Goal"
      ] })
    ] }),
    activeGoals.length === 0 && completedGoals.length === 0 ? /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "py-12", children: /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "inline-flex p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4", children: /* @__PURE__ */ jsx(Target, { className: "w-8 h-8 text-slate-400 dark:text-slate-500" }) }),
      /* @__PURE__ */ jsx("h3", { className: "text-lg font-semibold mb-1", children: "No goals yet" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground mb-4", children: "Set a financial goal to start tracking your progress toward your dreams." }),
      /* @__PURE__ */ jsxs(Button, { onClick: openCreateDialog, variant: "outline", className: "gap-2", children: [
        /* @__PURE__ */ jsx(Plus, { className: "w-4 h-4" }),
        "Create Your First Goal"
      ] })
    ] }) }) }) : /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4", children: activeGoals.map((goal) => {
      const progress = goal.target_amount > 0 ? goal.current_amount / goal.target_amount * 100 : 0;
      Math.max(0, goal.target_amount - goal.current_amount);
      const daysLeft = daysBetween((/* @__PURE__ */ new Date()).toISOString().slice(0, 10), goal.target_date);
      const daysTotal = daysBetween(goal.start_date, goal.target_date);
      const timeProgress = daysTotal > 0 ? Math.min(100, (daysTotal - daysLeft) / daysTotal * 100) : 100;
      const isOnTrack = progress >= timeProgress;
      const isOverdue = daysLeft === 0 && progress < 100;
      const monthlyRate = daysTotal > 0 ? (goal.target_amount - goal.current_amount) / (daysTotal / 30) : 0;
      return /* @__PURE__ */ jsxs(Card, { className: "relative overflow-hidden", children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            className: "absolute top-0 left-0 right-0 h-1",
            style: { backgroundColor: goal.color }
          }
        ),
        /* @__PURE__ */ jsxs(CardContent, { className: "p-5 pt-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between mb-4", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ jsx(
                "div",
                {
                  className: "p-2 rounded-lg",
                  style: { backgroundColor: `${goal.color}20`, color: goal.color },
                  children: ICON_MAP[goal.icon] || ICON_MAP.target
                }
              ),
              /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                /* @__PURE__ */ jsx("h3", { className: "font-semibold truncate", children: goal.name }),
                goal.description && /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground truncate", children: goal.description })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 shrink-0", children: [
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => setContributeTo(goal),
                  className: "p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-emerald-600 dark:text-emerald-400 transition",
                  title: "Add contribution",
                  children: /* @__PURE__ */ jsx(Plus, { className: "w-4 h-4" })
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => openEditDialog(goal),
                  className: "p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition",
                  title: "Edit",
                  children: /* @__PURE__ */ jsx(Pencil, { className: "w-4 h-4" })
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => setDeleteConfirm(goal.id),
                  className: "p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition",
                  title: "Delete",
                  children: /* @__PURE__ */ jsx(Trash2, { className: "w-4 h-4" })
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 mb-4", children: [
            /* @__PURE__ */ jsxs("div", { className: "relative shrink-0", children: [
              /* @__PURE__ */ jsx(CircularProgress, { progress, color: goal.color, size: 72, strokeWidth: 5 }),
              /* @__PURE__ */ jsxs("span", { className: "absolute inset-0 flex items-center justify-center text-sm font-bold", children: [
                Math.round(progress),
                "%"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex-1 space-y-2 min-w-0", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-xs mb-0.5", children: [
                  /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Saved" }),
                  /* @__PURE__ */ jsx("span", { className: "font-medium", children: formatIdr(goal.current_amount) })
                ] }),
                /* @__PURE__ */ jsx("div", { className: "w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2", children: /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: "h-2 rounded-full transition-all duration-500",
                    style: { width: `${Math.min(100, progress)}%`, backgroundColor: goal.color }
                  }
                ) })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-xs", children: [
                /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Target" }),
                /* @__PURE__ */ jsx("span", { className: "font-medium", children: formatIdr(goal.target_amount) })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs pt-3 border-t border-slate-100 dark:border-slate-700/50", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
              isOverdue ? /* @__PURE__ */ jsx(AlertCircle, { className: "w-3.5 h-3.5 text-red-500" }) : isOnTrack ? /* @__PURE__ */ jsx(CheckCircle2, { className: "w-3.5 h-3.5 text-emerald-500" }) : /* @__PURE__ */ jsx(Clock, { className: "w-3.5 h-3.5 text-amber-500" }),
              /* @__PURE__ */ jsx("span", { className: isOverdue ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground", children: isOverdue ? "Overdue" : daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left` : "Due today" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              monthlyRate > 0 && progress < 100 && !isOverdue && /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground", children: [
                formatIdr(monthlyRate),
                "/mo needed"
              ] }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => handleToggleComplete(goal),
                  className: "p-1 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 transition",
                  title: "Mark complete",
                  children: /* @__PURE__ */ jsx(CheckCircle2, { className: "w-4 h-4" })
                }
              )
            ] })
          ] })
        ] })
      ] }, goal.id);
    }) }),
    completedGoals.length > 0 && /* @__PURE__ */ jsxs("div", { className: "mt-8", children: [
      /* @__PURE__ */ jsxs("h3", { className: "text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(CheckCircle2, { className: "w-4 h-4 text-emerald-500" }),
        "Completed (",
        completedGoals.length,
        ")"
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4", children: completedGoals.map((goal) => /* @__PURE__ */ jsxs(Card, { className: "opacity-75", children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            className: "absolute top-0 left-0 right-0 h-1",
            style: { backgroundColor: "#22c55e" }
          }
        ),
        /* @__PURE__ */ jsx(CardContent, { className: "p-5 pt-6", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsx("div", { className: "p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400", children: ICON_MAP[goal.icon] || ICON_MAP.target }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("h3", { className: "font-semibold line-through", children: goal.name }),
              /* @__PURE__ */ jsxs("p", { className: "text-xs text-emerald-600 dark:text-emerald-400", children: [
                formatIdr(goal.target_amount),
                " achieved"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => handleToggleComplete(goal),
                className: "p-1.5 rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-500 transition",
                title: "Reopen goal",
                children: /* @__PURE__ */ jsx(Circle, { className: "w-4 h-4" })
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => setDeleteConfirm(goal.id),
                className: "p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition",
                title: "Delete",
                children: /* @__PURE__ */ jsx(Trash2, { className: "w-4 h-4" })
              }
            )
          ] })
        ] }) })
      ] }, goal.id)) })
    ] }),
    latestNetworth && activeGoals.length > 0 && /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsxs(CardHeader, { className: "pb-3", children: [
        /* @__PURE__ */ jsx(CardTitle, { className: "text-sm font-medium", children: "Networth Context" }),
        /* @__PURE__ */ jsx(CardDescription, { className: "text-xs", children: "Your latest networth compared to your goals" })
      ] }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground mb-1", children: "Current Networth" }),
          /* @__PURE__ */ jsx("p", { className: "text-lg font-bold", children: formatIdr(latestNetworth.total) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground mb-1", children: "Total Goal Target" }),
          /* @__PURE__ */ jsx("p", { className: "text-lg font-bold", children: formatIdr(totalTarget) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground mb-1", children: "Surplus / Deficit" }),
          /* @__PURE__ */ jsxs("p", { className: `text-lg font-bold ${latestNetworth.total >= totalTarget ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`, children: [
            latestNetworth.total >= totalTarget ? "+" : "",
            formatIdr(latestNetworth.total - totalTarget)
          ] })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(Dialog, { open: dialogOpen, onOpenChange: setDialogOpen, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-h-[90vh] overflow-y-auto", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: editingGoal ? "Edit Goal" : "Create New Goal" }),
        /* @__PURE__ */ jsx(DialogDescription, { children: editingGoal ? "Update your financial goal details" : "Set a target and track your savings progress" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "goal-name", children: "Goal Name *" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "goal-name",
              placeholder: "e.g. Emergency Fund, New Laptop, Vacation",
              value: form.name,
              onChange: (e) => handleFormChange("name", e.target.value)
            }
          ),
          formErrors.name && /* @__PURE__ */ jsx("p", { className: "text-xs text-red-500", children: formErrors.name })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "goal-desc", children: "Description (optional)" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "goal-desc",
              placeholder: "What is this goal for?",
              value: form.description,
              onChange: (e) => handleFormChange("description", e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "goal-target", children: "Target Amount (IDR) *" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                id: "goal-target",
                type: "number",
                placeholder: "10000000",
                value: form.target_amount,
                onChange: (e) => handleFormChange("target_amount", e.target.value)
              }
            ),
            formErrors.target_amount && /* @__PURE__ */ jsx("p", { className: "text-xs text-red-500", children: formErrors.target_amount })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "goal-current", children: "Current Amount (IDR)" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                id: "goal-current",
                type: "number",
                placeholder: "0",
                value: form.current_amount,
                onChange: (e) => handleFormChange("current_amount", e.target.value)
              }
            ),
            formErrors.current_amount && /* @__PURE__ */ jsx("p", { className: "text-xs text-red-500", children: formErrors.current_amount })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "goal-start", children: "Start Date *" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                id: "goal-start",
                type: "date",
                value: form.start_date,
                onChange: (e) => handleFormChange("start_date", e.target.value)
              }
            ),
            formErrors.start_date && /* @__PURE__ */ jsx("p", { className: "text-xs text-red-500", children: formErrors.start_date })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "goal-end", children: "Target Date *" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                id: "goal-end",
                type: "date",
                value: form.target_date,
                onChange: (e) => handleFormChange("target_date", e.target.value)
              }
            ),
            formErrors.target_date && /* @__PURE__ */ jsx("p", { className: "text-xs text-red-500", children: formErrors.target_date })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { children: "Icon" }),
          /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2", children: ICON_OPTIONS.map((icon) => /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => handleFormChange("icon", icon),
              className: `p-2 rounded-lg border transition ${form.icon === icon ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-indigo-500" : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"}`,
              title: icon,
              children: /* @__PURE__ */ jsx("span", { className: form.icon === icon ? "text-indigo-600 dark:text-indigo-400" : "text-slate-600 dark:text-slate-400", children: ICON_MAP[icon] })
            },
            icon
          )) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { children: "Color" }),
          /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2", children: COLOR_OPTIONS.map((color) => /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => handleFormChange("color", color),
              className: `w-8 h-8 rounded-full transition-all ${form.color === color ? "ring-2 ring-offset-2 ring-offset-background scale-110" : "hover:scale-105"}`,
              style: { backgroundColor: color, ringColor: color },
              title: color
            },
            color
          )) })
        ] }),
        form.name && form.target_amount && Number(form.target_amount) > 0 && /* @__PURE__ */ jsxs("div", { className: "p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs font-medium text-muted-foreground mb-2", children: "Preview" }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsx("div", { className: "p-2 rounded-lg", style: { backgroundColor: `${form.color}20`, color: form.color }, children: ICON_MAP[form.icon] || ICON_MAP.target }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold", children: form.name }),
              /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
                formatIdr(Number(form.current_amount || 0)),
                " of ",
                formatIdr(Number(form.target_amount)),
                form.start_date && form.target_date && /* @__PURE__ */ jsxs(Fragment, { children: [
                  " · ",
                  daysBetween(form.start_date, form.target_date),
                  " days"
                ] })
              ] })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setDialogOpen(false), children: "Cancel" }),
        /* @__PURE__ */ jsx(Button, { onClick: handleSubmit, className: "bg-indigo-600 hover:bg-indigo-700 text-white", children: editingGoal ? "Save Changes" : "Create Goal" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(Dialog, { open: deleteConfirm !== null, onOpenChange: () => setDeleteConfirm(null), children: /* @__PURE__ */ jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: "Delete Goal" }),
        /* @__PURE__ */ jsx(DialogDescription, { children: "Are you sure you want to delete this goal? This action cannot be undone." })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setDeleteConfirm(null), children: "Cancel" }),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "destructive",
            onClick: () => deleteConfirm !== null && handleDelete(deleteConfirm),
            children: "Delete"
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(Dialog, { open: contributeTo !== null, onOpenChange: () => {
      setContributeTo(null);
      setContributeAmount("");
    }, children: /* @__PURE__ */ jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: "Add Contribution" }),
        /* @__PURE__ */ jsxs(DialogDescription, { children: [
          'How much would you like to add to "',
          contributeTo?.name,
          '"?'
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "contribute-amount", children: "Amount (IDR)" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "contribute-amount",
              type: "number",
              placeholder: "500000",
              value: contributeAmount,
              onChange: (e) => setContributeAmount(e.target.value),
              autoFocus: true,
              onKeyDown: (e) => {
                if (e.key === "Enter") handleContribute();
              }
            }
          )
        ] }),
        contributeTo && contributeAmount && Number(contributeAmount) > 0 && /* @__PURE__ */ jsxs("div", { className: "p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between mb-1", children: [
            /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Current" }),
            /* @__PURE__ */ jsx("span", { children: formatIdr(contributeTo.current_amount) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between mb-1", children: [
            /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Contribution" }),
            /* @__PURE__ */ jsxs("span", { className: "text-emerald-600 dark:text-emerald-400", children: [
              "+",
              formatIdr(Number(contributeAmount))
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between font-semibold pt-1 border-t border-slate-200 dark:border-slate-700", children: [
            /* @__PURE__ */ jsx("span", { children: "New Total" }),
            /* @__PURE__ */ jsx("span", { children: formatIdr(contributeTo.current_amount + Number(contributeAmount)) })
          ] }),
          contributeTo.current_amount + Number(contributeAmount) >= contributeTo.target_amount && /* @__PURE__ */ jsx(Badge, { variant: "default", className: "mt-2 bg-emerald-600 text-white", children: "🎉 Goal will be completed!" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => {
          setContributeTo(null);
          setContributeAmount("");
        }, children: "Cancel" }),
        /* @__PURE__ */ jsx(
          Button,
          {
            onClick: handleContribute,
            disabled: !contributeAmount || Number(contributeAmount) <= 0,
            className: "bg-emerald-600 hover:bg-emerald-700 text-white",
            children: "Add Contribution"
          }
        )
      ] })
    ] }) })
  ] });
}

const $$Goals = createComponent(($$result, $$props, $$slots) => {
  const networth = getNetworth();
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Goals - Financial Dashboard" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-6"> <h1 class="text-2xl font-bold flex items-center gap-2"> <span>🎯</span> Financial Goals
</h1> <p class="text-slate-500 dark:text-slate-400 text-sm">Set targets, track progress, and achieve your financial dreams</p> </div> ${renderComponent($$result2, "GoalsTracker", GoalsTracker, { "networth": networth, "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/user/hermes-workspace/self-financial-dashboard/src/components/GoalsTracker", "client:component-export": "default" })} ` })}`;
}, "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/goals.astro", void 0);

const $$file = "/Users/user/hermes-workspace/self-financial-dashboard/src/pages/goals.astro";
const $$url = "/goals";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Goals,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
