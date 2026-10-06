// The header search field of the station pickers (/youbike-picker,
// /metro-picker). Spread `searchBarProps` on Stack.SearchBar and filter with
// `query`.
import type { Stack } from 'expo-router';
import { useCallback, useRef, useState, type ComponentProps } from 'react';
import type { SearchBarCommands } from 'react-native-screens';

import { usePalette } from '@/theme/palette';

type SearchBarProps = ComponentProps<typeof Stack.SearchBar>;
type SearchTextHandler = NonNullable<SearchBarProps['onChangeText']>;

const ANDROID = process.env.EXPO_OS === 'android';

export function usePickerSearch() {
  const palette = usePalette();
  const ref = useRef<SearchBarCommands>(null);
  const [query, setQuery] = useState('');

  // Stable handlers, so Stack.SearchBar does not register its header options
  // again on every render.
  const onChangeText = useCallback<SearchTextHandler>((event) => setQuery(event.nativeEvent.text), []);
  const onCleared = useCallback(() => setQuery(''), []);

  /** Empties the field and the filter, e.g. when the list it filters is replaced. */
  const clear = useCallback(() => {
    // Text set from JS fires no change event on iOS, so the query is reset too.
    ref.current?.clearText();
    setQuery('');
  }, []);

  const searchBarProps: SearchBarProps = {
    ref,
    // The sheet's List does not drive UIKit's scroll-to-reveal, so the field
    // stays visible instead of hiding under the bar.
    hideWhenScrolling: false,
    // Rows filter as you type and a tap adds the station, so the list must
    // stay undimmed and tappable while the field is active.
    obscureBackground: false,
    onChangeText,
    // iOS clears the field on 取消 without a change event; Android clears it
    // when the search view collapses.
    onCancelButtonPress: onCleared,
    onClose: onCleared,
    // Android's search view takes the theme's control colour, not the app
    // bar's, so match the HeaderActions close icon beside it (iOS draws
    // system colours itself).
    ...(ANDROID
      ? { textColor: palette.text, hintTextColor: palette.textSecondary, headerIconColor: palette.textSecondary }
      : null),
  };

  return { query, clear, searchBarProps };
}
