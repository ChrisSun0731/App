// Pure helpers behind the 課表 screen and the 編輯課程 preview: what each
// period row shows (overline, subject, rotation / note, colour, 現在), the
// day's 上午 / 下午 with 連堂 merged, the week grid, the week line and the
// picker options. Kept out of the screens so they can be unit tested without
// a renderer.
import { addDays, isSameDay, minutesOfDay, parseClockTime, startOfWeekMonday, WEEKDAY_ZH } from '@/lib/dates';
import type { ChoiceOption } from '@/ui/types';

import { cellColorLabel, cellSwatch } from './cell-colors';
import {
  getAlternating,
  getCurrentPeriod,
  getWeekNumber,
  getWeekParity,
  subjectFor,
  WEEKDAYS,
  WEEKDAY_SHORT_LABELS,
  weekdayOf,
  type Period,
  type PeriodName,
  type ScheduleCell,
  type ScheduleRow,
  type Timetables,
  type WeekParity,
  type Weekday,
} from './timetable';

/** A gap between periods at least this long (minutes) splits the day: 上午, 下午. */
const DAY_PART_GAP = 30;

/** What one timetable slot's row shows. */
export interface CellRowModel {
  /** e.g. "第一節 · 08:10". */
  overline: string;
  /** The subject taught this week, or 空堂. */
  title: string;
  /** "單週：A　雙週：B" for a rotation and/or the note, one per line. */
  subtitle?: string;
  /** The cell colour's soft fill for the colour scheme; undefined for 預設. */
  fill?: string;
  /** Text on `fill`. */
  ink?: string;
  /** In session right now. */
  current: boolean;
  /** Overline first, so VoiceOver and TalkBack read the period before the subject. */
  accessibilityLabel: string;
}

export interface PeriodRowModel extends CellRowModel {
  period: PeriodName;
}

/** The segmented 一 … 五 picker. */
export const DAY_OPTIONS: readonly ChoiceOption<Weekday>[] = WEEKDAYS.map((day) => ({
  label: WEEKDAY_SHORT_LABELS[day],
  value: day,
}));

/** The weekday 課表 opens on: today, or Monday at the weekend. */
export function defaultDay(date: Date): Weekday {
  return weekdayOf(date) ?? 'Monday';
}

/** e.g. "第一節 · 08:10"; just "第一節" when the bell times are not loaded. */
export function periodOverline(name: PeriodName, periods: readonly Period[]): string {
  const start = periods.find((period) => period.name === name)?.start;
  return start ? `第${name}節 · ${start}` : `第${name}節`;
}

/** The rotation line and the note, one per line; undefined when there is neither. */
export function cellDetails(cell: ScheduleCell): string | undefined {
  const lines: string[] = [];
  const alternating = getAlternating(cell);
  if (alternating) lines.push(`單週：${alternating.odd || '空堂'}　雙週：${alternating.even || '空堂'}`);
  const note = cell.note?.trim();
  if (note) lines.push(note);
  return lines.length > 0 ? lines.join('\n') : undefined;
}

/** The row for one slot during a week of `parity`. */
export function describeCell(
  cell: ScheduleCell,
  { overline, parity, scheme, current = false }: {
    overline: string;
    parity: WeekParity;
    scheme: 'light' | 'dark';
    current?: boolean;
  },
): CellRowModel {
  const title = subjectFor(cell, parity) || '空堂';
  const subtitle = cellDetails(cell);
  const color = cell.color && cell.color !== 'Default' ? cellColorLabel(cell.color) : undefined;
  const swatch = cellSwatch(cell.color, scheme);
  return {
    overline,
    title,
    subtitle,
    fill: swatch?.fill,
    ink: swatch?.ink,
    current,
    // Pauses instead of the drawn separators, and the colour is spoken too:
    // it is the user's own marking.
    accessibilityLabel: [
      overline.replace(/ · /g, '，'),
      title,
      subtitle?.replace(/\n/g, '，'),
      current ? '現在' : '',
      color,
    ].filter(Boolean).join('，'),
  };
}

/**
 * The Monday of the week 課表 shows: this week, or the coming one at the
 * weekend (when it opens on Monday). Its parity decides rotating subjects.
 */
export function displayedWeek(now: Date): Date {
  const day = now.getDay();
  return startOfWeekMonday(day === 6 ? addDays(now, 2) : day === 0 ? addDays(now, 1) : now);
}

/**
 * One row per period of `day`, in timetable order. The 現在 period is only
 * marked while `day` is today, using the real bell times (a period ends at its
 * bell, as on 今天).
 */
export function describeDay({ rows, day, periods, semesterStart, now, scheme }: {
  rows: readonly ScheduleRow[];
  day: Weekday;
  periods: Period[];
  semesterStart: string | null;
  now: Date;
  scheme: 'light' | 'dark';
}): PeriodRowModel[] {
  const parity = getWeekParity(semesterStart, displayedWeek(now));
  const current = weekdayOf(now) === day ? getCurrentPeriod(periods, now) : null;
  return rows.map((row) => ({
    period: row.name,
    ...describeCell(row[day], {
      overline: periodOverline(row.name, periods),
      parity,
      scheme,
      current: row.name === current,
    }),
  }));
}

/** A row of the day view: one period, or a 連堂's periods together. */
export interface DayRowModel extends CellRowModel {
  /** The periods it covers, first to last; editing opens the first. */
  periods: PeriodName[];
  /** e.g. 08:10–10:00 */
  time: string;
  /** Minutes to the bell of the period in session, while `current`. */
  untilBell: number | null;
}

/** 上午 or 下午: the periods between two long gaps. */
export interface DayPartModel {
  key: string;
  /** 上午, 下午 */
  title: string;
  /** e.g. 08:10–12:00 */
  detail: string;
  rows: DayRowModel[];
}

/** Two adjacent slots that are one lesson: the same subject, rotation, note and colour. */
function sameLesson(a: ScheduleCell, b: ScheduleCell, parity: WeekParity): boolean {
  const subject = subjectFor(a, parity);
  return subject !== '' &&
    subject === subjectFor(b, parity) &&
    JSON.stringify(getAlternating(a)) === JSON.stringify(getAlternating(b)) &&
    (a.note?.trim() ?? '') === (b.note?.trim() ?? '') &&
    (a.color ?? 'Default') === (b.color ?? 'Default');
}

const PART_NAMES = ['上午', '下午'];

/**
 * `day` as 上午 and 下午 (split at the lunch gap), with a 連堂 (the same
 * lesson in adjacent periods) as one row. Without the bell times it is one
 * part of single periods, since breaks cannot be told apart from lunch.
 */
export function describeDayParts(input: {
  rows: readonly ScheduleRow[];
  day: Weekday;
  periods: Period[];
  semesterStart: string | null;
  now: Date;
  scheme: 'light' | 'dark';
}): DayPartModel[] {
  const single = describeDay(input);
  const timed = input.periods
    .map((period) => ({ period, start: parseClockTime(period.start), end: parseClockTime(period.end) }))
    .filter((entry): entry is { period: Period; start: number; end: number } => entry.start !== null && entry.end !== null)
    .sort((a, b) => a.start - b.start);
  if (timed.length === 0) {
    return [{ key: 'day', title: '', detail: '', rows: single.map((row) => ({ ...row, periods: [row.period], time: '', untilBell: null })) }];
  }

  const parity = getWeekParity(input.semesterStart, displayedWeek(input.now));
  const cellOf = (name: PeriodName) => input.rows.find((row) => row.name === name)?.[input.day];
  const parts: DayPartModel[] = [];
  let group: typeof timed = [];
  let partStart = timed[0].start;
  let partRows: DayRowModel[] = [];

  const closeGroup = () => {
    if (group.length === 0) return;
    const first = group[0];
    const last = group[group.length - 1];
    const cell = cellOf(first.period.name);
    const names = group.map((entry) => entry.period.name);
    const times = `${first.period.start}–${last.period.end}`;
    const overline = names.length > 1 ? `第${names.join('、')}節 · ${times} · 連堂` : `第${first.period.name}節 · ${times}`;
    const inSession = group.find((entry) => single.find((row) => row.period === entry.period.name)?.current);
    if (cell) {
      partRows.push({
        ...describeCell(cell, { overline, parity, scheme: input.scheme, current: inSession !== undefined }),
        periods: names,
        time: times,
        untilBell: inSession ? inSession.end - minutesOfDay(input.now) : null,
      });
    }
    group = [];
  };
  const closePart = (end: number) => {
    closeGroup();
    if (partRows.length > 0) {
      const name = PART_NAMES[parts.length] ?? `第${parts.length + 1}段`;
      parts.push({ key: `part-${parts.length}`, title: name, detail: `${clockText(partStart)}–${clockText(end)}`, rows: partRows });
    }
    partRows = [];
  };

  timed.forEach((entry, index) => {
    const previous = timed[index - 1];
    if (previous && entry.start - previous.end >= DAY_PART_GAP) {
      closePart(previous.end);
      partStart = entry.start;
    } else if (previous && group.length > 0) {
      const a = cellOf(previous.period.name);
      const b = cellOf(entry.period.name);
      if (!(a && b && sameLesson(a, b, parity))) closeGroup();
    }
    group.push(entry);
  });
  closePart(timed[timed.length - 1].end);
  return parts;
}

const clockText = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

// Names shortened to fit a week-grid cell; others keep their first four characters.
const SHORT_SUBJECTS: Record<string, string> = {
  國語文: '國文',
  英語文: '英文',
  公民與社會: '公民',
  生活科技: '生科',
  資訊科技: '資科',
  各類文學選讀: '文學選讀',
  彈性學習: '彈性',
  綜合活動: '綜合',
  全民國防教育: '國防',
  健康與護理: '健護',
  專題寫作與表達: '專題寫作',
};

/** A subject short enough for the week grid: 國語文 → 國文, 數學(彈性學習) → 數學彈. */
export function shortSubject(subject: string): string {
  const trimmed = subject.trim();
  if (SHORT_SUBJECTS[trimmed]) return SHORT_SUBJECTS[trimmed];
  const bracket = /^(.+?)\s*[（(]([^）)]*)[）)]$/.exec(trimmed);
  const base = bracket ? bracket[1] + (bracket[2].startsWith('彈性') ? '彈' : '') : trimmed;
  return Array.from(SHORT_SUBJECTS[base] ?? base).slice(0, 4).join('');
}

export interface WeekColumnModel {
  key: Weekday;
  /** 一 … 五 */
  label: string;
  /** e.g. 10/5 */
  detail: string;
  /** The day of the month, e.g. 5 */
  date: string;
  today: boolean;
  /** Why there is no school that day (國慶日補假…), or null. */
  off: string | null;
  accessibilityLabel: string;
}

export interface WeekCellModel {
  key: string;
  /** The short subject, '' for a free period. */
  text: string;
  color?: string;
  ink?: string;
  current: boolean;
  empty: boolean;
  /** Periods this cell covers (a 連堂); 0 for one covered by the cell above. */
  span: number;
  accessibilityLabel: string;
}

export interface WeekModel {
  columns: WeekColumnModel[];
  /** `highlighted`: the period in session today. */
  rows: { key: PeriodName; label: string; detail: string; highlighted: boolean }[];
  /** cells[row][column], rows in bell order. */
  cells: WeekCellModel[][];
  /** The row after which lunch falls, or null. */
  lunchAfter: number | null;
  /** Lunch's bell times, e.g. 12:00–13:00, or null. */
  lunchTime: string | null;
}

/**
 * The displayed week as a grid: a column per weekday (dated, today marked,
 * days off named by `offDay`), a row per period in bell order.
 */
export function describeWeek({ rows, periods, semesterStart, now, scheme, offDay }: {
  rows: readonly ScheduleRow[];
  periods: Period[];
  semesterStart: string | null;
  now: Date;
  scheme: 'light' | 'dark';
  offDay?: (date: Date) => string | null;
}): WeekModel {
  const monday = displayedWeek(now);
  const parity = getWeekParity(semesterStart, monday);
  const current = getCurrentPeriod(periods, now);
  const ordered = [...periods].sort((a, b) => (parseClockTime(a.start) ?? 0) - (parseClockTime(b.start) ?? 0));

  const columns = WEEKDAYS.map((day, index): WeekColumnModel => {
    const date = addDays(monday, index);
    const today = isSameDay(date, now);
    const off = offDay?.(date) ?? null;
    const detail = `${date.getMonth() + 1}/${date.getDate()}`;
    return {
      key: day,
      label: WEEKDAY_SHORT_LABELS[day],
      detail,
      date: String(date.getDate()),
      today,
      off,
      accessibilityLabel: [`星期${WEEKDAY_ZH[date.getDay()]} ${detail}`, today ? '今天' : '', off ?? ''].filter(Boolean).join('，'),
    };
  });

  const lunchIndex = ordered.findIndex((period, index) => {
    const next = ordered[index + 1];
    const end = parseClockTime(period.end);
    const start = next ? parseClockTime(next.start) : null;
    return end !== null && start !== null && start - end >= DAY_PART_GAP;
  });

  const todayColumn = columns.some((column) => column.today);
  const cellAt = (period: Period, column: WeekColumnModel) =>
    rows.find((candidate) => candidate.name === period.name)?.[column.key] ?? { subject: '' };
  // A 連堂 is one tall cell: the same lesson in the period before, on the
  // same side of lunch, covers this one.
  const continues = (index: number, column: WeekColumnModel) =>
    index > 0 && index - 1 !== lunchIndex && sameLesson(cellAt(ordered[index - 1], column), cellAt(ordered[index], column), parity);

  const cells = ordered.map((period, index) =>
    columns.map((column): WeekCellModel => {
      const cell = cellAt(period, column);
      const subject = subjectFor(cell, parity);
      const isCurrent = column.today && current === period.name;
      const color = cell.color && cell.color !== 'Default' ? cellColorLabel(cell.color) : '';
      const swatch = cellSwatch(cell.color, scheme);
      let span = 0;
      if (!continues(index, column)) {
        span = 1;
        while (index + span < ordered.length && continues(index + span, column)) span += 1;
      }
      const names = ordered.slice(index, index + Math.max(span, 1)).map((entry) => entry.name);
      return {
        key: `${period.name}-${column.key}`,
        text: shortSubject(subject),
        color: swatch?.fill,
        ink: swatch?.ink,
        current: isCurrent,
        empty: subject === '',
        span,
        accessibilityLabel: [
          `星期${WEEKDAY_SHORT_LABELS[column.key]}第${names.join('、')}節`,
          subject || '空堂',
          span > 1 ? '連堂' : '',
          isCurrent ? '現在' : '',
          color,
        ]
          .filter(Boolean)
          .join('，'),
      };
    }),
  );

  return {
    columns,
    rows: ordered.map((period) => ({
      key: period.name,
      label: period.name,
      detail: period.start,
      highlighted: todayColumn && current === period.name,
    })),
    cells,
    lunchAfter: lunchIndex >= 0 ? lunchIndex : null,
    lunchTime: lunchIndex >= 0 ? `${ordered[lunchIndex].end}–${ordered[lunchIndex + 1].start}` : null,
  };
}

/**
 * e.g. "115學年度第1學期 · 第6週 · 雙週", for the displayed week (the coming
 * one at the weekend). The week number is left out before the semester
 * starts; the parity is always shown because it decides which subject
 * rotating slots display (單週 when the start date is unknown).
 */
export function formatWeekInfo(academicYear: string, semesterStart: string | null, now: Date): string {
  const shown = displayedWeek(now);
  const week = getWeekNumber(semesterStart, shown);
  const parity = getWeekParity(semesterStart, shown);
  return [academicYear, week ? `第${week}週` : '', parity === 'odd' ? '單週' : '雙週'].filter(Boolean).join(' · ');
}

/** 課表's subtitle, e.g. "201 · 第 6 週 · 雙週", for the displayed week. */
export function scheduleSubtitle(userClass: string, semesterStart: string | null, now: Date): string {
  const shown = displayedWeek(now);
  const week = getWeekNumber(semesterStart, shown);
  const parity = getWeekParity(semesterStart, shown);
  return [userClass, week ? `第 ${week} 週` : '', parity === 'odd' ? '單週' : '雙週'].filter(Boolean).join(' · ');
}

/**
 * Class picker options in the feed's order. The user's class stays listed
 * (first) even when the loaded timetables no longer include it, so the picker
 * can always show it.
 */
export function classOptions(classIds: readonly string[], userClass: string): ChoiceOption[] {
  const ids = classIds.includes(userClass) ? classIds : [userClass, ...classIds];
  return ids.map((id) => ({ label: `${id} 班`, value: id }));
}

/** The bundled timetable of class `id`, or undefined. Own keys only, so "constructor" is not a class. */
export function classTimetable(timetables: Timetables | undefined, id: string): ScheduleRow[] | undefined {
  if (!timetables || !Object.prototype.hasOwnProperty.call(timetables.byClass, id)) return undefined;
  return timetables.byClass[id];
}

/** What 課表 shows while the class timetables load, fail or reload. */
export interface ScheduleLoadState {
  /**
   * Above the days: 'error' is the 暫時無法更新課表 notice with 重試;
   * 'retrying' is a loading row in its place while a refetch runs.
   */
  banner: 'none' | 'error' | 'retrying';
  /** The day section: the period rows, a loading row, or the empty state. */
  day: 'rows' | 'loading' | 'empty';
}

/**
 * React Query keeps `isError` (and `isPending` stays false) while a retry
 * runs, so 重試 and 重新整理 would look like they did nothing for the whole
 * round trip. Any running fetch therefore replaces those buttons with a
 * loading row: in the day section when it has no rows (so a second one is not
 * needed above), otherwise in place of the notice.
 */
export function scheduleLoadState({ hasRows, isPending, isFetching, isError }: {
  hasRows: boolean;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
}): ScheduleLoadState {
  const day = hasRows ? 'rows' : isPending || isFetching ? 'loading' : 'empty';
  let banner: ScheduleLoadState['banner'] = 'none';
  if (isError && !isFetching) banner = 'error';
  else if (isError && hasRows) banner = 'retrying';
  return { banner, day };
}
