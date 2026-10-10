import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { pruneCompletedTodos } from '@/features/todo/todo-state';
import {
  DEFAULT_EVENT_CATEGORY,
  type CalendarEvent,
  type EventCategory,
  type Todo,
  type TodoCategory,
  type TodoView,
} from '@/features/todo/types';
import { persistStorage } from '@/lib/storage';

export const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface TodoState {
  events: CalendarEvent[];
  eventCategories: EventCategory[];
  todos: Todo[];
  todoCategories: TodoCategory[];
  view: TodoView;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  updateEvent: (event: CalendarEvent) => void;
  deleteEvent: (id: string) => void;
  /** Returns false if a category with that name already exists. */
  addEventCategory: (category: EventCategory) => boolean;
  /**
   * Removes a category from the picker. Events already in it keep their
   * colour, as before. The last category cannot be removed.
   */
  deleteEventCategory: (name: string) => void;
  addTodo: (todo: Omit<Todo, 'id'>) => void;
  updateTodo: (todo: Todo) => void;
  deleteTodo: (id: string) => void;
  /**
   * Checks a todo off (true) or back on (false). A checked todo stays
   * listed until the end of the local day it was done, so a mis-tap can be
   * undone (todo-state.ts); checking one off also prunes the todos done
   * before today, so storage stays bounded.
   */
  setTodoCompleted: (id: string, completed: boolean) => void;
  addTodoCategory: (name: string) => boolean;
  deleteTodoCategory: (name: string) => void;
  setView: (view: TodoView) => void;
  reset: () => void;
}

const initialState = () => ({
  events: [] as CalendarEvent[],
  eventCategories: [DEFAULT_EVENT_CATEGORY],
  todos: [] as Todo[],
  todoCategories: [] as TodoCategory[],
  view: 'calendar' as TodoView,
});

const sameName = (a: string, b: string) => a.trim() === b.trim();

export const useTodoStore = create<TodoState>()(
  persist(
    (set, get) => ({
      ...initialState(),
      addEvent: (event) => set((state) => ({ events: [...state.events, { ...event, id: newId() }] })),
      updateEvent: (event) =>
        set((state) => ({ events: state.events.map((e) => (e.id === event.id ? event : e)) })),
      deleteEvent: (id) => set((state) => ({ events: state.events.filter((e) => e.id !== id) })),
      addEventCategory: (category) => {
        const name = category.name.trim();
        if (!name || get().eventCategories.some((c) => sameName(c.name, name))) return false;
        set((state) => ({ eventCategories: [...state.eventCategories, { ...category, name }] }));
        return true;
      },
      deleteEventCategory: (name) =>
        set((state) =>
          state.eventCategories.length <= 1
            ? state
            : { eventCategories: state.eventCategories.filter((c) => c.name !== name) },
        ),
      addTodo: (todo) => set((state) => ({ todos: [...state.todos, { ...todo, id: newId() }] })),
      updateTodo: (todo) =>
        set((state) => ({ todos: state.todos.map((item) => (item.id === todo.id ? todo : item)) })),
      deleteTodo: (id) => set((state) => ({ todos: state.todos.filter((todo) => todo.id !== id) })),
      setTodoCompleted: (id, completed) =>
        set((state) => {
          const now = new Date();
          const todos = state.todos.map((todo) => {
            if (todo.id !== id) return todo;
            if (!completed) {
              const { completedAt, ...open } = todo;
              return open;
            }
            return { ...todo, completedAt: now.toISOString() };
          });
          // Pruned after the change, so the todo just done (now) stays.
          return { todos: completed ? pruneCompletedTodos(todos, now) : todos };
        }),
      addTodoCategory: (rawName) => {
        const name = rawName.trim();
        if (!name || get().todoCategories.some((c) => sameName(c.name, name))) return false;
        set((state) => ({ todoCategories: [...state.todoCategories, { name }] }));
        return true;
      },
      deleteTodoCategory: (name) =>
        set((state) => ({ todoCategories: state.todoCategories.filter((c) => c.name !== name) })),
      setView: (view) => set({ view }),
      reset: () => set(initialState()),
    }),
    {
      name: 'ck.todo',
      storage: persistStorage,
      version: 1,
      partialize: ({ events, eventCategories, todos, todoCategories, view }) => ({
        events,
        eventCategories,
        todos,
        todoCategories,
        view,
      }),
    },
  ),
);
