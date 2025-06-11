import React, { useState, useRef, useEffect } from "react";
import { Upload, Download, Check, X } from "lucide-react";

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

export default StaticSubtitleUpload;
