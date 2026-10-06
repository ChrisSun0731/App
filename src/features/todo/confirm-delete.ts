// Delete confirmations shared by the 行事曆 rows and the editors, with the
// editors' existing copy. (Checking a todo off completes it without asking,
// as before.) `onConfirm` runs just before the delete, so an editor can
// start closing while it still has the item to show.
import { Alert } from 'react-native';

import { useTodoStore } from '@/store/todo';

import type { CalendarEvent, Todo } from './types';

export function confirmDeleteTodo(todo: Todo, onConfirm?: () => void) {
  Alert.alert('刪除待辦', `確定刪除「${todo.title}」？`, [
    { text: '取消', style: 'cancel' },
    {
      text: '刪除',
      style: 'destructive',
      onPress: () => {
        onConfirm?.();
        useTodoStore.getState().deleteTodo(todo.id);
      },
    },
  ]);
}

export function confirmDeleteEvent(event: CalendarEvent, onConfirm?: () => void) {
  Alert.alert('刪除活動', `確定刪除「${event.title}」？`, [
    { text: '取消', style: 'cancel' },
    {
      text: '刪除',
      style: 'destructive',
      onPress: () => {
        onConfirm?.();
        useTodoStore.getState().deleteEvent(event.id);
      },
    },
  ]);
}
