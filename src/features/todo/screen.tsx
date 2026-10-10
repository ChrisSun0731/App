// 行事曆: a month calendar with the selected day's events and todos, what
// comes next, and a link to every todo. Layout per docs/design/native-ui.md,
// "行事曆 (Todo)". School 行事曆 events are merged in read-only, by default
// only those for the user's grade (the footer under the month is the one
// switch here; 設定 has the other); days off are marked 假 and exam days 考.
// A todo checked off stays, checked, until the day ends (todo-state.ts).
import { router } from 'expo-router';
import { useState } from 'react';

import { HeaderActions } from '@/components/header-actions';
import { icons } from '@/components/icons';
import { fromDateKey, toDateKey, WEEKDAY_ZH } from '@/lib/dates';
import { useScheduleStore } from '@/store/schedule';
import { useSettingsStore } from '@/store/settings';
import { useTodoStore } from '@/store/todo';
import { BRAND, usePalette } from '@/theme/palette';
import { CheckRow, ListScreen, Loading, MonthCalendar, Notice, Row, Section, TextBlock } from '@/ui';

import { itemsForDay, monthTitle } from './calendar-grid';
import {
  calendarCells,
  eventRowText,
  eventsForGrade,
  eventSource,
  formatDayTitle,
  formatShortRange,
  gradeFilterFooter,
  spacedTerm,
  upcomingItems,
} from './calendar-view';
import { isSchoolEvent } from './school-calendar';
import { gradeOfClass } from './school-days';
import { editEvent, editTodo, eventActions, todoActions, todoSubtitle, toggleTodo } from './todo-rows';
import { isCompleted, openTodos, visibleTodos } from './todo-state';
import type { CalendarEvent } from './types';
import { useSchoolEvents } from './use-school-events';

/**
 * Title lines for a read-only school event row. It opens nothing, so the
 * whole title has to fit in the row: titles run to ~40 characters and large
 * text sizes wrap them over many lines.
 */
const SCHOOL_TITLE_LINES = 10;

/**
 * The todo squares' colour: the tint as "#RRGGBB", which the kit's
 * indicators take. Android's palette roles are already hex strings; iOS's
 * tint is a DynamicColorIOS, so pick its variant (use-palette.ios.ts).
 */
function useTodoColor(): string {
  const palette = usePalette();
  if (typeof palette.tint === 'string') return palette.tint;
  return palette.scheme === 'dark' ? '#8EAEFF' : BRAND;
}

/** 接下來's line under an event: where it is from, and its days when more than one. */
function upcomingEventSubtitle(event: CalendarEvent): string {
  return event.startDate === event.endDate
    ? eventSource(event)
    : `${eventSource(event)} · ${formatShortRange(event.startDate, event.endDate)}`;
}

export default function TodoScreen() {
  const events = useTodoStore((state) => state.events);
  const allTodos = useTodoStore((state) => state.todos);
  const school = useSchoolEvents();
  const todoColor = useTodoColor();
  const grade = gradeOfClass(useScheduleStore((state) => state.userClass));
  const gradeOnly = useSettingsStore((state) => state.calendarGradeOnly) && grade !== null;
  const setGradeOnly = useSettingsStore((state) => state.setCalendarGradeOnly);

  const [month, setMonth] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));

  const today = new Date();
  const todayKey = toDateKey(today);
  // The React Compiler memoizes these on their inputs (todayKey included, so
  // after midnight the today marker moves and yesterday's done todos go).
  const todayStart = fromDateKey(todayKey);
  const todos = visibleTodos(allTodos, todayStart);
  // Only with a known grade: the filter needs one.
  const forGrade = grade !== null ? eventsForGrade(school.events, grade, month) : null;
  const allEvents = [...events, ...(gradeOnly && forGrade ? forGrade.events : school.events)];
  const cells = calendarCells(month.year, month.month, allEvents, todos, todoColor, todayStart, grade);
  const filterFooter = gradeFilterFooter(grade, gradeOnly, forGrade?.hidden ?? 0);
  const items = itemsForDay(selectedDate, allEvents, todos);
  const hasSchoolEvents = items.some((item) => item.type === 'event' && isSchoolEvent(item.event));
  const upcoming = upcomingItems(selectedDate, allEvents, todos);
  const open = openTodos(todos);

  function showMonth(offset: number) {
    const first = new Date(month.year, month.month + offset, 1);
    setMonth({ year: first.getFullYear(), month: first.getMonth() });
    // Moving month selects its first day, as before.
    setSelectedDate(toDateKey(first));
  }

  // 接下來 looks 14 days ahead, which can be in the next month, so the grid has to follow the selection.
  function showDay(date: Date) {
    setMonth({ year: date.getFullYear(), month: date.getMonth() });
    setSelectedDate(toDateKey(date));
  }

  function showToday() {
    showDay(new Date());
  }

  // New items default to the selected day, as before.
  function addTodo() {
    router.push({ pathname: '/todo-editor', params: { date: selectedDate } });
  }

  function addEvent() {
    router.push({ pathname: '/event-editor', params: { date: selectedDate } });
  }

  return (
    <>
      <HeaderActions
        left={[
          // The chevrons pair as a stepper; the text button sits apart from them.
          { kind: 'icon', key: 'previous', label: '上個月', icon: icons.chevronLeft, onPress: () => showMonth(-1) },
          { kind: 'icon', key: 'next', label: '下個月', icon: icons.chevronRight, onPress: () => showMonth(1) },
          { kind: 'space', key: 'gap' },
          { kind: 'text', key: 'today', label: '今天', onPress: showToday },
        ]}
        right={[
          {
            kind: 'menu',
            key: 'add',
            label: '新增待辦或活動',
            icon: icons.add,
            actions: [
              { key: 'todo', label: '新增待辦', icon: icons.todo, onPress: addTodo },
              { key: 'event', label: '新增活動', icon: icons.event, onPress: addEvent },
            ],
          },
        ]}
      />
      <ListScreen
        subtitle={[monthTitle(month.year, month.month), school.term ? spacedTerm(school.term) : ''].filter(Boolean).join(' · ')}
        onRefresh={() => school.refetch()}
        fab={{ label: '新增待辦', icon: icons.add, onPress: addTodo }}>
        <Section
          footer={filterFooter?.text}
          footerAction={filterFooter ? { label: filterFooter.action.label, onPress: () => setGradeOnly(filterFooter.action.gradeOnly) } : undefined}>
          <MonthCalendar weekdays={WEEKDAY_ZH} cells={cells} selectedKey={selectedDate} onSelect={setSelectedDate} />
          {school.isPending ? <Loading label="正在載入學校行事曆…" /> : null}
          {school.error ? (
            <Notice
              tone="error"
              title="學校行事曆暫時無法更新。"
              message="下拉可重試。"
              action={{ label: '重試', onPress: () => void school.refetch() }}
            />
          ) : null}
        </Section>

        <Section title={formatDayTitle(selectedDate, today)} footer={hasSchoolEvents ? '學校活動僅供查看，無法修改。' : undefined}>
          {items.length === 0 ? <TextBlock text="這一天沒有活動或待辦。" secondary /> : null}
          {items.map((item) => {
            if (item.type === 'todo') {
              return (
                <CheckRow
                  key={item.key}
                  title={item.todo.title}
                  subtitle={todoSubtitle(item.todo)}
                  checked={isCompleted(item.todo)}
                  onCheckedChange={(checked) => toggleTodo(item.todo, checked)}
                  onPress={() => editTodo(item.todo)}
                  actions={todoActions(item.todo)}
                />
              );
            }
            const { event } = item;
            const readOnly = isSchoolEvent(event);
            return (
              <Row
                key={item.key}
                title={event.title}
                titleLines={readOnly ? SCHOOL_TITLE_LINES : undefined}
                dotColor={event.category.color}
                dotShape="square"
                subtitle={eventRowText(event).subtitle}
                accessory={readOnly ? 'none' : 'chevron'}
                onPress={readOnly ? undefined : () => editEvent(event)}
                actions={readOnly ? undefined : eventActions(event)}
              />
            );
          })}
        </Section>

        {upcoming.length > 0 ? (
          <Section title="接下來">
            {upcoming.map(({ key, date, item }) => {
              const mark = { kind: 'date' as const, weekday: WEEKDAY_ZH[date.getDay()], day: String(date.getDate()) };
              if (item.type === 'todo') {
                return (
                  <Row
                    key={key}
                    title={item.todo.title}
                    subtitle={todoSubtitle(item.todo)}
                    mark={mark}
                    accessibilityLabel={`${formatDayTitle(toDateKey(date), today)}，${item.todo.title}，${todoSubtitle(item.todo)}`}
                    onPress={() => editTodo(item.todo)}
                  />
                );
              }
              const readOnly = isSchoolEvent(item.event);
              return (
                <Row
                  key={key}
                  title={item.event.title}
                  subtitle={upcomingEventSubtitle(item.event)}
                  mark={mark}
                  accessibilityLabel={`${formatDayTitle(toDateKey(date), today)}，${item.event.title}，${upcomingEventSubtitle(item.event)}`}
                  onPress={readOnly ? () => showDay(date) : () => editEvent(item.event)}
                />
              );
            })}
          </Section>
        ) : null}

        <Section>
          <Row
            title="所有待辦"
            detail={open.length > 0 ? `${open.length} 項` : undefined}
            icon={icons.todo}
            accessory="chevron"
            onPress={() => router.push('/(tabs)/todo/list')}
          />
        </Section>
      </ListScreen>
    </>
  );
}
