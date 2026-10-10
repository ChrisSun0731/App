// 今天's 現在 card: what is happening at this minute of the school day (before
// school, a class, a break, lunch, after school, an exam day or a day off),
// the bell rail under it and the card's words. Pure functions of the clock,
// the bell times, the user's timetable and the school calendar, so every
// state is unit-tested (now.test.ts). See docs/design/native-ui.md, "今天".
import {
  getWeekParity,
  subjectFor,
  weekdayOf,
  type Period,
  type ScheduleRow,
} from '@/features/schedule/timetable';
import {
  nextSchoolDay,
  schoolDayOf,
  type ExamDay,
  type SchoolCalendarContext,
} from '@/features/todo/school-days';
import { addDays, clock, formatMonthDayZh, isSameDay, minutesOfDay, parseClockTime, WEEKDAY_ZH } from '@/lib/dates';
import type { NowCardProps, NowRail, NowRailSegment } from '@/ui/types';

/** A gap between periods at least this long (minutes) is lunch, not a 下課. */
export const LUNCH_GAP = 30;
/** Further away than this, before school counts in clock time instead of minutes. */
const COUNTDOWN_LIMIT = 60;

export interface Slot {
  period: Period;
  /** Minutes since midnight. */
  start: number;
  end: number;
  /** This week's subject (rotations resolved); '' for a free period. */
  subject: string;
  note: string;
}

/** A class to come on a later school day. */
export interface UpcomingClass {
  date: Date;
  slot: Slot;
}

export type NowState =
  | { kind: 'before-school'; next: Slot; minutes: number; lastEnd: number }
  /** In a period (`slot.subject` is '' in a 空堂); `doubleUntil` ends a 連堂. */
  | { kind: 'class'; slot: Slot; minutes: number; next: Slot | null; doubleUntil: number | null }
  | { kind: 'break'; next: Slot; minutes: number }
  | { kind: 'lunch'; next: Slot; minutes: number; start: number; end: number }
  | { kind: 'after-school'; upcoming: UpcomingClass | null }
  | { kind: 'exam'; exam: ExamDay }
  | { kind: 'day-off'; name: string; upcoming: UpcomingClass | null }
  /**
   * The timetables loaded but the user's has no rows: no class chosen yet
   * (`hasClass` false), or a class the data does not have.
   */
  | { kind: 'no-timetable'; hasClass: boolean };

export interface NowInput extends SchoolCalendarContext {
  now: Date;
  periods: readonly Period[];
  rows: readonly ScheduleRow[];
  semesterStart: string | null;
  /** The user's class, '' until chosen; left out by callers that do not know it (the widget timeline). */
  userClass?: string;
}

/** A slot worth pointing at: it has a subject, or at least a note. */
export function isLesson(slot: Slot): boolean {
  return slot.subject !== '' || slot.note !== '';
}

/** The periods of `date` with the user's subjects, in bell order; none at the weekend. */
export function slotsOn(
  date: Date,
  periods: readonly Period[],
  rows: readonly ScheduleRow[],
  semesterStart: string | null,
): Slot[] {
  const weekday = weekdayOf(date);
  if (!weekday) return [];
  const parity = getWeekParity(semesterStart, date);
  return periods
    .flatMap((period): Slot[] => {
      const start = parseClockTime(period.start);
      const end = parseClockTime(period.end);
      if (start === null || end === null) return [];
      const cell = rows.find((row) => row.name === period.name)?.[weekday];
      return [{ period, start, end, subject: cell ? subjectFor(cell, parity) : '', note: cell?.note?.trim() ?? '' }];
    })
    .sort((a, b) => a.start - b.start);
}

function upcomingClass(input: NowInput): UpcomingClass | null {
  const date = nextSchoolDay(input.now, input);
  if (!date) return null;
  const slot = slotsOn(date, input.periods, input.rows, input.semesterStart).find(isLesson);
  return slot ? { date, slot } : null;
}

/** What is happening at `input.now`. */
export function nowState(input: NowInput): NowState {
  if (input.rows.length === 0) {
    return { kind: 'no-timetable', hasClass: input.userClass === undefined || input.userClass.trim() !== '' };
  }
  const day = schoolDayOf(input.now, input);
  if (day.kind === 'off') return { kind: 'day-off', name: day.name, upcoming: upcomingClass(input) };
  if (day.exam) return { kind: 'exam', exam: day.exam };

  const slots = slotsOn(input.now, input.periods, input.rows, input.semesterStart);
  const lessons = slots.filter(isLesson);
  const time = minutesOfDay(input.now);
  const last = lessons[lessons.length - 1];
  if (!last || time >= last.end) return { kind: 'after-school', upcoming: upcomingClass(input) };

  const first = lessons[0];
  if (time < first.start) return { kind: 'before-school', next: first, minutes: first.start - time, lastEnd: last.end };

  // Periods run from their start minute up to (not including) their end: at
  // the bell the period is over.
  const index = slots.findIndex((slot) => slot.start <= time && time < slot.end);
  if (index >= 0) {
    const slot = slots[index];
    const following = slots[index + 1];
    const doubleUntil =
      following && slot.subject !== '' && following.subject === slot.subject && following.start - slot.end < LUNCH_GAP
        ? following.end
        : null;
    const after = doubleUntil ?? slot.end;
    return {
      kind: 'class',
      slot,
      minutes: slot.end - time,
      next: lessons.find((lesson) => lesson.start >= after) ?? null,
      doubleUntil,
    };
  }

  // Between periods: lunch when the gap is long, else a 下課.
  const next = lessons.find((lesson) => lesson.start > time) ?? last;
  const previous = slots.filter((slot) => slot.end <= time).pop();
  const nextPeriod = slots.find((slot) => slot.start > time) ?? next;
  if (previous && nextPeriod.start - previous.end >= LUNCH_GAP) {
    return { kind: 'lunch', next, minutes: next.start - time, start: previous.end, end: nextPeriod.start };
  }
  return { kind: 'break', next, minutes: next.start - time };
}

/** Whether the state is a school day with periods, so the bell rail applies. */
export function hasRail(state: NowState): boolean {
  return ['before-school', 'class', 'break', 'lunch', 'after-school'].includes(state.kind);
}

function railSegment(
  key: string,
  label: string,
  start: number,
  end: number,
  kind: NowRailSegment['kind'],
  time: number,
): NowRailSegment {
  return {
    key,
    label,
    start,
    end,
    kind,
    progress: Math.min(1, Math.max(0, (time - start) / Math.max(1, end - start))),
    current: start <= time && time < end,
  };
}

/** The school day to scale: each period, lunch, and where `now` is. Null without periods. */
export function railOf(now: Date, slots: readonly Slot[]): NowRail | null {
  if (slots.length === 0) return null;
  const time = minutesOfDay(now);
  const segments: NowRailSegment[] = [];
  slots.forEach((slot, index) => {
    const previous = slots[index - 1];
    if (previous && slot.start - previous.end >= LUNCH_GAP) {
      segments.push(railSegment('lunch', '午', previous.end, slot.start, 'lunch', time));
    }
    segments.push(railSegment(`period-${slot.period.name}`, slot.period.name, slot.start, slot.end, isLesson(slot) ? 'lesson' : 'free', time));
  });
  const start = slots[0].start;
  const end = slots[slots.length - 1].end;
  return { start, end, now: time >= start && time <= end ? time : null, segments };
}

/** 明天, or e.g. 10/12 星期一 for a later day. */
export function dayLabel(date: Date, now: Date): string {
  if (isSameDay(date, addDays(now, 1))) return '明天';
  return `${date.getMonth() + 1}/${date.getDate()} 星期${WEEKDAY_ZH[date.getDay()]}`;
}

const periodName = (slot: Slot) => `第${slot.period.name}節`;
const lessonTitle = (slot: Slot) => slot.subject || slot.note || '空堂';
/** The note under a lesson's title, when the title is the subject. */
const noteOf = (slot: Slot) => (slot.subject && slot.note ? slot.note : undefined);

export type NowCardContent = Omit<NowCardProps, 'onPress'>;

/** The card's words for `state`; `rail` is drawn only on school days with periods (see hasRail). */
export function nowCard(state: NowState, now: Date, rail: NowRail | null): NowCardContent {
  let content: Omit<NowCardContent, 'accessibilityLabel' | 'rail'>;
  switch (state.kind) {
    case 'before-school':
      content = {
        eyebrow: periodName(state.next),
        eyebrowDetail: `${clock(state.next.start)}–${clock(state.next.end)}`,
        title: lessonTitle(state.next),
        subtitle: noteOf(state.next),
        footer: state.minutes <= COUNTDOWN_LIMIT ? `${state.minutes} 分鐘後上課` : `${clock(state.next.start)} 上課`,
        footerDetail: `${clock(state.lastEnd)} 放學`,
      };
      break;
    case 'class':
      content = {
        eyebrow: periodName(state.slot),
        eyebrowDetail: `${clock(state.slot.start)}–${clock(state.slot.end)}`,
        title: state.slot.subject || '空堂',
        subtitle: state.slot.note || (state.doubleUntil !== null ? `連堂到 ${clock(state.doubleUntil)}` : undefined),
        footer: `${state.minutes} 分鐘後下課`,
        footerDetail: state.next ? `下一節 ${lessonTitle(state.next)} ${clock(state.next.start)}` : '今天最後一節',
      };
      break;
    case 'break':
      content = {
        eyebrow: `下課 · 接下來${periodName(state.next)}`,
        eyebrowDetail: `${clock(state.next.start)}–${clock(state.next.end)}`,
        title: lessonTitle(state.next),
        subtitle: noteOf(state.next),
        footer: `${state.minutes} 分鐘後上課`,
      };
      break;
    case 'lunch':
      content = {
        eyebrow: '午餐',
        eyebrowDetail: `${clock(state.start)}–${clock(state.end)}`,
        title: '午餐時間',
        footer: `${state.minutes} 分鐘後上課`,
        footerDetail: `${periodName(state.next)} ${lessonTitle(state.next)} ${clock(state.next.start)}`,
      };
      break;
    case 'after-school':
      content = {
        eyebrow: '今天的課上完了',
        eyebrowDetail: clock(minutesOfDay(now)),
        title: '放學了',
        subtitle: state.upcoming
          ? `${dayLabel(state.upcoming.date, now)} ${clock(state.upcoming.slot.start)} ${periodName(state.upcoming.slot)} ${lessonTitle(state.upcoming.slot)}`
          : undefined,
      };
      break;
    case 'exam':
      content = {
        eyebrow: '今天考試',
        eyebrowDetail: state.exam.days > 1 ? `第 ${state.exam.day} 天，共 ${state.exam.days} 天` : undefined,
        title: state.exam.title,
        subtitle: '祝考試順利！',
      };
      break;
    case 'day-off': {
      // A break of more than today ends the day before the next class.
      const lastDayOff = state.upcoming ? addDays(state.upcoming.date, -1) : null;
      content = {
        eyebrow: '今天不用上課',
        eyebrowDetail: `星期${WEEKDAY_ZH[now.getDay()]}`,
        title: state.name,
        subtitle: lastDayOff && !isSameDay(lastDayOff, now) && lastDayOff > now ? `連假到 ${formatMonthDayZh(lastDayOff)}` : undefined,
        details: state.upcoming
          ? [
              {
                key: 'next',
                label: '下次上課',
                value: `${dayLabel(state.upcoming.date, now)} ${clock(state.upcoming.slot.start)} ${lessonTitle(state.upcoming.slot)}`,
              },
            ]
          : undefined,
      };
      break;
    }
    case 'no-timetable':
      // Tapping the card opens 設定 either way (the screen's cardTarget).
      content = state.hasClass
        ? { eyebrow: '現在', title: '還沒有課表', subtitle: '找不到這個班級的課表，可在設定換一班。' }
        : { eyebrow: '現在', title: '選擇班級', subtitle: '選好班級，就能看到現在的課。' };
      break;
  }
  const spoken = [
    content.eyebrow,
    content.eyebrowDetail,
    content.title,
    content.subtitle,
    content.footer,
    content.footerDetail,
    ...(content.details ?? []).map((line) => `${line.label} ${line.value}`),
  ];
  return {
    ...content,
    rail: rail && hasRail(state) ? rail : undefined,
    accessibilityLabel: spoken.filter((part): part is string => !!part).join('，'),
  };
}
