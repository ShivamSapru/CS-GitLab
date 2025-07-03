import React, { useState } from "react";
import {
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  Calendar,
  Globe,
<<<<<<< Updated upstream
} from "lucide-react";

=======
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
} from "lucide-react";

import Projects from "./Projects";

// API Configuration
const API_BASE_URL = "http://localhost:8000/api";

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

>>>>>>> Stashed changes
const Library = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLanguage, setFilterLanguage] = useState("all");
  const [sortBy, setSortBy] = useState("date");

<<<<<<< Updated upstream
  // Sample data - replace with real data from your backend
  const [savedTranslations, setSavedTranslations] = useState([
    {
      id: 1,
      filename: "presentation_2024.srt",
      originalLanguage: "English",
      targetLanguage: "Spanish",
      createdAt: "2024-06-10",
      fileSize: "2.5 KB",
      status: "completed",
    },
    {
      id: 2,
      filename: "meeting_notes.vtt",
      originalLanguage: "English",
      targetLanguage: "French",
      createdAt: "2024-06-09",
      fileSize: "1.8 KB",
      status: "completed",
    },
    {
      id: 3,
      filename: "tutorial_video.srt",
      originalLanguage: "Spanish",
      targetLanguage: "German",
      createdAt: "2024-06-08",
      fileSize: "3.2 KB",
      status: "processing",
    },
  ]);
=======
  const originalPreviewRef = useRef(null);
  const translatedPreviewRef = useRef(null);
  const previewSectionRef = useRef(null);
  const editTextareaRef = useRef(null);
  const [viewingProject, setViewingProject] = useState(null);
  const [showProjects, setShowProjects] = useState(false);
>>>>>>> Stashed changes

  const handleDelete = (id) => {
    setSavedTranslations(savedTranslations.filter((item) => item.id !== id));
  };

  const handleDownload = (filename) => {
    // Implement download logic here
    console.log(`Downloading: ${filename}`);
  };

<<<<<<< Updated upstream
  const handlePreview = (filename) => {
    // Implement preview logic here
    console.log(`Previewing: ${filename}`);
=======
  const handleProjectClick = (project) => {
    setViewingProject(project.project_id);
    setShowProjects(true);
  };

  const handleBackToLibrary = () => {
    setShowProjects(false);
    setViewingProject(null);
    // Refresh the library when coming back
    loadProjects();
>>>>>>> Stashed changes
  };

  const filteredTranslations = savedTranslations.filter((item) => {
    const matchesSearch =
      item.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.originalLanguage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.targetLanguage.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterLanguage === "all" ||
      item.targetLanguage.toLowerCase() === filterLanguage.toLowerCase();

    return matchesSearch && matchesFilter;
  });

<<<<<<< Updated upstream
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">
            Translation Library
          </h2>
          <div className="text-sm text-gray-500">
            {filteredTranslations.length} translation
            {filteredTranslations.length !== 1 ? "s" : ""} found
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search translations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Language Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
            >
              <option value="all">All Languages</option>
              <option value="spanish">Spanish</option>
              <option value="french">French</option>
              <option value="german">German</option>
              <option value="chinese">Chinese</option>
            </select>
          </div>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="language">Sort by Language</option>
            <option value="size">Sort by Size</option>
          </select>
        </div>

        {/* Translation List */}
        {filteredTranslations.length === 0 ? (
          <div className="text-center py-12">
            <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No translations found
            </h3>
            <p className="text-gray-500">
              {searchTerm || filterLanguage !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Start by uploading and translating your first subtitle file"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTranslations.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 min-w-0 mb-4 sm:mb-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {item.filename}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          item.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center text-sm text-gray-500 space-x-4">
                      <span className="flex items-center">
                        <Globe className="w-4 h-4 mr-1" />
                        {item.originalLanguage} → {item.targetLanguage}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {item.createdAt}
                      </span>
                      <span>{item.fileSize}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePreview(item.filename)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDownload(item.filename)}
                      disabled={item.status !== "completed"}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
=======
  // Sort projects
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.project_name.localeCompare(b.project_name);
      case "files":
        return b.files_count - a.files_count;
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
        <Projects projectId={viewingProject} onBack={handleBackToLibrary} />
      ) : (
        <div className="max-w-6xl mx-auto p-6">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">
                Translation Library
              </h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={loadProjects}
                  disabled={loading}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  />
                  <span>Refresh</span>
                </button>
                <div className="text-sm text-gray-500">
                  {sortedProjects.length} project
                  {sortedProjects.length !== 1 ? "s" : ""} found
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="text-red-800">
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Language Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={filterLanguage}
                  onChange={(e) => setFilterLanguage(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Loading Projects
                </h3>
                <p className="text-gray-500">
                  Please wait while we fetch your translation projects...
                </p>
              </div>
            ) : sortedProjects.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No projects found
                </h3>
                <p className="text-gray-500">
                  {searchTerm || filterLanguage !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : "Start by uploading and translating your first subtitle file, then save it as a project"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedProjects.map((project) => (
                  <div
                    key={project.project_id}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div
                      className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleProjectClick(project)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1 min-w-0 mb-4 sm:mb-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <FolderOpen className="w-5 h-5 text-blue-500 flex-shrink-0" />
                            <h3 className="text-lg font-medium text-gray-900 truncate">
                              {project.project_name}
                            </h3>
                            <div className="flex items-center space-x-2">
                              {project.is_public && (
                                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full flex items-center space-x-1">
                                  <Globe className="w-3 h-3" />
                                  <span>Public</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {project.description && (
                            <p className="text-sm text-gray-600 mb-2">
                              {project.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center text-sm text-gray-500 space-x-4">
                            <span className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDate(project.created_at)}
                            </span>

                            <span className="flex items-center">
                              <Languages className="w-4 h-4 mr-1" />
                              {project.translations_count} translations
                            </span>
                            {project.languages &&
                              project.languages.length > 0 && (
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                                  {project.languages.join(", ")}
                                </span>
                              )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(project.project_id);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Project"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
>>>>>>> Stashed changes
    </div>
  );
};

export default Library;
