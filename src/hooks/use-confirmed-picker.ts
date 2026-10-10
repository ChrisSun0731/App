import { useCallback, useState } from 'react';
import { Alert, type AlertButton } from 'react-native';

/**
 * Asks before applying an @expo/ui Picker change, and puts the picker back on
 * its `selectedValue` when the change is declined.
 *
 * The native pickers keep their own selection: SwiftUI's PickerView moves to
 * the tapped option straight away and only re-reads `selectedValue` when that
 * prop changes or the view appears. Declining leaves the prop unchanged, so a
 * re-render sends nothing and the control would keep showing the declined
 * option. Pass `pickerKey` as the `key` of the picker's Host (or the component
 * that renders it): bumping it remounts the native view, which then reads
 * `selectedValue` again on appear.
 */
export function useConfirmedPicker() {
  const [pickerKey, setPickerKey] = useState(0);
  const resync = useCallback(() => setPickerKey((key) => key + 1), []);
  const confirm = useCallback(
    (title: string, message: string, action: AlertButton) => confirmPickerChange(title, message, action, resync),
    [resync],
  );
  return { pickerKey, resync, confirm };
}

/** Shows a 取消 / `action` alert; `onCancel` runs however it is declined. */
export function confirmPickerChange(title: string, message: string, action: AlertButton, onCancel: () => void) {
  Alert.alert(title, message, [{ text: '取消', style: 'cancel', onPress: onCancel }, action], {
    // Android also closes the dialog on back or an outside tap, which presses
    // no button and reports only onDismiss (never fired on iOS).
    cancelable: true,
    onDismiss: onCancel,
  });
}
