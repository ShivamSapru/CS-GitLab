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
  Menu,
  User,
} from "lucide-react";

// API Configuration for Static Upload only
const API_BASE_URL = "http://localhost:8000";

const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`,
      );
    }
    return await response.json();
  } catch (error) {
    console.error("API call failed:", error);
    throw error;
  }
};

// Template 2: Static Subtitle Upload Interface
const StaticSubtitleUpload = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [sourceLanguage, setSourceLanguage] = useState("en");
  const [targetLanguages, setTargetLanguages] = useState([]);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedFiles, setTranslatedFiles] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [loadingLanguages, setLoadingLanguages] = useState(true);
  const [error, setError] = useState(null);
  const [backendConnected, setBackendConnected] = useState(false);
  const fileInputRef = useRef(null);

  // Load languages from backend on component mount
  useEffect(() => {
    const loadLanguages = async () => {
      try {
        setLoadingLanguages(true);
        setError(null);

        const languageData = await apiCall("/languages");

        // Convert backend format to frontend format
        const languageArray = Object.entries(languageData).map(
          ([code, name]) => ({
            code,
            name,
          }),
        );

        setLanguages(languageArray);
        setBackendConnected(true);
        setError(null);
      } catch (err) {
        setBackendConnected(false);
        setLanguages([]); // Don't show hardcoded languages
        setError(
          `Backend connection failed: ${err.message}. Please start your FastAPI server on http://localhost:8000`,
        );
        console.error("Failed to load languages:", err);
      } finally {
        setLoadingLanguages(false);
      }
    };

    loadLanguages();
  }, []);

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

    if (!backendConnected) {
      setError("Please connect to the backend first");
      return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".srt") || file.name.endsWith(".vtt")) {
        setUploadedFile(file);
        setError(null);
      } else {
        setError("Please upload a .srt or .vtt file");
      }
    }
  };

  const handleFileInput = (e) => {
    if (!backendConnected) {
      setError("Please connect to the backend first");
      return;
    }

    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      setError(null);
    }
  };

  // Real translation function that calls the backend API
  const startTranslation = async () => {
    if (!backendConnected) {
      setError("Backend not connected. Please start your FastAPI server.");
      return;
    }

    if (!uploadedFile || targetLanguages.length === 0) return;

    setIsTranslating(true);
    setTranslationProgress(0);
    setTranslatedFiles([]);
    setError(null);

    try {
      const totalLanguages = targetLanguages.length;
      const translatedResults = [];

      // Process each target language
      for (let i = 0; i < targetLanguages.length; i++) {
        const targetLang = targetLanguages[i];

        // Create FormData for file upload
        const formData = new FormData();
        formData.append("file", uploadedFile);
        formData.append("source_language", sourceLanguage);
        formData.append("target_language", targetLang);

        try {
          const result = await apiCall("/upload-file", {
            method: "POST",
            body: formData,
          });

          translatedResults.push({
            language: targetLang,
            languageName:
              languages.find((l) => l.code === targetLang)?.name || targetLang,
            filename: result.translated_filename,
            originalFilename: result.original_filename,
          });

          // Update progress
          const progress = ((i + 1) / totalLanguages) * 100;
          setTranslationProgress(progress);
        } catch (err) {
          console.error(`Translation failed for ${targetLang}:`, err);
          setError(`Translation failed for ${targetLang}: ${err.message}`);
        }
      }

      setTranslatedFiles(translatedResults);
    } catch (err) {
      setError(`Translation failed: ${err.message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  // Download translated file from backend
  const downloadFile = async (filename) => {
    if (!backendConnected) {
      setError("Backend not connected. Cannot download files.");
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/download-subtitle?filename=${encodeURIComponent(filename)}`,
      );

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Download failed: ${err.message}`);
    }
  };

  const resetComponent = () => {
    setUploadedFile(null);
    setTranslationProgress(0);
    setTranslatedFiles([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Retry connection to backend
  const retryConnection = async () => {
    setLoadingLanguages(true);
    setError(null);

    try {
      const languageData = await apiCall("/languages");
      const languageArray = Object.entries(languageData).map(
        ([code, name]) => ({
          code,
          name,
        }),
      );

      setLanguages(languageArray);
      setBackendConnected(true);
      setError(null);
    } catch (err) {
      setBackendConnected(false);
      setLanguages([]);
      setError(
        `Backend connection failed: ${err.message}. Please start your FastAPI server on http://localhost:8000`,
      );
    } finally {
      setLoadingLanguages(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Static Subtitle Translation
        </h2>

        {/* Backend Connection Status */}
        <div
          className={`mb-6 p-4 rounded-lg ${
            backendConnected
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div
                className={`w-3 h-3 rounded-full mr-3 ${
                  backendConnected ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              <span
                className={`font-medium ${
                  backendConnected ? "text-green-800" : "text-red-800"
                }`}
              >
                Backend Status:{" "}
                {backendConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            {!backendConnected && (
              <button
                onClick={retryConnection}
                disabled={loadingLanguages}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 text-sm"
              >
                {loadingLanguages ? "Connecting..." : "Retry Connection"}
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <X className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Show message when backend is not connected */}
        {!backendConnected && !loadingLanguages && (
          <div className="mb-6 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-lg font-medium text-yellow-800 mb-2">
              Backend Required
            </h3>
            <p className="text-yellow-700 mb-4">
              This feature requires a connection to the FastAPI backend server.
              Please:
            </p>
            <ol className="list-decimal list-inside text-yellow-700 space-y-1 mb-4">
              <li>
                Start your FastAPI server:{" "}
                <code className="bg-yellow-100 px-2 py-1 rounded">
                  uvicorn main:app --reload --port 8000
                </code>
              </li>
              <li>Ensure CORS is enabled in your backend</li>
              <li>Click "Retry Connection" above</li>
            </ol>
          </div>
        )}

        {/* File Upload Area - disabled when backend not connected */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            !backendConnected
              ? "border-gray-200 bg-gray-50 cursor-not-allowed"
              : dragActive
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
          }`}
          onDragEnter={backendConnected ? handleDrag : undefined}
          onDragLeave={backendConnected ? handleDrag : undefined}
          onDragOver={backendConnected ? handleDrag : undefined}
          onDrop={backendConnected ? handleDrop : undefined}
        >
          <Upload
            className={`w-12 h-12 mx-auto mb-4 ${
              backendConnected ? "text-gray-400" : "text-gray-300"
            }`}
          />
          <p
            className={`text-lg mb-2 px-4 ${
              backendConnected ? "text-gray-600" : "text-gray-400"
            }`}
          >
            {uploadedFile ? (
              <span
                className="break-all max-w-full inline-block"
                title={uploadedFile.name}
              >
                {uploadedFile.name}
              </span>
            ) : (
              "Drop your subtitle files here"
            )}
          </p>
          <p
            className={`text-sm mb-4 ${
              backendConnected ? "text-gray-400" : "text-gray-300"
            }`}
          >
            Supports SRT, VTT formats
          </p>
          <button
            onClick={() => backendConnected && fileInputRef.current?.click()}
            disabled={!backendConnected}
            className={`px-6 py-2 rounded-lg transition-colors ${
              backendConnected
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Browse Files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".srt,.vtt"
            onChange={handleFileInput}
            disabled={!backendConnected}
          />
        </div>

        {/* Language Selection - only show when backend connected */}
        {uploadedFile && backendConnected && (
          <div className="mt-8 space-y-6">
            {/* Source Language */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Source Language
              </h3>
              <select
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loadingLanguages || !backendConnected}
              >
                {loadingLanguages ? (
                  <option>Loading languages...</option>
                ) : (
                  languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Target Languages */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Select Target Languages
              </h3>
              {loadingLanguages ? (
                <p className="text-gray-500">Loading languages...</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {languages
                    .filter((lang) => lang.code !== sourceLanguage)
                    .map((lang) => (
                      <label
                        key={lang.code}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={targetLanguages.includes(lang.code)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTargetLanguages([
                                ...targetLanguages,
                                lang.code,
                              ]);
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
              )}
            </div>
          </div>
        )}

        {/* Translation Progress */}
        {isTranslating && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Translating...</span>
              <span className="text-sm text-gray-600">
                {Math.round(translationProgress)}%
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
          <button
            onClick={resetComponent}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>

          {uploadedFile &&
            !isTranslating &&
            translatedFiles.length === 0 &&
            backendConnected && (
              <button
                onClick={startTranslation}
                disabled={
                  targetLanguages.length === 0 ||
                  loadingLanguages ||
                  !backendConnected
                }
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Start Translation
              </button>
            )}
        </div>

        {/* Download Results */}
        {translatedFiles.length > 0 && (
          <div className="mt-8 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center mb-3">
              <Check className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-green-800 font-medium">
                Translation Complete!
              </span>
            </div>
            <div className="space-y-2">
              {translatedFiles.map((file) => (
                <div
                  key={file.language}
                  className="flex items-center justify-between bg-white p-3 rounded-lg"
                >
                  <span
                    className="text-gray-700 break-all pr-4 flex-1 min-w-0"
                    title={`${file.filename} (${file.languageName})`}
                  >
                    <span className="block sm:inline">{file.filename}</span>
                    <span className="text-gray-500 block sm:inline sm:ml-2">
                      ({file.languageName})
                    </span>
                  </span>
                  <button
                    onClick={() => downloadFile(file.filename)}
                    className="text-blue-500 hover:text-blue-700 flex items-center space-x-1"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                </div>
              ))}
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
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-lg mb-6">
        ⚠️ <strong>Real-time Translation is coming soon.</strong> This feature
        is under development.
      </div>

      {/* Placeholder for future real-time translation UI */}
      <div className="text-gray-500 text-center italic mt-8">
        The real-time translation interface will appear here once available.
      </div>
    </div>
  );
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
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-lg mb-6">
        🛠️ <strong>Translation Review is coming soon.</strong> This feature is
        currently under development.
      </div>

      {/* Placeholder UI for future review tools */}
      <div className="text-gray-500 text-center italic mt-8">
        Subtitle review and editing tools will appear here.
      </div>
    </div>
  );
};

// Profile Component
const Profile = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-lg mb-6">
        ⚠️ <strong>Profile management is coming soon.</strong> This feature is
        under development.
      </div>

      {/* Placeholder for future profile interface */}
      <div className="text-gray-500 text-center italic mt-8">
        Profile settings and management tools will appear here once available.
      </div>
    </div>
  );
};

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
      {/* Header  with Hamburger Menu */}
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

// Updated Dashboard Component with better responsive design
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

        {/* Quick Start Button - Responsive */}
        <div className="text-center">
          <button
            onClick={() => onNavigate && onNavigate("upload")}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubtitleTranslatorApp;
