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

  it('rejects non-finite amount with a clear message instead of a SQL bind error', () => {
    createdRecurringId = insertRecurringTransaction({
      title: 'Test Subscription',
      category: 'Utilities',
      amount: 50000,
      type: 'cash',
      payment_method: 'Cash',
      active: true,
      done: false,
    });

    // NaN amount (e.g. Number('1.293.194')) used to bind NULL → NOT NULL constraint 500
    expect(() => updateRecurringTransaction(createdRecurringId!, { amount: NaN })).toThrow(
      'Amount must be a valid number',
    );
    // Non-integer goal_id used to reach the bind layer as an object → bind TypeError
    expect(() => updateRecurringTransaction(createdRecurringId!, { goal_id: { id: 1 } })).toThrow(
      'goal_id must be an integer or null',
    );
    // Unknown/joined fields (goal_name) are dropped, update still succeeds
    expect(() =>
      updateRecurringTransaction(createdRecurringId!, { title: 'Renamed', goal_name: 'Some Goal' } as any),
    ).not.toThrow();
    expect(getRecurringTransactionById(createdRecurringId)!.title).toBe('Renamed');
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
