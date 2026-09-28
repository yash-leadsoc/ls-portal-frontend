self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'LeadSoC Portal';
  const isAlert = data.type === 'SYSTEM_ALERT';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || 'You have a new notification.',
      icon: '/logo.png',
      badge: '/logo.png',
      data: { url: data.url || '/' },
      tag: data.notificationId ? String(data.notificationId) : data.type || 'leadsoc-notification',
      renotify: true,
      requireInteraction: isAlert,
      vibrate: isAlert ? [200, 100, 200] : [100],
      timestamp: Date.now(),
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus().then((c) => (c && 'navigate' in c ? c.navigate(target) : c));
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(target) : undefined;
    })
  );
});
