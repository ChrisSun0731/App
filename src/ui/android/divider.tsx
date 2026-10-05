// Inset dividers between list rows in a section card. Each ListItem-based row
// draws its own leading divider from a context its Section sets per child, so
// rows rendered through a screen's own component (a TodoItem returning a
// CheckRow, memo(Row), a StationBlock returning several Rows) get them too.
// The Section decides where they go: see slotDividers() in helpers.ts.
import { Box, Column, HorizontalDivider } from '@expo/ui/jetpack-compose';
import { background, fillMaxWidth, height, padding } from '@expo/ui/jetpack-compose/modifiers';
import { createContext, useContext, type ReactNode } from 'react';

/** Material's DividerDefaults.Thickness, also the height of the mask below. */
const THICKNESS = 1;

/** True where the list rows below should draw an inset divider above themselves. */
export const RowDividerContext = createContext(false);

/** A ListItem row's leading divider; renders only where its Section asks for one. */
export function RowDivider() {
  return useContext(RowDividerContext) ? (
    <HorizontalDivider thickness={THICKNESS} modifiers={[padding(16, 0, 16, 0)]} />
  ) : null;
}

/**
 * Stacks a wrapper component's rows in a column and paints the first row's
 * divider over in the card colour. The Section cannot tell which row comes
 * first inside a wrapper, so it lets all of them draw and hides the top one
 * where no divider belongs (the top of the card, or right after a field).
 */
export function MaskFirstDivider({ color, children }: { color: string; children: ReactNode }) {
  return (
    <Box modifiers={[fillMaxWidth()]}>
      <Column modifiers={[fillMaxWidth()]}>{children}</Column>
      <Box modifiers={[fillMaxWidth(), height(THICKNESS), background(color)]} />
    </Box>
  );
}
