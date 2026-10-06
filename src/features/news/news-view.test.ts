import { describe, expect, it } from '@jest/globals';

import {
  emptyMessage,
  formatNewsTime,
  groupNews,
  lastUpdatedFooter,
  partialFailureMessage,
  partialFailureTitle,
  searchNews,
  shareContent,
  showMoreLabel,
} from './news-view';
import type { NewsItem } from './rss';

const news = (title: string, pubDate: string): NewsItem => ({
  title, link: `https://www.ck.tp.edu.tw/${encodeURIComponent(title)}`, pubDate,
});

const titles = (items: readonly NewsItem[]) => items.map((item) => item.title);

describe('news filters', () => {
  const old = news('舊公告', '2026-10-01T01:00:00.000Z');
  const fresh = news('新公告', '2026-10-05T01:00:00.000Z');
  const pinnedFetched = news('段考公告', '2026-10-04T01:00:00.000Z');
  // Pinned long ago; no longer in either feed.
  const pinnedGone = news('開學公告', '2026-09-01T01:00:00.000Z');

  it('splits fetched items into unread and read, keeping pinned ones out of both', () => {
    const groups = groupNews([old, fresh, pinnedFetched], [pinnedGone, pinnedFetched], '2026-10-02T00:00:00.000Z');
    expect(titles(groups.unread)).toEqual(['新公告']);
    expect(titles(groups.read)).toEqual(['舊公告']);
    expect(titles(groups.pinned)).toEqual(['段考公告', '開學公告']);
  });

  it('lists everything under 全部, newest first, including pinned items that left the feeds once', () => {
    const groups = groupNews([old, fresh, pinnedFetched], [pinnedGone, pinnedFetched], null);
    expect(titles(groups.all)).toEqual(['新公告', '段考公告', '舊公告', '開學公告']);
    // Nothing has been marked read yet.
    expect(titles(groups.unread)).toEqual(['新公告', '舊公告']);
    expect(groups.read).toEqual([]);
  });

  it('searches titles ignoring case and surrounding spaces', () => {
    const items = [news('CK 社團博覽會', '2026-10-05T01:00:00.000Z'), news('段考公告', '2026-10-04T01:00:00.000Z')];
    expect(titles(searchNews(items, '  ck '))).toEqual(['CK 社團博覽會']);
    expect(searchNews(items, '   ')).toBe(items);
  });

  it('explains an empty list by filter, or by the search', () => {
    expect(emptyMessage('unread', '')).toBe('目前沒有未讀消息。');
    expect(emptyMessage('pinned', ' ')).toBe('目前沒有釘選消息。');
    expect(emptyMessage('all', '段考')).toBe('沒有符合關鍵字的消息。');
  });
});

describe('news texts', () => {
  it('formats timestamps in local time', () => {
    const local = new Date(2026, 9, 5, 9, 5).toISOString();
    expect(formatNewsTime(local)).toBe('2026/10/5 09:05');
    expect(formatNewsTime('not a date')).toBeUndefined();
    expect(lastUpdatedFooter(local)).toBe('最後更新：2026/10/5 09:05');
    expect(lastUpdatedFooter(null)).toBeUndefined();
  });

  it('labels paging and partial refresh failures', () => {
    expect(showMoreLabel(7)).toBe('顯示更多（還有 7 則）');
    expect(partialFailureTitle(['重要公告'])).toBe('重要公告暫時無法更新');
    expect(partialFailureMessage(true)).toBe('先顯示上次儲存的內容。');
    // Nothing was saved for the failed feed, so there is no saved content to mention.
    expect(partialFailureMessage(false)).toBe('其他消息已更新，稍後會再試一次。');
  });

  it('shares the link as a URL on iOS and inside the message on Android', () => {
    const item = news('段考公告', '2026-10-04T01:00:00.000Z');
    expect(shareContent(item, 'ios')).toEqual({ message: '段考公告', url: item.link });
    expect(shareContent(item, 'android')).toEqual({ title: '段考公告', message: `段考公告\n${item.link}` });
  });
});
