import React, { useState, useEffect, useRef } from "react";
import {
  Bell,
  X,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Clock,
} from "lucide-react";
import notificationService from "../services/notificationService";

const NotificationCenter = ({ isDarkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch notifications when component mounts or opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initial load of notifications
  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const dbNotifications = await notificationService.getAllNotifications();
      setNotifications(dbNotifications);
      setUnreadCount(notificationService.getUnreadCount());
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (notification.action && notification.action.onClick) {
      notification.action.onClick();
    }

    // Mark as read if clicking on unread notification
    if (!notification.isRead) {
      await markAsRead();
    }

    setIsOpen(false);
  };

  const markAsRead = async () => {
    const success = await notificationService.markNotificationsAsRead();
    if (success) {
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true })),
      );
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const notifTime = new Date(timestamp);
    const diffMinutes = Math.floor((now - notifTime) / 60000);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-colors ${
          isDarkMode
            ? "text-gray-300 hover:text-white hover:bg-gray-700"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        }`}
        title="Notifications"
      >
        <Bell className="w-5 h-5" />

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-80 max-h-96 rounded-lg shadow-xl border overflow-hidden z-50 ${
            isDarkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          }`}
        >
          {/* Header */}
          <div
            className={`px-4 py-3 border-b flex items-center justify-between ${
              isDarkMode ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <h3
              className={`font-semibold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Notifications
            </h3>

            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAsRead}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    isDarkMode
                      ? "text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                      : "text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  }`}
                >
                  Mark all read
                </button>
              )}

              <button
                onClick={() => setIsOpen(false)}
                className={`p-1 rounded transition-colors ${
                  isDarkMode
                    ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div
                className={`text-center py-8 px-4 ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 transition-colors relative ${
                      notification.clickable ? "cursor-pointer" : ""
                    } ${
                      !notification.isRead
                        ? isDarkMode
                          ? "bg-gray-700 hover:bg-gray-600"
                          : "bg-blue-50 hover:bg-blue-100"
                        : isDarkMode
                          ? "hover:bg-gray-700"
                          : "hover:bg-gray-50"
                    }`}
                  >
                    {/* Unread indicator */}
                    {!notification.isRead && (
                      <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}

                    <div
                      className={`flex items-start space-x-3 ${!notification.isRead ? "ml-4" : ""}`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getIcon(notification.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {notification.title}
                        </p>

                        <p
                          className={`text-sm mt-1 ${
                            isDarkMode ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between mt-2">
                          <span
                            className={`text-xs ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            <Clock className="w-3 h-3 inline mr-1" />
                            {formatTime(notification.timestamp)}
                          </span>

                          {notification.action && (
                            <span
                              className={`text-xs font-medium ${
                                notification.type === "success"
                                  ? "text-green-600"
                                  : notification.type === "error"
                                    ? "text-red-600"
                                    : "text-blue-600"
                              }`}
                            >
                              {notification.action.label} →
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div
              className={`px-4 py-2 border-t text-center ${
                isDarkMode ? "border-gray-700" : "border-gray-200"
              }`}
            >
              <button
                onClick={fetchNotifications}
                className={`text-xs transition-colors ${
                  isDarkMode
                    ? "text-gray-400 hover:text-gray-200"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
