// Header buttons of the 行事曆 modal routes (docs/design/native-ui.md,
// "Navigation chrome"): an iOS page sheet has 取消 on the left and a bold
// 儲存/完成 on the right; an Android full-screen modal has a close icon on
// the left and a 儲存 text button on the right.
import type { HeaderActionsProps } from '@/components/header-actions';
import { icons } from '@/components/icons';

const ANDROID = process.env.EXPO_OS === 'android';

/** A form: 取消 (discard) and 儲存, which stays disabled until the form is valid. */
export function formHeader(onCancel: () => void, onSave: () => void, canSave: boolean): HeaderActionsProps {
  return {
    left: [
      ANDROID
        ? { kind: 'icon', key: 'cancel', label: '取消', icon: icons.close, onPress: onCancel }
        : { kind: 'text', key: 'cancel', label: '取消', onPress: onCancel },
    ],
    right: [{ kind: 'text', key: 'save', label: '儲存', prominent: true, disabled: !canSave, onPress: onSave }],
  };
}

/**
 * A modal with nothing to save (changes apply at once, or it is read-only):
 * iOS 完成 on the right, Android the close icon.
 */
export function doneHeader(onDone: () => void): HeaderActionsProps {
  return ANDROID
    ? { left: [{ kind: 'icon', key: 'done', label: '關閉', icon: icons.close, onPress: onDone }] }
    : { right: [{ kind: 'text', key: 'done', label: '完成', prominent: true, onPress: onDone }] };
}
