import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShareCardButton from '@/components/ShareCardButton';
import { drawShareCard, shareOrDownload } from '@/utils/shareCard';
import { toast } from '@/hooks/use-toast';

vi.mock('@/utils/shareCard', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/shareCard')>()),
  drawShareCard: vi.fn(),
  shareOrDownload: vi.fn(),
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

const card = { placeName: 'Ravensburg', now: new Date(2026, 9, 1, 12), flatSunset: new Date(2026, 9, 1, 18, 58) };
const renderButton = () => render(<ShareCardButton card={card} latitude={47.78} longitude={9.61} horizonProfile={null} />);

describe('ShareCardButton (ROADMAP item 68)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the gold plus', () => {
    renderButton();
    expect(screen.getByRole('button', { name: 'Share sunset card' })).toContainElement(screen.getByTestId('premium-badge'));
  });

  it('draws the card and shares it under the dated file name', async () => {
    const blob = new Blob(['png']);
    vi.mocked(drawShareCard).mockResolvedValue(blob);
    vi.mocked(shareOrDownload).mockResolvedValue('shared');
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: 'Share sunset card' }));
    await waitFor(() => expect(shareOrDownload).toHaveBeenCalledWith(blob, 'sun-chaser-sunset-2026-10-01.png'));
    expect(vi.mocked(drawShareCard).mock.calls[0][0].placeName).toBe('Ravensburg');
    expect(toast).not.toHaveBeenCalled();
  });

  it('shows a toast when the card cannot be made', async () => {
    vi.mocked(drawShareCard).mockRejectedValue(new Error('no canvas'));
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: 'Share sunset card' }));
    await waitFor(() => expect(toast).toHaveBeenCalled());
  });
});
