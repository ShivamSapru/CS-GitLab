import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Lock,
  Globe,
  Bell,
  Shield,
  Edit,
  Save,
  X,
  Camera,
  FolderOpen,
  Calendar,
  Languages,
  Trash2,
  Eye,
  AlertCircle,
  RefreshCw,
  Loader2,
  Settings,
} from "lucide-react";
import Projects from "./Projects";
import ChangePasswordModal from "./ChangePasswordModal";

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

const Profile = ({ isDarkMode, onLogout, onShowLogin }) => {
  const [activeTab, setActiveTab] = useState("profile");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: "",
    email: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Projects state
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [viewingProject, setViewingProject] = useState(null);
  const [showProjectDetail, setShowProjectDetail] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  useEffect(() => {
    if (activeTab === "projects") {
      loadProjects();
    }
  }, [activeTab]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${BACKEND_URL}/me`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to load user profile");
      }

      const userData = await response.json();
      setUser(userData);
      setEditForm({
        display_name: userData.display_name || "", // Make sure this matches your user object structure
        email: userData.email || "",
      });
    } catch (err) {
      setError(`Failed to load profile: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      setError(null);
      const data = await apiCall("/user-projects");
      setProjects(data.projects || []);
    } catch (err) {
      setError(`Failed to load projects: ${err.message}`);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      display_name: user?.display_name || "", // Changed from 'name' to 'display_name'
      email: user?.email || "",
    });
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // You'll need to implement this endpoint on your backend
      const response = await fetch(`${BACKEND_URL}/api/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
      setIsEditing(false);
    } catch (err) {
      setError(`Failed to update profile: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (passwords) => {
    try {
      setIsChangingPassword(true);
      setError(null);
      await apiCall("/profile/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwords),
      });
      setShowPasswordModal(false);
    } catch (err) {
      setError(`Password change failed: ${err.message}`);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleProjectClick = (project) => {
    setViewingProject(project.project_id);
    setShowProjectDetail(true);
  };

  const handleBackToProfile = () => {
    setShowProjectDetail(false);
    setViewingProject(null);
    // Refresh projects when coming back
    loadProjects();
  };

  const handleDeleteProject = async (projectId, e) => {
    e.stopPropagation();

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
      loadProjects();
    } catch (err) {
      setError(`Failed to delete project: ${err.message}`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString();
  };

  const tabs = [
    { id: "profile", name: "Profile Settings", icon: User },
    { id: "projects", name: "My Projects", icon: FolderOpen },
    { id: "security", name: "Security", icon: Shield },
    { id: "notifications", name: "Notifications", icon: Bell },
  ];

  if (showProjectDetail) {
    return (
      <Projects
        projectId={viewingProject}
        onBack={handleBackToProfile}
        origin="profile"
        isDarkMode={isDarkMode}
        user={user}
        onShowLogin={onShowLogin}
      />
    );
  }

  return (
    <div
      className={`max-w-6xl mx-auto p-6 min-h-screen transition-colors duration-300 ${
        isDarkMode ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onPasswordChange={handlePasswordChange}
        isChanging={isChangingPassword}
        isDarkMode={isDarkMode}
      />
      <div
        className={`rounded-xl shadow-lg overflow-hidden transition-colors duration-300 ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-8">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {user?.display_name || user?.email || "User Profile"}
              </h1>
              <p className="text-blue-100">
                Manage your account settings and preferences
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          className={`border-b transition-colors duration-300 ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-300 ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : isDarkMode
                        ? "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4" />
                    <span>{tab.name}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Error Display */}
        {error && (
          <div
            className={`m-6 p-4 border rounded-lg transition-colors duration-300 ${
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

        {/* Tab Content */}
        <div className="p-6">
          {/* Profile Settings Tab */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div>
                <h2
                  className={`text-lg font-medium mb-4 transition-colors duration-300 ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Personal Information
                </h2>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin mr-2" />
                    <span
                      className={`transition-colors duration-300 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Loading profile...
                    </span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Profile Picture */}
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-300 ${
                          isDarkMode ? "bg-gray-600" : "bg-gray-200"
                        }`}
                      >
                        <User className="w-8 h-8 text-gray-500" />
                      </div>
                      <button
                        className={`flex items-center space-x-2 px-3 py-2 border rounded-lg transition-colors duration-300 ${
                          isDarkMode
                            ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                            : "border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <Camera className="w-4 h-4" />
                        <span>Change Photo</span>
                      </button>
                    </div>

                    {/* Name Field */}
                    <div>
                      <label
                        className={`block text-sm font-medium mb-1 transition-colors duration-300 ${
                          isDarkMode ? "text-gray-200" : "text-gray-700"
                        }`}
                      >
                        Display Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.display_name}
                          onChange={
                            (e) =>
                              setEditForm({
                                ...editForm,
                                display_name: e.target.value,
                              }) // Changed field name
                          }
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300 ${
                            isDarkMode
                              ? "border-gray-600 bg-gray-700 text-gray-200"
                              : "border-gray-300 bg-white text-gray-900"
                          }`}
                        />
                      ) : (
                        <div
                          className={`px-3 py-2 border rounded-lg transition-colors duration-300 ${
                            isDarkMode
                              ? "bg-gray-700 border-gray-600 text-gray-200"
                              : "bg-gray-50 border-gray-200 text-gray-700"
                          }`}
                        >
                          {user?.display_name || "Not set"}
                        </div>
                      )}
                    </div>

                    {/* Email Field */}
                    <div>
                      <label
                        className={`block text-sm font-medium mb-1 transition-colors duration-300 ${
                          isDarkMode ? "text-gray-200" : "text-gray-700"
                        }`}
                      >
                        Email Address
                      </label>
                      {isEditing ? (
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) =>
                            setEditForm({ ...editForm, email: e.target.value })
                          }
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300 ${
                            isDarkMode
                              ? "border-gray-600 bg-gray-700 text-gray-200"
                              : "border-gray-300 bg-white text-gray-900"
                          }`}
                        />
                      ) : (
                        <div
                          className={`px-3 py-2 border rounded-lg transition-colors duration-300 ${
                            isDarkMode
                              ? "bg-gray-700 border-gray-600 text-gray-200"
                              : "bg-gray-50 border-gray-200 text-gray-700"
                          }`}
                        >
                          {user?.email || "Not set"}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {!isEditing ? (
                          <button
                            onClick={handleEdit}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                          >
                            <Edit className="w-4 h-4" />
                            <span>Edit Profile</span>
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={handleSaveProfile}
                              disabled={isSaving}
                              className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                            >
                              <Save className="w-4 h-4" />
                              <span>
                                {isSaving ? "Saving..." : "Save Changes"}
                              </span>
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={isSaving}
                              className={`flex items-center space-x-2 px-4 py-2 border rounded-lg transition-colors duration-300 ${
                                isDarkMode
                                  ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              <X className="w-4 h-4" />
                              <span>Cancel</span>
                            </button>
                          </>
                        )}
                      </div>

                      {/* Logout Button */}
                      <button
                        onClick={onLogout}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* My Projects Tab */}
          {activeTab === "projects" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2
                  className={`text-lg font-medium transition-colors duration-300 ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  My Projects ({projects.length})
                </h2>
                <button
                  onClick={loadProjects}
                  disabled={loadingProjects}
                  className={`flex items-center space-x-2 px-3 py-2 text-sm border rounded-lg disabled:opacity-50 transition-colors duration-300 ${
                    isDarkMode
                      ? "text-gray-300 hover:text-gray-100 border-gray-600 hover:bg-gray-700"
                      : "text-gray-600 hover:text-gray-800 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loadingProjects ? "animate-spin" : ""}`}
                  />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingProjects ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-4 animate-spin" />
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
                    Please wait while we fetch your projects...
                  </p>
                </div>
              ) : projects.length === 0 ? (
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
                    className={`transition-colors duration-300 ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    Start by uploading and translating your first subtitle file,
                    then save it as a project
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((project) => (
                    <div
                      key={project.project_id}
                      onClick={() => handleProjectClick(project)}
                      className={`border rounded-lg p-6 hover:shadow-md transition-all duration-300 cursor-pointer group ${
                        isDarkMode
                          ? "bg-gray-800 border-gray-600 hover:bg-gray-750"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <FolderOpen className="w-5 h-5 text-blue-500 flex-shrink-0" />
                            <h3
                              className={`text-lg font-medium truncate group-hover:text-blue-600 transition-colors duration-300 ${
                                isDarkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {project.project_name}
                            </h3>
                          </div>

                          {project.is_public && (
                            <span className="inline-flex items-center space-x-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full mb-2">
                              <Globe className="w-3 h-3" />
                              <span>Public</span>
                            </span>
                          )}
                        </div>

                        <button
                          onClick={(e) =>
                            handleDeleteProject(project.project_id, e)
                          }
                          className={`opacity-0 group-hover:opacity-100 p-1 text-red-600 rounded transition-all duration-300 ${
                            isDarkMode
                              ? "hover:bg-red-900/20"
                              : "hover:bg-red-50"
                          }`}
                          title="Delete Project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {project.description && (
                        <p
                          className={`text-sm mb-3 line-clamp-2 transition-colors duration-300 ${
                            isDarkMode ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                          {project.description}
                        </p>
                      )}

                      <div
                        className={`space-y-2 text-sm transition-colors duration-300 ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(project.created_at)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center">
                            <Languages className="w-4 h-4 mr-1" />
                            {project.translations_count} translations
                          </span>
                        </div>

                        {project.languages && project.languages.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {project.languages
                              .slice(0, 3)
                              .map((lang, index) => (
                                <span
                                  key={index}
                                  className="text-xs bg-gray-100 px-2 py-1 rounded-full"
                                >
                                  {lang}
                                </span>
                              ))}
                            {project.languages.length > 3 && (
                              <span
                                className={`text-xs px-2 py-1 rounded-full transition-colors duration-300 ${
                                  isDarkMode
                                    ? "bg-gray-600 text-gray-200"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                +{project.languages.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <h2
                className={`text-lg font-medium transition-colors duration-300 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Security Settings
              </h2>

              <div className="space-y-4">
                <div
                  className={`border rounded-lg p-4 transition-colors duration-300 ${
                    isDarkMode ? "border-gray-600" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3
                        className={`font-medium transition-colors duration-300 ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        Password
                      </h3>

                      <p
                        className={`text-sm transition-colors duration-300 ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        Change your account password
                      </p>
                    </div>
                    <button
                      onClick={() => setShowPasswordModal(true)}
                      className={`px-4 py-2 border rounded-lg transition-colors duration-300 ${
                        isDarkMode
                          ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Change Password
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <h2
                className={`text-lg font-medium transition-colors duration-300 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Notification Preferences
              </h2>

              <div className="space-y-4">
                <div
                  className={`border rounded-lg p-4 transition-colors duration-300 ${
                    isDarkMode ? "border-gray-600" : "border-gray-200"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3
                          className={`font-medium transition-colors duration-300 ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          Email Notifications
                        </h3>
                        <p
                          className={`text-sm transition-colors duration-300 ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          Receive updates about your translations via email
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          defaultChecked
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3
                          className={`font-medium transition-colors duration-300 ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          Project Updates
                        </h3>
                        <p
                          className={`text-sm transition-colors duration-300 ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          Get notified when your translations are completed
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          defaultChecked
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
