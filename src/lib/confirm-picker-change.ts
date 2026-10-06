import { Alert, type AlertButton } from 'react-native';

/**
 * Asks before applying a picker change: a 取消 / `action` alert. Nothing has
 * to undo the choice when it is declined: the kit's PickerRow always shows
 * its `value` and snaps back on its own when the parent does not adopt a
 * selection (src/ui/types.ts PickerRowProps; on iOS, ui/ios/use-snap-back.ts).
 * `onCancel` runs however the alert is declined.
 */
export function confirmPickerChange(title: string, message: string, action: AlertButton, onCancel?: () => void) {
  Alert.alert(title, message, [{ text: '取消', style: 'cancel', onPress: onCancel }, action], {
    // Android also closes the dialog on back or an outside tap, which presses
    // no button and reports only onDismiss (never fired on iOS).
    cancelable: true,
    onDismiss: onCancel,
  });
}
