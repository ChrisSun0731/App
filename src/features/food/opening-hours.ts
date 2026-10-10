// Opening-hours logic for the 美食 map, ported from the Quasar app's
// useRestaurantHours.js.
//
// Hours come from the Data repo's restaurantData.json, one string per weekday:
// "06:00-14:00,16:30-19:30", or "休息" for closed all day. A range may close
// after midnight, written either "17:00-25:00" or "17:00-01:00", or end at
// "24:00" and carry on in the next day's "00:00-..." range. The Quasar app only
// compared against today's ranges, so after midnight such a shop showed as
// closed; yesterday's and tomorrow's ranges are now taken into account too.
import { minutesOfDay, parseClockTime } from '@/lib/dates';

export const DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;
export type DayKey = (typeof DAY_KEYS)[number];

/** Display order: Monday first, as in the original detail panel. */
export const DISPLAY_DAY_ORDER: readonly DayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export const DAY_LABELS: Record<DayKey, string> = {
  monday: '星期一',
  tuesday: '星期二',
  wednesday: '星期三',
  thursday: '星期四',
  friday: '星期五',
  saturday: '星期六',
  sunday: '星期日',
};

export const CLOSED_ALL_DAY = '休息';

export type OpeningHours = Partial<Record<DayKey, string>>;

export interface Restaurant {
  name: string;
  /** [latitude, longitude] */
  position: [number, number];
  openingHours: OpeningHours;
  address?: string;
  website?: string;
}

export function isRestaurantList(data: unknown): data is Restaurant[] {
  return (
    Array.isArray(data) &&
    data.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.name === 'string' &&
        item.name.trim().length > 0 &&
        Array.isArray(item.position) &&
        item.position.length === 2 &&
        item.position.every((coordinate: unknown) =>
          typeof coordinate === 'number' && Number.isFinite(coordinate),
        ) &&
        Math.abs(item.position[0]) <= 90 &&
        Math.abs(item.position[1]) <= 180 &&
        typeof item.openingHours === 'object' &&
        item.openingHours !== null &&
        !Array.isArray(item.openingHours) &&
        Object.values(item.openingHours).every((hours) => typeof hours === 'string'),
    )
  );
}

/** open = open; closingSoon/openingSoon = within 30 minutes of a change. */
export type OpenStatus = 'open' | 'closingSoon' | 'openingSoon' | 'closed';

export const SOON_MINUTES = 30;

interface Range {
  open: number;
  close: number;
}

const DAY = 24 * 60;

/**
 * Parses "06:00-14:00,16:30-19:30" into minute ranges; "休息" and junk give [].
 * "00:00-24:00" is the whole day.
 */
export function parseRanges(hours: string | undefined): Range[] {
  if (!hours || hours.trim() === CLOSED_ALL_DAY) return [];
  return hours.split(',').flatMap((part) => {
    const [openText, closeText] = part.split(/[-–]/);
    if (openText === undefined || closeText === undefined) return [];
    const open = parseClockTime(openText);
    let close = parseClockTime(closeText);
    if (open === null || close === null || close === open) return [];
    // "22:00-02:00" means the same as "22:00-26:00".
    if (close < open) close += DAY;
    // A range opening after midnight belongs on the next day's line, and none
    // lasts over a day; rejecting both keeps getOpenStatus's three-day window
    // enough to see every range that can touch today.
    return open < DAY && close - open <= DAY ? [{ open, close }] : [];
  });
}

export function dayKeyOf(date: Date): DayKey {
  return DAY_KEYS[date.getDay()];
}

/**
 * Opening periods from yesterday to tomorrow as minutes on today's clock
 * (negative = yesterday, 1440+ = tomorrow). Ranges that overlap or touch are
 * merged, so "11:00-24:00" followed by tomorrow's "00:00-03:00", or
 * "00:00-24:00" every day, is one period rather than one closing at midnight.
 */
function periodsAround(hours: OpeningHours, date: Date): Range[] {
  const ranges = [-1, 0, 1]
    .flatMap((offset) =>
      parseRanges(hours[DAY_KEYS[(date.getDay() + offset + 7) % 7]]).map(({ open, close }) => ({
        open: open + offset * DAY,
        close: close + offset * DAY,
      })),
    )
    .sort((a, b) => a.open - b.open);
  const periods: Range[] = [];
  for (const range of ranges) {
    const last = periods[periods.length - 1];
    if (last && range.open <= last.close) last.close = Math.max(last.close, range.close);
    else periods.push(range);
  }
  return periods;
}

export function getOpenStatus(hours: OpeningHours, date: Date = new Date()): OpenStatus {
  const now = minutesOfDay(date);
  const periods = periodsAround(hours, date);
  const current = periods.find(({ open, close }) => now >= open && now < close);
  if (current) return current.close - now <= SOON_MINUTES ? 'closingSoon' : 'open';
  return periods.some(({ open }) => open > now && open - now <= SOON_MINUTES) ? 'openingSoon' : 'closed';
}

/**
 * When the status next changes: the closing time while open, else the next
 * opening (today or tomorrow); minutes on `date`'s clock (1440+ = tomorrow),
 * or null when nothing opens before tomorrow ends.
 */
export function nextChange(hours: OpeningHours, date: Date = new Date()): number | null {
  const now = minutesOfDay(date);
  const periods = periodsAround(hours, date);
  const current = periods.find(({ open, close }) => now >= open && now < close);
  if (current) return current.close;
  return periods.find(({ open }) => open > now)?.open ?? null;
}

export function isOpenNow(hours: OpeningHours, date: Date = new Date()): boolean {
  const status = getOpenStatus(hours, date);
  return status === 'open' || status === 'closingSoon';
}

/** Today's hours split into display lines, e.g. ["06:00-14:00", "16:30-19:30"]. */
export function hoursLines(hours: string | undefined): string[] {
  if (!hours) return [CLOSED_ALL_DAY];
  return hours
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export const STATUS_LABELS: Record<OpenStatus, string> = {
  open: '正在營業',
  closingSoon: '即將打烊',
  openingSoon: '即將開業',
  closed: '已打烊',
};
