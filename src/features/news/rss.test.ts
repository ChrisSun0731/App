import { afterEach, describe, expect, it, jest } from '@jest/globals';

import {
  feedLabels, fetchSchoolNews, mergeSchoolNews, parseRss, parseRssDate, SCHOOL_NEWS_FEEDS, unreadNews, type NewsItem,
} from './rss';

const [IMPORTANT_URL, LATEST_URL] = SCHOOL_NEWS_FEEDS.map((feed) => feed.url);

const rss = (...items: [title: string, date: string][]) => `<rss><channel>${items.map(([title, date]) =>
  `<item><title>${title}</title><link>https://www.ck.tp.edu.tw/${encodeURIComponent(title)}</link><pubDate>${date}</pubDate></item>`,
).join('')}</channel></rss>`;

const news = (title: string, pubDate: string, feeds?: NewsItem['feeds']): NewsItem => ({
  title, link: `https://www.ck.tp.edu.tw/${encodeURIComponent(title)}`, pubDate, ...(feeds && { feeds }),
});

/** Answers each feed URL with its RSS text, or fails it when given an Error. */
function mockFeeds(responses: Record<string, string | Error>) {
  jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const response = responses[String(input)];
    if (response instanceof Error) throw response;
    return new Response(response);
  });
}

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

  it('treats a non-RSS page as a failed feed rather than an empty one', () => {
    expect(() => parseRss('<html><body>系統維護中</body></html>')).toThrow();
    expect(parseRss('<rss><channel></channel></rss>')).toEqual([]);
  });
});

describe('school news refresh', () => {
  afterEach(() => { jest.restoreAllMocks(); });

  it('merges both feeds newest first, keeping the newest copy of a title found in both', async () => {
    mockFeeds({
      [IMPORTANT_URL]: rss(['段考公告', 'Mon, 05 Oct 2026 09:00:00 +0800'], ['停課通知', 'Sat, 03 Oct 2026 09:00:00 +0800']),
      [LATEST_URL]: rss(['社團博覽會', 'Sun, 04 Oct 2026 09:00:00 +0800'], ['段考公告', 'Sun, 04 Oct 2026 08:00:00 +0800']),
    });
    await expect(fetchSchoolNews()).resolves.toEqual({
      items: [
        news('段考公告', '2026-10-05T01:00:00.000Z', ['important', 'latest']),
        news('社團博覽會', '2026-10-04T01:00:00.000Z', ['latest']),
        news('停課通知', '2026-10-03T01:00:00.000Z', ['important']),
      ],
      failed: [],
    });
  });

  it('keeps the failed feed’s cached items when only one feed loads, and reports that feed', async () => {
    const cached = [
      news('舊重要公告', '2026-10-02T01:00:00.000Z', ['important']),
      news('兩邊都有', '2026-10-01T01:00:00.000Z', ['important', 'latest']),
      // Dropped from 最新消息 since the last refresh, which did answer: gone.
      news('過期消息', '2026-10-01T00:00:00.000Z', ['latest']),
    ];
    mockFeeds({
      [IMPORTANT_URL]: Object.assign(new Error('The request was aborted.'), { name: 'AbortError' }),
      [LATEST_URL]: rss(['新消息', 'Sat, 03 Oct 2026 09:00:00 +0800']),
    });
    await expect(fetchSchoolNews(undefined, cached)).resolves.toEqual({
      items: [
        news('新消息', '2026-10-03T01:00:00.000Z', ['latest']),
        news('舊重要公告', '2026-10-02T01:00:00.000Z', ['important']),
        news('兩邊都有', '2026-10-01T01:00:00.000Z', ['important']),
      ],
      failed: ['important'],
    });
  });

  it('reports a feed serving a non-RSS page as failed, even with nothing cached', async () => {
    mockFeeds({
      [IMPORTANT_URL]: rss(['段考公告', 'Mon, 05 Oct 2026 09:00:00 +0800']),
      [LATEST_URL]: '<html><body>系統維護中</body></html>',
    });
    await expect(fetchSchoolNews()).resolves.toEqual({
      items: [news('段考公告', '2026-10-05T01:00:00.000Z', ['important'])],
      failed: ['latest'],
    });
  });

  it('does not report an empty feed as failed', async () => {
    mockFeeds({
      [IMPORTANT_URL]: rss(),
      [LATEST_URL]: rss(['新消息', 'Sat, 03 Oct 2026 09:00:00 +0800']),
    });
    await expect(fetchSchoolNews(undefined, [news('舊重要公告', '2026-10-02T01:00:00.000Z', ['important'])]))
      .resolves.toEqual({ items: [news('新消息', '2026-10-03T01:00:00.000Z', ['latest'])], failed: [] });
  });

  it('rejects only when every feed fails', async () => {
    const error = new Error('HTTP 503');
    mockFeeds({ [IMPORTANT_URL]: error, [LATEST_URL]: new Error('timeout') });
    await expect(fetchSchoolNews(undefined, [news('舊消息', '2026-10-01T01:00:00.000Z', ['latest'])]))
      .rejects.toBe(error);
  });

  it('rejects a cancelled refresh instead of caching half of it', async () => {
    const caller = new AbortController();
    jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input) === LATEST_URL) return new Response(rss(['新消息', 'Sat, 03 Oct 2026 09:00:00 +0800']));
      // Cancelled after 最新消息 has already loaded.
      await new Promise((resolve) => setTimeout(resolve, 0));
      caller.abort();
      return new Promise<Response>(() => {});
    });
    await expect(fetchSchoolNews(caller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('keeps untagged items cached by earlier versions on a partial failure', () => {
    const legacy = news('舊版快取', '2026-10-01T01:00:00.000Z');
    const fresh = news('新消息', '2026-10-03T01:00:00.000Z');
    expect(mergeSchoolNews({ latest: [fresh, legacy] }, [legacy])).toEqual([
      { ...fresh, feeds: ['latest'] },
      legacy,
    ]);
    // A full refresh replaces the cache, tagging everything.
    expect(mergeSchoolNews({ important: [], latest: [fresh] }, [legacy])).toEqual([{ ...fresh, feeds: ['latest'] }]);
  });

  it('names failed feeds in feed order', () => {
    expect(feedLabels(['latest', 'important'])).toEqual(['重要公告', '最新消息']);
    expect(feedLabels(['important'])).toEqual(['重要公告']);
    expect(feedLabels([])).toEqual([]);
  });
});
