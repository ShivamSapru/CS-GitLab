import React, { useState, useRef, useEffect } from "react";
import { Upload, Download, Check, X, AlertCircle } from "lucide-react";

// API Configuration for Static Upload only
const API_BASE_URL = "http://localhost:8000/api";

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
  const [currentTranslatingLanguage, setCurrentTranslatingLanguage] =
    useState("");
  const fileInputRef = useRef(null);

  // Load languages from backend on component mount
  useEffect(() => {
    const loadLanguages = async () => {
      try {
        setLoadingLanguages(true);
        setError(null);

        // First check if backend is healthy
        await apiCall("/health");

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
        setLanguages([]);
        setError(
          `Backend connection failed: ${err.message}. Please ensure your FastAPI server is running on http://localhost:8000 with Azure credentials configured.`,
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
        formData.append("source_language", sourceLanguage);
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

  const resetComponent = () => {
    setUploadedFile(null);
    setTranslationProgress(0);
    setTranslatedFiles([]);
    setError(null);
    setCurrentTranslatingLanguage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Retry connection to backend
  const retryConnection = async () => {
    setLoadingLanguages(true);
    setError(null);

    try {
      await apiCall("/health");
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
                Translation Complete! ({translatedFiles.length} file
                {translatedFiles.length > 1 ? "s" : ""} ready)
              </span>
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
                  <button
                    onClick={() => downloadFile(file.filename)}
                    className="text-blue-500 hover:text-blue-700 flex items-center space-x-1 flex-shrink-0"
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

export default StaticSubtitleUpload;
