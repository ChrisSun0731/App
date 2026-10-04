import { describe, expect, it } from '@jest/globals';

import { parseRss, parseRssDate, unreadNews, type NewsItem } from './rss';

describe('school news', () => {
  it('parses RSS dates including a numeric time zone', () => {
    expect(parseRssDate('Mon, 05 Oct 2026 09:30:00 +0800')?.toISOString()).toBe('2026-10-05T01:30:00.000Z');
    expect(parseRssDate('not a date')).toBeNull();
  });

  it('decodes title/link entities and ignores entries without a safe link or publication date', () => {
    const xml = `<rss><channel>
      <item><title><![CDATA[最新公告]]></title><link>https://www.ck.tp.edu.tw/news?a=1&amp;b=2</link><pubDate>Mon, 05 Oct 2026 09:30:00 +0800</pubDate></item>
      <item><title>Invalid date</title><link>https://example.com</link><pubDate>invalid</pubDate></item>
      <item><title>Unsafe link</title><link>javascript:alert(1)</link><pubDate>Mon, 05 Oct 2026 09:30:00 +0800</pubDate></item>
    </channel></rss>`;
    expect(parseRss(xml)).toEqual([{
      title: '最新公告',
      link: 'https://www.ck.tp.edu.tw/news?a=1&b=2',
      pubDate: '2026-10-05T01:30:00.000Z',
    }]);
  });

  it('keeps pinned news out of unread results and restores cleared items', () => {
    const items: NewsItem[] = [
      { title: 'Old', link: 'https://example.com/old', pubDate: '2026-10-04T01:00:00.000Z' },
      { title: 'New', link: 'https://example.com/new', pubDate: '2026-10-05T01:00:00.000Z' },
      { title: 'Pinned', link: 'https://example.com/pin', pubDate: '2026-10-05T02:00:00.000Z' },
    ];
    expect(unreadNews(items, '2026-10-04T01:00:00.000Z', [items[2]])).toEqual([items[1]]);
    expect(unreadNews(items, null, [items[2]])).toEqual([items[0], items[1]]);
  });
});
