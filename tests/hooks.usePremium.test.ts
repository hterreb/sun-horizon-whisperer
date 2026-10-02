import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const toastMock = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ toast: (...args: unknown[]) => toastMock(...args) }));

import { usePremium } from '@/hooks/usePremium';

// ROADMAP item 14: Premium through the Digital Goods API, with a mocked service.
const premiumPurchase = { itemId: 'premium', purchaseToken: 'token-1' };

const mockService = (purchases: DigitalGoodsPurchaseDetails[] = []) => {
  const service = {
    getDetails: vi.fn(async () => [{ itemId: 'premium', title: 'Premium', price: { currency: 'EUR', value: '3.99' } }]),
    listPurchases: vi.fn(async () => purchases),
    consume: vi.fn(async () => {}),
    acknowledge: vi.fn(async () => {}),
  };
  window.getDigitalGoodsService = vi.fn(async () => service);
  return service;
};

const mockPaymentRequest = (show: () => Promise<unknown>) => {
  const ctor = vi.fn(function (this: { show: typeof show }) {
    this.show = show;
  });
  vi.stubGlobal('PaymentRequest', ctor);
  return ctor;
};

// Renders the hook and waits until billing is set up (the service and listPurchases resolved).
const renderBilling = async (enforced: boolean, service: ReturnType<typeof mockService>) => {
  const hook = renderHook(() => usePremium('en', enforced));
  await waitFor(() => expect(hook.result.current.isBillingAvailable).toBe(true));
  await waitFor(() => expect(service.listPurchases).toHaveBeenCalled());
  return hook;
};

beforeEach(() => {
  localStorage.clear();
  toastMock.mockClear();
});

afterEach(() => {
  delete window.getDigitalGoodsService;
  vi.unstubAllGlobals();
});

describe('usePremium (ROADMAP item 14)', () => {
  it('without the Digital Goods API (the web) Premium is unlocked, even when enforced', () => {
    const { result } = renderHook(() => usePremium('en', true));
    expect(result.current.isPremium).toBe(true);
    expect(result.current.isBillingAvailable).toBe(false);
    expect(result.current.isLocked).toBe(false);
  });

  it('is unlocked when getDigitalGoodsService rejects (Chrome outside the Play app)', async () => {
    window.getDigitalGoodsService = vi.fn(async () => {
      throw new Error('unsupported');
    });
    const { result } = renderHook(() => usePremium('en', true));
    await waitFor(() => expect(window.getDigitalGoodsService).toHaveBeenCalledWith('https://play.google.com/billing'));
    expect(result.current.isLocked).toBe(false);
  });

  it('with the API and no purchase it is locked when enforced, and shows the local price', async () => {
    const service = mockService([]);
    const { result } = await renderBilling(true, service);
    expect(result.current.isPremium).toBe(false);
    expect(result.current.isLocked).toBe(true);
    await waitFor(() => expect(result.current.price).toBe('€3.99'));
    expect(service.getDetails).toHaveBeenCalledWith(['premium']);
  });

  it('with the API and a purchase it is unlocked and caches the hint', async () => {
    const service = mockService([premiumPurchase]);
    const { result } = await renderBilling(true, service);
    await waitFor(() => expect(result.current.isPremium).toBe(true));
    expect(result.current.isLocked).toBe(false);
    expect(localStorage.getItem('premium-owned')).toBe('true');
  });

  it('the purchase list overrides a stale localStorage hint', async () => {
    localStorage.setItem('premium-owned', 'true');
    const service = mockService([]);
    const { result } = await renderBilling(true, service);
    await waitFor(() => expect(result.current.isLocked).toBe(true));
    expect(localStorage.getItem('premium-owned')).toBe('false');
  });

  it('with PREMIUM_ENFORCED false it is never locked, and requirePremium runs the action', async () => {
    const service = mockService([]);
    const { result } = await renderBilling(false, service);
    expect(result.current.isPremium).toBe(false);
    expect(result.current.isLocked).toBe(false);
    const action = vi.fn();
    act(() => result.current.requirePremium(action));
    expect(action).toHaveBeenCalled();
    expect(result.current.isDialogOpen).toBe(false);
  });

  it('requirePremium opens the dialog instead of the action while locked', async () => {
    const service = mockService([]);
    const { result } = await renderBilling(true, service);
    const action = vi.fn();
    act(() => result.current.requirePremium(action));
    expect(action).not.toHaveBeenCalled();
    expect(result.current.isDialogOpen).toBe(true);
  });

  it('buy: a successful payment unlocks, acknowledges and closes the dialog', async () => {
    const service = mockService([]);
    const complete = vi.fn(async () => {});
    const ctor = mockPaymentRequest(async () => ({ details: { purchaseToken: 'token-2' }, complete }));
    const { result } = await renderBilling(true, service);
    act(() => result.current.setDialogOpen(true));
    await act(() => result.current.buy());
    expect(ctor).toHaveBeenCalledWith(
      [{ supportedMethods: 'https://play.google.com/billing', data: { sku: 'premium' } }],
      { total: { label: 'Premium', amount: { currency: 'EUR', value: '0' } } }
    );
    expect(complete).toHaveBeenCalledWith('success');
    expect(service.acknowledge).toHaveBeenCalledWith('token-2', 'onetime');
    expect(result.current.isPremium).toBe(true);
    expect(result.current.isLocked).toBe(false);
    expect(result.current.isDialogOpen).toBe(false);
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('buy: a cancel (AbortError) stays locked and shows no toast', async () => {
    const service = mockService([]);
    mockPaymentRequest(async () => {
      throw new DOMException('cancelled', 'AbortError');
    });
    const { result } = await renderBilling(true, service);
    await act(() => result.current.buy());
    expect(result.current.isLocked).toBe(true);
    expect(service.acknowledge).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('buy: another error stays locked and shows the error toast', async () => {
    const service = mockService([]);
    mockPaymentRequest(async () => {
      throw new Error('network');
    });
    const { result } = await renderBilling(true, service);
    await act(() => result.current.buy());
    expect(result.current.isLocked).toBe(true);
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Purchase failed' }));
  });

  it('restore: asks listPurchases again and unlocks when the purchase is found', async () => {
    const service = mockService([]);
    const { result } = await renderBilling(true, service);
    service.listPurchases.mockResolvedValueOnce([premiumPurchase]);
    await act(() => result.current.restore());
    expect(service.listPurchases).toHaveBeenCalledTimes(2);
    expect(result.current.isLocked).toBe(false);
  });

  it('restore: says so when no purchase is found', async () => {
    const service = mockService([]);
    const { result } = await renderBilling(true, service);
    await act(() => result.current.restore());
    expect(result.current.isLocked).toBe(true);
    expect(toastMock).toHaveBeenCalledWith({ title: 'No Premium purchase found on this Google account' });
  });
});
