import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';

// ─── Spending DNA API ────────────────────────────────────────────────────────
// Computes a financial personality profile from cross-period transaction data.
// No new tables — all derived from existing transactions, periods, and categories.

export const GET: APIRoute = async () => {
  try {
    // ── 1. Gather raw data ────────────────────────────────────────────────
    const periods = db
      .prepare(
        `SELECT p.id, p.month, p.start_date, p.end_date
         FROM periods p ORDER BY p.start_date ASC`
      )
      .all() as { id: number; month: string; start_date: string; end_date: string }[];

    if (periods.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Need at least 2 periods of data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const periodIds = periods.map((p) => p.id);
    const pidSet = new Set(periodIds);

    // Spending transactions per period (cash + credit_expense, done=1)
    const spendRows = db
      .prepare(
        `SELECT period_id, category, SUM(amount) as amount, COUNT(*) as tx_count
         FROM transactions
         WHERE done = 1 AND type IN ('cash', 'credit_expense')
           AND period_id IN (${periodIds.map(() => '?').join(',')})
         GROUP BY period_id, category`
      )
      .all(...periodIds) as {
      period_id: number;
      category: string;
      amount: number;
      tx_count: number;
    }[];

    // Income per period
    const incomeRows = db
      .prepare(
        `SELECT mi.period_id, mi.income, mi.other_income
         FROM monthly_income mi
         WHERE mi.period_id IN (${periodIds.map(() => '?').join(',')})`
      )
      .all(...periodIds) as {
      period_id: number;
      income: number;
      other_income: number;
    }[];

    // Active recurring titles
    const recurringTitles = db
      .prepare(
        `SELECT LOWER(title) as title FROM recurring_transactions WHERE active = 1`
      )
      .all() as { title: string }[];
    const recurringTitleSet = new Set(recurringTitles.map((r) => r.title));

    // Networth per period
    const nwRows = db
      .prepare(
        `SELECT period_id, total FROM networth
         WHERE period_id IN (${periodIds.map(() => '?').join(',')})`
      )
      .all(...periodIds) as { period_id: number; total: number }[];

    // Credit card payments per period (for credit usage dimension)
    const ccRows = db
      .prepare(
        `SELECT period_id, SUM(amount) as amount FROM transactions
         WHERE done = 1 AND type = 'credit_payment'
           AND period_id IN (${periodIds.map(() => '?').join(',')})
         GROUP BY period_id`
      )
      .all(...periodIds) as { period_id: number; amount: number }[];

    // Categories with limits
    const categories = db
      .prepare('SELECT name, monthly_limit FROM categories')
      .all() as { name: string; monthly_limit: number | null }[];

    // ── 2. Build per-period aggregation maps ──────────────────────────────
    const incomeMap = new Map<number, number>();
    for (const r of incomeRows) {
      incomeMap.set(r.period_id, (r.income || 0) + (r.other_income || 0));
    }

    // spendMap: period_id → total spending
    const spendMap = new Map<number, number>();
    // catPeriodSpend: category → period_id → amount
    const catPeriodSpend = new Map<string, Map<number, number>>();
    // txCountMap: period_id → count
    const txCountMap = new Map<number, number>();
    // categoryTotals: category → total across all periods
    const categoryTotals = new Map<string, number>();
    // recurringSpendMap: period_id → recurring amount
    const recurringSpendMap = new Map<number, number>();
    // discretionarySpendMap: period_id → discretionary amount
    const discretionarySpendMap = new Map<number, number>();

    for (const row of spendRows) {
      spendMap.set(
        row.period_id,
        (spendMap.get(row.period_id) || 0) + row.amount
      );
      txCountMap.set(
        row.period_id,
        (txCountMap.get(row.period_id) || 0) + row.tx_count
      );
      categoryTotals.set(
        row.category,
        (categoryTotals.get(row.category) || 0) + row.amount
      );

      if (!catPeriodSpend.has(row.category))
        catPeriodSpend.set(row.category, new Map());
      const catMap = catPeriodSpend.get(row.category)!;
      catMap.set(row.period_id, (catMap.get(row.period_id) || 0) + row.amount);

      // Classify as recurring or discretionary
      const isRecurring =
        recurringTitleSet.has(row.category.toLowerCase()) ||
        [...recurringTitleSet].some(
          (rt) =>
            row.category.toLowerCase().includes(rt) ||
            rt.includes(row.category.toLowerCase())
        );
      if (isRecurring) {
        recurringSpendMap.set(
          row.period_id,
          (recurringSpendMap.get(row.period_id) || 0) + row.amount
        );
      } else {
        discretionarySpendMap.set(
          row.period_id,
          (discretionarySpendMap.get(row.period_id) || 0) + row.amount
        );
      }
    }

    const nwMap = new Map<number, number>();
    for (const r of nwRows) nwMap.set(r.period_id, r.total);

    const ccMap = new Map<number, number>();
    for (const r of ccRows) ccMap.set(r.period_id, r.amount);

    const limitMap = new Map<string, number>();
    for (const c of categories) {
      if (c.monthly_limit && c.monthly_limit > 0)
        limitMap.set(c.name, c.monthly_limit);
    }

    // ── 3. Compute personality dimensions (0-100 scale) ─────────────────────
    // We use only the last N periods (up to 12) for the overall profile

    const recentPeriods = periods.slice(-Math.min(12, periods.length));
    const recentIds = recentPeriods.map((p) => p.id);

    // Helper: average of values across recent periods
    function avgRecent(getter: (pid: number) => number | undefined): number {
      let sum = 0;
      let count = 0;
      for (const pid of recentIds) {
        const v = getter(pid);
        if (v !== undefined && v > 0) {
          sum += v;
          count++;
        }
      }
      return count > 0 ? sum / count : 0;
    }

    // (a) Necessities — how much of spending goes to essentials (recurring/fixed)
    //     High = necessity-heavy, Low = lifestyle-heavy
    const avgRecurringPct = (() => {
      let totalPct = 0;
      let count = 0;
      for (const pid of recentIds) {
        const total = spendMap.get(pid) || 0;
        const recur = recurringSpendMap.get(pid) || 0;
        if (total > 0) {
          totalPct += (recur / total) * 100;
          count++;
        }
      }
      return count > 0 ? totalPct / count : 0;
    })();

    // (b) Lifestyle — discretionary spending as % of income
    const avgDiscretionaryPct = (() => {
      let totalPct = 0;
      let count = 0;
      for (const pid of recentIds) {
        const inc = incomeMap.get(pid);
        if (inc && inc > 0) {
          const disc = discretionarySpendMap.get(pid) || 0;
          totalPct += (disc / inc) * 100;
          count++;
        }
      }
      return count > 0 ? totalPct / count : 0;
    })();

    // (c) Savings Discipline — average savings rate
    const savingsRates: number[] = [];
    for (const pid of recentIds) {
      const inc = incomeMap.get(pid);
      if (inc && inc > 0) {
        const spend = spendMap.get(pid) || 0;
        savingsRates.push(((inc - spend) / inc) * 100);
      }
    }
    const avgSavingsRate =
      savingsRates.length > 0
        ? savingsRates.reduce((s, v) => s + v, 0) / savingsRates.length
        : 0;

    // (d) Credit Usage — credit payments as % of total outcome
    const avgCreditPct = (() => {
      let totalPct = 0;
      let count = 0;
      for (const pid of recentIds) {
        const totalSpend = spendMap.get(pid) || 0;
        const ccPay = ccMap.get(pid) || 0;
        // Total outcome includes cc payments too
        const totalOutcome = totalSpend + ccPay;
        if (totalOutcome > 0) {
          totalPct += (ccPay / totalOutcome) * 100;
          count++;
        }
      }
      return count > 0 ? totalPct / count : 0;
    })();

    // (e) Stability — how consistent is total spending across periods? (inverse of CV)
    const spendingValues: number[] = recentIds
      .map((pid) => spendMap.get(pid) || 0)
      .filter((v) => v > 0);
    const spendingStability = (() => {
      if (spendingValues.length < 2) return 70; // default moderate
      const avg = spendingValues.reduce((s, v) => s + v, 0) / spendingValues.length;
      if (avg === 0) return 70;
      const variance =
        spendingValues.reduce((s, v) => s + (v - avg) ** 2, 0) /
        spendingValues.length;
      const cv = Math.sqrt(variance) / avg; // coefficient of variation
      // cv=0 → 100 (perfectly stable), cv>=0.5 → 0 (very volatile)
      return Math.max(0, Math.min(100, 100 - cv * 200));
    })();

    // (f) Networth Growth — trend of networth across periods
    const nwValues: (number | undefined)[] = recentIds.map((pid) =>
      nwMap.get(pid)
    );
    const networthGrowthScore = (() => {
      const valid = nwValues.filter((v): v is number => v !== undefined);
      if (valid.length < 2) return 50;
      // Check if generally trending up
      let upTicks = 0;
      let downTicks = 0;
      for (let i = 1; i < valid.length; i++) {
        if (valid[i] > valid[i - 1]) upTicks++;
        else if (valid[i] < valid[i - 1]) downTicks++;
      }
      const totalTicks = upTicks + downTicks;
      if (totalTicks === 0) return 50;
      return Math.round((upTicks / totalTicks) * 100);
    })();

    // Normalize all dimensions to 0-100
    const dimensions = {
      necessities: Math.round(Math.min(100, avgRecurringPct)), // higher = more necessity
      lifestyle: Math.round(Math.min(100, avgDiscretionaryPct * 1.5)), // scale up so 67%→100
      savingsDiscipline: Math.round(Math.min(100, Math.max(0, avgSavingsRate + 50))), // -50%→0, 50%→100
      creditUsage: Math.round(Math.min(100, avgCreditPct * 2)), // scale up
      stability: Math.round(spendingStability),
      growth: Math.round(networthGrowthScore),
    };

    // ── 4. Classify personality type ────────────────────────────────────
    const { necessities, lifestyle, savingsDiscipline, creditUsage, stability, growth } = dimensions;

    let personalityType: string;
    let personalityEmoji: string;
    let personalityDesc: string;

    if (savingsDiscipline >= 70 && stability >= 60) {
      personalityType = 'Practical Saver';
      personalityEmoji = '🧮';
      personalityDesc = 'You consistently save a significant portion of income while maintaining predictable spending habits. Financial discipline is your strength.';
    } else if (lifestyle >= 60 && savingsDiscipline >= 40) {
      personalityType = 'Balanced Spender';
      personalityEmoji = '⚖️';
      personalityDesc = 'You enjoy life while keeping savings on track. A healthy mix of necessities, lifestyle, and future planning.';
    } else if (lifestyle >= 60 && savingsDiscipline < 40) {
      personalityType = 'Lifestyle Focused';
      personalityEmoji = '✨';
      personalityDesc = 'Quality of life matters to you. Discretionary spending is a significant part of your budget — consider optimizing non-essential categories.';
    } else if (creditUsage >= 60) {
      personalityType = 'Credit Utilizer';
      personalityEmoji = '💳';
      personalityDesc = 'You rely on credit for a significant portion of expenses. Monitor your credit utilization and ensure payments stay on track.';
    } else if (necessities >= 70) {
      personalityType = 'Essentials Driven';
      personalityEmoji = '🏠';
      personalityDesc = 'The majority of your spending goes to essentials and recurring commitments. Look for opportunities to reduce fixed costs.';
    } else if (growth >= 70) {
      personalityType = 'Wealth Builder';
      personalityEmoji = '📈';
      personalityDesc = 'Your networth is on a strong upward trajectory. You\'re building long-term wealth effectively.';
    } else if (stability >= 70) {
      personalityType = 'Steady Planner';
      personalityEmoji = '📋';
      personalityDesc = 'Your spending is remarkably consistent month-to-month. You plan well and stick to your patterns.';
    } else {
      personalityType = 'Adaptive Spender';
      personalityEmoji = '🔄';
      personalityDesc = 'Your spending varies month to month, adapting to circumstances. Consider building more consistency for better long-term outcomes.';
    }

    // ── 5. Per-period DNA timeline ──────────────────────────────────────
    const dnaTimeline = periods.map((p) => {
      const inc = incomeMap.get(p.id);
      const spend = spendMap.get(p.id) || 0;
      const recur = recurringSpendMap.get(p.id) || 0;
      const disc = discretionarySpendMap.get(p.id) || 0;
      const totalOutcome = spend + (ccMap.get(p.id) || 0);
      const savingsRate = inc && inc > 0 ? ((inc - totalOutcome) / inc) * 100 : null;

      // Count unique categories
      const cats = new Set(
        spendRows
          .filter((r) => r.period_id === p.id)
          .map((r) => r.category)
      );

      // Budget adherence: what % of budgeted categories stayed under limit
      let budgetAdherent = 0;
      let budgetTotal = 0;
      for (const [cat, catMap] of catPeriodSpend.entries()) {
        const limit = limitMap.get(cat);
        if (limit) {
          budgetTotal++;
          const amt = catMap.get(p.id) || 0;
          if (amt <= limit) budgetAdherent++;
        }
      }
      const budgetAdherence =
        budgetTotal > 0 ? Math.round((budgetAdherent / budgetTotal) * 100) : null;

      // Discretionary ratio
      const discRatio =
        spend > 0 ? Math.round((disc / spend) * 100) : null;

      return {
        period_id: p.id,
        month: p.month,
        total_spending: Math.round(spend),
        income: inc ? Math.round(inc) : null,
        savings_rate: savingsRate !== null ? Math.round(savingsRate * 10) / 10 : null,
        category_count: cats.size,
        transaction_count: txCountMap.get(p.id) || 0,
        recurring_pct: spend > 0 ? Math.round((recur / spend) * 100) : null,
        discretionary_ratio: discRatio,
        budget_adherence: budgetAdherence,
        networth: nwMap.get(p.id) || null,
      };
    });

    // ── 6. Category loyalty scores (coefficient of variation) ─────────────
    const loyaltyScores: {
      category: string;
      total_amount: number;
      period_count: number;
      avg_amount: number;
      std_dev: number;
      cv: number; // coefficient of variation (lower = more loyal/consistent)
      loyalty_score: number; // 0-100, higher = more consistent
      trend: 'rising' | 'falling' | 'stable';
      top_period: string | null;
    }[] = [];

    for (const [category, catMap] of catPeriodSpend.entries()) {
      const values: number[] = recentIds.map((pid) => catMap.get(pid) || 0);
      const nonZero = values.filter((v) => v > 0);
      if (nonZero.length < 2) continue;

      const avg = nonZero.reduce((s, v) => s + v, 0) / nonZero.length;
      const variance =
        nonZero.reduce((s, v) => s + (v - avg) ** 2, 0) / nonZero.length;
      const stdDev = Math.sqrt(variance);
      const cv = avg > 0 ? stdDev / avg : 0;
      const loyaltyScore = Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));

      // Trend
      let trend: 'rising' | 'falling' | 'stable' = 'stable';
      if (values.length >= 3 && avg > 0) {
        const half = Math.floor(values.length / 2);
        const firstSlice = values.slice(0, half);
        const secondSlice = values.slice(values.length - half);
        const firstAvg =
          firstSlice.reduce((s, v) => s + v, 0) / Math.max(1, firstSlice.length);
        const secondAvg =
          secondSlice.reduce((s, v) => s + v, 0) / Math.max(1, secondSlice.length);
        if (firstAvg > 0) {
          const pctChange = ((secondAvg - firstAvg) / firstAvg) * 100;
          if (pctChange > 15) trend = 'rising';
          else if (pctChange < -15) trend = 'falling';
        }
      }

      // Top period
      let topAmount = 0;
      let topPeriodId: number | null = null;
      for (const [pid, amt] of catMap.entries()) {
        if (amt > topAmount) {
          topAmount = amt;
          topPeriodId = pid;
        }
      }
      const topPeriod = topPeriodId
        ? periods.find((p) => p.id === topPeriodId)?.month || null
        : null;

      loyaltyScores.push({
        category,
        total_amount: Math.round(catPeriodSpend.get(category)!.values().reduce((s, v) => s + v, 0)),
        period_count: nonZero.length,
        avg_amount: Math.round(avg),
        std_dev: Math.round(stdDev),
        cv: Math.round(cv * 1000) / 10,
        loyalty_score: loyaltyScore,
        trend,
        top_period: topPeriod,
      });
    }

    loyaltyScores.sort((a, b) => b.total_amount - a.total_amount);

    // ── 7. Key insights ──────────────────────────────────────────────────
    const insights: string[] = [];

    // Top categories consistency
    const top5 = loyaltyScores.slice(0, 5);
    if (top5.length >= 3) {
      const stableCats = top5.filter((c) => c.loyalty_score >= 70);
      if (stableCats.length >= 3) {
        insights.push(
          `Your top ${stableCats.length} spending categories are highly consistent (loyalty score ≥70). Your spending personality is predictable and well-established.`
        );
      }
    }

    // Volatile category
    const volatile = loyaltyScores.find((c) => c.cv > 0.5 && c.total_amount > 0);
    if (volatile) {
      insights.push(
        `"${volatile.category}" is your most volatile spending category (CV: ${volatile.cv}%). Consider setting a stricter budget or investigating what drives the swings.`
      );
    }

    // Savings rate trend
    if (savingsRates.length >= 3) {
      const firstHalf = savingsRates.slice(0, Math.floor(savingsRates.length / 2));
      const secondHalf = savingsRates.slice(-Math.floor(savingsRates.length / 2));
      const firstAvg = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
      if (firstAvg > 0) {
        const change = ((secondAvg - firstAvg) / Math.abs(firstAvg)) * 100;
        if (change > 20) {
          insights.push(
            `Your savings rate improved by ~${Math.round(change)}% comparing recent vs earlier periods. Strong positive trend!`
          );
        } else if (change < -20) {
          insights.push(
            `Your savings rate declined by ~${Math.abs(Math.round(change))}% in recent periods. Consider reviewing discretionary spending.`
          );
        }
      }
    }

    // Category ranking stability
    if (loyaltyScores.length >= 3) {
      const topCat = loyaltyScores[0].category;
      const secondCat = loyaltyScores.length > 1 ? loyaltyScores[1].category : null;
      if (topCat) {
        insights.push(
          `"${topCat}" is your #1 spending category across all periods (${loyaltyScores[0].period_count} active months).`
        );
      }
    }

    // Discretionary spike
    const discValues = recentIds
      .map((pid) => ({
        month: periods.find((p) => p.id === pid)?.month,
        ratio: discretionarySpendMap.get(pid) || 0,
        total: spendMap.get(pid) || 0,
      }))
      .filter((v) => v.total > 0);
    if (discValues.length >= 3) {
      const avgDisc =
        discValues.reduce((s, v) => s + v.ratio, 0) / discValues.length;
      const spike = discValues.find(
        (v) => v.ratio > avgDisc * 1.4 && v.ratio > 0
      );
      if (spike && spike.month) {
        const pctSpike = Math.round(
          ((spike.ratio - avgDisc) / Math.max(1, avgDisc)) * 100
        );
        insights.push(
          `Discretionary spending spiked ${pctSpike}% above average in ${spike.month}.`
        );
      }
    }

    // Credit reliance
    if (avgCreditPct > 40) {
      insights.push(
        `Credit payments represent ${Math.round(avgCreditPct)}% of your total outflow. Monitor for growing revolving balances.`
      );
    }

    // Networth trend
    if (networthGrowthScore >= 70) {
      insights.push(
        `Networth has grown in ${Math.round((networthGrowthScore / 100) * recentIds.length)} of ${recentIds.length} period transitions.`
      );
    } else if (networthGrowthScore <= 30 && nwValues.some((v) => v !== undefined)) {
      insights.push(
        `Networth growth has been flat or declining. Review investment contributions and spending leaks.`
      );
    }

    // Category count trend
    const recentCatCounts = dnaTimeline
      .slice(-3)
      .map((t) => t.category_count);
    const earlyCatCounts = dnaTimeline
      .slice(0, 3)
      .map((t) => t.category_count);
    if (recentCatCounts.length > 0 && earlyCatCounts.length > 0) {
      const recentAvg =
        recentCatCounts.reduce((s, v) => s + v, 0) / recentCatCounts.length;
      const earlyAvg =
        earlyCatCounts.reduce((s, v) => s + v, 0) / earlyCatCounts.length;
      if (recentAvg > earlyAvg * 1.3) {
        insights.push(
          `You're spending across ${Math.round(recentAvg)} categories now vs ~${Math.round(earlyAvg)} early on — spending is diversifying.`
        );
      }
    }

    // Ensure we have at least 2 insights
    if (insights.length === 0) {
      insights.push(
        `Across ${periods.length} periods, you've logged ${spendRows.length} spending entries across ${catPeriodSpend.size} categories.`
      );
      if (avgSavingsRate > 0) {
        insights.push(
          `Average savings rate: ${Math.round(avgSavingsRate)}%.`
        );
      } else {
        insights.push(
          'No income records found for savings rate calculation.'
        );
      }
    }

    // ── 8. Summary stats ─────────────────────────────────────────────────
    const totalPeriods = periods.length;
    const totalSpendAll = [...spendMap.values()].reduce((s, v) => s + v, 0);
    const avgMonthlySpend =
      periodIds.length > 0
        ? totalSpendAll / periodIds.length
        : 0;
    const mostUsedCategory =
      loyaltyScores.length > 0 ? loyaltyScores[0].category : 'N/A';
    const mostStableCategory = loyaltyScores.length > 0
      ? [...loyaltyScores].sort((a, b) => b.loyalty_score - a.loyalty_score)[0]?.category
      : 'N/A';

    return new Response(
      JSON.stringify({
        personality: {
          type: personalityType,
          emoji: personalityEmoji,
          description: personalityDesc,
        },
        dimensions,
        timeline: dnaTimeline,
        loyaltyScores,
        insights,
        summary: {
          total_periods: totalPeriods,
          total_spending: Math.round(totalSpendAll),
          avg_monthly_spend: Math.round(avgMonthlySpend),
          avg_savings_rate: Math.round(avgSavingsRate * 10) / 10,
          most_used_category: mostUsedCategory,
          most_stable_category: mostStableCategory,
          category_count: catPeriodSpend.size,
        },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
