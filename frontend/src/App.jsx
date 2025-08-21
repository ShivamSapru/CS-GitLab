import React, { useState, useEffect } from "react";
import { Sun, Moon, Globe, Menu, User, X } from "lucide-react";
import axios from "axios";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";

// Import components
import Dashboard from "./components/Dashboard";
import StaticSubtitleUpload from "./components/StaticSubtitleUpload";
import RealTimeTranslation from "./components/RealTimeTranslation";
import TranslationReview from "./components/TranslationReview";
import Profile from "./components/Profile";
import Library from "./components/Library";
import LoginModal from "./components/LoginModal";
import SignupModal from "./components/SignupModal";
import Setup2FAModal from "./components/Setup2FAModal";
import Verify2FAModal from "./components/Verify2FAModal";
import TranscriptionTranslationHub from "./components/TranscriptionTranslationHub";
import NotificationDisplay from "./components/NotificationDisplay";
import notificationService from "./services/notificationService";
import NotificationCenter from "./components/NotificationCenter";

const ModernHamburgerMenu = ({
  isMenuOpen,
  setIsMenuOpen,
  templates,
  currentTemplate,
  handleNavigation,
  user,
  isDarkMode,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isMenuOpen) {
      setIsAnimating(true);
    } else {
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isMenuOpen]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      {/* Backdrop - only visible when menu is open */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Modern Compact Menu */}
      <div
        className={`fixed top-20 left-4 sm:top-4 sm:left-4 z-50 transition-all duration-300 ease-out ${
          isMenuOpen || isAnimating ? "opacity-100" : "opacity-100"
        }`}
      >
        {/* Menu Button */}
        <button
          onClick={toggleMenu}
          className={`relative w-12 h-12 rounded-2xl backdrop-blur-md border transition-all duration-300 ${
            isDarkMode
              ? "bg-gray-900/80 border-white/10 hover:bg-gray-800/90 text-white"
              : "bg-white/80 border-black/10 hover:bg-white/90 text-gray-900"
          } ${isMenuOpen ? "scale-110" : "hover:scale-105"} shadow-xl`}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            <Menu
              className={`w-5 h-5 transition-all duration-300 ${
                isMenuOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"
              }`}
            />
            <X
              className={`w-5 h-5 absolute transition-all duration-300 ${
                isMenuOpen ? "rotate-0 opacity-100" : "rotate-90 opacity-0"
              }`}
            />
          </div>
        </button>

        {/* Menu Panel */}
        <div
          className={`absolute top-16 left-0 min-w-80 max-w-sm transform transition-all duration-300 ease-out ${
            isMenuOpen
              ? "translate-y-0 opacity-100 scale-100"
              : "translate-y-4 opacity-0 scale-95 pointer-events-none"
          }`}
        >
          <div
            className={`rounded-3xl backdrop-blur-md border shadow-2xl overflow-hidden ${
              isDarkMode
                ? "bg-gray-900/90 border-white/10"
                : "bg-white/90 border-black/10"
            }`}
          >
            {/* Menu Header */}
            <div
              className={`px-6 py-4 border-b ${
                isDarkMode ? "border-white/10" : "border-black/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <img
                    src={isDarkMode ? "/logo.png" : "/logo.png"}
                    alt="SubtitleTranslator Logo"
                    className="w-12 h-12 object-contain rounded-lg"
                  />
                  <span
                    className={`font-bold text-sm ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    SubLingo
                  </span>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              {templates.map((template, index) => {
                const isActive = currentTemplate === template.id;
                const requiresAuth = template.requiresAuth && !user;

                return (
                  <button
                    key={template.id}
                    onClick={() => handleNavigation(template.id)}
                    className={`w-full text-left px-4 py-3 rounded-2xl font-medium transition-all duration-200 mb-1 group relative overflow-hidden ${
                      isActive
                        ? isDarkMode
                          ? "bg-blue-600/80 text-white shadow-lg"
                          : "bg-blue-600/90 text-white shadow-lg"
                        : isDarkMode
                          ? "text-gray-300 hover:text-white hover:bg-white/10"
                          : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
                    }`}
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animation: isMenuOpen
                        ? "slideInLeft 0.3s ease-out forwards"
                        : "none",
                    }}
                  >
                    {/* Background effect for active item */}
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-50" />
                    )}

                    {/* Hover effect */}
                    <div
                      className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
                        isDarkMode ? "bg-white/5" : "bg-black/5"
                      }`}
                    />

                    <div className="relative flex items-center justify-between">
                      <span className="flex items-center space-x-3">
                        {/* Icon placeholder - you can add specific icons for each template */}
                        <div
                          className={`w-2 h-2 rounded-full transition-all duration-200 ${
                            isActive
                              ? "bg-white"
                              : isDarkMode
                                ? "bg-gray-500 group-hover:bg-gray-300"
                                : "bg-gray-400 group-hover:bg-gray-600"
                          }`}
                        />
                        <span>{template.name}</span>
                      </span>

                      {requiresAuth && (
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            isDarkMode
                              ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                              : "bg-orange-500/20 text-orange-600 border border-orange-500/30"
                          }`}
                        >
                          Login required
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Menu Footer */}
            {user && (
              <div
                className={`px-6 py-4 border-t ${
                  isDarkMode ? "border-white/10" : "border-black/10"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isDarkMode ? "bg-blue-600/20" : "bg-blue-600/20"
                    }`}
                  >
                    <User className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Welcome back!
                    </p>
                    <p
                      className={`text-xs ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {user.email || "User"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
};

const SubtitleTranslatorApp = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [pendingUser, setPendingUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showSetup2FAModal, setShowSetup2FAModal] = useState(false);
  const [showVerify2FAModal, setShowVerify2FAModal] = useState(false);
  const [transcriptionResults, setTranscriptionResults] = useState(new Map());

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const location = useLocation();
  const navigate = useNavigate();

  // Make notification service globally available
  useEffect(() => {
    window.notificationService = notificationService;

    return () => {
      // Clean up on unmount
      delete window.notificationService;
    };
  }, []);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleLogout = async () => {
    try {
      await axios.get(`${BACKEND_URL}/logout`, {
        withCredentials: true,
      });
      setUser(null);
      setPendingUser(null);
      navigate("/dashboard");
    } catch (err) {
      console.error("Logout failed:", err);
      setUser(null);
      navigate("/dashboard");
    }
  };

  // IMPORTANT: Library is NOT in this array anymore
  const protectedRoutes = ["/upload", "/transcribe", "/profile"];

  const templates = [
    {
      id: "dashboard",
      name: "Dashboard",
      path: "/dashboard",
      requiresAuth: false,
    },
    {
      id: "upload",
      name: "Static Translation",
      path: "/upload",
      requiresAuth: true,
    },
    {
      id: "library",
      name: "Translation Library",
      path: "/library",
      requiresAuth: false,
    },
    {
      id: "transcribe",
      name: "Audio/ Video Transcription",
      path: "/transcribe",
      requiresAuth: true,
    },
    {
      id: "realtime",
      name: "Real-time Translation",
      path: "/realtime",
      requiresAuth: false,
    },
    {
      id: "profile",
      name: "Profile",
      path: "/profile",
      requiresAuth: true,
    },
  ];

  const handleNavigation = (templateId) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      // Check if there's an active transcription and we're trying to leave
      if (
        window.transcriptionNavigationHandler &&
        location.pathname === "/transcribe"
      ) {
        const canNavigate = window.transcriptionNavigationHandler(
          template.path,
        );
        if (!canNavigate) {
          setIsMenuOpen(false);
          return; // Navigation was blocked
        }
      }

      // Check if route requires authentication AND user is not logged in
      if (template.requiresAuth && !user) {
        setShowLoginModal(true);
      } else {
        // Navigate directly - no login required
        navigate(template.path);
      }
    }
    setIsMenuOpen(false);
  };

  const handleUserInfoClick = () => {
    if (!user) {
      setShowSignupModal(true);
    } else {
      navigate("/profile");
    }
  };

  const handleLoginSuccess = (userData) => {
    if (userData?.setup_2fa_required) {
      setPendingUser(userData);
      setShowLoginModal(false);
      setShowSetup2FAModal(true);
    } else if (userData?.twofa_required) {
      setPendingUser(userData);
      setShowLoginModal(false);
      setShowVerify2FAModal(true);
    } else {
      setUser(userData);
      setShowLoginModal(false);
    }
  };

  const handleSignupSuccess = (userData) => {
    if (userData?.setup_2fa_required) {
      setPendingUser(userData);
      setShowSignupModal(false);
      setShowSetup2FAModal(true);
    } else if (userData?.twofa_required) {
      setPendingUser(userData);
      setShowSignupModal(false);
      setShowVerify2FAModal(true);
    } else {
      setUser(userData);
      setShowSignupModal(false);
    }
  };

  const handleSetup2FAComplete = async () => {
    try {
      // Fetch updated user data after 2FA setup
      const res = await axios.get(`${BACKEND_URL}/me`, {
        withCredentials: true,
      });
      console.log("User data after 2FA setup:", res.data);
      setUser(res.data);
    } catch (err) {
      console.error("Failed to fetch user after 2FA setup", err);
      // Fallback to pendingUser if fetch fails
      setUser(pendingUser);
    } finally {
      setPendingUser(null);
      setShowSetup2FAModal(false);
    }
  };

  const handleVerify2FAComplete = (userData) => {
    setUser(userData);
    setPendingUser(null);
    setShowVerify2FAModal(false);
  };

  const getCurrentTemplate = () => {
    const template = templates.find((t) => t.path === location.pathname);
    return template ? template.id : "dashboard";
  };

  const currentTemplate = getCurrentTemplate();

  useEffect(() => {
    // Check for auth success/error in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get("auth");

    if (authStatus === "success") {
      console.log("OAuth success detected");
      // Remove the query parameter
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authStatus === "error") {
      const errorMessage = urlParams.get("message");
      console.error("OAuth error:", errorMessage);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const fetchUser = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/me`, {
          withCredentials: true,
        });
        const userData = res.data;

        if (userData?.twofa_required) {
          // User has 2FA enabled but hasn't verified yet
          console.log("2FA verification required");
          setPendingUser(userData);
          setShowVerify2FAModal(true);
        } else if (userData?.setup_2fa_required) {
          // User needs to set up 2FA
          console.log("2FA setup required");

          // CRITICAL FIX: Check if user already has user_id (OAuth users)
          if (userData.user_id) {
            // OAuth user without 2FA - they're already logged in
            console.log("OAuth user without 2FA - setting as logged in user");
            setUser(userData);
            setPendingUser(userData); // Also set pending for 2FA setup
            setShowSetup2FAModal(true);
          } else {
            // Email user without 2FA - not fully logged in yet
            console.log("Email user without 2FA - pending login");
            setPendingUser(userData);
            setShowSetup2FAModal(true);
          }
        } else if (userData?.user_id) {
          // Fully authenticated user (has user_id and passed 2FA if required)
          console.log("Fully authenticated user");
          setUser(userData);
        } else {
          // No valid user data
          console.log("No valid user data");
          setUser(null);
        }
      } catch (error) {
        console.log("User fetch error:", error);
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUser();
  }, [location]);

  useEffect(() => {
    const handleTranscriptionNavigation = (event) => {
      const { projectId } = event.detail;

      // Store the project ID for the transcription page to pick up
      sessionStorage.setItem("openTranscriptionProject", projectId);

      // Navigate to transcribe page
      navigate("/transcribe");

      // Close any open menu
      setIsMenuOpen(false);
    };

    window.addEventListener(
      "navigateToTranscriptionResults",
      handleTranscriptionNavigation,
    );

    return () => {
      window.removeEventListener(
        "navigateToTranscriptionResults",
        handleTranscriptionNavigation,
      );
    };
  }, [navigate]);

  const handleShowLogin = () => {
    setShowLoginModal(true);
  };

  // SIMPLIFIED ProtectedRoute - only used for actual protected routes
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
      if (location.pathname !== "/dashboard" && location.pathname !== "/") {
        navigate("/dashboard");
      }

      if (pendingUser?.setup_2fa_required && !showSetup2FAModal) {
        setShowSetup2FAModal(true);
      } else if (pendingUser?.twofa_required && !showVerify2FAModal) {
        setShowVerify2FAModal(true);
      } else if (
        !showLoginModal &&
        !showSignupModal &&
        !showSetup2FAModal &&
        !showVerify2FAModal
      ) {
        setShowLoginModal(true);
      }

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
      {/* Header */}
      <header
        className={`sticky top-0 border-b transition-all duration-300 relative backdrop-blur-sm z-30 ${
          isDarkMode
            ? "bg-gray-800/80 border-gray-700/30"
            : "bg-white/80 border-gray-200/30"
        }`}
      >
        <div className="max-w-7xl mx-auto px-1 sm:px-2 lg:px-4">
          <div className="flex justify-between items-center py-1">
            <div className="flex items-center space-x-2 sm:space-x-3 -ml-2">
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center space-x-0 hover:opacity-80 transition-opacity duration-200"
              >
                <img
                  src={isDarkMode ? "/logo.png" : "/logo.png"}
                  alt="SubtitleTranslator Logo"
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-lg"
                />
                <h1
                  className={`text-lg sm:text-xl lg:text-2xl font-bold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  SubLingo
                </h1>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg ${
                  isDarkMode
                    ? "bg-gray-700 text-yellow-400 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>

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
      </header>

      <ModernHamburgerMenu
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        templates={templates}
        currentTemplate={currentTemplate}
        handleNavigation={handleNavigation}
        user={user}
        isDarkMode={isDarkMode}
      />

      <NotificationCenter isDarkMode={isDarkMode} />

      {/* Modals */}
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

      {showSetup2FAModal && (
        <Setup2FAModal
          onClose={() => setShowSetup2FAModal(false)}
          onSetupComplete={handleSetup2FAComplete}
          isDarkMode={isDarkMode}
        />
      )}

      {showVerify2FAModal && (
        <Verify2FAModal
          onClose={() => setShowVerify2FAModal(false)}
          onVerifyComplete={handleVerify2FAComplete}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Routes */}
      <Routes>
        {/* Public Routes - NO ProtectedRoute wrapper */}
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

        <Route
          path="/library"
          element={
            <Library
              isDarkMode={isDarkMode}
              user={user}
              onShowLogin={() => setShowLoginModal(true)}
            />
          }
        />

        <Route
          path="/realtime"
          element={<RealTimeTranslation isDarkMode={isDarkMode} />}
        />

        {/* Protected Routes - WITH ProtectedRoute wrapper */}
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <StaticSubtitleUpload isDarkMode={isDarkMode} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/transcribe"
          element={
            <ProtectedRoute>
              <TranscriptionTranslationHub
                isDarkMode={isDarkMode}
                onNavigateAway={(destination) => navigate(destination)}
                transcriptionResults={transcriptionResults}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile
                isDarkMode={isDarkMode}
                onLogout={handleLogout}
                onShowLogin={handleShowLogin}
              />
            </ProtectedRoute>
          }
        />

        {/* Default route */}
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
      <NotificationDisplay isDarkMode={isDarkMode} />
    </div>
  );
};

export default SubtitleTranslatorApp;
