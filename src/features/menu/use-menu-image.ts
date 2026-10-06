// Loads the selected day's 熱食部 menu image ahead of drawing it. expo-image's
// loader reports the image's size, so the screen lays the menu out at its real
// aspect ratio instead of first drawing an empty box of a guessed size.
import { Image, type ImageRef } from 'expo-image';
import { useEffect, useRef, useState } from 'react';

import { createRetryUrls, menuImageState, startMenuLoad, type LoadResult } from './menu-image-load';
import { menuRequestUrl } from './menu-view';
import { menuImageUrl, type MenuDay } from './menu-week';

/** An unpublished day or a dead connection ends in the failure state after this long. */
const LOAD_TIMEOUT_MS = 15_000;

/** Caps the decoded bitmap (the menus are ~420 px wide) should a huge image be published. */
const MAX_IMAGE_WIDTH = 2048;

// Module-wide because SDWebImage's blocklist outlives the screen: it lasts as
// long as the app process, so reopening 熱食部 must not retry a blocked URL.
const retries = createRetryUrls();

export interface MenuImage {
  /** The URL requested (cache-busted after a refresh), for 在瀏覽器開啟菜單. */
  url: string;
  status: 'loading' | 'loaded' | 'failed';
  /**
   * The image to draw. While a refresh is loading it is still the one shown
   * before, so pull to refresh does not blank the menu; other loads have none.
   */
  image: ImageRef | null;
  /** Reloads past the caches. Settles once the new request loaded, failed or was superseded. */
  refresh: () => Promise<void>;
}

// ImageRefs are not released by hand: one is on screen at a time, a menu is a
// small bitmap, and the native image is freed with its JS object (ImageRef
// reports its memory to Hermes). Releasing in an effect cleanup would also free
// the image on screen when StrictMode replays effects.
export function useMenuImage(week: string, day: MenuDay): MenuImage {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<LoadResult<ImageRef> | null>(null);
  // The URL a refresh() promise waits for. It is state because it decides
  // what is drawn; the promise's resolver lives in `waiter`.
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const waiter = useRef<{ url: string; resolve: () => void } | null>(null);
  const slot = `${week}_${day}`;
  const url = menuRequestUrl(menuImageUrl(week, day), revision);

  useEffect(() => {
    const settle = () => {
      if (waiter.current?.url !== url) return;
      waiter.current.resolve();
      waiter.current = null;
      setRefreshing(null);
    };
    const cancel = startMenuLoad(url, {
      load: (requestUrl) => Image.loadAsync({ uri: requestUrl }, { maxWidth: MAX_IMAGE_WIDTH }),
      retries,
      timeoutMs: LOAD_TIMEOUT_MS,
      onDone: (image) => {
        setResult({ url, slot, image });
        settle();
      },
    });
    return () => {
      cancel();
      // Switching day or week mid-refresh must still end the pull indicator,
      // and coming back later must not show the old menu as if refreshing.
      settle();
    };
  }, [url, slot]);

  function refresh() {
    return new Promise<void>((resolve) => {
      // Strictly increasing, so a refresh always changes the URL (and so
      // starts a load that settles the promise).
      const next = Math.max(Date.now(), revision + 1);
      const target = menuRequestUrl(menuImageUrl(week, day), next);
      // A newer refresh supersedes one still waiting (two taps in one frame).
      waiter.current?.resolve();
      waiter.current = { url: target, resolve };
      setRefreshing(target);
      setRevision(next);
    });
  }

  return { url, ...menuImageState(result, url, slot, refreshing), refresh };
}
