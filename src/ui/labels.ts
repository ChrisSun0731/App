// Spoken labels the kits share. Plain functions, so Jest can check them.

/**
 * The spoken label of a row's overflow (more options) button. It names the
 * row: TalkBack reads the button on its own, and a bare 更多選項 would sound
 * the same on every row.
 */
export function overflowMenuLabel(rowName: string): string {
  const name = rowName.trim();
  return name ? `「${name}」的更多選項` : '更多選項';
}
