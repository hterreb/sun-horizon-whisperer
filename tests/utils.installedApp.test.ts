import { afterEach, describe, expect, it, vi } from 'vitest';
import { isInstalledApp } from '../src/utils/installedApp';

// matchMedia that matches only the given queries.
const stubMatchMedia = (...matching: string[]) =>
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches: matching.includes(query),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

describe('isInstalledApp (ROADMAP item 90)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (navigator as Navigator & { standalone?: boolean }).standalone;
    delete (document as { referrer?: string }).referrer;
  });

  it('is false in a browser tab', () => {
    stubMatchMedia('(prefers-reduced-motion: reduce)');
    expect(isInstalledApp()).toBe(false);
  });

  it('is true in the Play app and an installed PWA (display mode fullscreen or standalone)', () => {
    stubMatchMedia('(display-mode: fullscreen)');
    expect(isInstalledApp()).toBe(true);
    stubMatchMedia('(display-mode: standalone)');
    expect(isInstalledApp()).toBe(true);
  });

  it('is true in an iOS home-screen app and on a page the TWA opened', () => {
    stubMatchMedia();
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    expect(isInstalledApp()).toBe(true);
    delete (navigator as Navigator & { standalone?: boolean }).standalone;

    Object.defineProperty(document, 'referrer', { value: 'android-app://com.ainabler.sunchaser/', configurable: true });
    expect(isInstalledApp()).toBe(true);
  });
});
