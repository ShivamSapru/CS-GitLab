import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import axios from "axios";

const LoginModal = ({ onClose, onLoginSuccess, isDarkMode }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post(
        "http://localhost:8000/login",
        { email, password },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        },
      );

      if (res.data?.setup_2fa_required) {
        onLoginSuccess(res.data);
        onClose();
        navigate("/setup-2fa");
      } else if (res.data?.twofa_required) {
        onLoginSuccess(res.data);
        onClose();
        navigate("/verify-2fa");
      } else {
        onLoginSuccess(res.data.user);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.detail ?? "Invalid credentials");
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

        <div className="p-6">
          <form onSubmit={handleLogin}>
            <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>

            {error && (
              <div className="mb-4 p-3 rounded-md bg-red-100 border border-red-300 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  }`}
                />
              </div>

              <div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  }`}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
              >
                Log In
              </button>
            </div>
          </form>

          <div className="mt-4 text-center">
            <p
              className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
            >
              Don't have an account?{" "}
              <button
                onClick={() => {
                  onClose();
                  navigate("/signup");
                }}
                className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
              >
                Sign up
              </button>
            </p>
          </div>

          <div className="my-4 flex items-center">
            <div
              className={`flex-1 border-t ${isDarkMode ? "border-gray-600" : "border-gray-300"}`}
            ></div>
            <span
              className={`mx-4 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
            >
              or
            </span>
            <div
              className={`flex-1 border-t ${isDarkMode ? "border-gray-600" : "border-gray-300"}`}
            ></div>
          </div>

          <button
            onClick={() =>
              (window.location.href = "http://localhost:8000/login")
            }
            type="button"
            className={`w-full flex items-center justify-center px-4 py-2 border rounded-md hover:bg-opacity-50 transition-colors ${
              isDarkMode
                ? "border-gray-600 hover:bg-gray-700 text-white"
                : "border-gray-300 hover:bg-gray-50 text-gray-900"
            }`}
          >
            <img
              src="https://developers.google.com/identity/images/g-logo.png"
              alt="Google"
              className="w-5 h-5 mr-2"
            />
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
