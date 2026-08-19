import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Skeleton } from './ui/skeleton';
import type { FinancialGoal } from '../lib/api';
import type { NetworthRecord } from '../lib/data';
import { formatIdr, formatNumber } from '../lib/utils';
import {
  fetchGoals,
  createGoalApi,
  updateGoalApi,
  deleteGoalApi,
} from '../lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  TrendingUp,
  Clock,
  Wallet,
  PiggyBank,
  Home,
  Car,
  Plane,
  GraduationCap,
  Heart,
  Gift,
  Shield,
  Star,
  AlertCircle,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  savings: <PiggyBank className="w-5 h-5" />,
  wallet: <Wallet className="w-5 h-5" />,
  home: <Home className="w-5 h-5" />,
  car: <Car className="w-5 h-5" />,
  travel: <Plane className="w-5 h-5" />,
  education: <GraduationCap className="w-5 h-5" />,
  health: <Heart className="w-5 h-5" />,
  gift: <Gift className="w-5 h-5" />,
  insurance: <Shield className="w-5 h-5" />,
  star: <Star className="w-5 h-5" />,
  target: <Target className="w-5 h-5" />,
};

const ICON_OPTIONS = Object.keys(ICON_MAP);

const COLOR_OPTIONS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#64748b', '#a855f7',
];

interface GoalFormData {
  name: string;
  description: string;
  target_amount: string;
  current_amount: string;
  start_date: string;
  target_date: string;
  color: string;
  icon: string;
}

const emptyForm: GoalFormData = {
  name: '',
  description: '',
  target_amount: '',
  current_amount: '0',
  start_date: '',
  target_date: '',
  color: '#6366f1',
  icon: 'savings',
};

interface Props {
  networth: NetworthRecord[];
}

function daysBetween(d1: string, d2: string): number {
  const a = new Date(d1);
  const b = new Date(d2);
  const diffMs = b.getTime() - a.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function CircularProgress({ progress, color, size = 80, strokeWidth = 6 }: { progress: number; color: string; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        className="text-slate-300 dark:text-white/15"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-500 ease-out"
      />
    </svg>
  );
}

export default function GoalsTracker({ networth }: Props) {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [form, setForm] = useState<GoalFormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [contributeTo, setContributeTo] = useState<FinancialGoal | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');

  const loadGoals = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchGoals();
      setGoals(data);
    } catch (err) {
      console.error('Failed to load goals:', err);
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
  const overallProgress = useMemo(() => totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0, [totalTarget, totalSaved]);

  const latestNetworth = networth.length > 0 ? networth[networth.length - 1] : null;

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    if (!form.target_amount || Number(form.target_amount) <= 0) errors.target_amount = 'Enter a valid target amount';
    if (!form.start_date) errors.start_date = 'Start date is required';
    if (!form.target_date) errors.target_date = 'Target date is required';
    if (form.start_date && form.target_date && new Date(form.target_date) <= new Date(form.start_date)) {
      errors.target_date = 'Target must be after start date';
    }
    if (form.current_amount && Number(form.current_amount) < 0) errors.current_amount = 'Cannot be negative';
    if (form.current_amount && form.target_amount && Number(form.current_amount) > Number(form.target_amount)) {
      errors.current_amount = 'Cannot exceed target';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openCreateDialog = () => {
    const today = new Date().toISOString().slice(0, 10);
    const sixMonths = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    setEditingGoal(null);
    setForm({ ...emptyForm, start_date: today, target_date: sixMonths });
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (goal: FinancialGoal) => {
    setEditingGoal(goal);
    setForm({
      name: goal.name,
      description: goal.description,
      target_amount: String(goal.target_amount),
      current_amount: String(goal.current_amount),
      start_date: goal.start_date,
      target_date: goal.target_date,
      color: goal.color,
      icon: goal.icon,
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
          icon: form.icon,
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
          icon: form.icon,
        });
      }
      setDialogOpen(false);
      await loadGoals();
    } catch (err: any) {
      setFormErrors({ name: err.message });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteGoalApi(id);
      setDeleteConfirm(null);
      await loadGoals();
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  };

  const handleToggleComplete = async (goal: FinancialGoal) => {
    try {
      const newCompleted = !goal.completed;
      const newCurrent = newCompleted ? goal.target_amount : goal.current_amount;
      await updateGoalApi(goal.id, { completed: newCompleted, current_amount: newCurrent });
      await loadGoals();
    } catch (err) {
      console.error('Failed to toggle goal:', err);
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
        completed,
      });
      setContributeTo(null);
      setContributeAmount('');
      await loadGoals();
    } catch (err) {
      console.error('Failed to contribute:', err);
    }
  };

  const handleFormChange = (field: keyof GoalFormData, value: string) => {
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
    return (
      <div className="glass-card p-5 space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3.5 w-20" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-mint-100 dark:bg-mint-900/30 text-mint-600 dark:text-mint-400">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Goals</p>
                <p className="text-2xl font-bold">{activeGoals.length}</p>
              </div>
            </div>
          </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Saved</p>
                <p className="text-lg font-bold">{formatIdr(totalSaved)}</p>
              </div>
            </div>
          </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gold-500/10 dark:bg-gold-700/20/30 text-gold-600 dark:text-gold-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Remaining</p>
                <p className="text-lg font-bold">{formatIdr(Math.max(0, totalTarget - totalSaved))}</p>
              </div>
            </div>
          </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
              <div className="relative">
                <CircularProgress
                  progress={overallProgress}
                  color={overallProgress >= 100 ? '#22c55e' : '#6366f1'}
                  size={44}
                  strokeWidth={4}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                  {Math.round(overallProgress)}%
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Overall Progress</p>
                <p className="text-sm font-semibold">
                  {formatIdr(totalSaved)} / {formatIdr(totalTarget)}
                </p>
              </div>
            </div>
          </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Your Goals</h2>
          <p className="text-sm text-muted-foreground">
            {activeGoals.length > 0
              ? `Track your progress across ${activeGoals.length} active goal${activeGoals.length !== 1 ? 's' : ''}`
              : 'No active goals yet — create one to get started'}
          </p>
        </div>
        <Button onClick={openCreateDialog} className="bg-mint-600 hover:bg-mint-700 text-slate-900 dark:text-white gap-2">
          <Plus className="w-4 h-4" />
          New Goal
        </Button>
      </div>

      {/* Active Goals */}
      {activeGoals.length === 0 && completedGoals.length === 0 ? (
        <div className="glass-card p-5">
          <div className="text-center">
              <div className="inline-flex p-4 rounded-full bg-slate-100 dark:bg-white/[0.05] mb-4">
                <Target className="w-8 h-8 text-slate-500 dark:text-white/40" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No goals yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Set a financial goal to start tracking your progress toward your dreams.
              </p>
              <Button onClick={openCreateDialog} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Create Your First Goal
              </Button>
            </div>
          </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeGoals.map((goal) => {
            const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
            const remaining = Math.max(0, goal.target_amount - goal.current_amount);
            const daysLeft = daysBetween(new Date().toISOString().slice(0, 10), goal.target_date);
            const daysTotal = daysBetween(goal.start_date, goal.target_date);
            const timeProgress = daysTotal > 0 ? Math.min(100, ((daysTotal - daysLeft) / daysTotal) * 100) : 100;
            const isOnTrack = progress >= timeProgress;
            const isOverdue = daysLeft === 0 && progress < 100;
            const monthlyRate = daysTotal > 0 ? (goal.target_amount - goal.current_amount) / (daysTotal / 30) : 0;

            return (
              <div key={goal.id} className="glass-card p-5 relative overflow-hidden">
                {/* Color accent bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: goal.color }}
                />

                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${goal.color}20`, color: goal.color }}
                      >
                        {ICON_MAP[goal.icon] || ICON_MAP.target}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{goal.name}</h3>
                        {goal.description && (
                          <p className="text-xs text-muted-foreground truncate">{goal.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setContributeTo(goal)}
                        className="p-1.5 rounded-md hover:bg-slate-200/60 dark:bg-white/[0.08] text-emerald-600 dark:text-emerald-400 transition"
                        title="Add contribution"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditDialog(goal)}
                        className="p-1.5 rounded-md hover:bg-slate-200/60 dark:bg-white/[0.08] text-slate-600 dark:text-white/50 transition"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(goal.id)}
                        className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Ring + Stats */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative shrink-0">
                      <CircularProgress progress={progress} color={goal.color} size={72} strokeWidth={5} />
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div className="flex-1 space-y-2 min-w-0">
                      <div>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-muted-foreground">Saved</span>
                          <span className="font-medium">{formatIdr(goal.current_amount)}</span>
                        </div>
                        <div className="w-full bg-slate-200/60 dark:bg-white/[0.08] rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, progress)}%`, backgroundColor: goal.color }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Target</span>
                        <span className="font-medium">{formatIdr(goal.target_amount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Time & Status */}
                  <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-1.5">
                      {isOverdue ? (
                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                      ) : isOnTrack ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-gold-500" />
                      )}
                      <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'}>
                        {isOverdue
                          ? 'Overdue'
                          : daysLeft > 0
                            ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`
                            : 'Due today'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {monthlyRate > 0 && progress < 100 && !isOverdue && (
                        <span className="text-muted-foreground">
                          {formatIdr(monthlyRate)}/mo needed
                        </span>
                      )}
                      <button
                        onClick={() => handleToggleComplete(goal)}
                        className="p-1 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 transition"
                        title="Mark complete"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
            );
          })}
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Completed ({completedGoals.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {completedGoals.map((goal) => (
              <div key={goal.id} className="glass-card p-5 opacity-75">
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: '#22c55e' }}
                />
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                        {ICON_MAP[goal.icon] || ICON_MAP.target}
                      </div>
                      <div>
                        <h3 className="font-semibold line-through">{goal.name}</h3>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          {formatIdr(goal.target_amount)} achieved
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleComplete(goal)}
                        className="p-1.5 rounded-md hover:bg-gold-500/5 dark:hover:bg-gold-700/30/20 text-gold-500 transition"
                        title="Reopen goal"
                      >
                        <Circle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(goal.id)}
                        className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
            ))}
          </div>
        </div>
      )}

      {/* Networth Context */}
      {latestNetworth && activeGoals.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-medium text-slate-800 dark:text-white/80">Networth Context</h3>
            <p className="text-xs text-slate-600 dark:text-white/50">
              Your latest networth compared to your goals
            </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Current Networth</p>
                <p className="text-lg font-bold">{formatIdr(latestNetworth.total)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Goal Target</p>
                <p className="text-lg font-bold">{formatIdr(totalTarget)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Surplus / Deficit</p>
                <p className={`text-lg font-bold ${latestNetworth.total >= totalTarget ? 'text-emerald-600 dark:text-emerald-400' : 'text-gold-600 dark:text-gold-400'}`}>
                  {latestNetworth.total >= totalTarget ? '+' : ''}{formatIdr(latestNetworth.total - totalTarget)}
                </p>
              </div>
            </div>
          </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
            <DialogDescription>
              {editingGoal ? 'Update your financial goal details' : 'Set a target and track your savings progress'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Goal Name */}
            <div className="space-y-2">
              <Label htmlFor="goal-name">Goal Name *</Label>
              <Input
                id="goal-name"
                placeholder="e.g. Emergency Fund, New Laptop, Vacation"
                value={form.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
              />
              {formErrors.name && <p className="text-xs text-red-500">{formErrors.name}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="goal-desc">Description (optional)</Label>
              <Input
                id="goal-desc"
                placeholder="What is this goal for?"
                value={form.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
              />
            </div>

            {/* Amounts */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goal-target">Target Amount (IDR) *</Label>
                <Input
                  id="goal-target"
                  type="number"
                  placeholder="10000000"
                  value={form.target_amount}
                  onChange={(e) => handleFormChange('target_amount', e.target.value)}
                />
                {formErrors.target_amount && <p className="text-xs text-red-500">{formErrors.target_amount}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-current">Current Amount (IDR)</Label>
                <Input
                  id="goal-current"
                  type="number"
                  placeholder="0"
                  value={form.current_amount}
                  onChange={(e) => handleFormChange('current_amount', e.target.value)}
                />
                {formErrors.current_amount && <p className="text-xs text-red-500">{formErrors.current_amount}</p>}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goal-start">Start Date *</Label>
                <Input
                  id="goal-start"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => handleFormChange('start_date', e.target.value)}
                />
                {formErrors.start_date && <p className="text-xs text-red-500">{formErrors.start_date}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-end">Target Date *</Label>
                <Input
                  id="goal-end"
                  type="date"
                  value={form.target_date}
                  onChange={(e) => handleFormChange('target_date', e.target.value)}
                />
                {formErrors.target_date && <p className="text-xs text-red-500">{formErrors.target_date}</p>}
              </div>
            </div>

            {/* Icon */}
            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => handleFormChange('icon', icon)}
                    className={`p-2 rounded-lg border transition ${
                      form.icon === icon
                        ? 'border-mint-500 bg-mint-50 dark:bg-mint-900/30 ring-1 ring-mint-500'
                        : 'border-slate-200 dark:border-white/[0.06] hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                    title={icon}
                  >
                    <span className={form.icon === icon ? 'text-mint-600 dark:text-mint-400' : 'text-slate-600 dark:text-white/60'}>
                      {ICON_MAP[icon]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleFormChange('color', color)}
                    className={`w-8 h-8 rounded-full transition-all ${
                      form.color === color ? 'ring-2 ring-offset-2 ring-offset-background scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color, ringColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            {form.name && form.target_amount && Number(form.target_amount) > 0 && (
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.06]">
                <p className="text-xs font-medium text-muted-foreground mb-2">Preview</p>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${form.color}20`, color: form.color }}>
                    {ICON_MAP[form.icon] || ICON_MAP.target}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{form.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatIdr(Number(form.current_amount || 0))} of {formatIdr(Number(form.target_amount))}
                      {form.start_date && form.target_date && (
                        <> · {daysBetween(form.start_date, form.target_date)} days</>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-mint-600 hover:bg-mint-700 text-slate-900 dark:text-white">
              {editingGoal ? 'Save Changes' : 'Create Goal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Goal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this goal? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm !== null && handleDelete(deleteConfirm)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contribute Dialog */}
      <Dialog open={contributeTo !== null} onOpenChange={() => { setContributeTo(null); setContributeAmount(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contribution</DialogTitle>
            <DialogDescription>
              How much would you like to add to "{contributeTo?.name}"?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contribute-amount">Amount (IDR)</Label>
              <Input
                id="contribute-amount"
                type="number"
                placeholder="500000"
                value={contributeAmount}
                onChange={(e) => setContributeAmount(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleContribute();
                }}
              />
            </div>

            {contributeTo && contributeAmount && Number(contributeAmount) > 0 && (
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.06] text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Current</span>
                  <span>{formatIdr(contributeTo.current_amount)}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Contribution</span>
                  <span className="text-emerald-600 dark:text-emerald-400">+{formatIdr(Number(contributeAmount))}</span>
                </div>
                <div className="flex justify-between font-semibold pt-1 border-t border-slate-200 dark:border-white/[0.06]">
                  <span>New Total</span>
                  <span>{formatIdr(contributeTo.current_amount + Number(contributeAmount))}</span>
                </div>
                {contributeTo.current_amount + Number(contributeAmount) >= contributeTo.target_amount && (
                  <Badge variant="default" className="mt-2 bg-emerald-600 text-white">
                    🎉 Goal will be completed!
                  </Badge>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setContributeTo(null); setContributeAmount(''); }}>
              Cancel
            </Button>
            <Button
              onClick={handleContribute}
              disabled={!contributeAmount || Number(contributeAmount) <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Add Contribution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
