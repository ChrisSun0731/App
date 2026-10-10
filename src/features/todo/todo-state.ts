// Open or done: one reading of `Todo.completedAt` for the store and every
// screen. A todo checked off keeps its row (checked, 已完成) until the end of
// the local day it was done, so a mis-tap can be undone; from the next day it
// is hidden, and the store prunes it. Pure, so it is unit tested without a
// renderer.
import { toDateKey } from '@/lib/dates';

import type { Todo } from './types';

/**
 * The local day `todo` was checked off, or undefined while it is open. An
 * unreadable timestamp reads as the empty key, which is before every day: such
 * a todo is never shown and is pruned, rather than kept hidden for ever.
 */
function completedDay(todo: Todo): string | undefined {
  if (todo.completedAt === undefined) return undefined;
  const date = new Date(todo.completedAt);
  return Number.isNaN(date.getTime()) ? '' : toDateKey(date);
}

export function isCompleted(todo: Todo): boolean {
  return todo.completedAt !== undefined;
}

/** Whether `todo` was checked off on the local day `dayKey` ("YYYY-MM-DD"). */
export function completedOn(todo: Todo, dayKey: string): boolean {
  return completedDay(todo) === dayKey;
}

/** The todos not checked off. */
export function openTodos(todos: readonly Todo[]): Todo[] {
  return todos.filter((todo) => !isCompleted(todo));
}

/** What the screens list on `today`: the open todos, and those checked off that day. */
export function visibleTodos(todos: readonly Todo[], today: Date): Todo[] {
  const todayKey = toDateKey(today);
  return todos.filter((todo) => !isCompleted(todo) || completedOn(todo, todayKey));
}

/** `todos` with the open ones first, each part in its saved order. */
export function openFirst(todos: readonly Todo[]): Todo[] {
  return [...openTodos(todos), ...todos.filter(isCompleted)];
}

/** Drops the todos checked off before `today` (local), which no screen shows any more. */
export function pruneCompletedTodos(todos: readonly Todo[], today: Date): Todo[] {
  const todayKey = toDateKey(today);
  return todos.filter((todo) => {
    const day = completedDay(todo);
    return day === undefined || day >= todayKey;
  });
}
