// School-website announcements (重要公告 and 最新消息) from the RSS feeds behind
// the RSS buttons on https://www.ck.tp.edu.tw/nss/p/index.
import { XMLParser } from 'fast-xml-parser';

import { getText } from '@/lib/http';

export type NewsFeed = 'important' | 'latest';

export const SCHOOL_NEWS_FEEDS: readonly { id: NewsFeed; label: string; url: string }[] = [
  {
    id: 'important',
    label: '重要公告',
    url: 'https://www.ck.tp.edu.tw/nss/main/feeder/5abf2d62aa93092cee58ceb4/KG5mY0d9355?f=normal&%240=hhyrNQJ0110&vector=private&static=false',
  },
  {
    id: 'latest',
    label: '最新消息',
    url: 'https://www.ck.tp.edu.tw/nss/main/feeder/5abf2d62aa93092cee58ceb4/IXZld9j7619?f=normal&%240=kpenVCJ9015&vector=private&static=false',
  },
];

export interface NewsItem {
  title: string;
  link: string;
  /** ISO timestamp. */
  pubDate: string;
  /**
   * Feeds the item was last seen in, so a refresh where one feed fails can keep
   * that feed's cached items. Absent on items cached by earlier versions.
   */
  feeds?: NewsFeed[];
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
  // An HTML error or maintenance page served with 200 is a failed feed, not an
  // empty one -- otherwise it would wipe that feed's cached items.
  if (!doc.rss) throw new Error('Not an RSS document');
  const items = doc.rss.channel?.item ?? [];
  return items.flatMap((item): NewsItem[] => {
    const title = text(item.title).trim();
    const link = text(item.link).trim();
    const date = parseRssDate(text(item.pubDate));
    return title && /^https?:\/\//i.test(link) && date
      ? [{ title, link, pubDate: date.toISOString() }]
      : [];
  });
}

/** De-duplicated by title, keeping the newest copy, newest first. */
function dedupeNewest(items: NewsItem[]): NewsItem[] {
  const unique = new Map<string, NewsItem>();
  for (const item of [...items].sort((a, b) => b.pubDate.localeCompare(a.pubDate))) {
    const kept = unique.get(item.title);
    if (!kept) {
      unique.set(item.title, item);
      continue;
    }
    // Remember every feed carrying the title. An untagged (legacy) copy keeps
    // the result untagged, which mergeSchoolNews treats as "always keep".
    const feeds = kept.feeds && item.feeds ? [...new Set([...kept.feeds, ...item.feeds])] : undefined;
    unique.set(item.title, { ...kept, feeds });
  }
  return [...unique.values()];
}

/**
 * One refresh round as the list to show and cache, de-duplicated and newest
 * first. `loaded` holds the items of every feed that answered. A feed that
 * failed keeps the items it contributed to `previous` (the cached list), so one
 * timed-out feed does not empty its half of the list until the next refresh.
 */
export function mergeSchoolNews(
  loaded: Partial<Record<NewsFeed, NewsItem[]>>,
  previous: readonly NewsItem[] = [],
): NewsItem[] {
  const failed = new Set(SCHOOL_NEWS_FEEDS.map(({ id }) => id).filter((id) => !loaded[id]));
  const fresh = SCHOOL_NEWS_FEEDS.flatMap(({ id }) =>
    (loaded[id] ?? []).map((item) => ({ ...item, feeds: [id] })),
  );
  const retained = !failed.size ? [] : previous.flatMap((item): NewsItem[] => {
    // Cached before items were tagged, so it may belong to the failed feed.
    if (!item.feeds) return [item];
    const feeds = item.feeds.filter((feed) => failed.has(feed));
    return feeds.length ? [{ ...item, feeds }] : [];
  });
  return dedupeNewest([...fresh, ...retained]);
}

/** One refresh round: what to show and cache, and which feeds did not answer. */
export interface SchoolNewsRound {
  items: NewsItem[];
  /**
   * Feeds that failed this round while another loaded. Their part of `items`
   * is carried over from the cached list, so it may be out of date.
   */
  failed: NewsFeed[];
}

/**
 * Both feeds merged with mergeSchoolNews. Succeeds as long as one feed loads;
 * rejects with the first error only when every feed fails.
 */
export async function fetchSchoolNews(
  signal?: AbortSignal,
  previous: readonly NewsItem[] = [],
): Promise<SchoolNewsRound> {
  const results = await Promise.allSettled(
    SCHOOL_NEWS_FEEDS.map(async ({ url }) => parseRss(await getText(url, { signal, timeoutMs: 15_000 }))),
  );
  const loaded: Partial<Record<NewsFeed, NewsItem[]>> = {};
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') loaded[SCHOOL_NEWS_FEEDS[index].id] = result.value;
  });
  const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
  // A cancelled query rejects too, rather than caching a half-finished round.
  if (failure && (!Object.keys(loaded).length || signal?.aborted)) throw failure.reason;
  return {
    items: mergeSchoolNews(loaded, previous),
    failed: SCHOOL_NEWS_FEEDS.map(({ id }) => id).filter((id) => !loaded[id]),
  };
}

/** The feeds' display names (重要公告, 最新消息), in feed order. */
export function feedLabels(feeds: readonly NewsFeed[]): string[] {
  return SCHOOL_NEWS_FEEDS.filter(({ id }) => feeds.includes(id)).map(({ label }) => label);
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
