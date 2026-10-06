import { DynamicColorIOS, PlatformColor, useColorScheme } from 'react-native';

import { BRAND, BRAND_DARK } from './brand';
import type { Palette } from './palette';

// The navy is too dark to read on a dark background (see BRAND_DARK).
const tint = DynamicColorIOS({ light: BRAND, dark: BRAND_DARK });

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
