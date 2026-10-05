// Pure helpers behind the 課表 screen and the 編輯課程 preview: what each
// period row shows (overline, subject, rotation / note, colour, 目前), the
// week line under the day, and the picker options. Kept out of the screens so
// they can be unit tested without a renderer.
import type { ChoiceOption } from '@/ui/types';

import { cellColorLabel, cellFill } from './cell-colors';
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

/** What one timetable slot's row shows. */
export interface CellRowModel {
  /** e.g. "第一節 · 08:10". */
  overline: string;
  /** The subject taught this week, or 空堂. */
  title: string;
  /** "單週：A　雙週：B" for a rotation and/or the note, one per line. */
  subtitle?: string;
  /** The cell colour's fill for the colour scheme; undefined keeps the list's row colour. */
  background?: string;
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
  return {
    overline,
    title,
    subtitle,
    background: cellFill(cell.color, scheme) ?? undefined,
    current,
    // Pauses instead of the drawn separators, and the colour is spoken too:
    // it is the user's own marking.
    accessibilityLabel: [
      overline.replace(/ · /g, '，'),
      title,
      subtitle?.replace(/\n/g, '，'),
      current ? '目前' : '',
      color,
    ].filter(Boolean).join('，'),
  };
}

/**
 * One row per period of `day`, in timetable order. The 目前 period is only
 * marked while `day` is today, using the real bell times (inclusive end
 * minute, as on the home screen).
 */
export function describeDay({ rows, day, periods, semesterStart, now, scheme }: {
  rows: readonly ScheduleRow[];
  day: Weekday;
  periods: Period[];
  semesterStart: string | null;
  now: Date;
  scheme: 'light' | 'dark';
}): PeriodRowModel[] {
  const parity = getWeekParity(semesterStart, now);
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

/**
 * e.g. "115學年度第1學期 · 第6週 · 雙週". The week number is left out before
 * the semester starts; the parity is always shown because it decides which
 * subject rotating slots display (單週 when the start date is unknown).
 */
export function formatWeekInfo(academicYear: string, semesterStart: string | null, now: Date): string {
  const week = getWeekNumber(semesterStart, now);
  const parity = getWeekParity(semesterStart, now);
  return [academicYear, week ? `第${week}週` : '', parity === 'odd' ? '單週' : '雙週'].filter(Boolean).join(' · ');
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
