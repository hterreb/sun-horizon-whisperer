// Countdown share card (ROADMAP item 186, C4): "54 days until midwinter" as a 1080x1350 PNG,
// with the year's daylight curve and today's dot. getCountdownCardData decides the texts (pure,
// tested); drawCountdownCard paints them with the share card's helpers (item 68).

import { formatTime } from './sunUtils';
import { COUNTDOWN_NAMES, TURNING_POINT_NAMES, type NextTurningPoint } from './turningPoints';
import { drawAppMark, FONT, toPng, token, SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH } from './shareCard';
import { translate } from '@/i18n';
import { type Language } from '@/utils/language';
import { wallTime } from './timeZone';

export interface CountdownCardData {
  big: string; // "54", or the name on the day
  line: string; // "days until midwinter", or "is today"
  placeLine: string; // "Ravensburg · Monday, 21 December, 21:50"
  fileName: string;
}

export const getCountdownCardData = (
  next: NextTurningPoint,
  placeName: string | null,
  language: Language,
  timeZone?: string
): CountdownCardData => {
  const when = `${next.at.toLocaleDateString(language, { weekday: 'long', day: 'numeric', month: 'long', timeZone })}, ${formatTime(next.at, language, timeZone)}`;
  const day = wallTime(next.at, timeZone);
  return {
    big: next.days === 0 ? translate(language, TURNING_POINT_NAMES[next.point]) : String(next.days),
    line: next.days === 0
      ? translate(language, 'countdown.isToday')
      : `${translate(language, next.days === 1 ? 'countdown.dayUntil' : 'countdown.daysUntil')} ${translate(language, COUNTDOWN_NAMES[next.point])}`,
    placeLine: placeName?.trim() ? `${placeName.trim()} · ${when}` : when,
    fileName: `sun-chaser-${next.point}-${day.year}-${String(day.month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}.png`,
  };
};

// The year curve: flat one a day; behind the ridge (X1) one a week, then the flat line is faint.
export interface YearCurve {
  flat: number[];
  ridge: { index: number; seconds: number }[] | null;
  today: number;
}

// The ridge value at a day index, between the two weekly samples around it.
const ridgeAt = (ridge: { index: number; seconds: number }[], index: number): number => {
  const after = ridge.findIndex((s) => s.index >= index);
  if (after <= 0) return ridge[after === 0 ? 0 : ridge.length - 1].seconds;
  const a = ridge[after - 1];
  const b = ridge[after];
  return a.seconds + (b.seconds - a.seconds) * (index - a.index) / (b.index - a.index);
};

export const drawCountdownCard = async (data: CountdownCardData, curve: YearCurve): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_CARD_WIDTH;
  canvas.height = SHARE_CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not available');
  const W = SHARE_CARD_WIDTH;
  const H = SHARE_CARD_HEIGHT;

  // The app's dusk sky over the whole card, dark at the bottom for the curve.
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, token('brand-mark-dusk'));
  sky.addColorStop(0.4, token('scene-sky-dusk-1'));
  sky.addColorStop(0.7, token('scene-sky-dusk-3'));
  sky.addColorStop(1, token('brand-night'));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const left = 96;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = token('scene-glow-white');
  ctx.font = `800 ${data.big.length > 4 ? 120 : 300}px ${FONT}`;
  ctx.fillText(data.big, left - 8, 420, W - 2 * left);
  ctx.font = `700 60px ${FONT}`;
  ctx.fillText(data.line, left, 520, W - 2 * left);
  ctx.fillStyle = token('scene-glow-white', 0.8);
  ctx.font = `500 36px ${FONT}`;
  ctx.fillText(data.placeLine, left, 590, W - 2 * left);

  // The curve: Jan 1 at the left, Dec 31 at the right.
  const top = 820;
  const height = 300;
  const values = [...curve.flat, ...(curve.ridge ?? []).map((s) => s.seconds)];
  const lo = Math.min(...values);
  const span = Math.max(...values) - lo || 1;
  const x = (index: number) => left + index / (curve.flat.length - 1) * (W - 2 * left);
  const y = (seconds: number) => top + height - (seconds - lo) / span * height;
  const line = (points: [number, number][], color: string, width: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    points.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.stroke();
  };
  const flatPoints = curve.flat.map((s, i): [number, number] => [x(i), y(s)]);
  if (curve.ridge) {
    line(flatPoints, token('scene-glow-white', 0.35), 3);
    line(curve.ridge.map((s): [number, number] => [x(s.index), y(s.seconds)]), token('brand-gold-light', 0.95), 6);
  } else {
    line(flatPoints, token('brand-gold-light', 0.95), 6);
  }
  const todaySeconds = curve.ridge ? ridgeAt(curve.ridge, curve.today) : curve.flat[curve.today];
  ctx.fillStyle = token('scene-glow-white');
  ctx.beginPath();
  ctx.arc(x(curve.today), y(todaySeconds), 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = `700 30px ${FONT}`;
  const nameWidth = ctx.measureText('Sun Chaser').width;
  await drawAppMark(ctx, W / 2 - (48 + 16 + nameWidth) / 2, H - 47, 48);
  return toPng(canvas);
};
