// Platform-neutral pure helpers shared by the SwiftUI and Compose kits (and
// the Android header actions). Nothing here imports @expo/ui, so Jest runs
// them (see helpers.test.ts).

/**
 * Applies `alpha` (0–1) to a "#RRGGBB" or "#RRGGBBAA" colour as "#RRGGBBAA"
 * (which both @expo/ui colour parsers read CSS-style), multiplying any alpha
 * it already has. Other colour strings (named or platform colours) are
 * returned unchanged.
 */
export function withAlpha(color: string, alpha: number): string {
  const match = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(color);
  if (!match) return color;
  const base = match[2] ? parseInt(match[2], 16) / 255 : 1;
  const value = Math.round(Math.min(1, Math.max(0, base * alpha)) * 255);
  return `#${match[1]}${value.toString(16).padStart(2, '0')}`.toUpperCase();
}

/** Splits `items` into rows of `size` (the last row may be shorter). */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const step = Math.max(1, Math.floor(size));
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += step) rows.push(items.slice(index, index + step));
  return rows;
}
