import { useState } from 'react';

// True from the first render in which `condition` is true, and then for good. A lazy part
// (ROADMAP item 174) mounts only when it can show, and stays mounted so a fade-out or a
// started show can end. The state is set during render, like the other render-time resets.
export const useEverTrue = (condition: boolean): boolean => {
  const [ever, setEver] = useState(condition);
  if (condition && !ever) setEver(true);
  return ever || condition;
};
