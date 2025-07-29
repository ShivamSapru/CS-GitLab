// TranscriptionTranslationHub.jsx - Fixed version with dark mode
import React, { useState } from "react";
import TranslationReview from "./TranslationReview";
import StaticSubtitleUpload from "./StaticSubtitleUpload";
import { ArrowLeft, FileText, Languages } from "lucide-react";

const TranscriptionTranslationHub = ({ isDarkMode }) => {
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
                    ? "border-blue-500 text-blue-600"
                    : isDarkMode
                      ? "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>Audio/Video Transcription</span>
                </div>
              </button>
              <button
                onClick={() => handleSwitchMode("translation")}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors duration-300 ${
                  activeMode === "translation"
                    ? "border-blue-500 text-blue-600"
                    : isDarkMode
                      ? "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center space-x-2">
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
                ? "bg-blue-900/20 border-blue-800"
                : "bg-blue-50 border-blue-200"
            }`}
          >
            <div className="max-w-4xl mx-auto px-6">
              <button
                onClick={handleBackToTranscription}
                className={`flex items-center space-x-2 text-sm font-medium transition-colors duration-300 ${
                  isDarkMode
                    ? "text-blue-400 hover:text-blue-300"
                    : "text-blue-600 hover:text-blue-800"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Transcription</span>
              </button>
              <p
                className={`text-xs mt-1 transition-colors duration-300 ${
                  isDarkMode ? "text-blue-400" : "text-blue-600"
                }`}
              >
                Translating: {transcriptionData?.originalFilename}
              </p>
            </div>
          </div>
        )}

        {/* Component Content */}
        {activeMode === "transcription" ? (
          <TranslationReview
            onTranslateTranscription={handleTranslateTranscription}
            isDarkMode={isDarkMode}
          />
        ) : (
          <StaticSubtitleUpload
            initialTranscriptionData={transcriptionData}
            onBackToTranscription={handleBackToTranscription}
            isDarkMode={isDarkMode}
          />
        )}
      </div>
    </div>
  );
};

export default TranscriptionTranslationHub;
