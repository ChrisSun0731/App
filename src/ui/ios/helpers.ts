// Pure helpers for the SwiftUI kit. Nothing here imports @expo/ui at runtime,
// so Jest can run them without the native module (see helpers.test.ts).
import type { ImageProps } from '@expo/ui/swift-ui';
import { Children, isValidElement, type ReactNode } from 'react';

import { fromDateKey, isDateKey } from '@/lib/dates';

import type { IconValue, RowAction } from '../types';

/** An SF Symbol name, as @expo/ui's SwiftUI views type it. */
export type SFSymbol = NonNullable<ImageProps['systemName']>;

/**
 * The SF Symbol of a kit icon. `Icon.select` resolves to the iOS string in the
 * iOS bundle; anything else (an Android asset) has no symbol to draw.
 */
export function sf(icon: IconValue | undefined): SFSymbol | undefined {
  return typeof icon === 'string' && icon.length > 0 ? icon : undefined;
}

/**
 * What VoiceOver should read for kit inline elements in `Row.footer`: a
 * CrowdBar's own label, a MetricPills' metric labels, or plain text. The row
 * reads as one element, so these have to be part of its label.
 */
export function footerSpeech(node: ReactNode): string[] {
  const spoken: string[] = [];
  Children.forEach(node, (child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      spoken.push(String(child));
      return;
    }
    if (!isValidElement(child)) return;
    const props = child.props as {
      accessibilityLabel?: unknown;
      metrics?: unknown;
      children?: ReactNode;
    };
    if (typeof props.accessibilityLabel === 'string') {
      spoken.push(props.accessibilityLabel);
    } else if (Array.isArray(props.metrics)) {
      for (const metric of props.metrics as { label?: unknown }[]) {
        if (typeof metric.label === 'string') spoken.push(metric.label);
      }
    } else if (props.children != null) {
      spoken.push(...footerSpeech(props.children));
    }
  });
  return spoken;
}

/** SwiftUI shows only a few swipe buttons comfortably; the rest stay in the context menu. */
export const MAX_SWIPE_ACTIONS = 3;

/**
 * Trailing swipe buttons, edge first. SwiftUI puts the first button at the
 * row's edge, where a full swipe triggers it, so destructive actions lead
 * (like Mail's Trash). Disabled actions are left out: a greyed swipe button
 * still looks tappable, and the context menu shows them greyed instead.
 */
export function trailingSwipeActions(actions: readonly RowAction[]): RowAction[] {
  const enabled = actions.filter((action) => !action.disabled);
  const destructive = enabled.filter((action) => action.destructive);
  const others = enabled.filter((action) => !action.destructive);
  return [...destructive, ...others].slice(0, MAX_SWIPE_ACTIONS);
}

/** The major iOS version from `Platform.Version` ("17.4" -> 17). */
export function iosMajorVersion(version: string | number): number {
  const major = Number.parseInt(String(version), 10);
  return Number.isFinite(major) ? major : 0;
}

/**
 * The Date a SwiftUI DatePicker shows for a local "YYYY-MM-DD" key: local
 * midnight, so the picker (which works in the device's calendar and time zone)
 * lands on that calendar day. A malformed key falls back to today instead of
 * throwing while rendering.
 */
export function pickerDate(key: string, now: Date = new Date()): Date {
  if (isDateKey(key)) return fromDateKey(key);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * The earliest day a DateRow's picker may offer, as a key, or undefined for
 * no bound. UIDatePicker shows its minimum instead of a selection below it,
 * and DatePickerView reports nothing for that, so the bound never excludes
 * `value` (e.g. an imported event that ends before it starts, which the
 * screen explains in a Notice). Keys are zero-padded, so they compare as
 * strings.
 */
export function pickerMinimum(value: string, minimumDate: string | undefined): string | undefined {
  if (!isDateKey(minimumDate) || !isDateKey(value)) return undefined;
  return value < minimumDate ? value : minimumDate;
}

// React Native's iOS font scale for UIContentSizeCategoryAccessibilityMedium
// (1.786), the smallest of the accessibility text sizes.
const ACCESSIBILITY_FONT_SCALE = 1.75;

/**
 * Whether `fontScale` (useWindowDimensions) is one of the accessibility text
 * sizes, where SwiftUI's DynamicTypeSize.isAccessibilitySize is true and
 * horizontal layouts should stack.
 */
export function isAccessibilityTextSize(fontScale: number): boolean {
  return fontScale >= ACCESSIBILITY_FONT_SCALE;
}
