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
import SignupModal from "./components/SignupModal"; // New signup modal component
import Setup2FAModal from "./components/Setup2FAModal"; // New 2FA setup modal
import Verify2FAModal from "./components/Verify2FAModal"; // New 2FA verify modal
import Setup2FA from "./components/Setup2FA";
import TranscriptionTranslationHub from "./components/TranscriptionTranslationHub";

const SubtitleTranslatorApp = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [pendingUser, setPendingUser] = useState(null); // User pending 2FA verification
  const [loadingUser, setLoadingUser] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false); // New state for login modal
  const [showSignupModal, setShowSignupModal] = useState(false); // New state for signup modal
  const [showSetup2FAModal, setShowSetup2FAModal] = useState(false); // New state for 2FA setup modal
  const [showVerify2FAModal, setShowVerify2FAModal] = useState(false); // New state for 2FA verify modal

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const location = useLocation();
  const navigate = useNavigate();

  const authPages = []; // All auth is now handled by modals
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
      await axios.get(`${BACKEND_URL}/logout`, {
        withCredentials: true,
      });
      setUser(null);
      setPendingUser(null); // Clear pending user too
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
    console.log("Profile clicked, user:", user);
    if (!user) {
      console.log("No user, showing signup modal");
      setShowSignupModal(true);
    } else {
      console.log("User exists, navigating to profile");
      navigate("/profile");
    }
  };

  // Handle successful login
  const handleLoginSuccess = (userData) => {
    if (userData?.setup_2fa_required) {
      setPendingUser(userData); // Don't set as authenticated user yet
      setShowLoginModal(false);
      setShowSetup2FAModal(true);
    } else if (userData?.twofa_required) {
      setPendingUser(userData); // Don't set as authenticated user yet
      setShowLoginModal(false);
      setShowVerify2FAModal(true);
    } else {
      setUser(userData); // Fully authenticated user
      setShowLoginModal(false);
    }
  };

  // Handle successful signup
  const handleSignupSuccess = (userData) => {
    if (userData?.setup_2fa_required) {
      setPendingUser(userData); // Don't set as authenticated user yet
      setShowSignupModal(false);
      setShowSetup2FAModal(true);
    } else if (userData?.twofa_required) {
      setPendingUser(userData); // Don't set as authenticated user yet
      setShowSignupModal(false);
      setShowVerify2FAModal(true);
    } else {
      setUser(userData); // Fully authenticated user
      setShowSignupModal(false);
    }
  };

  // Handle 2FA setup completion
  const handleSetup2FAComplete = () => {
    setUser(pendingUser); // Now user is fully authenticated
    setPendingUser(null);
    setShowSetup2FAModal(false);
  };

  // Handle 2FA verification completion
  const handleVerify2FAComplete = (userData) => {
    setUser(userData); // Now user is fully authenticated
    setPendingUser(null);
    setShowVerify2FAModal(false);
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
        const res = await axios.get(`${BACKEND_URL}/me`, {
          withCredentials: true,
        });

        console.log("🚀 /me response:", res.data);

        if (res.data?.setup_2fa_required) {
          setPendingUser(res.data); // Don't set as authenticated user yet
          setShowSetup2FAModal(true);
        } else if (res.data?.twofa_required) {
          setPendingUser(res.data); // Don't set as authenticated user yet
          setShowVerify2FAModal(true);
        } else {
          setUser(res.data); // Fully authenticated user
          // No automatic redirect - user stays on whatever page they're on
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

  // Show login modal for dashboard when user is not authenticated
  useEffect(() => {
    if (
      !loadingUser &&
      !user &&
      !pendingUser &&
      (location.pathname === "/" || location.pathname === "/dashboard")
    ) {
      console.log("Auto-showing login modal for dashboard");
      setShowLoginModal(true);
    }
  }, [loadingUser, user, pendingUser, location.pathname]);

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
          onShowLogin={() => setShowLoginModal(true)}
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
      {showLoginModal && !showSignupModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={handleLoginSuccess}
          onShowSignup={() => {
            setShowLoginModal(false);
            setTimeout(() => setShowSignupModal(true), 100);
          }}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Signup Modal */}
      {showSignupModal && !showLoginModal && (
        <SignupModal
          onClose={() => setShowSignupModal(false)}
          onSignupSuccess={handleSignupSuccess}
          onShowLogin={() => {
            setShowSignupModal(false);
            setTimeout(() => setShowLoginModal(true), 100);
          }}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Setup 2FA Modal */}
      {showSetup2FAModal && (
        <Setup2FAModal
          onClose={() => setShowSetup2FAModal(false)}
          onSetupComplete={handleSetup2FAComplete}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Verify 2FA Modal */}
      {showVerify2FAModal && (
        <Verify2FAModal
          onClose={() => setShowVerify2FAModal(false)}
          onVerifyComplete={handleVerify2FAComplete}
          isDarkMode={isDarkMode}
        />
      )}

      <Routes>
        {/* Public route - Dashboard */}
        <Route
          path="/dashboard"
          element={
            <Dashboard
              onNavigate={handleNavigation}
              isDarkMode={isDarkMode}
              user={user}
              onShowLogin={() => setShowLoginModal(true)}
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
              onShowLogin={() => setShowLoginModal(true)}
            />
          }
        />
      </Routes>
    </div>
  );
};

export default SubtitleTranslatorApp;
