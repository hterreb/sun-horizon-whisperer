import { useCallback, useEffect, useState } from 'react';
import { LIGHT_SKY_FADE_MS, SCENE_HANDOFF_MS } from '@/components/LightSky';

// The hand-over from the light first sky to the full scene (ROADMAP item 174):
// `light`: only the light sky shows; the full scene is loading.
// `handoff`: the full scene has arrived and fades in over the light sky, which stays opaque.
// `leaving`: the full scene is in; the light sky fades out under it.
// `full`: the light sky is gone.
export type SceneStage = 'light' | 'handoff' | 'leaving' | 'full';

export const useSceneHandoff = (): { stage: SceneStage; onShown: () => void } => {
  const [stage, setStage] = useState<SceneStage>('light');
  const onShown = useCallback(() => setStage((current) => (current === 'light' ? 'handoff' : current)), []);
  useEffect(() => {
    if (stage !== 'handoff' && stage !== 'leaving') return;
    const timeoutId = setTimeout(
      () => setStage(stage === 'handoff' ? 'leaving' : 'full'),
      stage === 'handoff' ? SCENE_HANDOFF_MS : LIGHT_SKY_FADE_MS + 50,
    );
    return () => clearTimeout(timeoutId);
  }, [stage]);
  return { stage, onShown };
};
