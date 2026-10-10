// 行事曆: a month calendar with the selected day's events and todos, what
// comes next, and a link to every todo. Layout per docs/design/native-ui.md,
// "行事曆 (Todo)". School 行事曆 events are merged in read-only, by default
// only those for the user's grade; days off are marked 假 and exam days 考.
import { router } from 'expo-router';
import { useState } from 'react';

import { HeaderActions, type HeaderItem } from '@/components/header-actions';
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
  otherGrades,
  spacedTerm,
  upcomingItems,
} from './calendar-view';
import { isSchoolEvent } from './school-calendar';
import { GRADE_LABELS, gradeOfClass } from './school-days';
import { completeTodo, editEvent, editTodo, eventActions, todoActions, todoSubtitle } from './todo-rows';
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
  const todos = useTodoStore((state) => state.todos);
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
  // the today marker moves after midnight).
  const schoolShown = gradeOnly ? eventsForGrade(school.events, grade, month) : { events: school.events, hidden: 0 };
  const allEvents = [...events, ...schoolShown.events];
  const cells = calendarCells(month.year, month.month, allEvents, todos, todoColor, fromDateKey(todayKey), grade);
  const hidden = schoolShown.hidden > 0 && grade !== null;
  const items = itemsForDay(selectedDate, allEvents, todos);
  const hasSchoolEvents = items.some((item) => item.type === 'event' && isSchoolEvent(item.event));
  const upcoming = upcomingItems(selectedDate, allEvents, todos);

  function showMonth(offset: number) {
    const first = new Date(month.year, month.month + offset, 1);
    setMonth({ year: first.getFullYear(), month: first.getMonth() });
    // Moving month selects its first day, as before.
    setSelectedDate(toDateKey(first));
  }

  function showToday() {
    const now = new Date();
    setMonth({ year: now.getFullYear(), month: now.getMonth() });
    setSelectedDate(toDateKey(now));
  }

  // New items default to the selected day, as before.
  function addTodo() {
    router.push({ pathname: '/todo-editor', params: { date: selectedDate } });
  }

  function addEvent() {
    router.push({ pathname: '/event-editor', params: { date: selectedDate } });
  }

  // Only with a known grade: the filter needs one.
  const filterMenu: HeaderItem[] = grade !== null
    ? [{
        kind: 'menu',
        key: 'filter',
        label: '篩選',
        icon: gradeOnly ? icons.filterActive : icons.filter,
        actions: [{
          key: 'grade',
          label: `只顯示${GRADE_LABELS[grade]}的學校活動`,
          selected: gradeOnly,
          onPress: () => setGradeOnly(!gradeOnly),
        }],
      }]
    : [];

  return (
    <>
      <HeaderActions
        left={[
          { kind: 'icon', key: 'previous', label: '上個月', icon: icons.chevronLeft, onPress: () => showMonth(-1) },
          { kind: 'text', key: 'today', label: '今天', onPress: showToday },
          { kind: 'icon', key: 'next', label: '下個月', icon: icons.chevronRight, onPress: () => showMonth(1) },
        ]}
        right={[
          ...filterMenu,
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
          footer={hidden ? `已隱藏 ${schoolShown.hidden} 則只給${otherGrades(grade)}的活動。` : undefined}
          footerAction={hidden ? { label: '全部顯示', onPress: () => setGradeOnly(false) } : undefined}>
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
                  checked={false}
                  onCheckedChange={(checked) => completeTodo(item.todo, checked)}
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
                  onPress={readOnly ? () => setSelectedDate(toDateKey(date)) : () => editEvent(item.event)}
                />
              );
            })}
          </Section>
        ) : null}

        <Section>
          <Row
            title="所有待辦"
            detail={todos.length > 0 ? `${todos.length} 項` : undefined}
            icon={icons.todo}
            accessory="chevron"
            onPress={() => router.push('/(tabs)/todo/list')}
          />
        </Section>
      </ListScreen>
    </>
  );
}
