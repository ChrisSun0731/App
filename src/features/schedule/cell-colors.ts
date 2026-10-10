import type { CellColor } from './timetable';

export interface CellSwatch {
  /** The cell's fill: the hue softened over the cell background. */
  fill: string;
  /** Text on the fill: the hue, deep enough to read (4.5:1). */
  ink: string;
}

export interface CellColorOption {
  key: CellColor;
  label: string;
  /** The Quasar app's fill, to recognise colours in imported data; null for 預設. */
  light: string | null;
  /** That fill dimmed for dark mode (kept with `light`). */
  dark: string | null;
  /** How the cell is drawn now, per scheme; null (預設) leaves a lesson its subject's colour (lessonSwatch). */
  swatch: { light: CellSwatch; dark: CellSwatch } | null;
  /** The system hue itself, per scheme: the 顏色 picker's dot before the name; null for 預設. */
  dot: { light: string; dark: string } | null;
}

// `light` is the Quasar app's palette, so colours users already set are
// recognised on import. The swatches are the system hues as soft fills with
// a deep ink, in light and dark mode; the dots are those hues as they are.
export const CELL_COLORS: readonly CellColorOption[] = [
  { key: 'Default', label: '預設（依科目）', light: null, dark: null, swatch: null, dot: null },
  {
    key: 'Red',
    label: '紅色',
    light: '#FFCCCB',
    dark: '#5A2B2D',
    swatch: { light: { fill: '#FFE0DE', ink: '#BF0018' }, dark: { fill: '#522625', ink: '#FF7B73' } },
    dot: { light: '#FF3B30', dark: '#FF453A' },
  },
  {
    key: 'Orange',
    label: '橙色',
    light: '#F5C884',
    dark: '#5C4320',
    swatch: { light: { fill: '#FFECD1', ink: '#C93400' }, dark: { fill: '#523B19', ink: '#FFB340' } },
    dot: { light: '#FF9500', dark: '#FF9F0A' },
  },
  {
    key: 'Yellow',
    label: '黃色',
    light: '#FFFFE0',
    dark: '#4E4A1E',
    swatch: { light: { fill: '#FFF4C7', ink: '#8A5A00' }, dark: { fill: '#4E451A', ink: '#FFD426' } },
    dot: { light: '#FFCC00', dark: '#FFD60A' },
  },
  {
    key: 'Green',
    label: '綠色',
    light: '#90EE90',
    dark: '#23502B',
    swatch: { light: { fill: '#DBF5E1', ink: '#1E7B34' }, dark: { fill: '#20442B', ink: '#30DB5B' } },
    dot: { light: '#34C759', dark: '#30D158' },
  },
  {
    key: 'Blue',
    label: '藍色',
    light: '#ADD8E6',
    dark: '#1E4553',
    swatch: { light: { fill: '#DBEFFF', ink: '#0040DD' }, dark: { fill: '#183554', ink: '#5CAAFF' } },
    dot: { light: '#007AFF', dark: '#0A84FF' },
  },
  {
    key: 'Purple',
    label: '紫色',
    light: '#E299FF',
    dark: '#4B2C5E',
    swatch: { light: { fill: '#F2E3FA', ink: '#8944AB' }, dark: { fill: '#432B51', ink: '#DA8FFF' } },
    dot: { light: '#AF52DE', dark: '#BF5AF2' },
  },
  {
    key: 'Pink',
    label: '粉紅色',
    light: '#FFA1E4',
    dark: '#5E2A4F',
    swatch: { light: { fill: '#FFE2E7', ink: '#BE0A3C' }, dark: { fill: '#4E222C', ink: '#FF6482' } },
    dot: { light: '#FF2D55', dark: '#FF375F' },
  },
];

const BY_KEY = new Map(CELL_COLORS.map((option) => [option.key, option]));

export function isCellColor(value: unknown): value is CellColor {
  return typeof value === 'string' && BY_KEY.has(value as CellColor);
}

/** How a cell in `color` is drawn in `scheme`; null for 預設, which leaves a lesson its subject's colour (lessonSwatch). */
export function cellSwatch(color: CellColor | undefined, scheme: 'light' | 'dark'): CellSwatch | null {
  return BY_KEY.get(color ?? 'Default')?.swatch?.[scheme] ?? null;
}

export function cellColorLabel(color: CellColor | undefined): string {
  return BY_KEY.get(color ?? 'Default')?.label ?? '預設（依科目）';
}
