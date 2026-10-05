// Rules for the 類別管理 modal and the editors' category pickers.
import type { ChoiceOption } from '@/ui/types';

import { SCHOOL_EVENT_CATEGORY } from './school-calendar';

export type CategoryKind = 'todo' | 'event';

/** The /categories route's `kind` param; anything else means todo categories. */
export function categoryKind(param: unknown): CategoryKind {
  return param === 'event' ? 'event' : 'todo';
}

/** The preset event colours (unchanged from the previous manager). */
export const EVENT_COLORS: readonly ChoiceOption[] = [
  { label: '灰色', value: '#ADADAD' },
  { label: '紅色', value: '#C62828' },
  { label: '橙色', value: '#EF6C00' },
  { label: '綠色', value: '#2E7D32' },
  { label: '藍色', value: '#1565C0' },
  { label: '紫色', value: '#7B1FA2' },
];

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

/**
 * The colour picker's options. A typed code that is not a preset shows as
 * 自訂顏色, so the picker always has an option for the current value.
 */
export function colorOptions(color: string): readonly ChoiceOption[] {
  return EVENT_COLORS.some((option) => option.value === color)
    ? EVENT_COLORS
    : [...EVENT_COLORS, { label: '自訂顏色', value: color }];
}

export const ADD_CATEGORY_FAILED = '無法新增類別';
/** The store refuses empty and duplicate names (it returns false). */
export const DUPLICATE_CATEGORY = '請填寫名稱，且不要與現有類別重複。';

/**
 * Why a new event category cannot be added before the store sees it, or
 * null. The school calendar's category name is reserved: events in it are
 * treated as read-only school events.
 */
export function eventCategoryProblem(name: string, color: string): string | null {
  if (name.trim() === SCHOOL_EVENT_CATEGORY.name) return `「${SCHOOL_EVENT_CATEGORY.name}」是學校行事曆專用類別。`;
  if (!isHexColor(color)) return '請選擇顏色或輸入 #RRGGBB 格式的色碼。';
  return null;
}

/**
 * The categories an editor offers: the defined ones plus the item's own
 * category when it has since been deleted, so editing keeps its name (and
 * colour) unless the user picks another.
 */
export function withCurrentCategory<C extends { name: string }>(categories: readonly C[], current: C | null | undefined): C[] {
  if (!current || categories.some((category) => category.name === current.name)) return [...categories];
  return [...categories, current];
}
