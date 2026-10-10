// Bookkeeping for the one-time import, kept apart from the stores so that
// Settings' 重設個人資料與設定 (which resets the stores) cannot start it again.

/** Where the status record is saved. Not one of the store keys on purpose. */
export const LEGACY_IMPORT_KEY = 'ck.legacy-import';

/** Launches that may try before the import is given up. */
export const MAX_ATTEMPTS = 3;

/** Longest one launch keeps the splash screen up waiting for the previous app's data. */
export const SPLASH_TIMEOUT_MS = 4500;

/**
 * Longest one launch's attempt runs. After SPLASH_TIMEOUT_MS the app shows and
 * the reader carries on unseen, so a slow device (Android starting Chromium
 * for the first time) still imports on this launch instead of timing out on
 * every one.
 */
export const READ_TIMEOUT_MS = 30_000;

/**
 * Recorded with an 'imported' or 'empty' outcome. On iOS a storage WebKit did
 * not share reads exactly like a fresh install, so a later build with a better
 * reader can tell which 'empty' outcomes an older one produced and run those
 * again.
 */
export const READER_VERSION = 1;

export interface LegacyImportStatus {
  /** Finished: imported, found nothing, or given up. Never attempted again. */
  done: boolean;
  /** Launches that started an attempt, counted before it starts. */
  attempts: number;
  /**
   * The user changed the timetable or class in this app while the import was
   * still owed, so a later attempt must not replace it.
   */
  scheduleEdited: boolean;
  /** 'reset': the user cleared everything in Settings while it was owed. */
  outcome?: 'imported' | 'empty' | 'gave-up' | 'reset';
  /** READER_VERSION of the reader that found data or none. */
  reader?: number;
}

const OUTCOMES = ['imported', 'empty', 'gave-up', 'reset'] as const;

export function parseStatus(value: unknown): LegacyImportStatus | null {
  if (typeof value !== 'object' || value === null) return null;
  const { done, attempts, scheduleEdited, outcome, reader } = value as Record<string, unknown>;
  if (typeof done !== 'boolean' || !Number.isInteger(attempts) || (attempts as number) < 0) return null;
  return {
    done,
    attempts: attempts as number,
    // Unknown means it may have been edited; assume it was.
    scheduleEdited: scheduleEdited !== false,
    outcome: OUTCOMES.find((known) => known === outcome),
    reader: Number.isInteger(reader) && (reader as number) > 0 ? reader as number : undefined,
  };
}

/**
 * This launch's status and whether it should attempt the import. The attempt
 * is counted before it starts, so a crash during one cannot loop forever.
 */
export function beginAttempt(saved: LegacyImportStatus | null, hadStoredState: boolean): { status: LegacyImportStatus; run: boolean } {
  if (saved?.done) return { status: saved, run: false };
  // On the first attempt in an install that already has data here (a
  // pre-release build), whether the timetable was edited cannot be known.
  const status = saved ?? { done: false, attempts: 0, scheduleEdited: hadStoredState };
  if (status.attempts >= MAX_ATTEMPTS) return { status: { ...status, done: true, outcome: 'gave-up' }, run: false };
  return { status: { ...status, attempts: status.attempts + 1 }, run: true };
}

/**
 * Where the previous app's pages lived, most likely first. Capacitor 7 with no
 * `server` config (src-capacitor/capacitor.config.json at 74fc879) serves
 * capacitor://localhost on iOS and https://localhost on Android. Capacitor 5
 * and earlier used http://localhost on Android; data an install left there
 * predates the https origin, so it is read only when that origin is empty.
 */
export const LEGACY_ORIGINS: Partial<Record<string, readonly string[]>> = {
  ios: ['capacitor://localhost'],
  android: ['https://localhost', 'http://localhost'],
};

/** What one origin's localStorage held, or 'failed' when it could not be read. */
export type OriginResult = { store: string | null; userClass: string | null } | 'failed';

/** Turns the reader page's message into a result for `origin`. */
export function parseReaderMessage(data: string, origin: string): OriginResult {
  try {
    const message: unknown = JSON.parse(data);
    if (typeof message !== 'object' || message === null) return 'failed';
    const { origin: actual, store, userClass } = message as Record<string, unknown>;
    // The page reports the origin it really got. An opaque ("null") origin
    // would read an empty, unrelated storage and look like a fresh install.
    if (typeof actual === 'string' && actual.replace(/\/$/, '').toLowerCase() !== origin.toLowerCase()) return 'failed';
    if ((typeof store !== 'string' && store !== null) || (typeof userClass !== 'string' && userClass !== null)) return 'failed';
    return { store, userClass };
  } catch {
    return 'failed';
  }
}

export type LegacySource =
  | { kind: 'found'; origin: string; store: string; userClass: string | null }
  /** Every origin answered and none had data: nothing to import. */
  | { kind: 'empty' }
  /** An origin that takes priority has not answered yet. */
  | { kind: 'waiting' }
  /** An origin that takes priority could not be read; try again next launch. */
  | { kind: 'failed' };

/** The first origin, in priority order, holding the previous app's "store". */
export function pickLegacySource(origins: readonly string[], results: Partial<Record<string, OriginResult>>): LegacySource {
  for (const origin of origins) {
    const result = results[origin];
    if (result === undefined) return { kind: 'waiting' };
    // A later origin may hold older data than this one, so it cannot be used instead.
    if (result === 'failed') return { kind: 'failed' };
    if (result.store) return { kind: 'found', origin, store: result.store, userClass: result.userClass };
  }
  return { kind: 'empty' };
}
