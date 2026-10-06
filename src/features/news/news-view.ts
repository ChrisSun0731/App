// What 校網 shows: the four filters, search, paging and the row and notice
// texts. Pure, so the screen stays declarative and this stays testable.
import { formatFullDate, pad2 } from '@/lib/dates';
import type { ChoiceOption } from '@/ui/types';

import { unreadNews, type NewsItem } from './rss';

export type NewsFilter = 'unread' | 'pinned' | 'read' | 'all';

export const NEWS_FILTERS: readonly ChoiceOption<NewsFilter>[] = [
  { label: '未讀', value: 'unread' },
  { label: '已釘選', value: 'pinned' },
  { label: '已讀', value: 'read' },
  { label: '全部', value: 'all' },
];

/** Rows shown before 顯示更多, and how many more each press adds. */
export const PAGE_SIZE = 20;

const newestFirst = (items: readonly NewsItem[]) => [...items].sort((a, b) => b.pubDate.localeCompare(a.pubDate));

/**
 * Every filter's items, newest first. 未讀 and 已讀 split the fetched items
 * that are not pinned; 全部 also keeps pinned items that have since dropped
 * out of the feeds (the pinned copy wins over a fetched one).
 */
export function groupNews(
  fetched: readonly NewsItem[],
  pinned: readonly NewsItem[],
  lastClearedTime: string | null,
): Record<NewsFilter, NewsItem[]> {
  const unread = unreadNews([...fetched], lastClearedTime, [...pinned]);
  const pinnedTitles = new Set(pinned.map((item) => item.title));
  const unreadTitles = new Set(unread.map((item) => item.title));
  const read = fetched.filter((item) => !pinnedTitles.has(item.title) && !unreadTitles.has(item.title));
  const all = [...new Map([...fetched, ...pinned].map((item) => [item.title, item])).values()];
  return {
    unread: newestFirst(unread),
    pinned: newestFirst(pinned),
    read: newestFirst(read),
    all: newestFirst(all),
  };
}

/** Items whose title contains the search text, ignoring case and surrounding spaces. */
export function searchNews(items: readonly NewsItem[], search: string): readonly NewsItem[] {
  const term = search.trim().toLocaleLowerCase();
  return term ? items.filter((item) => item.title.toLocaleLowerCase().includes(term)) : items;
}

const EMPTY_MESSAGES: Record<NewsFilter, string> = {
  unread: '目前沒有未讀消息。',
  pinned: '目前沒有釘選消息。',
  read: '目前沒有已讀消息。',
  all: '目前沒有消息。',
};

export function emptyMessage(filter: NewsFilter, search: string): string {
  return search.trim() ? '沒有符合關鍵字的消息。' : EMPTY_MESSAGES[filter];
}

/** e.g. "2026/10/5 09:30" in local time; undefined for an unreadable timestamp. */
export function formatNewsTime(iso: string): string | undefined {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return `${formatFullDate(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function showMoreLabel(remaining: number): string {
  return `顯示更多（還有 ${remaining} 則）`;
}

/** The list's footer, e.g. 最後更新：2026/10/5 09:30. */
export function lastUpdatedFooter(lastFetchTime: string | null): string | undefined {
  const time = lastFetchTime ? formatNewsTime(lastFetchTime) : undefined;
  return time ? `最後更新：${time}` : undefined;
}

/** The notice title for a refresh where these feeds failed while another loaded, e.g. 重要公告暫時無法更新. */
export function partialFailureTitle(failedFeedLabels: readonly string[]): string {
  return `${failedFeedLabels.join('、')}暫時無法更新`;
}

/**
 * The notice text under partialFailureTitle. It only mentions saved content
 * when some is shown: on a first launch the failed feed had nothing saved.
 */
export function partialFailureMessage(showingCached: boolean): string {
  return showingCached ? '先顯示上次儲存的內容。' : '其他消息已更新，稍後會再試一次。';
}

/**
 * What the share sheet gets. iOS shares the link as a URL next to the title;
 * Android's share intent only carries `message`, so the link goes into it.
 */
export function shareContent(item: NewsItem, os: string | undefined): { title?: string; message: string; url?: string } {
  return os === 'ios'
    ? { message: item.title, url: item.link }
    : { title: item.title, message: `${item.title}\n${item.link}` };
}
