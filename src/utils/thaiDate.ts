const THAI_MONTH_ABBR = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

/**
 * Formats a Gregorian ISO date string (YYYY-MM-DD) into a Thai Buddhist Era date format.
 * Example: '2026-07-20' -> '20 ก.ค. 2569'
 */
export function formatThaiDate(isoDateString: string): string {
  if (!isoDateString || typeof isoDateString !== 'string') return '-';
  const clean = isoDateString.trim().split('T')[0];
  if (!clean) return '-';

  const parts = clean.split('-');
  if (parts.length !== 3) return isoDateString;

  const year = parseInt(parts[0]!, 10);
  const monthIdx = parseInt(parts[1]!, 10) - 1;
  const day = parseInt(parts[2]!, 10);

  if (isNaN(year) || isNaN(monthIdx) || isNaN(day)) return isoDateString;

  const thaiYear = year + 543;
  const thaiMonth = THAI_MONTH_ABBR[monthIdx] || `${monthIdx + 1}`;

  return `${day} ${thaiMonth} ${thaiYear}`;
}
