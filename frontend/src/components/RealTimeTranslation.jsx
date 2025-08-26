import React, { useState } from "react";
import {
  Download,
  Chrome,
  Globe,
  Shield,
  Zap,
  Video,
  Users,
  Settings,
  CheckCircle,
  Mail,
  Monitor,
  Package,
  Move,
  Type,
  Eye,
  Filter,
  Palette,
  AlertCircle,
} from "lucide-react";

const ChromeExtensionPage = ({ isDarkMode = false }) => {
  const [activeSection, setActiveSection] = useState("usage");

  const features = [
    { icon: Globe, title: "100+ Languages", color: "bg-blue-500" },
    { icon: Zap, title: "Real-time Translation", color: "bg-green-500" },
    { icon: Shield, title: "Privacy-focused", color: "bg-purple-500" },
    { icon: Package, title: "Free to Use", color: "bg-yellow-500" },
  ];

  const sections = {
    usage: {
      title: "How to Use",
      icon: Zap,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: Video,
              name: "YouTube",
              steps: "Play video → Click extension → Select language",
            },
            {
              icon: Users,
              name: "Teams",
              steps: "Enable captions → Click extension → Choose language",
            },
            {
              icon: Monitor,
              name: "Zoom",
              steps: "Enable captions → Click extension → Start translating",
            },
          ].map((platform, index) => {
            const IconComponent = platform.icon;
            return (
              <div
                key={index}
                className={`border rounded-lg p-4 ${isDarkMode ? "border-gray-600" : "border-gray-200"}`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <IconComponent className="w-5 h-5 text-blue-500" />
                  <h4
                    className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {platform.name}
                  </h4>
                </div>
                <p
                  className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  {platform.steps}
                </p>
              </div>
            );
          })}
        </div>
      ),
    },
    features: {
      title: "Features",
      icon: Settings,
      content: (
        <div className="space-y-6">
          {/* Core Features */}
          <div>
            <h4
              className={`font-medium mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}
            >
              Translation Features
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className={`border rounded-lg p-4 ${isDarkMode ? "border-gray-600" : "border-gray-200"}`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Zap className="w-5 h-5 text-green-500" />
                  <h5
                    className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    Real-time Translation
                  </h5>
                </div>
                <p
                  className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  Instant caption translation across 100+ languages with high
                  accuracy
                </p>
              </div>
              <div
                className={`border rounded-lg p-4 ${isDarkMode ? "border-gray-600" : "border-gray-200"}`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Shield className="w-5 h-5 text-purple-500" />
                  <h5
                    className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    Privacy-focused
                  </h5>
                </div>
                <p
                  className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  Secure processing with no data stored locally or on servers
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Features */}
          <div>
            <h4
              className={`font-medium mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}
            >
              Interactive Controls
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className={`border rounded-lg p-4 ${isDarkMode ? "border-gray-600" : "border-gray-200"}`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Move className="w-5 h-5 text-orange-500" />
                  <h5
                    className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    Drag & Resize
                  </h5>
                </div>
                <p
                  className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  Freely move and resize the caption overlay to your preferred
                  position
                </p>
              </div>
              <div
                className={`border rounded-lg p-4 ${isDarkMode ? "border-gray-600" : "border-gray-200"}`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Type className="w-5 h-5 text-pink-500" />
                  <h5
                    className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    Font Controls
                  </h5>
                </div>
                <p
                  className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  Adjust font size and opacity for optimal readability
                </p>
              </div>
              <div
                className={`border rounded-lg p-4 ${isDarkMode ? "border-gray-600" : "border-gray-200"}`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Filter className="w-5 h-5 text-red-500" />
                  <h5
                    className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    Profanity Filter
                  </h5>
                </div>
                <p
                  className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  Optional content filtering for family-friendly viewing
                </p>
              </div>
              <div
                className={`border rounded-lg p-4 ${isDarkMode ? "border-gray-600" : "border-gray-200"}`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Palette className="w-5 h-5 text-indigo-500" />
                  <h5
                    className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    Theme Switching
                  </h5>
                </div>
                <p
                  className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  Toggle between light and dark themes for better visibility
                </p>
              </div>
            </div>
          </div>

          {/* Usage Tips */}
          <div
            className={`rounded-lg p-4 ${isDarkMode ? "bg-gray-700" : "bg-blue-50"}`}
          >
            <h5
              className={`font-medium mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}
            >
              Pro Tips
            </h5>
            <ul
              className={`text-sm space-y-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
            >
              <li>• Right-click the overlay to access quick settings</li>
              <li>• Use keyboard shortcuts Ctrl+D to toggle drag mode</li>
              <li>• Double-click the overlay to reset position and size</li>
              <li>• Settings are automatically saved for each website</li>
            </ul>
          </div>
        </div>
      ),
    },
    support: {
      title: "Help & Info",
      icon: AlertCircle,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4
              className={`font-medium mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}
            >
              Requirements
            </h4>
            <ul className="space-y-2 text-sm">
              <li
                className={`flex items-center space-x-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
              >
                <Chrome className="w-4 h-4 text-blue-500" />
                <span>Google Chrome (latest)</span>
              </li>
              <li
                className={`flex items-center space-x-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
              >
                <Globe className="w-4 h-4 text-blue-500" />
                <span>Internet connection</span>
              </li>
              <li
                className={`flex items-center space-x-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
              >
                <Eye className="w-4 h-4 text-blue-500" />
                <span>Captions enabled on platform</span>
              </li>
            </ul>
          </div>
          <div>
            <h4
              className={`font-medium mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}
            >
              Troubleshooting
            </h4>
            <ul className="space-y-2 text-sm">
              <li
                className={`${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                • Refresh page if overlay not appearing
              </li>
              <li
                className={`${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                • Check captions are enabled first
              </li>
              <li
                className={`${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                • Verify target language is selected
              </li>
              <li
                className={`${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                • Try repositioning overlay if text cut off
              </li>
            </ul>
          </div>
        </div>
      ),
    },
  };

  const handleAddToChrome = () => {
    window.open(
      "https://chromewebstore.google.com/detail/doegfbeepchjlhiegggbmjbmijegkgll?utm_source=item-share-cb",
      "_blank",
    );
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDarkMode
          ? "bg-gradient-to-br from-gray-900 to-gray-800"
          : "bg-gradient-to-br from-blue-50 to-indigo-100"
      }`}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen flex flex-col items-center justify-center">
        {/* Hero Section - Updated to match dashboard card */}
        <div
          className={`relative rounded-2xl shadow-2xl overflow-hidden mb-8 transition-colors duration-300 ${
            isDarkMode
              ? "bg-gradient-to-r from-green-800 via-green-700 to-emerald-800"
              : "bg-gradient-to-r from-green-500 via-green-600 to-emerald-600"
          }`}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent transform -skew-x-12"></div>
          </div>

          <div className="relative z-10 p-8 text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center backdrop-blur-sm mr-4">
                <Chrome className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1">
                  Chrome Extension
                </h1>
                <p className="text-lg sm:text-xl text-green-100">
                  Real-Time Caption Translation
                </p>
              </div>
            </div>

            {/* Features - Updated to show all 8 features */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {features.map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <div key={index} className="text-center">
                    <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mx-auto mb-2 backdrop-blur-sm">
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-green-100">
                      {feature.title}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Download Button */}
            <button
              onClick={handleAddToChrome}
              className="inline-flex items-center space-x-3 bg-white bg-opacity-20 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-opacity-30 transform hover:-translate-y-1 hover:shadow-xl transition-all duration-200 backdrop-blur-sm"
            >
              <Download className="w-5 h-5" />
              <span>Add to Chrome</span>
              <span className="text-sm opacity-90"></span>
            </button>
          </div>
        </div>

        {/* Tabbed Content */}
        <div
          className={`rounded-xl shadow-lg transition-colors duration-300 ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          }`}
        >
          {/* Tab Navigation */}
          <div
            className={`border-b ${isDarkMode ? "border-gray-600" : "border-gray-200"}`}
          >
            <nav className="flex space-x-8 px-8 pt-6 overflow-x-auto">
              {Object.entries(sections).map(([key, section]) => {
                const IconComponent = section.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveSection(key)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-300 whitespace-nowrap ${
                      activeSection === key
                        ? "border-green-500 text-green-600"
                        : isDarkMode
                          ? "border-transparent text-gray-400 hover:text-gray-300"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{section.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-8">{sections[activeSection].content}</div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center space-x-6 mb-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span
                className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                Secure Azure Storage
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-green-500" />
              <span
                className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                Version 1.0
              </span>
            </div>
          </div>
          <a
            href="mailto:creators.sentinels@outlook.com"
            className="inline-flex items-center space-x-2 text-green-500 hover:text-green-600 transition-colors duration-300"
          >
            <Mail className="w-4 h-4" />
            <span>creators.sentinels@outlook.com</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default ChromeExtensionPage;
