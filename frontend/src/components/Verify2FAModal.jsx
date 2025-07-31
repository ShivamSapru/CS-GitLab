import React, { useState, useEffect } from "react";
import axios from "axios";
import { X } from "lucide-react";

const Verify2FAModal = ({ onClose, onVerifyComplete, isDarkMode }) => {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post(
        `${BACKEND_URL}/verify-2fa`,
        { otp },
        { withCredentials: true },
      );
      onVerifyComplete(res.data.user);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid OTP. Try again.");
    }
  };

  // Handle background click to close modal
  const handleBackgroundClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Auto-focus the input when modal opens
  useEffect(() => {
    const timer = setTimeout(() => {
      const input = document.querySelector('input[type="text"]');
      if (input) input.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackgroundClick}
    >
      <div
        className={`relative w-full max-w-md rounded-lg shadow-lg ${
          isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1 rounded-full hover:bg-opacity-20 transition-colors ${
            isDarkMode
              ? "hover:bg-white text-gray-300 hover:text-white"
              : "hover:bg-gray-200 text-gray-500 hover:text-gray-700"
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          <form onSubmit={handleVerify}>
            <h2 className="text-2xl font-bold mb-6 text-center">Verify 2FA</h2>

            <p
              className={`text-sm mb-6 text-center ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
            >
              Enter the 6-digit code from your Authenticator app.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-md bg-red-100 border border-red-300 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                required
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-center text-lg tracking-widest ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                }`}
              />

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
              >
                Verify
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Verify2FAModal;
