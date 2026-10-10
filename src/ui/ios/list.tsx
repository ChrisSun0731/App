import { Button, Host, HStack, List, ProgressView, Section as SwiftUISection, Spacer, Text, VStack } from '@expo/ui/swift-ui';
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
  refreshable,
  scrollDismissesKeyboard,
  type ModifierConfig,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';

import { usePalette } from '@/theme/palette';

import type { ListScreenProps, SectionProps } from '../types';
import { PlainSectionContext, secondaryLabelText } from './chrome';

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
  const [refreshes, setRefreshes] = useState(onRefresh !== undefined);
  // Adjusting state while rendering (see above): latched on first sight.
  if (onRefresh && !refreshes) setRefreshes(true);
  const [pulling, setPulling] = useState(false);

  const listModifiers: ModifierConfig[] = [
    listStyle('insetGrouped'),
    scrollDismissesKeyboard('interactively'),
  ];
  if (refreshes) {
    listModifiers.push(
      refreshable(async () => {
        // SwiftUI keeps the spinner until this resolves; a failed refresh is
        // shown by the screen itself, so it must not reject here.
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
    <Host style={{ flex: 1 }} seedColor={palette.tint} modifiers={[LOCALE]}>
      <List modifiers={listModifiers}>
        {subtitle ? <Subtitle text={subtitle} /> : null}
        {refreshing && !pulling ? <RefreshingRow /> : null}
        {children}
      </List>
    </Host>
  );
}

/**
 * The line under the navigation bar's large title, lined up with it (4pt
 * inside the cards' edge). It is the header of a section without rows: a
 * header has no minimum row height, so it sits close under the title.
 */
function Subtitle({ text }: { text: string }) {
  return (
    <SwiftUISection
      header={
        <Text
          modifiers={[
            font({ textStyle: 'subheadline' }),
            secondaryLabelText,
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
 * the label colour). A footer link sits under the footer text.
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
  children,
}: SectionProps) {
  const palette = usePalette();
  // Header extras keep the body size next to a prominent title.
  const extraFont = font({ textStyle: prominent ? 'body' : 'footnote' });
  // A prominent header lines up with the large title, like the subtitle.
  const headerInsets = prominent ? [listRowInsets({ top: 0, leading: 4, bottom: 8, trailing: 4 })] : [];
  const header =
    prominent || titleBadge || detail || action ? (
      <HStack alignment="firstTextBaseline" spacing={6} modifiers={headerInsets}>
        {title ? <Text modifiers={[accessibilityAddTraits(['isHeader'])]}>{title}</Text> : null}
        {titleBadge ? (
          <Text modifiers={[extraFont, foregroundStyle(palette.tint)]}>{titleBadge}</Text>
        ) : null}
        <Spacer minLength={8} />
        {detail ? <Text modifiers={[extraFont, secondaryLabelText, monospacedDigit()]}>{detail}</Text> : null}
        {action ? (
          <Button
            label={action.label}
            onPress={action.onPress}
            modifiers={[buttonStyle('borderless'), extraFont, foregroundStyle(palette.tint)]}
          />
        ) : null}
      </HStack>
    ) : undefined;
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
        modifiers={prominent ? [headerProminence('increased')] : undefined}>
        {children}
      </SwiftUISection>
    </PlainSectionContext.Provider>
  );
}
