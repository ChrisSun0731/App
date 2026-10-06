// 校網's side effects: opening and sharing an announcement, and the
// 已讀所有訊息 confirmation.
import { Alert, Linking, Share } from 'react-native';

import { useNewsStore } from '@/store/news';

import { shareContent } from './news-view';
import type { NewsItem } from './rss';

/** Opens the announcement in the browser, as before the redesign. */
export async function openNews(item: NewsItem) {
  try {
    await Linking.openURL(item.link);
  } catch {
    Alert.alert('無法開啟公告', '請稍後再試一次。');
  }
}

export async function shareNews(item: NewsItem) {
  try {
    await Share.share(shareContent(item, process.env.EXPO_OS));
  } catch {
    Alert.alert('無法分享公告', '請稍後再試一次。');
  }
}

export function togglePin(item: NewsItem, pinned: boolean) {
  const { pin, unpin } = useNewsStore.getState();
  if (pinned) unpin(item.title);
  else pin(item);
}

export function confirmMarkAllRead() {
  Alert.alert('已讀所有訊息', '將所有未釘選的消息標示為已讀？已釘選的消息會保留。', [
    { text: '取消', style: 'cancel' },
    { text: '標示已讀', onPress: () => useNewsStore.getState().markAllRead() },
  ]);
}
