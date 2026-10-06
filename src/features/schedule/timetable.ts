// Class timetables for 建中, built from the three per-grade files in the Data
// repo (schedules/gaoyi|gaoer|gaosan_schedules.json).
//
// Ported from the Quasar app's src/data/schedules/index.js. The functions are
// pure -- they take the loaded data as input -- so they can be unit tested
// and used from any screen without module-level mutable state.

import { isDateKey } from '@/lib/dates';

export const PERIOD_NAMES = ['一', '二', '三', '四', '五', '六', '七', '八'] as const;
export type PeriodName = (typeof PERIOD_NAMES)[number];

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  Monday: '星期一',
  Tuesday: '星期二',
  Wednesday: '星期三',
  Thursday: '星期四',
  Friday: '星期五',
};

export const WEEKDAY_SHORT_LABELS: Record<Weekday, string> = {
  Monday: '一',
  Tuesday: '二',
  Wednesday: '三',
  Thursday: '四',
  Friday: '五',
};

const RAW_DAY_KEYS: Record<Weekday, string> = {
  Monday: 'monday',
  Tuesday: 'tuesday',
  Wednesday: 'wednesday',
  Thursday: 'thursday',
  Friday: 'friday',
};

/** 單週 (odd) or 雙週 (even) week of the semester. */
export type WeekParity = 'odd' | 'even';

export type CellColor =
  | 'Default'
  | 'Red'
  | 'Orange'
  | 'Yellow'
  | 'Green'
  | 'Blue'
  | 'Purple'
  | 'Pink';

export interface ScheduleCell {
  subject: string;
  /** A slot that alternates week to week, e.g. 物理 on 單週 / 化學 on 雙週. */
  alternating?: { odd: string; even: string };
  note?: string;
  color?: CellColor;
}

export type ScheduleRow = { name: PeriodName } & Record<Weekday, ScheduleCell>;

export interface Period {
  name: PeriodName;
  /** "08:10" */
  start: string;
  /** "09:00" */
  end: string;
}

type RawCell = string | { odd: string; even: string };

/** Shape of one per-grade file in the Data repo. */
export interface GradeFile {
  academic_year?: string;
  semester_start?: string;
  periods: { period: number; time: string }[];
  classes: { id: string | number; class_name?: string; schedule: Partial<Record<string, RawCell[]>> }[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRawCell(value: unknown): value is RawCell {
  return typeof value === 'string' || (isRecord(value) && typeof value.odd === 'string' && typeof value.even === 'string');
}

function isPeriodTime(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*$/.exec(value);
  if (!match) return false;
  const [, startHour, startMinute, endHour, endMinute] = match.map(Number);
  return startHour <= 23 && endHour <= 23 && startMinute <= 59 && endMinute <= 59 &&
    startHour * 60 + startMinute < endHour * 60 + endMinute;
}

export function isGradeFile(data: unknown): data is GradeFile {
  if (!isRecord(data) || !Array.isArray(data.classes) || !data.classes.length || !Array.isArray(data.periods) || !data.periods.length) return false;
  if (data.academic_year !== undefined && typeof data.academic_year !== 'string') return false;
  if (data.semester_start !== undefined && !isDateKey(data.semester_start)) return false;
  const periodIds = new Set<number>();
  if (!data.periods.every((period) => {
    if (!isRecord(period) || !Number.isInteger(period.period) || Number(period.period) < 1 || Number(period.period) > PERIOD_NAMES.length || !isPeriodTime(period.time) || periodIds.has(Number(period.period))) return false;
    periodIds.add(Number(period.period));
    return true;
  })) return false;
  return data.classes.every((entry) => {
    if (!isRecord(entry) || (typeof entry.id !== 'string' && typeof entry.id !== 'number') || !/^[1-9]\d*$/.test(String(entry.id)) || !isRecord(entry.schedule)) return false;
    const schedule = entry.schedule;
    return Object.values(RAW_DAY_KEYS).every((day) => schedule[day] === undefined ||
      (Array.isArray(schedule[day]) && schedule[day].every(isRawCell)));
  });
}

export interface Timetables {
  /** The bundled timetable of every class, keyed by class id ("101"). */
  byClass: Record<string, ScheduleRow[]>;
  /** Class ids in numeric order. */
  classIds: string[];
  /** Bell schedule; identical across the three grade files. */
  periods: Period[];
  /** First day of the semester (week 1 is a 單週), or null if unknown. */
  semesterStart: string | null;
  /** e.g. "115學年度第1學期" */
  academicYear: string;
}

export function buildScheduleRows(rawSchedule: GradeFile['classes'][number]['schedule']): ScheduleRow[] {
  return PERIOD_NAMES.map((name, periodIndex) => {
    const row = { name } as ScheduleRow;
    for (const day of WEEKDAYS) {
      const raw = rawSchedule[RAW_DAY_KEYS[day]]?.[periodIndex] ?? '';
      row[day] =
        raw && typeof raw === 'object'
          ? { subject: raw.odd, alternating: { odd: raw.odd, even: raw.even } }
          : { subject: raw };
    }
    return row;
  });
}

function parsePeriodTime(time: string): { start: string; end: string } {
  const [start = '', end = ''] = time.split('-').map((part) => part.trim());
  return { start, end };
}

/** Combines the loaded grade files. Returns null when none loaded. */
export function buildTimetables(grades: GradeFile[]): Timetables | null {
  if (grades.length === 0) return null;

  const byClass: Record<string, ScheduleRow[]> = {};
  for (const grade of grades) {
    for (const entry of grade.classes) {
      byClass[String(entry.id)] = buildScheduleRows(entry.schedule);
    }
  }

  const [first] = grades;
  return {
    byClass,
    classIds: Object.keys(byClass).sort((a, b) => Number(a) - Number(b)),
    periods: [...first.periods].sort((a, b) => a.period - b.period).map((p) => ({
      name: PERIOD_NAMES[p.period - 1],
      ...parsePeriodTime(p.time),
    })),
    semesterStart: first.semester_start ?? null,
    academicYear: first.academic_year ?? '',
  };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * The period in session at `date`, or null outside every period (before or
 * after school, between periods, lunch). Uses the real bell times rather than
 * guessing from the hour, which the Quasar app once did and got wrong.
 */
export function getCurrentPeriod(periods: Period[], date: Date): PeriodName | null {
  const now = date.getHours() * 60 + date.getMinutes();
  for (const period of periods) {
    if (now >= toMinutes(period.start) && now <= toMinutes(period.end)) {
      return period.name;
    }
  }
  return null;
}

/** The weekday column for `date`, or null on weekends. */
export function weekdayOf(date: Date): Weekday | null {
  const day = date.getDay();
  return day >= 1 && day <= 5 ? WEEKDAYS[day - 1] : null;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Weeks elapsed since the semester began (0-based); null if unknown. */
function weeksSinceStart(semesterStart: string | null, date: Date): number | null {
  if (!semesterStart) return null;
  const start = startOfWeek(new Date(`${semesterStart}T00:00:00`));
  if (Number.isNaN(start.getTime())) return null;
  return Math.round((startOfWeek(date).getTime() - start.getTime()) / WEEK_MS);
}

/** Week 1 of the semester is a 單週; parity alternates weekly from there. */
export function getWeekParity(semesterStart: string | null, date: Date): WeekParity {
  const weeks = weeksSinceStart(semesterStart, date);
  if (weeks === null) return 'odd';
  return ((weeks % 2) + 2) % 2 === 0 ? 'odd' : 'even';
}

/** 1-based teaching week, e.g. 第3週. Null before the semester starts. */
export function getWeekNumber(semesterStart: string | null, date: Date): number | null {
  const weeks = weeksSinceStart(semesterStart, date);
  if (weeks === null || weeks < 0) return null;
  return weeks + 1;
}

/**
 * Both weeks of an alternating slot, or null.
 *
 * Cells saved by the editor are unambiguous: a rotating slot is stored as
 * `{ subject: odd, alternating }` and a plain one has no `alternating`. The
 * previous build instead kept `alternating` and only replaced `subject`, so a
 * subject matching neither week is treated as that user's override and keeps
 * the meaning it had when it was saved.
 */
export function getAlternating(cell: ScheduleCell): { odd: string; even: string } | null {
  if (!cell.alternating) return null;
  const { odd, even } = cell.alternating;
  if (cell.subject && cell.subject !== odd && cell.subject !== even) {
    return null;
  }
  return cell.alternating;
}

/** The subject actually taught in this slot during a week of `parity`. */
export function subjectFor(cell: ScheduleCell, parity: WeekParity): string {
  const alternating = getAlternating(cell);
  // An empty week of a rotation is a free period. Falling back to `subject`
  // here would show the 單週 subject on a 雙週 off week.
  if (alternating) return alternating[parity];
  return cell.subject || '';
}

/** The schedule editor's form state for one slot. */
export interface CellDraft {
  /** 單雙週輪替: edit `odd` and `even` instead of `subject`. */
  rotating: boolean;
  subject: string;
  odd: string;
  even: string;
  note: string;
  color: CellColor;
}

export function draftFromCell(cell: ScheduleCell): CellDraft {
  return {
    rotating: getAlternating(cell) !== null,
    subject: cell.subject,
    // Kept for a slot whose rotation was overridden (by the previous build) so
    // turning 輪替 back on offers the imported weeks again.
    odd: cell.alternating?.odd ?? '',
    even: cell.alternating?.even ?? '',
    note: cell.note ?? '',
    color: cell.color ?? 'Default',
  };
}

/** Turns 單雙週輪替 on or off without discarding what was typed in either mode. */
export function setDraftRotating(draft: CellDraft, rotating: boolean): CellDraft {
  // A regular slot has no weeks yet; start 單週 from its subject so only the
  // other week needs typing.
  if (rotating && !draft.odd && !draft.even) return { ...draft, rotating, odd: draft.subject };
  return { ...draft, rotating };
}

/** The cell to store for `draft`; never ambiguous to getAlternating(). */
export function cellFromDraft(draft: CellDraft): ScheduleCell {
  const base = { note: draft.note.trim(), color: draft.color };
  if (!draft.rotating) return { subject: draft.subject.trim(), ...base };
  const odd = draft.odd.trim();
  const even = draft.even.trim();
  // The same subject every week is not a rotation.
  if (odd === even) return { subject: odd, ...base };
  return { subject: odd, alternating: { odd, even }, ...base };
}
