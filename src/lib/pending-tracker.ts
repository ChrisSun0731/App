// Whether any of several possibly overlapping async tasks is still running,
// e.g. a 重試 tapped while a 重新整理 from the menu is under way.

/**
 * Returns a wrapper for tasks. `onPendingChange(true)` is called when the
 * first task starts and `onPendingChange(false)` once the last one has
 * settled, fulfilled or rejected, however the tasks overlap.
 */
export function createPendingTracker(onPendingChange: (pending: boolean) => void) {
  let running = 0;
  return async function track<T>(task: () => Promise<T>): Promise<T> {
    if (running++ === 0) onPendingChange(true);
    try {
      return await task();
    } finally {
      if (--running === 0) onPendingChange(false);
    }
  };
}
