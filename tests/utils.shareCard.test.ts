import { describe, it, expect, vi, afterEach } from 'vitest';
import { getShareCardData, getRidgePoints, shareOrDownload, SHARE_CARD_WIDTH } from '@/utils/shareCard';
import { formatTime } from '@/utils/sunUtils';
import { type HorizonProfile } from '@/utils/horizonUtils';

const at = (h: number, m: number, dayOffset = 0) => {
  const d = new Date(2026, 9, 1 + dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
};
const today = { score: 7, reason: 'high clouds, clear horizon' };
const tomorrow = { score: 3, reason: 'low clouds' };

describe('getShareCardData (ROADMAP item 68)', () => {
  it('shows only the flat sunset when there is no terrain profile', () => {
    const data = getShareCardData({ placeName: 'Ravensburg', now: at(12, 0), flatSunset: at(18, 58), scoreToday: today, scoreTomorrow: tomorrow });
    expect(data.placeName).toBe('Ravensburg');
    expect(data.timeLabel).toBe('Sunset');
    expect(data.timeText).toBe(formatTime(at(18, 58)));
    expect(data.flatText).toBeNull();
    expect(data.sunTime).toEqual(at(18, 58));
    expect(data.dateText).toBe('Thursday, 1 October 2026');
    expect(data.scoreText).toBe('Sunset score 7/10 · high clouds, clear horizon');
    expect(data.fileName).toBe('sun-chaser-sunset-2026-10-01.png');
  });

  it('shows the line-of-sight sunset plus the flat time when there is one', () => {
    const data = getShareCardData({ placeName: 'Sion', now: at(12, 0), flatSunset: at(19, 10), terrainSunset: at(18, 41) });
    expect(data.timeLabel).toBe('Sunset, line of sight');
    expect(data.timeText).toBe(formatTime(at(18, 41)));
    expect(data.flatText).toBe(`Flat horizon ${formatTime(at(19, 10))} (−29 min)`);
    expect(data.sunTime).toEqual(at(18, 41));
    expect(data.scoreText).toBeNull();
  });

  it('says the sun stays behind terrain when the profile blocks it all day', () => {
    const data = getShareCardData({ placeName: 'Viganella', now: at(12, 0), flatSunset: at(17, 0), terrainSunset: null });
    expect(data.timeText).toBe('Behind terrain');
    expect(data.flatText).toBe(`Flat horizon ${formatTime(at(17, 0))}`);
    expect(data.sunTime).toEqual(at(17, 0));
  });

  it("uses tomorrow's score once the panel shows tomorrow's sunset", () => {
    const data = getShareCardData({ placeName: 'Ravensburg', now: at(20, 0), flatSunset: at(18, 56, 1), scoreToday: today, scoreTomorrow: tomorrow });
    expect(data.scoreText).toBe('Sunset score 3/10 · low clouds');
    expect(data.fileName).toBe('sun-chaser-sunset-2026-10-02.png');
  });

  it('leaves out the place line when there is no place name (no coordinates)', () => {
    expect(getShareCardData({ placeName: '  ', now: at(12, 0), flatSunset: at(18, 58) }).placeName).toBeNull();
    expect(getShareCardData({ placeName: null, now: at(12, 0), flatSunset: at(18, 58) }).placeName).toBeNull();
  });
});

describe('getRidgePoints', () => {
  it('lifts the ridge by the horizon angle, centred on the sunset azimuth', () => {
    const angles = Array.from({ length: 360 }, (_, az) => (az === 270 ? 5 : 0));
    const profile: HorizonProfile = { angles, observerElevation: 0, eyeHeight: 1.7 };
    const points = getRidgePoints(profile, 270, 4);
    const centre = points.find((p) => p.x === SHARE_CARD_WIDTH / 2)!;
    expect(points[0].y - centre.y).toBeCloseTo(5 * (SHARE_CARD_WIDTH / 90));
    expect(points[0].y).toBe(points[points.length - 1].y);
  });
});

describe('shareOrDownload', () => {
  const blob = new Blob(['png'], { type: 'image/png' });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shares the file when the Web Share API takes files', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { canShare: () => true, share });
    await expect(shareOrDownload(blob, 'card.png')).resolves.toBe('shared');
    expect(share.mock.calls[0][0].files[0].name).toBe('card.png');
  });

  it('ends quietly when the user cancels the share sheet', async () => {
    vi.stubGlobal('navigator', { canShare: () => true, share: vi.fn().mockRejectedValue(new DOMException('cancel', 'AbortError')) });
    await expect(shareOrDownload(blob, 'card.png')).resolves.toBe('cancelled');
  });

  it('downloads the PNG when files cannot be shared', async () => {
    vi.stubGlobal('navigator', {});
    URL.createObjectURL = vi.fn(() => 'blob:card');
    URL.revokeObjectURL = vi.fn();
    let downloaded = '';
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloaded = `${this.download} ${this.href}`;
    });
    await expect(shareOrDownload(blob, 'card.png')).resolves.toBe('downloaded');
    expect(click).toHaveBeenCalledOnce();
    expect(downloaded).toBe('card.png blob:card');
  });
});
