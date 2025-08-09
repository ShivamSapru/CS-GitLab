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
import LoginModal from "./components/LoginModal";
import SignupModal from "./components/SignupModal";
import Setup2FAModal from "./components/Setup2FAModal";
import Verify2FAModal from "./components/Verify2FAModal";
import TranscriptionTranslationHub from "./components/TranscriptionTranslationHub";
import NotificationDisplay from "./components/NotificationDisplay";
import notificationService from "./services/notificationService";
import NotificationCenter from "./components/NotificationCenter";
import TranscriptionDebugger from "./components/TranscriptionDebugger";

const SubtitleTranslatorApp = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
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
      requiresAuth: false, // IMPORTANT: This is false now
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
    console.log("Profile clicked, user:", user);
    if (!user) {
      console.log("No user, showing signup modal");
      setShowSignupModal(true);
    } else {
      console.log("User exists, navigating to profile");
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

  const debugUserState = () => {
    console.log("=== USER STATE DEBUG ===");
    console.log("user:", user);
    console.log("pendingUser:", pendingUser);
    console.log("loadingUser:", loadingUser);
    console.log("showSetup2FAModal:", showSetup2FAModal);
    console.log("showVerify2FAModal:", showVerify2FAModal);
    console.log("========================");
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

        console.log("🚀 /me response:", userData);

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
      console.log("🚀 Navigate to transcription results:", projectId);

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
                {/* Replace the Globe icon div with an img tag for your PNG logo */}
                <img
                  src="/logo.png"
                  alt="SubtitleTranslator Logo"
                  className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-lg"
                />
                <h1
                  className={`text-lg sm:text-xl lg:text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
                >
                  SubLingo
                </h1>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <NotificationCenter isDarkMode={isDarkMode} />
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
      <NotificationDisplay isDarkMode={isDarkMode} />

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

        {/* IMPORTANT: Library is public now */}
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
              <Profile isDarkMode={isDarkMode} onLogout={handleLogout} />
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
    </div>
  );
};

export default SubtitleTranslatorApp;
