import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import CategorySettings from './CategorySettings';
import IncomeSettings from './IncomeSettings';
import ExportData from './ExportData';
import ImportData from './ImportData';
import { Button } from '@/components/ui/button';
import {
  Tags,
  Wallet,
  Database,
  SlidersHorizontal,
  LayoutGrid,
  Bell,
  Command,
  HardDrive,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

type TabKey = 'all' | 'categories' | 'income' | 'data' | 'system';

interface TabItem {
  key: TabKey;
  label: string;
  icon: typeof LayoutGrid;
}

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    // Read initial tab from URL hash if present
    const hash = window.location.hash.replace('#', '') as TabKey;
    if (['all', 'categories', 'income', 'data', 'system'].includes(hash)) {
      setActiveTab(hash);
    }

    const onHashChange = () => {
      const h = window.location.hash.replace('#', '') as TabKey;
      if (['all', 'categories', 'income', 'data', 'system'].includes(h)) {
        setActiveTab(h);
      }
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleTabChange = (key: TabKey) => {
    setActiveTab(key);
    if (key === 'all') {
      history.replaceState(null, '', window.location.pathname);
    } else {
      history.replaceState(null, '', `${window.location.pathname}#${key}`);
    }
  };

  const tabs: TabItem[] = [
    { key: 'all', label: 'All Settings', icon: LayoutGrid },
    { key: 'categories', label: 'Categories & Limits', icon: Tags },
    { key: 'income', label: 'Monthly Income', icon: Wallet },
    { key: 'data', label: 'Backup & Restore', icon: Database },
    { key: 'system', label: 'System & Shortcuts', icon: SlidersHorizontal },
  ];

  const openAlertsPreferences = () => {
    window.dispatchEvent(
      new CustomEvent('fin-alerts-drawer-open', { detail: null }),
    );
  };

  const openCommandPalette = () => {
    window.dispatchEvent(new CustomEvent('cmd-palette-open'));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Settings Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-border/80 dark:border-white/[0.06]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage spending categories, income pacing, database backups, and system preferences.
          </p>
        </div>

        {/* Quick status pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>SQLite Active</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted dark:bg-white/[0.05] text-muted-foreground text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-mint-500" />
            <span>Local Storage</span>
          </div>
        </div>
      </div>

      {/* Segmented Tab Navigation */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 dark:bg-white/[0.03] border border-border/80 dark:border-white/[0.06] overflow-x-auto no-scrollbar relative">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'text-foreground dark:text-white'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 dark:hover:bg-white/[0.03]'
              }`}
              role="tab"
              aria-selected={isActive}
            >
              {isActive && (
                <motion.div
                  layoutId="settings-tab-indicator"
                  className="absolute inset-0 rounded-lg bg-background shadow-sm dark:bg-white/[0.08]"
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : { type: 'spring', bounce: 0.15, duration: 0.4 }
                  }
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-mint-600 dark:text-mint-400' : ''}`} />
                <span>{tab.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
        {/* Categories Section */}
        {(activeTab === 'all' || activeTab === 'categories') && (
          <section id="categories" aria-label="Categories Settings">
            <CategorySettings />
          </section>
        )}

        {/* Income Section */}
        {(activeTab === 'all' || activeTab === 'income') && (
          <section id="income" aria-label="Income Settings">
            <IncomeSettings />
          </section>
        )}

        {/* Data & Backup Section */}
        {(activeTab === 'all' || activeTab === 'data') && (
          <section id="data" aria-label="Data and Backup Settings" className="space-y-6">
            <ExportData />
            <ImportData />
          </section>
        )}

        {/* System & Preferences Section */}
        {(activeTab === 'all' || activeTab === 'system') && (
          <section id="system" aria-label="System Preferences">
            <div className="glass-card p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-mint-500/10 text-mint-600 dark:text-mint-400 flex items-center justify-center shrink-0">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">System & Shortcuts</h3>
                  <p className="text-xs text-muted-foreground">App environment information, alert settings, and quick controls.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {/* Database Info Card */}
                <div className="p-4 rounded-xl border border-border/80 dark:border-white/[0.06] bg-surface space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                    <HardDrive className="w-4 h-4 text-mint-600 dark:text-mint-400" />
                    Storage Engine
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Embedded SQLite database located at <code className="font-mono text-[11px] px-1 py-0.5 rounded bg-muted">data/financial.db</code>. WAL mode enabled.
                  </p>
                  <div className="pt-1">
                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      Zero cloud telemetry
                    </span>
                  </div>
                </div>

                {/* Alerts Preferences Shortcut */}
                <div className="p-4 rounded-xl border border-border/80 dark:border-white/[0.06] bg-surface space-y-2 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                      <Bell className="w-4 h-4 text-mint-600 dark:text-mint-400" />
                      Alert Preferences
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Configure budget pacing warnings, anomaly triggers, and notification thresholds.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-medium h-8 mt-2"
                    onClick={openAlertsPreferences}
                  >
                    Open Alert Settings
                  </Button>
                </div>

                {/* Keyboard Shortcuts Card */}
                <div className="p-4 rounded-xl border border-border/80 dark:border-white/[0.06] bg-surface space-y-2 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                      <Command className="w-4 h-4 text-mint-600 dark:text-mint-400" />
                      Quick Search
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Navigate pages, search transactions, or invoke actions instantly anywhere in the app.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-medium h-8 mt-2 justify-between"
                    onClick={openCommandPalette}
                  >
                    <span>Command Palette</span>
                    <kbd className="px-1.5 py-0.5 rounded border border-border dark:border-white/10 font-mono text-[10px] text-muted-foreground">⌘K</kbd>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
