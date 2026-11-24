import React, { useState, useCallback, useRef } from 'react';
import { importDataApi, type ImportResult } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';

type ImportType = 'transactions' | 'networth' | 'monthly_income';

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

function detectImportType(data: any): ImportType | null {
  if (data && Array.isArray(data.transactions) && data.transactions.length > 0) return 'transactions';
  if (data && Array.isArray(data.networth) && data.networth.length > 0) return 'networth';
  if (data && Array.isArray(data.monthly_income) && data.monthly_income.length > 0) return 'monthly_income';
  if (data && Array.isArray(data.monthlySummary) && data.monthlySummary.length > 0) return 'monthly_income';
  return null;
}

function extractRows(data: any, detectedType: ImportType | null): { rows: any[]; type: ImportType | null } {
  if (!data) return { rows: [], type: null };
  if (Array.isArray(data)) return { rows: data, type: detectedType };
  if (detectedType === 'transactions' && Array.isArray(data.transactions)) return { rows: data.transactions, type: 'transactions' };
  if (detectedType === 'networth' && Array.isArray(data.networth)) return { rows: data.networth, type: 'networth' };
  if (detectedType === 'monthly_income' && Array.isArray(data.monthly_income)) return { rows: data.monthly_income, type: 'monthly_income' };
  if (Array.isArray(data.monthly_income)) return { rows: data.monthly_income, type: 'monthly_income' };
  return { rows: [], type: null };
}

export default function ImportData() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [importType, setImportType] = useState<ImportType>('transactions');
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [allRows, setAllRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);

  const processFile = useCallback(async (selected: File) => {
    setFile(selected);
    setResult(null);
    setError('');

    const text = await selected.text();
    const isCsv = selected.name.toLowerCase().endsWith('.csv');
    const detectedFormat: 'json' | 'csv' = isCsv ? 'csv' : 'json';
    setFormat(detectedFormat);

    if (detectedFormat === 'csv') {
      const rows = parseCsv(text);
      setAllRows(rows);
      setPreviewRows(rows.slice(0, 5));
      const headers = text.trim().split('\n')[0]?.toLowerCase() || '';
      if (headers.includes('title') && headers.includes('category')) {
        setImportType('transactions');
      } else if (headers.includes('investment') || headers.includes('total')) {
        setImportType('networth');
      } else if (headers.includes('income')) {
        setImportType('monthly_income');
      }
    } else {
      try {
        const json = JSON.parse(text);
        const detectedType = detectImportType(json);
        const { rows, type } = extractRows(json, detectedType);
        setAllRows(rows);
        setPreviewRows(rows.slice(0, 5));
        if (type) setImportType(type);
      } catch {
        setError('Invalid JSON file format.');
        setAllRows([]);
        setPreviewRows([]);
      }
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processFile(selected);
    }
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      processFile(dropped);
    }
  }, [processFile]);

  const clearFile = () => {
    setFile(null);
    setPreviewRows([]);
    setAllRows([]);
    setError('');
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (allRows.length === 0) {
      setError('No data found to import.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await importDataApi(importType, allRows);
      setResult(res);
      if (res.errors > 0) {
        setError(`${res.errors} rows failed to import.`);
      }
    } catch (err: any) {
      setError(err.message || 'Import failed.');
    } finally {
      setLoading(false);
    }
  };

  const previewHeaders = previewRows.length > 0 ? Object.keys(previewRows[0]) : [];

  return (
    <div className="glass-card p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-mint-500/10 text-mint-600 dark:text-mint-400 flex items-center justify-center shrink-0">
          <Upload className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Import Data</h3>
          <p className="text-xs text-muted-foreground">Restore historical transactions, networth entries, or monthly income from backup.</p>
        </div>
      </div>

      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
            isDragOver
              ? 'border-mint-500 bg-mint-500/5'
              : 'border-border/80 dark:border-white/[0.08] hover:border-mint-500/50 hover:bg-surface'
          }`}
        >
          <input
            ref={fileInputRef}
            id="import-file"
            type="file"
            accept=".json,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-full bg-muted dark:bg-white/[0.05] flex items-center justify-center mb-3 text-muted-foreground">
            <Upload className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
            Choose a file or drag and drop
          </p>
          <p className="text-xs text-muted-foreground">
            JSON full backup or CSV exports (up to 10MB)
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 dark:border-white/[0.06] bg-surface">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="w-5 h-5 text-mint-600 dark:text-mint-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate text-slate-900 dark:text-white">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB · {allRows.length} rows detected</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="uppercase text-[10px] font-mono">
                {format}
              </Badge>
              <button
                type="button"
                onClick={clearFile}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-white/10 transition"
                aria-label="Remove selected file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Detected Format</Label>
              <div className="h-9 px-3 rounded-lg border border-border/80 dark:border-white/[0.06] bg-muted/30 flex items-center text-xs font-medium uppercase text-muted-foreground">
                {format}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Target Dataset</Label>
              <Select value={importType} onValueChange={(v) => setImportType(v as ImportType)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transactions">Transactions</SelectItem>
                  <SelectItem value="networth">Networth</SelectItem>
                  <SelectItem value="monthly_income">Monthly Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {previewRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Data Preview</Label>
                <Badge variant="secondary" className="text-[10px]">First 5 of {allRows.length} rows</Badge>
              </div>
              <div className="rounded-xl border border-border/80 dark:border-white/[0.06] overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {previewHeaders.map((h) => (
                        <TableHead key={h} className="text-xs font-semibold py-2 px-3">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, idx) => (
                      <TableRow key={idx}>
                        {previewHeaders.map((h) => (
                          <TableCell key={h} className="text-xs py-2 px-3 max-w-[180px] truncate">
                            {String(row[h] ?? '')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="p-3.5 rounded-xl border border-border/80 dark:border-white/[0.06] bg-surface space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Import Completed
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-3">
                <span>
                  <strong className="text-emerald-600 dark:text-emerald-400">{result.imported}</strong> imported
                </span>
                <span>
                  <strong className="text-amber-600 dark:text-amber-400">{result.skipped}</strong> skipped
                </span>
                {result.errors > 0 && (
                  <span>
                    <strong className="text-red-600 dark:text-red-400">{result.errors}</strong> errors
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleImport}
              disabled={loading || allRows.length === 0}
              className="h-9 px-4 text-xs font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${allRows.length} Rows`
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
