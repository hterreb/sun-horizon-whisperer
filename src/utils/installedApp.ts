// The app runs installed, not in a browser tab (ROADMAP item 90): the Play app (a TWA
// with `display: fullscreen`) or an installed PWA. SunTracker keeps the screen on there;
// PWAInstallPrompt shows no install prompt there. iOS home-screen apps also set
// `navigator.standalone`, and a page the TWA opens has an android-app:// referrer.
export const isInstalledApp = (): boolean => {
  const displayMode = (mode: string) =>
    typeof window.matchMedia === 'function' && window.matchMedia(`(display-mode: ${mode})`).matches;
  return (
    displayMode('fullscreen') ||
    displayMode('standalone') ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://')
  );
};
