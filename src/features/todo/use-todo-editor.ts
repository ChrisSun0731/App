import { router } from 'expo-router';
import { useState } from 'react';

import { isDateKey, toDateKey } from '@/lib/dates';
import { useTodoStore } from '@/store/todo';
import type { ChoiceOption } from '@/ui/types';

import { withCurrentCategory } from './categories';
import { confirmDeleteTodo } from './confirm-delete';

/** The 待辦類別 value meaning no category. Category names are never empty. */
const NO_CATEGORY = '';

/**
 * State and actions of /todo-editor: `id` edits that todo, otherwise a new
 * one is made, dated `date` when the screen passed one.
 */
export function useTodoEditor(params: { id?: string; date?: string }) {
  const todos = useTodoStore((state) => state.todos);
  const todoCategories = useTodoStore((state) => state.todoCategories);
  const addTodo = useTodoStore((state) => state.addTodo);
  const updateTodo = useTodoStore((state) => state.updateTodo);

  const live = params.id ? todos.find((item) => item.id === params.id) : undefined;
  // After 刪除 the todo is gone while the sheet animates away; keep showing it
  // instead of flashing "not found".
  const [opened] = useState(live);
  const [leaving, setLeaving] = useState(false);
  const todo = live ?? (leaving ? opened : undefined);
  const missing = !!params.id && !todo;

  const [title, setTitle] = useState(todo?.title ?? '');
  const [dated, setDated] = useState(todo ? !!todo.date : !!params.date);
  const [date, setDate] = useState(todo?.date ?? (isDateKey(params.date) ? params.date : toDateKey(new Date())));
  const [categoryName, setCategoryName] = useState(todo?.category?.name ?? NO_CATEGORY);

  const categories = withCurrentCategory(todoCategories, todo?.category);
  // A category deleted in /categories while picked falls back to none.
  const category = categories.find((item) => item.name === categoryName) ?? null;
  const categoryOptions: ChoiceOption[] = [
    { label: '無類別', value: NO_CATEGORY },
    ...categories.map((item) => ({ label: item.name, value: item.name })),
  ];

  const canSave = !missing && !leaving && title.trim() !== '';

  function close() {
    router.back();
  }

  function save() {
    if (!canSave) return;
    const values = { title: title.trim(), date: dated ? date : null, category };
    if (live) updateTodo({ ...live, ...values });
    else if (!params.id) addTodo(values);
    setLeaving(true);
    close();
  }

  function remove() {
    if (!live) return;
    confirmDeleteTodo(live, () => {
      setLeaving(true);
      close();
    });
  }

  function manageCategories() {
    router.push({ pathname: '/categories', params: { kind: 'todo' } });
  }

  return {
    isNew: !params.id,
    missing,
    /** The todo being edited (undefined when new or missing). */
    todo,
    title,
    setTitle,
    dated,
    setDated,
    date,
    setDate,
    categoryValue: category?.name ?? NO_CATEGORY,
    categoryOptions,
    setCategoryName,
    canSave,
    save,
    remove,
    close,
    manageCategories,
  };
}
