import { useState } from 'react';
import { Button } from './ui/button';
import { Download, FileJson, FileSpreadsheet, ArrowDownToLine, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ExportOption {
  id: string;
  title: string;
  description: string;
  format: 'json' | 'csv';
  filenamePrefix: string;
  url: string;
  icon: typeof FileJson;
}

export default function ExportData() {
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  const dateSuffix = new Date().toISOString().slice(0, 10);

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
    </div>
  );
}
