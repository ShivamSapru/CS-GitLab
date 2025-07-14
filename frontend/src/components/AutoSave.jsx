import React, { useState, useEffect } from "react";
import { Timer, X, Settings, Save } from "lucide-react";

const AutoSaveCountdown = ({
  isVisible,
  onAutoSave,
  onCustomize,
  onCancel,
  originalFilename,
  duration = 10000, // 10 seconds in milliseconds
}) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setTimeLeft(duration);
      setIsActive(true);
    } else {
      setIsActive(false);
    }
  }, [isVisible, duration]);

  useEffect(() => {
    let interval = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((timeLeft) => {
          const newTime = timeLeft - 100; // Update every 100ms for smooth animation

          if (newTime <= 0) {
            setIsActive(false);
            onAutoSave(); // Auto-save when countdown reaches 0
            return 0;
          }

          return newTime;
        });
      }, 100);
    } else if (timeLeft <= 0) {
      setIsActive(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, onAutoSave]);

  const handleCustomize = () => {
    setIsActive(false);
    onCustomize();
  };

  const handleCancel = () => {
    setIsActive(false);
    onCancel();
  };

  const progressPercentage = (timeLeft / duration) * 100;
  const secondsLeft = Math.ceil(timeLeft / 1000);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="relative">
            <Timer className="w-6 h-6 text-blue-500" />
            {isActive && (
              <div className="absolute -inset-1 border-2 border-blue-500 rounded-full animate-pulse"></div>
            )}
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            Auto-Save Project
          </h2>
        </div>

        {/* Content without countdown number */}
        <div className="text-center mb-6">
          <p className="text-gray-600 mb-4">
            Project will be automatically saved as:
          </p>
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="font-medium text-blue-900 truncate">
              {originalFilename?.replace(/\.[^/.]+$/, "") || "Untitled Project"}
            </p>
          </div>
        </div>

        {/* Progress Bar - Reverse countdown */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-100 ease-linear"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Auto-saving...</span>
            <span>{secondsLeft}s remaining</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-3">
          <button
            onClick={handleCustomize}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Customize Project Details</span>
          </button>

          <div className="flex space-x-3">
            <button
              onClick={() => {
                setIsActive(false);
                onAutoSave();
              }}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Now</span>
            </button>

            <button
              onClick={handleCancel}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Don't Save</span>
            </button>
          </div>
        </div>

        {/* Info Text */}
        <p className="text-xs text-gray-500 text-center mt-4">
          Click anywhere on this dialog to interact and stop auto-save
        </p>
      </div>
    </div>
  );
};

export default AutoSaveCountdown;
