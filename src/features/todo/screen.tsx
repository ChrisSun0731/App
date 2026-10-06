// 行事曆: a month calendar with the selected day's events and todos, or the
// todo list grouped by date. Layout per docs/design/native-ui.md, "行事曆
// (Todo)". School 行事曆 events are merged in read-only.
import { router } from 'expo-router';
import { useState } from 'react';

import { HeaderActions } from '@/components/header-actions';
import { icons } from '@/components/icons';
import { useNow } from '@/hooks/use-now';
import { useRefresh } from '@/hooks/use-refresh';
import { PULL_TO_RETRY, RETRY } from '@/lib/copy';
import { fromDateKey, toDateKey, WEEKDAY_ZH } from '@/lib/dates';
import { useTodoStore } from '@/store/todo';
import { BRAND, BRAND_DARK } from '@/theme/brand';
import { usePalette } from '@/theme/palette';
import {
  ButtonRow,
  CheckRow,
  EmptyState,
  ListScreen,
  Loading,
  MonthCalendar,
  Notice,
  PickerRow,
  Row,
  Section,
  TextBlock,
  type ChoiceOption,
  type RowAction,
} from '@/ui';

import { itemsForDay, monthTitle } from './calendar-grid';
import {
  ALL_TODOS,
  calendarCells,
  effectiveFilter,
  eventRowText,
  filterTodos,
  formatDayTitle,
  todoFilterOptions,
  todoSections,
} from './calendar-view';
import { confirmDeleteEvent, confirmDeleteTodo } from './confirm-delete';
import { isSchoolEvent } from './school-calendar';
import type { CalendarEvent, Todo, TodoView } from './types';
import { useSchoolEvents } from './use-school-events';

/**
 * Title lines for a read-only school event row. It opens nothing, so the
 * whole title has to fit in the row: titles run to ~40 characters and large
 * text sizes wrap them over many lines.
 */
const SCHOOL_TITLE_LINES = 10;

const VIEW_OPTIONS: readonly ChoiceOption<TodoView>[] = [
  { label: '月曆', value: 'calendar' },
  { label: '待辦', value: 'todoList' },
];

/**
 * The todo squares' colour: the tint as "#RRGGBB", which the kit's
 * indicators take. Android's palette roles are already hex strings; iOS's
 * tint is a DynamicColorIOS, so pick its variant (use-palette.ios.ts).
 */
function useTodoColor(): string {
  const palette = usePalette();
  if (typeof palette.tint === 'string') return palette.tint;
  return palette.scheme === 'dark' ? BRAND_DARK : BRAND;
}

function editTodo(todo: Todo) {
  router.push({ pathname: '/todo-editor', params: { id: todo.id } });
}

function editEvent(event: CalendarEvent) {
  router.push({ pathname: '/event-editor', params: { id: event.id } });
}

function completeTodo(todo: Todo, checked: boolean) {
  // Checking a todo completes it, which removes it (as before).
  if (checked) useTodoStore.getState().completeTodo(todo.id);
}

function todoActions(todo: Todo): RowAction[] {
  return [{ key: 'delete', label: '刪除', icon: icons.delete, destructive: true, onPress: () => confirmDeleteTodo(todo) }];
}

function eventActions(event: CalendarEvent): RowAction[] {
  return [
    { key: 'edit', label: '編輯', icon: icons.edit, onPress: () => editEvent(event) },
    { key: 'delete', label: '刪除', icon: icons.delete, destructive: true, onPress: () => confirmDeleteEvent(event) },
  ];
}

export default function TodoScreen() {
  const events = useTodoStore((state) => state.events);
  const todos = useTodoStore((state) => state.todos);
  const todoCategories = useTodoStore((state) => state.todoCategories);
  const view = useTodoStore((state) => state.view);
  const setView = useTodoStore((state) => state.setView);
  const school = useSchoolEvents();
  // 重試 shows a loading row in the notice's place until it settles.
  const retrySchool = useRefresh(() => school.refetch({ cancelRefetch: false }));
  const todoColor = useTodoColor();
  // Ticks while 行事曆 is focused (and catches up on return), so the 今天
  // marks, the day title and the 已過期 groups move on after midnight.
  const now = useNow();

  const [month, setMonth] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  // Not persisted, as before: the list opens on every todo.
  const [filter, setFilter] = useState(ALL_TODOS);

  const allEvents = [...events, ...school.events];
  const cells = calendarCells(month.year, month.month, allEvents, todos, todoColor, fromDateKey(toDateKey(now)));

  function showMonth(offset: number) {
    const first = new Date(month.year, month.month + offset, 1);
    setMonth({ year: first.getFullYear(), month: first.getMonth() });
    // Moving month selects its first day, as before.
    setSelectedDate(toDateKey(first));
  }

  function showToday() {
    const date = new Date();
    setMonth({ year: date.getFullYear(), month: date.getMonth() });
    setSelectedDate(toDateKey(date));
  }

  // New items default to the selected day, as before (in both views).
  function addTodo() {
    router.push({ pathname: '/todo-editor', params: { date: selectedDate } });
  }

  function addEvent() {
    router.push({ pathname: '/event-editor', params: { date: selectedDate } });
  }

  function renderCalendar() {
    const items = itemsForDay(selectedDate, allEvents, todos);
    const hasSchoolEvents = items.some((item) => item.type === 'event' && isSchoolEvent(item.event));
    return (
      <>
        <Section key="calendar" footer={`${school.term ? `${school.term} · ` : ''}圓點為活動，方點為待辦。`}>
          <MonthCalendar
            title={monthTitle(month.year, month.month)}
            weekdays={WEEKDAY_ZH}
            cells={cells}
            selectedKey={selectedDate}
            onSelect={setSelectedDate}
            onPrevious={() => showMonth(-1)}
            onNext={() => showMonth(1)}
            onToday={showToday}
          />
          {school.isPending || retrySchool.refreshing ? <Loading label="正在載入學校行事曆…" /> : null}
          {school.error && !retrySchool.refreshing ? (
            <Notice
              tone="error"
              title="學校行事曆暫時無法更新"
              message={PULL_TO_RETRY}
              action={{ label: RETRY, onPress: () => void retrySchool.refresh() }}
            />
          ) : null}
        </Section>

        <Section
          key="day"
          title={formatDayTitle(selectedDate, now)}
          footer={hasSchoolEvents ? '學校活動僅供查看，無法修改。' : undefined}>
          {items.length === 0 ? <TextBlock text="這一天沒有活動或待辦。" secondary /> : null}
          {items.map((item) => {
            if (item.type === 'todo') {
              return (
                <CheckRow
                  key={item.key}
                  title={item.todo.title}
                  subtitle={item.todo.category?.name}
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
                {...eventRowText(event)}
                accessory={readOnly ? 'none' : 'chevron'}
                onPress={readOnly ? undefined : () => editEvent(event)}
                actions={readOnly ? undefined : eventActions(event)}
              />
            );
          })}
        </Section>
      </>
    );
  }

  function renderTodoList() {
    const activeFilter = effectiveFilter(filter, todos, todoCategories);
    const sections = todoSections(filterTodos(todos, activeFilter), now);
    return (
      <>
        <Section key="filter" footer="勾選待辦即完成並移除。">
          <PickerRow
            label="顯示類別"
            icon={icons.label}
            value={activeFilter}
            options={todoFilterOptions(todos, todoCategories)}
            onChange={setFilter}
          />
          <ButtonRow
            label="管理待辦類別"
            icon={icons.folder}
            onPress={() => router.push({ pathname: '/categories', params: { kind: 'todo' } })}
          />
        </Section>

        {sections.length === 0 ? (
          <Section key="empty" plain>
            {/* No add action: the header's + (and Android's FAB) is right there. */}
            <EmptyState icon={icons.todo} title="目前沒有待辦事項" />
          </Section>
        ) : null}
        {sections.map((section) => (
          <Section key={section.key} title={section.title} footer={section.overdue ? '已過期' : undefined}>
            {section.todos.map((todo) => (
              <CheckRow
                key={todo.id}
                title={todo.title}
                subtitle={todo.category?.name}
                checked={false}
                onCheckedChange={(checked) => completeTodo(todo, checked)}
                onPress={() => editTodo(todo)}
                actions={todoActions(todo)}
              />
            ))}
          </Section>
        ))}
      </>
    );
  }

  return (
    <>
      <HeaderActions
        right={[
          {
            kind: 'menu',
            key: 'add',
            label: '新增',
            icon: icons.add,
            actions: [
              { key: 'todo', label: '新增待辦', icon: icons.todo, onPress: addTodo },
              { key: 'event', label: '新增活動', icon: icons.event, onPress: addEvent },
            ],
          },
        ]}
      />
      <ListScreen onRefresh={() => school.refetch()} fab={{ label: '新增待辦', icon: icons.add, onPress: addTodo }}>
        <Section key="view" plain>
          <PickerRow label="檢視" variant="segmented" value={view} options={VIEW_OPTIONS} onChange={setView} />
        </Section>
        {view === 'calendar' ? renderCalendar() : renderTodoList()}
      </ListScreen>
    </>
  );
}
