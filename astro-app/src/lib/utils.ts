export function formatIdr(n: number | undefined | null): string {
  if (n == null) return 'IDR 0';
  return 'IDR ' + Math.round(n).toLocaleString('id-ID');
}

export function formatNumber(n: number | undefined | null): string {
  if (n == null) return '0';
  return Math.round(n).toLocaleString('id-ID');
}

export function getMonthSortKey(monthName: string): number {
  const monthMap: Record<string, number> = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, oktober: 10,
    november: 11, december: 12, month: 1,
  };
  const parts = monthName.toLowerCase().split(' ');
  let year = 0;
  let monthNum = 0;
  for (const part of parts) {
    if (monthMap[part]) monthNum = monthMap[part];
    else if (/^\d+$/.test(part)) year = parseInt(part, 10);
  }
  return year * 100 + monthNum;
}
