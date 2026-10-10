// Pure helpers behind the 課表 screen and the 編輯課程 preview: the week as one
// table (a coloured cell per period, each subject in its own colour), one
// slot's preview row, the subtitle and the picker options. Kept out of the
// screens so they can be unit tested without a renderer.
import { addDays, isSameDay, parseClockTime, startOfWeekMonday, WEEKDAY_ZH } from '@/lib/dates';
import type { ChoiceOption } from '@/ui/types';

import { cellColorLabel } from './cell-colors';
import { lessonSwatch, subjectPalette, type SubjectPalette } from './subject-colors';
import {
  getAlternating,
  getCurrentPeriod,
  getWeekNumber,
  getWeekParity,
  subjectFor,
  WEEKDAYS,
  WEEKDAY_SHORT_LABELS,
  type Period,
  type PeriodName,
  type ScheduleCell,
  type ScheduleRow,
  type Timetables,
  type WeekParity,
  type Weekday,
} from './timetable';

/** A gap between periods at least this long (minutes) is lunch. */
const LUNCH_GAP = 30;

/** What one timetable slot's row shows: 編輯課程's preview. */
export interface CellRowModel {
  /** e.g. "第一節 · 08:10". */
  overline: string;
  /** The subject taught this week, or 空堂. */
  title: string;
  /** "單週：A　雙週：B" for a rotation and/or the note, one per line. */
  subtitle?: string;
  /** The lesson's fill (the user's colour, else the subject's own); undefined for a 空堂. */
  fill?: string;
  /** Text on `fill`. */
  ink?: string;
  /** Overline first, so VoiceOver and TalkBack read the period before the subject. */
  accessibilityLabel: string;
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

/**
 * The user's own colour, named for the spoken label; undefined for 預設 (the
 * subject's colour is not their marking) and for a 空堂, which is drawn plain
 * whatever colour the slot has.
 */
function ownColorLabel(cell: ScheduleCell, subject: string): string | undefined {
  return subject && cell.color && cell.color !== 'Default' ? cellColorLabel(cell.color) : undefined;
}

/** The row for one slot during a week of `parity`, its subject coloured from `palette`. */
export function describeCell(
  cell: ScheduleCell,
  { overline, parity, scheme, palette }: {
    overline: string;
    parity: WeekParity;
    scheme: 'light' | 'dark';
    palette: SubjectPalette;
  },
): CellRowModel {
  const subject = subjectFor(cell, parity);
  const title = subject || '空堂';
  const subtitle = cellDetails(cell);
  const color = ownColorLabel(cell, subject);
  const swatch = lessonSwatch({ subject, color: cell.color }, scheme, palette);
  return {
    overline,
    title,
    subtitle,
    fill: swatch?.fill,
    ink: swatch?.ink,
    // Pauses instead of the drawn separators, and the user's own colour is
    // spoken too while a lesson is drawn in it.
    accessibilityLabel: [overline.replace(/ · /g, '，'), title, subtitle?.replace(/\n/g, '，'), color]
      .filter(Boolean)
      .join('，'),
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
  /** This week's subject; '' for a free period. */
  subject: string;
  /** What the table shows: the subject in full, else a free period's note (as 今天 titles it); '' for neither. */
  text: string;
  /** The lesson's fill and text colour (the user's colour, else the subject's own); none for a free period. */
  color?: string;
  ink?: string;
  /** In session now: today's column (unless it is a day off) at the period of the bell. */
  current: boolean;
  /** Nothing to show: a free period without a note. */
  empty: boolean;
  /** The slot has a note. */
  note: boolean;
  /** "單週：A　雙週：B" for a rotation and/or the note, one per line. */
  details?: string;
  /** The weekday, period, bell times, subject, rotation, note, 現在 and the user's own colour. */
  accessibilityLabel: string;
}

export interface WeekRowModel {
  key: PeriodName;
  /** 一 … 八 */
  label: string;
  /** The start time, e.g. 08:10; '' before the bell times load. */
  detail: string;
  /** The bell times, e.g. 08:10–09:00; '' before they load. */
  time: string;
  /** The period in session today. */
  highlighted: boolean;
}

export interface WeekModel {
  columns: WeekColumnModel[];
  rows: WeekRowModel[];
  /** cells[row][column], rows in bell order. */
  cells: WeekCellModel[][];
  /** The row after which lunch falls, or null. */
  lunchAfter: number | null;
  /** Lunch's bell times, e.g. 12:00–13:00, or null. */
  lunchTime: string | null;
}

/**
 * The displayed week as one table: a column per weekday (dated, today marked,
 * days off named by `offDay`), a row per period in bell order, and every
 * subject in its own colour, anchored on `base`, the class's own timetable
 * (see subjectPalette).
 */
export function describeWeek({ rows, base, periods, semesterStart, now, scheme, offDay }: {
  rows: readonly ScheduleRow[];
  base?: readonly ScheduleRow[];
  periods: Period[];
  semesterStart: string | null;
  now: Date;
  scheme: 'light' | 'dark';
  offDay?: (date: Date) => string | null;
}): WeekModel {
  const monday = displayedWeek(now);
  const parity = getWeekParity(semesterStart, monday);
  const current = getCurrentPeriod(periods, now);
  const palette = subjectPalette(rows, base);
  // Bell order; until the bell times load, the timetable's own order, untimed.
  const ordered: Period[] =
    periods.length > 0
      ? [...periods].sort((a, b) => (parseClockTime(a.start) ?? 0) - (parseClockTime(b.start) ?? 0))
      : rows.map((row) => ({ name: row.name, start: '', end: '' }));

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
    return end !== null && start !== null && start - end >= LUNCH_GAP;
  });

  // 現在 is on today's column only, and not when today is a day off.
  const live = columns.find((column) => column.today && column.off === null);
  const times = ordered.map((period) => (period.start && period.end ? `${period.start}–${period.end}` : ''));
  // One cell per period, as on the printed timetable: a 連堂 is two cells of
  // the same colour.
  const cells = ordered.map((period, index) =>
    columns.map((column): WeekCellModel => {
      const cell = rows.find((candidate) => candidate.name === period.name)?.[column.key] ?? { subject: '' };
      const subject = subjectFor(cell, parity);
      const note = cell.note?.trim() ?? '';
      const details = cellDetails(cell);
      const isCurrent = column === live && current === period.name;
      const color = ownColorLabel(cell, subject);
      const swatch = lessonSwatch({ subject, color: cell.color }, scheme, palette);
      return {
        key: `${period.name}-${column.key}`,
        subject,
        text: subject || note,
        color: swatch?.fill,
        ink: swatch?.ink,
        current: isCurrent,
        empty: subject === '' && note === '',
        note: note !== '',
        details,
        // Pauses instead of the drawn separators; the user's own colour is
        // spoken too while a lesson is drawn in it.
        accessibilityLabel: [
          `星期${WEEKDAY_SHORT_LABELS[column.key]}第${period.name}節`,
          times[index],
          subject || '空堂',
          details?.replace(/\n/g, '，'),
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
    rows: ordered.map((period, index) => ({
      key: period.name,
      label: period.name,
      detail: period.start,
      time: times[index],
      highlighted: live !== undefined && current === period.name,
    })),
    cells,
    lunchAfter: lunchIndex >= 0 ? lunchIndex : null,
    lunchTime: lunchIndex >= 0 ? `${ordered[lunchIndex].end}–${ordered[lunchIndex + 1].start}` : null,
  };
}

/** 課表's subtitle, e.g. "201 · 第 6 週 · 雙週", for the displayed week; the week alone until a class is chosen. */
export function scheduleSubtitle(userClass: string, semesterStart: string | null, now: Date): string {
  const shown = displayedWeek(now);
  const week = getWeekNumber(semesterStart, shown);
  const parity = getWeekParity(semesterStart, shown);
  return [userClass, week ? `第 ${week} 週` : '', parity === 'odd' ? '單週' : '雙週'].filter(Boolean).join(' · ');
}

/**
 * Class picker options in the feed's order. The user's class stays listed
 * (first) even when the loaded timetables no longer include it, so the picker
 * can always show it; no class chosen yet ('') adds nothing.
 */
export function classOptions(classIds: readonly string[], userClass: string): ChoiceOption[] {
  const ids = userClass === '' || classIds.includes(userClass) ? classIds : [userClass, ...classIds];
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
   * Above the table: 'error' is the 暫時無法更新課表 notice with 重試;
   * 'retrying' is a loading row in its place while a refetch runs.
   */
  banner: 'none' | 'error' | 'retrying';
  /** The table itself, a loading row, or the empty state. */
  table: 'rows' | 'loading' | 'empty';
}

/**
 * React Query keeps `isError` (and `isPending` stays false) while a retry
 * runs, so 重試 and 重新整理 would look like they did nothing for the whole
 * round trip. Any running fetch therefore replaces those buttons with a
 * loading row: in the table's place when there are no rows (so a second one
 * is not needed above), otherwise in place of the notice.
 */
export function scheduleLoadState({ hasRows, isPending, isFetching, isError }: {
  hasRows: boolean;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
}): ScheduleLoadState {
  const table = hasRows ? 'rows' : isPending || isFetching ? 'loading' : 'empty';
  let banner: ScheduleLoadState['banner'] = 'none';
  if (isError && !isFetching) banner = 'error';
  else if (isError && hasRows) banner = 'retrying';
  return { banner, table };
}
