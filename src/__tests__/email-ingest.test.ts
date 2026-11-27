import { describe, it, expect } from 'vitest';
import { parseJeniusEmail, parseIdrAmount } from '../lib/emailIngest';

const CC_BODY = `
Yth. Nasabah,
Berikut notifikasi transaksi Kartu Kredit Jenius Anda.
Tanggal & waktu transaksi: 26/11/2026 20:31:12
Total Transaksi: RP 56.000,00
Kartu Kredit Jenius **** 1234
`;

describe('parseIdrAmount', () => {
  it('parses Indonesian formatting', () => {
    expect(parseIdrAmount('56.000,00')).toBe(56000);
    expect(parseIdrAmount('1.234.567,89')).toBe(1234568);
    expect(parseIdrAmount('56,000.00')).toBe(56000);
    expect(parseIdrAmount('125000')).toBe(125000);
  });
});

describe('parseJeniusEmail', () => {
  it('parses the confirmed Jenius card notification', () => {
    const p = parseJeniusEmail({ subject: 'Notifikasi Transaksi Kartu Kredit Jenius', body: CC_BODY })!;
    expect(p).not.toBeNull();
    expect(p.kind).toBe('cc');
    expect(p.tx_date).toBe('2026-11-26');
    expect(p.tx_time).toBe('20:31:12');
    expect(p.amount).toBe(56000);
    expect(p.card_last4).toBe('1234');
  });

  it('marks QRIS subject as kind qris', () => {
    const p = parseJeniusEmail({ subject: 'Notifikasi Transaksi QRIS Kartu Kredit Jenius', body: CC_BODY })!;
    expect(p.kind).toBe('qris');
  });

  it('reads merchant when present', () => {
    const p = parseJeniusEmail({
      subject: 'Notifikasi Transaksi QRIS Kartu Kredit Jenius',
      body: 'Nama Merchant: KOPI KENANGAN\nTanggal & waktu transaksi: 01/12/2026 09:05:00\nTotal Transaksi: Rp 25.000,00',
    })!;
    expect(p.merchant).toBe('KOPI KENANGAN');
    expect(p.amount).toBe(25000);
  });

  it('strips html and still parses', () => {
    const p = parseJeniusEmail({
      subject: 'Notifikasi Transaksi Kartu Kredit Jenius',
      body: '<p>Tanggal &amp; waktu transaksi: 26/11/2026 20:31:12</p><p>Total Transaksi: RP 56.000,00</p>',
    })!;
    expect(p.amount).toBe(56000);
  });

  it('rejects unrelated subjects and unpriced bodies', () => {
    expect(parseJeniusEmail({ subject: 'Promo Kartu Kredit', body: CC_BODY })).toBeNull();
    expect(parseJeniusEmail({ subject: 'Notifikasi Transaksi Kartu Kredit Jenius', body: 'no fields' })).toBeNull();
  });
});