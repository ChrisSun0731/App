// Calendar-date helpers that work in the device's local time zone.
//
// Dates the user picks (events, todos, menu days) are stored as local
// "YYYY-MM-DD" keys. The Quasar app stored them as UTC ISO timestamps, which
// shifted them by a day whenever local and UTC dates disagreed (before 08:00
// in Taipei) -- the root cause of the menu "Monday off-by-one" bug.

export const pad2 = (n: number) => String(n).padStart(2, '0');

/** Local calendar date of `date` as "YYYY-MM-DD". */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = DATE_KEY.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  const date = new Date(`${year}-${month}-${day}T12:00:00`);
  return Number.isFinite(date.getTime()) && date.getFullYear() === Number(year)
    && date.getMonth() + 1 === Number(month) && date.getDate() === Number(day);
}

/** Local midnight of a "YYYY-MM-DD" key. */
export function fromDateKey(key: string): Date {
  const match = DATE_KEY.exec(key);
  if (!match || !isDateKey(key)) {
    throw new RangeError(`Not a date key: ${key}`);
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Minutes since local midnight. */
export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** "08:10" for minutes since midnight. Hours past 23 are not wrapped: 1590 is "26:30". */
export function clock(minutes: number): string {
  return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
}

/** Parses "HH:MM" into minutes since midnight. Hours may exceed 23. */
export function parseClockTime(value: string): number | null {
  const match = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(value);
  if (!match || Number(match[2]) > 59) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Monday 00:00 (local) of the week containing `date`. */
export function startOfWeekMonday(date: Date): Date {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

/** Chinese weekday names indexed by `Date#getDay()`. */
export const WEEKDAY_ZH = ['日', '一', '二', '三', '四', '五', '六'] as const;

/** e.g. "10/4 (六)". */
export function formatMonthDay(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()} (${WEEKDAY_ZH[date.getDay()]})`;
}

/** e.g. "10月9日". */
export function formatMonthDayZh(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

/** e.g. "10月13日–14日", "10月30日–11月2日", "2026年12月28日–2027年1月1日". */
export function formatMonthDayRange(start: Date, end: Date): string {
  if (start.getFullYear() !== end.getFullYear()) {
    return `${start.getFullYear()}年${formatMonthDayZh(start)}–${end.getFullYear()}年${formatMonthDayZh(end)}`;
  }
  const tail = start.getMonth() === end.getMonth() ? `${end.getDate()}日` : formatMonthDayZh(end);
  return `${formatMonthDayZh(start)}–${tail}`;
}

/** e.g. "2026/10/4". */
export function formatFullDate(date: Date): string {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}
