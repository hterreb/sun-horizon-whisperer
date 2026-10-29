import React, { useMemo, useState } from 'react';
import { Mountain, Share2 } from 'lucide-react';
import { ROW, ICON_TOGGLE } from './InfoPanel';
import PremiumBadge from './PremiumBadge';
import { Switch } from './ui/switch';
import { TAP_TARGET } from '@/utils/glassChrome';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import { usePremiumGate } from '@/hooks/usePremium';
import { type MessageKey } from '@/i18n';
import { type HorizonProfile } from '@/utils/horizonUtils';
import { formatTime } from '@/utils/sunUtils';
import { shareOrDownload } from '@/utils/shareCard';
import { drawCountdownCard, getCountdownCardData } from '@/utils/countdownCard';
import { startOfDayIn } from '@/utils/timeZone';
import {
  SPARK_DAYS, TURNING_POINT_NAMES, getDaylight, getNextTurningPoint, getPolarCountdown, getYearDaylight, type PolarEvent,
} from '@/utils/turningPoints';

// The body of the Daylight card (ROADMAP item 186): today's daylight and its change (C2), behind
// the ridge with a profile (X1), the next turning point with the countdown share card (C4), the
// switch of the horizon calendar in the scene (Y4) and, at a polar place only, the polar
// countdown (M4). It loads when the card opens (item 174).

interface DaylightDetailsProps {
  now: Date;
  latitude: number;
  longitude: number;
  horizonProfile: HorizonProfile | null;
  placeName: string | null;
  isHorizonCalendarOn: boolean;
  onHorizonCalendarToggle: (on: boolean) => void;
}

const POLAR_EVENTS: Record<PolarEvent, MessageKey> = {
  lastSunset: 'polar.lastSunset', sunBack: 'polar.sunBack', midnightSunStart: 'polar.midnightSunStart', midnightSunEnd: 'polar.midnightSunEnd',
};
const SPARK_W = 280;
const SPARK_H = 48;

const DaylightDetails: React.FC<DaylightDetailsProps> = ({
  now, latitude, longitude, horizonProfile, placeName, isHorizonCalendarOn, onHorizonCalendarToggle,
}) => {
  const { t, language, timeZone } = useLanguage();
  const { requirePremium } = usePremiumGate();
  const [isSharing, setIsSharing] = useState(false);
  // The panel renders every second; the sun math runs once a day (and for a new place or profile).
  const dayStart = startOfDayIn(now, timeZone).getTime();
  const { daylight, next, polar } = useMemo(() => {
    const day = new Date(dayStart);
    return {
      daylight: getDaylight(day, latitude, longitude, timeZone, horizonProfile),
      next: getNextTurningPoint(day, latitude, timeZone),
      polar: getPolarCountdown(day, latitude, longitude, timeZone),
    };
  }, [dayStart, latitude, longitude, timeZone, horizonProfile]);

  const duration = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    return t('info.hoursMinutes', { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
  };
  const change = (seconds: number) => {
    const total = Math.round(Math.abs(seconds));
    const text = total >= 60
      ? t('daylight.minSec', { minutes: Math.floor(total / 60), seconds: total % 60 })
      : t('daylight.sec', { seconds: total });
    return t(seconds < 0 ? 'daylight.less' : 'daylight.more', { value: text });
  };
  const when = (days: number) =>
    days === 0 ? t('daylight.whenToday') : days === 1 ? t('daylight.whenTomorrow') : t('daylight.inDays', { days });
  const shortDate = (date: Date) => date.toLocaleDateString(language, { day: 'numeric', month: 'short', timeZone });
  const dayAndTime = (date: Date) =>
    `${date.toLocaleDateString(language, { weekday: 'short', day: 'numeric', month: 'short', timeZone })}, ${formatTime(date, language, timeZone)}`;

  const { ridge } = daylight;
  const shown = ridge ? ridge.seconds : daylight.seconds;
  const value = daylight.polar === 'night' ? t('egg.polarNight') : daylight.polar === 'day' ? t('egg.midnightSun') : duration(shown);

  // Sparkline: flat one a day; behind the ridge one a week (X1), then the flat line is faint.
  const values = [...daylight.spark, ...(ridge?.spark.map((s) => s.seconds) ?? [])];
  const lo = Math.min(...values);
  const span = Math.max(...values) - lo || 1;
  const sx = (offset: number) => 2 + (offset + SPARK_DAYS) / (2 * SPARK_DAYS) * (SPARK_W - 4);
  const sy = (seconds: number) => 4 + (SPARK_H - 8) - (seconds - lo) / span * (SPARK_H - 8);
  const path = (points: [number, number][]) => points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
  const flatPath = path(daylight.spark.map((s, i) => [sx(i - SPARK_DAYS), sy(s)]));
  const ridgePath = ridge ? path(ridge.spark.map((s) => [sx(s.offset), sy(s.seconds)])) : null;

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const data = getCountdownCardData(next, placeName, language, timeZone);
      const blob = await drawCountdownCard(data, getYearDaylight(new Date(dayStart), latitude, longitude, timeZone, horizonProfile));
      if (await shareOrDownload(blob, data.fileName) === 'downloaded') {
        toast({ title: t('share.savedTitle'), description: data.fileName });
      }
    } catch {
      toast({ title: t('countdown.failed'), description: t('share.failedDescription') });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="space-y-1">
      <div className={`${ROW} min-h-11`}>
        <span className="text-body inline-flex items-center gap-1 whitespace-nowrap">
          {t('daylight.today')}
          {ridge && <><Mountain size={14} aria-hidden="true" /><PremiumBadge /></>}
        </span>
        <span className="font-semibold text-body tabular-nums" data-testid="daylight-value">{value}</span>
      </div>
      {ridge && !daylight.polar && (
        <p className="text-caption opacity-70 tabular-nums text-right">{t('daylight.flat', { duration: duration(daylight.seconds) })}</p>
      )}
      {!daylight.polar && (
        <p className={`text-caption tabular-nums ${daylight.change < 0 ? 'text-brand-peach' : 'text-brand-gold-light'}`}>
          <span aria-hidden="true">{daylight.change < 0 ? '▼ ' : '▲ '}</span>{change(daylight.change)}
        </p>
      )}
      <svg viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} className="block w-full h-auto" role="img" aria-label={t('daylight.chart')}>
        <path d={flatPath} fill="none" stroke={ridgePath ? 'hsl(var(--scene-glow-white))' : 'hsl(var(--brand-gold-light))'} strokeOpacity={ridgePath ? 0.35 : 1} strokeWidth={ridgePath ? 1.2 : 2} strokeLinejoin="round" />
        {ridgePath && <path d={ridgePath} fill="none" stroke="hsl(var(--brand-gold-light))" strokeWidth={2} strokeLinejoin="round" />}
        <circle cx={sx(0)} cy={sy(shown)} r={4} fill="hsl(var(--brand-gold-light))" stroke="hsl(var(--brand-night))" strokeWidth={2} />
      </svg>
      <div className="flex justify-between text-caption opacity-60">
        <span>{t('daylight.daysAgo', { days: SPARK_DAYS })}</span>
        <span>{t('daylight.axisToday')}</span>
        <span>{t('daylight.inDays', { days: SPARK_DAYS })}</span>
      </div>
      {!daylight.polar && (
        <p className="text-caption opacity-80">
          {daylight.solstice.days === 0
            ? t('daylight.solsticeToday')
            : t(daylight.solstice.longer ? 'daylight.longer' : 'daylight.shorter', { when: when(daylight.solstice.days) })}{' '}
          {/* A place with a midnight sun: the polar countdown below says it better than "24 h 0 min". */}
          {daylight.longest < 86_400 && t('daylight.ofLongest', { percent: Math.round(daylight.seconds / daylight.longest * 100), duration: duration(daylight.longest) })}
        </p>
      )}

      <div className={`${ROW} min-h-11`}>
        <span className="text-body">{t(TURNING_POINT_NAMES[next.point])}</span>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="font-semibold text-body" data-testid="turning-point-when">{when(next.days)}</span>
            <span className="text-caption opacity-70 tabular-nums">{dayAndTime(next.at)}</span>
          </div>
          <button
            type="button"
            onClick={() => requirePremium(handleShare)}
            disabled={isSharing}
            className={`${ICON_TOGGLE} relative disabled:opacity-50`}
            aria-label={t('countdown.share')}
            title={t('countdown.share')}
          >
            <Share2 size={14} />
            <PremiumBadge className="absolute -right-1 -top-1 h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      <div className={`${ROW} min-h-11`}>
        <label htmlFor="horizon-calendar" className="text-body inline-flex items-center gap-1">
          {t('daylight.horizonMarks')}<PremiumBadge />
        </label>
        <Switch
          className={TAP_TARGET}
          id="horizon-calendar"
          checked={isHorizonCalendarOn}
          onCheckedChange={(on) => (on ? requirePremium(() => onHorizonCalendarToggle(true)) : onHorizonCalendarToggle(false))}
        />
      </div>

      {polar && (
        <div className="flex flex-col gap-0.5 pb-1 pt-1 border-t border-[hsl(var(--panel-border)/0.12)]" data-testid="polar-countdown">
          <span className="text-caption font-semibold opacity-80">{t('polar.title')}</span>
          <span className="text-body">{t(POLAR_EVENTS[polar.next.event], { when: when(polar.next.days) })}</span>
          {polar.next.at && <span className="text-caption opacity-70 tabular-nums">{dayAndTime(polar.next.at)}</span>}
          {polar.night && (
            <span className="text-caption opacity-80 tabular-nums">
              {t('polar.nightWindow', { from: shortDate(polar.night.first), to: shortDate(polar.night.last), days: polar.night.days })}
            </span>
          )}
          {polar.day && (
            <span className="text-caption opacity-80 tabular-nums">
              {t('polar.dayWindow', { from: shortDate(polar.day.first), to: shortDate(polar.day.last), days: polar.day.days })}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default DaylightDetails;
