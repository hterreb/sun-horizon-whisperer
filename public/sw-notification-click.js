// Sunset reminder (ROADMAP item 69): a tap on the notification focuses an open app
// window, else opens the app. Loaded into the generated service worker (vite.config.ts).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => 'focus' in client);
      return open ? open.focus() : self.clients.openWindow('/');
    })
  );
});
