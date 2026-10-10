import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { useTodoStore } from '@/store/todo';

import { completedOn, isCompleted, openFirst, openTodos, pruneCompletedTodos, visibleTodos } from './todo-state';
import type { Todo } from './types';

// The store persists through SQLite; here, through memory.
jest.mock('@/lib/storage', () => {
  const { createJSONStorage } = jest.requireActual<typeof import('zustand/middleware')>('zustand/middleware');
  const memory = new Map<string, string>();
  return {
    hadStoredStateAtLaunch: () => false,
    persistStorage: createJSONStorage(() => ({
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => { memory.set(key, value); },
      removeItem: (key: string) => { memory.delete(key); },
    })),
  };
});

const at = (day: number, hours: number, minutes = 0) => new Date(2026, 9, day, hours, minutes);
const todo = (id: string, completedAt?: Date | string): Todo => ({
  id,
  title: id,
  date: null,
  category: null,
  ...(completedAt === undefined ? {} : { completedAt: typeof completedAt === 'string' ? completedAt : completedAt.toISOString() }),
});

const open = todo('open');
const lateLastNight = todo('yesterday', at(4, 23, 59));
const earlyToday = todo('today', at(5, 0));
const later = todo('later', at(5, 18, 30));
const unreadable = todo('unreadable', 'not a date');

describe('checked-off todos', () => {
  test('a todo is done once it carries a completion time, on the local day of that time', () => {
    expect(isCompleted(open)).toBe(false);
    expect(isCompleted(earlyToday)).toBe(true);
    // Local days: a minute before midnight still belongs to the day before.
    expect(completedOn(lateLastNight, '2026-10-04')).toBe(true);
    expect(completedOn(lateLastNight, '2026-10-05')).toBe(false);
    expect(completedOn(earlyToday, '2026-10-05')).toBe(true);
    expect(completedOn(open, '2026-10-05')).toBe(false);
    expect(completedOn(unreadable, '2026-10-05')).toBe(false);
  });

  test('the screens show the open todos and those done today, until the day ends', () => {
    const todos = [lateLastNight, open, earlyToday, later];
    expect(visibleTodos(todos, at(5, 9)).map((item) => item.id)).toEqual(['open', 'today', 'later']);
    expect(visibleTodos(todos, at(5, 23, 59)).map((item) => item.id)).toEqual(['open', 'today', 'later']);
    // The next day only the open one is left to show.
    expect(visibleTodos(todos, at(6, 0)).map((item) => item.id)).toEqual(['open']);
    expect(openTodos(todos)).toEqual([open]);
  });

  test('open todos come first, each part in its saved order', () => {
    expect(openFirst([earlyToday, todo('a'), later, todo('b')]).map((item) => item.id)).toEqual(['a', 'b', 'today', 'later']);
  });

  test('pruning drops what was done before today (or at an unreadable time) and keeps the rest', () => {
    const todos = [lateLastNight, open, earlyToday, unreadable];
    expect(pruneCompletedTodos(todos, at(5, 9)).map((item) => item.id)).toEqual(['open', 'today']);
    // Nothing done today or later goes, even if the clock was ahead when it was checked.
    expect(pruneCompletedTodos(todos, at(4, 9)).map((item) => item.id)).toEqual(['yesterday', 'open', 'today']);
  });
});

describe('the store', () => {
  const state = () => useTodoStore.getState();

  beforeEach(() => {
    jest.useFakeTimers({ now: at(5, 9) });
    state().reset();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('checking off keeps the todo, timestamped, and unchecking clears it', () => {
    state().addTodo({ title: '交作業', date: '2026-10-05', category: null });
    const { id } = state().todos[0];
    state().setTodoCompleted(id, true);
    expect(state().todos).toEqual([{ id, title: '交作業', date: '2026-10-05', category: null, completedAt: at(5, 9).toISOString() }]);
    state().setTodoCompleted(id, false);
    expect(state().todos).toEqual([{ id, title: '交作業', date: '2026-10-05', category: null }]);
    expect('completedAt' in state().todos[0]).toBe(false);
  });

  test('checking one off prunes those done before today, never the one just done', () => {
    state().addTodo({ title: '昨天做完', date: null, category: null });
    state().addTodo({ title: '還沒做', date: null, category: null });
    state().addTodo({ title: '今天做完', date: null, category: null });
    const [doneYesterday, stillOpen, doneToday] = state().todos.map((item) => item.id);
    state().setTodoCompleted(doneYesterday, true);
    jest.setSystemTime(at(6, 9));
    state().setTodoCompleted(doneToday, true);
    expect(state().todos.map((item) => item.id)).toEqual([stillOpen, doneToday]);
    // Unchecking prunes nothing: it only puts a todo back.
    state().setTodoCompleted(doneToday, false);
    expect(state().todos.map((item) => item.id)).toEqual([stillOpen, doneToday]);
  });
});
