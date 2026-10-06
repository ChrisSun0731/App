// The load bookkeeping behind useMenuImage, kept free of React and expo-image
// so it can be unit tested: one request with its timeout, the URL that steps
// around iOS's blocklist of failed image URLs, and what the screen shows given
// the last finished request.

/** The outcome of one request; `image` is null when it failed or timed out. */
export interface LoadResult<T> {
  url: string;
  /** Which school day the request was for, e.g. "2026-10-05_4". */
  slot: string;
  image: T | null;
}

/**
 * Remembers which URLs failed, so the next request for one goes to a URL the
 * image loader has not seen. On iOS, Image.loadAsync asks SDWebImage without
 * .retryFailed (unlike the <Image> view), and SDWebImage then refuses a URL
 * that failed with a TLS error or with a page that is not an image (a Wi-Fi
 * login page) for the rest of the session. Elsewhere the extra parameter costs
 * nothing: a URL that failed has nothing cached under it.
 */
export interface RetryUrls {
  /** The URL to request for `url`: itself until it has failed, then a fresh variant per failure. */
  requestUrl: (url: string) => string;
  /** Records that a request for `url` failed. */
  fail: (url: string) => void;
}

export function createRetryUrls(): RetryUrls {
  const failures = new Map<string, number>();
  return {
    requestUrl(url) {
      const count = failures.get(url) ?? 0;
      return count ? `${url}${url.includes('?') ? '&' : '?'}retry=${count}` : url;
    },
    fail(url) {
      failures.set(url, (failures.get(url) ?? 0) + 1);
    },
  };
}

export interface MenuLoadOptions<T> {
  load: (requestUrl: string) => Promise<T>;
  retries: RetryUrls;
  timeoutMs: number;
  onDone: (image: T | null) => void;
}

/**
 * Requests `url` and calls `onDone` exactly once: with the image, or with null
 * when it failed or `timeoutMs` passed. The request itself cannot be
 * cancelled, so an answer after the timeout or after the returned cancel ran
 * is ignored; a late failure is still recorded, since the loader's blocklist
 * does not know about either. Returns the cancel function.
 */
export function startMenuLoad<T>(url: string, { load, retries, timeoutMs, onDone }: MenuLoadOptions<T>): () => void {
  let active = true;
  const finish = (image: T | null) => {
    if (!active) return;
    active = false;
    clearTimeout(timeout);
    onDone(image);
  };
  const timeout = setTimeout(() => finish(null), timeoutMs);
  load(retries.requestUrl(url)).then(finish, () => {
    retries.fail(url);
    finish(null);
  });
  return () => {
    active = false;
    clearTimeout(timeout);
  };
}

export interface MenuImageState<T> {
  status: 'loading' | 'loaded' | 'failed';
  /** The image to draw, if any. */
  image: T | null;
}

/**
 * What the screen shows for `url`, the selected day's request, given the last
 * finished request and the URL a refresh() is waiting for (or null). While
 * `url` loads, the day's previous image stays only for a refresh of exactly
 * this URL, whose pull indicator shows the progress; any other load (say,
 * coming back to the day after the refresh was abandoned) shows the loading
 * state instead of an old menu that looks loaded.
 */
export function menuImageState<T>(
  result: LoadResult<T> | null,
  url: string,
  slot: string,
  refreshing: string | null,
): MenuImageState<T> {
  if (result?.url === url) return { status: result.image ? 'loaded' : 'failed', image: result.image };
  return { status: 'loading', image: refreshing === url && result?.slot === slot ? result.image : null };
}
