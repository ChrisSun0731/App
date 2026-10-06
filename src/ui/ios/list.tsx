import { Host, HStack, List, ProgressView, Section as SwiftUISection, Spacer, Text } from '@expo/ui/swift-ui';
import {
  environment,
  listRowBackground,
  listRowSeparator,
  listStyle,
  refreshable,
  scrollDismissesKeyboard,
  type ModifierConfig,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';

import { usePalette } from '@/theme/palette';

import type { ListScreenProps, SectionProps } from '../types';
import { PlainSectionContext } from './chrome';

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
export function ListScreen({ children, onRefresh, refreshing = false }: ListScreenProps) {
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
        {refreshing && !pulling ? <RefreshingRow /> : null}
        {children}
      </List>
    </Host>
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

/** A SwiftUI `Section` with an optional header title and footer text. */
export function Section({ title, footer, plain = false, children }: SectionProps) {
  return (
    <PlainSectionContext.Provider value={plain}>
      <SwiftUISection title={title || undefined} footer={footer ? <Text>{footer}</Text> : undefined}>
        {children}
      </SwiftUISection>
    </PlainSectionContext.Provider>
  );
}
