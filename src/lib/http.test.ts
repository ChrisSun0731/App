import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { getJson, getText, HttpError } from './http';

const URL = 'https://example.com/data';

/** Headers resolve immediately, but the download stops after its first chunk. */
function stalledBody() {
  let finish = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"loaded":true}'));
      finish = () => controller.close();
    },
  });
  return { response: new Response(stream), finish };
}

describe('HTTP request lifecycle', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

  test('rejects an already-aborted caller before making a network request', async () => {
    const caller = new AbortController();
    caller.abort();
    const fetch = jest.spyOn(globalThis, 'fetch');

    await expect(getText(URL, { signal: caller.signal })).rejects.toMatchObject({ name: 'AbortError' });

    expect(fetch).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  test.each(['text', 'json'] as const)('times out a stalled %s body after receiving successful headers', async (format) => {
    const { response, finish } = stalledBody();
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(response);
    const pending = format === 'text' ? getText(URL, { timeoutMs: 50 }) : getJson(URL, { timeoutMs: 50 });
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await Promise.resolve();
    const signal = fetch.mock.calls[0][1]?.signal;
    expect(response.bodyUsed).toBe(true);
    expect(signal?.aborted).toBe(false);

    await jest.advanceTimersByTimeAsync(50);
    await rejected;

    expect(signal?.aborted).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
    finish();
  });

  test('forwards caller cancellation while a response body is still downloading', async () => {
    const caller = new AbortController();
    const { response, finish } = stalledBody();
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(response);
    const pending = getText(URL, { signal: caller.signal });
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await Promise.resolve();
    expect(response.bodyUsed).toBe(true);

    caller.abort();
    await rejected;

    expect(fetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
    finish();
  });

  test('cleans up its deadline and caller listener only after consuming the body', async () => {
    const caller = new AbortController();
    const removeListener = jest.spyOn(caller.signal, 'removeEventListener');
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"loaded":true}'));

    await expect(getJson(URL, { signal: caller.signal })).resolves.toEqual({ loaded: true });

    expect(jest.getTimerCount()).toBe(0);
    expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function));
    caller.abort();
    expect(fetch.mock.calls[0][1]?.signal?.aborted).toBe(false);
  });

  test('preserves HTTP errors and cancels the failed response', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('unavailable', { status: 503 }));

    await expect(getText(URL)).rejects.toEqual(new HttpError(503, URL));

    expect(fetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });
});
