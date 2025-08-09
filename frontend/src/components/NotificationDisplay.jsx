import React, { useState, useEffect } from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import NotificationService from "../services/notificationService";

const NotificationItem = ({ notification, onClose, isDarkMode }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(notification.id), 200);
  };

  const handleClick = () => {
    if (notification.clickable && notification.action?.onClick) {
      console.log("🔔 Notification clicked, navigating...");
      notification.action.onClick();
      handleClose();
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBackgroundColor = () => {
    const base = isDarkMode
      ? "bg-gray-800 border-gray-700"
      : "bg-white border-gray-200";
    switch (notification.type) {
      case "success":
        return `${base} border-l-4 border-l-green-500`;
      case "error":
        return `${base} border-l-4 border-l-red-500`;
      case "warning":
        return `${base} border-l-4 border-l-yellow-500`;
      default:
        return `${base} border-l-4 border-l-blue-500`;
    }
  };

  return (
    <div
      className={`transform transition-all duration-200 ease-out ${
        isVisible && !isExiting
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0"
      }`}
    >
      <div
        className={`min-w-80 max-w-md w-full shadow-lg rounded-lg border ${getBackgroundColor()} ${
          notification.clickable ? "cursor-pointer hover:shadow-xl" : ""
        }`}
        onClick={notification.clickable ? handleClick : undefined}
      >
        <div className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-base font-semibold leading-5 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {notification.title}
              </p>
              <p
                className={`mt-2 text-sm leading-5 ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {notification.message}
              </p>
              {notification.action && (
                <div className="mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      notification.action.onClick();
                      handleClose();
                    }}
                    className={`text-sm font-medium px-3 py-2 rounded-md transition-colors ${
                      notification.type === "success"
                        ? "text-green-700 hover:text-green-800 bg-green-100 hover:bg-green-200 border border-green-300"
                        : notification.type === "error"
                          ? "text-red-700 hover:text-red-800 bg-red-100 hover:bg-red-200 border border-red-300"
                          : notification.type === "warning"
                            ? "text-yellow-700 hover:text-yellow-800 bg-yellow-100 hover:bg-yellow-200 border border-yellow-300"
                            : "text-blue-700 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 border border-blue-300"
                    }`}
                  >
                    {notification.action.label}
                  </button>
                </div>
              )}
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className={`rounded-md inline-flex transition-colors ${
                  isDarkMode
                    ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationDisplay = ({ isDarkMode }) => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const unsubscribe = NotificationService.subscribe((notification) => {
      setNotifications((prev) => {
        // Remove existing notification with same ID if exists
        const filtered = prev.filter((n) => n.id !== notification.id);
        return [...filtered, notification];
      });

      // Auto-remove after duration (if specified and > 0)
      if (notification.duration > 0) {
        setTimeout(() => {
          setNotifications((prev) =>
            prev.filter((n) => n.id !== notification.id),
          );
        }, notification.duration);
      }
    });

    return unsubscribe;
  }, []);

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={removeNotification}
          isDarkMode={isDarkMode}
        />
      ))}
    </div>
  );
};

export default NotificationDisplay;
