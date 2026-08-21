// One-off repair: move mis-kickoff'd October 2026 data into September 2026.
// See GitHub issue for context: manual tx before kickoff made GET /api/kickoff
// pick "latest period with data + 1" = October, skipping September.
const Database = require('better-sqlite3');
const db = new Database('data/financial.db');

const SEPT = 38, OCT = 39;
const monthLabel = (p) => db.prepare('SELECT month FROM periods WHERE id=?').get(p).month;

// 1. Move manual tx (905) stays in Sept — verify
const septTx = db.prepare('SELECT id,title,created_time FROM transactions WHERE period_id=?').all(SEPT);
console.log('Sept (keep):', septTx);

// 2. Move Oct recurring txns (906-914) to Sept, remapping created_time per Sept period calendar
const octTx = db.prepare('SELECT id,title,created_time FROM transactions WHERE period_id=?').all(OCT);
console.log('Oct (move):', octTx);
const remap = db.transaction(() => {
  // Sept period = Aug 21 → Sep 20. Recurring day >= 21 → Aug; day < 21 → Sept.
  const upd = db.prepare('UPDATE transactions SET period_id=?, created_time=? WHERE id=?');
  for (const t of octTx) {
    if (t.title.startsWith('CC Payment')) { db.prepare('DELETE FROM transactions WHERE id=?').run(t.id); continue; }
    const d = new Date(t.created_time);
    const day = d.getUTCDate();
    // compute correct date in Sept period: day>=21 → month-1 (Aug), else Sept
    const target = new Date(Date.UTC(2026, 8, 1)); // Sept 1 2026
    if (day >= 21) target.setUTCMonth(7); // Aug
    target.setUTCDate(day);
    upd.run(SEPT, target.toISOString(), t.id);
  }
  // 3. Move income 23jt from Oct → Sept
  db.prepare('UPDATE monthly_income SET period_id=? WHERE period_id=?').run(SEPT, OCT);
  // FK: monthly_income PK = period_id; ensure Sept had no row (it didn't — only 37,36,39)
  // 4. Regenerate CC Payment from August credit total (correct for Sept period)
  const augCredit = db.prepare(`SELECT SUM(CASE WHEN type='credit_expense' THEN amount ELSE 0 END) AS t FROM transactions WHERE period_id=37`).get().t || 0;
  console.log('Aug credit total (correct CC Payment):', augCredit);
  db.prepare(`INSERT INTO transactions (period_id, date, title, category, amount, currency, type, payment_method, done, created_time)
    VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(SEPT, '2026-08-21', 'CC Payment — August 2026', 'Credit Card', augCredit, 'IDR', 'credit_payment', 'Credit Card', 0, new Date().toISOString());
  // 5. Add missing recurring "Internet" (id 17, end_date 2026-09 — active for Sept period)
  const net = db.prepare('SELECT * FROM recurring_transactions WHERE id=17').get();
  const exists = db.prepare('SELECT 1 FROM transactions WHERE period_id=? AND title=?').get(SEPT, net.title);
  if (!exists) {
    // day 17 → Sept 17 (day < 21)
    db.prepare(`INSERT INTO transactions (period_id, date, title, category, amount, currency, type, payment_method, done, created_time)
      VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(SEPT, '2026-08-21', net.title, net.category, net.amount, 'IDR', net.type, net.payment_method || 'Cash', net.done ? 1 : 0, new Date(Date.UTC(2026, 8, 17)).toISOString());
  }
  // 6. Delete now-empty October period
  const octLeft = db.prepare('SELECT COUNT(*) c FROM transactions WHERE period_id=?').get(OCT).c;
  const octInc = db.prepare('SELECT COUNT(*) c FROM monthly_income WHERE period_id=?').get(OCT).c;
  console.log('Oct leftovers before delete:', octLeft, octInc);
  if (octLeft === 0 && octInc === 0) {
    db.prepare('DELETE FROM periods WHERE id=?').run(OCT);
    console.log('Period 39 (October 2026) deleted');
  } else {
    console.log('SKIP delete — Oct not empty');
  }
});
remap();
console.log('--- AFTER ---');
console.log(db.prepare(`SELECT t.id, p.month, t.title, t.type, t.created_time, t.done FROM transactions t JOIN periods p ON p.id=t.period_id WHERE p.id IN (38,39) ORDER BY t.created_time`).all());
console.log(db.prepare('SELECT mi.period_id, p.month, mi.income FROM monthly_income mi JOIN periods p ON p.id=mi.period_id ORDER BY mi.period_id DESC LIMIT 3').all());
db.close();
