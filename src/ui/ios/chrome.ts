// Shared SwiftUI styling for the kit's rows: list-row chrome and the semantic
// text styles every row uses.
import {
  foregroundStyle,
  listRowBackground,
  listRowInsets,
  listRowSeparator,
  type ModifierConfig,
} from '@expo/ui/swift-ui/modifiers';
import { createContext, useContext } from 'react';
import { PlatformColor } from 'react-native';

import type { HexColor } from '../types';

// Hierarchical styles resolve against the current foreground style, so they
// follow light/dark mode and Increase Contrast like UIKit's label colours.
export const primaryText = foregroundStyle({ type: 'hierarchical', style: 'primary' });
export const secondaryText = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
export const tertiaryText = foregroundStyle({ type: 'hierarchical', style: 'tertiary' });

/** The quiet grey fill iOS uses behind small controls (pills, tiles). */
export const QUIET_FILL = PlatformColor('tertiarySystemFill');
export const DESTRUCTIVE = PlatformColor('systemRed');
export const NEUTRAL = PlatformColor('systemGray');

export const NO_INSETS = listRowInsets({ top: 0, leading: 0, bottom: 0, trailing: 0 });

/** True inside a `plain` Section: rows float on the grouped background. */
export const PlainSectionContext = createContext(false);

/**
 * Modifiers for a kit row's root view, the view SwiftUI's List treats as the
 * row. In a plain Section the row background is clear and separators are
 * hidden; `flushInPlain` also removes the row insets so controls such as a
 * segmented picker line up with the cards above and below.
 */
export function useRowChrome({ background, flushInPlain = false }: {
  background?: HexColor;
  flushInPlain?: boolean;
} = {}): ModifierConfig[] {
  const plain = useContext(PlainSectionContext);
  const chrome: ModifierConfig[] = [];
  if (background) {
    chrome.push(listRowBackground(background));
  } else if (plain) {
    chrome.push(listRowBackground('clear'));
  }
  if (plain) {
    chrome.push(listRowSeparator('hidden'));
    if (flushInPlain) chrome.push(NO_INSETS);
  }
  return chrome;
}

/** Whether the current row sits in a plain Section. */
export function useIsPlainSection(): boolean {
  return useContext(PlainSectionContext);
}
