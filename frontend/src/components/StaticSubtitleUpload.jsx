import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Download,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  Archive,
  Eye,
} from "lucide-react";

// API Configuration for Static Upload only
const API_BASE_URL = "http://localhost:8000/api";
const MAX_SELECTED_LANGUAGES = 5;

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

// Multi-select dropdown component
const MultiSelectDropdown = ({
  languages,
  selectedLanguages,
  onSelectionChange,
  disabled,
  searchTerm,
  onSearchChange,
  maxLanguages,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLanguageToggle = (languageCode) => {
    if (selectedLanguages.includes(languageCode)) {
      // Remove language (always allowed)
      const newSelection = selectedLanguages.filter(
        (code) => code !== languageCode,
      );
      onSelectionChange(newSelection);
    } else {
      // Add language (only if under limit)
      if (selectedLanguages.length < MAX_SELECTED_LANGUAGES) {
        const newSelection = [...selectedLanguages, languageCode];
        onSelectionChange(newSelection);
      }
      // Don't add if at limit - could show a message here if needed
    }
    onSearchChange(""); // Clear search after selection
    setIsOpen(false); // Close dropdown after selection
  };

  const removeLanguage = (languageCode) => {
    onSelectionChange(
      selectedLanguages.filter((code) => code !== languageCode),
    );
  };

  const getSelectedLanguageNames = () => {
    return selectedLanguages.map(
      (code) => languages.find((lang) => lang.code === code)?.name || code,
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected languages display */}
      <div className="mb-2 flex flex-wrap gap-2">
        {selectedLanguages.map((code) => {
          const language = languages.find((lang) => lang.code === code);
          return (
            <span
              key={code}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
            >
              {language?.name || code}
              <button
                onClick={() => removeLanguage(code)}
                className="ml-2 text-blue-600 hover:text-blue-800"
                disabled={disabled}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
      </div>

      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => !disabled && setIsOpen(true)}
          placeholder={
            selectedLanguages.length === 0
              ? "Select or type to search languages..."
              : `${selectedLanguages.length} selected - type to search more...`
          }
          disabled={disabled}
          className={`w-full p-3 border rounded-lg pr-10 ${
            disabled
              ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
              : "border-gray-300 bg-white hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          }`}
        />
        <ChevronDown
          className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""} ${disabled ? "text-gray-300" : "text-gray-400"}`}
        />
      </div>

      {/* Dropdown menu */}
      {isOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {languages
            .filter(
              (language) =>
                language.name
                  .toLowerCase()
                  .includes(searchTerm.toLowerCase()) ||
                language.code.toLowerCase().includes(searchTerm.toLowerCase()),
            )
            .map((language) => {
              const isSelected = selectedLanguages.includes(language.code);
              const isAtLimit = selectedLanguages.length >= maxLanguages;
              const isDisabled = !isSelected && isAtLimit;

              return (
                <button
                  key={language.code}
                  type="button"
                  onClick={() => handleLanguageToggle(language.code)}
                  disabled={isDisabled}
                  className={`w-full px-4 py-2 text-left flex items-center justify-between ${
                    isDisabled
                      ? "text-gray-400 cursor-not-allowed"
                      : "hover:bg-gray-50"
                  } ${isSelected ? "bg-blue-50" : ""}`}
                >
                  <span className="truncate">{language.name}</span>
                  {selectedLanguages.includes(language.code) && (
                    <Check className="w-4 h-4 text-blue-500 flex-shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
};

const ToggleSwitch = ({ enabled, onChange, disabled }) => {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        disabled
          ? "bg-gray-200 cursor-not-allowed"
          : enabled
            ? "bg-blue-600"
            : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
};

const StaticSubtitleUpload = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [censorProfanity, setCensorProfanity] = useState(false);
  const [targetLanguages, setTargetLanguages] = useState([]);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedFiles, setTranslatedFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [languages, setLanguages] = useState([]);
  const [loadingLanguages, setLoadingLanguages] = useState(true);
  const [error, setError] = useState(null);
  const [backendConnected, setBackendConnected] = useState(false);
  const [currentTranslatingLanguage, setCurrentTranslatingLanguage] =
    useState("");
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const fileInputRef = useRef(null);
  const [previewingFile, setPreviewingFile] = useState(null);
  const [previewContent, setPreviewContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [originalContent, setOriginalContent] = useState("");
  const [loadingOriginal, setLoadingOriginal] = useState(false);

  // Load languages from Microsoft Translator API
  useEffect(() => {
    const loadLanguages = async () => {
      try {
        setLoadingLanguages(true);
        setError(null);

        // First check if backend is healthy
        await apiCall("/health");
        setBackendConnected(true);

        // Fetch languages from Microsoft Translator API
        const response = await fetch(
          "https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation",
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch languages: ${response.status}`);
        }

        const data = await response.json();

        // Convert Microsoft Translator format to our format
        const languageArray = Object.entries(data.translation).map(
          ([code, info]) => ({
            code,
            name: info.name,
            nativeName: info.nativeName,
          }),
        );

        // Sort languages alphabetically by name
        languageArray.sort((a, b) => a.name.localeCompare(b.name));

        setLanguages(languageArray);
        setError(null);
      } catch (err) {
        if (err.message.includes("Failed to fetch languages")) {
          // If Microsoft API fails, try to fall back to backend
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
          } catch (backendErr) {
            setBackendConnected(false);
            setLanguages([]);
            setError(
              `Language loading failed: ${err.message}. Backend connection also failed: ${backendErr.message}`,
            );
          }
        } else {
          setBackendConnected(false);
          setLanguages([]);
          setError(
            `Backend connection failed: ${err.message}. Please ensure your FastAPI server is running on http://localhost:8000 with Azure credentials configured.`,
          );
        }
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

  // Enhanced translation function with better progress tracking
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

      // Process each target language sequentially
      for (let i = 0; i < targetLanguages.length; i++) {
        const targetLang = targetLanguages[i];
        const targetLangName =
          languages.find((l) => l.code === targetLang)?.name || targetLang;

        setCurrentTranslatingLanguage(`Translating to ${targetLangName}...`);

        // Create FormData for file upload
        const formData = new FormData();
        formData.append("file", uploadedFile);
        formData.append("source_language", "auto");
        formData.append("censor_profanity", censorProfanity);
        formData.append("target_language", targetLang);

        try {
          // Start translation request
          const result = await apiCall("/upload-file", {
            method: "POST",
            body: formData,
          });

          translatedResults.push({
            language: targetLang,
            languageName: targetLangName,
            filename: result.translated_filename,
            originalFilename: result.original_filename,
            message: result.message,
          });

          // Update progress
          const progress = ((i + 1) / totalLanguages) * 100;
          setTranslationProgress(progress);

          // Small delay to show progress
          if (i < targetLanguages.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (err) {
          console.error(`Translation failed for ${targetLang}:`, err);
          setError(`Translation failed for ${targetLangName}: ${err.message}`);
          break; // Stop on first error
        }
      }

      setTranslatedFiles(translatedResults);
      setCurrentTranslatingLanguage("");
    } catch (err) {
      setError(`Translation failed: ${err.message}`);
      setCurrentTranslatingLanguage("");
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
        const errorData = await response.json();
        throw new Error(errorData.error || "Download failed");
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

  // Add new function to download all files as ZIP
  const downloadAllAsZip = async () => {
    if (!backendConnected) {
      setError("Backend not connected. Cannot download files.");
      return;
    }

    if (translatedFiles.length === 0) {
      setError("No translated files available for download.");
      return;
    }

    setIsDownloadingZip(true);
    setError(null);

    try {
      // Send the list of filenames to the backend
      const filenames = translatedFiles.map((file) => file.filename);

      const response = await fetch(`${API_BASE_URL}/download-zip`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filenames }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "ZIP download failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Create a meaningful ZIP filename based on the original file
      const originalName =
        uploadedFile?.name.replace(/\.[^/.]+$/, "") || "subtitles";
      a.download = `${originalName}_translated.zip`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(`ZIP download failed: ${err.message}`);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // Preview subtitle file content with original comparison
  const previewFile = async (filename, languageName) => {
    if (!backendConnected) {
      setError("Backend not connected. Cannot preview files.");
      return;
    }

    setLoadingPreview(true);
    setLoadingOriginal(true);
    setError(null);

    try {
      // Fetch translated file
      const translatedResponse = await fetch(
        `${API_BASE_URL}/download-subtitle?filename=${encodeURIComponent(filename)}`,
      );

      if (!translatedResponse.ok) {
        const errorData = await translatedResponse.json();
        throw new Error(errorData.error || "Preview failed");
      }

      const translatedContent = await translatedResponse.text();
      setPreviewContent(translatedContent);
      setLoadingPreview(false);

      // Fetch original file content
      if (uploadedFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setOriginalContent(e.target.result);
          setLoadingOriginal(false);
        };
        reader.onerror = () => {
          setError("Failed to read original file");
          setLoadingOriginal(false);
        };
        reader.readAsText(uploadedFile);
      }

      setPreviewingFile({ filename, languageName });
      setShowPreview(true);
      // Add this: Scroll to preview section after a short delay
      setTimeout(() => {
        if (previewSectionRef.current) {
          previewSectionRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
            inline: "nearest",
          });
        }
      }, 100); // Small delay to ensure the component has rendered
    } catch (err) {
      setError(`Preview failed: ${err.message}`);
      setLoadingPreview(false);
      setLoadingOriginal(false);
    }
  };

  // Sync scroll between original and translated preview
  const handleScrollSync = (e, targetRef) => {
    if (targetRef.current) {
      targetRef.current.scrollTop = e.target.scrollTop;
      targetRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  // Close preview
  const closePreview = () => {
    setShowPreview(false);
    setPreviewingFile(null);
    setPreviewContent("");
    setOriginalContent("");
    setLoadingOriginal(false);
  };

  const resetComponent = () => {
    setUploadedFile(null);
    setTranslationProgress(0);
    setTranslatedFiles([]);
    setCensorProfanity(false);
    setTargetLanguages([]);
    setError(null);
    setCurrentTranslatingLanguage("");
    setIsDownloadingZip(false);
    setShowPreview(false);
    setPreviewingFile(null);
    setPreviewContent("");
    setOriginalContent("");
    setLoadingPreview(false);
    setLoadingOriginal(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const originalPreviewRef = useRef(null);
  const translatedPreviewRef = useRef(null);
  const previewSectionRef = useRef(null);

  // Retry connection to backend
  const retryConnection = async () => {
    setLoadingLanguages(true);
    setError(null);

    try {
      await apiCall("/health");
      setBackendConnected(true);

      // Try to reload languages from Microsoft API
      const response = await fetch(
        "https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation",
      );
      if (response.ok) {
        const data = await response.json();
        const languageArray = Object.entries(data.translation).map(
          ([code, info]) => ({
            code,
            name: info.name,
            nativeName: info.nativeName,
          }),
        );
        languageArray.sort((a, b) => a.name.localeCompare(b.name));
        setLanguages(languageArray);
      } else {
        // Fallback to backend languages
        const languageData = await apiCall("/languages");
        const languageArray = Object.entries(languageData).map(
          ([code, name]) => ({
            code,
            name,
          }),
        );
        setLanguages(languageArray);
      }

      setError(null);
    } catch (err) {
      setBackendConnected(false);
      setLanguages([]);
      setError(
        `Backend connection failed: ${err.message}. Please ensure your FastAPI server is running with Azure credentials configured.`,
      );
    } finally {
      setLoadingLanguages(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Azure Powered Subtitle Translation
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
                Azure Translation Service:{" "}
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
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-red-800">
                <div className="font-medium mb-1">Translation Error</div>
                <div className="text-sm">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Show setup instructions when backend is not connected */}
        {!backendConnected && !loadingLanguages && (
          <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-medium text-blue-800 mb-2">
              Setup Required
            </h3>
            <p className="text-blue-700 mb-4">
              This feature requires Azure Translator service. Please ensure:
            </p>
            <ol className="list-decimal list-inside text-blue-700 space-y-2 mb-4">
              <li>Your FastAPI server is running on port 8000</li>
              <li>
                Azure Translator credentials are configured in your .env file:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>
                    <code className="bg-blue-100 px-2 py-1 rounded text-xs">
                      AZURE_TRANSLATOR_ENDPOINT
                    </code>
                  </li>
                  <li>
                    <code className="bg-blue-100 px-2 py-1 rounded text-xs">
                      AZURE_SUBSCRIPTION_KEY
                    </code>
                  </li>
                  <li>
                    <code className="bg-blue-100 px-2 py-1 rounded text-xs">
                      AZURE_REGION
                    </code>
                  </li>
                </ul>
              </li>
              <li>Click "Retry Connection" above once configured</li>
            </ol>
          </div>
        )}

        {/* File Upload Area */}
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
            Supports SRT, VTT formats • Powered by Azure Translator
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

        {/* Language Selection */}
        {uploadedFile && backendConnected && (
          <div className="mt-8 space-y-6">
            {/* Target Languages - Multi-select Dropdown */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Select Target Languages
                </h3>
                <span className="text-sm text-gray-500">
                  {targetLanguages.length}/{MAX_SELECTED_LANGUAGES} selected
                </span>
              </div>
              {loadingLanguages ? (
                <p className="text-gray-500">Loading languages...</p>
              ) : (
                <MultiSelectDropdown
                  languages={languages}
                  selectedLanguages={targetLanguages}
                  onSelectionChange={setTargetLanguages}
                  disabled={loadingLanguages || !backendConnected}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  maxLanguages={MAX_SELECTED_LANGUAGES}
                />
              )}
            </div>
          </div>
        )}

        {/* Translation Progress */}
        {isTranslating && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">
                {currentTranslatingLanguage || "Processing..."}
              </span>
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
        <div className="mt-8 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
          <button
            onClick={resetComponent}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 w-full sm:w-auto"
          >
            Reset
          </button>

          {uploadedFile && backendConnected && (
            <div className="flex items-center space-x-6">
              {/* Profanity Filter Toggle */}
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-700">Censor profanity</span>

                <ToggleSwitch
                  enabled={censorProfanity}
                  onChange={setCensorProfanity}
                  disabled={isTranslating || loadingLanguages}
                />
              </div>

              {!isTranslating && translatedFiles.length === 0 && (
                <button
                  onClick={startTranslation}
                  disabled={
                    targetLanguages.length === 0 ||
                    loadingLanguages ||
                    !backendConnected
                  }
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                  Start Translation
                </button>
              )}
            </div>
          )}
        </div>
        {/* Download Results */}
        {translatedFiles.length > 0 && (
          <div className="mt-8 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-2" />
                <span className="text-green-800 font-medium">
                  Translation Complete! ({translatedFiles.length} file
                  {translatedFiles.length > 1 ? "s" : ""} ready)
                </span>
              </div>

              {/* Add Download All as ZIP button when multiple files */}
              {translatedFiles.length > 1 && (
                <button
                  onClick={downloadAllAsZip}
                  disabled={isDownloadingZip}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                >
                  <Archive className="w-4 h-4" />
                  <span>
                    {isDownloadingZip
                      ? "Creating ZIP..."
                      : "Download All as ZIP"}
                  </span>
                </button>
              )}
            </div>
            <div className="space-y-2">
              {translatedFiles.map((file) => (
                <div
                  key={file.language}
                  className="flex items-center justify-between bg-white p-3 rounded-lg border"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div
                      className="text-gray-700 font-medium truncate"
                      title={file.filename}
                    >
                      {file.filename}
                    </div>
                    <div className="text-sm text-gray-500">
                      Translated to {file.languageName}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      onClick={() =>
                        previewFile(file.filename, file.languageName)
                      }
                      disabled={loadingPreview}
                      className="text-green-600 hover:text-green-800 flex items-center space-x-1 px-3 py-1 rounded border border-green-300 hover:bg-green-50 disabled:opacity-50"
                    >
                      <Eye className="w-4 h-4" />
                      <span>{loadingPreview ? "Loading..." : "Preview"}</span>
                    </button>
                    <button
                      onClick={() => downloadFile(file.filename)}
                      className="text-blue-500 hover:text-blue-700 flex items-center space-x-1"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Subtitle Preview Modal/Section - Side by Side */}
        {showPreview && previewingFile && (
          <div
            ref={previewSectionRef}
            className="mt-8 p-4 bg-gray-50 rounded-lg border"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
                <p className="text-sm text-gray-600">
                  {previewingFile.filename} - {previewingFile.languageName}
                </p>
              </div>
              <button
                onClick={closePreview}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Side by side preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* Original File */}
              <div className="bg-white rounded-lg border">
                <div className="px-4 py-2 bg-gray-100 border-b rounded-t-lg">
                  <h4 className="font-medium text-gray-700 flex items-center">
                    <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                    Original (Auto-detected)
                  </h4>
                </div>
                <div className="p-4">
                  {loadingOriginal ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-gray-500">
                        Loading original content...
                      </div>
                    </div>
                  ) : (
                    <div
                      ref={originalPreviewRef}
                      onScroll={(e) =>
                        handleScrollSync(e, translatedPreviewRef)
                      }
                      className="max-h-96 overflow-auto"
                    >
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                        {originalContent}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {/* Translated File */}
              <div className="bg-white rounded-lg border">
                <div className="px-4 py-2 bg-gray-100 border-b rounded-t-lg">
                  <h4 className="font-medium text-gray-700 flex items-center">
                    <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                    Translated ({previewingFile.languageName})
                  </h4>
                </div>
                <div className="p-4">
                  {loadingPreview ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-gray-500">
                        Loading translated content...
                      </div>
                    </div>
                  ) : (
                    <div
                      ref={translatedPreviewRef}
                      onScroll={(e) => handleScrollSync(e, originalPreviewRef)}
                      className="max-h-96 overflow-auto"
                    >
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                        {previewContent}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
              <button
                onClick={() => downloadFile(previewingFile.filename)}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <Download className="w-4 h-4" />
                <span>Download Translated File</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaticSubtitleUpload;
