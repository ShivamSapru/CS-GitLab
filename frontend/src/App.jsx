import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Play,
  Pause,
  Download,
  Settings,
  Globe,
  Users,
  FileText,
  Zap,
  Check,
  X,
  Edit3,
  Save,
} from "lucide-react";

// Template 1: Main Dashboard/Landing Page
const Dashboard = ({ onNavigate, isDarkMode }) => {
  const [activeFeature, setActiveFeature] = useState("static");

  const features = [
    {
      id: "static",
      title: "Static Subtitle Translation",
      icon: FileText,
      description: "Upload and translate subtitle files (SRT, VTT)",
      color: "bg-blue-500",
      route: "upload", // Maps to your template IDs
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
      color: "bg-purple-500",
      route: "review", // Maps to review template
    },
  ];

  const handleFeatureClick = (feature) => {
    setActiveFeature(feature.id);
    // Navigate to the respective page
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
      {/* Header */}
      <header
        className={`shadow-sm border-b transition-colors duration-300 ${
          isDarkMode
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <h1
                className={`text-2xl font-bold transition-colors duration-300 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                SubtitleTranslator
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-gray-600 hover:text-gray-900">
                <Settings className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2
            className={`text-4xl font-bold mb-4 transition-colors duration-300 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Break Language Barriers with AI-Powered Subtitles
          </h2>
          <p
            className={`text-xl max-w-3xl mx-auto transition-colors duration-300 ${
              isDarkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Translate subtitles in real-time or process static files. Make your
            content accessible to global audiences.
          </p>
        </div>

        {/* Feature Cards - Now clickable with navigation */}

        {/* Feature Cards - Now clickable with navigation */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {features.map((feature) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={feature.id}
                className={`rounded-xl shadow-lg p-6 cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-1 hover:ring-2 hover:ring-blue-500 transform ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                }`}
                onClick={() => handleFeatureClick(feature)}
              >
                <div
                  className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center mb-4`}
                >
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
                <h3
                  className={`text-xl font-semibold mb-2 transition-colors duration-300 ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {feature.title}
                </h3>
                <p
                  className={`mb-4 transition-colors duration-300 ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  {feature.description}
                </p>
                <div className="flex items-center text-blue-500 text-sm font-medium">
                  <span>Get Started</span>
                  <svg
                    className="w-4 h-4 ml-1"
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

        {/* Quick Start Button */}
        <div className="text-center">
          <button
            onClick={() => onNavigate && onNavigate("upload")}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

// Template 2: Static Subtitle Upload Interface
const StaticSubtitleUpload = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [targetLanguages, setTargetLanguages] = useState(["es", "fr"]);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);
  const fileInputRef = useRef(null);

  const languages = [
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "zh", name: "Chinese" },
    { code: "ja", name: "Japanese" },
    { code: "ar", name: "Arabic" },
  ];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const simulateTranslation = () => {
    setIsTranslating(true);
    setTranslationProgress(0);

    const interval = setInterval(() => {
      setTranslationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsTranslating(false);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Static Subtitle Translation
        </h2>

        {/* File Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg text-gray-600 mb-2">
            {uploadedFile ? uploadedFile.name : "Drop your subtitle files here"}
          </p>
          <p className="text-sm text-gray-400 mb-4">
            Supports SRT, VTT formats
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Browse Files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".srt,.vtt"
            onChange={(e) => setUploadedFile(e.target.files[0])}
          />
        </div>

        {/* Language Selection */}
        {uploadedFile && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Select Target Languages
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {languages.map((lang) => (
                <label
                  key={lang.code}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={targetLanguages.includes(lang.code)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTargetLanguages([...targetLanguages, lang.code]);
                      } else {
                        setTargetLanguages(
                          targetLanguages.filter((l) => l !== lang.code),
                        );
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-gray-700">{lang.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Translation Progress */}
        {isTranslating && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Translating...</span>
              <span className="text-sm text-gray-600">
                {translationProgress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${translationProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex justify-between items-center">
          {/* Download Button - Always visible */}
          <button
            disabled={!uploadedFile}
            className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              uploadedFile
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            onClick={() => {
              if (uploadedFile) {
                // Create a download link for the original file
                const url = URL.createObjectURL(uploadedFile);
                const a = document.createElement("a");
                a.href = url;
                a.download = uploadedFile.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }
            }}
          >
            <Download className="w-4 h-4" />
            <span>Download Original</span>
          </button>

          {/* Translation Controls - Only show when file is uploaded */}
          {uploadedFile && !isTranslating && translationProgress === 0 && (
            <div className="flex space-x-4">
              <button
                onClick={() => setUploadedFile(null)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={simulateTranslation}
                disabled={targetLanguages.length === 0}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Start Translation
              </button>
            </div>
          )}
        </div>

        {/* Download Results */}
        {translationProgress === 100 && (
          <div className="mt-8 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center mb-3">
              <Check className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-green-800 font-medium">
                Translation Complete!
              </span>
            </div>
            <div className="space-y-2">
              {targetLanguages.map((langCode) => {
                const lang = languages.find((l) => l.code === langCode);
                return (
                  <div
                    key={langCode}
                    className="flex items-center justify-between bg-white p-3 rounded-lg"
                  >
                    <span className="text-gray-700">
                      {uploadedFile.name} - {lang.name}
                    </span>
                    <button className="text-blue-500 hover:text-blue-700 flex items-center space-x-1">
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Template 3: Real-time Translation Interface
const RealTimeTranslation = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState(["es", "fr"]);
  const [subtitles, setSubtitles] = useState([
    {
      id: 1,
      original: "Welcome to our presentation today",
      translations: {
        es: "Bienvenidos a nuestra presentación de hoy",
        fr: "Bienvenue à notre présentation aujourd'hui",
      },
      timestamp: "00:01",
    },
    {
      id: 2,
      original: "We will be discussing the future of technology",
      translations: {
        es: "Estaremos discutiendo el futuro de la tecnología",
        fr: "Nous discuterons de l'avenir de la technologie",
      },
      timestamp: "00:05",
    },
  ]);

  const languages = [
    { code: "es", name: "Spanish", flag: "🇪🇸" },
    { code: "fr", name: "French", flag: "🇫🇷" },
    { code: "de", name: "German", flag: "🇩🇪" },
    { code: "zh", name: "Chinese", flag: "🇨🇳" },
  ];

  const toggleConnection = () => {
    setIsConnected(!isConnected);
    if (!isConnected) {
      // Simulate connecting to live stream
      setTimeout(() => setIsLive(true), 1000);
    } else {
      setIsLive(false);
    }
  };
};

// Template 4: Translation Review & Edit Interface
const TranslationReview = () => {
  const [subtitles, setSubtitles] = useState([
    {
      id: 1,
      timestamp: "00:00:01,000 --> 00:00:04,000",
      original: "Welcome to our presentation today",
      translation: "Bienvenidos a nuestra presentación de hoy",
      isEditing: false,
      confidence: 95,
    },
    {
      id: 2,
      timestamp: "00:00:05,000 --> 00:00:08,000",
      original: "We will discuss the future of technology",
      translation: "Discutiremos el futuro de la tecnología",
      isEditing: false,
      confidence: 88,
    },
    {
      id: 3,
      timestamp: "00:00:09,000 --> 00:00:12,000",
      original: "This is an important topic for everyone",
      translation: "Este es un tema importante para todos",
      isEditing: false,
      confidence: 92,
    },
  ]);

  const [currentLanguage, setCurrentLanguage] = useState("es");

  const toggleEdit = (id) => {
    setSubtitles(
      subtitles.map((sub) =>
        sub.id === id ? { ...sub, isEditing: !sub.isEditing } : sub,
      ),
    );
  };

  const updateTranslation = (id, newTranslation) => {
    setSubtitles(
      subtitles.map((sub) =>
        sub.id === id
          ? { ...sub, translation: newTranslation, isEditing: false }
          : sub,
      ),
    );
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return "text-green-600 bg-green-100";
    if (confidence >= 75) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };
};

// Main App Component with Template Switcher
const SubtitleTranslatorApp = () => {
  const [currentTemplate, setCurrentTemplate] = useState("dashboard");

  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
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
  ];

  const handleNavigation = (templateId) => {
    setCurrentTemplate(templateId);
  };

  const getCurrentComponent = () => {
    const template = templates.find((t) => t.id === currentTemplate);
    if (!template) return <Dashboard onNavigate={handleNavigation} />;

    const Component = template.component;

    // Pass navigation prop only to Dashboard
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
      {/* Template Switcher */}
      {/* Template Switcher */}
      <div
        className={`shadow-sm border-b transition-colors duration-300 ${
          isDarkMode
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex space-x-8">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setCurrentTemplate(template.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
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
            {/* Dark Mode Toggle */}
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
                  className="w-5 h-5"
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
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Current Template */}
      {getCurrentComponent()}
    </div>
  );
};

export default SubtitleTranslatorApp;
