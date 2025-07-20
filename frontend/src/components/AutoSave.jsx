import React from "react";
import { X, Settings, Save } from "lucide-react";
const AutoSaveModal = ({
  isVisible,
  onAutoSave,
  onCustomize,
  onCancel,
  originalFilename,
}) => {
  if (!isVisible) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        {/* Header /}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Save Project</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/ Content /}
        <div className="text-center mb-6">
          <p className="text-gray-600 mb-4">
            Would you like to save this project?
          </p>
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="font-medium text-blue-900 truncate">
              {originalFilename?.replace(/\.[^/.]+$/, "") || "Untitled Project"}
            </p>
          </div>
        </div>
        {/ Action Buttons */}
        <div className="flex flex-col space-y-3">
          <button
            onClick={onCustomize}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Customize Project Details</span>
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onAutoSave}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Now</span>
            </button>
            <button
              onClick={onCancel}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Don't Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoSaveModal;
