import React, { useEffect, useRef, useState } from "react";
import { FileText, Users, FolderOpen, Mic, Chrome } from "lucide-react";

const Dashboard = ({ onNavigate, isDarkMode, user, onShowLogin }) => {
  const containerRef = useRef(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isManualScroll, setIsManualScroll] = useState(false);

  const features = [
    {
      id: "static",
      title: "Static Translation",
      icon: FileText,
      description:
        "Upload and translate subtitle files with precision and speed",
      route: "upload",
      requiresAuth: true,
      background: isDarkMode
        ? "from-slate-900 via-slate-800 to-gray-900"
        : "from-gray-50 via-slate-100 to-gray-200",
      accent: isDarkMode ? "text-blue-400" : "text-blue-600",
      accentBg: isDarkMode ? "bg-blue-500/10" : "bg-blue-500/10",
    },
    {
      id: "library",
      title: "Translation Library",
      icon: FolderOpen,
      description:
        "Browse, organize, and manage your translated content library",
      route: "library",
      requiresAuth: false,
      background: isDarkMode
        ? "from-gray-900 via-slate-800 to-slate-900"
        : "from-slate-100 via-gray-100 to-slate-200",
      accent: isDarkMode ? "text-purple-400" : "text-purple-600",
      accentBg: isDarkMode ? "bg-purple-500/10" : "bg-purple-500/10",
    },
    {
      id: "transcription",
      title: "Audio Transcription",
      icon: Mic,
      description:
        "AI-powered transcription with automatic subtitle generation",
      route: "transcribe",
      requiresAuth: true,
      background: isDarkMode
        ? "from-slate-800 via-gray-900 to-slate-900"
        : "from-gray-100 via-slate-200 to-gray-100",
      accent: isDarkMode ? "text-amber-400" : "text-amber-600",
      accentBg: isDarkMode ? "bg-amber-500/10" : "bg-amber-500/10",
    },
    {
      id: "realtime",
      title: "Chrome Extension",
      icon: Chrome,
      description: "Real-time translation for YouTube, Teams, Zoom and more",
      route: "realtime",
      requiresAuth: false,
      isSpecial: true,
      background: isDarkMode
        ? "from-gray-800 via-slate-900 to-gray-900"
        : "from-slate-200 via-gray-100 to-slate-100",
      accent: isDarkMode ? "text-emerald-400" : "text-emerald-600",
      accentBg: isDarkMode ? "bg-emerald-500/10" : "bg-emerald-500/10",
    },
  ];

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: (e.clientX - rect.left - rect.width / 2) / rect.width,
          y: (e.clientY - rect.top - rect.height / 2) / rect.height,
        });
      }
    };

    const handleWheel = (e) => {
      if (isScrolling) return;

      e.preventDefault();
      setIsScrolling(true);
      setIsManualScroll(true);

      const direction = e.deltaY > 0 ? 1 : -1;
      const newSection = Math.max(
        0,
        Math.min(features.length - 1, currentSection + direction),
      );

      setCurrentSection(newSection);

      // Scroll to the section
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: newSection * window.innerHeight,
          behavior: "smooth",
        });
      }

      setTimeout(() => {
        setIsScrolling(false);
        setIsManualScroll(false);
      }, 1000);
    };

    const handleScroll = () => {
      if (isManualScroll || isScrolling) return;

      const container = containerRef.current;
      if (container) {
        const scrollTop = container.scrollTop;
        const sectionHeight = window.innerHeight;
        const newSection = Math.round(scrollTop / sectionHeight);

        if (
          newSection !== currentSection &&
          newSection >= 0 &&
          newSection < features.length
        ) {
          setCurrentSection(newSection);
        }
      }
    };

    const handleKeyDown = (e) => {
      if (isScrolling) return;

      let direction = 0;
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        direction = 1;
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        direction = -1;
      }

      if (direction !== 0) {
        e.preventDefault();
        setIsScrolling(true);
        setIsManualScroll(true);

        const newSection = Math.max(
          0,
          Math.min(features.length - 1, currentSection + direction),
        );
        setCurrentSection(newSection);

        // Scroll to the section
        if (containerRef.current) {
          containerRef.current.scrollTo({
            top: newSection * window.innerHeight,
            behavior: "smooth",
          });
        }

        setTimeout(() => {
          setIsScrolling(false);
          setIsManualScroll(false);
        }, 1000);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      container.addEventListener("wheel", handleWheel, { passive: false });
      container.addEventListener("scroll", handleScroll, { passive: true });
      document.addEventListener("keydown", handleKeyDown);

      return () => {
        container.removeEventListener("mousemove", handleMouseMove);
        container.removeEventListener("wheel", handleWheel);
        container.removeEventListener("scroll", handleScroll);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isScrolling, features.length, currentSection, isManualScroll]);

  const handleFeatureClick = (feature) => {
    if (feature.requiresAuth && !user) {
      if (onShowLogin) {
        onShowLogin();
      }
      return;
    }

    if (onNavigate) {
      onNavigate(feature.route);
    }
  };

  const handleNavDot = (index) => {
    if (!isScrolling) {
      setIsScrolling(true);
      setIsManualScroll(true);
      setCurrentSection(index);

      // Scroll to the section
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: index * window.innerHeight,
          behavior: "smooth",
        });
      }

      setTimeout(() => {
        setIsScrolling(false);
        setIsManualScroll(false);
      }, 1000);
    }
  };

  const currentFeature = features[currentSection];
  const IconComponent = currentFeature.icon;

  return (
    <div
      ref={containerRef}
      className="h-screen w-full overflow-auto relative cursor-pointer"
      onClick={() => handleFeatureClick(currentFeature)}
    >
      {/* Background with smooth transitions */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${currentFeature.background} transition-all duration-1000 ease-in-out`}
      />

      {/* Subtle animated background elements */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        <div
          className={`absolute w-96 h-96 ${currentFeature.accentBg} rounded-full blur-3xl transition-all duration-1000`}
          style={{
            top: "20%",
            left: "10%",
            transform: `translate(${mousePosition.x * 30}px, ${mousePosition.y * 20}px)`,
          }}
        />
        <div
          className={`absolute w-64 h-64 ${currentFeature.accentBg} rounded-full blur-3xl transition-all duration-1000`}
          style={{
            bottom: "20%",
            right: "20%",
            transform: `translate(${mousePosition.x * -20}px, ${mousePosition.y * -30}px)`,
          }}
        />
      </div>

      {/* Grid pattern overlay */}
      <div className={`absolute inset-0 opacity-5`}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, ${isDarkMode ? "white" : "black"} 1px, transparent 0)`,
            backgroundSize: "60px 60px",
            transform: `translate(${mousePosition.x * 10}px, ${mousePosition.y * 10}px)`,
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 h-full flex items-center justify-center">
        <div
          className="text-center max-w-4xl mx-auto px-8 transform transition-all duration-700 ease-out"
          style={{
            transform: `translate(${mousePosition.x * 10}px, ${mousePosition.y * 5}px)`,
          }}
        >
          {/* Special indicator for Chrome Extension */}
          {currentFeature.isSpecial && (
            <div className="absolute top-8 right-8 flex items-center space-x-3 animate-pulse">
              <div className="relative">
                <div
                  className={`w-3 h-3 ${isDarkMode ? "bg-emerald-400" : "bg-emerald-500"} rounded-full`}
                ></div>
                <div
                  className={`absolute inset-0 w-3 h-3 ${isDarkMode ? "bg-emerald-400" : "bg-emerald-500"} rounded-full animate-ping`}
                ></div>
              </div>
              <span
                className={`text-sm font-medium tracking-wider ${currentFeature.accent}`}
              >
                LIVE
              </span>
            </div>
          )}

          {/* Icon */}
          <div className="flex justify-center mb-12">
            <div className={`relative group`}>
              <div
                className={`w-32 h-32 ${currentFeature.accentBg} backdrop-blur-sm rounded-3xl flex items-center justify-center border ${isDarkMode ? "border-white/10" : "border-black/10"} transition-all duration-500 hover:scale-105`}
              >
                <IconComponent
                  className={`w-16 h-16 ${currentFeature.accent} transition-all duration-500`}
                />
              </div>
              <div
                className={`absolute inset-0 w-32 h-32 ${currentFeature.accentBg} rounded-3xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-500`}
              />
            </div>
          </div>

          {/* Title */}
          <h1
            className={`text-5xl md:text-6xl lg:text-7xl font-light mb-8 ${isDarkMode ? "text-white" : "text-gray-900"} transition-all duration-700`}
          >
            {currentFeature.title}
          </h1>

          {/* Description */}
          <p
            className={`text-xl md:text-2xl mb-16 max-w-2xl mx-auto leading-relaxed ${isDarkMode ? "text-gray-300" : "text-gray-600"} transition-all duration-700`}
          >
            {currentFeature.description}
          </p>

          {/* Action Button */}
          <div className="flex flex-col items-center space-y-4">
            <div
              className={`group relative overflow-hidden rounded-full ${currentFeature.accentBg} backdrop-blur-sm border ${isDarkMode ? "border-white/20" : "border-black/20"} hover:scale-105 transition-all duration-300`}
            >
              <div
                className={`absolute inset-0 ${currentFeature.accentBg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              />
              <div className="relative flex items-center px-12 py-4">
                <span
                  className={`text-lg font-medium ${currentFeature.accent} group-hover:translate-x-2 transition-transform duration-300`}
                >
                  Get Started
                </span>
                <svg
                  className={`w-5 h-5 ml-4 ${currentFeature.accent} group-hover:translate-x-2 transition-transform duration-300`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </div>
            </div>

            {/* Auth Required indicator - subtle and centered */}
            {currentFeature.requiresAuth && !user && (
              <div
                className={`text-center opacity-60 transition-opacity duration-300`}
              >
                <span
                  className={`text-sm ${isDarkMode ? "text-white/70" : "text-gray-500"} font-light`}
                >
                  • Login required
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation dots */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-4 z-20">
        {features.map((_, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              handleNavDot(index);
            }}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentSection
                ? `${currentFeature.accentBg.replace("/10", "/50")} ${isDarkMode ? "border-white/30" : "border-black/30"} border`
                : `${isDarkMode ? "bg-white/20 hover:bg-white/30" : "bg-black/20 hover:bg-black/30"}`
            }`}
          />
        ))}
      </div>

      {/* Scroll hint */}
      <div
        className={`absolute bottom-16 left-1/2 transform -translate-x-1/2 text-center ${isDarkMode ? "text-white/60" : "text-black/60"} z-20`}
      >
        <div className="flex flex-col items-center space-y-2">
          <span className="text-sm font-light tracking-wide">
            Scroll to explore
          </span>
          <div className="w-6 h-10 border-2 border-current rounded-full flex justify-center">
            <div className="w-1 h-3 bg-current rounded-full mt-2 animate-bounce" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
