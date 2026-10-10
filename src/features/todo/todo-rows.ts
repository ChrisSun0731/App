// Shared by 行事曆's day list and the 待辦 list: what a todo or event row
// does when tapped, checked or swiped.
import { router } from 'expo-router';

import { icons } from '@/components/icons';
import { useTodoStore } from '@/store/todo';
import type { RowAction } from '@/ui';

import { confirmDeleteEvent, confirmDeleteTodo } from './confirm-delete';
import type { CalendarEvent, Todo } from './types';

/** e.g. 待辦 · 作業 */
export function todoSubtitle(todo: Todo): string {
  return todo.category ? `待辦 · ${todo.category.name}` : '待辦';
}

export function editTodo(todo: Todo) {
  router.push({ pathname: '/todo-editor', params: { id: todo.id } });
}

export function editEvent(event: CalendarEvent) {
  router.push({ pathname: '/event-editor', params: { id: event.id } });
}

export function completeTodo(todo: Todo, checked: boolean) {
  // Checking a todo completes it, which removes it (as before).
  if (checked) useTodoStore.getState().completeTodo(todo.id);
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
