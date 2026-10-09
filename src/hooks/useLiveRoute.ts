import { useEffect, useState } from 'react';
import { roundPlace, type LiveRoute } from '@/utils/planeFeed';

// The route of a live plane (ROADMAP item 111): one request to our proxy when its card opens.
// The place is rounded to 0.1°, as for the feed; the proxy sends only the callsign on to
// adsb.lol. A failed request gives null: the card leaves the route out.
export const liveRouteUrl = (callsign: string, latitude: number, longitude: number): string => {
  const { lat, lon } = roundPlace(latitude, longitude);
  return `/api/planes?route=${encodeURIComponent(callsign)}&lat=${lat.toFixed(1)}&lon=${lon.toFixed(1)}`;
};

export const useLiveRoute = (callsign: string | null, latitude: number, longitude: number): LiveRoute | null => {
  // The answer with its callsign, so another plane's card never shows the last one's route.
  const [answer, setAnswer] = useState<{ callsign: string; route: LiveRoute | null } | null>(null);
  const { lat, lon } = roundPlace(latitude, longitude);

  useEffect(() => {
    if (!callsign) return;
    const controller = new AbortController();
    fetch(liveRouteUrl(callsign, lat, lon), { signal: controller.signal })
      .then(response => (response.ok ? response.json() as Promise<{ route?: LiveRoute | null }> : Promise.reject(new Error(String(response.status)))))
      .then(body => { if (!controller.signal.aborted) setAnswer({ callsign, route: body?.route ?? null }); })
      .catch(() => { if (!controller.signal.aborted) setAnswer({ callsign, route: null }); });
    return () => controller.abort();
  }, [callsign, lat, lon]);

  return callsign && answer?.callsign === callsign ? answer.route : null;
};
