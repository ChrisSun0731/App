// Pure helpers behind the 編輯課程 modal (src/app/schedule-editor.tsx): which
// slot the route points at, its title, the 科目 section's explanation and the
// colour options. The draft model itself (單雙週輪替) lives in timetable.ts.
import type { ChoiceOption } from '@/ui/types';

import { CELL_COLORS } from './cell-colors';
import {
  PERIOD_NAMES,
  WEEKDAYS,
  WEEKDAY_LABELS,
  type CellColor,
  type CellDraft,
  type PeriodName,
  type ScheduleCell,
  type Weekday,
} from './timetable';

export interface EditorTarget {
  period: PeriodName;
  day: Weekday;
}

type Param = string | string[] | undefined;

function isOneOf<T extends string>(values: readonly T[], value: Param): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

/** The slot `/schedule-editor?period=一&day=Monday` edits, or null for a malformed link. */
export function parseEditorTarget(params: { period?: Param; day?: Param }): EditorTarget | null {
  const { period, day } = params;
  return isOneOf(PERIOD_NAMES, period) && isOneOf(WEEKDAYS, day) ? { period, day } : null;
}

/** e.g. "星期一第一節". */
export function editorTitle(target: EditorTarget | null): string {
  return target ? `${WEEKDAY_LABELS[target.day]}第${target.period}節` : '編輯課程';
}

/**
 * The 科目 section's footer. While rotation is off it still mentions the
 * stored weeks, so the user can see what saving without 輪替 replaces.
 */
export function subjectHint(draft: CellDraft, stored: ScheduleCell['alternating']): string {
  if (draft.rotating) return '單週與雙週分別顯示各自的科目，留空代表該週空堂。';
  const replaced = stored ? `原為單週 ${stored.odd || '空堂'}／雙週 ${stored.even || '空堂'}。` : '';
  return `每週都顯示此科目，留空代表空堂。${replaced}`;
}

/** The eight cell colours for the 顏色 picker. */
export const CELL_COLOR_OPTIONS: readonly ChoiceOption<CellColor>[] = CELL_COLORS.map((option) => ({
  label: option.label,
  value: option.key,
}));
