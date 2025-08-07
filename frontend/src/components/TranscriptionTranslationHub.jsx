// TranscriptionTranslationHub.jsx - With orange/red accent colors
import React, { useState } from "react";
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

  const handleTranslateTranscription = (data) => {
    setTranscriptionData(data);
    setActiveMode("translation");
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
        {/* Back button when coming from transcription */}
        {activeMode === "translation" && transcriptionData && (
          <div
            className={`border-b py-2 transition-colors duration-300 ${
              isDarkMode
                ? "bg-orange-900/20 border-orange-800"
                : "bg-orange-50 border-orange-200"
            }`}
          >
            <div className="max-w-4xl mx-auto px-6">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-1 h-6 rounded-full bg-gradient-to-b ${
                    isDarkMode
                      ? "from-yellow-600 via-orange-600 to-red-700"
                      : "from-yellow-500 via-orange-500 to-red-500"
                  }`}
                ></div>
                <div className="flex-1">
                  <button
                    onClick={handleBackToTranscription}
                    className={`flex items-center space-x-2 text-sm font-medium transition-colors duration-300 ${
                      isDarkMode
                        ? "text-orange-400 hover:text-orange-300"
                        : "text-orange-600 hover:text-orange-800"
                    }`}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Transcription</span>
                  </button>
                  <p
                    className={`text-xs mt-1 transition-colors duration-300 ${
                      isDarkMode ? "text-orange-400" : "text-orange-600"
                    }`}
                  >
                    Translating: {transcriptionData?.originalFilename}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

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
