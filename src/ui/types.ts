// The native UI kit's contract. Screens import components from '@/ui'; each
// platform implements every component below with its own native toolkit:
// kit.ios.tsx (SwiftUI via @expo/ui/swift-ui) and kit.android.tsx (Jetpack
// Compose Material 3 via @expo/ui/jetpack-compose). See docs/design/native-ui.md.
//
// Composition rules:
// - A ListScreen contains only Sections.
// - A Section contains rows: Row, CheckRow, ToggleRow, PickerRow, TextFieldRow,
//   DateRow, ButtonRow, TextBlock, EmptyState, Notice, Loading, FilterChips,
//   TileGrid, MonthCalendar, Embedded.
// - MetricPills and CrowdBar only go in Row.footer.
// - Never put raw React Native or @expo/ui views inside a kit tree; Embedded
//   is the one way to show React Native content (maps, images).
import type { ComponentType, ReactElement, ReactNode } from 'react';

import type { icons } from '@/components/icons';

/** An SF Symbol on iOS, a Material Symbols vector on Android (see icons.ts). */
export type IconValue = (typeof icons)[keyof typeof icons];

/** "#RRGGBB" */
export type HexColor = string;

export interface ListScreenProps {
  children: ReactNode;
  /**
   * Pull to refresh. The indicator stays until the returned promise settles
   * (SwiftUI `refreshable` awaits it; Compose `PullToRefreshBox` is driven
   * from it). Omit to disable pull to refresh.
   */
  onRefresh?: () => Promise<unknown> | void;
  /**
   * Shows the refresh indicator without a pull, e.g. while a header 重新整理
   * button's refresh runs; for screens that also pass `onRefresh`. Android
   * and the fallback show pull to refresh's own indicator. iOS draws nothing:
   * SwiftUI cannot start `refreshable`'s spinner from code, and a row
   * inserted above the list would make it jump. Give the header button
   * `busy` as well, which iOS draws as a spinner in the button's place.
   */
  refreshing?: boolean;
  /** Android only: an extended FAB for the screen's primary action. iOS puts that action in the navigation bar instead and ignores this. */
  fab?: { label: string; icon: IconValue; onPress: () => void };
}

export interface SectionProps {
  title?: string;
  footer?: string;
  /**
   * Rows without the grouped container: no card on Android, a clear row
   * background on iOS. For a lone segmented control, filter chips or an
   * empty state, which look heavy inside a card.
   */
  plain?: boolean;
  children?: ReactNode;
}

export interface RowAction {
  key: string;
  label: string;
  icon?: IconValue;
  destructive?: boolean;
  /**
   * Shown but not selectable (greyed in the menus, left out of iOS swipe
   * actions). No screen needs it yet; the kits support it so a row can keep
   * an action visible while it does not apply.
   */
  disabled?: boolean;
  onPress: () => void;
}

/** A two-state quick action on a row, e.g. pin or favourite. */
export interface RowToggle {
  /** Label describing what pressing does now, e.g. 釘選 / 取消釘選. */
  label: string;
  icon: IconValue;
  activeIcon: IconValue;
  active: boolean;
  onPress: () => void;
}

export type RowAccessory = 'none' | 'chevron' | 'external' | 'checkmark';

export interface RowProps {
  title: string;
  subtitle?: string;
  /** Small text above the title (e.g. 第一節 · 08:10, 已釘選). */
  overline?: string;
  /** Trailing value text (e.g. a countdown or hours). */
  detail?: string;
  icon?: IconValue;
  iconColor?: HexColor;
  /** Leading filled dot (category or status colour). Ignored when `icon` is set. */
  dotColor?: HexColor;
  /** Fill colour of the whole row (timetable cell colours). */
  background?: HexColor;
  /** Small pill after the title, e.g. 目前 / 今天. */
  badge?: string;
  /** Tint and bold the title (the period in session, today). */
  emphasized?: boolean;
  /** Maximum title lines. @default 2 */
  titleLines?: number;
  /** @default 'none' */
  accessory?: RowAccessory;
  onPress?: () => void;
  /**
   * Secondary actions. iOS: trailing swipe actions plus a long-press context
   * menu, which nothing on screen reveals, so a screen whose rows rely on
   * them adds an iOS-only footer hint (e.g. 左滑或長按站點即可…). Android: a
   * trailing overflow (more_vert) dropdown menu, named after the row for
   * TalkBack. They stay available on a disabled row; disable an action itself
   * with `RowAction.disabled`.
   */
  actions?: readonly RowAction[];
  /**
   * iOS: leading swipe action, context-menu item and a small trailing symbol
   * when active. Android: a trailing icon button. Stays available on a
   * disabled row, like `actions`.
   */
  toggle?: RowToggle;
  /** Kit inline elements shown under the subtitle (MetricPills, CrowdBar). */
  footer?: ReactNode;
  /** Overrides the spoken label (defaults to title, overline, subtitle, detail, badge). */
  accessibilityLabel?: string;
  /**
   * Dims the row and turns off its own tap (`onPress`) only; it is spoken as
   * turned off (Android adds 已停用 to the label). `actions` and `toggle`
   * stay available, but on iOS a full swipe no longer fires the edge action:
   * a dimmed row should not act on a single gesture. No screen disables a
   * Row yet (設定 disables ToggleRows).
   */
  disabled?: boolean;
}

export interface CheckRowProps {
  title: string;
  subtitle?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Tapping the row body (not the checkbox), e.g. to edit. */
  onPress?: () => void;
  actions?: readonly RowAction[];
}

export interface ToggleRowProps {
  label: string;
  subtitle?: string;
  icon?: IconValue;
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Turns off the switch only; `actions` stay available (e.g. 上移/下移 at a limit). */
  disabled?: boolean;
  /** iOS: the long-press context menu. Android: an overflow menu named after the row. */
  actions?: readonly RowAction[];
}

export interface ChoiceOption<T extends string = string> {
  label: string;
  value: T;
}

/**
 * A single choice. The native control always shows `value`: when the parent
 * does not adopt a selection (e.g. the user cancels a confirmation alert),
 * the control snaps back to `value`.
 */
export interface PickerRowProps<T extends string = string> {
  label: string;
  value: T;
  options: readonly ChoiceOption<T>[];
  onChange: (value: T) => void;
  /** @default 'menu' */
  variant?: 'menu' | 'segmented';
  icon?: IconValue;
  disabled?: boolean;
}

export interface TextFieldRowProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboard?: 'default' | 'url' | 'email' | 'numeric';
  autoFocus?: boolean;
  maxLength?: number;
}

export interface DateRowProps {
  label: string;
  /** Local date "YYYY-MM-DD". */
  value: string;
  onChange: (value: string) => void;
  /** Local date "YYYY-MM-DD". */
  minimumDate?: string;
}

export interface ButtonRowProps {
  label: string;
  icon?: IconValue;
  /** @default 'default' */
  role?: 'default' | 'destructive';
  /** The screen's main action (filled / borderedProminent). */
  prominent?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export interface TextBlockProps {
  text: string;
  secondary?: boolean;
  /** @default 'body' */
  size?: 'body' | 'large';
  selectable?: boolean;
}

export interface KitAction {
  label: string;
  onPress: () => void;
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon: IconValue;
  action?: KitAction;
  secondaryAction?: KitAction;
}

export interface NoticeProps {
  tone: 'error' | 'info';
  title: string;
  message?: string;
  action?: KitAction;
}

export interface LoadingProps {
  label: string;
}

export interface FilterChipsProps {
  options: readonly { key: string; label: string; selected: boolean; icon?: IconValue }[];
  onToggle: (key: string) => void;
}

export interface TileGridProps {
  tiles: readonly { key: string; title: string; icon: IconValue; onPress: () => void }[];
  /** @default 3 */
  columns?: number;
}

export interface CalendarIndicator {
  key: string;
  color: HexColor;
  /** Events are dots, todos are squares. */
  shape: 'dot' | 'square';
}

/**
 * How many indicators every platform draws under a day number; later ones
 * are dropped, so callers choose which CALENDAR_CELL_INDICATORS matter most.
 * Import it from '@/ui/types': '@/ui' re-exports this file's types only.
 */
export const CALENDAR_CELL_INDICATORS = 3;

export interface CalendarCell {
  /** "YYYY-MM-DD" */
  key: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  /** Only the first CALENDAR_CELL_INDICATORS are drawn. */
  indicators: readonly CalendarIndicator[];
  accessibilityLabel: string;
}

export interface MonthCalendarProps {
  /** e.g. 2026年10月 */
  title: string;
  /** Column headers, Sunday first. */
  weekdays: readonly string[];
  /** 42 cells (six weeks, Sunday first). */
  cells: readonly CalendarCell[];
  selectedKey: string;
  onSelect: (key: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

export interface MetricPillsProps {
  metrics: readonly { key: string; label: string; color: HexColor; icon?: IconValue }[];
}

export interface CrowdBarProps {
  /** One entry per car, front car first. */
  levels: readonly { key: string; color: HexColor }[];
  accessibilityLabel: string;
}

export interface EmbeddedProps {
  /** A React Native element (map, image). */
  children: ReactElement;
  height?: number;
  /** width / height; used when `height` is not given. */
  aspectRatio?: number;
}

/** Every platform kit file must satisfy this (checked with `satisfies Kit`). */
export interface Kit {
  ListScreen: ComponentType<ListScreenProps>;
  Section: ComponentType<SectionProps>;
  Row: ComponentType<RowProps>;
  CheckRow: ComponentType<CheckRowProps>;
  ToggleRow: ComponentType<ToggleRowProps>;
  PickerRow: <T extends string>(props: PickerRowProps<T>) => ReactNode;
  TextFieldRow: ComponentType<TextFieldRowProps>;
  DateRow: ComponentType<DateRowProps>;
  ButtonRow: ComponentType<ButtonRowProps>;
  TextBlock: ComponentType<TextBlockProps>;
  EmptyState: ComponentType<EmptyStateProps>;
  Notice: ComponentType<NoticeProps>;
  Loading: ComponentType<LoadingProps>;
  FilterChips: ComponentType<FilterChipsProps>;
  TileGrid: ComponentType<TileGridProps>;
  MonthCalendar: ComponentType<MonthCalendarProps>;
  MetricPills: ComponentType<MetricPillsProps>;
  CrowdBar: ComponentType<CrowdBarProps>;
  Embedded: ComponentType<EmbeddedProps>;
}
