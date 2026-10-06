import { useNativeState } from '@expo/ui';
import { useEffect, useRef } from 'react';

/**
 * Keeps an @expo/ui native text field (SwiftUI TextField / Compose
 * TextField, which own their text in an ObservableState) in step with a
 * React `value` without fighting the user's typing.
 *
 * Native edits arrive asynchronously. When React echoes an edit back as
 * `value`, the field may already hold later keystrokes, so writing the older
 * value back would erase them; only values React set on its own (a reset, a
 * programmatic change) are pushed into the field.
 */
export function useSyncedText(value: string, onChangeText: (text: string) => void) {
  const state = useNativeState(value);
  const nativeChanges = useRef<string[]>([]);
  useEffect(() => {
    const index = nativeChanges.current.lastIndexOf(value);
    if (index >= 0) {
      nativeChanges.current.splice(0, index + 1);
    } else {
      nativeChanges.current = [];
      if (state.get() !== value) state.set(value);
    }
  }, [state, value]);
  function onChange(text: string) {
    nativeChanges.current.push(text);
    onChangeText(text);
  }
  return { state, onChange };
}
