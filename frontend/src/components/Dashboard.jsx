import React, { useState } from "react";
import { FileText, Zap, Users, FolderOpen, Mic, Lock } from "lucide-react";

const Dashboard = ({ onNavigate, isDarkMode, user, onShowLogin }) => {
  const [activeFeature, setActiveFeature] = useState("static");

  const features = [
    {
      id: "static",
      title: "Static Translation",
      icon: FileText,
      description: "Upload and translate subtitle files (SRT, VTT)",
      color: "bg-blue-500",
      route: "upload",
      requiresAuth: true,
    },
    {
      id: "library",
      title: "Translation Library",
      icon: FolderOpen,
      description: "Browse and manage your translated subtitle files",
      color: "bg-purple-500",
      route: "library",
      requiresAuth: true,
    },
    {
      id: "transcription",
      title: "Audio/Video Transcription",
      icon: Mic,
      description: "Generate subtitle files from your audio/video content",
      color: "bg-yellow-500",
      route: "review",
      requiresAuth: true,
    },
    {
      id: "realtime",
      title: "Real-time Translation",
      icon: Zap,
      description: "Live subtitle translation during events",
      color: "bg-green-500",
      route: "realtime",
      requiresAuth: true,
    },
  ];

  const handleFeatureClick = (feature) => {
    setActiveFeature(feature.id);
    if (onNavigate) {
      onNavigate(feature.route);
    }
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDarkMode
          ? "bg-gradient-to-br from-gray-900 to-gray-800"
          : "bg-gradient-to-br from-blue-50 to-indigo-100"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Hero Section - Responsive */}
        <div className="text-center mb-8 sm:mb-12">
          <h2
            className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 transition-colors duration-300 leading-tight ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Break Language Barriers with AI-Powered Subtitles
          </h2>
          <p
            className={`text-base sm:text-lg lg:text-xl max-w-3xl mx-auto transition-colors duration-300 px-4 ${
              isDarkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Translate subtitles in real-time or process static files. Make your
            content accessible to global audiences.
          </p>

          {/* Login prompt for non-authenticated users */}
          {!user && (
            <div
              className={`mt-6 p-4 rounded-lg border ${
                isDarkMode
                  ? "bg-gray-800 border-gray-700 text-gray-300"
                  : "bg-white border-gray-200 text-gray-600"
              }`}
            >
              <p className="text-sm">
                <Lock className="w-4 h-4 inline mr-1" />
                Please{" "}
                <button
                  onClick={() => {
                    console.log(
                      "Dashboard log in button clicked, onShowLogin:",
                      onShowLogin,
                    );
                    if (onShowLogin) {
                      onShowLogin();
                    }
                  }}
                  className="text-blue-600 hover:text-blue-700 underline hover:no-underline font-medium bg-transparent border-none cursor-pointer p-0"
                >
                  Log in
                </button>{" "}
                to access all features and manage your translations
              </p>
            </div>
          )}
        </div>

        {/* Feature Cards - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12">
          {features.map((feature) => {
            const IconComponent = feature.icon;
            const isDisabled = feature.requiresAuth && !user;

            return (
              <div
                key={feature.id}
                className={`rounded-xl shadow-lg p-4 sm:p-6 transition-all duration-200 transform ${
                  isDisabled
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:ring-2 hover:ring-blue-500"
                } ${isDarkMode ? "bg-gray-800" : "bg-white"}`}
                onClick={() => !isDisabled && handleFeatureClick(feature)}
              >
                <div className="relative">
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 ${
                      isDisabled ? "bg-gray-400" : feature.color
                    } rounded-lg flex items-center justify-center mb-3 sm:mb-4`}
                  >
                    <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>

                  {/* Lock icon overlay for disabled features */}
                  {isDisabled && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
                      <Lock className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>

                <h3
                  className={`text-lg sm:text-xl font-semibold mb-2 transition-colors duration-300 ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {feature.title}
                </h3>

                <p
                  className={`mb-3 sm:mb-4 text-sm sm:text-base transition-colors duration-300 ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  {feature.description}
                </p>

                <div
                  className={`flex items-center text-sm font-medium ${
                    isDisabled ? "text-gray-400" : "text-blue-500"
                  }`}
                >
                  <span>{isDisabled ? "Login Required" : "Get Started"}</span>
                  {!isDisabled && (
                    <svg
                      className="w-3 h-3 sm:w-4 sm:h-4 ml-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
