
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

createRoot(document.getElementById("root")!).render(<App />);

// Register PWA service worker with immediate updates
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('New content available, updating...')
    updateSW(true)
  },
  onOfflineReady() {
    console.log('App ready to work offline')
  },
  onRegisteredSW(swUrl, r) {
    console.log('SW registered: ' + swUrl)
    if (r) {
      // Force update check every 60 seconds
      setInterval(() => {
        r.update()
      }, 60000)
    }
  },
})
