// Which days have school, read from the term 行事曆: the holidays it lists
// (國慶日補假, 春節連假…), the breaks before and after the term, weekends, and
// 定期考 / 模擬考 days. Also which school events concern a grade, for the
// 行事曆 filter. 今天's 現在 card and 行事曆's day marks share these rules.
import { addDays, toDateKey } from '@/lib/dates';

import type { CalendarEvent } from './types';

export type Grade = 1 | 2 | 3;

export const GRADE_LABELS: Record<Grade, string> = { 1: '高一', 2: '高二', 3: '高三' };

/** The grade of a class id such as "201" (高二); null for anything else. */
export function gradeOfClass(classId: string): Grade | null {
  const match = /^([123])\d{2}$/.exec(classId.trim());
  return match ? (Number(match[1]) as Grade) : null;
}

/** The grades a title names (高一、高二…); empty when it names none. */
export function gradesIn(title: string): Grade[] {
  return ([1, 2, 3] as const).filter((grade) => title.includes(GRADE_LABELS[grade]));
}

/** Whether an event concerns `grade`: it names that grade, or no grade at all. */
export function isForGrade(title: string, grade: Grade | null): boolean {
  if (grade === null) return true;
  const grades = gradesIn(title);
  return grades.length === 0 || grades.includes(grade);
}

// The 行事曆 lists days off without a 處室, by name. 開學, 寒假開始, 科學節 and
// elections are listed the same way but are not days off on their own.
const DAY_OFF = /補假|放假|連假|停課|國慶日|中秋節|教師節|光復節|行憲紀念日|元旦|春節|除夕|和平紀念日|兒童節|清明|勞動節|端午/;
const EXAM = /定期考|模擬考/;

/** A school event that is a day off for everyone (a holiday). */
export function isDayOff(event: CalendarEvent): boolean {
  return event.school !== undefined && !event.school.department && DAY_OFF.test(event.title);
}

/** A 定期考 or 模擬考 for `grade` (or for everyone). */
export function isExamFor(event: CalendarEvent, grade: Grade | null): boolean {
  return event.school !== undefined && EXAM.test(event.title) && isForGrade(event.title, grade);
}

/** "高一、高二、高三第1次定期考(◆考後大掃除)" -> "第1次定期考". */
export function examTitle(title: string): string {
  return title.replace(/^(高[一二三][、,，\s]*)+/, '').replace(/[（(][^）)]*[）)]/g, '').trim() || title;
}

/** School events longer than this many days (sign-up windows) only show on their first and last day where space is short. */
const LONG_EVENT_DAYS = 7;

/** A school event spanning more than a week, e.g. a two-month application window. */
export function isLongSchoolEvent(event: CalendarEvent): boolean {
  return event.school !== undefined && daysBetween(event.startDate, event.endDate) + 1 > LONG_EVENT_DAYS;
}

/** Whether `event` is worth a mark on the day `key`: any event, but a long school one only on its first and last day. */
export function showsOnDay(event: CalendarEvent, key: string): boolean {
  return !isLongSchoolEvent(event) || event.startDate === key || event.endDate === key;
}

/** Events that cover the local day `key`. */
export function eventsOn(key: string, events: readonly CalendarEvent[]): CalendarEvent[] {
  return events.filter((event) => event.startDate <= key && key <= event.endDate);
}

export interface ExamDay {
  title: string;
  /** 1-based day of the exam, of `days`. */
  day: number;
  days: number;
}

export type SchoolDay =
  | { kind: 'school'; exam: ExamDay | null }
  /** A weekend, a holiday or the break between terms; `name` says which (週末, 國慶日補假, 寒假). */
  | { kind: 'off'; name: string };

export interface SchoolCalendarContext {
  /** The term's school events (empty while the 行事曆 is unavailable: then only weekends are off). */
  events: readonly CalendarEvent[];
  /** e.g. 115學年度第1學期, which says which break comes before and after it. */
  term: string;
  grade: Grade | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((Date.parse(`${toKey}T12:00:00`) - Date.parse(`${fromKey}T12:00:00`)) / DAY_MS);
}

/** The first day of the term (開學) and its last (休業式), as the 行事曆 lists them; null where it lists none. */
interface TermBounds {
  start: string | null;
  end: string | null;
  /** The next term's 開學, when the file lists one after `end`. */
  nextStart: string | null;
}

// Computed once per events array: nextSchoolDay asks for the bounds up to 45
// times, and 今天's 現在 card and the widget timeline ask on every tick, so
// filtering a few hundred events through two regexes on each call would be tens
// of thousands of regex tests per render. useSchoolEvents memoizes the array per
// file, so it is the same object until the 行事曆 changes; a new array recomputes.
const termBoundsCache = new WeakMap<readonly CalendarEvent[], TermBounds>();

/** The bounds of the term `events` describes, from the cache or a first pass over the array. */
function termBounds(events: readonly CalendarEvent[]): TermBounds {
  const cached = termBoundsCache.get(events);
  if (cached) return cached;
  const dates = (pattern: RegExp) =>
    events.filter((event) => event.school !== undefined && pattern.test(event.title)).map((event) => event.startDate).sort();
  const starts = dates(/^開學$/);
  const ends = dates(/休業式/);
  const start = starts[0] ?? null;
  const end = ends[ends.length - 1] ?? null;
  // The file also lists the next term's 開學; after it the next term's file applies.
  const nextStart = end ? (starts.find((key) => key > end) ?? null) : null;
  const bounds: TermBounds = { start, end, nextStart };
  termBoundsCache.set(events, bounds);
  return bounds;
}

/** 暑假 or 寒假 around a 第1/第2學期, by which side of the term `key` falls on. */
function breakName(term: string, before: boolean): string {
  if (term.includes('第1學期')) return before ? '暑假' : '寒假';
  if (term.includes('第2學期')) return before ? '寒假' : '暑假';
  return '假期';
}

/** Whether `date` has school, and which exam if it is an exam day for the grade. */
export function schoolDayOf(date: Date, { events, term, grade }: SchoolCalendarContext): SchoolDay {
  const key = toDateKey(date);
  const today = eventsOn(key, events);

  const holiday = today.find(isDayOff);
  if (holiday) return { kind: 'off', name: holiday.title };

  const { start, end, nextStart } = termBounds(events);
  if (start && key < start) return { kind: 'off', name: breakName(term, true) };
  if (end && key > end && (!nextStart || key < nextStart)) return { kind: 'off', name: breakName(term, false) };

  const weekday = date.getDay();
  if (weekday === 0 || weekday === 6) return { kind: 'off', name: '週末' };

  const exam = today.find((event) => isExamFor(event, grade));
  return {
    kind: 'school',
    exam: exam
      ? { title: examTitle(exam.title), day: daysBetween(exam.startDate, key) + 1, days: daysBetween(exam.startDate, exam.endDate) + 1 }
      : null,
  };
}

/** The next day after `date` that has school, within `limit` days; null if none. */
export function nextSchoolDay(date: Date, context: SchoolCalendarContext, limit = 45): Date | null {
  for (let offset = 1; offset <= limit; offset++) {
    const day = addDays(new Date(date.getFullYear(), date.getMonth(), date.getDate()), offset);
    if (schoolDayOf(day, context).kind === 'school') return day;
  }
  return null;
}

export interface UpcomingExam {
  title: string;
  startDate: string;
  endDate: string;
  /** Whole days from `date` to the first exam day; 0 while it is on. */
  daysUntil: number;
}

/** The next (or current) exam for the grade on or after `date`; null if the term lists none. */
export function upcomingExam(date: Date, { events, grade }: Pick<SchoolCalendarContext, 'events' | 'grade'>): UpcomingExam | null {
  const key = toDateKey(date);
  const exam = events
    .filter((event) => isExamFor(event, grade) && event.endDate >= key)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  if (!exam) return null;
  return {
    title: examTitle(exam.title),
    startDate: exam.startDate,
    endDate: exam.endDate,
    daysUntil: Math.max(0, daysBetween(key, exam.startDate)),
  };
}
