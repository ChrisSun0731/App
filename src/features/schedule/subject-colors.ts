// One colour per subject. Each subject in a timetable gets a colour of its
// own from a wheel of hues that alternate between two lightness levels,
// placed by its name, so it has that colour in every cell, wherever it sits
// in the week. With the class's own (bundled) timetable as the anchor, its
// subjects keep their colours through edits (until the timetable passes 22
// subjects, which widens the wheel and moves every colour once); a subject
// the user types in takes a free colour around them. Across classes the same
// subject can get quite another colour. A colour the user picked for a slot
// (cell-colors.ts) wins.
import type { CellSwatch } from './cell-colors';
import { cellSwatch } from './cell-colors';
import { getAlternating, WEEKDAYS, type CellColor, type ScheduleRow } from './timetable';

/** Slots on the wheel: more than a class has subjects (14 to 20), so each gets one of its own. */
const SLOTS = 22;

/** The first slot's hue, set so the closest two of the 22 slots still differ clearly in both appearances (CIEDE2000 6.5 light, 5.8 dark, measured). */
const START_HUE = 10;

/**
 * Fill and ink as HSL (saturation, lightness) per scheme and level, the two
 * levels far enough apart that hue neighbours do not read as one colour.
 * Every hue keeps ink on fill at 5.2:1 or more (subject-colors.test.ts sweeps
 * them all).
 */
const LEVELS = {
  light: [
    { fill: [0.9, 0.86], ink: [0.7, 0.24] },
    { fill: [0.9, 0.74], ink: [0.8, 0.19] },
  ],
  dark: [
    { fill: [0.55, 0.2], ink: [0.8, 0.8] },
    { fill: [0.55, 0.27], ink: [0.8, 0.9] },
  ],
} as const;

/** A subject's place in the palette: its hue (degrees) and lightness level. */
export interface SubjectHue {
  hue: number;
  level: 0 | 1;
}

/** Subject name → its colour, for one timetable. */
export type SubjectPalette = ReadonlyMap<string, SubjectHue>;

/**
 * The timetable's distinct subjects, both weeks of a rotation included, in
 * the default sort order (UTF-16 code units). A rotation a subject was saved
 * over is not shown, so its names are left out.
 */
export function subjectNames(rows: readonly ScheduleRow[]): string[] {
  const names = new Set<string>();
  for (const row of rows) {
    for (const day of WEEKDAYS) {
      const cell = row[day];
      if (!cell) continue;
      const alternating = getAlternating(cell);
      for (const name of [cell.subject, alternating?.odd, alternating?.even]) {
        const trimmed = name?.trim();
        if (trimmed) names.add(trimmed);
      }
    }
  }
  return [...names].sort();
}

/** A stable number for `name`: 32-bit FNV-1a over its code points. */
function nameHash(name: string): number {
  let hash = 0x811c9dc5;
  for (const char of name) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** Slot `slot` of a wheel of `count`: odd slots take the second level, so hue neighbours differ in lightness. */
function slotHue(slot: number, count: number): SubjectHue {
  return { hue: (START_HUE + (slot * 360) / count) % 360, level: slot % 2 === 0 ? 0 : 1 };
}

/** A wheel of `count` slots for `size` subjects: 22, or the next even number past a larger timetable. */
function wheelSize(size: number): number {
  return Math.max(SLOTS, size + (size % 2));
}

/**
 * Puts each of `names`, in order, on the slot its name hashes to or, when that
 * one is taken, the next free one round the wheel.
 */
function place(names: readonly string[], count: number, taken: Set<number>, slots: Map<string, number>) {
  for (const name of names) {
    let slot = nameHash(name) % count;
    while (taken.has(slot)) slot = (slot + 1) % count;
    taken.add(slot);
    slots.set(name, slot);
  }
}

/**
 * The palette of `rows`. Without `base`, every subject is placed by its name
 * (`place`, in the default sort order), so the palette depends only on which
 * subjects there are. With `base`, the class's own (bundled) timetable, its
 * subjects take the slots they have on its own wheel, so editing the user's
 * copy does not move them; the other subjects (typed in, or from another
 * term) are then placed by name on the slots left, and can move when those
 * change (another typed-in subject, or a base subject cleared or restored).
 * The wheel has an even number of slots, so the lightness alternates all the
 * way round; it only grows past 22, for a timetable (or base) with more
 * subjects than that, and then every colour moves, anchored ones included.
 * The slots always outnumber the names, so placing never runs out.
 */
export function subjectPalette(rows: readonly ScheduleRow[], base?: readonly ScheduleRow[]): SubjectPalette {
  const names = subjectNames(rows);
  const baseNames = base ? subjectNames(base) : [];
  const count = wheelSize(Math.max(names.length, baseNames.length));
  const anchors = new Map<string, number>();
  place(baseNames, count, new Set(), anchors);
  const slots = new Map<string, number>();
  const taken = new Set<number>();
  for (const name of names) {
    const anchor = anchors.get(name);
    if (anchor === undefined) continue;
    slots.set(name, anchor);
    taken.add(anchor);
  }
  place(
    names.filter((name) => !anchors.has(name)),
    count,
    taken,
    slots,
  );
  const palette = new Map<string, SubjectHue>();
  for (const name of names) palette.set(name, slotHue(slots.get(name)!, count));
  return palette;
}

/** "#RRGGBB" for an HSL colour (hue in degrees, saturation and lightness 0–1). */
export function hslHex(hue: number, saturation: number, lightness: number): string {
  const a = saturation * Math.min(lightness, 1 - lightness);
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12;
    const value = lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

/** The fill and ink of a palette entry in `scheme`. */
export function hueSwatch({ hue, level }: SubjectHue, scheme: 'light' | 'dark'): CellSwatch {
  const { fill, ink } = LEVELS[scheme][level];
  return { fill: hslHex(hue, fill[0], fill[1]), ink: hslHex(hue, ink[0], ink[1]) };
}

/**
 * A palette entry's hue as a picker dot (the 顏色 picker's 預設): saturated
 * like the system hues the other colours' dots use, rather than the soft fill.
 */
export function subjectDot({ hue }: SubjectHue, scheme: 'light' | 'dark'): string {
  return hslHex(hue, 0.85, scheme === 'light' ? 0.55 : 0.62);
}

/**
 * How a lesson cell is drawn: the user's colour when they chose one, else the
 * subject's colour in `palette`; null for a 空堂, which is the plain cell
 * whatever colour the slot has (a rotation's empty week keeps the slot's).
 */
export function lessonSwatch(
  cell: { subject: string; color?: CellColor },
  scheme: 'light' | 'dark',
  palette: SubjectPalette,
): CellSwatch | null {
  const name = cell.subject.trim();
  if (!name) return null;
  if (cell.color && cell.color !== 'Default') return cellSwatch(cell.color, scheme);
  // Callers pass the palette of the rows they draw, so every name is in it. A
  // stray one gets the slot its name hashes to, which a subject may have too.
  return hueSwatch(palette.get(name) ?? slotHue(nameHash(name) % SLOTS, SLOTS), scheme);
}
