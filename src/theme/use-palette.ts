// Platform implementations live in use-palette.ios.ts and use-palette.android.ts.
// This fallback only exists so TypeScript and Jest can resolve the module.
import { useColorScheme } from 'react-native';

import { BRAND } from './brand';
import type { Palette } from './palette';

export function usePalette(): Palette {
  const dark = useColorScheme() === 'dark';
  return {
    background: dark ? '#000000' : '#F2F2F7',
    surface: dark ? '#1C1C1E' : '#FFFFFF',
    surfaceHighlight: dark ? '#2C2C2E' : '#E5E5EA',
    text: dark ? '#FFFFFF' : '#000000',
    textSecondary: dark ? '#EBEBF599' : '#3C3C4399',
    textTertiary: dark ? '#EBEBF54D' : '#3C3C434D',
    separator: dark ? '#54545899' : '#3C3C434A',
    tint: dark ? '#8EAEFF' : BRAND,
    onTint: dark ? '#001A4D' : '#FFFFFF',
    tintContainer: dark ? '#1B2A4A' : '#E6ECFA',
    onTintContainer: dark ? '#D7E2FF' : '#0B2A6B',
    danger: '#FF3B30',
    scheme: dark ? 'dark' : 'light',
  };
}
