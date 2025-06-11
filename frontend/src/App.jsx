import React, { useState } from "react";
import { Globe, Menu, User } from "lucide-react";

// Import all components
import Dashboard from "./components/Dashboard";
import StaticSubtitleUpload from "./components/StaticSubtitleUpload";
import RealTimeTranslation from "./components/RealTimeTranslation";
import TranslationReview from "./components/TranslationReview";
import Profile from "./components/Profile";

// Main App Component with Template Switcher and Hamburger Menu
const SubtitleTranslatorApp = () => {
  const [currentTemplate, setCurrentTemplate] = useState("dashboard");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const templates = [
    { id: "dashboard", name: "Dashboard", component: Dashboard },
    { id: "upload", name: "Static Upload", component: StaticSubtitleUpload },
    {
      id: "realtime",
      name: "Real-time Translation",
      component: RealTimeTranslation,
    },
    { id: "review", name: "Translation Review", component: TranslationReview },
    { id: "profile", name: "Profile", component: Profile },
  ];

  const handleNavigation = (templateId) => {
    setCurrentTemplate(templateId);
    setIsMenuOpen(false); // Close menu after navigation
  };

  const getCurrentComponent = () => {
    const template = templates.find((t) => t.id === currentTemplate);
    if (!template) return <Dashboard onNavigate={handleNavigation} />;

    const Component = template.component;

    if (currentTemplate === "dashboard") {
      return (
        <Component onNavigate={handleNavigation} isDarkMode={isDarkMode} />
      );
    }

    return <Component />;
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDarkMode ? "bg-gray-900" : "bg-gray-100"
      }`}
    >
      {/* Header with Hamburger Menu */}
      <header
        className={`shadow-sm border-b transition-colors duration-300 relative ${
          isDarkMode
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            {/* Left side - Hamburger + Logo */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Hamburger Menu Button */}
              <button
                onClick={toggleMenu}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? "text-gray-300 hover:text-white hover:bg-gray-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Logo */}
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Globe className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <h1
                className={`text-lg sm:text-xl lg:text-2xl font-bold transition-colors duration-300 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                SubtitleTranslator
              </h1>
            </div>

            {/* Right side - Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode
                  ? "bg-gray-700 text-yellow-400 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              title={
                isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"
              }
            >
              {isDarkMode ? (
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Hamburger Menu Dropdown */}
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setIsMenuOpen(false)}
            ></div>

            {/* Menu Panel */}
            <div
              className={`absolute top-full left-0 right-0 z-50 shadow-lg border-t transition-colors duration-300 ${
                isDarkMode
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4">
                {/* Navigation Section */}
                <div className="mb-6">
                  <h3
                    className={`text-sm font-medium mb-3 ${
                      isDarkMode ? "text-gray-300" : "text-gray-500"
                    }`}
                  >
                    Navigation
                  </h3>
                  <div className="space-y-2">
                    {templates
                      .filter((template) => template.id !== "profile")
                      .map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleNavigation(template.id)}
                          className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                            currentTemplate === template.id
                              ? "bg-blue-500 text-white"
                              : isDarkMode
                                ? "text-gray-300 hover:text-white hover:bg-gray-700"
                                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                          }`}
                        >
                          {template.name}
                        </button>
                      ))}
                  </div>
                </div>

                {/* User Actions Section */}
                <div className="border-t pt-4">
                  <h3
                    className={`text-sm font-medium mb-3 border-t ${
                      isDarkMode
                        ? "text-gray-300 border-gray-700"
                        : "text-gray-500 border-gray-200"
                    }`}
                  >
                    Account
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleNavigation("profile")}
                      className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center space-x-3 ${
                        isDarkMode
                          ? "text-gray-300 hover:text-white hover:bg-gray-700"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                    >
                      <User className="w-5 h-5" />
                      <span>Profile</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Current Template */}
      {getCurrentComponent()}
    </div>
  );
};

export default SubtitleTranslatorApp;
