// The 現在 widget's timeline: what the Home Screen and Lock Screen widgets
// show from each bell to the next, built from the same moment-of-the-day
// states as 今天's 現在 card (features/home/now.ts). The timetable is on the
// phone, so the whole school day is scheduled ahead with one entry per bell;
// the countdown between bells is drawn live by the widget itself. Pure, so it
// is unit-tested (now-timeline.test.ts).
import {
  dayLabel,
  hasRail,
  isLesson,
  LUNCH_GAP,
  nowState,
  railOf,
  slotsOn,
  type NowInput,
  type NowState,
  type Slot,
} from '@/features/home/now';
import { addDays, clock, minutesOfDay } from '@/lib/dates';

/** What one widget entry shows; plain JSON, as the widget extension receives it. */
export interface NowWidgetProps {
  /** e.g. 第三節, 下課, 午餐, 今天不用上課 */
  eyebrow: string;
  /** e.g. the subject, 放學了, 國慶日補假 */
  title: string;
  /** e.g. 10:10–11:00 */
  detail?: string;
  /** A time (ms) to count down to, e.g. the bell; absent when nothing counts down. */
  until?: number;
  /** After the countdown: 後下課 / 後上課 */
  untilLabel?: string;
  /** e.g. 接下來 英語文 11:10 */
  next?: string;
  /** The school day's bell rail, one mark per period and lunch (small and medium widgets). */
  rail?: NowWidgetRailMark[];
  /** What comes later today (medium widget), e.g. 英語文 11:10, 午餐 12:00, 地理 · 連堂 13:00. */
  upcoming?: { title: string; time: string }[];
}

export interface NowWidgetRailMark {
  kind: 'lesson' | 'free' | 'lunch';
  state: 'past' | 'now' | 'ahead';
}

/** Medium widget rows. */
const UPCOMING_LIMIT = 4;

/** Further ahead than this, the timeline stops (the app refreshes it when opened). */
const HORIZON_HOURS = 36;

const lessonTitle = (slot: Slot) => slot.subject || slot.note || '空堂';

/** Minutes since midnight on `day` as a timestamp. */
function at(day: Date, minutes: number): number {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes).getTime();
}

/** The rail at `now`, while the day has one (as on 今天's card). */
function widgetRail(state: NowState, now: Date, slots: readonly Slot[]): NowWidgetRailMark[] | undefined {
  const rail = hasRail(state) ? railOf(now, slots) : null;
  return rail?.segments.map((segment) => ({
    kind: segment.kind,
    state: segment.progress >= 1 ? 'past' : segment.current ? 'now' : 'ahead',
  }));
}

/** Lessons starting after `now` (a 連堂 once) and lunch, in order, at most UPCOMING_LIMIT. */
export function upcomingToday(now: Date, slots: readonly Slot[]): { title: string; time: string }[] {
  const time = minutesOfDay(now);
  const items: { title: string; time: string }[] = [];
  slots.forEach((slot, index) => {
    const previous = slots[index - 1];
    if (previous && slot.start - previous.end >= LUNCH_GAP && previous.end >= time) {
      items.push({ title: '午餐', time: clock(previous.end) });
    }
    if (!isLesson(slot) || slot.start <= time) return;
    // Only a real subject continues, as doubleUntil in now.ts: two note-only
    // slots in a row (自習, then 班會) are separate lessons, not a 連堂.
    const continues =
      previous !== undefined && slot.subject !== '' && previous.subject === slot.subject && slot.start - previous.end < LUNCH_GAP;
    if (continues) {
      // The same lesson goes on: one row, marked 連堂 (unless it is the one in session).
      const last = items[items.length - 1];
      if (previous.start > time && last && !last.title.endsWith(' · 連堂')) last.title += ' · 連堂';
      return;
    }
    items.push({ title: lessonTitle(slot), time: clock(slot.start) });
  });
  return items.slice(0, UPCOMING_LIMIT);
}

/** The widget's words for `state` at `now`, with the day's rail and what comes next from `slots`. */
export function widgetProps(state: NowState, now: Date, slots: readonly Slot[] = []): NowWidgetProps {
  const props = widgetText(state, now);
  const rail = widgetRail(state, now, slots);
  const upcoming = state.kind === 'after-school' || state.kind === 'day-off' || state.kind === 'exam' ? [] : upcomingToday(now, slots);
  return { ...props, ...(rail ? { rail } : null), ...(upcoming.length ? { upcoming } : null) };
}

function widgetText(state: NowState, now: Date): NowWidgetProps {
  switch (state.kind) {
    case 'before-school':
      return {
        eyebrow: `第${state.next.period.name}節 ${clock(state.next.start)}`,
        title: lessonTitle(state.next),
        until: at(now, state.next.start),
        untilLabel: '後上課',
        next: `${clock(state.lastEnd)} 放學`,
      };
    case 'class':
      return {
        eyebrow: `第${state.slot.period.name}節`,
        title: state.slot.subject || '空堂',
        detail: `${clock(state.slot.start)}–${clock(state.slot.end)}`,
        until: at(now, state.slot.end),
        untilLabel: '後下課',
        next: state.next ? `接下來 ${lessonTitle(state.next)} ${clock(state.next.start)}` : '今天最後一節',
      };
    case 'break':
      return {
        eyebrow: '下課',
        title: lessonTitle(state.next),
        detail: `第${state.next.period.name}節 ${clock(state.next.start)}`,
        until: at(now, state.next.start),
        untilLabel: '後上課',
      };
    case 'lunch':
      return {
        eyebrow: '午餐',
        title: '午餐時間',
        until: at(now, state.next.start),
        untilLabel: '後上課',
        next: `第${state.next.period.name}節 ${lessonTitle(state.next)}`,
      };
    case 'after-school':
      return {
        eyebrow: '放學了',
        title: state.upcoming ? lessonTitle(state.upcoming.slot) : '今天的課上完了',
        next: state.upcoming
          ? `${dayLabel(state.upcoming.date, now)} ${clock(state.upcoming.slot.start)} 第${state.upcoming.slot.period.name}節`
          : undefined,
      };
    case 'exam':
      return { eyebrow: '今天考試', title: state.exam.title, next: '祝考試順利！' };
    case 'day-off':
      return {
        eyebrow: '今天不用上課',
        title: state.name,
        next: state.upcoming ? `下次上課 ${dayLabel(state.upcoming.date, now)} ${lessonTitle(state.upcoming.slot)}` : undefined,
      };
    case 'no-timetable':
      return { eyebrow: 'CK APP', title: '選擇班級', next: '打開 App 選擇班級' };
  }
}

/**
 * Entries from `from` over the next HORIZON_HOURS: one now, then one at
 * every bell (each period's start and end) and at each midnight, each
 * showing the state just after that moment.
 */
export function nowTimeline(input: Omit<NowInput, 'now'>, from: Date): { date: Date; props: NowWidgetProps }[] {
  const end = from.getTime() + HORIZON_HOURS * 3_600_000;
  const moments = new Set<number>([from.getTime()]);
  for (let day = new Date(from.getFullYear(), from.getMonth(), from.getDate()); day.getTime() < end; day = addDays(day, 1)) {
    moments.add(day.getTime());
    for (const slot of slotsOn(day, input.periods, input.rows, input.semesterStart)) {
      moments.add(at(day, slot.start));
      moments.add(at(day, slot.end));
    }
  }
  return [...moments]
    .filter((moment) => moment >= from.getTime() && moment < end)
    .sort((a, b) => a - b)
    .map((moment) => {
      const date = new Date(moment);
      const slots = slotsOn(date, input.periods, input.rows, input.semesterStart);
      return { date, props: widgetProps(nowState({ ...input, now: date }), date, slots) };
    });
}
