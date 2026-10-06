import { describe, expect, jest, test } from '@jest/globals';
import { Alert, type AlertButton, type AlertOptions } from 'react-native';

import { confirmPickerChange } from './confirm-picker-change';

jest.mock('react-native', () => ({ Alert: { alert: jest.fn() } }));

const alert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

function show() {
  alert.mockClear();
  const onCancel = jest.fn();
  const onConfirm = jest.fn();
  confirmPickerChange('更改班級', '改為 102 班會清除目前課表的修改。', { text: '更改', style: 'destructive', onPress: onConfirm }, onCancel);
  const [title, message, buttons, options] = alert.mock.calls[0] as [string, string, AlertButton[], AlertOptions];
  return { title, message, buttons, options, onCancel, onConfirm };
}

describe('confirmed picker changes', () => {
  test('keeps the confirmation copy and puts the action after 取消', () => {
    const { title, message, buttons } = show();
    expect(title).toBe('更改班級');
    expect(message).toBe('改為 102 班會清除目前課表的修改。');
    expect(buttons.map((button) => [button.text, button.style])).toEqual([['取消', 'cancel'], ['更改', 'destructive']]);
  });

  test('runs onCancel when 取消 is pressed', () => {
    const { buttons, onCancel, onConfirm } = show();
    buttons[0].onPress?.();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test('runs onCancel when Android dismisses the dialog without a button', () => {
    const { options, onCancel } = show();
    expect(options.cancelable).toBe(true);
    options.onDismiss?.();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('applies the change without onCancel when confirmed', () => {
    const { buttons, onCancel, onConfirm } = show();
    buttons[1].onPress?.();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  test('can be declined without onCancel (the kit picker snaps back itself)', () => {
    alert.mockClear();
    confirmPickerChange('更改班級', '改為 102 班會清除目前課表的修改。', { text: '更改', style: 'destructive' });
    const [, , buttons, options] = alert.mock.calls[0] as [string, string, AlertButton[], AlertOptions];
    expect(() => buttons[0].onPress?.()).not.toThrow();
    expect(() => options.onDismiss?.()).not.toThrow();
  });
});
