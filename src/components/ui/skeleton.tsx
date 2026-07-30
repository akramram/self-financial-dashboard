import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={`animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.05] ${className || 'p-6'}`}>
      <div className="space-y-4">
        <div className="h-4 bg-slate-200/60 dark:bg-white/[0.06] rounded w-1/3" />
        <div className="h-8 bg-slate-200/60 dark:bg-white/[0.06] rounded w-2/3" />
        <div className="h-3 bg-slate-100 dark:bg-white/[0.04] rounded w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonRow({ cols = 6 }: { cols?: number }) {
  return (
    <div className="animate-pulse flex items-center gap-4 p-4 border-b border-slate-200 dark:border-white/[0.03]">
      {Array.from({ length: cols }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-slate-200/60 dark:bg-white/[0.06] rounded"
          style={{ width: `${60 + Math.random() * 80}px` }}
        />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.05] p-5">
      <div className="h-4 bg-slate-200/60 dark:bg-white/[0.06] rounded w-1/4 mb-4" />
      <div className="h-48 bg-slate-100 dark:bg-white/[0.04] rounded" />
    </div>
  );
}
