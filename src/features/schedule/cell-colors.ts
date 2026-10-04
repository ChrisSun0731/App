import type { CellColor } from './timetable';

export interface CellColorOption {
  key: CellColor;
  label: string;
  /** Fill in light mode; null keeps the platform's default cell background. */
  light: string | null;
  /** Fill in dark mode: the same hue, dimmed so text stays readable. */
  dark: string | null;
}

// The light values are the Quasar app's palette, so cells users already
// coloured look the same after the update.
export const CELL_COLORS: readonly CellColorOption[] = [
  { key: 'Default', label: '預設', light: null, dark: null },
  { key: 'Red', label: '紅色', light: '#FFCCCB', dark: '#5A2B2D' },
  { key: 'Orange', label: '橙色', light: '#F5C884', dark: '#5C4320' },
  { key: 'Yellow', label: '黃色', light: '#FFFFE0', dark: '#4E4A1E' },
  { key: 'Green', label: '綠色', light: '#90EE90', dark: '#23502B' },
  { key: 'Blue', label: '藍色', light: '#ADD8E6', dark: '#1E4553' },
  { key: 'Purple', label: '紫色', light: '#E299FF', dark: '#4B2C5E' },
  { key: 'Pink', label: '粉紅色', light: '#FFA1E4', dark: '#5E2A4F' },
];

const BY_KEY = new Map(CELL_COLORS.map((option) => [option.key, option]));

export function isCellColor(value: unknown): value is CellColor {
  return typeof value === 'string' && BY_KEY.has(value as CellColor);
}

export function cellFill(color: CellColor | undefined, scheme: 'light' | 'dark'): string | null {
  const option = BY_KEY.get(color ?? 'Default');
  return option ? option[scheme] : null;
}

export function cellColorLabel(color: CellColor | undefined): string {
  return BY_KEY.get(color ?? 'Default')?.label ?? '預設';
}
