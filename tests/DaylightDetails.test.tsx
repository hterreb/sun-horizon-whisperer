import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DaylightDetails from '@/components/DaylightDetails';
import { LanguageContext } from '@/hooks/useLanguage';
import { translate } from '@/i18n';
import { shareOrDownload } from '@/utils/shareCard';
import { buildShareLink } from '@/utils/shareLink';
import { drawCountdownCard } from '@/utils/countdownCard';

vi.mock('@/utils/shareCard', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/shareCard')>()),
  shareOrDownload: vi.fn(),
}));
vi.mock('@/utils/countdownCard', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/countdownCard')>()),
  drawCountdownCard: vi.fn(),
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

// ROADMAP item 186: the body of the Daylight card.
const OCT_28 = new Date('2026-10-28T11:00:00Z');
const renderCard = (props: Partial<React.ComponentProps<typeof DaylightDetails>> = {}, timeZone = 'Europe/Berlin') =>
  render(
    <LanguageContext.Provider value={{ language: 'en', setLanguage: () => {}, t: (key, vars) => translate('en', key, vars), timeZone }}>
      <DaylightDetails
        now={OCT_28}
        latitude={47.78}
        longitude={9.61}
        horizonProfile={null}
        placeName="Ravensburg"
        isHorizonCalendarOn={false}
        onHorizonCalendarToggle={() => {}}
        {...props}
      />
    </LanguageContext.Provider>,
  );

describe('DaylightDetails (ROADMAP item 186)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the daylight, its change, the trend and the next turning point (C2)', () => {
    renderCard();
    expect(screen.getByTestId('daylight-value').textContent).toMatch(/^10 h 1\d min$/);
    expect(screen.getByText(/^\d min \d+ s less than yesterday$/)).toBeInTheDocument();
    expect(screen.getByText(/^Shorter every day until the solstice in 54 days\. That is 6\d % of the longest day \(16 h \d+ min\)\.$/)).toBeInTheDocument();
    expect(screen.getByText('Midwinter')).toBeInTheDocument();
    expect(screen.getByTestId('turning-point-when').textContent).toBe('in 54 days');
    expect(screen.getByRole('img', { name: 'Daylight from 45 days ago to 45 days ahead' })).toBeInTheDocument();
  });

  it('shows the daylight behind the ridge and the flat value with a profile (X1)', () => {
    renderCard({ horizonProfile: { angles: Array(360).fill(5), observerElevation: 450, eyeHeight: 1.7 } });
    expect(screen.getByText(/^flat horizon 10 h 1\d min$/)).toBeInTheDocument();
    expect(screen.getByTestId('daylight-value').textContent).not.toMatch(/^10 h 1\d min$/);
  });

  it('turns the horizon calendar on and off with the switch (Y4)', () => {
    const toggle = vi.fn();
    const { unmount } = renderCard({ onHorizonCalendarToggle: toggle });
    fireEvent.click(screen.getByRole('switch', { name: /Sunset points on the horizon/ }));
    expect(toggle).toHaveBeenCalledWith(true);
    unmount();
    renderCard({ onHorizonCalendarToggle: toggle, isHorizonCalendarOn: true });
    fireEvent.click(screen.getByRole('switch', { name: /Sunset points on the horizon/ }));
    expect(toggle).toHaveBeenLastCalledWith(false);
  });

  it('shows the polar countdown only at a polar place (M4)', () => {
    const { unmount } = renderCard();
    expect(screen.queryByTestId('polar-countdown')).toBeNull();
    unmount();
    renderCard({ latitude: 69.65, longitude: 18.96, placeName: 'Tromsø' }, 'Europe/Oslo');
    const polar = screen.getByTestId('polar-countdown');
    expect(polar.textContent).toMatch(/Last sunset before the polar night in \d+ days/);
    expect(polar.textContent).toMatch(/Polar night: (Nov|Dec) \d+ – Jan \d+ \(\d+ days\)/);
    expect(polar.textContent).toMatch(/Midnight sun: May \d+ – Jul \d+ \(\d+ days\)/);
  });

  it('shares the countdown card under its file name (C4)', async () => {
    const blob = new Blob(['png']);
    vi.mocked(drawCountdownCard).mockResolvedValue(blob);
    vi.mocked(shareOrDownload).mockResolvedValue('shared');
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Share the countdown' }));
    await waitFor(() => expect(shareOrDownload).toHaveBeenCalledWith(
      blob, 'sun-chaser-midwinter-2026-12-21.png',
      // Item 188: the place only, no moment.
      `See this in Sun Chaser: ${buildShareLink(47.78, 9.61, 'Europe/Berlin')}`,
    ));
    expect(vi.mocked(drawCountdownCard).mock.calls[0][0]).toMatchObject({ big: '54', line: 'days until midwinter' });
    expect(vi.mocked(drawCountdownCard).mock.calls[0][1].flat).toHaveLength(365);
  });
});
