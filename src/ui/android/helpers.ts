// Pure helpers for the Compose kit (src/ui/kit.android.tsx). Nothing here
// touches @expo/ui, so it runs under Jest (see helpers.test.ts).
import { Children, cloneElement, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react';

import { fromDateKey, isDateKey, WEEKDAY_ZH } from '@/lib/dates';

/**
 * Applies `alpha` (0–1) to a "#RRGGBB" or "#RRGGBBAA" colour, multiplying any
 * alpha it already has. Other colour strings are returned unchanged.
 */
export function withAlpha(color: string, alpha: number): string {
  const match = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(color);
  if (!match) return color;
  const base = match[2] ? parseInt(match[2], 16) / 255 : 1;
  const value = Math.round(Math.min(1, Math.max(0, base * alpha)) * 255);
  return `#${match[1]}${value.toString(16).padStart(2, '0')}`.toUpperCase();
}

/** The spoken label of a row: its non-empty parts joined with a pause. */
export function joinLabel(parts: readonly (string | undefined | false)[]): string {
  return parts.filter((part): part is string => !!part && part.trim().length > 0).join('，');
}

/** e.g. "2026年10月4日 星期日" for a local "YYYY-MM-DD" key. */
export function formatDateLabel(key: string): string {
  const date = fromDateKey(key);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 星期${WEEKDAY_ZH[date.getDay()]}`;
}

// Material's DatePickerDialog works in UTC days: the selected value it takes
// and reports is UTC midnight of the calendar date. Its `selectableDates`
// bounds are different: @expo/ui's toUtcDayMillis() reads their *local*
// calendar fields (DatePickerView.kt), so those must be local midnight.

/** The dialog's `initialDate` for a local date key: UTC midnight of that day. */
export function dialogDateFromKey(key: string): string {
  return `${key}T00:00:00.000Z`;
}

/** The local date key of the UTC-midnight Date the dialog reports. */
export function keyFromDialogDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The dialog's `selectableDates.start` for a minimum date key: local midnight. */
export function dialogMinimumFromKey(key: string | undefined): Date | undefined {
  return key && isDateKey(key) ? fromDateKey(key) : undefined;
}

/** Approximate rendered width of `label` in dp at a 14sp label size (labelLarge). */
export function labelWidth(label: string, fontScale = 1): number {
  let em = 0;
  for (const char of label) {
    // CJK and full-width glyphs are about 1em wide; Latin glyphs about 0.6em.
    em += (char.codePointAt(0) ?? 0) >= 0x2e80 ? 1 : 0.6;
  }
  return em * 14 * fontScale;
}

/**
 * Whether a Material SingleChoiceSegmentedButtonRow of `labels` fits in
 * `available` dp. Every segment gets an equal share, and the selected one
 * also shows an 18dp check plus 8dp spacing inside 12dp side padding, so a
 * crowded row would wrap or clip its labels (Material recommends at most five
 * segments; chips take over beyond that).
 */
export function segmentsFit(labels: readonly string[], available: number, fontScale = 1): boolean {
  if (labels.length === 0) return true;
  if (labels.length > 5) return false;
  const widest = Math.max(...labels.map((label) => labelWidth(label, fontScale)));
  return available / labels.length >= 12 + 18 + 8 + widest + 12;
}

/** Splits `items` into rows of `size`. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const step = Math.max(1, Math.floor(size));
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += step) rows.push(items.slice(index, index + step));
  return rows;
}

/**
 * The elements of `children` with fragments expanded and unique keys, so a
 * Section can draw a divider between each row even when a screen groups rows
 * in a fragment. Strings, numbers and empty values are dropped: kit trees
 * only contain kit components.
 */
export function flattenChildren(children: ReactNode, prefix = ''): ReactElement[] {
  const result: ReactElement[] = [];
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue;
    const key = `${prefix}${child.key ?? ''}`;
    if (child.type === Fragment) {
      result.push(...flattenChildren((child.props as { children?: ReactNode }).children, `${key}/`));
    } else {
      result.push(cloneElement(child, { key }));
    }
  }
  return result;
}

/**
 * How a Section child takes part in card dividers: a kit ListItem row, kit
 * content with its own padding (fields, pickers, notices, tiles, a prominent
 * button), or a component the Section cannot see into (a screen's TodoItem,
 * memo(Row), a StationBlock returning several rows).
 */
export type SlotKind = 'row' | 'content' | 'unknown';

export interface SlotDividers {
  /** Context value for the rows inside the child: draw a leading inset divider. */
  rowsDraw: boolean;
  /** Paint over the first row's divider, which the Section cannot leave out itself. */
  maskFirst: boolean;
}

/**
 * Where the inset dividers of a section card go. A divider separates two list
 * rows only: outlined fields, chips, tiles and text carry their own padding,
 * and a line between two outlined fields reads as clutter in a form. Unknown
 * components count as rows, since per-item wrappers are how screens render
 * lists. Their rows all draw a divider (so rows inside a multi-row wrapper are
 * separated too) and the first one is masked where it must not show.
 */
export function slotDividers(kinds: readonly SlotKind[]): SlotDividers[] {
  return kinds.map((kind, index) => {
    const afterRow = index > 0 && kinds[index - 1] !== 'content';
    if (kind === 'unknown') return { rowsDraw: true, maskFirst: !afterRow };
    return { rowsDraw: kind === 'row' && afterRow, maskFirst: false };
  });
}
