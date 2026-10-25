import React, { useEffect } from 'react';

// Wraps the full scene (ROADMAP item 174): it fades in over the light first sky when it has loaded,
// and reports that it is in. The light sky stays opaque under it, so the two never dip.
const SceneHandoff: React.FC<{ onShown: () => void; children: React.ReactNode }> = ({ onShown, children }) => {
  useEffect(() => {
    onShown();
  }, [onShown]);
  return <div className="animate-scene-handoff">{children}</div>;
};

export default SceneHandoff;
