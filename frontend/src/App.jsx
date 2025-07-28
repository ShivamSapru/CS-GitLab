import React, { useState, useEffect } from "react";
import { Globe, Menu, User } from "lucide-react";
import axios from "axios";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";

// Import components
import Dashboard from "./components/Dashboard";
import StaticSubtitleUpload from "./components/StaticSubtitleUpload";
import RealTimeTranslation from "./components/RealTimeTranslation";
import TranslationReview from "./components/TranslationReview";
import Profile from "./components/Profile";
import Library from "./components/Library";
import LoginModal from "./components/LoginModal"; // Changed from Login to LoginModal
import Signup from "./components/Signup";
import Verify2FA from "./components/Verify2FA";
import Setup2FA from "./components/Setup2FA";
import TranscriptionTranslationHub from "./components/TranscriptionTranslationHub";

const SubtitleTranslatorApp = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false); // New state for login modal

  const location = useLocation();
  const navigate = useNavigate();

  const authPages = ["/signup", "/verify-2fa", "/setup-2fa"]; // Removed "/login" since it's now a modal
  const onAuthPage = authPages.includes(location.pathname);

  // Define protected routes that require authentication
  const protectedRoutes = [
    "/upload",
    "/library",
    "/transcribe",
    "/realtime",
    "/profile",
  ];
  const onProtectedRoute = protectedRoutes.includes(location.pathname);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleLogout = async () => {
    try {
      await axios.get("http://localhost:8000/logout", {
        withCredentials: true,
      });
      setUser(null);
      navigate("/dashboard"); // Redirect to dashboard after logout
    } catch (err) {
      console.error("Logout failed:", err);
      // Even if logout fails on server, clear user state and redirect
      setUser(null);
      navigate("/dashboard");
    }
  };

  const templates = [
    {
      id: "dashboard",
      name: "Dashboard",
      path: "/dashboard",
      component: Dashboard,
      requiresAuth: false, // Dashboard is public
    },
    {
      id: "upload",
      name: "Static Translation",
      path: "/upload",
      component: StaticSubtitleUpload,
      requiresAuth: true,
    },
    {
      id: "library",
      name: "Translation Library",
      path: "/library",
      component: Library,
      requiresAuth: true,
    },
    {
      id: "review",
      name: "Audio/ Video Transcription",
      path: "/transcribe",
      component: TranscriptionTranslationHub,
      requiresAuth: true,
    },
    {
      id: "realtime",
      name: "Real-time Translation",
      path: "/realtime",
      component: RealTimeTranslation,
      requiresAuth: true,
    },
    {
      id: "profile",
      name: "Profile",
      path: "/profile",
      component: Profile,
      requiresAuth: true,
    },
  ];

  const handleNavigation = (templateId) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      // Check if route requires authentication and user is not logged in
      if (template.requiresAuth && !user) {
        // Show login modal instead of redirecting
        setShowLoginModal(true);
      } else {
        navigate(template.path);
      }
    }
    setIsMenuOpen(false);
  };

  const handleUserInfoClick = () => {
    if (!user) {
      navigate("/signup"); // Navigate to signup page if not logged in
    } else {
      navigate("/profile");
    }
  };

  // Handle successful login
  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setShowLoginModal(false);
    // You can add logic here to navigate to intended page if needed
  };

  // Get current template based on URL
  const getCurrentTemplate = () => {
    const template = templates.find((t) => t.path === location.pathname);
    return template ? template.id : "dashboard";
  };

  const currentTemplate = getCurrentTemplate();

  // Fetch user info on first load
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("http://localhost:8000/me", {
          withCredentials: true,
        });

        console.log("🚀 /me response:", res.data);

        if (res.data?.setup_2fa_required) {
          setUser(res.data);
          navigate("/setup-2fa");
        } else if (res.data?.twofa_required) {
          setUser(res.data);
          navigate("/verify-2fa");
        } else {
          setUser(res.data);

          // Only redirect to dashboard if on root path
          if (location.pathname === "/") {
            navigate("/dashboard");
          }
        }
      } catch {
        setUser(null);
        // Don't redirect to login here - let the route protection handle it
      } finally {
        setLoadingUser(false);
      }
    };
    fetchUser();
  }, []);

  // Show login modal for protected routes when user is not authenticated
  useEffect(() => {
    if (!loadingUser && !user && onProtectedRoute) {
      setShowLoginModal(true);
    }
  }, [loadingUser, user, onProtectedRoute]);

  // Protected Route Component
  const ProtectedRoute = ({ children }) => {
    if (loadingUser) {
      return (
        <div
          className={`min-h-screen flex items-center justify-center ${isDarkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"}`}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2">Loading...</p>
          </div>
        </div>
      );
    }

    if (!user) {
      // Return dashboard instead of null, modal will handle authentication
      return (
        <Dashboard
          onNavigate={handleNavigation}
          isDarkMode={isDarkMode}
          user={user}
        />
      );
    }

    return children;
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "bg-gray-900" : "bg-gray-100"}`}
    >
      {/* Header - Show on all pages except 2FA setup/verify */}
      {!authPages.includes(location.pathname) && (
        <header
          className={`shadow-sm border-b transition-colors duration-300 relative ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
            <div className="flex justify-between items-center py-3 sm:py-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <button
                  onClick={toggleMenu}
                  className={`p-2 rounded-lg transition-colors ${isDarkMode ? "text-gray-300 hover:text-white hover:bg-gray-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}
                >
                  <Menu className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center space-x-3 hover:opacity-80 transition-opacity duration-200"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Globe className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h1
                    className={`text-lg sm:text-xl lg:text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    SubtitleTranslator
                  </h1>
                </button>
              </div>

              {/* Right side controls - Dark mode toggle and user info */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleDarkMode}
                  className={`p-2 rounded-lg ${isDarkMode ? "bg-gray-700 text-yellow-400 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  {isDarkMode ? (
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                  )}
                </button>

                {/* User info */}
                <button
                  onClick={handleUserInfoClick}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? "text-gray-300 hover:text-white hover:bg-gray-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                  title={user ? "Profile" : "Sign Up"}
                >
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>

          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={() => setIsMenuOpen(false)}
              ></div>
              <div
                className={`absolute top-full left-0 right-0 z-50 shadow-lg border-t ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
              >
                <div className="max-w-7xl mx-auto px-3 py-4">
                  <div className="space-y-2">
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleNavigation(t.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center justify-between ${
                          currentTemplate === t.id
                            ? "bg-blue-500 text-white"
                            : isDarkMode
                              ? "text-gray-300 hover:text-white hover:bg-gray-700"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        }`}
                      >
                        <span>{t.name}</span>
                        {t.requiresAuth && !user && (
                          <span className="text-xs opacity-75">
                            Login required
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </header>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={handleLoginSuccess}
          isDarkMode={isDarkMode}
        />
      )}

      <Routes>
        {/* Auth routes - Keep signup and 2FA routes as separate pages */}
        <Route
          path="/signup"
          element={
            <Signup
              setUser={setUser}
              onShowLogin={() => setShowLoginModal(true)}
            />
          }
        />
        <Route path="/verify-2fa" element={<Verify2FA setUser={setUser} />} />
        <Route path="/setup-2fa" element={<Setup2FA />} />

        {/* Public route - Dashboard */}
        <Route
          path="/dashboard"
          element={
            <Dashboard
              onNavigate={handleNavigation}
              isDarkMode={isDarkMode}
              user={user}
            />
          }
        />

        {/* Protected routes */}
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <StaticSubtitleUpload isDarkMode={isDarkMode} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/realtime"
          element={
            <ProtectedRoute>
              <RealTimeTranslation isDarkMode={isDarkMode} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transcribe"
          element={
            <ProtectedRoute>
              <TranscriptionTranslationHub isDarkMode={isDarkMode} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/library"
          element={
            <ProtectedRoute>
              <Library isDarkMode={isDarkMode} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile isDarkMode={isDarkMode} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        {/* Default route - Redirect root to dashboard */}
        <Route
          path="/"
          element={
            <Dashboard
              onNavigate={handleNavigation}
              isDarkMode={isDarkMode}
              user={user}
            />
          }
        />
      </Routes>
    </div>
  );
};

export default SubtitleTranslatorApp;
