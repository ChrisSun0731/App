import { describe, expect, test } from '@jest/globals';

import { hslHex, hueSwatch, lessonSwatch, subjectNames, subjectPalette, type SubjectHue } from './subject-colors';
import { PERIOD_NAMES, WEEKDAYS, type ScheduleCell, type ScheduleRow } from './timetable';

/** Rows from columns of subject names (Monday to Friday), one period per index. */
function timetable(days: Record<(typeof WEEKDAYS)[number], (string | ScheduleCell)[]>): ScheduleRow[] {
  const periods = Math.max(...WEEKDAYS.map((day) => days[day].length));
  return PERIOD_NAMES.slice(0, periods).map((name, index) => {
    const row = { name } as ScheduleRow;
    for (const day of WEEKDAYS) {
      const value = days[day][index] ?? '';
      row[day] = typeof value === 'string' ? { subject: value } : value;
    }
    return row;
  });
}

// Class 201, 115學年度第1學期 (CKApp-Dev/Data schedules/gaoer_schedules.json).
const CLASS_201 = timetable({
  Monday: ['公民與社會', '公民與社會', '體育', '數學(彈性學習)', '化學', '國語文', '國語文', ''],
  Tuesday: ['選修生物', '選修生物', '國語文', '國語文', '英語文', '英語文', '音樂', ''],
  Wednesday: ['各類文學選讀', '各類文學選讀', '物理', '英語文', '地理', '地理', '班會', ''],
  Thursday: ['體育', '音樂', '歷史', '歷史', '數學', '數學', '英語文', ''],
  Friday: ['生活科技', '生活科技', '彈性學習', '彈性學習', '綜合活動', '數學', '數學', ''],
});

function linear(hex: string, index: number): number {
  const value = parseInt(hex.slice(index, index + 2), 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  return 0.2126 * linear(hex, 1) + 0.7152 * linear(hex, 3) + 0.0722 * linear(hex, 5);
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** CIELAB (D65) of "#RRGGBB". */
function lab(hex: string): [number, number, number] {
  const [r, g, b] = [linear(hex, 1), linear(hex, 3), linear(hex, 5)];
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** How far apart two colours look (CIE76 ΔE). */
function distance(a: string, b: string): number {
  const [p, q] = [lab(a), lab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/** `rows` with `cell` in one slot. */
function withCell(rows: ScheduleRow[], period: string, day: (typeof WEEKDAYS)[number], cell: ScheduleCell): ScheduleRow[] {
  return rows.map((row) => (row.name === period ? { ...row, [day]: cell } : row));
}

/** The wheel's slot of a palette entry (22 slots from hue 10, or `count`). */
function slotOf({ hue }: SubjectHue, count = 22): number {
  return Math.round(((hue - 10 + 360) % 360) / (360 / count));
}

describe('one colour per subject', () => {
  test('the subjects: trimmed, both weeks of a rotation, each once', () => {
    const rows = timetable({
      Monday: [' 數學 ', { subject: '物理', alternating: { odd: '物理', even: '化學' } }],
      Tuesday: ['英語文', ''],
      Wednesday: ['數學', '國語文'],
      Thursday: ['', ''],
      Friday: ['', '物理'],
    });
    expect(subjectNames(rows)).toEqual(['化學', '國語文', '數學', '物理', '英語文']);
    expect(subjectNames([])).toEqual([]);
    // A subject the previous build saved over a rotation: the rotation is not shown, so not counted.
    const stale = timetable({ Monday: [{ subject: '自習', alternating: { odd: '物理', even: '化學' } }], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] });
    expect(subjectNames(stale)).toEqual(['自習']);
  });

  test('every subject of a real class gets its own colour, the same wherever it sits in the week', () => {
    const palette = subjectPalette(CLASS_201);
    expect(palette.size).toBe(17);
    for (const scheme of ['light', 'dark'] as const) {
      const fills = [...palette.values()].map((hue) => hueSwatch(hue, scheme).fill);
      expect(new Set(fills).size).toBe(17);
    }
    // Only which subjects there are matters, not where they sit.
    const reversed = CLASS_201.map((row, index) => ({ ...CLASS_201[CLASS_201.length - 1 - index], name: row.name }));
    expect(subjectPalette(reversed)).toEqual(palette);
    // Pinned, so a change to the hash, the placing order or the wheel shows up
    // here: 歷史 hashes to 公民與社會's slot (18) and, placed after it and the
    // two names on 19 and 20, goes on to 21.
    expect(palette.get('國語文')).toEqual({ hue: 10 + (19 * 360) / 22, level: 1 });
    expect(palette.get('歷史')).toEqual({ hue: 10 + (21 * 360) / 22, level: 1 });
    // Anchored on itself, an unedited timetable has the same colours.
    expect(subjectPalette(CLASS_201, CLASS_201)).toEqual(palette);
  });

  test('anchored on the class’s own timetable, its subjects keep their colours through edits (up to 22 subjects)', () => {
    const own = subjectPalette(CLASS_201, CLASS_201);
    const edits: [string, ScheduleRow[]][] = [
      ['自習 in an empty slot', withCell(CLASS_201, '八', 'Monday', { subject: '自習' })],
      ['班會 gone', withCell(CLASS_201, '七', 'Wednesday', { subject: '' })],
      ['體育 renamed', withCell(withCell(CLASS_201, '一', 'Thursday', { subject: '游泳' }), '三', 'Monday', { subject: '游泳' })],
      ['every 第八節 filled', WEEKDAYS.reduce((rows, day, index) => withCell(rows, '八', day, { subject: ['社團', '自習', '補考', '週會', '輔導'][index] }), CLASS_201)],
    ];
    for (const [edit, rows] of edits) {
      const palette = subjectPalette(rows, CLASS_201);
      for (const [name, hue] of palette) if (own.has(name)) expect([edit, name, hue]).toEqual([edit, name, own.get(name)]);
      // The new subjects take free slots: still one colour each.
      expect([edit, new Set([...palette.values()].map((entry) => slotOf(entry))).size]).toEqual([edit, palette.size]);
    }
  });

  test('the wheel: a slot per subject, lightness alternating all the way round', () => {
    for (const entry of subjectPalette(CLASS_201).values()) expect(entry.level).toBe(slotOf(entry) % 2);
    // 25 subjects take a wheel of 26 (even, so the wrap alternates too), each its own slot.
    const many = Array.from({ length: 25 }, (_, index) => `科目${index}`);
    const rows = timetable({
      Monday: many.slice(0, 5),
      Tuesday: many.slice(5, 10),
      Wednesday: many.slice(10, 15),
      Thursday: many.slice(15, 20),
      Friday: many.slice(20, 25),
    });
    const slots = [...subjectPalette(rows).values()].map((entry) => {
      const slot = slotOf(entry, 26);
      expect(Math.abs(entry.hue - (10 + (slot * 360) / 26))).toBeLessThan(1e-9);
      expect(entry.level).toBe(slot % 2);
      return slot;
    });
    expect(new Set(slots).size).toBe(25);
    // 24 subjects: a wheel of 24, so every hue is on its 15° grid.
    const rows24 = timetable({
      Monday: many.slice(0, 5),
      Tuesday: many.slice(5, 10),
      Wednesday: many.slice(10, 15),
      Thursday: many.slice(15, 20),
      Friday: many.slice(20, 24),
    });
    for (const entry of subjectPalette(rows24).values()) {
      const slot = slotOf(entry, 24);
      expect(Math.abs(entry.hue - (10 + slot * 15))).toBeLessThan(1e-9);
      expect(entry.level).toBe(slot % 2);
    }
  });

  test('no two slots look alike (CIELAB ΔE 9 or more) and text stays at 5.2:1 or more on every fill', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const fills = Array.from({ length: 22 }, (_, slot) => hueSwatch({ hue: 10 + (slot * 360) / 22, level: slot % 2 === 0 ? 0 : 1 }, scheme).fill);
      let closest = Infinity;
      for (let a = 0; a < fills.length; a++) for (let b = a + 1; b < fills.length; b++) closest = Math.min(closest, distance(fills[a], fills[b]));
      expect([scheme, closest >= 9]).toEqual([scheme, true]);
    }
    let worst = Infinity;
    for (const scheme of ['light', 'dark'] as const) {
      for (const level of [0, 1] as const) {
        for (let hue = 0; hue < 360; hue += 0.5) {
          const { fill, ink } = hueSwatch({ hue, level }, scheme);
          worst = Math.min(worst, contrast(fill, ink));
        }
      }
    }
    expect(worst).toBeGreaterThanOrEqual(5.2);
  });

  test('hslHex', () => {
    expect(hslHex(0, 1, 0.5)).toBe('#FF0000');
    expect(hslHex(120, 1, 0.25)).toBe('#008000');
    expect(hslHex(240, 1, 0.5)).toBe('#0000FF');
    expect(hslHex(0, 0, 1)).toBe('#FFFFFF');
  });

  test('the user’s own colour wins; 預設 means the subject’s colour; a 空堂 is plain', () => {
    const palette = subjectPalette(CLASS_201);
    const physics = hueSwatch(palette.get('物理')!, 'light');
    expect(lessonSwatch({ subject: '物理', color: 'Purple' }, 'light', palette)).toEqual({ fill: '#F2E3FA', ink: '#8944AB' });
    expect(lessonSwatch({ subject: '物理', color: 'Default' }, 'light', palette)).toEqual(physics);
    expect(lessonSwatch({ subject: ' 物理 ' }, 'light', palette)).toEqual(physics);
    expect(lessonSwatch({ subject: '' }, 'light', palette)).toBeNull();
    // A coloured slot that is blank this week is still the plain cell.
    expect(lessonSwatch({ subject: '', color: 'Red' }, 'light', palette)).toBeNull();
    // A stray name outside the palette: the slot its name hashes to, the same every time.
    const stray = lessonSwatch({ subject: '天文學' }, 'light', palette);
    expect(stray).not.toBeNull();
    expect(lessonSwatch({ subject: '天文學' }, 'light', new Map())).toEqual(stray);
  });
});
