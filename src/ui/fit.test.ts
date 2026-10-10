import { describe, expect, it } from '@jest/globals';

import { ARM_MS, armLatch, fitHeight, offerTop } from './fit';

describe('fitting embedded content above the tab bar', () => {
  it('fits the whole menu while retaining a readable full-width fallback', () => {
    expect(fitHeight(577, 507, 274, 638)).toBe(507);
    expect(fitHeight(577, 260, 274, 638)).toBe(577);
    expect(fitHeight(1063, 900, 274, 638)).toBe(638);
    expect(fitHeight(577, null)).toBe(577);
    expect(fitHeight(577, 507, Infinity, 638)).toBe(577);
    expect(fitHeight(577.4, 507.8, 274)).toBe(507);
  });

  it('ignores scrolled positions after settling and throughout refresh', () => {
    const armed = armLatch({ top: null, armedUntil: 0 }, 1000);
    const settled = offerTop(armed, 301.7, 1100, false);
    expect(settled.top).toBe(302);
    expect(offerTop(settled, 200, 1000 + ARM_MS + 1, false)).toBe(settled);
    expect(offerTop(settled, 400, 1200, true)).toBe(settled);
    const rearmed = armLatch(settled, 2000);
    expect(offerTop(rearmed, 299.2, 2100, false).top).toBe(299);
  });
});
