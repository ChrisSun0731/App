import { Checkbox, Host } from '@expo/ui';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { ActionButton, Body, Card, Screen, Segment, Title } from '@/components/ui/page';
import { formatFullDate, formatMonthDay, fromDateKey, toDateKey, WEEKDAY_ZH } from '@/lib/dates';
import { useTodoStore } from '@/store/todo';
import { BRAND, usePalette } from '@/theme/palette';

import { buildMonthGrid, groupTodosByDate, itemsForDay, MAX_DAY_INDICATORS, monthTitle } from './calendar-grid';
import { TodoCategoryManager } from './category-managers';
import { ChoiceField } from './form-controls';
import { isSchoolEvent } from './school-calendar';
import type { CalendarEvent, Todo } from './types';
import { useSchoolEvents } from './use-school-events';

function TodoItem({ todo }: { todo: Todo }) {
  const router = useRouter();
  const palette = usePalette();
  const completeTodo = useTodoStore((state) => state.completeTodo);
  return <Card>
    <Host matchContents={{ vertical: true }} seedColor={BRAND} colorScheme={palette.scheme} style={{ width: '100%' }} ignoreSafeArea={Platform.OS === 'ios' ? 'all' : undefined}>
      <Checkbox label={todo.title} value={false} onValueChange={(checked) => { if (checked) completeTodo(todo.id); }} />
    </Host>
    {todo.category && <Body secondary>{todo.category.name}</Body>}
    <ActionButton label="編輯待辦" onPress={() => router.push({ pathname: '/todo-editor', params: { id: todo.id } })} />
  </Card>;
}

function EventItem({ event }: { event: CalendarEvent }) {
  const router = useRouter();
  const school = isSchoolEvent(event);
  return <Card>
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: event.category.color }} />
      <View style={{ flex: 1 }}><Body>{event.title}</Body></View>
    </View>
    <Body secondary>{event.category.name} · {formatFullDate(fromDateKey(event.startDate))}{event.endDate !== event.startDate ? ` – ${formatFullDate(fromDateKey(event.endDate))}` : ''}</Body>
    {school ? <>
      <Body secondary>{[event.school?.department, event.school?.tentative ? '暫定日期' : '', event.school?.approximate ? '約略日期' : '', '學校活動，僅供查看'].filter(Boolean).join(' · ')}</Body>
    </> : <ActionButton label="編輯活動" onPress={() => router.push({ pathname: '/event-editor', params: { id: event.id } })} />}
  </Card>;
}

export default function TodoScreen() {
  const router = useRouter();
  const palette = usePalette();
  const { events, todos, todoCategories, view, setView } = useTodoStore();
  const school = useSchoolEvents();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [category, setCategory] = useState('');
  const [manageCategories, setManageCategories] = useState(false);
  const allEvents = useMemo(() => [...events, ...school.events], [events, school.events]);
  const days = buildMonthGrid(month.getFullYear(), month.getMonth());
  const selectedItems = itemsForDay(selectedDate, allEvents, todos);
  const filteredTodos = category ? todos.filter((todo) => todo.category?.name === category) : todos;
  const categoryNames = [...new Set([...todoCategories.map((item) => item.name), ...todos.flatMap((todo) => todo.category ? [todo.category.name] : [])])];

  function moveMonth(offset: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(next);
    setSelectedDate(toDateKey(next));
  }

  return <Screen refreshing={school.isRefetching} onRefresh={() => { void school.refetch(); }}>
    <Title>行事曆與待辦</Title>
    <Segment options={['月曆', '待辦']} selectedIndex={view === 'calendar' ? 0 : 1} onChange={(index) => setView(index === 0 ? 'calendar' : 'todoList')} />
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <View style={{ flex: 1 }}><ActionButton label="新增待辦" onPress={() => router.push({ pathname: '/todo-editor', params: { date: selectedDate } })} /></View>
      <View style={{ flex: 1 }}><ActionButton label="新增活動" onPress={() => router.push({ pathname: '/event-editor', params: { date: selectedDate } })} /></View>
    </View>
    {view === 'calendar' ? <>
      <Card>
        <Text style={{ color: palette.text, fontSize: 20, fontWeight: '600', textAlign: 'center' }}>{monthTitle(month.getFullYear(), month.getMonth())}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><ActionButton label="上月" onPress={() => moveMonth(-1)} /></View>
          <View style={{ flex: 1 }}><ActionButton label="今天" onPress={() => { const today = new Date(); setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(toDateKey(today)); }} /></View>
          <View style={{ flex: 1 }}><ActionButton label="下月" onPress={() => moveMonth(1)} /></View>
        </View>
        <View style={{ flexDirection: 'row' }}>
          {WEEKDAY_ZH.map((day) => <Text key={day} style={{ width: `${100 / 7}%`, textAlign: 'center', color: palette.textSecondary }}>{day}</Text>)}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {days.map((day) => {
            const items = itemsForDay(day.key, allEvents, todos);
            const selected = day.key === selectedDate;
            return <Pressable
              key={day.key}
              accessibilityRole="button"
              accessibilityLabel={`${formatFullDate(day.date)}，${items.length}個活動與待辦`}
              accessibilityState={{ selected }}
              onPress={() => setSelectedDate(day.key)}
              style={{ width: `${100 / 7}%`, minHeight: 62, padding: 4, alignItems: 'center', gap: 6, borderRadius: 12, backgroundColor: selected ? palette.tintContainer : 'transparent' }}>
              <Text style={{ color: selected ? palette.onTintContainer : day.inMonth ? palette.text : palette.textTertiary, fontSize: 16, fontWeight: day.isToday || selected ? '700' : '400', textDecorationLine: day.isToday ? 'underline' : 'none' }}>{day.date.getDate()}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3, maxWidth: 30, justifyContent: 'center' }}>
                {items.slice(0, MAX_DAY_INDICATORS).map((item) => <View key={item.key} style={{ width: 6, height: 6, borderRadius: item.type === 'event' ? 3 : 1, backgroundColor: item.type === 'event' ? item.event.category.color : palette.tint }} />)}
              </View>
            </Pressable>;
          })}
        </View>
      </Card>
      <Body secondary>{school.term ? `${school.term} · ` : ''}圓點為活動，方點為待辦。</Body>
      {school.isPending && <Body secondary>正在載入學校行事曆…</Body>}
      {school.error && <Body secondary>學校行事曆暫時無法更新。下拉可重試。</Body>}
      <Title>{formatMonthDay(fromDateKey(selectedDate))}</Title>
      {selectedItems.length === 0 && <Body secondary>這一天沒有活動或待辦。</Body>}
      {selectedItems.map((item) => item.type === 'event' ? <EventItem key={item.key} event={item.event} /> : <TodoItem key={item.key} todo={item.todo} />)}
    </> : <>
      <Card>
        <ChoiceField label="顯示類別" value={category} options={[{ label: `所有待辦 (${todos.length})`, value: '' }, ...categoryNames.map((name) => ({ label: `${name} (${todos.filter((todo) => todo.category?.name === name).length})`, value: name }))]} onChange={setCategory} />
        <ActionButton label={manageCategories ? '關閉類別管理' : '管理待辦類別'} onPress={() => setManageCategories(!manageCategories)} />
      </Card>
      {manageCategories && <TodoCategoryManager />}
      {filteredTodos.length === 0 && <Body secondary>目前沒有待辦事項。</Body>}
      {groupTodosByDate(filteredTodos).map((group) => <View key={group.dateKey ?? 'undated'} style={{ gap: 12 }}>
        <Text style={{ color: group.dateKey && group.dateKey < toDateKey(new Date()) ? palette.danger : palette.textSecondary, fontSize: 17, fontWeight: '600' }}>{group.dateKey ? `${formatFullDate(fromDateKey(group.dateKey))} (${WEEKDAY_ZH[fromDateKey(group.dateKey).getDay()]})` : '無日期'}</Text>
        {group.todos.map((todo) => <TodoItem key={todo.id} todo={todo} />)}
      </View>)}
      <Body secondary>勾選待辦即完成並移除。</Body>
    </>}
  </Screen>;
}
