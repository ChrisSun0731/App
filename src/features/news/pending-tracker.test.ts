import { describe, expect, it } from '@jest/globals';

import { createPendingTracker } from './pending-tracker';

/** A promise with its resolve and reject functions. */
function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('pending tracker', () => {
  it('is pending while a task runs and passes its result through', async () => {
    const changes: boolean[] = [];
    const track = createPendingTracker((pending) => changes.push(pending));
    const task = deferred<string>();
    const result = track(() => task.promise);
    expect(changes).toEqual([true]);
    task.resolve('done');
    await expect(result).resolves.toBe('done');
    expect(changes).toEqual([true, false]);
  });

  it('stays pending until the last of overlapping tasks settles', async () => {
    const changes: boolean[] = [];
    const track = createPendingTracker((pending) => changes.push(pending));
    const first = deferred();
    const second = deferred();
    const firstRun = track(() => first.promise);
    const secondRun = track(() => second.promise);
    first.resolve();
    await firstRun;
    expect(changes).toEqual([true]);
    second.resolve();
    await secondRun;
    expect(changes).toEqual([true, false]);
  });

  it('stops being pending when a task rejects', async () => {
    const changes: boolean[] = [];
    const track = createPendingTracker((pending) => changes.push(pending));
    const task = deferred();
    const run = track(() => task.promise);
    task.reject(new Error('offline'));
    await expect(run).rejects.toThrow('offline');
    expect(changes).toEqual([true, false]);
    // And it starts over for the next task.
    void track(() => new Promise(() => {}));
    expect(changes).toEqual([true, false, true]);
  });
});
