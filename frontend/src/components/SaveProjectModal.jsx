import React, { useState } from "react";
import { Save, X, FolderPlus, AlertCircle, Check } from "lucide-react";

const SaveProjectModal = ({
  isOpen,
  onClose,
  onSave,
  translatedFiles,
  originalFilename,
  targetLanguages,
  languages,
  isSaving,
  editedFiles,
}) => {
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const [isPublic, setIsPublic] = useState(false);

  const handleSave = () => {
    if (!projectName.trim()) {
      setError("Project name is required");
      return;
    }

    if (projectName.length < 3) {
      setError("Project name must be at least 3 characters long");
      return;
    }

    setError("");

    const projectData = {
      project_name: projectName.trim(),
      description: description.trim(),
      filenames: translatedFiles.map((file) => file.filename),
      original_filename: originalFilename,
      target_languages: targetLanguages,
      is_public: isPublic,
      edited_files: editedFiles || {},
    };

    onSave(projectData);
  };

  const handleClose = () => {
    if (!isSaving) {
      setProjectName("");
      setDescription("");
      setError("");

      setIsPublic(false);

      onClose();
    }
  };

  const getLanguageNames = () => {
    return targetLanguages
      .map((code) => {
        const lang = languages.find((l) => l.code === code);
        return lang ? lang.name : code;
      })
      .join(", ");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FolderPlus className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900">
              Save as Project
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Project Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Project Summary</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>
                <span className="font-medium">Original File:</span>{" "}
                {originalFilename}
              </p>
              <p>
                <span className="font-medium">Languages:</span>{" "}
                {getLanguageNames()}
              </p>
              <p>
                <span className="font-medium">Files to Save:</span>{" "}
                {translatedFiles.length}
              </p>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-red-800 text-sm">{error}</div>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Name *
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                disabled={isSaving}
                placeholder="Enter project name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                maxLength={100}
              />
              <div className="text-xs text-gray-500 mt-1">
                {projectName.length}/100 characters
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSaving}
                placeholder="Add a description for your project..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
                maxLength={500}
              />
              <div className="text-xs text-gray-500 mt-1">
                {description.length}/500 characters
              </div>
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                disabled={isSaving}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:cursor-not-allowed"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700">
                  Make this project public
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  Public projects can be viewed and downloaded by other users
                </p>
              </div>
            </label>
          </div>

          {/* Files List */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Files to be saved:
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {translatedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 text-sm"
                >
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span
                    className="text-gray-600 truncate"
                    title={file.filename}
                  >
                    {file.filename}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !projectName.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Project</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveProjectModal;
