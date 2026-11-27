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

  // Real bodies captured from the live mailbox (html entities + <br /> separators).
  const REAL_NUMERIC = `Hai AKRAM RAHARDI R,<br /><br />Terima kasih telah bertransaksi menggunakan Kartu Kredit Jenius. Kamu baru saja melakukan transaksi pada<br />No. Kartu: 437896******9514<br />Merchant: TOKO SINAR INDAH 2, JGKRS                <br />Tanggal & waktu transaksi: 24&#x2F;11&#x2F;2026 21:16:41<br />Total Transaksi: RP 80.000,00<br />Segera hubungi 1500 365 jika kamu merasa tidak melakukannya.`;
  const REAL_NAMED = `Hai AKRAM RAHARDI R,<br /><br />Terima kasih telah bertransaksi menggunakan Kartu Kredit Jenius.<br />No. Kartu: 437896******9514<br />Merchant: SHOPEE                   622139500300 ID <br />Tanggal & waktu transaksi: 25 NOV 2026 07:12:13 WIB<br />Total Transaksi: Rp 42.100,00<br />Segera hubungi 1500 365.`;

  it('parses the real DD/MM/YYYY body with escaped slashes', () => {
    const p = parseJeniusEmail({ subject: 'Notifikasi Transaksi QRIS Kartu Kredit Jenius', body: REAL_NUMERIC })!;
    expect(p.tx_date).toBe('2026-11-24');
    expect(p.tx_time).toBe('21:16:41');
    expect(p.amount).toBe(80000);
    expect(p.merchant).toBe('TOKO SINAR INDAH 2, JGKRS');
    expect(p.card_last4).toBe('9514');
    expect(p.kind).toBe('qris');
  });

  it('parses the real "DD MON YYYY … WIB" body and trims merchant noise', () => {
    const p = parseJeniusEmail({ subject: 'Notifikasi Transaksi Kartu Kredit Jenius', body: REAL_NAMED })!;
    expect(p.tx_date).toBe('2026-11-25');
    expect(p.tx_time).toBe('07:12:13');
    expect(p.amount).toBe(42100);
    expect(p.merchant).toBe('SHOPEE');
    expect(p.card_last4).toBe('9514');
    expect(p.kind).toBe('cc');
  });
});