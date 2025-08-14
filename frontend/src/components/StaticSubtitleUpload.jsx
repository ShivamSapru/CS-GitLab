import React, { useState, useRef, useEffect } from "react";
import SaveProjectModal from "./SaveProjectModal";
import AutoSaveModal from "./AutoSave";
import {
  Upload,
  Download,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  Archive,
  Eye,
  Edit,
  Save,
  Undo,
  Redo,
  FolderPlus,
  CheckCircle,
} from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// API Configuration for Static Upload only
const API_BASE_URL = `${BACKEND_URL}/api`;
const MAX_SELECTED_LANGUAGES = 5;

const apiCall = async (endpoint, options = {}) => {
  try {
    // If it's JSON, let's parse and validate it
    if (
      options.body &&
      options.headers?.["Content-Type"] === "application/json"
    ) {
      try {
        const parsedBody = JSON.parse(options.body);
      } catch (parseError) {
        console.error(`❌ Failed to parse JSON body:`, parseError);
      }
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: "include",
    });

    if (!response.ok) {
      let errorData;
      const responseText = await response.text();
      console.log(`❌ Raw error response:`, responseText);

      try {
        errorData = JSON.parse(responseText);
        console.error(`❌ Parsed error response:`, errorData);

        // Log detailed validation errors if they exist
        if (errorData.detail && Array.isArray(errorData.detail)) {
          console.error(
            `🔍 Validation errors:`,
            errorData.detail.map((err) => ({
              location: err.loc,
              message: err.msg,
              type: err.type,
              input: err.input,
            })),
          );
        }
      } catch (parseError) {
        console.error("❌ Could not parse error response as JSON:", parseError);
        errorData = {
          error: `HTTP error! status: ${response.status}`,
          raw: responseText,
        };
      }

      throw new Error(
        errorData.error ||
          errorData.detail ||
          (Array.isArray(errorData.detail)
            ? JSON.stringify(errorData.detail)
            : null) ||
          `HTTP error! status: ${response.status}`,
      );
    }

    const result = await response.json();

    return result;
  } catch (error) {
    console.error(" API call failed:", error);
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
  isDarkMode,
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
      const newSelection = selectedLanguages.filter(
        (code) => code !== languageCode,
      );
      onSelectionChange(newSelection);
    } else {
      if (selectedLanguages.length < MAX_SELECTED_LANGUAGES) {
        const newSelection = [...selectedLanguages, languageCode];
        onSelectionChange(newSelection);
      }
    }
    onSearchChange("");
    setIsOpen(false);
  };

  const removeLanguage = (languageCode) => {
    onSelectionChange(
      selectedLanguages.filter((code) => code !== languageCode),
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="mb-2 flex flex-wrap gap-2">
        {selectedLanguages.map((code) => {
          const language = languages.find((lang) => lang.code === code);
          return (
            <span
              key={code}
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm transition-colors duration-300 ${
                isDarkMode
                  ? "bg-blue-900/50 text-blue-200"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {language?.name || code}
              <button
                onClick={() => removeLanguage(code)}
                className={`ml-2 transition-colors duration-300 ${
                  isDarkMode
                    ? "text-blue-300 hover:text-blue-100"
                    : "text-blue-600 hover:text-blue-800"
                }`}
                disabled={disabled}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
      </div>

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
          className={`w-full p-3 border rounded-lg pr-10 transition-colors duration-300 ${
            disabled
              ? isDarkMode
                ? "border-gray-600 bg-gray-700 text-gray-500 cursor-not-allowed"
                : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
              : isDarkMode
                ? "border-gray-600 bg-gray-700 text-gray-200 hover:border-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                : "border-gray-300 bg-white hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          }`}
        />
        <ChevronDown
          className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-all duration-300 ${isOpen ? "rotate-180" : ""} ${
            disabled
              ? isDarkMode
                ? "text-gray-600"
                : "text-gray-300"
              : isDarkMode
                ? "text-gray-400"
                : "text-gray-400"
          }`}
        />
      </div>

      {isOpen && !disabled && (
        <div
          className={`absolute z-10 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto transition-colors duration-300 ${
            isDarkMode
              ? "bg-gray-800 border-gray-600"
              : "bg-white border-gray-300"
          }`}
        >
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
                  className={`w-full px-4 py-2 text-left flex items-center justify-between transition-colors duration-300 ${
                    isDisabled
                      ? isDarkMode
                        ? "text-gray-600 cursor-not-allowed"
                        : "text-gray-400 cursor-not-allowed"
                      : isDarkMode
                        ? "text-gray-200 hover:bg-gray-700"
                        : "hover:bg-gray-50"
                  } ${
                    isSelected
                      ? isDarkMode
                        ? "bg-blue-900/30"
                        : "bg-blue-50"
                      : ""
                  }`}
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

const ToggleSwitch = ({ enabled, onChange, disabled, isDarkMode }) => {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        disabled
          ? isDarkMode
            ? "bg-gray-600 cursor-not-allowed"
            : "bg-gray-200 cursor-not-allowed"
          : enabled
            ? "bg-blue-600"
            : isDarkMode
              ? "bg-gray-600"
              : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
};

const StaticSubtitleUpload = ({
  initialTranscriptionData,
  onBackToTranscription,
  isDarkMode,
}) => {
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
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editedFiles, setEditedFiles] = useState({});
  const [editHistory, setEditHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showSaveProjectModal, setShowSaveProjectModal] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [projectSaveSuccess, setProjectSaveSuccess] = useState(null);
  const [projectSaved, setProjectSaved] = useState(false);
  const [hasAutoSaved, setHasAutoSaved] = useState(false);
  const [autoSaveInProgress, setAutoSaveInProgress] = useState(false);
  const [projectSaveAttempted, setProjectSaveAttempted] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(new Set());
  const [fromTranscription, setFromTranscription] = useState(
    !!initialTranscriptionData,
  );
  const [transcriptionFile, setTranscriptionFile] = useState(null);
  const [showAutoSaveModal, setShowAutoSaveModal] = useState(false);

  const originalPreviewRef = useRef(null);
  const translatedPreviewRef = useRef(null);
  const previewSectionRef = useRef(null);
  const editTextareaRef = useRef(null);

  const [translationData, setTranslationData] = useState({
    sourceLanguage: "",
    originalFilePath: "",
    translatedFilePaths: [],
  });

  // Load languages from Microsoft Translator API
  useEffect(() => {
    const loadLanguages = async () => {
      try {
        setLoadingLanguages(true);
        setError(null);

        await apiCall("/health");
        setBackendConnected(true);

        const languageData = await apiCall("/languages");
        const languageArray = Object.entries(languageData).map(
          ([code, name]) => ({
            code,
            name,
          }),
        );

        languageArray.sort((a, b) => a.name.localeCompare(b.name));
        setLanguages(languageArray);
        setError(null);
      } catch (err) {
        setBackendConnected(false);
        setLanguages([]);
        setError(
          `Backend connection failed: ${err.message}. Please ensure your FastAPI server is running on ${BACKEND_URL} with Azure credentials configured.`,
        );
        console.error("Failed to load languages:", err);
      } finally {
        setLoadingLanguages(false);
      }
    };

    loadLanguages();
  }, []);

  // Handle initial transcription data
  useEffect(() => {
    if (initialTranscriptionData) {
      // Validate that we have content
      if (!initialTranscriptionData.content) {
        setError("No transcription content available for translation");
        return;
      }

      // Check if content is a blob URL (this might be the issue!)
      if (
        typeof initialTranscriptionData.content === "string" &&
        initialTranscriptionData.content.startsWith("blob:")
      ) {
        console.log("❌ ERROR: Content is a blob URL, not actual text!");
        setError(
          "Invalid transcription content: received blob URL instead of text",
        );
        return;
      }

      // Create virtual file for UI display only
      const virtualFile = new File(
        [initialTranscriptionData.content],
        initialTranscriptionData.filename,
        { type: "text/plain" },
      );

      setUploadedFile(virtualFile);
      setTranscriptionFile(initialTranscriptionData);
      setFromTranscription(true);
      setError(null);
      setBackendConnected(true);
    }
  }, [initialTranscriptionData]);

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

  const startTranslation = async () => {
    if (!backendConnected) {
      setError("Backend not connected. Please start your FastAPI server.");
      return;
    }

    if (!uploadedFile || targetLanguages.length === 0) return;

    // Additional validation for transcription data
    if (
      fromTranscription &&
      (!transcriptionFile || !transcriptionFile.content)
    ) {
      setError("No transcription content available for translation");
      return;
    }

    setIsTranslating(true);
    setTranslationProgress(0);
    setTranslatedFiles([]);
    setError(null);
    setProjectSaveAttempted(false);
    setHasAutoSaved(false);
    setAutoSaveInProgress(false);

    try {
      const totalLanguages = targetLanguages.length;
      const translatedResults = [];

      for (let i = 0; i < targetLanguages.length; i++) {
        const targetLang = targetLanguages[i];
        const targetLangName =
          languages.find((l) => l.code === targetLang)?.name || targetLang;

        setCurrentTranslatingLanguage(`Translating to ${targetLangName}...`);

        try {
          const formData = new FormData();

          // Handle transcription data vs regular file upload differently
          if (fromTranscription && transcriptionFile) {
            // For transcription data, create a proper file from content
            const fileContent = transcriptionFile.content;
            if (!fileContent) {
              throw new Error(
                "No transcription content available for translation",
              );
            }

            console.log(" Using transcription content for translation");

            // FIXED: Use the actual filename and format from transcription
            const actualFilename =
              transcriptionFile.filename ||
              `transcription.${transcriptionFile.format || "srt"}`;

            const blob = new Blob([fileContent], { type: "text/plain" });
            const file = new File([blob], actualFilename, {
              type: "text/plain",
            });
            formData.append("file", file);
          } else {
            // For regular file uploads

            formData.append("file", uploadedFile);
          }

          formData.append("censor_profanity", censorProfanity);
          formData.append("target_language", targetLang);

          const result = await apiCall("/translate", {
            method: "POST",
            body: formData,
          });

          translatedResults.push({
            language: targetLang,
            languageName: targetLangName,
            filename: result.translated_filename,
            originalFilename: result.original_filename,
            originalFilePath: result.original_file_path,
            translatedFilePath: result.translated_file_path,
            sourceLanguage: result.source_language,
            message: result.message,
          });

          // Store translation data for project saving
          if (i === 0) {
            // Only set once, on first translation
            setTranslationData({
              sourceLanguage: result.source_language || "auto",
              originalFilePath: result.original_file_path || "",
              translatedFilePaths: [],
            });
          }

          // Update translated file paths array
          setTranslationData((prev) => ({
            ...prev,
            translatedFilePaths: [
              ...prev.translatedFilePaths,
              result.translated_file_path || result.translated_filename,
            ],
          }));

          const progress = ((i + 1) / totalLanguages) * 100;
          setTranslationProgress(progress);

          if (i < targetLanguages.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (err) {
          console.error(`Translation failed for ${targetLang}:`, err);
          setError(`Translation failed for ${targetLangName}: ${err.message}`);
          break;
        }
      }

      setTranslatedFiles(translatedResults);
      setCurrentTranslatingLanguage("");

      // Show save project modal immediately after successful translation
      if (
        translatedResults.length > 0 &&
        !projectSaveAttempted &&
        !hasAutoSaved
      ) {
        setShowAutoSaveModal(true);
      }
    } catch (err) {
      setError(`Translation failed: ${err.message}`);
      setCurrentTranslatingLanguage("");
    } finally {
      setIsTranslating(false);
    }
  };
  // Move these OUTSIDE of startTranslation function, make them standalone functions:

  // Add these three handler functions

  const handleDontSave = () => {
    setShowAutoSaveModal(false);
    setProjectSaveAttempted(true);
  };

  // Add these three handler functions
  const handleAutoSaveQuick = async () => {
    setShowAutoSaveModal(false);

    // Get the original source name
    let baseProjectName;

    if (fromTranscription && transcriptionFile?.originalFilename) {
      // For transcriptions: use original media file name
      baseProjectName = transcriptionFile.originalFilename.replace(
        /\.[^/.]+$/,
        "",
      );
    } else if (uploadedFile?.name) {
      // For direct uploads: use subtitle file name
      baseProjectName = uploadedFile.name.replace(/\.[^/.]+$/, "");
    } else {
      baseProjectName = "Subtitle Translation";
    }

    // Simple format: "originalname_en_es_fr"
    const languageCodes = targetLanguages.join("_");
    const uniqueProjectName = `${baseProjectName}_${languageCodes}`;

    const projectData = {
      project_name: uniqueProjectName,
      description: `Translated to ${targetLanguages.length} language${targetLanguages.length > 1 ? "s" : ""}: ${targetLanguages.join(", ")}.`,
      filenames: translatedFiles.map((file) => file.filename),
      original_filename: fromTranscription
        ? transcriptionFile?.originalFilename
        : uploadedFile?.name || "",
      target_languages: targetLanguages,
      is_public: false,
      original_file_path: translationData.originalFilePath,
      translated_file_path: translationData.translatedFilePaths,
      source_language: translationData.sourceLanguage,
      edited_files: editedFiles,
    };

    await saveAsProject(projectData);
  };

  const handleCustomizeSave = () => {
    setShowAutoSaveModal(false);
    // Add a small delay to ensure the AutoSave modal is fully closed
    setTimeout(() => {
      setShowSaveProjectModal(true);
    }, 100);
  };

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

  const previewFile = async (filename, languageName) => {
    if (!backendConnected) {
      setError("Backend not connected. Cannot preview files.");
      return;
    }

    setLoadingPreview(true);
    setLoadingOriginal(true);
    setError(null);

    try {
      const translatedResponse = await fetch(
        `${API_BASE_URL}/download-subtitle?filename=${encodeURIComponent(filename)}`,
      );

      if (!translatedResponse.ok) {
        const errorData = await translatedResponse.json();
        throw new Error(errorData.error || "Preview failed");
      }

      const originalTranslatedContent = await translatedResponse.text();
      setPreviewContent(originalTranslatedContent);
      setLoadingPreview(false);

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

      setTimeout(() => {
        if (previewSectionRef.current) {
          previewSectionRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
            inline: "nearest",
          });
        }
      }, 100);
    } catch (err) {
      setError(`Preview failed: ${err.message}`);
      setLoadingPreview(false);
      setLoadingOriginal(false);
    }
  };

  const handleScrollSync = (e, targetRef) => {
    if (targetRef.current) {
      targetRef.current.scrollTop = e.target.scrollTop;
      targetRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  const closePreview = () => {
    // Save any current edits before closing
    if (isEditing && editedContent.trim() && previewingFile) {
      setPreviewContent(editedContent);
      setEditedFiles((prev) => ({
        ...prev,
        [previewingFile.filename]: editedContent,
      }));
    }

    setShowPreview(false);
    setPreviewingFile(null);
    setPreviewContent("");
    setOriginalContent("");
    setLoadingOriginal(false);
    setIsEditing(false);
    setEditedContent("");
    setIsSaving(false);
    // Keep editHistory and historyIndex for potential re-opening
  };

  const startEditing = () => {
    // Use existing edited content if available, otherwise use preview content
    const contentToEdit =
      editedFiles[previewingFile.filename] || previewContent;
    setEditedContent(contentToEdit);
    setIsEditing(true);

    // Only initialize history if it's empty (first time editing)
    if (editHistory.length === 0) {
      initializeEditHistory(contentToEdit);
    }
  };

  const cancelEditing = () => {
    // Update preview content with the latest edited content
    if (editedContent.trim()) {
      setPreviewContent(editedContent);
      setEditedFiles((prev) => ({
        ...prev,
        [previewingFile.filename]: editedContent,
      }));
    }

    setIsEditing(false);
    // Don't clear editedContent and history - keep them for potential re-editing
    if (translatedPreviewRef.current) {
      translatedPreviewRef.current.scrollTop = 0;
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
        return newHistory;
      }
      return newHistory;
    });

    // Update historyIndex after state update
    setHistoryIndex((prev) => {
      const newIndex = Math.min(historyIndex + 1, 49); // Max 50 items
      return newIndex;
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
    setIsEditing(false);
    setEditedContent("");
    setIsSaving(false);
    setEditedFiles({});
    setShowSaveProjectModal(false);
    setIsSavingProject(false);
    setProjectSaveSuccess(null);
    setProjectSaved(false);
    setHasAutoSaved(false);
    setAutoSaveInProgress(false);
    setProjectSaveAttempted(false);
    setPendingRequests(new Set());
    setFromTranscription(false);
    setTranscriptionFile(null);
    setShowAutoSaveModal(false);
    setTranslationData({
      sourceLanguage: "",
      originalFilePath: "",
      translatedFilePaths: [],
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const retryConnection = async () => {
    setLoadingLanguages(true);
    setError(null);

    try {
      await apiCall("/health");
      setBackendConnected(true);

      const languageData = await apiCall("/languages");
      const languageArray = Object.entries(languageData).map(
        ([code, name]) => ({
          code,
          name,
        }),
      );
      languageArray.sort((a, b) => a.name.localeCompare(b.name));
      setLanguages(languageArray);
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

  const saveAsProject = async (projectData) => {
    if (!backendConnected) {
      setError("Backend not connected. Cannot save project.");
      return;
    }

    // Validate required data before sending

    if (
      !projectData.project_name ||
      projectData.project_name.trim().length === 0
    ) {
      setError("Project name is required");
      return;
    }

    if (
      !projectData.filenames ||
      !Array.isArray(projectData.filenames) ||
      projectData.filenames.length === 0
    ) {
      setError("No files to save");
      return;
    }

    if (
      !projectData.target_languages ||
      !Array.isArray(projectData.target_languages)
    ) {
      setError("Target languages are required");
      return;
    }

    const requestKey = `save_${projectData.project_name}_${JSON.stringify(projectData.filenames)}`;

    if (pendingRequests.has(requestKey)) {
      console.log(" Duplicate save request detected, ignoring...");
      return;
    }

    if (isSavingProject) {
      console.log(" Save already in progress, skipping duplicate request");
      return;
    }

    setPendingRequests((prev) => new Set([...prev, requestKey]));
    setIsSavingProject(true);
    setError(null);

    try {
      // Clean filenames to avoid database constraint errors
      const cleanFilenames = projectData.filenames
        .filter((filename) => filename && filename.trim().length > 0)
        .map((filename) => {
          // If filename is a URL, extract just the filename part
          if (filename.includes("http")) {
            const urlParts = filename.split("/");
            const lastPart = urlParts[urlParts.length - 1];
            return lastPart.split("?")[0]; // Remove query parameters
          }
          return filename;
        })
        .filter((filename) => filename && filename.length <= 255); // Ensure within DB limits

      // Clean original filename
      let cleanOriginalFilename = projectData.original_filename || "";
      if (cleanOriginalFilename.includes("http")) {
        const urlParts = cleanOriginalFilename.split("/");
        const lastPart = urlParts[urlParts.length - 1];
        cleanOriginalFilename = lastPart.split("?")[0];
      }
      if (cleanOriginalFilename.length > 255) {
        cleanOriginalFilename = cleanOriginalFilename.substring(0, 250) + "...";
      }

      const cleanProjectData = {
        project_name: projectData.project_name.trim(),
        description: projectData.description?.trim() || "",
        filenames: cleanFilenames,
        original_filename: cleanOriginalFilename,
        target_languages: projectData.target_languages.filter(
          (lang) => lang && lang.trim().length > 0,
        ),
        is_public: Boolean(projectData.is_public),
        edited_files: projectData.edited_files || {},
        source_language:
          projectData.source_language ||
          translationData.sourceLanguage ||
          "auto",
        original_file_path:
          projectData.original_file_path ||
          translationData.originalFilePath ||
          "",
        translated_file_path:
          projectData.translated_file_path ||
          translationData.translatedFilePaths ||
          [],
      };

      const response = await apiCall("/save-project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cleanProjectData),
      });

      setProjectSaveSuccess({
        projectName: cleanProjectData.project_name,
        projectId: response.project_id,
        fileCount: response.files_saved,
      });

      setShowSaveProjectModal(false);
      setProjectSaved(true);
      setProjectSaveAttempted(true);
      setHasAutoSaved(true);

      setTimeout(() => {
        setProjectSaveSuccess(null);
      }, 5000);
    } catch (err) {
      console.error(" Project save error:", err);
      let errorMessage = err.message;
      if (err.message.includes("422")) {
        errorMessage = `Validation error: ${err.message}. Please check that all required fields are properly filled and files exist.`;
      }
      setError(`Save failed: ${errorMessage}`);
    } finally {
      setIsSavingProject(false);
      setPendingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestKey);
        return newSet;
      });
    }
  };

  return (
    <div
      className={`max-w-4xl mx-auto p-6 min-h-screen transition-colors duration-300 ${
        isDarkMode ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <div
        className={`rounded-xl shadow-lg p-8 transition-colors duration-300 ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        }`}
      >
        <h2
          className={`text-2xl font-bold mb-6 transition-colors duration-300 ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          Subtitle Translation
        </h2>

        {/* Backend Connection Status */}
        {!backendConnected && (
          <div
            className={`mb-6 p-4 rounded-lg border transition-colors duration-300 ${
              isDarkMode
                ? "bg-red-900/20 border-red-800"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-3 bg-red-500"></div>
                <span
                  className={`font-medium transition-colors duration-300 ${
                    isDarkMode ? "text-red-300" : "text-red-800"
                  }`}
                >
                  Azure Translation Service: Disconnected
                </span>
              </div>
              <button
                onClick={retryConnection}
                disabled={loadingLanguages}
                className={`px-4 py-2 rounded-lg text-sm text-white transition-colors duration-300 ${
                  loadingLanguages
                    ? isDarkMode
                      ? "bg-gray-600"
                      : "bg-gray-300"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                {loadingLanguages ? "Connecting..." : "Retry Connection"}
              </button>
            </div>
          </div>
        )}

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

        {/* Setup instructions when backend is not connected */}
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
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-300 ${
            !backendConnected
              ? isDarkMode
                ? "border-gray-600 bg-gray-700 cursor-not-allowed"
                : "border-gray-200 bg-gray-50 cursor-not-allowed"
              : fromTranscription
                ? isDarkMode
                  ? "border-green-600 bg-green-900/20"
                  : "border-green-300 bg-green-50"
                : dragActive
                  ? isDarkMode
                    ? "border-blue-400 bg-blue-900/20"
                    : "border-blue-500 bg-blue-50"
                  : isDarkMode
                    ? "border-gray-600 hover:border-gray-500 bg-gray-800"
                    : "border-gray-300 hover:border-gray-400 bg-white"
          }`}
          onDragEnter={
            backendConnected && !fromTranscription ? handleDrag : undefined
          }
          onDragLeave={
            backendConnected && !fromTranscription ? handleDrag : undefined
          }
          onDragOver={
            backendConnected && !fromTranscription ? handleDrag : undefined
          }
          onDrop={
            backendConnected && !fromTranscription ? handleDrop : undefined
          }
        >
          {fromTranscription ? (
            <>
              <svg
                className="w-12 h-12 mx-auto mb-4 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p
                className={`text-lg mb-2 px-4 font-medium transition-colors duration-300 ${
                  isDarkMode ? "text-green-300" : "text-green-700"
                }`}
              >
                Transcription Ready for Translation
              </p>
              <p
                className={`text-sm mb-2 transition-colors duration-300 ${
                  isDarkMode ? "text-green-400" : "text-green-600"
                }`}
              >
                {transcriptionFile?.filename} (
                {transcriptionFile?.format?.toUpperCase()})
              </p>
              <p
                className={`text-xs mb-4 transition-colors duration-300 ${
                  isDarkMode ? "text-green-500" : "text-green-500"
                }`}
              >
                From: {transcriptionFile?.originalFilename}
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => {
                    setFromTranscription(false);
                    setUploadedFile(null);
                    setTranscriptionFile(null);
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-300"
                >
                  Upload Different File
                </button>
                {onBackToTranscription && (
                  <button
                    onClick={onBackToTranscription}
                    className={`px-4 py-2 border rounded-lg transition-colors duration-300 ${
                      isDarkMode
                        ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Back to Transcription
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <Upload
                className={`w-12 h-12 mx-auto mb-4 transition-colors duration-300 ${
                  backendConnected
                    ? isDarkMode
                      ? "text-gray-400"
                      : "text-gray-400"
                    : isDarkMode
                      ? "text-gray-600"
                      : "text-gray-300"
                }`}
              />
              <p
                className={`text-lg mb-2 px-4 transition-colors duration-300 ${
                  backendConnected
                    ? isDarkMode
                      ? "text-gray-300"
                      : "text-gray-600"
                    : isDarkMode
                      ? "text-gray-500"
                      : "text-gray-400"
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
                className={`text-sm mb-4 transition-colors duration-300 ${
                  backendConnected
                    ? isDarkMode
                      ? "text-gray-400"
                      : "text-gray-400"
                    : isDarkMode
                      ? "text-gray-600"
                      : "text-gray-300"
                }`}
              >
                Supports SRT, VTT formats • Powered by Azure Translator
              </p>
              <button
                onClick={() =>
                  backendConnected && fileInputRef.current?.click()
                }
                disabled={!backendConnected}
                className={`px-6 py-2 rounded-lg transition-colors duration-300 ${
                  backendConnected
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : isDarkMode
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
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
            </>
          )}
        </div>

        {/* Language Selection */}
        {uploadedFile && backendConnected && (
          <div className="mt-8 space-y-6">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3
                  className={`text-lg font-semibold transition-colors duration-300 ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Select Target Languages
                </h3>
                <span
                  className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {targetLanguages.length}/{MAX_SELECTED_LANGUAGES} selected
                </span>
              </div>
              {loadingLanguages ? (
                <p
                  className={`transition-colors duration-300 ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Loading languages...
                </p>
              ) : (
                <MultiSelectDropdown
                  languages={languages}
                  selectedLanguages={targetLanguages}
                  onSelectionChange={setTargetLanguages}
                  disabled={loadingLanguages || !backendConnected}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  maxLanguages={MAX_SELECTED_LANGUAGES}
                  isDarkMode={isDarkMode}
                />
              )}
            </div>
          </div>
        )}

        {/* Translation Progress */}
        {isTranslating && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-2">
              <span
                className={`text-sm transition-colors duration-300 ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {currentTranslatingLanguage || "Processing..."}
              </span>
              <span className="text-sm text-gray-600">
                {Math.round(translationProgress)}%
              </span>
            </div>
            <div
              className={`w-full rounded-full h-2 transition-colors duration-300 ${
                isDarkMode ? "bg-gray-700" : "bg-gray-200"
              }`}
            >
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${translationProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
          {uploadedFile && (
            <button
              onClick={resetComponent}
              className={`px-6 py-2 border rounded-lg w-full sm:w-auto transition-colors duration-300 ${
                isDarkMode
                  ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Reset
            </button>
          )}

          {uploadedFile && backendConnected && (
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <span
                  className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Censor profanity
                </span>
                <ToggleSwitch
                  enabled={censorProfanity}
                  onChange={setCensorProfanity}
                  disabled={isTranslating || loadingLanguages}
                  isDarkMode={isDarkMode}
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
                  className={`px-6 py-2 text-white rounded-lg w-full sm:w-auto transition-colors duration-300 ${
                    targetLanguages.length === 0 ||
                    loadingLanguages ||
                    !backendConnected
                      ? isDarkMode
                        ? "bg-gray-600 cursor-not-allowed"
                        : "bg-gray-300 cursor-not-allowed"
                      : "bg-blue-500 hover:bg-blue-600"
                  }`}
                >
                  Start Translation
                </button>
              )}
            </div>
          )}
        </div>

        {/* Download Results */}
        {translatedFiles.length > 0 && (
          <div
            className={`mt-8 p-4 rounded-lg transition-colors duration-300 ${
              isDarkMode ? "bg-green-900/20" : "bg-green-50"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-2" />
                <span
                  className={`font-medium transition-colors duration-300 ${
                    isDarkMode ? "text-green-300" : "text-green-800"
                  }`}
                >
                  Translation Complete! ({translatedFiles.length} file
                  {translatedFiles.length > 1 ? "s" : ""} ready)
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {!hasAutoSaved && !projectSaved && (
                  <button
                    onClick={() => setShowSaveProjectModal(true)}
                    disabled={isSavingProject}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span>Save as Project</span>
                  </button>
                )}
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
            </div>
            <div className="space-y-2">
              {translatedFiles.map((file) => (
                <div
                  key={file.language}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors duration-300 ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-600"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div
                      className={`font-medium truncate transition-colors duration-300 ${
                        isDarkMode ? "text-gray-200" : "text-gray-700"
                      }`}
                      title={file.filename}
                    >
                      {file.filename}
                    </div>
                    <div
                      className={`text-sm transition-colors duration-300 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      Translated to {file.languageName}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      onClick={() =>
                        previewFile(file.filename, file.languageName)
                      }
                      disabled={loadingPreview}
                      title="Preview"
                      className={`flex items-center space-x-1 px-3 py-1 rounded border transition-colors duration-300 disabled:opacity-50 ${
                        isDarkMode
                          ? "text-green-400 border-green-600 hover:text-green-300 hover:bg-green-900/20"
                          : "text-green-600 border-green-300 hover:text-green-800 hover:bg-green-50"
                      }`}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => downloadFile(file.filename)}
                      title="Download"
                      className={`flex items-center space-x-1 transition-colors duration-300 ${
                        isDarkMode
                          ? "text-blue-400 hover:text-blue-300"
                          : "text-blue-500 hover:text-blue-700"
                      }`}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Project Save Success Message */}
        {projectSaveSuccess && (
          <div
            className={`mt-4 p-4 border rounded-lg transition-colors duration-300 ${
              isDarkMode
                ? "bg-green-900/20 border-green-800"
                : "bg-green-50 border-green-200"
            }`}
          >
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4
                  className={`font-medium transition-colors duration-300 ${
                    isDarkMode ? "text-green-300" : "text-green-800"
                  }`}
                >
                  Project Saved Successfully!
                </h4>
                <p
                  className={`text-sm mt-1 transition-colors duration-300 ${
                    isDarkMode ? "text-green-200" : "text-green-700"
                  }`}
                >
                  Project "{projectSaveSuccess.projectName}" has been saved to
                  Azure Blob Storage with {projectSaveSuccess.fileCount} file
                  {projectSaveSuccess.fileCount > 1 ? "s" : ""}.
                </p>
                <p
                  className={`text-xs mt-1 transition-colors duration-300 ${
                    isDarkMode ? "text-green-400" : "text-green-600"
                  }`}
                >
                  Project ID: {projectSaveSuccess.projectId}
                </p>
              </div>
              <button
                onClick={() => setProjectSaveSuccess(null)}
                className={`transition-colors duration-300 ${
                  isDarkMode
                    ? "text-green-500 hover:text-green-300"
                    : "text-green-400 hover:text-green-600"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Subtitle Preview Section */}
        {showPreview && previewingFile && (
          <div
            ref={previewSectionRef}
            className={`mt-8 p-4 rounded-lg border transition-colors duration-300 ${
              isDarkMode
                ? "bg-gray-800 border-gray-600"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1 min-w-0 pr-4">
                <h3
                  className={`text-lg font-semibold transition-colors duration-300 ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Preview
                </h3>

                <p
                  className={`text-sm truncate transition-colors duration-300 ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                  title={`${previewingFile.filename} - ${previewingFile.languageName}`}
                >
                  {previewingFile.filename} - {previewingFile.languageName}
                </p>
              </div>
              <button
                onClick={closePreview}
                className={`flex-shrink-0 transition-colors duration-300 ${
                  isDarkMode
                    ? "text-gray-500 hover:text-gray-300"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Side by side preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* Original File */}
              <div
                className={`rounded-lg border transition-colors duration-300 ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-600"
                    : "bg-white border-gray-200"
                }`}
              >
                <div
                  className={`px-4 py-2 border-b rounded-t-lg transition-colors duration-300 ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600"
                      : "bg-gray-100 border-gray-200"
                  }`}
                >
                  <h4
                    className={`font-medium flex items-center transition-colors duration-300 ${
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    }`}
                  >
                    <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                    Original (Auto-detected)
                  </h4>
                </div>
                <div className="p-4">
                  {loadingOriginal ? (
                    <div className="flex items-center justify-center h-64">
                      <div
                        className={`transition-colors duration-300 ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        Loading original content...
                      </div>
                    </div>
                  ) : (
                    <div
                      ref={originalPreviewRef}
                      onScroll={(e) =>
                        handleScrollSync(
                          e,
                          isEditing ? editTextareaRef : translatedPreviewRef,
                        )
                      }
                      className="max-h-96 overflow-auto"
                    >
                      <pre
                        className={`text-sm whitespace-pre-wrap font-mono transition-colors duration-300 ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        {originalContent}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {/* Translated File */}
              <div
                className={`rounded-lg border transition-colors duration-300 ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-600"
                    : "bg-white border-gray-200"
                }`}
              >
                <div
                  className={`px-4 py-2 border-b rounded-t-lg transition-colors duration-300 ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600"
                      : "bg-gray-100 border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4
                      className={`font-medium flex items-center transition-colors duration-300 ${
                        isDarkMode ? "text-gray-200" : "text-gray-700"
                      }`}
                    >
                      <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                      Translated ({previewingFile.languageName})
                    </h4>
                    <div className="flex items-center justify-end space-x-4">
                      {isEditing && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={handleUndo}
                            disabled={historyIndex <= 0}
                            className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors duration-300 ${
                              historyIndex <= 0
                                ? isDarkMode
                                  ? "bg-gray-700 text-gray-600 cursor-not-allowed"
                                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : isDarkMode
                                  ? "bg-gray-600 text-gray-200 hover:bg-gray-500"
                                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                            title="Undo (Ctrl+Z)"
                          >
                            <Undo className="w-3 h-3" />
                          </button>
                          <button
                            onClick={handleRedo}
                            disabled={historyIndex >= editHistory.length - 1}
                            className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors duration-300 ${
                              historyIndex >= editHistory.length - 1 // ← CORRECT condition for redo button
                                ? isDarkMode
                                  ? "bg-gray-700 text-gray-600 cursor-not-allowed"
                                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : isDarkMode
                                  ? "bg-gray-600 text-gray-200 hover:bg-gray-500"
                                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                            title="Redo (Ctrl+Shift+Z or Ctrl+Y)"
                          >
                            <Redo className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      <button
                        onClick={isEditing ? cancelEditing : startEditing}
                        disabled={loadingPreview}
                        className={`text-sm flex items-center space-x-1 transition-colors duration-300 ${
                          isDarkMode
                            ? "text-blue-400 hover:text-blue-300"
                            : "text-blue-600 hover:text-blue-800"
                        }`}
                      >
                        {isEditing ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <Edit className="w-4 h-4" />
                        )}
                        <span>{isEditing ? "View" : "Edit"}</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  {loadingPreview ? (
                    <div className="flex items-center justify-center h-64">
                      <div
                        className={`transition-colors duration-300 ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        Loading translated content...
                      </div>
                    </div>
                  ) : isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        ref={editTextareaRef}
                        value={editedContent}
                        onChange={(e) => handleTextChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onScroll={(e) =>
                          handleScrollSync(e, originalPreviewRef)
                        }
                        className={`w-full h-96 p-3 border rounded font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300 ${
                          isDarkMode
                            ? "border-gray-600 bg-gray-800 text-gray-200 focus:border-blue-500"
                            : "border-gray-300 bg-white text-gray-900 focus:border-blue-500"
                        }`}
                        placeholder="Edit your subtitle content here..."
                      />
                      <div
                        className={`text-xs transition-colors duration-300 ${
                          isDarkMode ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        Lines: {editedContent.split("\n").length} | Characters:{" "}
                        {editedContent.length}
                      </div>
                    </div>
                  ) : (
                    <div
                      ref={translatedPreviewRef}
                      onScroll={(e) =>
                        handleScrollSync(
                          e,
                          isEditing ? editTextareaRef : originalPreviewRef,
                        )
                      }
                      className="max-h-96 overflow-auto"
                    >
                      <pre
                        className={`text-sm whitespace-pre-wrap font-mono transition-colors duration-300 ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        {previewContent}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
              <div className="flex items-center space-x-2">
                {isEditing && (
                  <div
                    className={`text-sm px-3 py-1 rounded-full transition-colors duration-300 ${
                      isDarkMode
                        ? "text-orange-300 bg-orange-900/30"
                        : "text-orange-600 bg-orange-50"
                    }`}
                  >
                    Editing Mode
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                {isEditing && !hasAutoSaved && !projectSaved && (
                  <button
                    onClick={() => {
                      setPreviewContent(editedContent);
                      setEditedFiles((prev) => ({
                        ...prev,
                        [previewingFile.filename]: editedContent,
                      }));
                      setShowSaveProjectModal(true);
                    }}
                    disabled={isSaving}
                    className={`flex items-center justify-center space-x-2 px-4 py-2 text-white rounded-lg transition-colors duration-300 ${
                      isSaving
                        ? isDarkMode
                          ? "bg-gray-600"
                          : "bg-gray-400"
                        : "bg-green-500 hover:bg-green-600"
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Project</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    // Always check for edited content first, then edited files, then original
                    const contentToDownload =
                      editedContent || editedFiles[previewingFile.filename];
                    if (contentToDownload) {
                      // Create and download the edited content
                      const blob = new Blob([contentToDownload], {
                        type: "text/plain",
                      });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = previewingFile.filename
                        .replace(".srt", "_edited.srt")
                        .replace(".vtt", "_edited.vtt");
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                    } else {
                      downloadFile(previewingFile.filename);
                    }
                  }}
                  disabled={
                    isEditing &&
                    !editedFiles[previewingFile.filename] &&
                    !editedContent
                  }
                  className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-300 ${
                    isEditing &&
                    !editedFiles[previewingFile.filename] &&
                    !editedContent
                      ? isDarkMode
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {editedContent || editedFiles[previewingFile.filename]
                      ? "Download Edited"
                      : "Download File"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <AutoSaveModal
        isVisible={showAutoSaveModal}
        onAutoSave={handleAutoSaveQuick}
        onCustomize={handleCustomizeSave}
        onCancel={handleDontSave}
        originalFilename={uploadedFile?.name}
        isDarkMode={isDarkMode}
      />

      <SaveProjectModal
        isOpen={showSaveProjectModal}
        onClose={() => {
          setShowSaveProjectModal(false);
          // Reset any errors when closing
          setError(null);
        }}
        onSave={async (projectData) => {
          // Merge modal data with translation data
          const completeProjectData = {
            ...projectData,
            source_language: translationData.sourceLanguage || "auto",
            original_file_path: translationData.originalFilePath || "",
            translated_file_path: translationData.translatedFilePaths || [],
          };

          await saveAsProject(completeProjectData);
        }}
        translatedFiles={translatedFiles}
        originalFilename={uploadedFile?.name || ""}
        targetLanguages={targetLanguages}
        languages={languages}
        isSaving={isSavingProject}
        editedFiles={editedFiles}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default StaticSubtitleUpload;
