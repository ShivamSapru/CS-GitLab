import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  Download,
  Play,
  Pause,
  FileText,
  Settings,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  X,
  Edit,
  Save,
  Undo,
  Redo,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// API configuration
const API_BASE_URL = "http://localhost:8000";

const TranscriptionApp = () => {
  const [activeTab, setActiveTab] = useState("upload");
  const [file, setFile] = useState(null);
  const [locales, setLocales] = useState({});
  const [selectedLocale, setSelectedLocale] = useState("en-US");
  const [maxSpeakers, setMaxSpeakers] = useState(2);
  const [censorProfanity, setCensorProfanity] = useState(false);
  const [outputFormat, setOutputFormat] = useState("srt");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState(null);
  const [error, setError] = useState("");

  // Preview feature states
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editHistory, setEditHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const previewRef = useRef(null);
  const editTextareaRef = useRef(null);

  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Get API URL - simple approach
  const getApiUrl = () => {
    return API_BASE_URL;
  };

  // Fetch available locales on component mount
  useEffect(() => {
    fetchLocales();
  }, []);

  const fetchLocales = async () => {
    try {
      const baseUrl = getApiUrl();
      console.log("Fetching locales from:", baseUrl); // Debug log

      const response = await fetch(`${baseUrl}/api/locales`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setLocales(data);
    } catch (err) {
      console.error("Locale fetch error:", err);
      setError(`Failed to fetch available languages: ${err.message}`);
      // Fallback to some common locales if API fails
      setLocales({
        "en-US": "English (United States)",
        "es-ES": "Spanish (Spain)",
        "fr-FR": "French (France)",
        "de-DE": "German (Germany)",
        "it-IT": "Italian (Italy)",
        "pt-BR": "Portuguese (Brazil)",
        "ja-JP": "Japanese (Japan)",
        "ko-KR": "Korean (South Korea)",
        "zh-CN": "Chinese (Simplified)",
      });
    }
  };

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    if (uploadedFile) {
      // Check file type
      const allowedTypes = ["audio/", "video/"];
      const isAllowed = allowedTypes.some((type) =>
        uploadedFile.type.startsWith(type),
      );

      if (isAllowed) {
        setFile(uploadedFile);
        setError("");
      } else {
        setError("Please upload an audio or video file");
      }
    }
  };

  const handleTranscribe = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setIsTranscribing(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("locale", selectedLocale);
    formData.append("max_speakers", maxSpeakers.toString());
    formData.append("censor_profanity", censorProfanity.toString());
    formData.append("output_format", outputFormat);

    try {
      const baseUrl = getApiUrl();
      console.log("Transcribing with URL:", baseUrl); // Debug log
      console.log("Form data:", {
        filename: file.name,
        locale: selectedLocale,
        maxSpeakers,
        censorProfanity,
        outputFormat,
      }); // Debug log

      const response = await fetch(`${baseUrl}/api/transcribe`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setTranscriptionResult(data);
        setActiveTab("result");
        // Reset preview state when new transcription is done
        setShowPreview(false);
        setPreviewContent("");
        setIsEditing(false);
        setEditedContent("");
      } else {
        setError(data.error || "Transcription failed");
      }
    } catch (err) {
      console.error("Transcription error:", err);
      setError(`Network error occurred: ${err.message}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleDownload = async () => {
    if (!transcriptionResult?.transcribed_filename) return;

    try {
      const baseUrl = getApiUrl();
      const response = await fetch(
        `${baseUrl}/api/download-transcription?filename=${encodeURIComponent(transcriptionResult.transcribed_filename)}`,
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = transcriptionResult.transcribed_filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || "Download failed");
      }
    } catch (err) {
      console.error("Download error:", err);
      setError(`Download error occurred: ${err.message}`);
    }
  };

  const resetForm = () => {
    setFile(null);
    setTranscriptionResult(null);
    setError("");
    setActiveTab("upload");
    setShowPreview(false);
    setPreviewContent("");
    setIsEditing(false);
    setEditedContent("");
    setEditHistory([]);
    setHistoryIndex(-1);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Preview feature functions
  const handlePreview = async () => {
    if (!transcriptionResult?.transcribed_filename) return;

    setLoadingPreview(true);
    setError("");

    try {
      const baseUrl = getApiUrl();
      const response = await fetch(
        `${baseUrl}/api/download-transcription?filename=${encodeURIComponent(transcriptionResult.transcribed_filename)}`,
      );

      if (response.ok) {
        const content = await response.text();
        setPreviewContent(content);
        setShowPreview(true);

        // Scroll to preview section
        setTimeout(() => {
          if (previewRef.current) {
            previewRef.current.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        }, 100);
      } else {
        throw new Error("Failed to load transcription for preview");
      }
    } catch (err) {
      console.error("Preview error:", err);
      setError(`Preview failed: ${err.message}`);
    } finally {
      setLoadingPreview(false);
    }
  };

  const closePreview = () => {
    setShowPreview(false);
    setPreviewContent("");
    setIsEditing(false);
    setEditedContent("");
    setEditHistory([]);
    setHistoryIndex(-1);
  };

  const startEditing = () => {
    setEditedContent(previewContent);
    setIsEditing(true);
    initializeEditHistory(previewContent);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedContent("");
    setEditHistory([]);
    setHistoryIndex(-1);
  };

  const saveEditedFile = async () => {
    setIsSaving(true);
    try {
      setPreviewContent(editedContent);
      setIsEditing(false);
      setEditedContent("");
    } catch (err) {
      setError(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const downloadEditedFile = async () => {
    try {
      const content = isEditing
        ? editedContent
        : editedContent || previewContent;
      const blob = new Blob([content], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = transcriptionResult.transcribed_filename
        .replace(".srt", "_edited.srt")
        .replace(".vtt", "_edited.vtt");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Download failed: ${err.message}`);
    }
  };

  const initializeEditHistory = (content) => {
    setEditHistory([content]);
    setHistoryIndex(0);
  };

  const addToHistory = (content) => {
    setEditHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(content);
      if (newHistory.length > 50) {
        newHistory.shift();
        setHistoryIndex(Math.min(historyIndex, newHistory.length - 1));
        return newHistory;
      }
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setEditedContent(editHistory[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < editHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setEditedContent(editHistory[newIndex]);
    }
  };

  const handleTextChange = (newContent) => {
    setEditedContent(newContent);
    clearTimeout(window.editHistoryTimeout);
    window.editHistoryTimeout = setTimeout(() => {
      addToHistory(newContent);
    }, 500);
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
    } else if (
      ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Z") ||
      ((e.ctrlKey || e.metaKey) && e.key === "y")
    ) {
      e.preventDefault();
      handleRedo();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-white text-black p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">
            AI Transcription
          </h1>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-6 py-3 font-medium ${
              activeTab === "upload"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            Upload & Configure
          </button>
          <button
            onClick={() => setActiveTab("result")}
            className={`px-6 py-3 font-medium ${
              activeTab === "result"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-blue-600"
            } ${!transcriptionResult ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={!transcriptionResult}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Results
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 m-6">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Upload & Configure Tab */}
        {activeTab === "upload" && (
          <div className="p-6">
            <div className="space-y-6">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Audio/Video File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept="audio/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Supports audio and video files
                    </p>
                  </label>
                </div>
                {file && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-2" />
                      <div>
                        <p className="text-green-800 font-medium">
                          {file.name}
                        </p>
                        <p className="text-green-600 text-sm">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Configuration Options */}
              <div className="space-y-6">
                {/* Basic Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Output Format */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Output Format
                    </label>
                    <select
                      value={outputFormat}
                      onChange={(e) => setOutputFormat(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="srt">SRT </option>
                      <option value="vtt">VTT </option>
                    </select>
                  </div>

                  {/* Profanity Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Content Filtering
                    </label>
                    <div className="flex items-center pt-2">
                      <input
                        type="checkbox"
                        id="censor-profanity"
                        checked={censorProfanity}
                        onChange={(e) => setCensorProfanity(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="censor-profanity"
                        className="ml-2 text-gray-700"
                      >
                        Censor profanity
                      </label>
                    </div>
                  </div>
                </div>

                {/* Advanced Settings Toggle */}
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setShowAdvancedSettings(!showAdvancedSettings)
                    }
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Advanced</span>
                    {showAdvancedSettings ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {/* Advanced Settings Panel */}
                  {showAdvancedSettings && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Language Selection */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Language
                          </label>
                          <select
                            value={selectedLocale}
                            onChange={(e) => setSelectedLocale(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {Object.entries(locales).map(
                              ([locale, language]) => (
                                <option key={locale} value={locale}>
                                  {language}
                                </option>
                              ),
                            )}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            Auto-detection is used if not specified
                          </p>
                        </div>

                        {/* Max Speakers */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Maximum Speakers
                          </label>
                          <select
                            value={maxSpeakers}
                            onChange={(e) =>
                              setMaxSpeakers(parseInt(e.target.value))
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {[
                              2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
                              16,
                            ].map((num) => (
                              <option key={num} value={num}>
                                {num} {num === 1 ? "Speaker" : "Speakers"}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            For speaker identification and diarization
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Transcribe Button */}
              <div className="pt-4">
                <button
                  onClick={handleTranscribe}
                  disabled={!file || isTranscribing}
                  className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  {isTranscribing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Transcribing...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      <span>Start Transcription</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === "result" && transcriptionResult && (
          <div className="p-6">
            <div className="space-y-6">
              {/* Success Message */}
              <div className="bg-green-50 border-l-4 border-green-400 p-4">
                <div className="flex">
                  <Check className="h-5 w-5 text-green-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Transcription Completed Successfully!
                    </h3>
                    <p className="text-sm text-green-700 mt-1">
                      {transcriptionResult.message}
                    </p>
                  </div>
                </div>
              </div>

              {/* File Information */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Transcription Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Original File:
                    </span>
                    <p className="text-gray-900">{file?.name}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Output File:
                    </span>
                    <p className="text-gray-900">
                      {transcriptionResult.transcribed_filename}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Language:
                    </span>
                    <p className="text-gray-900">
                      {locales[selectedLocale]} ({selectedLocale})
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Format:
                    </span>
                    <p className="text-gray-900">
                      {outputFormat.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Max Speakers:
                    </span>
                    <p className="text-gray-900">{maxSpeakers}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Profanity Filter:
                    </span>
                    <p className="text-gray-900">
                      {censorProfanity ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={handleDownload}
                  className="flex-1 bg-green-500 text-white py-3 px-6 rounded-lg hover:bg-green-600 font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <Download className="w-5 h-5" />
                  <span>Download Transcription</span>
                </button>

                <button
                  onClick={handlePreview}
                  disabled={loadingPreview}
                  className="flex-1 bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  {loadingPreview ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      <span>Load Preview</span>
                    </>
                  )}
                </button>

                <button
                  onClick={resetForm}
                  className="flex-1 bg-gray-500 text-white py-3 px-6 rounded-lg hover:bg-gray-600 font-medium transition-colors"
                >
                  New Transcription
                </button>
              </div>

              {/* Preview Section - Shows below action buttons when loaded */}
              {showPreview && (
                <div
                  ref={previewRef}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm"
                >
                  <div className="px-4 py-3 bg-gray-50 border-b rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-700 flex items-center">
                        <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                        Transcribed Content ({selectedLocale}) -{" "}
                        {outputFormat.toUpperCase()}
                      </h4>
                      <div className="flex items-center space-x-2">
                        {!isEditing ? (
                          <button
                            onClick={startEditing}
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1 px-2 py-1 rounded hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={saveEditedFile}
                              disabled={isSaving}
                              className="text-green-600 hover:text-green-800 text-sm flex items-center space-x-1 px-2 py-1 rounded hover:bg-green-50"
                            >
                              <Save className="w-4 h-4" />
                              <span>{isSaving ? "Saving..." : "Save"}</span>
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={isSaving}
                              className="text-gray-600 hover:text-gray-800 text-sm flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-50"
                            >
                              <X className="w-4 h-4" />
                              <span>Cancel</span>
                            </button>
                          </div>
                        )}
                        <button
                          onClick={closePreview}
                          className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-50"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    {isEditing ? (
                      <div className="space-y-3">
                        {/* Undo/Redo buttons */}
                        <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                          <button
                            onClick={handleUndo}
                            disabled={historyIndex <= 0}
                            className={`flex items-center space-x-1 px-3 py-1 rounded text-sm ${
                              historyIndex <= 0
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                            title="Undo (Ctrl+Z)"
                          >
                            <Undo className="w-4 h-4" />
                            <span>Undo</span>
                          </button>
                          <button
                            onClick={handleRedo}
                            disabled={historyIndex >= editHistory.length - 1}
                            className={`flex items-center space-x-1 px-3 py-1 rounded text-sm ${
                              historyIndex >= editHistory.length - 1
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                            title="Redo (Ctrl+Shift+Z or Ctrl+Y)"
                          >
                            <Redo className="w-4 h-4" />
                            <span>Redo</span>
                          </button>
                          <div className="text-xs text-gray-500 ml-auto">
                            History: {historyIndex + 1}/{editHistory.length}
                          </div>
                        </div>

                        <textarea
                          ref={editTextareaRef}
                          value={editedContent}
                          onChange={(e) => handleTextChange(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className="w-full h-96 p-3 border border-gray-300 rounded font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Edit your subtitle content here..."
                        />
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>Lines: {editedContent.split("\n").length}</span>
                          <span>Characters: {editedContent.length}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="max-h-96 overflow-auto">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                          {previewContent}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Preview Action Buttons */}
                  {showPreview && (
                    <div className="px-4 py-3 bg-gray-50 border-t rounded-b-lg">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          {isEditing && (
                            <div className="text-sm text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
                              Editing Mode
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              if (editedContent || isEditing) {
                                downloadEditedFile();
                              } else {
                                handleDownload();
                              }
                            }}
                            disabled={isEditing}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                              isEditing
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : "bg-green-500 text-white hover:bg-green-600"
                            }`}
                          >
                            <Download className="w-4 h-4" />
                            <span>
                              {isEditing
                                ? "Finish Editing First"
                                : editedContent
                                  ? "Download Edited"
                                  : "Download Original"}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TranscriptionApp;
