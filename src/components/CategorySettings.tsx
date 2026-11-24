import React, { useState, useEffect } from 'react';
import type { Category } from '../lib/data';
import { fetchCategories, createCategory, updateCategoryApi, deleteCategoryApi } from '../lib/api';
import { formatIdr } from '../lib/utils';
import { useConfirm } from './ConfirmDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tags, Plus, X, AlertCircle } from 'lucide-react';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#78716c', '#475569',
];

export default function CategorySettings() {
  const { confirm: confirmAction } = useConfirm();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Category>>({});

  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState<{ name: string; color: string; monthly_limit: string }>({
    name: '',
    color: '#10b981',
    monthly_limit: '',
  });

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const rows = await fetchCategories();
      setCategories(rows);
      setError('');
    } catch {
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditForm({ ...cat });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editForm.id || !editForm.name) return;
    try {
      await updateCategoryApi(editForm.id, {
        name: editForm.name,
        color: editForm.color,
        monthly_limit: editForm.monthly_limit ?? 0,
      });
      setEditingId(null);
      setEditForm({});
      await loadCategories();
    } catch (e: any) {
      setError(e.message || 'Failed to update category');
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirmAction({
      title: 'Delete Category',
      description: 'Delete this category?',
      confirmLabel: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;
    try {
      await deleteCategoryApi(id);
      await loadCategories();
    } catch (e: any) {
      setError(e.message || 'Failed to delete category');
    }
  };

  const handleAdd = async () => {
    if (!addForm.name.trim()) {
      setError('Category name is required');
      return;
    }
    try {
      await createCategory({
        name: addForm.name.trim(),
        color: addForm.color,
        monthly_limit: addForm.monthly_limit ? Number(addForm.monthly_limit) : 0,
      });
      setAddForm({ name: '', color: '#10b981', monthly_limit: '' });
      setIsAdding(false);
      setError('');
      await loadCategories();
    } catch (e: any) {
      setError(e.message || 'Failed to create category');
    }
  };

  return (
    <div className="glass-card p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-mint-500/10 text-mint-600 dark:text-mint-400 flex items-center justify-center shrink-0">
            <Tags className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Categories</h3>
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-muted dark:bg-white/[0.06] text-muted-foreground">
                {categories.length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Configure budget limits and color tagging for expenses.</p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => setIsAdding((v) => !v)}
          className="h-9 px-3.5 text-xs font-semibold gap-1.5 self-start sm:self-auto"
        >
          {isAdding ? (
            <>
              <X className="w-3.5 h-3.5" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              + Add Category
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isAdding && (
        <div className="p-4 sm:p-5 rounded-xl border border-border/80 dark:border-white/[0.08] bg-surface space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Groceries"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Monthly Limit (IDR)</Label>
              <Input
                type="number"
                value={addForm.monthly_limit}
                onChange={(e) => setAddForm((p) => ({ ...p, monthly_limit: e.target.value }))}
                placeholder="0"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={addForm.color}
                  onChange={(e) => setAddForm((p) => ({ ...p, color: e.target.value }))}
                  className="h-9 w-9 rounded-lg cursor-pointer border border-border p-0.5 bg-background shrink-0"
                />
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.slice(0, 10).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAddForm((p) => ({ ...p, color: c }))}
                      className="h-5 w-5 rounded-full border border-black/10 dark:border-white/20 transition-transform hover:scale-110"
                      style={{ backgroundColor: c }}
                      aria-label={`Select color ${c}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs font-semibold" onClick={handleAdd}>
              Save Category
            </Button>
          </div>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-xl border border-border/80 dark:border-white/[0.06] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 dark:bg-white/[0.02]">
              <TableHead className="w-14">Color</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Monthly Limit</TableHead>
              <TableHead className="w-36 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No categories yet. Add one above.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((cat) => {
                const isEditing = editingId === cat.id;
                if (isEditing) {
                  return (
                    <TableRow key={cat.id} className="bg-muted/30">
                      <TableCell>
                        <input
                          type="color"
                          value={editForm.color || '#10b981'}
                          onChange={(e) => setEditForm((p) => ({ ...p, color: e.target.value }))}
                          className="h-8 w-8 rounded-lg cursor-pointer border border-border p-0.5 bg-background"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={editForm.name ?? ''}
                          onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={editForm.monthly_limit ?? 0}
                          onChange={(e) => setEditForm((p) => ({ ...p, monthly_limit: Number(e.target.value) }))}
                          className="h-8 text-xs text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" className="h-7 text-xs font-semibold px-2.5" onClick={saveEdit}>
                            Save
                          </Button>
                          <Button size="sm" variant="secondary" className="h-7 text-xs px-2.5" onClick={cancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }
                return (
                  <TableRow key={cat.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div
                        className="h-5 w-5 rounded-full border border-slate-300 dark:border-white/20 shadow-sm"
                        style={{ backgroundColor: cat.color }}
                      />
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900 dark:text-white">
                      {cat.name}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {cat.monthly_limit > 0 ? (
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {formatIdr(cat.monthly_limit)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2.5 text-xs text-mint-600 dark:text-mint-400 hover:text-mint-700 hover:bg-mint-500/10"
                          onClick={() => startEdit(cat)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2.5 text-xs text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-500/10"
                          onClick={() => handleDelete(cat.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card List View */}
      <div className="md:hidden rounded-xl border border-border/80 dark:border-white/[0.06] divide-y divide-border/80 dark:divide-white/[0.06] overflow-hidden">
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : categories.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No categories yet. Add one above.
          </div>
        ) : (
          categories.map((cat) => {
            const isEditing = editingId === cat.id;
            if (isEditing) {
              return (
                <div key={cat.id} className="p-4 bg-muted/30 space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <Label className="col-span-2 text-xs">Name</Label>
                    <Input
                      type="text"
                      value={editForm.name ?? ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                      className="col-span-2 h-9 text-sm"
                    />
                    <Label className="text-xs">Monthly Limit</Label>
                    <Label className="text-xs">Color</Label>
                    <Input
                      type="number"
                      value={editForm.monthly_limit ?? 0}
                      onChange={(e) => setEditForm((p) => ({ ...p, monthly_limit: Number(e.target.value) }))}
                      className="h-9 text-sm"
                    />
                    <input
                      type="color"
                      value={editForm.color || '#10b981'}
                      onChange={(e) => setEditForm((p) => ({ ...p, color: e.target.value }))}
                      className="h-9 w-full rounded-lg cursor-pointer border border-border p-0.5 bg-background"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button size="sm" variant="secondary" className="h-9 text-xs px-3" onClick={cancelEdit}>
                      Cancel
                    </Button>
                    <Button size="sm" className="h-9 text-xs font-semibold px-3" onClick={saveEdit}>
                      Save
                    </Button>
                  </div>
                </div>
              );
            }
            return (
              <div key={cat.id} className="p-3.5 flex items-center justify-between gap-3 bg-surface">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="h-5 w-5 rounded-full border border-slate-300 dark:border-white/20 shrink-0 shadow-sm"
                    style={{ backgroundColor: cat.color }}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                      {cat.name}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {cat.monthly_limit > 0 ? formatIdr(cat.monthly_limit) : 'No limit'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => startEdit(cat)}
                    className="h-8 px-3 rounded-lg text-xs font-semibold text-mint-600 dark:text-mint-400 hover:bg-mint-500/10 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="h-8 px-3 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
