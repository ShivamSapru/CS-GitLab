import React, { useState, useEffect, useRef } from "react";

import {
  Download,
  Eye,
  Trash2,
  Calendar,
  Globe,
  FileText,
  AlertCircle,
  RefreshCw,
  Loader2,
  X,
  Edit,
  Save,
  Undo,
  Redo,
  ArrowLeft,
  Languages,
} from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// API Configuration
const API_BASE_URL = `${BACKEND_URL}/api`;

const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: "include",
    });

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

const Projects = ({
  projectId,
  onBack,
  projectData,
  origin = "library",
  isDarkMode,
  user,
  onShowLogin,
}) => {
  const [project, setProject] = useState(null);
  const [projectFiles, setProjectFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);
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
  const [languages, setLanguages] = useState({});
  const [loadingLanguages, setLoadingLanguages] = useState(false);
  const displayProject = projectData || project;
  const [isOwner, setIsOwner] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  const originalPreviewRef = useRef(null);
  const translatedPreviewRef = useRef(null);
  const previewSectionRef = useRef(null);
  const editTextareaRef = useRef(null);

  useEffect(() => {
    if (projectId) {
      loadProjectDetails();
      loadLanguages();
    }
  }, [projectId]);

  const loadLanguages = async () => {
    try {
      setLoadingLanguages(true);
      const languageData = await apiCall("/languages");
      setLanguages(languageData); // This is now the object format from backend
    } catch (err) {
      console.error("Failed to load languages:", err);
      setLanguages({});
    } finally {
      setLoadingLanguages(false);
    }
  };
  const getLanguageName = (languageCode) => {
    // Backend returns object format: { "am": "Armenian", "az": "Azerbaijani" }
    if (languages && languages[languageCode]) {
      return languages[languageCode];
    }
  };
  const handleDeleteProject = async () => {
    // Check if user is logged in first
    if (!user) {
      if (onShowLogin) {
        onShowLogin();
      }
      return;
    }

    if (!canEdit) {
      setError("You don't have permission to delete this project.");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to delete this entire project? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      await apiCall(`/project/${projectId}`, {
        method: "DELETE",
      });
      // Navigate back to library after deletion
      onBack();
    } catch (err) {
      setError(`Failed to delete project: ${err.message}`);
    }
  };
  const handleDownload = async (filename) => {
    try {
      // Use the new public-access endpoint
      const response = await fetch(
        `${API_BASE_URL}/project/${projectId}/file/${encodeURIComponent(filename)}`,
        { credentials: "include" },
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "This is a private project. Please sign in or contact the owner for access.",
          );
        } else {
          throw new Error(
            `Download failed: ${response.status} ${response.statusText}`,
          );
        }
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
  // Add this debugging to your handlePreview function to help identify the issue:

  const handlePreview = async (filename, targetLanguage, sourceLanguage) => {
    if (!filename) {
      setError("No filename provided for preview");
      return;
    }

    setLoadingPreview(true);
    setLoadingOriginal(true);
    setError(null);

    try {
      // Fetch the translated file content

      // Use the new public-access endpoint
      const translatedResponse = await fetch(
        `${API_BASE_URL}/project/${projectId}/file/${encodeURIComponent(filename)}`,
        { credentials: "include" },
      );

      let translatedContent = "";

      if (translatedResponse.ok) {
        translatedContent = await translatedResponse.text();
      } else {
        console.log(
          "❌ Error fetching translated file:",
          translatedResponse.status,
          translatedResponse.statusText,
        );

        if (translatedResponse.status === 401) {
          throw new Error(
            "This is a private project. Please sign in or contact the owner for access.",
          );
        } else {
          throw new Error(
            `File not available: ${translatedResponse.status} ${translatedResponse.statusText}`,
          );
        }
      }

      setPreviewContent(translatedContent);
      setLoadingPreview(false);

      //  FETCH THE ORIGINAL FILE
      try {
        //  find the original filename from the project files
        const originalFile = projectFiles.find(
          (file) =>
            file.is_original === true ||
            file.target_language === null ||
            file.source_language === sourceLanguage,
        );

        let originalContent = "";

        if (originalFile && originalFile.filename) {
          // Try to fetch the original file using the same endpoint
          const originalResponse = await fetch(
            `${API_BASE_URL}/project/${projectId}/file/${encodeURIComponent(originalFile.filename)}`,
            { credentials: "include" },
          );

          if (originalResponse.ok) {
            originalContent = await originalResponse.text();
          } else {
            console.log(
              "❌ Could not fetch original file from project storage",
            );
            originalContent = "Original file not available for comparison";
          }
        } else {
          console.log("❌ No original file reference found in project files");
          originalContent = "Original file not available for comparison";
        }

        setOriginalContent(originalContent);
        setLoadingOriginal(false);
      } catch (originalError) {
        console.error("❌ Error fetching original file:", originalError);
        setOriginalContent("Could not load original file for comparison");
        setLoadingOriginal(false);
      }

      // Set preview info and show the preview
      setPreviewingFile({
        filename,
        languageName: getLanguageName(targetLanguage) || targetLanguage,
        sourceLanguage: sourceLanguage,
      });
      setShowPreview(true);

      // Scroll to preview section
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
      console.error(" Translation preview error:", err);
      setError(`Preview failed: ${err.message}`);
      setLoadingPreview(false);
      setLoadingOriginal(false);
    }
  };

  // Also, you might need to modify your loadProjectDetails function to properly identify original files
  // Add this logic to your loadProjectDetails function after setting projectFiles:

  const loadProjectDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiCall(`/project/${projectId}/files`);

      setProjectFiles(data.files || []);
      setProject(data.project);

      const isProjectOwner = user && data.project?.is_own_project !== false;
      setIsOwner(isProjectOwner);
      setCanEdit(isProjectOwner);
    } catch (err) {
      setError(`Failed to load project details: ${err.message}`);
      console.error("Error loading project details:", err);
    } finally {
      setLoading(false);
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
    // Check if user is logged in first
    if (!user) {
      if (onShowLogin) {
        onShowLogin();
      }
      return;
    }

    if (!canEdit) {
      setError("You don't have permission to edit this project.");
      return;
    }

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

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const ToggleSwitch = ({
    enabled,
    onChange,
    disabled = false,
    isDarkMode,
  }) => {
    return (
      <button
        type="button"
        onClick={() => !disabled && onChange()}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          disabled
            ? isDarkMode
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-gray-200 cursor-not-allowed"
            : enabled
              ? "bg-green-600"
              : isDarkMode
                ? "bg-gray-600"
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

  const handleTogglePublic = async () => {
    // Check if user is logged in first
    if (!user) {
      if (onShowLogin) {
        onShowLogin();
      }
      return;
    }

    if (!project || !canEdit) {
      setError(
        "You don't have permission to change this project's visibility.",
      );
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/project/${projectId}/toggle-public`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_public: !project.is_public,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to update project visibility",
        );
      }

      // Update the project state locally
      setProject((prev) => ({
        ...prev,
        is_public: !prev.is_public,
      }));
    } catch (err) {
      setError(`Failed to update project visibility: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div
        className={`max-w-6xl mx-auto p-6 min-h-screen transition-colors duration-300 ${
          isDarkMode ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <div
          className={`rounded-xl shadow-lg p-8 transition-colors duration-300 ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          }`}
        >
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-4 animate-spin" />
            <h3
              className={`text-lg font-medium mb-2 transition-colors duration-300 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Loading Project
            </h3>
            <p
              className={`transition-colors duration-300 ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Please wait while we fetch the project details...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`max-w-6xl mx-auto p-6 min-h-screen transition-colors duration-300 ${
        isDarkMode ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <div
        className={`rounded-xl shadow-lg p-8 transition-colors duration-300 ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        }`}
      >
        {/* Header with Back Button */}
        <div className="mb-6">
          {/* Mobile Layout */}
          <div className="flex flex-col space-y-4 sm:hidden">
            <div className="flex items-center justify-between">
              <button
                onClick={onBack}
                className={`flex items-center space-x-2 px-3 py-2 text-sm border rounded-lg transition-colors duration-300 ${
                  isDarkMode
                    ? "text-gray-300 hover:text-gray-100 border-gray-600 hover:bg-gray-700"
                    : "text-gray-600 hover:text-gray-800 border-gray-300 hover:bg-gray-50"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <div className="flex items-center space-x-2">
                <button
                  onClick={loadProjectDetails}
                  disabled={loading}
                  className={`p-2 border rounded-lg disabled:opacity-50 transition-colors duration-300 ${
                    isDarkMode
                      ? "text-gray-300 hover:text-gray-100 border-gray-600 hover:bg-gray-700"
                      : "text-gray-600 hover:text-gray-800 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  />
                </button>
                {/* Only show delete button for logged in owners */}
                {user && canEdit && (
                  <button
                    onClick={handleDeleteProject}
                    className="p-2 text-white bg-red-600 hover:bg-red-700 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Mobile project info */}
            <div>
              <div className="flex flex-col space-y-2">
                <div className="flex items-start space-x-3">
                  <h2
                    className={`text-lg font-bold line-clamp-2 transition-colors duration-300 ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                    title={displayProject?.project_name || "Project Details"}
                  >
                    {displayProject?.project_name || "Project Details"}
                  </h2>
                </div>

                {/* Status indicators below title on mobile */}
                <div className="flex items-center space-x-2 flex-wrap">
                  {/* Show Public label only if user is the owner */}
                  {isOwner &&
                    (project?.is_public ?? displayProject?.is_public) && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full flex items-center space-x-1">
                        <Globe className="w-3 h-3" />
                        <span>Public</span>
                      </span>
                    )}
                  {/* Show owner name only if user is NOT the owner */}
                  {!isOwner && displayProject?.owner_name && (
                    <span
                      className={`px-2 py-1 text-xs rounded-full flex items-center space-x-1 ${
                        isDarkMode
                          ? "bg-purple-900/30 text-purple-300"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      <span>By {displayProject.owner_name}</span>
                    </span>
                  )}
                  {/* Show sign in prompt for non-logged in users */}
                  {!user && (
                    <button
                      onClick={onShowLogin}
                      className={`px-2 py-1 text-xs rounded-full border transition-colors duration-300 ${
                        isDarkMode
                          ? "text-blue-300 border-blue-400 hover:bg-blue-900/20"
                          : "text-blue-600 border-blue-600 hover:bg-blue-50"
                      }`}
                    >
                      Sign in to manage projects
                    </button>
                  )}
                </div>
              </div>

              {project?.description && (
                <p
                  className={`text-sm mt-2 transition-colors duration-300 ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                  title={project.description}
                >
                  {project.description}
                </p>
              )}
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center space-x-4 min-w-0 flex-1">
              <button
                onClick={onBack}
                className={`flex items-center space-x-2 px-3 py-2 text-sm border rounded-lg flex-shrink-0 transition-colors duration-300 ${
                  isDarkMode
                    ? "text-gray-300 hover:text-gray-100 border-gray-600 hover:bg-gray-700"
                    : "text-gray-600 hover:text-gray-800 border-gray-300 hover:bg-gray-50"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>
                  Back to {origin === "profile" ? "Profile" : "Library"}
                </span>
              </button>

              {/* Project title section with better width management */}
              <div className="min-w-0 flex-1 max-w-lg">
                <div className="flex items-center space-x-3">
                  <h2
                    className={`text-xl font-bold truncate transition-colors duration-300 ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                    title={displayProject?.project_name || "Project Details"}
                  >
                    {displayProject?.project_name || "Project Details"}
                  </h2>

                  {/* Status indicators with flex-shrink-0 to prevent squishing */}
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {/* Show Public label only if user is the owner */}
                    {isOwner &&
                      (project?.is_public ?? displayProject?.is_public) && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full flex items-center space-x-1">
                          <Globe className="w-3 h-3" />
                          <span>Public</span>
                        </span>
                      )}
                    {/* Show owner name only if user is NOT the owner */}
                    {!isOwner && displayProject?.owner_name && (
                      <span
                        className={`px-2 py-1 text-xs rounded-full flex items-center space-x-1 ${
                          isDarkMode
                            ? "bg-purple-900/30 text-purple-300"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        <span>By {displayProject.owner_name}</span>
                      </span>
                    )}
                    {/* Show sign in prompt for non-logged in users */}
                    {!user && (
                      <button
                        onClick={onShowLogin}
                        className={`px-2 py-1 text-xs rounded-full border transition-colors duration-300 ${
                          isDarkMode
                            ? "text-blue-300 border-blue-400 hover:bg-blue-900/20"
                            : "text-blue-600 border-blue-600 hover:bg-blue-50"
                        }`}
                      >
                        Sign in to manage projects
                      </button>
                    )}
                  </div>
                </div>

                {/* Description with better truncation */}
                {project?.description && (
                  <p
                    className={`text-sm mt-1 truncate transition-colors duration-300 ${
                      isDarkMode ? "text-gray-300" : "text-gray-600"
                    }`}
                    title={project.description}
                  >
                    {project.description}
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons section */}
            <div className="flex items-center space-x-4 flex-shrink-0">
              <button
                onClick={loadProjectDetails}
                disabled={loading}
                className={`flex items-center space-x-2 px-3 py-2 text-sm border rounded-lg disabled:opacity-50 transition-colors duration-300 ${
                  isDarkMode
                    ? "text-gray-300 hover:text-gray-100 border-gray-600 hover:bg-gray-700"
                    : "text-gray-600 hover:text-gray-800 border-gray-300 hover:bg-gray-50"
                }`}
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                <span>Refresh</span>
              </button>
              {/* Only show delete button for logged in owners */}
              {user && canEdit && (
                <button
                  onClick={handleDeleteProject}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Project</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div
            className={`mb-6 p-4 border rounded-lg transition-colors duration-300 ${
              isDarkMode
                ? "bg-red-900/20 border-red-800"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
              <div
                className={`transition-colors duration-300 ${
                  isDarkMode ? "text-red-300" : "text-red-800"
                }`}
              >
                <div className="font-medium mb-1">Error</div>
                <div className="text-sm">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Project Info and Files Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-8">
              {displayProject && (
                <>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span
                      className={`text-sm transition-colors duration-300 ${
                        isDarkMode ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Created: {formatDate(displayProject.created_at)}
                    </span>
                  </div>

                  {/* Download Original File Button */}
                  <button
                    onClick={() => {
                      // Find the original file from projectFiles
                      const originalFile = projectFiles.find(
                        (file) => file.is_original === true,
                      );
                      if (originalFile) {
                        handleDownload(originalFile.filename);
                      } else {
                        setError("Original file not found for download");
                      }
                    }}
                    className={`flex items-center space-x-2 text-sm transition-colors duration-300 ${
                      isDarkMode
                        ? "text-blue-400 hover:text-blue-300"
                        : "text-blue-600 hover:text-blue-800"
                    }`}
                    title="Download Original File"
                  >
                    <span>Download Original</span>
                    <Download className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Public/Private Toggle - Only show for logged in owners */}
            {displayProject && user && canEdit && (
              <div className="flex items-center space-x-3">
                <span
                  className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? "text-gray-200" : "text-gray-700"
                  }`}
                >
                  {(project?.is_public ?? displayProject?.is_public)
                    ? "Public"
                    : "Private"}
                </span>
                <ToggleSwitch
                  enabled={project?.is_public ?? displayProject?.is_public}
                  onChange={handleTogglePublic}
                  disabled={loading}
                  isDarkMode={isDarkMode}
                />
                <div
                  className={`flex items-center text-xs transition-colors duration-300 ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  <Globe className="w-3 h-3 mr-1" />
                  <span>
                    {(project?.is_public ?? displayProject?.is_public)
                      ? "Visible to everyone"
                      : "Only visible to you"}
                  </span>
                </div>
              </div>
            )}

            {/* Show read-only indicator for non-owners or non-logged in users */}
            {displayProject && (!user || !canEdit) && (
              <div className="flex items-center space-x-3">
                <div
                  className={`px-3 py-1 text-sm rounded-full ${
                    isDarkMode
                      ? "text-gray-300 bg-gray-700"
                      : "text-gray-600 bg-gray-100"
                  }`}
                >
                  {!user ? "Read Only - Sign in to manage" : "Read Only"}
                </div>
              </div>
            )}
          </div>

          {/* Files List */}
          {projectFiles.filter(
            (file) =>
              file.target_language && file.target_language.trim() !== "",
          ).length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p
                className={`transition-colors duration-300 ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                No translated files found in this project
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {projectFiles
                .filter(
                  (file) =>
                    file.target_language && file.target_language.trim() !== "",
                )
                .map((file) => (
                  <div
                    key={file.file_id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors duration-300 ${
                      isDarkMode
                        ? "bg-gray-700 border-gray-600 hover:bg-gray-600"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div
                        className={`text-sm font-medium truncate transition-colors duration-300 ${
                          isDarkMode ? "text-gray-200" : "text-gray-900"
                        }`}
                      >
                        {file.filename}
                      </div>
                      <div
                        className={`flex items-center text-xs space-x-3 mt-1 transition-colors duration-300 ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        <span>{file.file_format.toUpperCase()}</span>
                        <span>{formatFileSize(file.file_size_bytes)}</span>
                        {file.target_language && (
                          <span className="flex items-center">
                            <Languages className="w-3 h-3 mr-1" />
                            {file.source_language} →
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs transition-colors duration-300 ${
                            isDarkMode
                              ? "bg-green-900/30 text-green-300"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {Object.keys(languages).length > 0
                            ? getLanguageName(file.target_language)
                            : file.target_language || "Loading..."}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() =>
                          handlePreview(
                            file.filename,
                            file.target_language,
                            file.source_language,
                          )
                        }
                        className={`p-2 rounded-lg transition-colors duration-300 ${
                          isDarkMode
                            ? "text-blue-400 hover:bg-blue-900/20"
                            : "text-blue-600 hover:bg-blue-50"
                        }`}
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(file.filename)}
                        className={`p-2 rounded-lg transition-colors duration-300 ${
                          isDarkMode
                            ? "text-green-400 hover:bg-green-900/20"
                            : "text-green-600 hover:bg-green-50"
                        }`}
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

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
                  Original ({previewingFile.sourceLanguage || "Unknown"})
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
                    {/* Undo/Redo buttons - closer to Edit/View */}
                    {isEditing && canEdit && (
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
                            historyIndex >= editHistory.length - 1
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

                    {/* Edit/View button - Only show for project owners */}
                    {canEdit && (
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
                    )}
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
                      onScroll={(e) => handleScrollSync(e, originalPreviewRef)}
                      className={`w-full h-96 p-3 border rounded font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300 ${
                        isDarkMode
                          ? "border-gray-600 bg-gray-800 text-gray-200"
                          : "border-gray-300 bg-white text-gray-900"
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
            {/* Left side - Edit status */}
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

            {/* Right side - Action buttons */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
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
                    handleDownload(previewingFile.filename);
                  }
                }}
                className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-300 ${"bg-blue-500 text-white hover:bg-blue-600"}`}
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
  );
};

export default Projects;
