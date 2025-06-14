import React, { useState } from "react";
import { FileText, Zap, Users, FolderOpen } from "lucide-react";

const Dashboard = ({ onNavigate, isDarkMode }) => {
  const [activeFeature, setActiveFeature] = useState("static");

  const features = [
    {
      id: "static",
      title: "Static Translation",
      icon: FileText,
      description: "Upload and translate subtitle files (SRT, VTT)",
      color: "bg-blue-500",
      route: "upload",
    },
    {
      id: "library",
      title: "Translation Library",
      icon: FolderOpen,
      description: "Browse and manage your translated subtitle files",
      color: "bg-purple-500",
      route: "library",
    },
    {
      id: "realtime",
      title: "Real-time Translation",
      icon: Zap,
      description: "Live subtitle translation during events",
      color: "bg-green-500",
      route: "realtime",
    },
    {
      id: "transcription",
      title: "Post-Event Transcription",
      icon: Users,
      description: "Process and translate meeting transcripts",
      color: "bg-yellow-500",
      route: "review",
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
        </div>

        {/* Feature Cards - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12">
          {features.map((feature) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={feature.id}
                className={`rounded-xl shadow-lg p-4 sm:p-6 cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-1 hover:ring-2 hover:ring-blue-500 transform ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                }`}
                onClick={() => handleFeatureClick(feature)}
              >
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 ${feature.color} rounded-lg flex items-center justify-center mb-3 sm:mb-4`}
                >
                  <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
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
                <div className="flex items-center text-blue-500 text-sm font-medium">
                  <span>Get Started</span>
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
