import { afterEach, describe, expect, it, vi } from 'vitest';

// Sentry loads after the first render (ROADMAP item 174); the app calls it through utils/monitoring.
const sdk = vi.hoisted(() => ({
  init: vi.fn(),
  setTag: vi.fn(),
  addBreadcrumb: vi.fn(),
  addIntegration: vi.fn(),
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));
vi.mock('@/utils/sentryEntry', () => sdk);
vi.mock('../src/utils/sentryEntry', () => sdk);

const freshMonitoring = async (dsn: string) => {
  vi.resetModules();
  vi.stubEnv('VITE_SENTRY_DSN', dsn);
  return import('@/utils/monitoring');
};

afterEach(() => {
  vi.unstubAllEnvs();
  Object.values(sdk).forEach((fn) => fn.mockReset());
});

describe('monitoring: no DSN (dev, tests)', () => {
  it('passes a call to the SDK module, which does nothing without init', async () => {
    const monitoring = await freshMonitoring('');
    await monitoring.preloadMonitoring();
    monitoring.setTag('place', 'ok');
    monitoring.captureMessage('place-name failed', 'warning');
    expect(sdk.setTag).toHaveBeenCalledWith('place', 'ok');
    expect(sdk.captureMessage).toHaveBeenCalledWith('place-name failed', 'warning');
    expect(sdk.init).not.toHaveBeenCalled();
  });
});

describe('monitoring: with a DSN', () => {
  it('keeps the calls until Sentry starts, then sends them in order', async () => {
    const monitoring = await freshMonitoring('https://key@o1.ingest.de.sentry.io/1');
    monitoring.setTag('satellites', 'off');
    monitoring.addBreadcrumb({ category: 'fireworks', message: 'fired' });
    await Promise.resolve();
    expect(sdk.setTag).not.toHaveBeenCalled();

    await monitoring.startMonitoring({ dsn: 'https://key@o1.ingest.de.sentry.io/1' });
    await vi.waitFor(() => expect(sdk.addBreadcrumb).toHaveBeenCalledWith({ category: 'fireworks', message: 'fired' }));
    expect(sdk.init).toHaveBeenCalledWith({ dsn: 'https://key@o1.ingest.de.sentry.io/1' });
    expect(sdk.setTag).toHaveBeenCalledWith('satellites', 'off');
    expect(sdk.init.mock.invocationCallOrder[0]).toBeLessThan(sdk.setTag.mock.invocationCallOrder[0]);

    // Started: the next call runs at once.
    monitoring.captureException(new Error('later'));
    expect(sdk.captureException).toHaveBeenCalledTimes(1);
  });

  it('sends an error that happened before the start', async () => {
    const monitoring = await freshMonitoring('https://key@o1.ingest.de.sentry.io/1');
    monitoring.watchEarlyErrors();
    const error = new Error('early');
    window.dispatchEvent(new ErrorEvent('error', { error, message: 'early' }));
    expect(sdk.captureException).not.toHaveBeenCalled();
    const remove = vi.spyOn(window, 'removeEventListener');
    await monitoring.startMonitoring({});
    expect(sdk.captureException).toHaveBeenCalledWith(error);
    // After the start Sentry's own handlers take over: the early listeners are gone.
    expect(remove).toHaveBeenCalledWith('error', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    remove.mockRestore();
  });

  it('does not throw when the SDK fails to load; the calls stay unsent', async () => {
    const monitoring = await freshMonitoring('https://key@o1.ingest.de.sentry.io/1');
    sdk.init.mockImplementation(() => { throw new Error('init failed'); });
    await expect(monitoring.startMonitoring({})).resolves.toBeUndefined();
    monitoring.setTag('place', 'ok');
    await Promise.resolve();
    expect(sdk.setTag).not.toHaveBeenCalled();
  });
});
