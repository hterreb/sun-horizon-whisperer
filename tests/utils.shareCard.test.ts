import { describe, it, expect, vi, afterEach } from 'vitest';
import { domToCanvas } from 'modern-screenshot';
import {
  captureShareView,
  getShareCardData,
  getRidgePoints,
  getShareFooterHeight,
  getShareViewScale,
  isSharedNode,
  shareOrDownload,
  SHARE_CARD_WIDTH,
} from '@/utils/shareCard';
import { formatTime } from '@/utils/sunUtils';
import { type HorizonProfile } from '@/utils/horizonUtils';

const at = (h: number, m: number, dayOffset = 0) => {
  const d = new Date(2026, 9, 1 + dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
};
vi.mock('modern-screenshot', () => ({ domToCanvas: vi.fn() }));

const today = { score: 7, clouds: 'score.cloudsHigh', horizon: 'score.horizonClear' } as const;
const tomorrow = { score: 3, clouds: 'score.cloudsThin', horizon: 'score.horizonClouded' } as const;

describe('getShareCardData (ROADMAP item 68)', () => {
  it('shows only the flat sunset when there is no terrain profile', () => {
    const data = getShareCardData({ placeName: 'Ravensburg', now: at(12, 0), flatSunset: at(18, 58), scoreToday: today, scoreTomorrow: tomorrow }, 'en');
    expect(data.placeName).toBe('Ravensburg');
    expect(data.timeLabel).toBe('Sunset');
    expect(data.timeText).toBe(formatTime(at(18, 58)));
    expect(data.flatText).toBeNull();
    expect(data.sunTime).toEqual(at(18, 58));
    expect(data.dateText).toBe('Thursday, October 1, 2026');
    expect(data.scoreText).toBe('Sunset score 7/10 · high clouds, clear horizon');
    expect(data.fileName).toBe('sun-chaser-sunset-2026-10-01.png');
  });

  it('shows the line-of-sight sunset plus the flat time when there is one', () => {
    const data = getShareCardData({ placeName: 'Sion', now: at(12, 0), flatSunset: at(19, 10), terrainSunset: at(18, 41) }, 'en');
    expect(data.timeLabel).toBe('Sunset, line of sight');
    expect(data.timeText).toBe(formatTime(at(18, 41)));
    expect(data.flatText).toBe(`Flat horizon ${formatTime(at(19, 10))} (−29 min)`);
    expect(data.sunTime).toEqual(at(18, 41));
    expect(data.scoreText).toBeNull();
  });

  it('says the sun stays behind terrain when the profile blocks it all day', () => {
    const data = getShareCardData({ placeName: 'Viganella', now: at(12, 0), flatSunset: at(17, 0), terrainSunset: null }, 'en');
    expect(data.timeText).toBe('Behind terrain');
    expect(data.flatText).toBe(`Flat horizon ${formatTime(at(17, 0))}`);
    expect(data.sunTime).toEqual(at(17, 0));
  });

  it("uses tomorrow's score once the panel shows tomorrow's sunset", () => {
    const data = getShareCardData({ placeName: 'Ravensburg', now: at(20, 0), flatSunset: at(18, 56, 1), scoreToday: today, scoreTomorrow: tomorrow }, 'en');
    expect(data.scoreText).toBe('Sunset score 3/10 · thin clouds, clouded horizon');
    expect(data.fileName).toBe('sun-chaser-sunset-2026-10-02.png');
  });

  it('writes the texts in the UI language (ROADMAP item 67)', () => {
    const data = getShareCardData({ placeName: 'Sion', now: at(12, 0), flatSunset: at(19, 10), terrainSunset: at(18, 41), scoreToday: today }, 'de');
    expect(data.timeLabel).toBe('Sonnenuntergang, Sichtlinie');
    expect(data.flatText).toBe(`Flacher Horizont ${formatTime(at(19, 10))} (−29 Min.)`);
    expect(data.dateText).toBe('Donnerstag, 1. Oktober 2026');
    expect(data.scoreText).toBe('Abendrot 7/10 · hohe Wolken, klarer Horizont');
  });

  it('leaves out the place line when there is no place name (no coordinates)', () => {
    expect(getShareCardData({ placeName: '  ', now: at(12, 0), flatSunset: at(18, 58) }, 'en').placeName).toBeNull();
    expect(getShareCardData({ placeName: null, now: at(12, 0), flatSunset: at(18, 58) }, 'en').placeName).toBeNull();
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

describe('Share the current view (ROADMAP item 78)', () => {
  it('gives the footer the date and time on screen, also during time travel', () => {
    const data = getShareCardData({ placeName: 'Ravensburg', now: at(21, 42, 5), flatSunset: at(18, 50, 6) }, 'en');
    expect(data.viewText).toBe(`October 6, 2026, ${formatTime(at(21, 42, 5))}`);
    expect(data.viewFileName).toBe('sun-chaser-2026-10-06-2142.png');
  });

  it('leaves out the nodes marked data-share-hide (the controls), keeps the scene', () => {
    const panel = document.createElement('div');
    panel.setAttribute('data-share-hide', '');
    expect(isSharedNode(panel)).toBe(false);
    expect(isSharedNode(document.createElement('svg'))).toBe(true);
    expect(isSharedNode(document.createTextNode('18:55'))).toBe(true);
  });

  it('keeps the screen pixels (at most 2×) and the image at most 2400 px long', () => {
    expect(getShareViewScale(390, 844, 3)).toBe(2); // phone: 780 × 1688 + a 156 px footer
    expect(getShareViewScale(1440, 900, 2)).toBeCloseTo(2400 / 1440); // desktop: 2400 wide
    expect(getShareViewScale(1440, 900, 1)).toBe(1);
    expect(getShareFooterHeight(780)).toBe(156);
  });

  it('captures the scene root with the hide filter, and fails so the button can fall back', async () => {
    const root = document.createElement('div');
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({ width: 390, height: 844 } as DOMRect);
    vi.mocked(domToCanvas).mockRejectedValue(new Error('foreignObject not supported'));
    const data = getShareCardData({ placeName: 'Ravensburg', now: at(12, 0), flatSunset: at(18, 58) }, 'en');
    await expect(captureShareView(root, data)).rejects.toThrow('foreignObject');
    expect(domToCanvas).toHaveBeenCalledWith(root, expect.objectContaining({ filter: isSharedNode }));
  });
});
