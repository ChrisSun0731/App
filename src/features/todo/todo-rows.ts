// Shared by 今天's 今日, 行事曆's day list and the 待辦 list: what a todo or
// event row says, and does when tapped, checked or swiped.
import { router } from 'expo-router';

import { icons } from '@/components/icons';
import { useTodoStore } from '@/store/todo';
import type { RowAction } from '@/ui';

import { confirmDeleteEvent, confirmDeleteTodo } from './confirm-delete';
import { isCompleted } from './todo-state';
import type { CalendarEvent, Todo } from './types';

/** e.g. 待辦 · 作業, or 已完成 · 作業 once checked off. */
export function todoSubtitle(todo: Todo): string {
  const state = isCompleted(todo) ? '已完成' : '待辦';
  return todo.category ? `${state} · ${todo.category.name}` : state;
}

export function editTodo(todo: Todo) {
  router.push({ pathname: '/todo-editor', params: { id: todo.id } });
}

export function editEvent(event: CalendarEvent) {
  router.push({ pathname: '/event-editor', params: { id: event.id } });
}

/**
 * Checks a todo off or back on. A checked todo stays listed, checked, until
 * the day ends, so a mis-tap is undone by tapping again (todo-state.ts).
 */
export function toggleTodo(todo: Todo, checked: boolean) {
  useTodoStore.getState().setTodoCompleted(todo.id, checked);
}

export function todoActions(todo: Todo): RowAction[] {
  return [{ key: 'delete', label: '刪除', icon: icons.delete, destructive: true, onPress: () => confirmDeleteTodo(todo) }];
}

export function eventActions(event: CalendarEvent): RowAction[] {
  return [
    { key: 'edit', label: '編輯', icon: icons.edit, onPress: () => editEvent(event) },
    { key: 'delete', label: '刪除', icon: icons.delete, destructive: true, onPress: () => confirmDeleteEvent(event) },
  ];
}
