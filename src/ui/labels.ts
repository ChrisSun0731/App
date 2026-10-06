// Spoken labels the kits share. Plain functions, so Jest can check them.

/**
 * One spoken phrase (VoiceOver, TalkBack) from a row's visible texts in
 * reading order, joined with a pause; blank parts are skipped.
 */
export function spokenLabel(parts: readonly (string | false | null | undefined)[]): string {
  return parts.filter((part): part is string => typeof part === 'string' && part.trim() !== '').join('，');
}

/**
 * The spoken label of a control that is shown but turned off. iOS says
 * "dimmed" itself; Compose's semantics in @expo/ui only take a description,
 * so a row that merely drops its click action states it in words, or
 * TalkBack would read plain text that does nothing on a double tap.
 */
export function disabledLabel(label: string): string {
  return spokenLabel([label, '已停用']);
}

/**
 * The spoken label of a row's overflow (more options) button. It names the
 * row: TalkBack reads the button on its own, and a bare 更多選項 would sound
 * the same on every row.
 */
export function overflowMenuLabel(rowName: string): string {
  const name = rowName.trim();
  return name ? `「${name}」的更多選項` : '更多選項';
}
