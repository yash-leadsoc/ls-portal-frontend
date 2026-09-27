self.addEventListener('push', (event) => {
  let data = {};

  try {
    data = event.data?.json() || {};
  } catch {
    data = {};
  }

  const title =
    data.title || 'LeadSoC Portal';

  const options = {
    body:
      data.body ||
      'You have a new notification.',

    icon: '/logo.png',

    badge: '/logo.png',

    data: {
      url: data.url || '/',
    },

    tag:
      data.type ||
      'leadsoc-notification',

    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  );
});

self.addEventListener(
  'notificationclick',
  (event) => {
    event.notification.close();

    const url =
      event.notification.data?.url || '/';

    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      }).then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
);
