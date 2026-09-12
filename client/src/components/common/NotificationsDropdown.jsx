import React, { useState, useEffect, useRef } from 'react';
import { notificationService } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import {
  IconBell,
  IconCheckCircle,
  IconCheckSquare,
  IconClock,
  IconCertificate,
} from './Icons';
import { formatDate } from '../../utils/helpers';

export const NotificationsDropdown = ({ onSelectNotification }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await notificationService.getMy();
      if (res.data.success) {
        setNotifications(res.data.data);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err.message);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Listen for time advancement or other events to refresh notifications
    const handleTimeEvent = () => fetchNotifications();
    window.addEventListener('time:advanced', handleTimeEvent);
    window.addEventListener('time:changed', handleTimeEvent);
    window.addEventListener('time:reset', handleTimeEvent);

    const interval = setInterval(fetchNotifications, 12000);
    return () => {
      window.removeEventListener('time:advanced', handleTimeEvent);
      window.removeEventListener('time:changed', handleTimeEvent);
      window.removeEventListener('time:reset', handleTimeEvent);
      clearInterval(interval);
    };
  }, [user]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'READ' })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (notif.status !== 'READ') {
      try {
        await notificationService.markRead(notif._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, status: 'READ' } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error('Error marking read:', err);
      }
    }

    setIsOpen(false);
    if (onSelectNotification) {
      onSelectNotification(notif);
    }
  };

  return (
    <div className="notifications-container" ref={dropdownRef}>
      <button
        className="nav-icon-btn notifications-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
        aria-label="View notifications"
      >
        <IconBell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge-pulse">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notifications-dropdown-menu">
          <div className="notifications-dropdown-header">
            <div className="notif-header-title">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="notif-pill-count">{unreadCount} new</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                className="notif-mark-all-btn"
                onClick={handleMarkAllRead}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="notifications-list">
            {notifications.length === 0 ? (
              <div className="notifications-empty">
                <IconBell size={32} className="text-muted" />
                <p>No notifications yet</p>
                <span className="text-xs text-muted">You will be notified when follow-ups are due</span>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = n.status !== 'READ';
                return (
                  <div
                    key={n._id}
                    className={`notification-item ${isUnread ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className="notif-icon-col">
                      {n.type === 'FOLLOWUP_READY' ? (
                        <div className="notif-icon-badge follow-up">
                          <IconCheckSquare size={16} />
                        </div>
                      ) : n.type === 'CERTIFICATE_ISSUED' ? (
                        <div className="notif-icon-badge cert">
                          <IconCertificate size={16} />
                        </div>
                      ) : (
                        <div className="notif-icon-badge default">
                          <IconClock size={16} />
                        </div>
                      )}
                    </div>
                    <div className="notif-content-col">
                      <div className="notif-item-title">{n.title}</div>
                      <div className="notif-item-msg">{n.message}</div>
                      <div className="notif-item-date">{formatDate(n.sentAt || n.createdAt)}</div>
                    </div>
                    {isUnread && <span className="unread-dot"></span>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
