import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

const MINUTE_MS = 60_000;

/**
 * The current time for minute-resolution UI (the period in session, today's
 * date). It ticks every `intervalMs` only while the screen is focused and the
 * app is in the foreground, and catches up at once when either comes back, so
 * no timer runs behind other tabs. Within the same minute it keeps the
 * previous Date, so a tick that changes nothing does not re-render the screen.
 */
export function useNow(intervalMs: number): Date {
  const focused = useIsFocused();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!focused) return;
    const tick = () => {
      const next = new Date();
      setNow((previous) =>
        Math.floor(previous.getTime() / MINUTE_MS) === Math.floor(next.getTime() / MINUTE_MS) ? previous : next);
    };
    // Deferred a frame: catching up on focus is not a synchronous setState in the effect.
    const frame = requestAnimationFrame(tick);
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') tick();
    }, intervalMs);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(timer);
      subscription.remove();
    };
  }, [focused, intervalMs]);

  return now;
}
