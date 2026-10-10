import { describe, expect, jest, test } from '@jest/globals';
import { Alert, type AlertButton } from 'react-native';

import { confirmRemoval } from './confirm-remove';

jest.mock('react-native', () => ({ Alert: { alert: jest.fn() } }));

const alert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

function show(title: '移除站點' | '移除車站', name: string) {
  alert.mockClear();
  const remove = jest.fn();
  confirmRemoval(title, name, remove);
  const [shownTitle, message, buttons] = alert.mock.calls[0] as [string, string, AlertButton[]];
  return { title: shownTitle, message, buttons, remove };
}

describe('removing a followed station', () => {
  test('names the station and puts a destructive 移除 after 取消', () => {
    const { title, message, buttons } = show('移除站點', '學校門口');
    expect(title).toBe('移除站點');
    expect(message).toBe('確定移除「學校門口」？');
    expect(buttons.map((button) => [button.text, button.style])).toEqual([
      ['取消', 'cancel'],
      ['移除', 'destructive'],
    ]);
  });

  test('removes only after 移除 is pressed', () => {
    const { buttons, remove } = show('移除車站', '中正紀念堂');
    expect(remove).not.toHaveBeenCalled();
    buttons[0].onPress?.();
    expect(remove).not.toHaveBeenCalled();
    buttons[1].onPress?.();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
