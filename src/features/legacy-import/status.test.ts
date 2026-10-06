import { describe, expect, test } from '@jest/globals';

import {
  beginAttempt,
  LEGACY_ORIGINS,
  MAX_ATTEMPTS,
  parseReaderMessage,
  parseStatus,
  pickLegacySource,
  type LegacyImportStatus,
} from './status';

describe('legacy import status', () => {
  test('counts each launch\'s attempt before it starts and gives up after the cap', () => {
    let { status, run } = beginAttempt(null, false);
    expect(run).toBe(true);
    expect(status).toEqual({ done: false, attempts: 1, scheduleEdited: false });
    for (let launch = 2; launch <= MAX_ATTEMPTS; launch++) {
      ({ status, run } = beginAttempt(status, true));
      expect(run).toBe(true);
      expect(status.attempts).toBe(launch);
    }
    ({ status, run } = beginAttempt(status, true));
    expect(run).toBe(false);
    expect(status).toEqual({ done: true, attempts: MAX_ATTEMPTS, scheduleEdited: false, outcome: 'gave-up' });
  });

  test('never runs again once done, and assumes a pre-existing timetable may be edited', () => {
    const done: LegacyImportStatus = { done: true, attempts: 1, scheduleEdited: false, outcome: 'imported' };
    expect(beginAttempt(done, true)).toEqual({ status: done, run: false });
    expect(beginAttempt(done, true).status).toBe(done);
    expect(beginAttempt(null, true).status.scheduleEdited).toBe(true);
  });

  test('reads back only well-formed records', () => {
    expect(parseStatus({ done: false, attempts: 2, scheduleEdited: false })).toEqual({ done: false, attempts: 2, scheduleEdited: false, outcome: undefined });
    expect(parseStatus({ done: true, attempts: 1, outcome: 'empty' })).toEqual({ done: true, attempts: 1, scheduleEdited: true, outcome: 'empty' });
    expect(parseStatus({ done: true, attempts: 1, scheduleEdited: false, outcome: 'nope' })?.outcome).toBeUndefined();
    expect(parseStatus({ done: true, attempts: 1, scheduleEdited: false, outcome: 'empty', reader: 1 }))
      .toEqual({ done: true, attempts: 1, scheduleEdited: false, outcome: 'empty', reader: 1 });
    expect(parseStatus({ done: true, attempts: 2, scheduleEdited: true, outcome: 'reset', reader: 'v1' }))
      .toEqual({ done: true, attempts: 2, scheduleEdited: true, outcome: 'reset' });
    for (const junk of [null, 'done', { done: 'yes', attempts: 1 }, { done: false, attempts: -1 }, { done: false, attempts: 1.5 }]) {
      expect(parseStatus(junk)).toBeNull();
    }
  });
});

describe('legacy storage reader', () => {
  test('tries the origins Capacitor 7 used first', () => {
    expect(LEGACY_ORIGINS.ios).toEqual(['capacitor://localhost']);
    expect(LEGACY_ORIGINS.android).toEqual(['https://localhost', 'http://localhost']);
  });

  test('accepts a message only from the origin the page was loaded as', () => {
    const message = (fields: object) => JSON.stringify(fields);
    expect(parseReaderMessage(message({ origin: 'capacitor://localhost', store: '{}', userClass: '205' }), 'capacitor://localhost'))
      .toEqual({ store: '{}', userClass: '205' });
    expect(parseReaderMessage(message({ origin: 'https://localhost/', store: null, userClass: null }), 'https://localhost'))
      .toEqual({ store: null, userClass: null });
    // Engines without self.origin cannot check it.
    expect(parseReaderMessage(message({ store: null, userClass: null }), 'https://localhost')).toEqual({ store: null, userClass: null });
    // An opaque origin would read an empty storage, not the previous app's.
    expect(parseReaderMessage(message({ origin: 'null', store: null, userClass: null }), 'capacitor://localhost')).toBe('failed');
    expect(parseReaderMessage(message({ error: 'SecurityError' }), 'capacitor://localhost')).toBe('failed');
    expect(parseReaderMessage('not json', 'capacitor://localhost')).toBe('failed');
    expect(parseReaderMessage(message({ store: 5, userClass: null }), 'capacitor://localhost')).toBe('failed');
  });

  test('picks the first origin with data, and never a later one over an unread earlier one', () => {
    const origins = ['https://localhost', 'http://localhost'];
    const none = { store: null, userClass: null };
    const data = { store: '{"food":{}}', userClass: '101' };
    expect(pickLegacySource(origins, {})).toEqual({ kind: 'waiting' });
    expect(pickLegacySource(origins, { 'https://localhost': data })).toEqual({ kind: 'found', origin: 'https://localhost', ...data });
    expect(pickLegacySource(origins, { 'http://localhost': data })).toEqual({ kind: 'waiting' });
    expect(pickLegacySource(origins, { 'https://localhost': none, 'http://localhost': data }))
      .toEqual({ kind: 'found', origin: 'http://localhost', ...data });
    expect(pickLegacySource(origins, { 'https://localhost': 'failed', 'http://localhost': data })).toEqual({ kind: 'failed' });
    expect(pickLegacySource(origins, { 'https://localhost': none, 'http://localhost': none })).toEqual({ kind: 'empty' });
    expect(pickLegacySource(origins, { 'https://localhost': { store: '', userClass: null }, 'http://localhost': none })).toEqual({ kind: 'empty' });
    expect(pickLegacySource([], {})).toEqual({ kind: 'empty' });
  });
});
