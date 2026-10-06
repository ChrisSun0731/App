// 校網's side effects: opening and sharing an announcement, and the
// 已讀所有訊息 confirmation.
import { Alert, Share } from 'react-native';

import { openWebsite } from '@/lib/open-link';
import { useNewsStore } from '@/store/news';

import { shareContent } from './news-view';
import type { NewsItem } from './rss';

/** Opens the announcement in the in-app browser, as 首頁's pinned items do. */
export function openNews(item: NewsItem) {
  return openWebsite(item.link, '無法開啟公告');
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
