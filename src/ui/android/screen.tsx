import {
  Box,
  Card,
  Column,
  ExtendedFloatingActionButton,
  Host,
  Icon,
  LazyColumn,
  PullToRefreshBox,
  Text,
} from '@expo/ui/jetpack-compose';
import { align, clip, fillMaxSize, fillMaxWidth, imePadding, padding, Shapes } from '@expo/ui/jetpack-compose/modifiers';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Keyboard, View } from 'react-native';
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BRAND } from '@/theme/brand';

import type { ButtonRowProps, ListScreenProps, SectionProps } from '../types';
import { MonthCalendar } from './calendar';
import { Embedded, EmptyState, Loading, Notice, TextBlock, TileGrid } from './content';
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

/**
 * The soft keyboard's height above the navigation bar (React Native reports
 * the IME inset less the system bar inset), 0 while it is hidden. Android
 * reports only the Did events.
 */
function useKeyboardHeight(): number {
  const [height, setHeight] = useState(() => (Keyboard.isVisible() ? (Keyboard.metrics()?.height ?? 0) : 0));
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => setHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}


/** Room the extended FAB (56dp + its 16dp margin) takes over the list's end. */
const FAB_CLEARANCE = 80;

export function ListScreen({ children, onRefresh, refreshing = false, fab }: ListScreenProps) {
  const insets = useSafeAreaInsets();
  const frame = useSafeAreaFrame();
  const keyboard = useKeyboardHeight();
  const [pulling, setPulling] = useState(false);

  // How far this screen's bottom edge sits above the window's: 0 on pushed
  // screens and modals, which reach it. A tab's content already ends at the
  // bottom navigation bar (expo-router wraps each Android tab in
  // react-native-screens' bottom-edge SafeAreaView), so there it is the
  // bar's height, while the root safe area still reports the whole
  // navigation-bar inset and Compose's IME inset still counts from the
  // window's bottom. Measured in window coordinates against the safe-area
  // frame, the space both insets are relative to.
  const container = useRef<View>(null);
  const [containerBottom, setContainerBottom] = useState<number | null>(null);
  const bottomGap = containerBottom === null ? 0 : Math.max(0, Math.round(frame.y + frame.height - containerBottom));
  function measureBottom() {
    container.current?.measureInWindow((_x, y, _width, height) => setContainerBottom(y + height));
  }

  // The parts of the navigation bar and of the keyboard that cover this
  // screen: all of them on a pushed screen; above a tab bar, none of the
  // navigation bar and only the keyboard's overlap (it covers the tab bar).
  const navigationBar = Math.max(0, insets.bottom - bottomGap);
  const keyboardOverlap = keyboard > 0 ? Math.max(0, keyboard + insets.bottom - bottomGap) : 0;
  // Reaching the window's bottom, imePadding keeps a focused field in a modal
  // editor above the keyboard, animating with it (the window is edge-to-edge,
  // so it no longer resizes). Above a tab bar it would pad by the bar's
  // height too much, and Compose cannot subtract it, so the measured overlap
  // pads instead.
  const keyboardPadding = bottomGap > 0 ? padding(0, 0, 0, keyboardOverlap) : imePadding();

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
      modifiers={[fillMaxSize(), keyboardPadding]}
      contentPadding={{
        start: GUTTER + insets.left,
        top: 8,
        end: GUTTER + insets.right,
        // The keyboard padding already covers the navigation bar, and the FAB
        // stays behind the keyboard, so neither is cleared while it is up
        // (@expo/ui has no consumeWindowInsets to do this natively).
        bottom: keyboard > 0 ? 16 : navigationBar + 16 + (fab ? FAB_CLEARANCE : 0),
      }}
      verticalArrangement={{ spacedBy: 16 }}>
      {children}
    </LazyColumn>
  );

  return (
    // The plain View only measures where the screen ends (bottomGap above).
    <View ref={container} onLayout={measureBottom} collapsable={false} style={{ flex: 1 }}>
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
              modifiers={[align('bottomEnd'), padding(0, 0, 16 + insets.right, navigationBar + 16)]}>
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
    </View>
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
