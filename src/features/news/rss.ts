// School-website announcements (重要公告 and 最新消息) from the RSS feeds behind
// the RSS buttons on https://www.ck.tp.edu.tw/nss/p/index.
import { XMLParser } from 'fast-xml-parser';

import { getText } from '@/lib/http';

export const SCHOOL_NEWS_URLS = [
  // 重要公告
  'https://www.ck.tp.edu.tw/nss/main/feeder/5abf2d62aa93092cee58ceb4/KG5mY0d9355?f=normal&%240=hhyrNQJ0110&vector=private&static=false',
  // 最新消息
  'https://www.ck.tp.edu.tw/nss/main/feeder/5abf2d62aa93092cee58ceb4/IXZld9j7619?f=normal&%240=kpenVCJ9015&vector=private&static=false',
];

export interface NewsItem {
  title: string;
  link: string;
  /** ISO timestamp. */
  pubDate: string;
}

const parser = new XMLParser({
  ignoreAttributes: true,
  // Each feed is ~0.5-0.8 MB, almost all of it HTML inside <description>.
  // Treating those as opaque text keeps parsing cheap.
  stopNodes: ['rss.channel.item.description', 'rss.channel.item.content:encoded'],
  isArray: (name) => name === 'item',
  parseTagValue: false,
  trimValues: true,
});

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/** Parses RFC 822 dates ("Fri, 02 Oct 2026 09:24:00 GMT"), falling back to Date. */
export function parseRssDate(value: string): Date | null {
  const match =
    /^(?:\w{3},\s*)?(\d{1,2})\s+(\w{3})\s+(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?\s*(GMT|UTC|Z|[+-]\d{4})?$/.exec(
      value.trim(),
    );
  if (match && MONTHS[match[2]] !== undefined) {
    const [, d, mon, y, h, mi, s = '0', zone = 'GMT'] = match;
    let time = Date.UTC(Number(y), MONTHS[mon], Number(d), Number(h), Number(mi), Number(s));
    if (/^[+-]\d{4}$/.test(zone)) {
      const sign = zone[0] === '+' ? 1 : -1;
      const offset = Number(zone.slice(1, 3)) * 60 + Number(zone.slice(3));
      time -= sign * offset * 60_000;
    }
    return new Date(time);
  }
  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

const text = (value: unknown): string =>
  typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';

/** Items from one RSS document; entries without a title, link or date are dropped. */
export function parseRss(xml: string): NewsItem[] {
  const doc = parser.parse(xml) as { rss?: { channel?: { item?: Record<string, unknown>[] } } };
  const items = doc.rss?.channel?.item ?? [];
  return items.flatMap((item): NewsItem[] => {
    const title = text(item.title).trim();
    const link = text(item.link).trim();
    const date = parseRssDate(text(item.pubDate));
    return title && /^https?:\/\//i.test(link) && date
      ? [{ title, link, pubDate: date.toISOString() }]
      : [];
  });
}

/** Both feeds merged, newest first. */
export async function fetchSchoolNews(signal?: AbortSignal): Promise<NewsItem[]> {
  const documents = await Promise.all(
    SCHOOL_NEWS_URLS.map((url) => getText(url, { signal, timeoutMs: 15_000 })),
  );
  const unique = new Map<string, NewsItem>();
  for (const item of documents.flatMap(parseRss).sort((a, b) => b.pubDate.localeCompare(a.pubDate))) {
    if (!unique.has(item.title)) unique.set(item.title, item);
  }
  return [...unique.values()];
}

/**
 * Unread items: newer than the last "mark all read" and not pinned.
 * `lastClearedTime` is an ISO timestamp or null.
 */
export function unreadNews(
  items: NewsItem[],
  lastClearedTime: string | null,
  pinned: NewsItem[],
): NewsItem[] {
  const cleared = lastClearedTime ? new Date(lastClearedTime).getTime() : null;
  const pinnedTitles = new Set(pinned.map((item) => item.title));
  return items.filter(
    (item) =>
      (cleared === null || new Date(item.pubDate).getTime() > cleared) &&
      !pinnedTitles.has(item.title),
  );
}
