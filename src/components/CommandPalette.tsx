import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  LayoutDashboard, ArrowRightLeft, PieChart, Target, Settings,
  TrendingUp, Calendar, Shield, Wallet, CreditCard,
  Trophy, Zap, Heart, BarChart3, FlaskConical, Briefcase, PiggyBank,
  Repeat, Search, FileText, GitCompare, Activity, Layers, CalendarDays, Grid3x3,
  Plus, LogOut, Flame, Moon, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { formatIdr } from '../lib/utils';

interface TxResult {
  id: number;
  title: string;
  category?: string;
  amount: number;
  type?: string;
  done?: number | boolean;
}

type IconType = React.ComponentType<{ className?: string }>;

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  icon: IconType;
  group: 'pages' | 'actions';
  href: string;
}

// Single source of truth: mirrors the FintechSidebar nav groups (30 pages).
const ALL_ITEMS: CommandItem[] = [
  // Pages — PRIMARY
  { id: 'dashboard', label: 'Dashboard', description: 'Overview of income, outcome, and networth', icon: LayoutDashboard, group: 'pages', href: '/' },
  { id: 'transactions', label: 'Transactions', description: 'View and manage all transactions', icon: ArrowRightLeft, group: 'pages', href: '/transactions' },
  { id: 'analytics', label: 'Analytics', description: 'Daily trends and category drill-down', icon: PieChart, group: 'pages', href: '/analytics' },
  { id: 'goals', label: 'Planning', description: 'Goals tracker and financial planning', icon: Target, group: 'pages', href: '/goals' },
  { id: 'settings', label: 'Settings', description: 'Categories, income, and preferences', icon: Settings, group: 'pages', href: '/settings' },
  // Pages — SECONDARY (Budget)
  { id: 'budget', label: 'Budget', description: 'Category budget tracking', icon: Wallet, group: 'pages', href: '/budget' },
  { id: 'budget-pace', label: 'Budget Pace', description: 'Spending pace vs budget timeline', icon: Activity, group: 'pages', href: '/budget-pace' },
  { id: 'savings-rate', label: 'Savings', description: 'Savings rate, benchmarks & milestones', icon: TrendingUp, group: 'pages', href: '/savings-rate' },
  { id: 'calendar', label: 'Calendar', description: 'Spending heatmap by salary period', icon: CalendarDays, group: 'pages', href: '/calendar' },
  { id: 'runway', label: 'Runway', description: 'Months of expenses covered by liquid assets', icon: Shield, group: 'pages', href: '/runway' },
  { id: 'credit-card', label: 'Credit', description: 'Credit card spending & payment tracking', icon: CreditCard, group: 'pages', href: '/credit-card' },
  // Pages — ANALYTICS
  { id: 'streaks', label: 'Streaks', description: 'No-spend day streaks, badges & patterns', icon: Zap, group: 'pages', href: '/streaks' },
  { id: 'achievements', label: 'Achievements', description: 'Trophy case, net worth, savings & discipline badges', icon: Trophy, group: 'pages', href: '/achievements' },
  { id: 'health', label: 'Health Score', description: 'Financial health assessment', icon: Heart, group: 'pages', href: '/health' },
  { id: 'spending-mix', label: 'Spending Mix', description: 'Recurring vs discretionary breakdown', icon: Layers, group: 'pages', href: '/spending-mix' },
  { id: 'spending-rhythm', label: 'Rhythm', description: 'Spending rhythm by day of week', icon: BarChart3, group: 'pages', href: '/spending-rhythm' },
  { id: 'dna', label: 'Spending DNA', description: 'Financial personality profile & behavioral analysis', icon: FlaskConical, group: 'pages', href: '/dna' },
  { id: 'matrix', label: 'Category Matrix', description: 'Category × period heatmap of all spending', icon: Grid3x3, group: 'pages', href: '/matrix' },
  { id: 'merchants', label: 'Merchants', description: 'Top merchants and spending patterns', icon: Search, group: 'pages', href: '/merchants' },
  // Pages — PLANNING
  { id: 'fire', label: 'FIRE', description: 'Financial Independence Retire Early calculator', icon: Flame, group: 'pages', href: '/fire' },
  { id: 'what-if', label: 'What-If', description: 'Simulate spending & income changes', icon: FlaskConical, group: 'pages', href: '/what-if' },
  { id: 'forecast', label: 'Forecast', description: 'Spending predictions and projections', icon: TrendingUp, group: 'pages', href: '/forecast' },
  { id: 'portfolio', label: 'Portfolio', description: 'Investment portfolio allocation', icon: Briefcase, group: 'pages', href: '/portfolio' },
  { id: 'networth', label: 'Net Worth', description: 'Track net worth over time', icon: PiggyBank, group: 'pages', href: '/networth' },
  // Pages — REPORTS
  { id: 'weekly', label: 'Weekly', description: 'Weekly spending report', icon: Calendar, group: 'pages', href: '/weekly' },
  { id: 'report', label: 'Monthly Report', description: 'Printable monthly financial report', icon: FileText, group: 'pages', href: '/report' },
  { id: 'yearly', label: 'Yearly', description: 'Annual spending summary', icon: CalendarDays, group: 'pages', href: '/yearly' },
  { id: 'compare', label: 'Compare', description: 'Compare spending across months', icon: GitCompare, group: 'pages', href: '/compare' },
  { id: 'cashflow', label: 'Cashflow', description: 'Income vs outcome waterfall', icon: BarChart3, group: 'pages', href: '/cashflow' },
  { id: 'recurring', label: 'Recurring', description: 'Manage recurring transactions', icon: Repeat, group: 'pages', href: '/recurring' },
  { id: 'recurring-audit', label: 'Recurring Audit', description: 'Subscription costs, monthly & annual totals', icon: Search, group: 'pages', href: '/recurring-audit' },
  { id: 'recommendations', label: 'Tips', description: 'Budget recommendations and savings tips', icon: Trophy, group: 'pages', href: '/recommendations' },
  // Actions
  { id: 'add-data', label: 'Add Data', description: 'Add transaction or net worth entry', shortcut: '⌘N', icon: Plus, group: 'actions', href: '/add' },
  { id: 'quick-add', label: 'Quick Add Transaction', description: 'Fast add a transaction from any page', shortcut: '⇧N', icon: Zap, group: 'actions', href: '__quick_add__' },
  { id: 'toggle-theme', label: 'Toggle Dark Mode', description: 'Switch between light and dark theme', icon: Moon, group: 'actions', href: '__toggle_theme__' },
  { id: 'logout', label: 'Log Out', description: 'End this session', icon: LogOut, group: 'actions', href: '__logout__' },
];
const MAX_RECENT = 5;
const RECENT_KEY = 'cmd-palette-recent';

function getRecentIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentId(id: string) {
  const recent = getRecentIds().filter((r) => r !== id);
  recent.unshift(id);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

function fuzzyMatch(query: string, text: string): { score: number; matchIndices: number[] } | null {
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  // Direct substring match
  const idx = t.indexOf(q);
  if (idx >= 0) {
    return {
      score: idx === 0 ? 100 : 50,
      matchIndices: Array.from({ length: q.length }, (_, i) => idx + i),
    };
  }

  // Character-by-character fuzzy match
  let qi = 0;
  let score = 0;
  const matchIndices: number[] = [];
  let lastMatchIdx = -2;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      matchIndices.push(ti);
      // Bonus for consecutive matches
      score += ti === lastMatchIdx + 1 ? 10 : 1;
      // Bonus for matching word start
      if (ti === 0 || t[ti - 1] === ' ') score += 5;
      lastMatchIdx = ti;
      qi++;
    }
  }

  if (qi !== q.length) return null;
  return { score, matchIndices };
}

function highlightMatch(text: string, matchIndices: number[]): React.ReactNode {
  if (matchIndices.length === 0) return text;

  const matchSet = new Set(matchIndices);
  const parts: React.ReactNode[] = [];
  let i = 0;

  while (i < text.length) {
    if (matchSet.has(i)) {
      const start = i;
      while (i < text.length && matchSet.has(i)) i++;
      parts.push(
        <mark key={i} className="bg-gold-400/20 dark:bg-gold-700 rounded-sm px-0.5 text-inherit">
          {text.slice(start, i)}
        </mark>
      );
    } else {
      parts.push(text[i]);
      i++;
    }
  }
  return <>{parts}</>;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [txResults, setTxResults] = useState<TxResult[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasNavigated = useRef(false);

  // Open/close with keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      // ⌘N for quick add
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        saveRecentId('add-data');
        window.location.href = '/add';
      }
      // ⇧N opens the Quick Add dialog from any page
      if (e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'n') {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        e.preventDefault();
        saveRecentId('quick-add');
        window.dispatchEvent(new CustomEvent('quick-add-open'));
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Open via global event (search button in Layout top bars — Pattern 2: CustomEvent)
  useEffect(() => {
    const openPalette = () => setOpen(true);
    window.addEventListener('cmd-palette-open', openPalette);
    return () => window.removeEventListener('cmd-palette-open', openPalette);
  }, []);

  // Escape closes even when the input is not focused (mouse users)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Live transaction search (debounced, only when open, ≥3 chars, not searching for pages/actions keywords)
  useEffect(() => {
    const trimmed = query.trim();
    if (!open || trimmed.length < 3) {
      setTxResults([]);
      setTxLoading(false);
      return;
    }
    const controller = new AbortController();
    setTxLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/transactions?search=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : []))
        .then((rows: TxResult[]) => setTxResults(Array.isArray(rows) ? rows.slice(0, 5) : []))
        .catch(() => {})
        .finally(() => setTxLoading(false));
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
      setTxLoading(false);
    };
  }, [query, open]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      // Small delay to ensure DOM is ready
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      setQuery('');
      setSelectedIndex(0);
      hasNavigated.current = false;
    }
  }, [open]);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    const trimmed = query.trim().toLowerCase();

    if (trimmed.length === 0) {
      // Show recent items first, then all
      const recentIds = getRecentIds();
      const recent = recentIds
        .map((id) => ALL_ITEMS.find((item) => item.id === id))
        .filter(Boolean) as CommandItem[];
      const others = ALL_ITEMS.filter((item) => !recentIds.includes(item.id));
      return { recent, items: others };
    }

    // Fuzzy search
    const results: { item: CommandItem; score: number; matchIndices: number[] }[] = [];

    for (const item of ALL_ITEMS) {
      // Search against label, description, id
      const labelMatch = fuzzyMatch(trimmed, item.label);
      const descMatch = item.description ? fuzzyMatch(trimmed, item.description) : null;
      const idMatch = fuzzyMatch(trimmed, item.id);

      const best = [labelMatch, descMatch, idMatch]
        .filter(Boolean)
        .sort((a, b) => b!.score - a!.score)[0];

      if (best) {
        results.push({ item, score: best.score, matchIndices: best.matchIndices });
      }
    }

    // Sort by score (pages before actions at same score)
    results.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      if (a.item.group !== b.item.group) return a.item.group === 'pages' ? -1 : 1;
      return 0;
    });

    return { recent: [] as CommandItem[], items: results };
  }, [query]);

  const flatItems = filteredItems.items;
  const totalBeforeSelected = filteredItems.recent.length;

  // Adjust selected index when items change
  useEffect(() => {
    setSelectedIndex((prev) => Math.min(prev, Math.max(0, flatItems.length + filteredItems.recent.length + txResults.length - 1)));
  }, [flatItems.length, filteredItems.recent.length, txResults.length]);

  const handleSelectTx = useCallback((tx: TxResult) => {
    setOpen(false);
    window.location.href = `/transactions?search=${encodeURIComponent(tx.title)}`;
  }, []);

  const handleSelect = useCallback((item: CommandItem) => {
    if (item.href === '__toggle_theme__') {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      setOpen(false);
      return;
    }

    if (item.href === '__quick_add__') {
      setOpen(false);
      window.dispatchEvent(new CustomEvent('quick-add-open'));
      return;
    }

    if (item.href === '__logout__') {
      setOpen(false);
      fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
        window.location.href = '/login';
      });
      return;
    }

    // Save to recent
    saveRecentId(item.id);

    // Navigate
    setOpen(false);
    window.location.href = item.href;
  }, []);

  // Keyboard navigation within the palette
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const total = filteredItems.recent.length + flatItems.length + txResults.length;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % total);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + total) % total);
          break;
        case 'Enter':
          e.preventDefault();
          {
            const idx = selectedIndex;
            if (idx < txResults.length) {
              const tx = txResults[idx];
              if (tx) handleSelectTx(tx);
            } else if (idx < txResults.length + filteredItems.recent.length) {
              const item = filteredItems.recent[idx - txResults.length];
              if (item) handleSelect(item);
            } else {
              const entry = flatItems[idx - txResults.length - filteredItems.recent.length] as CommandItem | { item: CommandItem; matchIndices: number[] } | undefined;
              if (entry) handleSelect('item' in entry ? entry.item : entry);
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          break;
      }
    },
    [selectedIndex, filteredItems, flatItems, txResults, handleSelect, handleSelectTx]
  );

  // Scroll selected item into view
  useEffect(() => {
    const el = itemRefs.current[selectedIndex];
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!open) return null;

  const renderRecentItems = () => {
    if (query.trim().length > 0 || filteredItems.recent.length === 0) return null;

    return (
      <div className="pb-2">
        <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Recent
        </div>
        {filteredItems.recent.map((item, idx) => {
          const globalIdx = txResults.length + idx;
          return (
            <div
              key={`recent-${item.id}`}
              ref={(el) => { itemRefs.current[globalIdx] = el; }}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-left
                ${selectedIndex === globalIdx
                  ? 'bg-slate-100 dark:bg-slate-700'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}
              `}
              onMouseEnter={() => setSelectedIndex(globalIdx)}
              onClick={() => handleSelect(item)}
            >
              {(() => { const Icon = item.icon; return <Icon className="w-4 h-4 shrink-0 text-slate-400" strokeWidth={1.8} />; })()}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{item.label}</div>
                {item.description && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.description}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Normalize: empty-query returns raw CommandItem[], fuzzy search returns {item, matchIndices}[].
  // ponytail: discriminated union if groups ever grow beyond pages/actions.
  const norm = (r: CommandItem | { item: CommandItem; matchIndices: number[] }) =>
    'item' in r ? r.item : r;
  const pages = flatItems.filter((r) => norm(r).group === 'pages');
  const actions = flatItems.filter((r) => norm(r).group === 'actions');
  const recentCount = filteredItems.recent.length;
  const txCount = txResults.length;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="relative mx-auto mt-[15vh] w-full max-w-xl">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              className="flex-1 bg-transparent text-sm outline-none rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-100"
              placeholder="Search pages, actions, transactions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {txLoading && (
              <span className="w-4 h-4 border-2 border-mint-500/40 border-t-mint-500 rounded-full animate-spin shrink-0" />
            )}
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-[10px] font-mono text-slate-500 dark:text-slate-400">
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <div ref={listRef} className="max-h-[60vh] overflow-y-auto px-2 py-2">
            {/* Transactions Group (live search) */}
            {query.trim().length >= 3 && (txCount > 0 || txLoading) && (
              <div className="pb-2">
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Transactions
                </div>
                {txResults.map((tx, idx) => {
                  const globalIdx = idx;
                  const isExpense = tx.type === 'cash' || tx.type === 'credit_expense';
                  return (
                    <div
                      key={`tx-${tx.id}`}
                      ref={(el) => { itemRefs.current[globalIdx] = el; }}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-left
                        ${selectedIndex === globalIdx
                          ? 'bg-slate-100 dark:bg-slate-700'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}
                      `}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      onClick={() => handleSelectTx(tx)}
                    >
                      {(() => {
                        const TxIcon = isExpense ? ArrowUpRight : ArrowDownRight;
                        return <TxIcon className={`w-4 h-4 shrink-0 ${isExpense ? 'text-coral-500' : 'text-mint-500'}`} strokeWidth={2} />;
                      })()}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{tx.title}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {tx.category || 'Uncategorized'}
                        </div>
                      </div>
                      <span className={`text-xs font-mono shrink-0 ${isExpense ? 'text-coral-500' : 'text-mint-500'}`}>
                        {isExpense ? '-' : '+'}{formatIdr(tx.amount)}
                      </span>
                    </div>
                  );
                })}
                {txCount === 0 && txLoading && (
                  <div className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">Searching transactions…</div>
                )}
              </div>
            )}

            {renderRecentItems()}

            {/* Pages Group */}
            {pages.length > 0 && (
              <div>
                {query.trim().length > 0 && (
                  <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Pages
                  </div>
                )}
                {pages.map((entry, idx) => {
                  const result = norm(entry);
                  const matchIndices = 'item' in entry ? entry.matchIndices : [];
                  const globalIdx = txCount + recentCount + idx;
                  return (
                    <div
                      key={result.id}
                      ref={(el) => { itemRefs.current[globalIdx] = el; }}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-left
                        ${selectedIndex === globalIdx
                          ? 'bg-slate-100 dark:bg-slate-700'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}
                      `}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      onClick={() => handleSelect(result)}
                    >
                      {(() => { const Icon = result.icon; return <Icon className="w-4 h-4 shrink-0 text-slate-400" strokeWidth={1.8} />; })()}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">
                          {query.trim().length > 0
                            ? highlightMatch(result.label, matchIndices)
                            : result.label}
                        </div>
                        {result.description && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {query.trim().length > 0 && result.description
                              ? (() => {
                                  // Try to highlight description too
                                  const descMatch = fuzzyMatch(query.trim().toLowerCase(), result.description);
                                  return descMatch
                                    ? highlightMatch(result.description, descMatch.matchIndices)
                                    : result.description;
                                })()
                              : result.description}
                          </div>
                        )}
                      </div>
                      {result.shortcut && (
                        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {result.shortcut}
                        </kbd>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Actions Group */}
            {actions.length > 0 && (
              <div>
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </div>
                {actions.map((entry, idx) => {
                  const result = norm(entry);
                  const matchIndices = 'item' in entry ? entry.matchIndices : [];
                  const pagesLen = pages.length;
                  const globalIdx = txCount + recentCount + pagesLen + idx;
                  return (
                    <div
                      key={result.id}
                      ref={(el) => { itemRefs.current[globalIdx] = el; }}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-left
                        ${selectedIndex === globalIdx
                          ? 'bg-slate-100 dark:bg-slate-700'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}
                      `}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      onClick={() => handleSelect(result)}
                    >
                      {(() => { const Icon = result.icon; return <Icon className="w-4 h-4 shrink-0 text-slate-400" strokeWidth={1.8} />; })()}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">
                          {query.trim().length > 0
                            ? highlightMatch(result.label, matchIndices)
                            : result.label}
                        </div>
                        {result.description && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{result.description}</div>
                        )}
                      </div>
                      {result.shortcut && (
                        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {result.shortcut}
                        </kbd>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* No results */}
            {flatItems.length === 0 && filteredItems.recent.length === 0 && txResults.length === 0 && !txLoading && (
              <div className="py-12 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No results for "<span className="font-medium text-slate-700 dark:text-slate-200">{query}</span>"
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try a different search term</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 font-mono">↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 font-mono">↵</kbd>
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 font-mono">esc</kbd>
                close
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
              <span>Open with</span>
              <kbd className="px-1 py-0.5 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 font-mono">
                {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl+'}K
              </kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
