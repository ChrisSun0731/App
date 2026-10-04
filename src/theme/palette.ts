import type { ColorValue } from 'react-native';

/**
 * Semantic colours for React Native views, resolved per platform: iOS system
 * colours (which follow light/dark mode and Increase Contrast on their own),
 * and on Android a Material 3 palette generated from the CK navy.
 */
export interface Palette {
  /** Screen background behind grouped content. */
  background: ColorValue;
  /** Grouped cells, cards and tiles. */
  surface: ColorValue;
  /** A raised or highlighted surface (tile pressed, selected chip). */
  surfaceHighlight: ColorValue;
  text: ColorValue;
  textSecondary: ColorValue;
  textTertiary: ColorValue;
  separator: ColorValue;
  /** Brand accent: links, selection, the current period. */
  tint: ColorValue;
  onTint: ColorValue;
  /** Quiet brand-tinted fill, e.g. the current class card. */
  tintContainer: ColorValue;
  onTintContainer: ColorValue;
  danger: ColorValue;
  scheme: 'light' | 'dark';
}

export { BRAND } from './brand';
export { usePalette } from './use-palette';
