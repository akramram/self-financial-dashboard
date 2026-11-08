import { describe, it, expect, afterEach } from 'vitest';
import {
  insertRecurringTransaction,
  updateRecurringTransaction,
  getRecurringTransactionById,
  deleteRecurringTransaction,
  insertGoal,
  updateGoal,
  getGoalById,
  deleteGoal,
} from '../lib/db';

describe('DB — updateRecurringTransaction and updateGoal boolean binding', () => {
  let createdRecurringId: number | null = null;
  let createdGoalId: number | null = null;

  afterEach(() => {
    if (createdRecurringId) {
      deleteRecurringTransaction(createdRecurringId);
      createdRecurringId = null;
    }
    if (createdGoalId) {
      deleteGoal(createdGoalId);
      createdGoalId = null;
    }
  });

  it('updates recurring transaction with boolean active and done without SQLite3 bind error', () => {
    createdRecurringId = insertRecurringTransaction({
      title: 'Test Subscription',
      category: 'Utilities',
      amount: 50000,
      type: 'cash',
      payment_method: 'Cash',
      active: true,
      done: false,
    });

    // Update with boolean false for active
    expect(() => {
      updateRecurringTransaction(createdRecurringId!, { active: false, done: true });
    }).not.toThrow();

    const row = getRecurringTransactionById(createdRecurringId);
    expect(row.active).toBe(0);
    expect(row.done).toBe(1);

    // Update with boolean true for active
    expect(() => {
      updateRecurringTransaction(createdRecurringId!, { active: true });
    }).not.toThrow();

    const updatedRow = getRecurringTransactionById(createdRecurringId);
    expect(updatedRow.active).toBe(1);
  });

  it('updates goal with boolean completed without SQLite3 bind error', () => {
    createdGoalId = insertGoal({
      name: 'Test Goal',
      target_amount: 1000000,
      current_amount: 500000,
      start_date: '2026-01-01',
      target_date: '2026-12-31',
      color: '#10B981',
    });

    expect(() => {
      updateGoal(createdGoalId!, { completed: true });
    }).not.toThrow();

    const row = getGoalById(createdGoalId);
    expect(row.completed).toBe(1);

    expect(() => {
      updateGoal(createdGoalId!, { completed: false });
    }).not.toThrow();

    const row2 = getGoalById(createdGoalId);
    expect(row2.completed).toBe(0);
  });
});
