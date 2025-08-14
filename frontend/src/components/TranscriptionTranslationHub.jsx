import React, { useState, useEffect } from "react";
import TranslationReview from "./TranslationReview";
import StaticSubtitleUpload from "./StaticSubtitleUpload";
import { ArrowLeft, FileText, Languages } from "lucide-react";

const TranscriptionTranslationHub = ({
  isDarkMode,
  onNavigateAway,
  transcriptionResults,
}) => {
  const [activeMode, setActiveMode] = useState("transcription");
  const [transcriptionData, setTranscriptionData] = useState(null);

  const handleTranslateTranscription = async (data) => {
    try {
      let fileContent = data.content;

      // If content is empty or not provided, try to fetch from backend
      if (!fileContent) {
        console.log(" Fetching transcription content...");
        const BACKEND_URL =
          import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

        try {
          // First try direct Azure URL if available
          if (data.subtitle_file_url) {
            console.log(" Trying direct Azure URL");
            const azureResponse = await fetch(data.subtitle_file_url);
            if (azureResponse.ok) {
              fileContent = await azureResponse.text();
              console.log(" Successfully fetched content from Azure");
            }
          }

          // Fallback to backend endpoint (it will find the user's file automatically)
          if (!fileContent) {
            console.log(" Trying backend endpoint");
            const response = await fetch(
              `${BACKEND_URL}/api/download-transcription?filename=any`,
              { credentials: "include" },
            );

            if (response.ok) {
              fileContent = await response.text();
              console.log(" Successfully fetched content from backend");
            } else {
              throw new Error(`Failed to fetch file: ${response.status}`);
            }
          }
        } catch (fetchError) {
          console.error("❌ Failed to fetch content:", fetchError);
          throw new Error(
            `Could not load transcription content: ${fetchError.message}`,
          );
        }
      }

      // Ensure we have content
      if (!fileContent) {
        throw new Error("No transcription content available");
      }

      // Clean the filename - extract just the filename part from any URL
      let cleanFilename = data.filename;
      if (cleanFilename && cleanFilename.includes("http")) {
        // Extract filename from URL - everything after the last slash, before any query params
        const urlParts = cleanFilename.split("/");
        const lastPart = urlParts[urlParts.length - 1];
        cleanFilename = lastPart.split("?")[0]; // Remove query parameters
      }

      // Fallback to a reasonable filename
      if (
        !cleanFilename ||
        cleanFilename.includes("http") ||
        cleanFilename.length > 100
      ) {
        const now = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "");
        cleanFilename = `transcription_${now}.${data.format || "srt"}`;
      }

      // Clean the original filename too
      let cleanOriginalFilename = data.originalFilename;
      if (cleanOriginalFilename && cleanOriginalFilename.length > 100) {
        // Truncate long filenames
        const ext = cleanOriginalFilename.split(".").pop();
        cleanOriginalFilename =
          cleanOriginalFilename.substring(0, 90) + "..." + ext;
      }

      // Create proper transcription data with actual content and clean filenames
      const processedData = {
        ...data,
        content: fileContent,
        filename: cleanFilename,
        originalFilename: cleanOriginalFilename || "original_file",
        format: (data.format || "srt").toLowerCase().replace(/[^a-z]/g, ""), // Clean format
        // Remove any blob URLs to prevent confusion
        subtitle_file_url: undefined,
      };

      setTranscriptionData(processedData);
      setActiveMode("translation");
    } catch (error) {
      console.error(
        "❌ Error processing transcription for translation:",
        error,
      );
      alert(`Failed to load transcription for translation: ${error.message}`);
    }
  };

  const handleBackToTranscription = () => {
    setActiveMode("transcription");
    setTranscriptionData(null);
  };

  const handleSwitchMode = (mode) => {
    if (mode === "transcription") {
      setTranscriptionData(null);
    }
    setActiveMode(mode);
  };
  useEffect(() => {
    // Clear transcription data when switching modes or navigating away
    const handleNavigation = () => {
      setTranscriptionData(null);
    };

    // Listen for page visibility changes (tab switches, etc.)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Page became visible again, clear any stale data

        setTranscriptionData(null);
      }
    };

    // Listen for browser navigation events
    const handleBeforeUnload = () => {
      setTranscriptionData(null);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDarkMode ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      {/* Tab Navigation - Only show if transcription data exists */}
      {transcriptionData && (
        <div
          className={`shadow-sm border-b transition-colors duration-300 ${
            isDarkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          }`}
        >
          <div className="max-w-4xl mx-auto">
            <div className="flex space-x-8 px-6">
              <button
                onClick={() => handleSwitchMode("transcription")}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors duration-300 ${
                  activeMode === "transcription"
                    ? isDarkMode
                      ? "border-orange-500 text-orange-400"
                      : "border-orange-500 text-orange-600"
                    : isDarkMode
                      ? "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-2 h-2 rounded-full mr-1 ${
                      activeMode === "transcription"
                        ? isDarkMode
                          ? "bg-gradient-to-r from-yellow-600 via-orange-600 to-red-700"
                          : "bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500"
                        : "bg-transparent"
                    }`}
                  ></div>
                  <FileText className="w-4 h-4" />
                  <span>Audio/Video Transcription</span>
                </div>
              </button>
              <button
                onClick={() => handleSwitchMode("translation")}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors duration-300 ${
                  activeMode === "translation"
                    ? isDarkMode
                      ? "border-orange-500 text-orange-400"
                      : "border-orange-500 text-orange-600"
                    : isDarkMode
                      ? "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-2 h-2 rounded-full mr-1 ${
                      activeMode === "translation"
                        ? isDarkMode
                          ? "bg-gradient-to-r from-yellow-600 via-orange-600 to-red-700"
                          : "bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500"
                        : "bg-transparent"
                    }`}
                  ></div>
                  <Languages className="w-4 h-4" />
                  <span>Subtitle Translation</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="relative">
        {/* Component Content */}
        {activeMode === "transcription" ? (
          <TranslationReview
            onTranslateTranscription={handleTranslateTranscription}
            onNavigateAway={onNavigateAway}
            isDarkMode={isDarkMode}
            transcriptionResults={transcriptionResults}
            accentColors={{
              light: "from-yellow-500 via-orange-500 to-red-500",
              dark: "from-yellow-600 via-orange-600 to-red-700",
              primary: isDarkMode ? "orange-400" : "orange-600",
              primaryHover: isDarkMode ? "orange-300" : "orange-800",
              ring: "orange-500",
              border: "orange-500",
            }}
          />
        ) : (
          <StaticSubtitleUpload
            initialTranscriptionData={transcriptionData}
            onBackToTranscription={handleBackToTranscription}
            isDarkMode={isDarkMode}
            accentColors={{
              light: "from-yellow-500 via-orange-500 to-red-500",
              dark: "from-yellow-600 via-orange-600 to-red-700",
              primary: isDarkMode ? "orange-400" : "orange-600",
              primaryHover: isDarkMode ? "orange-300" : "orange-800",
              ring: "orange-500",
              border: "orange-500",
            }}
          />
        )}
      </div>
    </div>
  );
};

export default TranscriptionTranslationHub;
