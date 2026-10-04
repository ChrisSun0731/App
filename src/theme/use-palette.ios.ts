import { DynamicColorIOS, PlatformColor, useColorScheme } from 'react-native';

import { BRAND } from './brand';
import type { Palette } from './palette';

// The navy is too dark to read on a dark background; the dark-mode variant is
// the same hue lifted to keep 4.5:1 against systemBackground.
const tint = DynamicColorIOS({ light: BRAND, dark: '#8EAEFF' });

const STATIC: Omit<Palette, 'scheme'> = {
  background: PlatformColor('systemGroupedBackground'),
  surface: PlatformColor('secondarySystemGroupedBackground'),
  surfaceHighlight: PlatformColor('tertiarySystemGroupedBackground'),
  text: PlatformColor('label'),
  textSecondary: PlatformColor('secondaryLabel'),
  textTertiary: PlatformColor('tertiaryLabel'),
  separator: PlatformColor('separator'),
  tint,
  onTint: DynamicColorIOS({ light: '#FFFFFF', dark: '#001A4D' }),
  tintContainer: DynamicColorIOS({ light: '#E6ECFA', dark: '#1B2A4A' }),
  onTintContainer: DynamicColorIOS({ light: '#0B2A6B', dark: '#D7E2FF' }),
  danger: PlatformColor('systemRed'),
};

export function usePalette(): Palette {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { ...STATIC, scheme };
}
