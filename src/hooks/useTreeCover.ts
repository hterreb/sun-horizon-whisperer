import { useEffect, useState } from 'react';
import { type HorizonProfile } from '@/utils/horizonUtils';
import { type TreeLayer } from '@/utils/treeSilhouettes';

// Tree silhouettes (ROADMAP item 141): once the horizon profile is ready, loads the tree
// code and the land cover at its ridge points, both with a dynamic import() (item 125), so
// nothing of it is in the start bundle and the first render never waits for it. `ready`
// must be the profile's status: while a new place or eye height loads, the old profile
// stays and the coordinates are already new, so loading then would mix the two.
export const useTreeCover = (
  profile: HorizonProfile | null,
  ready: boolean,
  lat: number,
  lon: number
): TreeLayer | null => {
  const [loaded, setLoaded] = useState<{ profile: HorizonProfile; layer: TreeLayer } | null>(null);

  useEffect(() => {
    if (!profile || !ready) return;
    const controller = new AbortController();
    Promise.all([import('@/utils/landCover'), import('@/utils/treeSilhouettes')])
      .then(([landCover, lib]) =>
        landCover.loadTreeCover(lat, lon, profile, controller.signal).then((cover) => ({ cover, lib }))
      )
      .then((layer) => {
        if (!controller.signal.aborted) setLoaded({ profile, layer });
      })
      .catch((error) => {
        if (!controller.signal.aborted) console.error('Error loading tree cover:', error);
      });
    return () => controller.abort();
  }, [profile, ready, lat, lon]);

  // Trees only for the profile they were loaded for.
  return loaded && loaded.profile === profile ? loaded.layer : null;
};
