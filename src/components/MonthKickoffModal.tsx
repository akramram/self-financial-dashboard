import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { kickoffMonth } from '../lib/api';
import { formatIdr } from '../lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextMonth: string;
  recurringCount: number;
  onSuccess: () => void;
}

export default function MonthKickoffModal({ open, onOpenChange, nextMonth, recurringCount, onSuccess }: Props) {
  const [salary, setSalary] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleKickoff = async () => {
    const salaryNum = Number(salary);
    if (!salaryNum || salaryNum <= 0) {
      setResult({ success: false, message: 'Please enter a valid salary amount.' });
      return;
    }
    setLoading(true);
    try {
      const res = await kickoffMonth(nextMonth, salaryNum);
      if (res.success) {
        setResult({
          success: true,
          message: `${nextMonth} started! Salary: ${formatIdr(res.salary)}. ${res.preloaded} recurring transaction${res.preloaded !== 1 ? 's' : ''} preloaded.`,
        });
      } else {
        setResult({ success: false, message: 'Failed to start new month.' });
      }
    } catch (e: any) {
      setResult({ success: false, message: e.message || 'An error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (result?.success) {
      setResult(null);
      setSalary('');
      onOpenChange(false);
      onSuccess();
      return;
    }
    setResult(null);
    setSalary('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Start {nextMonth}</DialogTitle>
          <DialogDescription>
            Enter your salary to kick off the new month. All active recurring transactions will be preloaded.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className={`rounded-lg border px-4 py-3 text-sm ${result.success ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'}`}>
              {result.message}
            </div>
            <div className="flex justify-end">
              <Button onClick={handleClose}>
                {result.success ? 'Go to Dashboard' : 'Close'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="salary">Monthly Salary (IDR)</Label>
              <Input
                id="salary"
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="Enter your salary"
                autoFocus
              />
            </div>
            <div className="rounded-lg border bg-slate-50 dark:bg-slate-800/50 p-3 text-sm space-y-1">
              <p className="font-medium text-slate-700 dark:text-slate-200">What will happen:</p>
              <ul className="list-disc list-inside text-slate-500 dark:text-slate-400 space-y-0.5">
                <li>Create income record for {nextMonth}</li>
                <li>Preload {recurringCount} active recurring transaction{recurringCount !== 1 ? 's' : ''}</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleKickoff} disabled={loading}>
                {loading ? 'Starting...' : `Confirm & Start ${nextMonth}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
