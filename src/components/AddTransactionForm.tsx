import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTransactionForm } from '../hooks/useTransactionForm';
import TransactionFormFields from './TransactionFormFields';

/**
 * /add page form. All state + submit logic lives in `useTransactionForm`
 * (shared with the dashboard quick-add modal, KUR-17); this component just
 * renders the classic page layout with the duplicate-guard dialog.
 */
export default function AddTransactionForm() {
  const ctrl = useTransactionForm({
    onSaved: () => {
      // Legacy page behavior: clear the entry, keep the success badge for a
      // moment, refocus the title for rapid consecutive entry.
      ctrl.setTitle('');
      ctrl.setCategory('');
      ctrl.setAmount('');
      ctrl.setNotes('');
      ctrl.titleRef.current?.focus();
      window.setTimeout(() => ctrl.resetContent(), 3000);
    },
  });

  return (
    <div className="glass-card p-5">
      <h3 className="text-slate-800 dark:text-white/80">Add Transaction</h3>
      <TransactionFormFields ctrl={ctrl} variant="page" formId="add-tx-form" />
    </div>
  );
}
