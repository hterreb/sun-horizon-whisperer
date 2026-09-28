import { describe, it, expect } from 'vitest';
import { PREMIUM_ENFORCED, isLineOfSightEnabled } from '../src/utils/premium';

describe('premium (ROADMAP item 13/14 gate)', () => {
  it('ships line of sight free while PREMIUM_ENFORCED is false', () => {
    expect(PREMIUM_ENFORCED).toBe(false);
    expect(isLineOfSightEnabled()).toBe(true);
  });
});
