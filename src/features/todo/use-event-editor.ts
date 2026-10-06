import { router } from 'expo-router';
import { useState } from 'react';

import { isDateKey, toDateKey } from '@/lib/dates';
import { useTodoStore } from '@/store/todo';

import { withCurrentCategory } from './categories';
import { confirmDeleteEvent } from './confirm-delete';
import { isSchoolEvent } from './school-calendar';
import { DEFAULT_EVENT_CATEGORY, type EventCategory } from './types';

/**
 * State and actions of /event-editor: `id` edits that event (read-only when
 * it is a school event), otherwise a new one starts and ends on `date`.
 */
export function useEventEditor(params: { id?: string; date?: string }) {
  const events = useTodoStore((state) => state.events);
  const eventCategories = useTodoStore((state) => state.eventCategories);
  const addEvent = useTodoStore((state) => state.addEvent);
  const updateEvent = useTodoStore((state) => state.updateEvent);

  const live = params.id ? events.find((item) => item.id === params.id) : undefined;
  // After 刪除 the event is gone while the sheet animates away; keep showing
  // it instead of flashing "not found".
  const [opened] = useState(live);
  const [leaving, setLeaving] = useState(false);
  const event = live ?? (leaving ? opened : undefined);
  const missing = !!params.id && !event;
  const readOnly = event ? isSchoolEvent(event) : false;

  const initialDate = isDateKey(params.date) ? params.date : toDateKey(new Date());
  const [title, setTitle] = useState(event?.title ?? '');
  const [startDate, setStartDate] = useState(event?.startDate ?? initialDate);
  const [endDate, setEndDate] = useState(event?.endDate ?? initialDate);
  const [categoryName, setCategoryName] = useState(
    event?.category.name ?? eventCategories[0]?.name ?? DEFAULT_EVENT_CATEGORY.name,
  );

  const categories = withCurrentCategory(eventCategories, event?.category);
  // A category deleted in /categories while picked falls back to the first.
  // Undefined only when there are no categories at all.
  const category: EventCategory | undefined = categories.find((item) => item.name === categoryName) ?? categories[0];
  // Keys are zero-padded "YYYY-MM-DD", so they compare as strings.
  const validDates = endDate >= startDate;
  const canSave = !missing && !readOnly && !leaving && title.trim() !== '' && validDates && !!category;

  /** Moving the start past the end moves the end along, as before. */
  function changeStartDate(value: string) {
    setStartDate(value);
    if (endDate < value) setEndDate(value);
  }

  function close() {
    router.back();
  }

  function save() {
    if (!canSave || !category) return;
    const values = { title: title.trim(), startDate, endDate, category };
    if (live) updateEvent({ ...live, ...values });
    else if (!params.id) addEvent(values);
    setLeaving(true);
    close();
  }

  function remove() {
    if (!live || readOnly) return;
    confirmDeleteEvent(live, () => {
      setLeaving(true);
      close();
    });
  }

  function manageCategories() {
    router.push({ pathname: '/categories', params: { kind: 'event' } });
  }

  return {
    isNew: !params.id,
    missing,
    readOnly,
    /** The event being edited (undefined when new or missing). */
    event,
    title,
    setTitle,
    startDate,
    changeStartDate,
    endDate,
    setEndDate,
    validDates,
    categories,
    categoryValue: category?.name ?? '',
    setCategoryName,
    canSave,
    save,
    remove,
    close,
    manageCategories,
  };
}
