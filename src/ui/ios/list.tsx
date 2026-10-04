import { Host, List, Section as SwiftUISection, Text } from '@expo/ui/swift-ui';
import {
  environment,
  listStyle,
  refreshable,
  scrollDismissesKeyboard,
  type ModifierConfig,
} from '@expo/ui/swift-ui/modifiers';

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
 */
export function ListScreen({ children, onRefresh }: ListScreenProps) {
  const palette = usePalette();
  const listModifiers: ModifierConfig[] = [
    listStyle('insetGrouped'),
    scrollDismissesKeyboard('interactively'),
  ];
  if (onRefresh) {
    listModifiers.push(
      refreshable(async () => {
        // SwiftUI keeps the spinner until this resolves; a failed refresh is
        // shown by the screen itself, so it must not reject here.
        try {
          await onRefresh();
        } catch {
          // Swallowed on purpose (see above).
        }
      }),
    );
  }
  return (
    <Host style={{ flex: 1 }} seedColor={palette.tint} modifiers={[LOCALE]}>
      <List modifiers={listModifiers}>{children}</List>
    </Host>
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
