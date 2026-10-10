// Fitting an Embedded to the visible list (Embedded fit="screen"): each
// ListScreen says where its visible content ends, the Embedded reports where
// its own top is, and its height is the room between them.
//
// Positions are only taken while the list is at rest: for a short while after
// the view appears or the layout changes (window size, text size, insets),
// never during a pull to refresh. A drag that moves the content in between is
// ignored, so a scrolled or rubber-banding list never shrinks the view. When
// the content fits, the list cannot rest scrolled, so the position taken is
// the layout's own.
import { createContext, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface Viewport {
  /** The window y (pt / dp) where the list's visible content ends, above the tab or navigation bar; null while unknown. */
  bottom: number | null;
  /** Scrolling or a pull to refresh is moving the content: positions are not at rest. */
  paused: boolean;
  /** Changes with anything that moves the layout; positions are taken again after it. */
  epoch: string;
}

export const ViewportContext = createContext<Viewport>({ bottom: null, paused: false, epoch: '' });

/** How long positions are taken after the view appears or the layout changes (ms). */
export const ARM_MS = 600;

/** After this long (ms) the content shows even if no position came. */
export const GIVE_UP_MS = 1000;

/**
 * The height for `natural` content with `room` left on screen: the room when
 * it is at least `minHeight`, never more than the natural size or `maxHeight`;
 * otherwise (too little room, or not measured) the natural size, and the list
 * scrolls.
 */
export function fitHeight(natural: number, room: number | null, minHeight = 0, maxHeight = Infinity): number {
  if (room !== null && room >= minHeight) return Math.floor(Math.min(natural, maxHeight, room));
  return Math.round(Math.min(natural, maxHeight));
}

export interface TopLatch {
  top: number | null;
  /** Positions are taken until this time (ms). */
  armedUntil: number;
}

export function armLatch(latch: TopLatch, now: number): TopLatch {
  return { ...latch, armedUntil: now + ARM_MS };
}

/** `latch` with `y` taken as the top, if positions are being taken; the same object otherwise. */
export function offerTop(latch: TopLatch, y: number, now: number, paused: boolean): TopLatch {
  if (paused || now > latch.armedUntil) return latch;
  const top = Math.round(y);
  return top === latch.top ? latch : { ...latch, top };
}

/**
 * The view's top at rest. `onPosition` takes its window y (pt / dp) from a
 * native geometry callback; `ready` requires both top and viewport bottom
 * (or GIVE_UP_MS), so content can stay hidden until its height is settled.
 */
export function useRestTop(viewport: Viewport): { top: number | null; ready: boolean; onPosition: (y: number) => void } {
  const latch = useRef<TopLatch>({ top: null, armedUntil: 0 });
  const paused = useRef(viewport.paused);
  const latestPosition = useRef<number | null>(null);
  const [top, setTop] = useState<number | null>(null);
  const [gaveUp, setGaveUp] = useState(false);

  useLayoutEffect(() => {
    paused.current = viewport.paused;
  }, [viewport.paused]);
  // On appearing and after every layout change. An inset change alone does
  // not move the view, so retain the last reported position. Native scroll
  // callbacks can report the restored top before the idle/refresh callback;
  // adopt that cached position once the provider says it is safe again.
  useLayoutEffect(() => {
    latch.current = armLatch(latch.current, Date.now());
    if (!viewport.paused && latestPosition.current !== null) {
      latch.current = offerTop(latch.current, latestPosition.current, Date.now(), false);
      setTop(latch.current.top);
    }
  }, [viewport.epoch, viewport.paused]);
  useEffect(() => {
    const timer = setTimeout(() => setGaveUp(true), GIVE_UP_MS);
    return () => clearTimeout(timer);
  }, []);

  const onPosition = useCallback((y: number) => {
    latestPosition.current = y;
    const next = offerTop(latch.current, y, Date.now(), paused.current);
    if (next === latch.current) return;
    latch.current = next;
    setTop(next.top);
  }, []);

  return { top, ready: (top !== null && viewport.bottom !== null) || gaveUp, onPosition };
}
