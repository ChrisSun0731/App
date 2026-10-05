// Loads the selected day's 熱食部 menu image ahead of drawing it. expo-image's
// loader reports the image's size, so the screen lays the menu out at its real
// aspect ratio instead of first drawing an empty box of a guessed size.
import { Image, type ImageRef } from 'expo-image';
import { useEffect, useRef, useState } from 'react';

import { menuRequestUrl } from './menu-view';
import { menuImageUrl, type MenuDay } from './menu-week';

/** An unpublished day or a dead connection ends in the failure state after this long. */
const LOAD_TIMEOUT_MS = 15_000;

/** Caps the decoded bitmap (the menus are ~420 px wide) should a huge image be published. */
const MAX_IMAGE_WIDTH = 2048;

/** The outcome of one request; `image` is null when it failed or timed out. */
interface LoadResult {
  url: string;
  /** Which school day the request was for, e.g. "2026-10-05_4". */
  slot: string;
  image: ImageRef | null;
}

export interface MenuImage {
  /** The URL requested (cache-busted after a refresh), for 在瀏覽器開啟菜單. */
  url: string;
  status: 'loading' | 'loaded' | 'failed';
  /**
   * The selected day's image. While a refresh is loading it is still the one
   * shown before, so pull to refresh does not blank the menu.
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
  const [result, setResult] = useState<LoadResult | null>(null);
  // Resolvers of refresh() promises, by the URL whose load they wait for.
  const waiting = useRef(new Map<string, () => void>());
  const slot = `${week}_${day}`;
  const url = menuRequestUrl(menuImageUrl(week, day), revision);

  useEffect(() => {
    const waiters = waiting.current;
    const settle = () => {
      waiters.get(url)?.();
      waiters.delete(url);
    };
    let active = true;
    const finish = (image: ImageRef | null) => {
      if (!active) return;
      active = false;
      clearTimeout(timeout);
      setResult({ url, slot, image });
      settle();
    };
    // The request itself cannot be cancelled; a late answer is ignored.
    const timeout = setTimeout(() => finish(null), LOAD_TIMEOUT_MS);
    Image.loadAsync({ uri: url }, { maxWidth: MAX_IMAGE_WIDTH }).then(finish, () => finish(null));
    return () => {
      active = false;
      clearTimeout(timeout);
      // Switching day or week mid-refresh must still end the pull indicator.
      settle();
    };
  }, [url, slot]);

  function refresh() {
    return new Promise<void>((resolve) => {
      // Strictly increasing, so two quick refreshes still change the URL (and
      // so start a load that settles the promise).
      const next = Math.max(Date.now(), revision + 1);
      waiting.current.set(menuRequestUrl(menuImageUrl(week, day), next), resolve);
      setRevision(next);
    });
  }

  const current = result?.url === url ? result : null;
  return {
    url,
    status: current ? (current.image ? 'loaded' : 'failed') : 'loading',
    image: result?.slot === slot ? result.image : null,
    refresh,
  };
}
