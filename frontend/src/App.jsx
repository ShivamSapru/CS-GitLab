import React, { useState, useEffect } from "react";
import { Globe, Menu, User } from "lucide-react";
import axios from "axios";
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';

// Import components
import Dashboard from "./components/Dashboard";
import StaticSubtitleUpload from "./components/StaticSubtitleUpload";
import RealTimeTranslation from "./components/RealTimeTranslation";
import TranslationReview from "./components/TranslationReview";
import Profile from "./components/Profile";
import Library from "./components/Library";
import Login from './components/Login';
import Signup from './components/Signup';

const SubtitleTranslatorApp = () => {
  const [currentTemplate, setCurrentTemplate] = useState("dashboard");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const location = useLocation();
  const navigate = useNavigate();
  const onAuthPage = location.pathname === "/login" || location.pathname === "/signup";

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleLogout = async () => {
    try {
      await axios.get("http://localhost:8000/logout", { withCredentials: true });
      setUser(null);
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const templates = [
    { id: "dashboard", name: "Dashboard", component: Dashboard },
    { id: "upload", name: "Static Upload", component: StaticSubtitleUpload },
    { id: "realtime", name: "Real-time Translation", component: RealTimeTranslation },
    { id: "review", name: "Translation Review", component: TranslationReview },
    { id: "library", name: "Library", component: Library },
    { id: "profile", name: "Profile", component: Profile },
  ];

  const handleNavigation = (templateId) => {
    setCurrentTemplate(templateId);
    setIsMenuOpen(false);
  };

  const getCurrentComponent = () => {
    const template = templates.find((t) => t.id === currentTemplate);
    if (!template) return <Dashboard onNavigate={handleNavigation} />;
    const Component = template.component;
    return currentTemplate === "dashboard"
      ? <Component onNavigate={handleNavigation} isDarkMode={isDarkMode} />
      : <Component />;
  };

  // Fetch user info on first load
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("http://localhost:8000/me", {
          withCredentials: true,
        });
        setUser(res.data);
      } catch {
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    };
    fetchUser();
  }, []);

  // 🔁 Redirect to login if not authenticated
  useEffect(() => {
    if (!loadingUser && !user && !onAuthPage) {
      navigate("/login");
    }
  }, [loadingUser, user, onAuthPage, navigate]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "bg-gray-900" : "bg-gray-100"}`}>
      {!loadingUser && user && (
        <div className="absolute top-2 right-4 z-50 text-sm text-gray-700 bg-white px-3 py-1 rounded shadow flex flex-col items-end">
          <div>Logged in as <strong>{user.name || user.email || "User"}</strong></div>
          <button onClick={handleLogout} className="text-red-600 hover:underline text-xs mt-1">
            Log out
          </button>
        </div>
      )}

      {/* Header */}
      <header className={`shadow-sm border-b transition-colors duration-300 relative ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button onClick={toggleMenu} className={`p-2 rounded-lg transition-colors ${isDarkMode ? "text-gray-300 hover:text-white hover:bg-gray-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}>
                <Menu className="w-5 h-5" />
              </button>
              <button onClick={() => handleNavigation("dashboard")} className="flex items-center space-x-3 hover:opacity-80 transition-opacity duration-200">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Globe className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <h1 className={`text-lg sm:text-xl lg:text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>SubtitleTranslator</h1>
              </button>
            </div>
            <button onClick={toggleDarkMode} className={`p-2 rounded-lg ${isDarkMode ? "bg-gray-700 text-yellow-400 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {isDarkMode ? (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"/></svg>
              ) : (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>
              )}
            </button>
          </div>
        </div>
        {isMenuOpen && (
          <>
            <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setIsMenuOpen(false)}></div>
            <div className={`absolute top-full left-0 right-0 z-50 shadow-lg border-t ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
              <div className="max-w-7xl mx-auto px-3 py-4">
                <h3 className={`text-sm font-medium mb-3 ${isDarkMode ? "text-gray-300" : "text-gray-500"}`}>Navigation</h3>
                <div className="space-y-2">
                  {templates.map(t => (
                    <button key={t.id} onClick={() => handleNavigation(t.id)} className={`w-full text-left px-4 py-3 rounded-lg font-medium ${currentTemplate === t.id ? "bg-blue-500 text-white" : isDarkMode ? "text-gray-300 hover:text-white hover:bg-gray-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}>
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </header>

      <Routes>
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/signup" element={<Signup setUser={setUser} />} />
        <Route path="*" element={getCurrentComponent()} />
      </Routes>
    </div>
  );
};

export default SubtitleTranslatorApp;
