import React, { useState, useEffect } from "react";
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
} from "lucide-react";

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

  // Fetch available locales on component mount
  useEffect(() => {
    fetchLocales();
  }, []);

  const fetchLocales = async () => {
    try {
      // Replace with your actual backend URL
      const baseUrl = process.env.REACT_APP_API_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/locales`);

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
      const baseUrl = process.env.REACT_APP_API_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/transcribe`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setTranscriptionResult(data);
        setActiveTab("result");
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
      const baseUrl = process.env.REACT_APP_API_URL || "http://localhost:8000";
      const response = await fetch(
        `${baseUrl}/download-transcription?filename=${encodeURIComponent(transcriptionResult.transcribed_filename)}`,
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
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
          <h1 className="text-3xl font-bold mb-2">AI Transcription Service</h1>
          <p className="text-blue-100">
            Upload your audio or video files for automatic transcription
          </p>
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
                    {Object.entries(locales).map(([locale, language]) => (
                      <option key={locale} value={locale}>
                        {language} ({locale})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Max Speakers */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Speakers
                  </label>
                  <select
                    value={maxSpeakers}
                    onChange={(e) => setMaxSpeakers(parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? "Speaker" : "Speakers"}
                      </option>
                    ))}
                  </select>
                </div>

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
                    <option value="srt">SRT (SubRip)</option>
                    <option value="vtt">VTT (WebVTT)</option>
                  </select>
                </div>

                {/* Profanity Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content Filtering
                  </label>
                  <div className="flex items-center">
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
                  onClick={resetForm}
                  className="flex-1 bg-gray-500 text-white py-3 px-6 rounded-lg hover:bg-gray-600 font-medium transition-colors"
                >
                  New Transcription
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TranscriptionApp;
