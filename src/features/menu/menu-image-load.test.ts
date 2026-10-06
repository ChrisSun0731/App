import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { createRetryUrls, menuImageState, startMenuLoad, type LoadResult } from './menu-image-load';

const BASE = 'https://raw.githubusercontent.com/CKApp-Dev/Data/main/menus/2026-10-05';
const THU = `${BASE}_4.png`;
const THU_REFRESHED = `${THU}?refresh=1790000000000`;
const WED_REFRESHED = `${BASE}_3.png?refresh=1790000000000`;
const THU_SLOT = '2026-10-05_4';
const WED_SLOT = '2026-10-05_3';

/** A load whose answer the test gives by hand. */
function deferredLoad() {
  let resolve!: (image: string) => void;
  let reject!: (error: Error) => void;
  const load = jest.fn<(requestUrl: string) => Promise<string>>(
    () =>
      new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      }),
  );
  return { load, resolve: (image: string) => resolve(image), reject: () => reject(new Error('failed')) };
}

// Lets the promise callbacks inside startMenuLoad run.
const flush = () => Promise.resolve().then(() => undefined);

describe('menu image request', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports the image once', async () => {
    const { load, resolve } = deferredLoad();
    const onDone = jest.fn();
    startMenuLoad(THU, { load, retries: createRetryUrls(), timeoutMs: 15_000, onDone });
    expect(load).toHaveBeenCalledWith(THU);
    resolve('menu');
    await flush();
    jest.advanceTimersByTime(15_000);
    expect(onDone.mock.calls).toEqual([['menu']]);
  });

  it('fails after the timeout and ignores a late answer', async () => {
    const { load, resolve } = deferredLoad();
    const onDone = jest.fn();
    startMenuLoad(THU, { load, retries: createRetryUrls(), timeoutMs: 15_000, onDone });
    jest.advanceTimersByTime(14_999);
    expect(onDone).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(onDone.mock.calls).toEqual([[null]]);
    resolve('menu');
    await flush();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('reports nothing once cancelled', async () => {
    const { load, resolve } = deferredLoad();
    const onDone = jest.fn();
    const cancel = startMenuLoad(THU, { load, retries: createRetryUrls(), timeoutMs: 15_000, onDone });
    cancel();
    jest.advanceTimersByTime(15_000);
    resolve('menu');
    await flush();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('requests a URL that failed under a fresh URL next time, even after a timeout', async () => {
    const retries = createRetryUrls();
    const first = deferredLoad();
    const onDone = jest.fn();
    startMenuLoad(THU, { load: first.load, retries, timeoutMs: 15_000, onDone });
    jest.advanceTimersByTime(15_000);
    first.reject();
    await flush();
    expect(onDone.mock.calls).toEqual([[null]]);

    // Back to the day (or the screen reopened): not the URL the loader blocked.
    const second = deferredLoad();
    startMenuLoad(THU, { load: second.load, retries, timeoutMs: 15_000, onDone });
    expect(second.load).toHaveBeenCalledWith(`${THU}?retry=1`);
    second.reject();
    await flush();

    const third = deferredLoad();
    startMenuLoad(THU, { load: third.load, retries, timeoutMs: 15_000, onDone });
    expect(third.load).toHaveBeenCalledWith(`${THU}?retry=2`);
  });

  it('keeps retry URLs per URL and appends to a refresh parameter', () => {
    const retries = createRetryUrls();
    retries.fail(THU_REFRESHED);
    expect(retries.requestUrl(THU_REFRESHED)).toBe(`${THU_REFRESHED}&retry=1`);
    expect(retries.requestUrl(THU)).toBe(THU);
    expect(retries.requestUrl(WED_REFRESHED)).toBe(WED_REFRESHED);
  });
});

describe('menu image state', () => {
  const thursday: LoadResult<string> = { url: THU, slot: THU_SLOT, image: 'thursday' };

  it('is loading, loaded or failed for the selected request', () => {
    expect(menuImageState(null, THU, THU_SLOT, null)).toEqual({ status: 'loading', image: null });
    expect(menuImageState(thursday, THU, THU_SLOT, null)).toEqual({ status: 'loaded', image: 'thursday' });
    expect(menuImageState({ ...thursday, image: null }, THU, THU_SLOT, null)).toEqual({ status: 'failed', image: null });
  });

  it('keeps the day’s menu on screen while it refreshes', () => {
    expect(menuImageState(thursday, THU_REFRESHED, THU_SLOT, THU_REFRESHED)).toEqual({
      status: 'loading',
      image: 'thursday',
    });
    // From the failure state there is nothing to keep.
    expect(menuImageState({ ...thursday, image: null }, THU_REFRESHED, THU_SLOT, THU_REFRESHED)).toEqual({
      status: 'loading',
      image: null,
    });
  });

  it('shows the loading state on coming back to a day whose refresh was abandoned', () => {
    // Refresh 四, switch to 三 (the refresh is settled), then back to 四 before 三 loads.
    expect(menuImageState(thursday, WED_REFRESHED, WED_SLOT, null)).toEqual({ status: 'loading', image: null });
    expect(menuImageState(thursday, THU_REFRESHED, THU_SLOT, null)).toEqual({ status: 'loading', image: null });
  });

  it('never shows another day’s menu', () => {
    expect(menuImageState(thursday, WED_REFRESHED, WED_SLOT, WED_REFRESHED)).toEqual({ status: 'loading', image: null });
  });

  it('shows a refreshed menu once it loaded', () => {
    const refreshed = { url: THU_REFRESHED, slot: THU_SLOT, image: 'new thursday' };
    expect(menuImageState(refreshed, THU_REFRESHED, THU_SLOT, null)).toEqual({ status: 'loaded', image: 'new thursday' });
  });
});
