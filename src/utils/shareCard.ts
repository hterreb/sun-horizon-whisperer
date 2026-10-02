// Share card (ROADMAP item 68): today's sunset as a 1080x1350 PNG, drawn on a
// <canvas>. getShareCardData decides which texts and times show (pure, tested);
// drawShareCard paints them with the scene tokens from index.css; shareOrDownload
// hands the PNG to the Web Share API or downloads it. No coordinates go on the card,
// only the place name.
// Share the current view (ROADMAP item 78): captureShareView renders the scene as the
// user sees it (modern-screenshot, loaded on the tap), without the controls marked
// `data-share-hide`, plus a footer band with the card's texts. The drawn card is the
// fallback when the capture fails.

import { formatTime, getSunPosition } from './sunUtils';
import { horizonAngleAt, type HorizonProfile } from './horizonUtils';
import { getScoreReason, type SunsetScoreResult } from './weatherUtils';
import { translate } from '@/i18n';
import { type Language } from '@/utils/language';

export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1350;
// The horizon sits at 65 % of the height, as in the scene (SunVisualization).
const HORIZON_Y = Math.round(SHARE_CARD_HEIGHT * 0.65);
// The card shows 90° of horizon around the sunset azimuth (the compass field of view).
const FOV_DEG = 90;
const PX_PER_DEG = SHARE_CARD_WIDTH / FOV_DEG;
const SUN_RADIUS = 96;

export interface ShareCardInput {
  placeName: string | null;
  now: Date;
  flatSunset: Date;
  // undefined: no terrain profile (flat horizon). null: the sun stays behind terrain.
  terrainSunset?: Date | null;
  scoreToday?: SunsetScoreResult | null;
  scoreTomorrow?: SunsetScoreResult | null;
}

export interface ShareCardData {
  placeName: string | null;
  dateText: string;
  timeLabel: string;
  timeText: string;
  // The flat time under the line-of-sight time; null on a flat horizon.
  flatText: string | null;
  scoreText: string | null;
  // The time that places the sun on the card (terrain sunset, else the flat one).
  sunTime: Date;
  fileName: string;
  // The date and time on screen, also during time travel (item 44), for the view's footer.
  viewText: string;
  viewFileName: string;
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const pad = (n: number) => String(n).padStart(2, '0');

export const getShareCardData = ({
  placeName,
  now,
  flatSunset,
  terrainSunset,
  scoreToday = null,
  scoreTomorrow = null,
}: ShareCardInput, language: Language): ShareCardData => {
  const hasProfile = terrainSunset !== undefined;
  const flatTime = formatTime(flatSunset, language);
  let timeLabel = translate(language, 'sun.sunset');
  let timeText = flatTime;
  let flatText: string | null = null;
  if (hasProfile) {
    flatText = translate(language, 'share.flatHorizon', { time: flatTime });
    timeLabel = translate(language, 'share.lineOfSight');
    if (terrainSunset) {
      const diff = Math.round((terrainSunset.getTime() - flatSunset.getTime()) / 60000);
      timeText = formatTime(terrainSunset, language);
      flatText += ` (${diff >= 0 ? '+' : '−'}${translate(language, 'common.minutes', { value: Math.abs(diff) })})`;
    } else {
      timeText = translate(language, 'terrain.behind');
    }
  }

  // After today's sunset the panel shows tomorrow's, so the score follows that day.
  const score = sameDay(flatSunset, now) ? scoreToday : scoreTomorrow;

  return {
    placeName: placeName?.trim() || null,
    dateText: flatSunset.toLocaleDateString(language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    timeLabel,
    timeText,
    flatText,
    scoreText: score ? translate(language, 'share.score', { score: score.score, reason: getScoreReason(score, language) }) : null,
    sunTime: terrainSunset ?? flatSunset,
    fileName: `sun-chaser-sunset-${flatSunset.getFullYear()}-${pad(flatSunset.getMonth() + 1)}-${pad(flatSunset.getDate())}.png`,
    viewText: `${now.toLocaleDateString(language, { day: 'numeric', month: 'long', year: 'numeric' })}, ${formatTime(now, language)}`,
    viewFileName: `sun-chaser-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.png`,
  };
};

// The ridge line across the card: one y per x step, centred on the sunset azimuth.
export const getRidgePoints = (profile: HorizonProfile, centerAzimuth: number, step = 8): { x: number; y: number }[] => {
  const points: { x: number; y: number }[] = [];
  for (let x = 0; x <= SHARE_CARD_WIDTH; x += step) {
    const azimuth = centerAzimuth + (x - SHARE_CARD_WIDTH / 2) / PX_PER_DEG;
    points.push({ x, y: HORIZON_Y - Math.max(0, horizonAngleAt(profile, azimuth)) * PX_PER_DEG });
  }
  return points;
};

// A scene token from index.css ("24.6 95% 53.1%") as a canvas colour.
const token = (name: string, alpha = 1): string => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  return value ? `hsla(${value.split(/\s+/).join(', ')}, ${alpha})` : `rgba(0, 0, 0, ${alpha})`;
};

const loadImage = (src: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

// The app mark and name, from `left`, with the name's baseline at `baseline`.
const drawAppMark = async (ctx: CanvasRenderingContext2D, left: number, baseline: number, size: number) => {
  const mark = await loadImage(`${import.meta.env.BASE_URL}logo-mark.svg`);
  if (mark) ctx.drawImage(mark, left, baseline - size * 0.73, size, size);
  ctx.font = `700 ${size * 0.625}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = token('scene-glow-white', 0.9);
  ctx.fillText('Sun Chaser', left + size * 4 / 3, baseline);
};

const toPng = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding failed'))), 'image/png'),
  );

export const drawShareCard = async (
  data: ShareCardData,
  latitude: number,
  longitude: number,
  profile: HorizonProfile | null,
): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_CARD_WIDTH;
  canvas.height = SHARE_CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not available');
  const W = SHARE_CARD_WIDTH;
  const H = SHARE_CARD_HEIGHT;

  // Sky: the app's evening gradient down to the horizon.
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
  sky.addColorStop(0, token('brand-mark-dusk'));
  sky.addColorStop(0.45, token('scene-sky-dusk-1'));
  sky.addColorStop(1, token('scene-sky-dusk-2'));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, HORIZON_Y);

  // Sun disc on the horizon (or on the ridge), with a soft glow.
  const ridge = profile ? getRidgePoints(profile, getSunPosition(data.sunTime, latitude, longitude).azimuth) : null;
  const sunY = ridge ? ridge[Math.round(ridge.length / 2)].y : HORIZON_Y;
  const glow = ctx.createRadialGradient(W / 2, sunY, SUN_RADIUS * 0.6, W / 2, sunY, SUN_RADIUS * 3.2);
  glow.addColorStop(0, token('scene-sun-glow-horizon', 0.55));
  glow.addColorStop(1, token('scene-sun-glow-horizon', 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, HORIZON_Y);
  ctx.fillStyle = token('brand-mark-sun');
  ctx.beginPath();
  ctx.arc(W / 2, sunY, SUN_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  // Terrain silhouette in the scene's ridge colour, opaque so it hides the sun.
  if (ridge) {
    ctx.fillStyle = token('scene-ridge-golden');
    ctx.beginPath();
    ctx.moveTo(0, HORIZON_Y);
    ridge.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(W, HORIZON_Y);
    ctx.closePath();
    ctx.fill();
  }

  // Below the horizon: dark water, so the times read in white.
  const ground = ctx.createLinearGradient(0, HORIZON_Y, 0, H);
  ground.addColorStop(0, token('scene-sky-dusk-3'));
  ground.addColorStop(1, token('brand-night'));
  ctx.fillStyle = ground;
  ctx.fillRect(0, HORIZON_Y, W, H - HORIZON_Y);
  ctx.fillStyle = token('brand-mark-sun', 0.8);
  ctx.fillRect(W / 2 - 120, HORIZON_Y + 18, 240, 6);
  ctx.fillStyle = token('brand-mark-sun', 0.45);
  ctx.fillRect(W / 2 - 70, HORIZON_Y + 40, 140, 6);

  // Texts: place and date on the sky, the times on the water.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = token('brand-night');
  if (data.placeName) {
    ctx.font = `700 76px ${FONT}`;
    ctx.fillText(data.placeName, W / 2, 190, W - 120);
  }
  ctx.font = `500 40px ${FONT}`;
  ctx.fillText(data.dateText, W / 2, data.placeName ? 260 : 190, W - 120);

  ctx.fillStyle = token('scene-glow-white', 0.8);
  ctx.font = `500 38px ${FONT}`;
  ctx.fillText(data.timeLabel, W / 2, HORIZON_Y + 92);
  ctx.fillStyle = token('scene-glow-white');
  ctx.font = `700 150px ${FONT}`;
  ctx.fillText(data.timeText, W / 2, HORIZON_Y + 232, W - 120);
  let y = HORIZON_Y + 232;
  if (data.flatText) {
    y += 60;
    ctx.fillStyle = token('scene-glow-white', 0.8);
    ctx.font = `500 38px ${FONT}`;
    ctx.fillText(data.flatText, W / 2, y);
  }
  if (data.scoreText) {
    y += 58;
    ctx.fillStyle = token('brand-peach');
    ctx.font = `600 32px ${FONT}`;
    ctx.fillText(data.scoreText, W / 2, y, W - 120);
  }

  // App mark and name at the bottom.
  ctx.font = `700 30px ${FONT}`;
  const nameWidth = ctx.measureText('Sun Chaser').width;
  await drawAppMark(ctx, W / 2 - (48 + 16 + nameWidth) / 2, H - 47, 48);

  return toPng(canvas);
};

export const SHARE_HIDE_ATTR = 'data-share-hide';
// modern-screenshot's filter: a node marked `data-share-hide` (a control) and its children stay out.
export const isSharedNode = (node: Node): boolean => !(node instanceof Element && node.hasAttribute(SHARE_HIDE_ATTR));

const SHARE_VIEW_MAX_PX = 2400;
// The footer band is one fifth of the image width high.
export const getShareFooterHeight = (width: number): number => Math.round(width / 5);
// The capture scale: the screen's pixel ratio (at most 2), with the long side of the
// image (the capture plus the footer) at most 2400 px.
export const getShareViewScale = (width: number, height: number, pixelRatio: number): number =>
  Math.min(pixelRatio, 2, SHARE_VIEW_MAX_PX / Math.max(width, height + width / 5));

// The footer under the view: place and view time on the left, the sunset on the right,
// the app mark under the place. Sizes are the card's at 1080 px, scaled to the width.
const drawShareFooter = async (ctx: CanvasRenderingContext2D, data: ShareCardData, top: number, W: number, band: number) => {
  const u = W / 1080;
  ctx.fillStyle = token('brand-night');
  ctx.fillRect(0, top, W, band);
  const left = 48 * u;
  const right = W - 48 * u;
  const column = W / 2 - 64 * u;
  ctx.textBaseline = 'alphabetic';

  ctx.textAlign = 'left';
  ctx.fillStyle = token('scene-glow-white');
  ctx.font = `700 ${52 * u}px ${FONT}`;
  if (data.placeName) ctx.fillText(data.placeName, left, top + 72 * u, column);
  ctx.fillStyle = token('scene-glow-white', 0.8);
  ctx.font = `500 ${30 * u}px ${FONT}`;
  ctx.fillText(data.viewText, left, top + (data.placeName ? 116 : 72) * u, column);
  await drawAppMark(ctx, left, top + 186 * u, 36 * u);

  ctx.textAlign = 'right';
  ctx.fillStyle = token('scene-glow-white', 0.8);
  ctx.font = `500 ${26 * u}px ${FONT}`;
  ctx.fillText(data.timeLabel, right, top + 52 * u, column);
  ctx.fillStyle = token('scene-glow-white');
  ctx.font = `700 ${68 * u}px ${FONT}`;
  ctx.fillText(data.timeText, right, top + 120 * u, column);
  let y = top + 120 * u;
  if (data.flatText) {
    y += 38 * u;
    ctx.fillStyle = token('scene-glow-white', 0.8);
    ctx.font = `500 ${24 * u}px ${FONT}`;
    ctx.fillText(data.flatText, right, y, column);
  }
  if (data.scoreText) {
    y += 36 * u;
    ctx.fillStyle = token('brand-peach');
    ctx.font = `600 ${24 * u}px ${FONT}`;
    ctx.fillText(data.scoreText, right, y, column);
  }
};

export const captureShareView = async (root: HTMLElement, data: ShareCardData): Promise<Blob> => {
  const { domToCanvas } = await import('modern-screenshot');
  const { width, height } = root.getBoundingClientRect();
  const view = await domToCanvas(root, {
    scale: getShareViewScale(width, height, window.devicePixelRatio || 1),
    filter: isSharedNode,
  });
  const band = getShareFooterHeight(view.width);
  const canvas = document.createElement('canvas');
  canvas.width = view.width;
  canvas.height = view.height + band;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not available');
  ctx.drawImage(view, 0, 0);
  await drawShareFooter(ctx, data, view.height, view.width, band);
  return toPng(canvas);
};

// Web Share API with the file when it is supported, else a download. A cancelled
// share sheet (AbortError) ends quietly.
export const shareOrDownload = async (blob: Blob, fileName: string): Promise<'shared' | 'downloaded' | 'cancelled'> => {
  const file = new File([blob], fileName, { type: 'image/png' });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Sunset' });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      throw error;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
};
