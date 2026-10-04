// Shared bits of the Compose kit: the seeded Material 3 palette, shapes and
// the "inside a section card" context.
import { Shape, useMaterialColors, type MaterialColors } from '@expo/ui/jetpack-compose';
import { createContext, useContext } from 'react';
import type { ImageSourcePropType } from 'react-native';

import type { IconValue } from '../types';

/**
 * The palette of the surrounding ListScreen Host (SchemeTonalSpot seeded with
 * the CK navy, light or dark with the system), as "#RRGGBBAA" strings.
 */
export function useM3(): MaterialColors {
  return useMaterialColors();
}

export const TRANSPARENT = '#00000000';

/** Corner radius of section cards (Material's large shape is 16dp; Settings-style groups use 20dp+). */
export const CARD_RADIUS = 20;

export function roundedShape(radius: number) {
  return Shape.RoundedCorner({
    cornerRadii: { topStart: radius, topEnd: radius, bottomStart: radius, bottomEnd: radius },
  });
}

/** On Android an IconValue is always a required Material Symbols XML asset. */
export function iconSource(icon: IconValue): ImageSourcePropType {
  return icon as ImageSourcePropType;
}

/**
 * True for rows drawn inside a Section card. Content that would otherwise
 * bring its own container (a Notice, the tiles, an embedded map) uses it to
 * avoid a card inside a card, and to pick its padding.
 */
export const InCardContext = createContext(false);

export function useInCard(): boolean {
  return useContext(InCardContext);
}
