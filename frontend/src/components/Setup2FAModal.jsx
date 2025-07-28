import React, { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import axios from "axios";
import { X } from "lucide-react";

const Setup2FAModal = ({ onClose, onSetupComplete, isDarkMode }) => {
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetch2FA = async () => {
      try {
        const res = await axios.get("http://localhost:8000/setup-2fa", {
          withCredentials: true,
        });
        setSecret(res.data.secret);
        setUri(res.data.provisioning_uri);
      } catch (err) {
        setError("Failed to load 2FA setup.");
      }
    };
    fetch2FA();
  }, []);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await axios.post(
        "http://localhost:8000/verify-2fa-setup",
        { otp, secret },
        { withCredentials: true },
      );
      setSuccess("2FA enabled successfully!");
      setTimeout(() => {
        onSetupComplete();
        onClose();
      }, 1500);
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

        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold mb-6">Set Up 2FA</h2>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-100 border border-red-300 text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-md bg-green-100 border border-green-300 text-green-700 text-sm">
              {success}
            </div>
          )}

          {uri ? (
            <>
              <p
                className={`text-sm mb-4 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
              >
                Scan this QR code with your Authenticator app (Google,
                Microsoft, Authy, etc.), then enter the 6-digit code below.
              </p>

              <div className="bg-white p-4 rounded-lg mb-6 border inline-block">
                <QRCode value={uri} size={180} />
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength="6"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
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
                  Verify & Enable 2FA
                </button>
              </form>
            </>
          ) : (
            <div className="py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p
                className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                Loading QR code...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Setup2FAModal;
