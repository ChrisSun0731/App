import { useMaterialColors } from '@expo/ui/jetpack-compose';
import { useColorScheme } from 'react-native';

import { BRAND } from './brand';
import type { Palette } from './palette';

/** Material 3 roles of the CK palette (SchemeTonalSpot seeded with the navy). */
export function usePalette(): Palette {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const m = useMaterialColors({ seedColor: BRAND });
  return {
    background: m.surface,
    surface: m.surfaceContainerLow,
    surfaceHighlight: m.surfaceContainerHigh,
    text: m.onSurface,
    textSecondary: m.onSurfaceVariant,
    textTertiary: m.outline,
    separator: m.outlineVariant,
    tint: m.primary,
    onTint: m.onPrimary,
    tintContainer: m.primaryContainer,
    onTintContainer: m.onPrimaryContainer,
    danger: m.error,
    scheme,
  };
}
