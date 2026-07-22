import React, { useState, useCallback } from 'react';
import { importDataApi, type ImportResult } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  if (data && Array.isArray(data.monthlySummary) && data.monthlySummary.length > 0) return 'monthly_income'; // fallback hint
  return null;
}

function extractRows(data: any, detectedType: ImportType | null): { rows: any[]; type: ImportType | null } {
  if (!data) return { rows: [], type: null };
  if (Array.isArray(data)) return { rows: data, type: detectedType };
  if (detectedType === 'transactions' && Array.isArray(data.transactions)) return { rows: data.transactions, type: 'transactions' };
  if (detectedType === 'networth' && Array.isArray(data.networth)) return { rows: data.networth, type: 'networth' };
  if (detectedType === 'monthly_income' && Array.isArray(data.monthly_income)) return { rows: data.monthly_income, type: 'monthly_income' };
  // Also check monthlySummary for income data hint
  if (Array.isArray(data.monthly_income)) return { rows: data.monthly_income, type: 'monthly_income' };
  return { rows: [], type: null };
}

export default function ImportData() {
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [importType, setImportType] = useState<ImportType>('transactions');
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [allRows, setAllRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string>('');

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setResult(null);
    setError('');

    const text = await selected.text();
    setFileContent(text);

    const isCsv = selected.name.toLowerCase().endsWith('.csv');
    const detectedFormat: 'json' | 'csv' = isCsv ? 'csv' : 'json';
    setFormat(detectedFormat);

    if (detectedFormat === 'csv') {
      const rows = parseCsv(text);
      setAllRows(rows);
      setPreviewRows(rows.slice(0, 5));
      // Try to guess type from headers
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
        setError('Invalid JSON file');
        setAllRows([]);
        setPreviewRows([]);
      }
    }
  }, []);

  const handleImport = async () => {
    if (allRows.length === 0) {
      setError('No data to import');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await importDataApi(importType, allRows);
      setResult(res);
      if (res.errors > 0) {
        setError(`${res.errors} rows failed to import`);
      }
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const previewHeaders = previewRows.length > 0 ? Object.keys(previewRows[0]) : [];

  return (
    <div className="glass-card p-5">
      <h3 className="text-white/80">Import Data</h3>
      <div className="space-y-2">
          <Label htmlFor="import-file">File (JSON or CSV)</Label>
          <Input id="import-file" type="file" accept=".json,.csv" onChange={handleFileChange} />
        </div>

        {file && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="space-y-1 flex-1">
              <Label>Detected Format</Label>
              <div className="text-sm text-muted-foreground capitalize">{format}</div>
            </div>
            <div className="space-y-1 flex-1">
              <Label>Import Type</Label>
              <Select value={importType} onValueChange={(v) => setImportType(v as ImportType)}>
                <SelectTrigger>
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
        )}

        {previewRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Preview ({allRows.length} rows)</Label>
              <Badge variant="secondary">First 5 rows shown</Badge>
            </div>
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {previewHeaders.map((h) => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, idx) => (
                    <TableRow key={idx}>
                      {previewHeaders.map((h) => (
                        <TableCell key={h} className="text-xs max-w-[200px] truncate">
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
          <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
        )}

        {result && (
          <div className="rounded-lg bg-white/[0.03] p-3 space-y-1">
            <div className="text-sm font-medium">Import Result</div>
            <div className="text-sm text-muted-foreground">
              <span className="text-emerald-600 font-medium">{result.imported}</span> imported,{' '}
              <span className="text-amber-600 font-medium">{result.skipped}</span> skipped,{' '}
              <span className="text-red-600 font-medium">{result.errors}</span> errors
            </div>
          </div>
        )}

        {file && allRows.length > 0 && (
          <Button onClick={handleImport} disabled={loading}>
            {loading ? 'Importing...' : `Import ${allRows.length} Rows`}
          </Button>
        )}
      </div>
  );
}
