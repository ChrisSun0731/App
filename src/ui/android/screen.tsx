import {
  Box,
  Card,
  Column,
  ExtendedFloatingActionButton,
  Host,
  Icon,
  LazyColumn,
  PullToRefreshBox,
  Row as ComposeRow,
  Text,
  TextButton,
} from '@expo/ui/jetpack-compose';
import { align, clip, fillMaxSize, fillMaxWidth, imePadding, padding, Shapes, weight } from '@expo/ui/jetpack-compose/modifiers';
import { useEffect, useState, type ReactElement } from 'react';
import { Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BRAND } from '@/theme/brand';

import type { ButtonRowProps, ListScreenProps, SectionProps } from '../types';
import { MonthCalendar } from './calendar';
import { ChoiceGrid, Embedded, EmptyState, Loading, Notice, TextBlock, TileGrid } from './content';
import { DayStrip } from './day-strip';
import { FilterChips, PickerRow, TextFieldRow } from './controls';
import { MaskFirstDivider, RowDividerContext } from './divider';
import { flattenChildren, slotDividers, type SlotKind } from './helpers';
import { ButtonRow, CheckRow, DateRow, Row, ToggleRow } from './rows';
import { CARD_RADIUS, GUTTER, iconSource, InCardContext, useM3 } from './theme';

/** Kit rows drawn as a Material ListItem (they draw their own leading divider). */
const ROWS = new Set<unknown>([Row, CheckRow, ToggleRow, DateRow, ButtonRow]);

/** Kit content with its own padding, which never sits next to a divider. */
const CONTENT = new Set<unknown>([
  PickerRow,
  TextFieldRow,
  TextBlock,
  EmptyState,
  Notice,
  Loading,
  FilterChips,
  TileGrid,
  ChoiceGrid,
  DayStrip,
  MonthCalendar,
  Embedded,
]);

function slotKind(element: ReactElement): SlotKind {
  // A prominent ButtonRow is a filled button, not a list item.
  if (element.type === ButtonRow && (element.props as ButtonRowProps).prominent) return 'content';
  if (ROWS.has(element.type)) return 'row';
  // Anything else is a screen's own component, most likely wrapping rows.
  return CONTENT.has(element.type) ? 'content' : 'unknown';
}

/** Whether the soft keyboard is up (Android reports only the Did events). */
function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(() => Keyboard.isVisible());
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

/** Room the extended FAB (56dp + its 16dp margin) takes over the list's end. */
const FAB_CLEARANCE = 80;

export function ListScreen({ children, subtitle, onRefresh, refreshing = false, fab }: ListScreenProps) {
  const m = useM3();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const [pulling, setPulling] = useState(false);

  async function refresh() {
    if (!onRefresh) return;
    setPulling(true);
    try {
      await onRefresh();
    } catch {
      // Screens show their own error state (a Notice); the indicator only
      // has to stop.
    } finally {
      setPulling(false);
    }
  }

  // Each direct child of LazyColumn becomes one lazy item (LazyColumnView.kt),
  // which is why a Section renders as a single Column. The window is
  // edge-to-edge, so the content clears the system bars itself: the side
  // insets matter in landscape (3-button navigation bar, cutouts).
  const list = (
    <LazyColumn
      // imePadding keeps a focused text field in modal editors above the
      // keyboard: the window is edge-to-edge, so it no longer resizes.
      modifiers={[fillMaxSize(), imePadding()]}
      contentPadding={{
        start: GUTTER + insets.left,
        top: 8,
        end: GUTTER + insets.right,
        // The IME inset already includes the navigation bar, and the FAB
        // stays behind the keyboard, so neither is cleared while it is up
        // (@expo/ui has no consumeWindowInsets to do this natively).
        bottom: keyboardVisible ? 16 : insets.bottom + 16 + (fab ? FAB_CLEARANCE : 0),
      }}
      verticalArrangement={{ spacedBy: 16 }}>
      {/* The screen's subtitle under the top app bar's title, e.g. today's date. */}
      {subtitle ? (
        <Text color={m.onSurfaceVariant} style={{ typography: 'bodyMedium' }} modifiers={[padding(16, 0, 16, 0)]}>
          {subtitle}
        </Text>
      ) : null}
      {children}
    </LazyColumn>
  );

  return (
    <Host style={{ flex: 1 }} seedColor={BRAND}>
      <Box modifiers={[fillMaxSize()]}>
        {onRefresh ? (
          // One indicator for a pull and for a refresh the screen started
          // itself (`refreshing`, e.g. a header button): Compose shows the
          // same spinner while either runs.
          <PullToRefreshBox
            isRefreshing={refreshing || pulling}
            onRefresh={() => void refresh()}
            modifiers={[fillMaxSize()]}>
            {list}
          </PullToRefreshBox>
        ) : (
          list
        )}
        {fab ? (
          <ExtendedFloatingActionButton
            onClick={fab.onPress}
            modifiers={[align('bottomEnd'), padding(0, 0, 16 + insets.right, insets.bottom + 16)]}>
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

export function Section({
  title,
  titleBadge,
  detail,
  action,
  prominent = false,
  footer,
  footerAction,
  plain = false,
  children,
}: SectionProps) {
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
    // colours) inside them. Rows draw their own inset dividers where
    // slotDividers() says, so wrappers around rows get them too.
    const dividers = slotDividers(rows.map(slotKind));
    body = (
      <Card
        colors={{ containerColor: m.surfaceContainerLow }}
        modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(CARD_RADIUS))]}>
        {rows.map((row, index) => {
          const { rowsDraw, maskFirst } = dividers[index];
          const slot = (
            <RowDividerContext.Provider key={row.key} value={rowsDraw}>
              {row}
            </RowDividerContext.Provider>
          );
          return maskFirst ? (
            <MaskFirstDivider key={row.key} color={m.surfaceContainerLow}>
              {slot}
            </MaskFirstDivider>
          ) : (
            slot
          );
        })}
      </Card>
    );
  }

  return (
    <Column modifiers={[fillMaxWidth()]}>
      {title || detail || action ? (
        // A prominent header is the group's own title (titleLarge on the
        // surface colour); the others are Material's small primary labels.
        <ComposeRow verticalAlignment="center" modifiers={[fillMaxWidth(), padding(prominent ? 4 : 16, 4, prominent ? 4 : 16, action ? 0 : 8)]}>
          <ComposeRow verticalAlignment="center" horizontalArrangement={{ spacedBy: 8 }} modifiers={[weight(1)]}>
            {title ? (
              <Text
                color={prominent ? m.onSurface : m.primary}
                style={prominent ? { typography: 'titleLarge', fontWeight: '700' } : { typography: 'titleSmall' }}>
                {title}
              </Text>
            ) : null}
            {titleBadge ? (
              <Text color={m.primary} style={{ typography: prominent ? 'titleMedium' : 'labelMedium' }}>
                {titleBadge}
              </Text>
            ) : null}
          </ComposeRow>
          {detail ? (
            <Text color={m.onSurfaceVariant} style={{ typography: 'bodySmall' }}>
              {detail}
            </Text>
          ) : null}
          {action ? (
            <TextButton onClick={action.onPress}>
              <Text>{action.label}</Text>
            </TextButton>
          ) : null}
        </ComposeRow>
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
      {footerAction ? (
        <TextButton onClick={footerAction.onPress} modifiers={[padding(4, 0, 4, 0)]}>
          <Text>{footerAction.label}</Text>
        </TextButton>
      ) : null}
    </Column>
  );
}
