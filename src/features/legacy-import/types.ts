import type { NewsItem } from '@/features/news/rss';
import type { ScheduleRow } from '@/features/schedule/timetable';
import type { CalendarEvent, EventCategory, Todo, TodoCategory, TodoView } from '@/features/todo/types';
import type { HomeWidgets, ToolbarItem } from '@/store/settings';
import type { FollowedYoubike } from '@/store/transport';

/** The persisted part of every store the import writes to. */
export interface StoresData {
  schedule: { userClass: string; rows: ScheduleRow[] };
  todo: {
    events: CalendarEvent[];
    eventCategories: EventCategory[];
    todos: Todo[];
    todoCategories: TodoCategory[];
    view: TodoView;
  };
  news: { pinned: NewsItem[]; lastClearedTime: string | null };
  food: { favorites: string[] };
  transport: { youbike: FollowedYoubike[]; metro: string[] };
  settings: { toolbar: ToolbarItem[]; homeWidgets: HomeWidgets };
}

/**
 * What the previous app had for each store. A field is absent when that app
 * had nothing usable for it, which leaves this app's value alone.
 */
export interface LegacyImport {
  schedule?: Partial<StoresData['schedule']>;
  todo?: Partial<StoresData['todo']>;
  news?: { pinned?: NewsItem[]; lastClearedTime?: string };
  food?: Partial<StoresData['food']>;
  transport?: Partial<StoresData['transport']>;
  settings?: { toolbar?: ToolbarItem[]; homeWidgets?: Partial<HomeWidgets> };
}
