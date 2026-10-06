// The native header search field (Stack.SearchBar) of a list screen: 美食,
// 校網 and the /youbike-picker and /metro-picker sheets. Spread
// `searchBarProps` on Stack.SearchBar (with the screen's placeholder) and
// filter with `query`.
import type { Stack } from 'expo-router';
import { useCallback, useRef, useState, type ComponentProps } from 'react';
import type { SearchBarCommands } from 'react-native-screens';

import { usePalette } from '@/theme/palette';

type SearchBarProps = ComponentProps<typeof Stack.SearchBar>;
type SearchTextHandler = NonNullable<SearchBarProps['onChangeText']>;

const ANDROID = process.env.EXPO_OS === 'android';

/**
 * `onChange` also runs for every change of the query (typing, 取消, clear),
 * e.g. to page a filtered list back to its start. Pass a stable function:
 * the handlers depend on it, and Stack.SearchBar registers its header
 * options again whenever one changes.
 */
export function useHeaderSearch(onChange?: (query: string) => void) {
  const palette = usePalette();
  const ref = useRef<SearchBarCommands>(null);
  const [query, setQuery] = useState('');

  const update = useCallback(
    (text: string) => {
      setQuery(text);
      onChange?.(text);
    },
    [onChange],
  );
  const onChangeText = useCallback<SearchTextHandler>((event) => update(event.nativeEvent.text), [update]);
  const onCleared = useCallback(() => update(''), [update]);

  /** Empties the field and the filter, e.g. when the list it filters is replaced. */
  const clear = useCallback(() => {
    // Text set from JS fires no change event on iOS, so the query is reset too.
    ref.current?.clearText();
    update('');
  }, [update]);

  const searchBarProps: SearchBarProps = {
    ref,
    // The SwiftUI List inside the Host does not drive UIKit's hide-on-scroll
    // (or scroll-to-reveal in a sheet), which could leave the field hidden
    // under the bar; keep it visible.
    hideWhenScrolling: false,
    // Rows filter as you type and stay tappable, so the list must not be
    // dimmed while the field is active (a tap would only end the search).
    obscureBackground: false,
    onChangeText,
    // iOS clears the field on 取消 without a change event; Android clears it
    // when the search view collapses.
    onCancelButtonPress: onCleared,
    onClose: onCleared,
    // Android's search view takes the theme's control colour, not the app
    // bar's, so match the HeaderActions icons beside it (iOS draws system
    // colours itself).
    ...(ANDROID
      ? { textColor: palette.text, hintTextColor: palette.textSecondary, headerIconColor: palette.textSecondary }
      : null),
  };

  return { query, clear, searchBarProps };
}
