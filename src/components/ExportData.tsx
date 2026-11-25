import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Download, FileJson, FileSpreadsheet, ArrowDownToLine, Loader2, Database, HardDrive } from 'lucide-react';
import { toast } from 'sonner';

interface ExportOption {
  id: string;
  title: string;
  description: string;
  format: 'json' | 'csv' | 'db';
  filenamePrefix: string;
  url: string;
  icon: typeof FileJson;
}

interface BackupMeta {
  name: string;
  size: number;
  created_at: string;
}

const fmtSize = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export default function ExportData() {
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<BackupMeta[] | null>(null);
  const [snapshotsError, setSnapshotsError] = useState(false);
  const dateSuffix = new Date().toISOString().slice(0, 10);

  const loadSnapshots = useCallback(() => {
    setSnapshotsError(false);
    fetch('/api/backup/db?list=1')
      .then((r) => {
        if (!r.ok) throw new Error('list failed');
        return r.json();
      })
      .then((d) => setSnapshots(Array.isArray(d.backups) ? d.backups : []))
      .catch(() => setSnapshotsError(true));
  }, []);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  const exportOptions: ExportOption[] = [
    {
      id: 'all',
      title: 'Full Backup (JSON)',
      description: 'Complete snapshot of all transactions, networth, categories, and income.',
      format: 'json',
      filenamePrefix: `financial-data-${dateSuffix}.json`,
      url: '/api/export?format=json',
      icon: FileJson,
    },
    {
      id: 'db',
      title: 'Full Backup (SQLite .db)',
      description: 'Live database snapshot with full schema and data. Restorable as-is.',
      format: 'db',
      filenamePrefix: `financial-${dateSuffix}.db`,
      url: '/api/backup/db',
      icon: Database,
    },
    {
      id: 'transactions',
      title: 'Transactions (CSV)',
      description: 'Historical income and expense records with category assignments.',
      format: 'csv',
      filenamePrefix: `transactions-${dateSuffix}.csv`,
      url: '/api/export?format=csv&type=transactions',
      icon: FileSpreadsheet,
    },
    {
      id: 'networth',
      title: 'Networth (CSV)',
      description: 'Monthly assets, liabilities, cash, and investment valuations.',
      format: 'csv',
      filenamePrefix: `networth-${dateSuffix}.csv`,
      url: '/api/export?format=csv&type=networth',
      icon: FileSpreadsheet,
    },
    {
      id: 'summary',
      title: 'Monthly Summary (CSV)',
      description: 'Aggregated monthly income, expenses, and savings rate trends.',
      format: 'csv',
      filenamePrefix: `monthly-summary-${dateSuffix}.csv`,
      url: '/api/export?format=csv&type=summary',
      icon: FileSpreadsheet,
    },
  ];

  const triggerDownload = async (url: string, filename: string) => {
    setLoadingFile(filename);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success(`Downloaded ${filename}`);
      if (url.startsWith('/api/backup/db')) loadSnapshots();
    } catch {
      toast.error('Export failed. Please try again.');
    } finally {
      setLoadingFile(null);
    }
  };

  return (
    <div className="glass-card p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-mint-500/10 text-mint-600 dark:text-mint-400 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Data Export</h3>
            <p className="text-xs text-muted-foreground">Download database snapshots or individual table extracts.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {exportOptions.map((opt) => {
          const Icon = opt.icon;
          const isDownloading = loadingFile === opt.filenamePrefix;

          return (
            <div
              key={opt.id}
              className="flex flex-col justify-between p-4 rounded-xl border border-border/80 dark:border-white/[0.06] bg-surface hover:bg-surface-hover transition-colors"
            >
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-mint-600 dark:text-mint-400" />
                    <span className="font-medium text-sm text-slate-900 dark:text-white">{opt.title}</span>
                  </div>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full uppercase bg-muted dark:bg-white/[0.06] text-muted-foreground">
                    {opt.format}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{opt.description}</p>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center h-9 text-xs font-medium"
                onClick={() => triggerDownload(opt.url, opt.filenamePrefix)}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <ArrowDownToLine className="w-3.5 h-3.5 mr-1.5" />
                    Download {opt.format.toUpperCase()}
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center gap-2 pt-1">
          <HardDrive className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Server snapshots</h4>
          <span className="text-xs text-muted-foreground">newest 10 kept</span>
        </div>

        {snapshotsError ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <span>Failed to load snapshots.</span>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={loadSnapshots}>
              Retry
            </Button>
          </div>
        ) : snapshots === null ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            Loading snapshots...
          </p>
        ) : snapshots.length === 0 ? (
          <p className="text-xs text-muted-foreground">No snapshots yet. Download a .db backup above to create the first one.</p>
        ) : (
          <ul className="divide-y divide-border/60 dark:divide-white/[0.06] rounded-lg border border-border/80 dark:border-white/[0.06] overflow-hidden">
            {snapshots.map((b) => (
              <li key={b.name} className="flex items-center justify-between gap-3 px-3 py-2 bg-surface">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-900 dark:text-white truncate font-mono">{b.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {fmtSize(b.size)} · {new Date(b.created_at).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 shrink-0 text-xs"
                  onClick={() => triggerDownload(`/api/backup/db?file=${encodeURIComponent(b.name)}`, b.name)}
                  disabled={loadingFile === b.name}
                >
                  {loadingFile === b.name ? (
                    <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                  ) : (
                    <ArrowDownToLine className="w-3 h-3 mr-1" aria-hidden="true" />
                  )}
                  Download
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
