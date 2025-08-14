class NotificationService {
  constructor() {
    this.callbacks = new Set();
    this.activeTranscriptions = new Map();
    this.pollingIntervals = new Map();
    this.databaseNotifications = []; // Add this line
  }

  // Add this new method to fetch notifications from database
  async fetchDatabaseNotifications() {
    try {
      const BACKEND_URL =
        import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

      const response = await fetch(`${BACKEND_URL}/api/notifications`, {
        credentials: "include",
      });

      if (response.ok) {
        const notifications = await response.json();

        // Convert database notifications to frontend format
        this.databaseNotifications = notifications.map((notif) => ({
          id: `db-${notif.notification_id}`,
          type: this.getNotificationTypeFromStatus(notif.project_status),
          title: this.getNotificationTitle(notif.project_status),
          message: notif.message,
          duration: 0, // Persistent
          timestamp: new Date(notif.creation_time),
          projectId: notif.project_id,
          isRead: notif.is_read,
          clickable: notif.project_status === "Completed",
          action:
            notif.project_status === "Completed"
              ? {
                  label: "View Results",
                  onClick: () => this.navigateToResults(notif.project_id),
                }
              : null,
        }));

        return this.databaseNotifications;
      }
    } catch (error) {
      console.error("Failed to fetch database notifications:", error);
      return [];
    }
  }

  // Add helper methods
  getNotificationTypeFromStatus(status) {
    switch (status) {
      case "Completed":
        return "success";
      case "Failed":
        return "error";
      case "In Progress":
        return "info";
      default:
        return "info";
    }
  }

  getNotificationTitle(status) {
    switch (status) {
      case "Completed":
        return "Transcription Complete!";
      case "Failed":
        return "Transcription Failed";
      case "In Progress":
        return "Transcription Running";
      default:
        return "Notification";
    }
  }

  // Add method to mark notifications as read
  async markNotificationsAsRead() {
    try {
      const BACKEND_URL =
        import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

      const response = await fetch(
        `${BACKEND_URL}/api/notifications/mark-read`,
        {
          method: "POST",
          credentials: "include",
        },
      );

      if (response.ok) {
        // Update local state
        this.databaseNotifications = this.databaseNotifications.map(
          (notif) => ({
            ...notif,
            isRead: true,
          }),
        );

        return true;
      }
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
      return false;
    }
  }

  // Add method to get all notifications (real-time + database)
  async getAllNotifications() {
    const dbNotifications = await this.fetchDatabaseNotifications();

    // You can combine with real-time notifications if needed
    // For now, just return database notifications
    return dbNotifications;
  }

  // Add method to get unread count
  getUnreadCount() {
    return this.databaseNotifications.filter((notif) => !notif.isRead).length;
  }

  // Rest of your existing methods remain the same...
  subscribe(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  emit(notification) {
    this.callbacks.forEach((callback) => {
      try {
        callback(notification);
      } catch (error) {
        console.error("Notification callback error:", error);
      }
    });
  }

  // Add transcription to background monitoring
  addBackgroundTranscription(projectId, transcriptionData, onComplete) {
    this.activeTranscriptions.set(projectId, {
      ...transcriptionData,
      onComplete,
      startTime: Date.now(),
    });

    // Start polling for this transcription
    this.startPolling(projectId);

    // Show initial notification
    this.emit({
      id: `bg-${projectId}`,
      type: "info",
      title: "Transcription Running",
      message: `Your transcription "${transcriptionData.filename}" is processing in the background`,
      duration: 5000,
      projectId,
      clickable: false,
    });
  }

  // Start polling for a specific transcription
  startPolling(projectId) {
    if (this.pollingIntervals.has(projectId)) {
      return; // Already polling
    }

    let pollCount = 0;
    const maxPolls = 120; // 10 minutes max

    const poll = async () => {
      try {
        const BACKEND_URL =
          import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

        // Add better error handling for network issues
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch(
          `${BACKEND_URL}/api/transcription-status-check/${projectId}`,
          {
            credentials: "include",
            signal: controller.signal,
          },
        );

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();

          if (data.status === "Completed") {
            this.handleTranscriptionComplete(projectId, data);
            return;
          } else if (data.status === "Failed") {
            this.handleTranscriptionFailed(projectId, data);
            return;
          }

          // Continue polling
          pollCount++;
          if (pollCount < maxPolls) {
            const delay = Math.min(3000 + pollCount * 200, 10000);
            const nextPollId = setTimeout(poll, delay);
            this.pollingIntervals.set(projectId, nextPollId);
          } else {
            this.handleTranscriptionTimeout(projectId);
          }
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        if (error.name === "AbortError") {
          console.log(`⏱️ Polling timeout for ${projectId}`);
        } else {
          console.error(`Polling error for ${projectId}:`, error);
        }

        pollCount++;
        if (pollCount < maxPolls) {
          const retryDelay = Math.min(
            5000 * Math.pow(2, Math.min(pollCount - 1, 3)),
            30000,
          ); // Exponential backoff
          const retryId = setTimeout(poll, retryDelay);
          this.pollingIntervals.set(projectId, retryId);
        } else {
          this.handleTranscriptionTimeout(projectId);
        }
      }
    };

    // Start polling immediately
    const intervalId = setTimeout(poll, 1000);
    this.pollingIntervals.set(projectId, intervalId);
  }

  // Handle successful transcription completion
  handleTranscriptionComplete(projectId, data) {
    const transcriptionData = this.activeTranscriptions.get(projectId);
    if (!transcriptionData) {
      console.log("No transcription data found for:", projectId);
      return;
    }

    // Clear polling
    this.clearPolling(projectId);

    // Call the completion callback
    if (transcriptionData.onComplete) {
      transcriptionData.onComplete({
        projectId,
        status: "Completed",
        filename: data.filename,
        ...data,
      });
    }

    // Show success notification
    const notification = {
      id: `complete-${projectId}`,
      type: "success",
      title: "Transcription Complete!",
      message: `"${transcriptionData.filename || "Your file"}" has been transcribed successfully`,
      duration: 0, // Persistent
      projectId,
      clickable: true,
      action: {
        label: "View Results",
        onClick: () => this.navigateToResults(projectId),
      },
    };

    this.emit(notification);

    // Clean up
    this.activeTranscriptions.delete(projectId);
  }

  // Handle transcription failure
  handleTranscriptionFailed(projectId, data) {
    console.log(`❌ Background transcription failed: ${projectId}`);

    const transcriptionData = this.activeTranscriptions.get(projectId);
    if (!transcriptionData) return;

    // Clear polling
    this.clearPolling(projectId);

    // Show error notification
    this.emit({
      id: `failed-${projectId}`,
      type: "error",
      title: "Transcription Failed",
      message: `"${transcriptionData.filename}" failed to transcribe: ${data.message || "Unknown error"}`,
      duration: 0, // Persistent
      projectId,
      clickable: false,
    });

    // Clean up
    this.activeTranscriptions.delete(projectId);
  }

  // Handle transcription timeout
  handleTranscriptionTimeout(projectId) {
    console.log(`⏱️ Background transcription timeout: ${projectId}`);

    const transcriptionData = this.activeTranscriptions.get(projectId);
    if (!transcriptionData) return;

    // Clear polling
    this.clearPolling(projectId);

    // Show timeout notification
    this.emit({
      id: `timeout-${projectId}`,
      type: "warning",
      title: "Transcription Timeout",
      message: `"${transcriptionData.filename}" is taking longer than expected. Please check manually.`,
      duration: 0, // Persistent
      projectId,
      clickable: true,
      action: {
        label: "Check Status",
        onClick: () => this.navigateToResults(projectId),
      },
    });

    // Clean up
    this.activeTranscriptions.delete(projectId);
  }

  // Clear polling for a specific transcription
  clearPolling(projectId) {
    const intervalId = this.pollingIntervals.get(projectId);
    if (intervalId) {
      clearTimeout(intervalId);
      this.pollingIntervals.delete(projectId);
    }
  }

  // Navigate to results page
  navigateToResults(projectId) {
    // Store the project ID for the transcription page to pick up
    sessionStorage.setItem("openTranscriptionProject", projectId);

    // Dispatch navigation event
    window.dispatchEvent(
      new CustomEvent("navigateToTranscriptionResults", {
        detail: { projectId },
      }),
    );
  }

  // Stop monitoring a transcription
  stopMonitoring(projectId) {
    this.clearPolling(projectId);
    this.activeTranscriptions.delete(projectId);
  }

  // Get active transcriptions
  getActiveTranscriptions() {
    return Array.from(this.activeTranscriptions.entries()).map(
      ([projectId, data]) => ({
        projectId,
        ...data,
      }),
    );
  }

  // Check if a transcription is being monitored
  isMonitoring(projectId) {
    return this.activeTranscriptions.has(projectId);
  }

  // Clean up all resources
  destroy() {
    // Clear all polling intervals
    this.pollingIntervals.forEach((intervalId) => {
      clearTimeout(intervalId);
    });

    // Clear all data
    this.pollingIntervals.clear();
    this.activeTranscriptions.clear();
    this.callbacks.clear();
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
