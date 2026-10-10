// 今天's sections under the 現在 card, each switchable in 設定: 今日, 午餐,
// 回家 and the pinned 校網 items. Each loads only what it shows, so a hidden
// section costs nothing. Layout per docs/design/native-ui.md, "今天 (Today)".
import { router } from 'expo-router';

import { icons } from '@/components/icons';
import { openNearSchool, shortName } from '@/features/food/food-view';
import { useRestaurants } from '@/features/food/use-restaurants';
import { formatShortRange } from '@/features/todo/calendar-view';
import { nextSchoolDay, schoolDayOf, upcomingExam, type SchoolCalendarContext } from '@/features/todo/school-days';
import { editTodo, todoSubtitle, toggleTodo } from '@/features/todo/todo-rows';
import { isCompleted, visibleTodos } from '@/features/todo/todo-state';
import { formatMonthDayZh, fromDateKey, isSameDay, minutesOfDay, toDateKey } from '@/lib/dates';
import { openWebsite } from '@/lib/open-link';
import { useNewsStore } from '@/store/news';
import { useTodoStore } from '@/store/todo';
import { ButtonRow, CheckRow, Row, Section, TextBlock } from '@/ui';

import type { CommuteLine } from './commute';
import { dayLabel } from './now';
import { agendaEvents, agendaSubtitle, formatPinnedDate, todosDueOn } from './today';

/** Exams further away than this many days are not counted down on 今天. */
const EXAM_HORIZON_DAYS = 21;

const openCalendar = () => router.navigate('/(tabs)/todo');
const openTransport = () => router.navigate('/(tabs)/campus/transport');

/** 今日: today's todos, the day's events and the next exam, counted down. */
export function AgendaSection({ now, calendar }: { now: Date; calendar: SchoolCalendarContext }) {
  const todos = useTodoStore((state) => state.todos);
  const ownEvents = useTodoStore((state) => state.events);
  // A todo checked off stays, checked, until the day ends (todo-state.ts).
  const todayTodos = todosDueOn(visibleTodos(todos, now), now);
  const events = agendaEvents(now, calendar.events, ownEvents, calendar.grade);
  const exam = upcomingExam(now, calendar);
  const showExam = exam !== null && exam.daysUntil > 0 && exam.daysUntil <= EXAM_HORIZON_DAYS;

  return (
    <Section title="今日" prominent>
      {todayTodos.map((todo) => (
        <CheckRow
          key={todo.id}
          title={todo.title}
          subtitle={todoSubtitle(todo)}
          checked={isCompleted(todo)}
          onCheckedChange={(checked) => toggleTodo(todo, checked)}
          onPress={() => editTodo(todo)}
        />
      ))}
      {events.map((event) => (
        <Row
          key={event.id}
          title={event.title}
          subtitle={agendaSubtitle(event, now)}
          dotColor={event.category.color}
          dotShape="square"
          onPress={openCalendar}
        />
      ))}
      {exam && showExam ? (
        // A one-day exam is just its date; formatShortRange would print 10月13日–13日.
        <Row
          title={exam.title}
          subtitle={exam.startDate === exam.endDate ? formatMonthDayZh(fromDateKey(exam.startDate)) : formatShortRange(exam.startDate, exam.endDate)}
          detail={`還有 ${exam.daysUntil} 天`}
          detailProminent
          mark={{ kind: 'glyph', text: '考' }}
          onPress={openCalendar}
        />
      ) : null}
      {todayTodos.length + events.length === 0 && !showExam ? <TextBlock text="今天沒有待辦或活動。" secondary /> : null}
    </Section>
  );
}

/**
 * 午餐: 熱食部 (today's menu until lunch ends, then the next school day's)
 * and how many restaurants are open nearby, nearest first by their nicknames.
 */
export function LunchSection({ now, calendar, lunchEnd }: { now: Date; calendar: SchoolCalendarContext; lunchEnd: number }) {
  const restaurants = useRestaurants();
  const lunchAhead = schoolDayOf(now, calendar).kind === 'school' && minutesOfDay(now) < lunchEnd;
  const menuDay = lunchAhead ? now : nextSchoolDay(now, calendar);
  let menuLabel = '這週的菜單';
  if (menuDay) menuLabel = isSameDay(menuDay, now) ? '今天的菜單' : `${dayLabel(menuDay, now)}的菜單`;

  const open = restaurants.data ? openNearSchool(restaurants.data, now) : null;
  let nearbyTitle = '附近的餐廳';
  if (open) nearbyTitle = open.length > 0 ? `附近 ${open.length} 間營業中` : '附近的店都休息了';

  return (
    <Section title="午餐" prominent>
      <Row
        title="熱食部"
        subtitle={menuLabel}
        accessory="chevron"
        onPress={() =>
          router.navigate({ pathname: '/(tabs)/food', params: menuDay ? { view: 'menu', date: toDateKey(menuDay) } : { view: 'menu' } })}
      />
      <Row
        title={nearbyTitle}
        subtitle={open?.length ? open.slice(0, 4).map((restaurant) => shortName(restaurant.name)).join(' · ') : undefined}
        accessory="chevron"
        onPress={() => router.navigate({ pathname: '/(tabs)/food', params: { view: 'nearby' } })}
      />
    </Section>
  );
}

/** 回家: the followed stations' numbers; `live` says whether they are polled now. */
export function CommuteSection({ lines, live }: { lines: readonly CommuteLine[]; live: boolean }) {
  return (
    <Section title="回家" prominent footer={live ? '約每分鐘更新。' : '上學前和放學後約每分鐘更新。'}>
      {lines.length > 0 ? (
        lines.map((line) => (
          <Row
            key={line.key}
            title={line.name}
            subtitle={line.kind === 'youbike' ? 'YouBike' : '捷運'}
            detail={line.value}
            icon={line.kind === 'youbike' ? icons.bike : icons.metro}
            onPress={openTransport}
          />
        ))
      ) : (
        <Row title="加入常用的 YouBike 與捷運站" icon={icons.add} accessory="chevron" onPress={openTransport} />
      )}
    </Section>
  );
}

/** The 校網 items the user pinned, opening in the browser. */
export function PinnedSection() {
  const pinned = useNewsStore((state) => state.pinned);
  return (
    <Section title="釘選的校網消息" prominent>
      {pinned.length > 0 ? (
        pinned.map((item) => (
          <Row
            key={item.title}
            title={item.title}
            titleLines={3}
            subtitle={formatPinnedDate(item.pubDate)}
            accessory="external"
            onPress={() => void openWebsite(item.link)}
          />
        ))
      ) : (
        <TextBlock text="還沒有釘選的消息。" secondary />
      )}
      <ButtonRow label="查看校網" icon={icons.newspaper} onPress={() => router.navigate('/(tabs)/campus/news')} />
    </Section>
  );
}
