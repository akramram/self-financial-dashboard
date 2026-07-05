import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  icon: string;
  group: 'pages' | 'actions';
  href: string;
}

const ALL_ITEMS: CommandItem[] = [
  // Pages
  { id: 'dashboard', label: 'Dashboard', description: 'Overview of income, outcome, and networth', icon: '📊', group: 'pages', href: '/' },
  { id: 'transactions', label: 'Transactions', description: 'View and manage all transactions', icon: '📋', group: 'pages', href: '/transactions' },
  { id: 'networth', label: 'Net Worth', description: 'Track net worth over time', icon: '💎', group: 'pages', href: '/networth' },
  { id: 'budget', label: 'Budget Report', description: 'Category budget tracking', icon: '📑', group: 'pages', href: '/budget' },
  { id: 'spending-mix', label: 'Spending Mix', description: 'Recurring vs discretionary breakdown', icon: '🔀', group: 'pages', href: '/spending-mix' },
  { id: 'compare', label: 'Month Comparison', description: 'Compare spending across months', icon: '⚖️', group: 'pages', href: '/compare' },
  { id: 'savings-rate', label: 'Savings Rate Tracker', description: 'Track savings rate, benchmarks & milestones', icon: '💰', group: 'pages', href: '/savings-rate' },
  { id: 'analytics', label: 'Spending Analytics', description: 'Daily trends and category drill-down', icon: '📈', group: 'pages', href: '/analytics' },
  { id: 'matrix', label: 'Spending Matrix', description: 'Category × period heatmap of all spending', icon: '🔳', group: 'pages', href: '/matrix' },
  { id: 'cashflow', label: 'Cash Flow', description: 'Income vs outcome waterfall', icon: '💸', group: 'pages', href: '/cashflow' },
  { id: 'calendar', label: 'Spending Calendar', description: 'Calendar heatmap of daily spending', icon: '📅', group: 'pages', href: '/calendar' },
  { id: 'streaks', label: 'Spending Streaks', description: 'No-spend day streaks, badges & patterns', icon: '🔥', group: 'pages', href: '/streaks' },
  { id: 'achievements', label: 'Achievements & Milestones', description: 'Trophy case — net worth, savings & discipline badges', icon: '🏆', group: 'pages', href: '/achievements' },
  { id: 'goals', label: 'Goals Tracker', description: 'Track financial goals progress', icon: '🎯', group: 'pages', href: '/goals' },
  { id: 'recurring', label: 'Recurring', description: 'Manage recurring transactions', icon: '🔄', group: 'pages', href: '/recurring' },
  { id: 'yearly', label: 'Yearly Report', description: 'Annual spending summary', icon: '📆', group: 'pages', href: '/yearly' },
  { id: 'health', label: 'Health Score', description: 'Financial health assessment', icon: '❤️', group: 'pages', href: '/health' },
  { id: 'forecast', label: 'Forecast', description: 'Spending predictions and projections', icon: '🔮', group: 'pages', href: '/forecast' },
  { id: 'dna', label: 'Spending DNA', description: 'Financial personality profile & behavioral analysis', icon: '🧬', group: 'pages', href: '/dna' },
  { id: 'fire', label: 'FIRE Calculator', description: 'Financial Independence Retire Early calculator', icon: '🔥', group: 'pages', href: '/fire' },
  { id: 'what-if', label: 'What-If Planner', description: 'Simulate spending & income changes, see net worth impact', icon: '🔮', group: 'pages', href: '/what-if' },
  { id: 'report', label: 'Monthly Report', description: 'Printable monthly financial report', icon: '📄', group: 'pages', href: '/report' },
  { id: 'settings', label: 'Settings', description: 'Categories, income, and preferences', icon: '⚙️', group: 'pages', href: '/settings' },
  // Actions
  { id: 'add-data', label: 'Add Data', description: 'Add transaction or net worth entry', shortcut: '⌘N', icon: '➕', group: 'actions', href: '/add' },
  { id: 'toggle-theme', label: 'Toggle Dark Mode', description: 'Switch between light and dark theme', icon: '🌓', group: 'actions', href: '__toggle_theme__' },
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
        <mark key={i} className="bg-amber-200 dark:bg-amber-700 rounded-sm px-0.5 text-inherit">
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
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

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
    setSelectedIndex((prev) => Math.min(prev, Math.max(0, flatItems.length + filteredItems.recent.length - 1)));
  }, [flatItems.length, filteredItems.recent.length]);

  const handleSelect = useCallback((item: CommandItem) => {
    if (item.href === '__toggle_theme__') {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      setOpen(false);
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
      const total = filteredItems.recent.length + flatItems.length;

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
            let item: CommandItem | undefined;
            if (idx < filteredItems.recent.length) {
              item = filteredItems.recent[idx];
            } else {
              const result = flatItems[idx - filteredItems.recent.length];
              item = result?.item;
            }
            if (item) handleSelect(item);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          break;
      }
    },
    [selectedIndex, filteredItems, flatItems, handleSelect]
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
          const globalIdx = idx;
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
              <span className="text-lg shrink-0">{item.icon}</span>
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

  const pages = flatItems.filter((r) => r.item.group === 'pages');
  const actions = flatItems.filter((r) => r.item.group === 'actions');
  const recentCount = filteredItems.recent.length;

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
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-100"
              placeholder="Search pages, actions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-[10px] font-mono text-slate-500 dark:text-slate-400">
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <div ref={listRef} className="max-h-[60vh] overflow-y-auto px-2 py-2">
            {renderRecentItems()}

            {/* Pages Group */}
            {pages.length > 0 && (
              <div>
                {query.trim().length > 0 && (
                  <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Pages
                  </div>
                )}
                {pages.map((result, idx) => {
                  const globalIdx = recentCount + idx;
                  return (
                    <div
                      key={result.item.id}
                      ref={(el) => { itemRefs.current[globalIdx] = el; }}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-left
                        ${selectedIndex === globalIdx
                          ? 'bg-slate-100 dark:bg-slate-700'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}
                      `}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      onClick={() => handleSelect(result.item)}
                    >
                      <span className="text-lg shrink-0">{result.item.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">
                          {query.trim().length > 0
                            ? highlightMatch(result.item.label, result.matchIndices)
                            : result.item.label}
                        </div>
                        {result.item.description && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {query.trim().length > 0 && result.item.description
                              ? (() => {
                                  // Try to highlight description too
                                  const descMatch = fuzzyMatch(query.trim().toLowerCase(), result.item.description);
                                  return descMatch
                                    ? highlightMatch(result.item.description, descMatch.matchIndices)
                                    : result.item.description;
                                })()
                              : result.item.description}
                          </div>
                        )}
                      </div>
                      {result.item.shortcut && (
                        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {result.item.shortcut}
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
                {actions.map((result, idx) => {
                  const pagesLen = pages.length;
                  const globalIdx = recentCount + pagesLen + idx;
                  return (
                    <div
                      key={result.item.id}
                      ref={(el) => { itemRefs.current[globalIdx] = el; }}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-left
                        ${selectedIndex === globalIdx
                          ? 'bg-slate-100 dark:bg-slate-700'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}
                      `}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      onClick={() => handleSelect(result.item)}
                    >
                      <span className="text-lg shrink-0">{result.item.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">
                          {query.trim().length > 0
                            ? highlightMatch(result.item.label, result.matchIndices)
                            : result.item.label}
                        </div>
                        {result.item.description && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{result.item.description}</div>
                        )}
                      </div>
                      {result.item.shortcut && (
                        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {result.item.shortcut}
                        </kbd>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* No results */}
            {flatItems.length === 0 && filteredItems.recent.length === 0 && (
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
