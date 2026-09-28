import { useEffect, useState } from 'react';
import { api } from '../api/client';
import {
  registerPushNotifications,
  pushPermission,
} from '../services/pushNotifications';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);

  const [notifications, setNotifications] =
    useState([]);

  const [unread, setUnread] =
    useState(0);

  const loadNotifications = async () => {
    try {
      const data =
        await api.listNotifications();

      setNotifications(
        data.notifications || []
      );

      setUnread(
        data.unreadCount || 0
      );
    } catch (error) {
    }
  };

  useEffect(() => {
    loadNotifications();

    const interval = setInterval(
      loadNotifications,
      30000
    );

    return () =>
      clearInterval(interval);
  }, []);

  const enableNotifications = async () => {
    try {
      await registerPushNotifications();

      alert(
        'Browser notifications enabled.'
      );
    } catch (error) {
      alert(error.message);
    }
  };

  const markRead = async (notification) => {
    try {
      if (!notification.read) {
        await api.markNotificationRead(
          notification._id
        );

        setUnread((value) =>
          Math.max(0, value - 1)
        );
      }

      if (notification.url) {
        window.location.href =
          notification.url;
      }
    } catch (error) {
    }
  };

  const markAllRead = async () => {
    await api.markAllNotificationsRead();

    setNotifications((items) =>
      items.map((item) => ({
        ...item,
        read: true,
      }))
    );

    setUnread(0);
  };

  return (
    <div className="notification-wrapper">

      <button
        className="notification-bell"
        onClick={() =>
          setOpen((value) => !value)
        }
        aria-label="Notifications"
      >
        🔔

        {unread > 0 && (
          <span className="notification-count">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-panel">

          <div className="notification-panel-header">
            <div>
              <strong>
                Notifications
              </strong>

              {unread > 0 && (
                <span>
                  {unread} unread
                </span>
              )}
            </div>

            {unread > 0 && (
              <button
                onClick={markAllRead}
              >
                Mark all read
              </button>
            )}
          </div>

          {pushPermission() === 'granted' ? (
            <div className="muted" style={{ fontSize: 12, padding: '6px 12px' }}>
              ✓ Desktop notifications are on for this browser
            </div>
          ) : pushPermission() === 'denied' ? (
            <div className="muted" style={{ fontSize: 12, padding: '6px 12px' }}>
              Notifications are blocked. Allow them in your browser's site settings to get alerts.
            </div>
          ) : pushPermission() === 'unsupported' ? null : (
            <button
              className="enable-notification-button"
              onClick={enableNotifications}
            >
              🔔 Enable browser notifications
            </button>
          )}

          <div className="notification-list">

            {notifications.length === 0 ? (
              <div className="notification-empty">
                You're all caught up.
              </div>
            ) : (
              notifications.map(
                (notification) => (
                  <button
                    key={notification._id}
                    className={`notification-item ${
                      notification.read
                        ? ''
                        : 'unread'
                    }`}
                    onClick={() =>
                      markRead(
                        notification
                      )
                    }
                  >
                    <div className="notification-dot" />

                    <div>
                      <div className="notification-title">
                        {notification.title}
                      </div>

                      <div className="notification-body">
                        {notification.body}
                      </div>

                      <div className="notification-time">
                        {new Date(
                          notification.createdAt
                        ).toLocaleString()}
                      </div>
                    </div>
                  </button>
                )
              )
            )}

          </div>
        </div>
      )}
    </div>
  );
}
