import type { APIRoute } from 'astro';
import { parseJsonBody, jsonError } from '../../../../lib/http';
import { convertTransactionToInstallment } from '../../../../lib/installment';

export const POST: APIRoute = async ({ params, request }) => {
  const transactionId = Number(params.id);
  if (!transactionId || isNaN(transactionId)) {
    return jsonError('Invalid transaction ID', 400);
  }

  const body = await parseJsonBody(request);
  if (!body) {
    return jsonError('Invalid JSON body', 400);
  }

  const months = Number(body.months);
  if (!months || isNaN(months) || months < 2) {
    return jsonError('Durasi cicilan minimal 2 bulan', 400);
  }

  const startDate = typeof body.start_date === 'string' ? body.start_date.trim() : '';
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return jsonError('Tanggal mulai tidak valid (format YYYY-MM-DD)', 400);
  }

  try {
    const result = convertTransactionToInstallment({
      transactionId,
      months,
      interestPercent: body.interest_percent !== undefined ? Number(body.interest_percent) : undefined,
      interestFlatMonthly: body.interest_flat_monthly !== undefined ? Number(body.interest_flat_monthly) : undefined,
      adminFee: body.admin_fee !== undefined ? Number(body.admin_fee) : 0,
      startDate,
    });

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return jsonError(err.message || 'Failed to convert transaction to installment', 400);
  }
};
