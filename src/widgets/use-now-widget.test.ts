import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import type { NowInput } from '@/features/home/now';

import { nowTimeline } from './now-timeline';

let mockPlatform = 'ios';
let mockNativeModule: { widgetsDirectory: string } | null = null;
const mockNativeLookup = jest.fn(() => mockNativeModule);
const mockLayoutLoads = jest.fn();
const mockUpdateTimeline = jest.fn();
const mockEffects: (() => void)[] = [];

jest.mock('expo', () => ({ requireOptionalNativeModule: mockNativeLookup }));
jest.mock('react-native', () => ({ Platform: { get OS() { return mockPlatform; } } }));
jest.mock('react', () => ({ useEffect: (effect: () => void) => mockEffects.push(effect) }));

// An eager import reproduces the startup failure in a binary without ExpoWidgets.
jest.mock('expo-widgets', () => { throw new Error("Cannot find native module 'ExpoWidgets'"); });
jest.mock('./now-widget', () => {
  mockLayoutLoads();
  if (!mockNativeModule?.widgetsDirectory) throw new Error('Widget layout loaded without native support');
  return { nowWidget: () => ({ updateTimeline: mockUpdateTimeline }) };
});

const INPUT: Omit<NowInput, 'now'> = {
  periods: [], rows: [], semesterStart: null, events: [], term: '', grade: null,
};
const NOW = new Date(2026, 9, 8, 8, 0);

function loadHook() {
  return jest.requireActual<typeof import('./use-now-widget')>('./use-now-widget');
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(NOW);
  mockPlatform = 'ios';
  mockNativeModule = null;
  mockEffects.length = 0;
});

afterEach(() => { jest.useRealTimers(); });

describe('optional Now widget', () => {
  test('loads and runs without ExpoWidgets in the installed iOS binary', () => {
    const hook = loadHook();
    expect(hook.WIDGETS_ENABLED).toBe(false);
    hook.useNowWidget(INPUT, '2026-10-08');
    expect(() => mockEffects[0]()).not.toThrow();
    expect(mockLayoutLoads).not.toHaveBeenCalled();
    expect(mockUpdateTimeline).not.toHaveBeenCalled();
  });

  test('skips iOS builds without the widget App Group directory', () => {
    mockNativeModule = { widgetsDirectory: '' };
    const hook = loadHook();
    expect(hook.WIDGETS_ENABLED).toBe(false);
    hook.useNowWidget(INPUT, '2026-10-08');
    mockEffects[0]();
    expect(mockLayoutLoads).not.toHaveBeenCalled();
    expect(mockUpdateTimeline).not.toHaveBeenCalled();
  });

  test.each(['android', 'web'])('never looks up the iOS module on %s', (platform) => {
    mockPlatform = platform;
    mockNativeModule = { widgetsDirectory: 'file:///widget-group' };
    const hook = loadHook();
    expect(hook.WIDGETS_ENABLED).toBe(false);
    hook.useNowWidget(INPUT, '2026-10-08');
    mockEffects[0]();
    expect(mockNativeLookup).not.toHaveBeenCalled();
    expect(mockLayoutLoads).not.toHaveBeenCalled();
  });

  test('defers the supported widget layout until data is available', () => {
    mockNativeModule = { widgetsDirectory: 'file:///widget-group' };
    const hook = loadHook();
    expect(hook.WIDGETS_ENABLED).toBe(true);
    expect(mockLayoutLoads).not.toHaveBeenCalled();
    hook.useNowWidget(null, '2026-10-08');
    mockEffects[0]();
    expect(mockLayoutLoads).not.toHaveBeenCalled();
    expect(mockUpdateTimeline).not.toHaveBeenCalled();
  });

  test('updates the timeline in an iOS binary with widget support', () => {
    mockNativeModule = { widgetsDirectory: 'file:///widget-group' };
    const hook = loadHook();
    hook.useNowWidget(INPUT, '2026-10-08');
    expect(mockLayoutLoads).not.toHaveBeenCalled();
    mockEffects[0]();
    expect(mockLayoutLoads).toHaveBeenCalledTimes(1);
    expect(mockUpdateTimeline).toHaveBeenCalledWith(nowTimeline(INPUT, NOW));
  });
});
