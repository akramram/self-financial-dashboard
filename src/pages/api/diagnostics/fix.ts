import type { APIRoute } from 'astro';
import { db, ensureCategory } from '../../../lib/db';

const ID_TO_EN_MONTHS: Record<string, string> = {
  Januari: 'January',
  Februari: 'February',
  Maret: 'March',
  April: 'April',
  Mei: 'May',
  Juni: 'June',
  Juli: 'July',
  Agustus: 'August',
  September: 'September',
  Oktober: 'October',
  November: 'November',
  Desember: 'December',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export const POST: APIRoute = async ({ request }) => {
  const body = (await request.json().catch(() => null)) as { checkId?: string } | null;
  const checkId = body?.checkId;
  let fixed = 0;

  try {
    switch (checkId) {
      case 'created_time_missing':
        fixed = db
          .prepare(
            "UPDATE transactions SET created_time = date || 'T12:00:00.000Z' WHERE date IS NOT NULL AND (created_time IS NULL OR created_time = '')"
          )
          .run().changes;
        break;
      case 'created_time_future':
        fixed = db
          .prepare(
            "UPDATE transactions SET created_time = date || 'T12:00:00.000Z' WHERE date IS NOT NULL AND created_time > ?"
          )
          .run(new Date().toISOString()).changes;
        break;
      case 'unmapped_categories': {
        const used = db
          .prepare(
            "SELECT DISTINCT category FROM transactions WHERE category IS NOT NULL AND trim(category) != ''"
          )
          .all() as { category: string }[];
        const known = new Set(
          (db.prepare('SELECT name FROM categories').all() as { name: string }[]).map((c) =>
            c.name.trim().toLowerCase()
          )
        );
        for (const { category } of used) {
          if (!known.has(category.trim().toLowerCase())) {
            ensureCategory(category);
            fixed++;
          }
        }
        break;
      }
      case 'credit_payment_misclassified':
        // Same heuristic as the detector: type cash + "credit" in title/category.
        fixed = db
          .prepare(
            "UPDATE transactions SET type = 'credit_payment' WHERE type = 'cash' AND (lower(coalesce(title,'')) LIKE '%credit%' OR lower(coalesce(category,'')) LIKE '%credit%')"
          )
          .run().changes;
        break;
      case 'date_marker_anomalies':
        fixed = db
          .prepare(
            "UPDATE transactions SET date = (SELECT start_date FROM periods p WHERE p.id = transactions.period_id) WHERE date IS NOT NULL AND period_id IN (SELECT id FROM periods) AND date NOT LIKE '%-21' AND date NOT LIKE '%-01'"
          )
          .run().changes;
        break;
      case 'month_labels': {
        const rows = db.prepare('SELECT id, month FROM periods').all() as {
          id: number;
          month: string;
        }[];
        for (const r of rows) {
          const m = (r.month ?? '').trim().match(/^(\S+) (\d{4})$/);
          const en = m ? ID_TO_EN_MONTHS[m[1]] : undefined;
          if (en) {
            db.prepare('UPDATE periods SET month = ? WHERE id = ?').run(`${en} ${m![2]}`, r.id);
            fixed++;
          }
        }
        break;
      }
      default:
        return json({ error: 'Pemeriksaan ini tidak bisa diperbaiki otomatis.' }, 400);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Perbaikan gagal.' }, 500);
  }

  return json({ ok: true, checkId, fixed });
};
