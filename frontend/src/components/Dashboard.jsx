import React, { useState } from "react";
import { FileText, Zap, Users, FolderOpen, Mic, Chrome } from "lucide-react";

const Dashboard = ({ onNavigate, isDarkMode, user, onShowLogin }) => {
  const [activeFeature, setActiveFeature] = useState("static");

  const features = [
    {
      id: "static",
      title: "Static Translation",
      icon: FileText,
      description: "Upload and translate subtitle files (SRT, VTT)",
      gradient: {
        light: "from-blue-500 via-blue-600 to-indigo-600",
        dark: "from-blue-600 via-blue-700 to-indigo-800",
      },
      route: "upload",
      requiresAuth: true,
    },
    {
      id: "library",
      title: "Translation Library",
      icon: FolderOpen,
      description: "Browse and manage your translated subtitle files",
      gradient: {
        light: "from-purple-500 via-purple-600 to-violet-600",
        dark: "from-purple-600 via-purple-700 to-violet-800",
      },
      route: "library",
      requiresAuth: false,
    },
    {
      id: "transcription",
      title: "Audio/Video Transcription",
      icon: Mic,
      description: "Generate subtitle files from your audio/video content",
      gradient: {
        light: "from-yellow-500 via-orange-500 to-red-500",
        dark: "from-yellow-600 via-orange-600 to-red-700",
      },
      route: "transcribe",
      requiresAuth: true,
    },
    {
      id: "realtime",
      title: "Chrome Extension",
      icon: Chrome,
      description: "Real-time caption translation for YouTube, Teams & Zoom",
      gradient: {
        light: "from-green-500 via-green-600 to-emerald-600",
        dark: "from-green-600 via-green-700 to-emerald-800",
      },
      route: "realtime",
      requiresAuth: false,
      isSpecial: true,
    },
  ];

  const handleFeatureClick = (feature) => {
    setActiveFeature(feature.id);

    if (feature.requiresAuth && !user) {
      if (onShowLogin) {
        onShowLogin();
      }
      return;
    }

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
        {/* 2x2 Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {features.map((feature) => {
            const IconComponent = feature.icon;

            return (
              <div
                key={feature.id}
                className={`relative rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 transform cursor-pointer hover:shadow-3xl hover:-translate-y-2 bg-gradient-to-r ${
                  isDarkMode ? feature.gradient.dark : feature.gradient.light
                }`}
                onClick={() => handleFeatureClick(feature)}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent transform -skew-x-12"></div>
                </div>

                {/* Special indicator for Chrome Extension */}
                {feature.isSpecial && (
                  <div className="absolute top-4 right-4 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                    <span className="text-white text-xs font-medium">LIVE</span>
                  </div>
                )}

                {/* Auth Required indicator - only show when user is not logged in */}
                {feature.requiresAuth && !user && (
                  <div className="absolute top-4 left-4">
                    <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-full px-2 py-1">
                      <span className="text-white text-xs font-medium">
                        Login Required
                      </span>
                    </div>
                  </div>
                )}

                <div className="relative z-10 p-6 sm:p-8 text-center h-full flex flex-col justify-between min-h-[280px]">
                  <div>
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <IconComponent className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                      </div>
                    </div>

                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-3">
                      {feature.title}
                    </h3>

                    <p className="text-white text-opacity-90 text-base sm:text-lg mb-4 max-w-sm mx-auto leading-relaxed">
                      {feature.description}
                    </p>
                  </div>

                  <div className="flex justify-center items-center">
                    <div className="flex items-center text-white font-semibold text-base sm:text-lg bg-white bg-opacity-20 px-4 py-2 rounded-full backdrop-blur-sm hover:bg-opacity-30 transition-all duration-200">
                      <span>Get Started</span>
                      <svg
                        className="w-4 h-4 sm:w-5 sm:h-5 ml-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </div>
                  </div>
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
