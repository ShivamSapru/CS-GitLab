import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  Calendar,
  Globe,
  FolderOpen,
  FileText,
  AlertCircle,
  RefreshCw,
  Loader2,
  X,
  Edit,
  Save,
  Undo,
  Redo,
  ChevronDown,
  Languages,
  LogIn,
  UserPlus,
} from "lucide-react";

import Projects from "./Projects";

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

const Library = ({ isDarkMode, user, onShowLogin }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLanguage, setFilterLanguage] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectFiles, setProjectFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
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

  // Load projects on component mount
  useEffect(() => {
    loadProjects();
  }, [user]); // Re-load when user changes

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      let endpoint = "/public-projects"; // Default to public projects

      if (user) {
        // If user is logged in, fetch both public and user's own projects
        endpoint = "/all-projects";
      }

      const data = await apiCall(endpoint);
      setProjects(data.projects || []);
    } catch (err) {
      // If the user is not authenticated and we tried all-projects, fall back to public-projects
      if (
        err.message.includes("not authenticated") &&
        endpoint === "/all-projects"
      ) {
        try {
          const fallbackData = await apiCall("/public-projects");
          setProjects(fallbackData.projects || []);
        } catch (fallbackErr) {
          setError(`Failed to load projects: ${fallbackErr.message}`);
          console.error("Error loading projects:", fallbackErr);
        }
      } else {
        setError(`Failed to load projects: ${err.message}`);
        console.error("Error loading projects:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadProjectFiles = async (projectId) => {
    try {
      setLoadingFiles(true);
      setError(null);
      const data = await apiCall(`/project/${projectId}/files`);
      setProjectFiles(data.files || []);
      setSelectedProject(data.project);
    } catch (err) {
      setError(`Failed to load project files: ${err.message}`);
      console.error("Error loading project files:", err);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleDelete = async (projectId) => {
    // Only allow deletion if user is logged in and owns the project
    if (!user) {
      if (onShowLogin) {
        onShowLogin();
      }
      return;
    }

    if (
      !confirm(
        "Are you sure you want to delete this project? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      await apiCall(`/project/${projectId}`, {
        method: "DELETE",
      });

      // Reload projects after deletion
      await loadProjects();

      // Clear selected project if it was deleted
      if (selectedProject?.project_id === projectId) {
        setSelectedProject(null);
        setProjectFiles([]);
      }
    } catch (err) {
      setError(`Failed to delete project: ${err.message}`);
    }
  };

  const handleDownload = async (filename) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/download-subtitle?filename=${encodeURIComponent(filename)}`,
        { credentials: "include" },
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
      const translatedResponse = await fetch(
        `${API_BASE_URL}/download-subtitle?filename=${encodeURIComponent(filename)}`,
        { credentials: "include" },
      );

      if (!translatedResponse.ok) {
        const errorData = await translatedResponse.json();
        throw new Error(errorData.error || "Preview failed");
      }

      const translatedContent = await translatedResponse.text();
      setPreviewContent(translatedContent);
      setLoadingPreview(false);

      // Fetch original content from the project
      if (selectedProject?.project_id) {
        try {
          const originalResponse = await fetch(
            `${API_BASE_URL}/project/${selectedProject.project_id}/original`,
            { credentials: "include" },
          );

          if (originalResponse.ok) {
            const originalData = await originalResponse.json();
            setOriginalContent(originalData.original_content);
            setLoadingOriginal(false);
          } else {
            // Handle case where original file doesn't exist (older projects)
            const errorData = await originalResponse.json();
            console.log("Original file not found:", errorData);

            setOriginalContent(
              `Original Content Not Available\n\n` +
                `This project was created before original file storage was implemented.\n\n` +
                `Project Details:\n` +
                `• File: ${filename}\n` +
                `• Source Language: ${sourceLanguage || "Auto-detected"}\n` +
                `• Target Language: ${targetLanguage}\n` +
                `• Status: Translation completed\n\n` +
                `Note: New projects will include original content for comparison.`,
            );
            setLoadingOriginal(false);
          }
        } catch (originalError) {
          console.error("Error fetching original content:", originalError);
          setOriginalContent(
            `Error Loading Original Content\n\n` +
              `Could not retrieve the original subtitle file.\n\n` +
              `Error: ${originalError.message}\n\n` +
              `You can still view and edit the translated content on the right.`,
          );
          setLoadingOriginal(false);
        }
      } else {
        setOriginalContent(
          `No Project Selected\n\n` +
            `Cannot load original content without project context.\n\n` +
            `Please select a project to view original files.`,
        );
        setLoadingOriginal(false);
      }

      // Set preview file info
      const languageName = targetLanguage || "Unknown";
      setPreviewingFile({
        filename,
        languageName,
        targetLanguage,
        sourceLanguage,
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
      setError(`Preview failed: ${err.message}`);
      setLoadingPreview(false);
      setLoadingOriginal(false);
    }
  };

  // Add all the preview-related functions from StaticSubtitleUpload:
  const handleScrollSync = (e, targetRef) => {
    if (targetRef.current) {
      targetRef.current.scrollTop = e.target.scrollTop;
      targetRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  const closePreview = () => {
    setShowPreview(false);
    setPreviewingFile(null);
    setPreviewContent("");
    setOriginalContent("");
    setLoadingOriginal(false);
    setIsEditing(false);
    setEditedContent("");
    setIsSaving(false);
  };

  const startEditing = () => {
    // Only allow editing if user is logged in
    if (!user) {
      if (onShowLogin) {
        onShowLogin();
      }
      return;
    }

    setEditedContent(previewContent);
    setIsEditing(true);
    initializeEditHistory(previewContent);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedContent("");
    setEditHistory([]);
    setHistoryIndex(-1);
    if (translatedPreviewRef.current) {
      translatedPreviewRef.current.scrollTop = 0;
    }
  };

  const saveEditedFile = async () => {
    if (!previewingFile) {
      setError("Cannot save: No file selected.");
      return;
    }

    if (!user) {
      if (onShowLogin) {
        onShowLogin();
      }
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Update the preview content to match edited content
      setPreviewContent(editedContent);

      // Mark this file as edited and store the edited content
      setEditedFiles((prev) => ({
        ...prev,
        [previewingFile.filename]: editedContent,
      }));

      setIsEditing(false);
      setEditedContent("");
    } catch (err) {
      setError(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const downloadEditedFile = async (filename) => {
    const editedContent = editedFiles[filename];
    if (!editedContent) {
      setError("No edited content found for this file.");
      return;
    }

    try {
      const blob = new Blob([editedContent], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename
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

  const originalPreviewRef = useRef(null);
  const translatedPreviewRef = useRef(null);
  const previewSectionRef = useRef(null);
  const editTextareaRef = useRef(null);
  const [viewingProject, setViewingProject] = useState(null);
  const [showProjects, setShowProjects] = useState(false);

  const handleProjectClick = (project) => {
    setViewingProject(project.project_id);
    setShowProjects(true);
  };

  const handleBackToLibrary = () => {
    setShowProjects(false);
    setViewingProject(null);
    // Refresh the library when coming back
    loadProjects();
  };

  // Get unique languages from all projects for filter
  const getUniqueLanguages = () => {
    const languages = new Set();
    projects.forEach((project) => {
      project.languages?.forEach((lang) => languages.add(lang));
    });
    return Array.from(languages).sort();
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.languages?.some((lang) =>
        lang.toLowerCase().includes(searchTerm.toLowerCase()),
      );

    const matchesFilter =
      filterLanguage === "all" || project.languages?.includes(filterLanguage);

    return matchesSearch && matchesFilter;
  });

  // Sort projects
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.project_name.localeCompare(b.project_name);
      case "files":
        return b.files_count - a.files_count;
      case "translations":
        return b.translations_count - a.translations_count;
      default: // date
        return new Date(b.created_at) - new Date(a.created_at);
    }
  });

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

  return (
    <div>
      {showProjects ? (
        <Projects
          projectId={viewingProject}
          projectData={projects.find((p) => p.project_id === viewingProject)}
          onBack={handleBackToLibrary}
          origin="library"
          isDarkMode={isDarkMode}
          user={user}
          onShowLogin={onShowLogin}
        />
      ) : (
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div className="flex-1">
                <h2
                  className={`text-2xl font-bold mb-2 transition-colors duration-300 ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  <span className="flex items-center">
                    <div
                      className={`w-1 h-8 rounded-full mr-3 bg-gradient-to-b ${
                        isDarkMode
                          ? "from-purple-600 via-purple-700 to-violet-800"
                          : "from-purple-500 via-purple-600 to-violet-600"
                      }`}
                    ></div>
                    Translation Library
                  </span>
                </h2>
                {!user && (
                  <div
                    className={`flex items-center space-x-2 text-sm transition-colors duration-300 ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    <span>Viewing public projects only.</span>
                    <button
                      onClick={onShowLogin}
                      className="text-purple-500 hover:text-purple-600 font-medium underline"
                    >
                      Sign in
                    </button>
                    <span>to see your projects</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                {!user && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={onShowLogin}
                      className={`flex items-center space-x-2 px-3 py-2 text-sm border rounded-lg transition-colors duration-300 ${
                        isDarkMode
                          ? "text-purple-400 border-purple-400 hover:bg-purple-400/10"
                          : "text-purple-600 border-purple-600 hover:bg-purple-50"
                      }`}
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Sign In</span>
                    </button>
                  </div>
                )}
                <button
                  onClick={loadProjects}
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
                <div
                  className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {sortedProjects.length} project
                  {sortedProjects.length !== 1 ? "s" : ""} found
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

            {/* Search and Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-300 ${
                    isDarkMode
                      ? "border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400"
                      : "border-gray-300 bg-white text-gray-900 placeholder-gray-500"
                  }`}
                />
              </div>

              {/* Language Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={filterLanguage}
                  onChange={(e) => setFilterLanguage(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 appearance-none transition-colors duration-300 ${
                    isDarkMode
                      ? "border-gray-600 bg-gray-700 text-gray-200"
                      : "border-gray-300 bg-white text-gray-900"
                  }`}
                >
                  <option value="all">All Languages</option>
                  {getUniqueLanguages().map((langName) => (
                    <option key={langName} value={langName}>
                      {langName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-300 ${
                  isDarkMode
                    ? "border-gray-600 bg-gray-700 text-gray-200"
                    : "border-gray-300 bg-white text-gray-900"
                }`}
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="files">Sort by File Count</option>
                <option value="translations">Sort by Translations</option>
              </select>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 text-purple-500 mx-auto mb-4 animate-spin" />
                <h3
                  className={`text-lg font-medium mb-2 transition-colors duration-300 ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Loading Projects
                </h3>
                <p
                  className={`transition-colors duration-300 ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Please wait while we fetch {user ? "your" : "public"}{" "}
                  translation projects...
                </p>
              </div>
            ) : sortedProjects.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3
                  className={`text-lg font-medium mb-2 transition-colors duration-300 ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  No projects found
                </h3>
                <p
                  className={`mb-4 transition-colors duration-300 ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {searchTerm || filterLanguage !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : user
                      ? "Start by uploading and translating your first subtitle file, then save it as a project"
                      : "No public projects available at the moment"}
                </p>
                {!user && (
                  <div className="space-y-2">
                    <p
                      className={`text-sm transition-colors duration-300 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      Want to create and share your own projects?
                    </p>
                    <button
                      onClick={onShowLogin}
                      className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-300 ${
                        isDarkMode
                          ? "bg-gradient-to-r from-purple-600 via-purple-700 to-violet-800 text-white hover:opacity-90"
                          : "bg-gradient-to-r from-purple-500 via-purple-600 to-violet-600 text-white hover:opacity-90"
                      }`}
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Get Started</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {sortedProjects.map((project) => (
                  <div
                    key={project.project_id}
                    className={`border rounded-lg overflow-hidden hover:shadow-md transition-all duration-300 ${
                      isDarkMode ? "border-gray-600" : "border-gray-200"
                    }`}
                  >
                    <div
                      className={`p-4 cursor-pointer transition-colors duration-300 ${
                        isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"
                      }`}
                      onClick={() => handleProjectClick(project)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1 min-w-0 mb-4 sm:mb-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <div
                              className={`w-2 h-2 rounded-full bg-gradient-to-r ${
                                isDarkMode
                                  ? "from-purple-600 via-purple-700 to-violet-800"
                                  : "from-purple-500 via-purple-600 to-violet-600"
                              }`}
                            ></div>
                            <h3
                              className={`text-lg font-medium truncate transition-colors duration-300 ${
                                isDarkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {project.project_name}
                            </h3>
                            <div className="flex items-center space-x-2">
                              {project.is_public && (
                                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full flex items-center space-x-1">
                                  <Globe className="w-3 h-3" />
                                  <span>Public</span>
                                </span>
                              )}
                              {/* Show if it's someone else's project */}
                              {!project.is_own_project && (
                                <span
                                  className={`px-2 py-1 text-xs rounded-full flex items-center space-x-1 ${
                                    isDarkMode
                                      ? "bg-purple-900/30 text-purple-300"
                                      : "bg-purple-100 text-purple-800"
                                  }`}
                                >
                                  <span>
                                    By {project.owner_name || "Another User"}
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>

                          {project.description && (
                            <p
                              className={`text-sm mb-2 transition-colors duration-300 ${
                                isDarkMode ? "text-gray-300" : "text-gray-600"
                              }`}
                            >
                              {project.description}
                            </p>
                          )}

                          <div
                            className={`flex flex-wrap items-center text-sm space-x-4 transition-colors duration-300 ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            <span className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDate(project.created_at)}
                            </span>

                            {project.languages &&
                              project.languages.length > 0 && (
                                <span className="flex items-center">
                                  <Languages className="w-4 h-4 mr-1" />
                                  <span
                                    className={`text-xs px-2 py-1 rounded-full transition-colors duration-300 ${
                                      isDarkMode
                                        ? "bg-purple-900/20 text-purple-300 border border-purple-700"
                                        : "bg-purple-50 text-purple-700 border border-purple-200"
                                    }`}
                                  >
                                    {/* Display source language with arrow */}
                                    {project.source_language && (
                                      <>
                                        <span className="font-medium">
                                          {project.source_language}
                                        </span>
                                        <span className="mx-1 opacity-70">
                                          →
                                        </span>
                                      </>
                                    )}
                                    {/* Display target languages */}
                                    {project.languages.length > 2
                                      ? `${project.languages.slice(0, 2).join(", ")}...`
                                      : project.languages.join(", ")}
                                  </span>
                                </span>
                              )}
                          </div>
                        </div>

                        {/* Action Buttons - Only show delete for own projects */}
                        <div className="flex items-center space-x-2">
                          {project.is_own_project && user && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(project.project_id);
                              }}
                              className={`p-2 text-red-600 rounded-lg transition-colors duration-300 ${
                                isDarkMode
                                  ? "hover:bg-red-900/20"
                                  : "hover:bg-red-50"
                              }`}
                              title="Delete Project"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          {/* Show read-only indicator for other users' projects */}
                          {!project.is_own_project && (
                            <div
                              className={`px-2 py-1 text-xs rounded transition-colors duration-300 ${
                                isDarkMode
                                  ? "text-gray-400 bg-gray-700"
                                  : "text-gray-500 bg-gray-100"
                              }`}
                            ></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                <span className="flex items-center">
                  <div
                    className={`w-1 h-6 rounded-full mr-3 bg-gradient-to-b ${
                      isDarkMode
                        ? "from-purple-600 via-purple-700 to-violet-800"
                        : "from-purple-500 via-purple-600 to-violet-600"
                    }`}
                  ></div>
                  Preview
                </span>
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
                    <span
                      className={`w-3 h-3 rounded-full mr-2 bg-gradient-to-r ${
                        isDarkMode
                          ? "from-purple-600 to-violet-800"
                          : "from-purple-500 to-violet-600"
                      }`}
                    ></span>
                    Translated ({previewingFile.languageName})
                  </h4>
                  <div className="flex items-center space-x-2">
                    {!isEditing ? (
                      <button
                        onClick={startEditing}
                        disabled={loadingPreview || !user}
                        className={`text-sm flex items-center space-x-1 transition-colors duration-300 ${
                          !user
                            ? isDarkMode
                              ? "text-gray-600 cursor-not-allowed"
                              : "text-gray-400 cursor-not-allowed"
                            : isDarkMode
                              ? "text-purple-400 hover:text-purple-300"
                              : "text-purple-600 hover:text-purple-800"
                        }`}
                        title={!user ? "Sign in to edit files" : "Edit"}
                      >
                        <Edit className="w-4 h-4" />
                        <span>{!user ? "Sign in to Edit" : "Edit"}</span>
                      </button>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={saveEditedFile}
                          disabled={isSaving}
                          className={`text-sm flex items-center space-x-1 transition-colors duration-300 ${
                            isDarkMode
                              ? "text-green-400 hover:text-green-300"
                              : "text-green-600 hover:text-green-800"
                          }`}
                        >
                          <Save className="w-4 h-4" />
                          <span>{isSaving ? "Saving..." : "Save"}</span>
                        </button>
                        <button
                          onClick={cancelEditing}
                          disabled={isSaving}
                          className={`text-sm flex items-center space-x-1 transition-colors duration-300 ${
                            isDarkMode
                              ? "text-gray-400 hover:text-gray-300"
                              : "text-gray-600 hover:text-gray-800"
                          }`}
                        >
                          <X className="w-4 h-4" />
                          <span>Cancel</span>
                        </button>
                      </div>
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
                    {/* Undo/Redo buttons */}
                    <div className="flex items-center space-x-2 mb-2">
                      <button
                        onClick={handleUndo}
                        disabled={historyIndex <= 0}
                        className={`flex items-center space-x-1 px-3 py-1 rounded text-sm transition-colors duration-300 ${
                          historyIndex <= 0
                            ? isDarkMode
                              ? "bg-gray-700 text-gray-600 cursor-not-allowed"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : isDarkMode
                              ? "bg-purple-800/40 text-purple-200 hover:bg-purple-700/40"
                              : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                        }`}
                        title="Undo (Ctrl+Z)"
                      >
                        <Undo className="w-4 h-4" />
                        <span>Undo</span>
                      </button>
                      <button
                        onClick={handleRedo}
                        disabled={historyIndex >= editHistory.length - 1}
                        className={`flex items-center space-x-1 px-3 py-1 rounded text-sm transition-colors duration-300 ${
                          historyIndex >= editHistory.length - 1
                            ? isDarkMode
                              ? "bg-gray-700 text-gray-600 cursor-not-allowed"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : isDarkMode
                              ? "bg-purple-800/40 text-purple-200 hover:bg-purple-700/40"
                              : "bg-purple-100 text-purple-700 hover:bg-purple-200"
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
                      onScroll={(e) => handleScrollSync(e, originalPreviewRef)}
                      className={`w-full h-96 p-3 border rounded font-mono text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-300 ${
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
                  Editing
                </div>
              )}
              {!user && (
                <div
                  className={`text-sm px-3 py-1 rounded-full transition-colors duration-300 ${
                    isDarkMode
                      ? "text-purple-300 bg-purple-900/30"
                      : "text-purple-600 bg-purple-50"
                  }`}
                >
                  Read Only - Sign in to edit
                </div>
              )}
            </div>

            {/* Right side - Action buttons */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <button
                onClick={() => {
                  if (editedFiles[previewingFile.filename]) {
                    downloadEditedFile(previewingFile.filename);
                  } else {
                    handleDownload(previewingFile.filename);
                  }
                }}
                disabled={isEditing}
                className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-300 ${
                  isEditing
                    ? isDarkMode
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : isDarkMode
                      ? "bg-gradient-to-r from-purple-600 via-purple-700 to-violet-800 text-white hover:opacity-90"
                      : "bg-gradient-to-r from-purple-500 via-purple-600 to-violet-600 text-white hover:opacity-90"
                }`}
              >
                <Download className="w-4 h-4" />
                <span>
                  {isEditing
                    ? "Finish Editing First"
                    : editedFiles[previewingFile.filename]
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

export default Library;
