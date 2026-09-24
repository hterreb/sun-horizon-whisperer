
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

createRoot(document.getElementById("root")!).render(<App />);

// Register PWA service worker with immediate updates
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true)
  },
  onOfflineReady() {
  },
  onRegisteredSW(swUrl, r) {
    if (r) {
      // Force update check every hour
      setInterval(() => {
        r.update()
      }, 60 * 60 * 1000)
    }
  },
})
