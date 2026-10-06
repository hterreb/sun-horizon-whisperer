import { useEffect, useState } from 'react';
import { LIVE_MAX_AGE_MS, LIVE_POLL_MS, planeFeedUrl } from '@/utils/liveRadar';
import { roundPlace, type LiveFeed } from '@/utils/planeFeed';

// The live radar's feed (ROADMAP item 96): one request to our proxy every 15 s, only while
// `enabled` (the switch is on) and the page is visible. The place is rounded to 0.1° before
// it leaves the device. `receivedAt` is when the answer came (Date.now()), the start of the
// planes' motion until the next one. A failed request keeps the last answer until it is a
// minute old.
export interface LivePlanesState {
  feed: LiveFeed;
  receivedAt: number;
}

export const useLivePlanes = (enabled: boolean, latitude: number, longitude: number): LivePlanesState | null => {
  const [state, setState] = useState<LivePlanesState | null>(null);
  // One poll loop per 0.1° cell, not per small move of the place.
  const { lat, lon } = roundPlace(latitude, longitude);

  useEffect(() => {
    if (!enabled) return;
    let controller: AbortController | null = null;
    const poll = () => {
      if (document.visibilityState !== 'visible') return;
      controller?.abort();
      const own = new AbortController();
      controller = own;
      fetch(planeFeedUrl(lat, lon), { signal: own.signal })
        .then(response => (response.ok ? response.json() as Promise<LiveFeed> : Promise.reject(new Error(String(response.status)))))
        .then(feed => {
          if (!own.signal.aborted && Array.isArray(feed?.aircraft)) setState({ feed, receivedAt: Date.now() });
        })
        .catch(() => {
          if (own.signal.aborted) return;
          setState(prev => (prev && Date.now() - prev.receivedAt > LIVE_MAX_AGE_MS ? null : prev));
        });
    };
    poll();
    const id = setInterval(poll, LIVE_POLL_MS);
    // Back in view: an answer at once, not up to 15 s later.
    const onVisible = () => { if (document.visibilityState === 'visible') poll(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      controller?.abort();
    };
  }, [enabled, lat, lon]);

  return enabled ? state : null;
};
