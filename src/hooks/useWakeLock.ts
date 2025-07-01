
import { useEffect, useRef } from 'react';

export const useWakeLock = (isActive: boolean) => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!('wakeLock' in navigator)) {
      console.log('Wake Lock API not supported');
      return;
    }

    const requestWakeLock = async () => {
      try {
        if (isActive && !wakeLockRef.current) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          console.log('Screen wake lock activated');
        } else if (!isActive && wakeLockRef.current) {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
          console.log('Screen wake lock released');
        }
      } catch (error) {
        console.error('Wake lock error:', error);
      }
    };

    requestWakeLock();

    // Handle visibility change (when user switches tabs/apps)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive && !wakeLockRef.current) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, [isActive]);

  return wakeLockRef.current;
};
