import { Button, Host, HStack, List, ProgressView, Section as SwiftUISection, Spacer, Text, VStack, type ScrollPhase } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  buttonStyle,
  environment,
  font,
  foregroundStyle,
  headerProminence,
  listRowBackground,
  listRowInsets,
  listRowSeparator,
  listSectionSpacing,
  listStyle,
  monospacedDigit,
  onScrollPhaseChange,
  refreshable,
  scrollDismissesKeyboard,
  useScrollGeometryChange,
  type ModifierConfig,
} from '@expo/ui/swift-ui/modifiers';
import { useEffect, useState, type ReactElement } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePalette } from '@/theme/palette';

import { ViewportContext } from '../fit';
import type { ListScreenProps, SectionProps } from '../types';
import { labelText, PlainSectionContext, secondaryLabelText } from './chrome';
import { isAccessibilityTextSize } from './helpers';

// The app's copy is Traditional Chinese only, so system-formatted content
// (DatePicker dates, its calendar popover) follows it instead of the device
// language.
const LOCALE = environment('locale', 'zh_Hant_TW');

/**
 * A screen: one SwiftUI `List` in an inset-grouped style filling a `Host`.
 *
 * Safe area: the Host keeps the default (no `ignoreSafeArea`). Its
 * UIHostingController is a child of the screen's view controller, so its
 * safe area carries the navigation bar, tab bar and home indicator, and
 * SwiftUI's List draws its background edge to edge while insetting rows
 * (scrolling under translucent bars, stopping above the tab bar). Keeping the
 * keyboard region lets the List lift a focused field above the keyboard in the
 * modal editors.
 *
 * Pull to refresh: @expo/ui wraps the view in one AnyView per modifier
 * (View+ModifierArray.swift), so adding or removing `refreshable` changes the
 * List's view type and SwiftUI rebuilds it, losing the scroll position and
 * any focused field. Once a screen has passed `onRefresh` the modifier stays;
 * while the handler is missing (e.g. `data ? refetch : undefined` after an
 * error) a pull just ends at once. Screens that refresh should pass
 * `onRefresh` from their first render, so the List is never rebuilt.
 *
 * `refreshing` (a refresh the screen started, e.g. from a header button):
 * SwiftUI only starts `refreshable`'s spinner for a pull, so a spinner row
 * sits above the first section instead, except during a pull, which already
 * shows one.
 */
export function ListScreen({ children, subtitle, onRefresh, refreshing = false }: ListScreenProps) {
  const palette = usePalette();
  const { width, height, fontScale } = useWindowDimensions();
  const safeFrame = useSafeAreaFrame();
  const insets = useSafeAreaInsets();
  const [refreshes, setRefreshes] = useState(onRefresh !== undefined);
  // Adjusting state while rendering (see above): latched on first sight.
  if (onRefresh && !refreshes) setRefreshes(true);
  const [pulling, setPulling] = useState(false);
  const [fitPaused, setFitPaused] = useState(false);
  const [refreshEpoch, setRefreshEpoch] = useState(0);
  const [scroll, setScroll] = useState({
    phase: 'idle' as ScrollPhase,
    baseline: null as number | null,
    offset: 0,
    epoch: 0,
  });
  const scrolled = scroll.baseline !== null && scroll.offset > scroll.baseline + 1;
  // Expo's geometry payload omits contentInsets. While idle at the top,
  // remember its native resting offset, including the navigation bar inset.
  // Once scrolling starts that baseline stays fixed until it returns there.
  const scrollGeometry = useScrollGeometryChange(({ contentOffsetY }) => {
    if (fitPaused) return;
    setScroll((previous) => {
      if (previous.phase !== 'idle' || (previous.baseline !== null && previous.offset > previous.baseline + 1)) return previous;
      if (previous.baseline === contentOffsetY && previous.offset === contentOffsetY) return previous;
      return { ...previous, baseline: contentOffsetY, offset: contentOffsetY };
    });
  })!;
  useEffect(() => {
    if (pulling || !fitPaused) return;
    // completeRefresh runs after the handler resolves. Wait for the
    // spinner's inset animation before taking positions at rest again.
    const timer = setTimeout(() => {
      setFitPaused(false);
      setRefreshEpoch((epoch) => epoch + 1);
    }, 350);
    return () => clearTimeout(timer);
  }, [pulling, fitPaused]);

  // NativeTabs' per-screen SafeAreaProvider includes the tab bar in its
  // bottom inset. Reserve the List's trailing grouped-section space too.
  const viewport = {
    bottom: safeFrame.y + safeFrame.height - insets.bottom - 20,
    paused: fitPaused || scroll.phase !== 'idle' || scrolled,
    epoch: [width, height, fontScale, safeFrame.x, safeFrame.y, safeFrame.width, safeFrame.height,
      insets.top, insets.right, insets.bottom, insets.left, refreshing, refreshEpoch, scroll.epoch, subtitle ?? ''].join(':'),
  };

  const listModifiers: ModifierConfig[] = [
    listStyle('insetGrouped'),
    scrollDismissesKeyboard('interactively'),
    // Both observers remain installed; their native implementations are
    // no-ops before iOS 18, where the short initial latch remains the fallback.
    scrollGeometry,
    onScrollPhaseChange((phase, { contentOffsetY }) => {
      setScroll((previous) => {
        const wasAtTop = previous.baseline === null || previous.offset <= previous.baseline + 1;
        const baseline = previous.baseline === null
          ? contentOffsetY
          : previous.phase === 'idle' && wasAtTop ? Math.min(previous.baseline, contentOffsetY) : previous.baseline;
        const settledAtTop = phase === 'idle' && contentOffsetY <= baseline + 1;
        return { phase, baseline, offset: contentOffsetY, epoch: previous.epoch + (settledAtTop ? 1 : 0) };
      });
    }),
  ];
  if (refreshes) {
    listModifiers.push(
      refreshable(async () => {
        // SwiftUI keeps the spinner until this resolves; a failed refresh is
        // shown by the screen itself, so it must not reject here.
        setFitPaused(true);
        setPulling(true);
        try {
          await onRefresh?.();
        } catch {
          // Swallowed on purpose (see above).
        } finally {
          setPulling(false);
        }
      }),
    );
  }
  return (
    <ViewportContext.Provider value={viewport}>
      <Host style={{ flex: 1 }} seedColor={palette.tint} modifiers={[LOCALE]}>
        <List modifiers={listModifiers}>
          {subtitle ? <Subtitle text={subtitle} /> : null}
          {refreshing && !pulling ? <RefreshingRow /> : null}
          {children}
        </List>
      </Host>
    </ViewportContext.Provider>
  );
}

/**
 * The line under the navigation bar's large title, lined up with it (4pt
 * inside the cards' edge). It is the header of a section without rows: a
 * header has no minimum row height, so it sits close under the title. In the
 * label colour, not the secondary one: at the subhead size the secondary
 * colour is 3.3:1 on the grouped background, short of the 4.5:1 small text
 * needs, and the smaller size already sets the line under the title.
 */
function Subtitle({ text }: { text: string }) {
  return (
    <SwiftUISection
      header={
        <Text
          modifiers={[
            font({ textStyle: 'subheadline' }),
            labelText,
            monospacedDigit(),
            listRowInsets({ top: 0, leading: 4, bottom: 0, trailing: 4 }),
          ]}>
          {text}
        </Text>
      }
      modifiers={[listSectionSpacing(14)]}>
      {[]}
    </SwiftUISection>
  );
}

/**
 * A spinner on the grouped background where `refreshable`'s own would be,
 * in a section of its own (a ListScreen holds only sections). VoiceOver reads
 * the indeterminate ProgressView as in progress.
 */
function RefreshingRow() {
  return (
    <SwiftUISection>
      <HStack modifiers={[listRowBackground('clear'), listRowSeparator('hidden')]}>
        <Spacer />
        <ProgressView />
        <Spacer />
      </HStack>
    </SwiftUISection>
  );
}

/**
 * A SwiftUI `Section`. A plain title uses SwiftUI's own header; a title
 * badge, trailing detail or link makes a header row of them (still styled by
 * the List), and `prominent` raises the header's prominence (title-3 bold in
 * the label colour). At the accessibility text sizes that row stacks, the
 * title and badge on the first line and the detail and link on lines of their
 * own: on one line they wrap mid-phrase (校網 / 200 則未讀 / 全部 over three
 * lines). A footer link sits under the footer text.
 */
export function Section({
  title,
  titleBadge,
  detail,
  action,
  prominent = false,
  footer,
  footerAction,
  plain = false,
  tight = false,
  children,
}: SectionProps) {
  const palette = usePalette();
  const stacked = isAccessibilityTextSize(useWindowDimensions().fontScale);
  // Header extras keep the body size next to a prominent title.
  const extraFont = font({ textStyle: prominent ? 'body' : 'footnote' });
  // A prominent header lines up with the large title, like the subtitle.
  const headerInsets = prominent ? [listRowInsets({ top: 0, leading: 4, bottom: 8, trailing: 4 })] : [];
  const titleText = title ? <Text modifiers={[accessibilityAddTraits(['isHeader'])]}>{title}</Text> : null;
  const badgeText = titleBadge ? <Text modifiers={[extraFont, foregroundStyle(palette.tint)]}>{titleBadge}</Text> : null;
  const detailText = detail ? <Text modifiers={[extraFont, secondaryLabelText, monospacedDigit()]}>{detail}</Text> : null;
  const actionButton = action ? (
    <Button
      label={action.label}
      onPress={action.onPress}
      modifiers={[buttonStyle('borderless'), extraFont, foregroundStyle(palette.tint)]}
    />
  ) : null;
  let header: ReactElement | undefined;
  if (prominent || titleBadge || detail || action) {
    header = stacked ? (
      <VStack alignment="leading" spacing={4} modifiers={headerInsets}>
        <HStack alignment="firstTextBaseline" spacing={6}>
          {titleText}
          {badgeText}
        </HStack>
        {detailText}
        {actionButton}
      </VStack>
    ) : (
      <HStack alignment="firstTextBaseline" spacing={6} modifiers={headerInsets}>
        {titleText}
        {badgeText}
        <Spacer minLength={8} />
        {detailText}
        {actionButton}
      </HStack>
    );
  }
  const footerView =
    footer && footerAction ? (
      <VStack alignment="leading" spacing={4}>
        <Text>{footer}</Text>
        <Button
          label={footerAction.label}
          onPress={footerAction.onPress}
          modifiers={[buttonStyle('borderless'), font({ textStyle: 'footnote', weight: 'semibold' }), foregroundStyle(palette.tint)]}
        />
      </VStack>
    ) : footer ? (
      <Text>{footer}</Text>
    ) : undefined;
  return (
    <PlainSectionContext.Provider value={plain}>
      <SwiftUISection
        title={header ? undefined : title || undefined}
        header={header}
        footer={footerView}
        modifiers={[
          ...(prominent ? [headerProminence('increased')] : []),
          ...(tight ? [listSectionSpacing(12)] : []),
        ]}>
        {children}
      </SwiftUISection>
    </PlainSectionContext.Provider>
  );
}
