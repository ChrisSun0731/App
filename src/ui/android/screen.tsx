import {
  Box,
  Card,
  Column,
  ExtendedFloatingActionButton,
  HorizontalDivider,
  Host,
  Icon,
  LazyColumn,
  PullToRefreshBox,
  Text,
} from '@expo/ui/jetpack-compose';
import { align, clip, fillMaxSize, fillMaxWidth, imePadding, padding, Shapes } from '@expo/ui/jetpack-compose/modifiers';
import { useState, type ReactElement } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BRAND } from '@/theme/brand';

import type { ButtonRowProps, ListScreenProps, SectionProps } from '../types';
import { flattenChildren } from './helpers';
import { ButtonRow, CheckRow, DateRow, Row, ToggleRow } from './rows';
import { CARD_RADIUS, iconSource, InCardContext, useM3 } from './theme';

/** Kit rows drawn as a Material ListItem. */
const LIST_ITEMS = new Set<unknown>([Row, CheckRow, ToggleRow, DateRow, ButtonRow]);

function isListItem(element: ReactElement): boolean {
  if (!LIST_ITEMS.has(element.type)) return false;
  return !(element.type === ButtonRow && (element.props as ButtonRowProps).prominent);
}

/** Room the extended FAB (56dp + its 16dp margin) takes over the list's end. */
const FAB_CLEARANCE = 80;

export function ListScreen({ children, onRefresh, fab }: ListScreenProps) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } catch {
      // Screens show their own error state (a Notice); the indicator only
      // has to stop.
    } finally {
      setRefreshing(false);
    }
  }

  // Each direct child of LazyColumn becomes one lazy item (LazyColumnView.kt),
  // which is why a Section renders as a single Column.
  const list = (
    <LazyColumn
      // imePadding keeps a focused text field in modal editors above the
      // keyboard: the window is edge-to-edge, so it no longer resizes.
      modifiers={[fillMaxSize(), imePadding()]}
      contentPadding={{
        start: 16,
        top: 8,
        end: 16,
        bottom: insets.bottom + 16 + (fab ? FAB_CLEARANCE : 0),
      }}
      verticalArrangement={{ spacedBy: 16 }}>
      {children}
    </LazyColumn>
  );

  return (
    <Host style={{ flex: 1 }} seedColor={BRAND}>
      <Box modifiers={[fillMaxSize()]}>
        {onRefresh ? (
          <PullToRefreshBox isRefreshing={refreshing} onRefresh={() => void refresh()} modifiers={[fillMaxSize()]}>
            {list}
          </PullToRefreshBox>
        ) : (
          list
        )}
        {fab ? (
          <ExtendedFloatingActionButton
            onClick={fab.onPress}
            modifiers={[align('bottomEnd'), padding(0, 0, 16, insets.bottom + 16)]}>
            <ExtendedFloatingActionButton.Icon>
              <Icon source={iconSource(fab.icon)} size={24} />
            </ExtendedFloatingActionButton.Icon>
            <ExtendedFloatingActionButton.Text>
              <Text style={{ typography: 'labelLarge' }}>{fab.label}</Text>
            </ExtendedFloatingActionButton.Text>
          </ExtendedFloatingActionButton>
        ) : null}
      </Box>
    </Host>
  );
}

export function Section({ title, footer, plain = false, children }: SectionProps) {
  const m = useM3();
  const rows = flattenChildren(children);

  let body: ReactElement | null = null;
  if (rows.length > 0 && plain) {
    body = (
      <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 8 }}>
        {rows}
      </Column>
    );
  } else if (rows.length > 0) {
    // A filled card on surfaceContainerLow. The clip gives the rounder
    // Settings-style corners and keeps row ripples (and row background
    // colours) inside them. Inset dividers separate adjacent list items only:
    // outlined fields, chips, tiles and text blocks carry their own padding,
    // and a line between two outlined fields reads as clutter in a form.
    body = (
      <Card
        colors={{ containerColor: m.surfaceContainerLow }}
        modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(CARD_RADIUS))]}>
        {rows.flatMap((row, index) =>
          index > 0 && isListItem(rows[index - 1]) && isListItem(row)
            ? [<HorizontalDivider key={`divider:${row.key}`} modifiers={[padding(16, 0, 16, 0)]} />, row]
            : [row],
        )}
      </Card>
    );
  }

  return (
    <Column modifiers={[fillMaxWidth()]}>
      {title ? (
        <Text color={m.primary} style={{ typography: 'titleSmall' }} modifiers={[padding(16, 4, 16, 8)]}>
          {title}
        </Text>
      ) : null}
      <InCardContext.Provider value={!plain}>{body}</InCardContext.Provider>
      {footer ? (
        <Text
          color={m.onSurfaceVariant}
          style={{ typography: 'bodySmall' }}
          modifiers={[padding(16, 8, 16, 0)]}>
          {footer}
        </Text>
      ) : null}
    </Column>
  );
}
