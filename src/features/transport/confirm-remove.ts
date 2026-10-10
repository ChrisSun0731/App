// Asks before 交通 drops a followed station. On iOS the remove action sits at
// the row's edge, where a full swipe fires it, and a YouBike nickname cannot
// be recovered once the station is gone; Android asks too, as the other
// screens do for deletions.
import { Alert } from 'react-native';

/** A 取消 / 移除 alert; `remove` runs only on 移除. */
export function confirmRemoval(title: '移除站點' | '移除車站', name: string, remove: () => void) {
  Alert.alert(title, `確定移除「${name}」？`, [
    { text: '取消', style: 'cancel' },
    { text: '移除', style: 'destructive', onPress: remove },
  ]);
}
