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
    color: '#3b82f6',
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
    } catch (e) {
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
      setAddForm({ name: '', color: '#3b82f6', monthly_limit: '' });
      setIsAdding(false);
      setError('');
      await loadCategories();
    } catch (e: any) {
      setError(e.message || 'Failed to create category');
    }
  };

  return (
    <div className="glass-card p-5">
      
        <h3 className="text-slate-800 dark:text-white/80">Categories</h3>
        <Button size="sm" onClick={() => setIsAdding((v) => !v)}>
          {isAdding ? 'Cancel' : '+ Add Category'}
        </Button>
      
      
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        {isAdding && (
          <div className="mb-6 rounded-lg border p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Groceries"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Monthly Limit (IDR)</Label>
                <Input
                  type="number"
                  value={addForm.monthly_limit}
                  onChange={(e) => setAddForm((p) => ({ ...p, monthly_limit: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={addForm.color}
                    onChange={(e) => setAddForm((p) => ({ ...p, color: e.target.value }))}
                    className="h-9 w-9 rounded cursor-pointer border-0 p-0"
                  />
                  <div className="flex flex-wrap gap-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setAddForm((p) => ({ ...p, color: c }))}
                        className="h-5 w-5 rounded-full border border-slate-200 dark:border-white/[0.06]"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={handleAdd}>Save Category</Button>
            </div>
          </div>
        )}

        <div className="hidden md:block rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Color</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Monthly Limit</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
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
                            value={editForm.color || '#3b82f6'}
                            onChange={(e) => setEditForm((p) => ({ ...p, color: e.target.value }))}
                            className="h-8 w-8 rounded cursor-pointer border-0 p-0"
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
                          <div className="flex gap-1">
                            <Button size="sm" className="h-7 text-xs" onClick={saveEdit}>Save</Button>
                            <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={cancelEdit}>Cancel</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }
                  return (
                    <TableRow key={cat.id}>
                      <TableCell>
                        <div
                          className="h-5 w-5 rounded-full border border-slate-200 dark:border-white/[0.06]"
                          style={{ backgroundColor: cat.color }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className="text-right">
                        {cat.monthly_limit > 0 ? formatIdr(cat.monthly_limit) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-mint-500 hover:text-mint-600" onClick={() => startEdit(cat)}>
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-700" onClick={() => handleDelete(cat.id)}>
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

        <div className="md:hidden rounded-xl border divide-y border-slate-200 dark:border-white/[0.06]">
          {loading ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">Loading...</div>
          ) : categories.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No categories yet. Add one above.
            </div>
          ) : (
            categories.map((cat) => {
              const isEditing = editingId === cat.id;
              if (isEditing) {
                return (
                  <div key={cat.id} className="px-4 py-3 bg-muted/30">
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
                        value={editForm.color || '#3b82f6'}
                        onChange={(e) => setEditForm((p) => ({ ...p, color: e.target.value }))}
                        className="h-9 w-full rounded cursor-pointer border-0 p-0 bg-transparent"
                      />
                    </div>
                    <div className="flex justify-end gap-2 mt-3">
                      <Button size="sm" variant="secondary" className="h-9 text-xs" onClick={cancelEdit}>Cancel</Button>
                      <Button size="sm" className="h-9 text-xs" onClick={saveEdit}>Save</Button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={cat.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="h-5 w-5 rounded-full border border-slate-200 dark:border-white/[0.06] shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-slate-900 dark:text-white/90 truncate">{cat.name}</p>
                      <p className="text-xs text-slate-500 dark:text-white/40">
                        {cat.monthly_limit > 0 ? formatIdr(cat.monthly_limit) : 'No limit'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => startEdit(cat)}
                      className="h-8 px-3 rounded-lg text-xs font-medium text-mint-500 hover:bg-mint-500/10 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="h-8 px-3 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors"
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
