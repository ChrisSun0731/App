export interface EventCategory {
  name: string;
  /** "#RRGGBB" */
  color: string;
}

export interface TodoCategory {
  name: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  /** Inclusive local dates, "YYYY-MM-DD". */
  startDate: string;
  endDate: string;
  category: EventCategory;
  /** Set on events imported from the school's 行事曆; those are read-only. */
  school?: {
    department?: string;
    /** 暫: the school has not fixed this date yet. */
    tentative?: boolean;
    /** Dated only to 上旬/中旬/下旬, so the span is indicative. */
    approximate?: boolean;
  };
}

export interface Todo {
  id: string;
  title: string;
  /** Local date "YYYY-MM-DD", or null for an undated todo. */
  date: string | null;
  category: TodoCategory | null;
  /**
   * When it was checked off, as an ISO timestamp. It stays listed and checked
   * until the end of that local day (so a mis-tap can be undone), then is
   * hidden and pruned (todo-state.ts).
   */
  completedAt?: string;
}

export type TodoView = 'calendar' | 'todoList';

export const DEFAULT_EVENT_CATEGORY: EventCategory = { name: 'Default', color: '#ADADAD' };
