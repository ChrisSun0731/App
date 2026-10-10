import { useWindowDimensions } from 'react-native';

/**
 * The font scale from which 課表 lists the week instead of its five columns.
 * The longest bundled subject name fits three lines up to it only on phones
 * about 405dp wide or more; narrower ones end it with an ellipsis from about
 * 1.3 (384dp) or 1.15 (360dp), which the list would cost them the week's
 * overview to avoid.
 */
const LARGE_FONT_SCALE = 1.5;

/** Whether the text is so large that columns side by side should stack. */
export function useAccessibilityTextSize(): boolean {
  return useWindowDimensions().fontScale >= LARGE_FONT_SCALE - 0.01;
}
