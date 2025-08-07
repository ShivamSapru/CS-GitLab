// Create: src/components/TranscriptionDebugger.jsx
// TEMPORARY - Remove after debugging

import React, { useState, useEffect } from "react";
import notificationService from "../services/notificationService";

const TranscriptionDebugger = ({ isDarkMode }) => {
  const [sessionData, setSessionData] = useState(null);
  const [activeTranscriptions, setActiveTranscriptions] = useState([]);
  const [debugLogs, setDebugLogs] = useState([]);

  useEffect(() => {
    // Check sessionStorage
    const savedState = sessionStorage.getItem("transcriptionState");
    if (savedState) {
      try {
        setSessionData(JSON.parse(savedState));
      } catch (e) {
        console.error("Failed to parse session data:", e);
      }
    }

    // Check active transcriptions in notification service
    setActiveTranscriptions(notificationService.getActiveTranscriptions());

    // Subscribe to notification service for debugging
    const unsubscribe = notificationService.subscribe((notification) => {
      const timestamp = new Date().toLocaleTimeString();
      setDebugLogs((prev) => [
        ...prev.slice(-9),
        `${timestamp}: ${notification.type} - ${notification.title}`,
      ]);
    });

    return unsubscribe;
  }, []);

  const testNotification = () => {
    console.log("🧪 Testing notification...");
    notificationService.emit({
      id: `test-${Date.now()}`,
      type: "success",
      title: "Test Notification",
      message: "This is a test notification",
      duration: 5000,
      clickable: false,
    });
  };

  const checkBackendStatus = async () => {
    if (sessionData?.projectId) {
      try {
        const BACKEND_URL =
          import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
        const response = await fetch(
          `${BACKEND_URL}/api/transcription-status-check/${sessionData.projectId}`,
          { credentials: "include" },
        );
        const data = await response.json();
        console.log("🔍 Backend status check:", data);
        alert(
          `Backend Status: ${data.status}\nMessage: ${data.message || "No message"}`,
        );
      } catch (error) {
        console.error("Backend check failed:", error);
        alert(`Backend check failed: ${error.message}`);
      }
    } else {
      alert("No project ID found in session");
    }
  };

  const clearSession = () => {
    sessionStorage.removeItem("transcriptionState");
    setSessionData(null);
    console.log("🧹 Cleared session storage");
  };

  return (
    <div
      className={`fixed bottom-4 left-4 p-4 rounded-lg shadow-lg max-w-md z-50 ${
        isDarkMode
          ? "bg-gray-800 text-white border border-gray-600"
          : "bg-white text-gray-900 border border-gray-300"
      }`}
      style={{ fontSize: "12px" }}
    >
      <h4 className="font-bold mb-2">🐛 Transcription Debug</h4>

      <div className="space-y-2">
        <div>
          <strong>Session Data:</strong>
          <pre className="text-xs overflow-auto max-h-20">
            {sessionData ? JSON.stringify(sessionData, null, 2) : "None"}
          </pre>
        </div>

        <div>
          <strong>Active Background:</strong> {activeTranscriptions.length}{" "}
          transcriptions
          {activeTranscriptions.map((t) => (
            <div key={t.projectId} className="text-xs">
              • {t.filename} ({t.projectId.slice(0, 8)})
            </div>
          ))}
        </div>

        <div>
          <strong>Recent Notifications:</strong>
          <div className="max-h-20 overflow-auto">
            {debugLogs.map((log, i) => (
              <div key={i} className="text-xs">
                {log}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-1 flex-wrap">
          <button
            onClick={testNotification}
            className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
          >
            Test Notification
          </button>
          <button
            onClick={checkBackendStatus}
            className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
          >
            Check Backend
          </button>
          <button
            onClick={clearSession}
            className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
          >
            Clear Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default TranscriptionDebugger;
