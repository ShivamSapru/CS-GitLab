import React, { useEffect, useRef, useState } from "react";
import {
  FileText,
  Users,
  FolderOpen,
  Mic,
  Chrome,
  Folder,
  File,
  BarChart3,
  PieChart,
  Database,
  Archive,
  BookOpen,
  Files,
  HardDrive,
  Cloud,
  Server,
  Mic2,
  Radio,
  Volume2,
  Headphones,
  Music,
  Play,
  Square,
} from "lucide-react";
import About from "./About";
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
      title: "Audio/Video Transcription",
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
    {
      id: "footer",
      title: "About SubLingo",
      icon: FileText, // You can change this to any icon you prefer
      description: "Learn more about our mission and technology",
      route: null, // No navigation route since it's a footer
      requiresAuth: false,
      isFooter: true, // Special flag to identify footer section
      background: isDarkMode
        ? "from-gray-950 via-slate-900 to-black"
        : "from-gray-200 via-slate-100 to-white",
      accent: isDarkMode ? "text-gray-400" : "text-gray-600",
      accentBg: isDarkMode ? "bg-gray-500/10" : "bg-gray-500/10",
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
    // Don't navigate if it's the footer section
    if (feature.isFooter) {
      return;
    }

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

  // Background component renderer

  const renderBackground = () => {
    switch (currentFeature.id) {
      case "static":
        return (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ zIndex: 0 }}
          >
            {/* Base gradient */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${
                isDarkMode
                  ? "from-indigo-950 via-slate-900 to-blue-950"
                  : "from-blue-50 via-indigo-50 to-slate-100"
              }`}
              style={{ zIndex: 0 }}
            />

            <div className="absolute inset-0" style={{ zIndex: 0 }}>
              {[
                "EN",
                "FR",
                "JP",
                "DE",
                "ES",
                "IT",
                "PT",
                "RU",
                "ZH",
                "AR",
                "KO",
                "HI",
                "TH",
                "VI",
                "NL",
                "SV",
                "NO",
                "DA",
                "FI",
                "PL",
                "TR",
                "HE",
                "FA",
                "UR",
                "BN",
                "TA",
                "TE",
                "ML",
                "KN",
                "GU",
              ].map((lang, i) => (
                <div
                  key={lang}
                  className={`absolute font-bold ${isDarkMode ? "text-blue-400/30" : "text-blue-600/20"} transition-all duration-1000`}
                  style={{
                    left: `${2 + ((i * 5) % 96)}%`,
                    top: `${2 + ((i * 7) % 96)}%`,
                    fontSize: `${1.2 + (i % 4) * 0.3}rem`,
                    transform: `translate(${mousePosition.x * (8 + i * 1.5)}px, ${mousePosition.y * (6 + i * 1.2)}px)`,
                    animation: `float ${2.5 + i * 0.3}s ease-in-out infinite alternate`,
                    opacity: 0.4 + (i % 3) * 0.2,
                    zIndex: 0, // ADD THIS
                  }}
                >
                  {lang}
                </div>
              ))}
            </div>

            {/* Connecting lines */}
            <svg
              className="absolute inset-0 w-full h-full opacity-20"
              style={{ zIndex: 0 }}
            >
              <defs>
                <linearGradient
                  id="lineGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop
                    offset="0%"
                    stopColor={isDarkMode ? "#60a5fa" : "#3b82f6"}
                    stopOpacity="0.3"
                  />
                  <stop
                    offset="100%"
                    stopColor={isDarkMode ? "#a855f7" : "#8b5cf6"}
                    stopOpacity="0.1"
                  />
                </linearGradient>
              </defs>
              {[...Array(8)].map((_, i) => (
                <path
                  key={i}
                  d={`M ${100 + i * 120} ${150 + i * 80} Q ${300 + i * 100} ${200 + i * 60} ${500 + i * 80} ${180 + i * 90}`}
                  stroke="url(#lineGradient)"
                  strokeWidth="2"
                  fill="none"
                  className="animate-pulse"
                  style={{ animationDelay: `${i * 0.5}s`, zIndex: 0 }}
                />
              ))}
            </svg>

            {/* Wave patterns */}
            <div className="absolute inset-0 opacity-10" style={{ zIndex: 0 }}>
              <div
                className={`absolute w-full h-32 ${isDarkMode ? "bg-gradient-to-r from-blue-600 via-purple-500 to-indigo-600" : "bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400"}`}
                style={{
                  top: "30%",
                  clipPath: "polygon(0 0, 100% 0, 100% 70%, 0 100%)",
                  transform: `translateX(${mousePosition.x * 20}px)`,
                  zIndex: 0, // ADD THIS
                }}
              />
              <div
                className={`absolute w-full h-24 ${isDarkMode ? "bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600" : "bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400"}`}
                style={{
                  top: "60%",
                  clipPath: "polygon(0 30%, 100% 0, 100% 100%, 0 70%)",
                  transform: `translateX(${mousePosition.x * -15}px)`,
                  zIndex: 0, // ADD THIS
                }}
              />
            </div>

            {/* Subtitle overlay effect */}
            <div
              className="absolute inset-0 flex items-center justify-center opacity-5"
              style={{ zIndex: 0 }}
            >
              <div className="text-center space-y-4">
                <div
                  className={`text-lg ${isDarkMode ? "text-white" : "text-gray-800"} font-light`}
                >
                  שלום, מה שלומך היום?
                </div>
                <div
                  className={`text-lg ${isDarkMode ? "text-white" : "text-gray-800"} font-light`}
                >
                  Bonjour, comment allez-vous aujourd'hui ?
                </div>
                <div
                  className={`text-lg ${isDarkMode ? "text-white" : "text-gray-800"} font-light`}
                >
                  こんにちは、今日はいかがですか？
                </div>
                <div
                  className={`text-lg ${isDarkMode ? "text-white" : "text-gray-800"} font-light`}
                >
                  سلام تاسې نن څنګه یاست؟
                </div>
              </div>
            </div>
          </div>
        );

      case "library":
        return (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ zIndex: 0 }}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${
                isDarkMode
                  ? "from-violet-950 via-purple-900 to-slate-950"
                  : "from-purple-50 via-violet-50 to-slate-100"
              }`}
              style={{ zIndex: 0 }}
            />

            <div className="absolute inset-0" style={{ zIndex: 0 }}>
              {[
                Folder,
                File,
                BarChart3,
                PieChart,
                Database,
                Archive,
                BookOpen,
                Files,
                HardDrive,
                Cloud,
                Server,
                Folder,
              ].map((IconComponent, i) => (
                <div
                  key={i}
                  className={`absolute ${isDarkMode ? "text-purple-400/20" : "text-purple-600/15"} transition-all duration-1000`}
                  style={{
                    left: `${10 + ((i * 15) % 80)}%`,
                    top: `${15 + ((i * 18) % 70)}%`,
                    transform: `translate(${mousePosition.x * (8 + i)}px, ${mousePosition.y * (6 + i * 0.8)}px) rotate(${i * 15}deg)`,
                    animation: `drift ${4 + i * 0.3}s ease-in-out infinite alternate`,
                    zIndex: 0, // ADD THIS
                  }}
                >
                  <IconComponent size={24 + (i % 3) * 8} />
                </div>
              ))}
            </div>

            <div className="absolute inset-0 opacity-5" style={{ zIndex: 0 }}>
              <div
                className={`absolute inset-0 ${isDarkMode ? "border-purple-400" : "border-purple-600"}`}
                style={{
                  backgroundImage: `linear-gradient(${isDarkMode ? "rgba(168, 85, 247, 0.1)" : "rgba(147, 51, 234, 0.1)"} 1px, transparent 1px), linear-gradient(90deg, ${isDarkMode ? "rgba(168, 85, 247, 0.1)" : "rgba(147, 51, 234, 0.1)"} 1px, transparent 1px)`,
                  backgroundSize: "60px 60px",
                  transform: `translate(${mousePosition.x * 5}px, ${mousePosition.y * 5}px)`,
                  zIndex: 0, // ADD THIS
                }}
              />
            </div>

            <div className="absolute inset-0" style={{ zIndex: 0 }}>
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`absolute w-32 h-2 ${isDarkMode ? "bg-purple-500/20" : "bg-purple-400/15"} rounded-full`}
                  style={{
                    left: `${20 + i * 12}%`,
                    top: `${30 + i * 8}%`,
                    transform: `scaleX(${0.3 + i * 0.15}) translateX(${mousePosition.x * 10}px)`,
                    animation: `pulse ${2 + i * 0.5}s ease-in-out infinite alternate`,
                    zIndex: 0, // ADD THIS
                  }}
                />
              ))}
            </div>
          </div>
        );

      case "transcription":
        return (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ zIndex: 0 }}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${
                isDarkMode
                  ? "from-amber-950 via-orange-900 to-slate-950"
                  : "from-amber-50 via-orange-50 to-slate-100"
              }`}
              style={{ zIndex: 0 }}
            />

            <div
              className="absolute inset-0 flex items-center justify-center opacity-20"
              style={{ zIndex: 0 }}
            >
              <div className="flex items-end space-x-1">
                {[...Array(50)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 ${isDarkMode ? "bg-amber-400" : "bg-amber-600"} rounded-full`}
                    style={{
                      height: `${20 + Math.sin(i * 0.5 + Date.now() * 0.003) * 40}px`,
                      animation: `wave ${1 + (i % 5) * 0.2}s ease-in-out infinite`,
                      animationDelay: `${i * 0.05}s`,
                      zIndex: 0, // ADD THIS
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="absolute inset-0" style={{ zIndex: 0 }}>
              {[Mic, Mic2, Radio, Volume2, Headphones, Music, Play, Square].map(
                (IconComponent, i) => (
                  <div
                    key={i}
                    className={`absolute ${isDarkMode ? "text-amber-400/15" : "text-amber-600/10"}`}
                    style={{
                      left: `${15 + ((i * 12) % 70)}%`,
                      top: `${20 + ((i * 15) % 60)}%`,
                      transform: `translate(${mousePosition.x * (5 + i)}px, ${mousePosition.y * (4 + i * 0.8)}px)`,
                      animation: `float ${3 + i * 0.4}s ease-in-out infinite alternate`,
                      zIndex: 0, // ADD THIS
                    }}
                  >
                    <IconComponent size={20 + (i % 4) * 6} />
                  </div>
                ),
              )}
            </div>

            <svg
              className="absolute inset-0 w-full h-full opacity-10"
              style={{ zIndex: 0 }}
            >
              <defs>
                <radialGradient id="soundGradient" cx="50%" cy="50%" r="50%">
                  <stop
                    offset="0%"
                    stopColor={isDarkMode ? "#fbbf24" : "#f59e0b"}
                    stopOpacity="0.3"
                  />
                  <stop
                    offset="100%"
                    stopColor={isDarkMode ? "#f59e0b" : "#d97706"}
                    stopOpacity="0.1"
                  />
                </radialGradient>
              </defs>
              {[...Array(5)].map((_, i) => (
                <circle
                  key={i}
                  cx="50%"
                  cy="50%"
                  r={50 + i * 30}
                  stroke="url(#soundGradient)"
                  strokeWidth="2"
                  fill="none"
                  className="animate-ping"
                  style={{
                    animationDelay: `${i * 0.5}s`,
                    animationDuration: "3s",
                    zIndex: 0, // ADD THIS
                  }}
                />
              ))}
            </svg>
          </div>
        );

      case "realtime":
        return (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ zIndex: 0 }}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${
                isDarkMode
                  ? "from-emerald-950 via-teal-900 to-slate-950"
                  : "from-emerald-50 via-teal-50 to-slate-100"
              }`}
              style={{ zIndex: 0 }}
            />

            <div className="absolute inset-0" style={{ zIndex: 0 }}>
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`absolute ${isDarkMode ? "bg-slate-800/20" : "bg-white/30"} backdrop-blur-sm rounded-lg border ${isDarkMode ? "border-emerald-400/20" : "border-emerald-600/20"}`}
                  style={{
                    width: `${120 + i * 20}px`,
                    height: `${80 + i * 15}px`,
                    left: `${20 + ((i * 18) % 60)}%`,
                    top: `${25 + ((i * 12) % 50)}%`,
                    transform: `translate(${mousePosition.x * (8 + i * 2)}px, ${mousePosition.y * (6 + i * 1.5)}px) rotate(${i * 5 - 10}deg)`,
                    animation: `float ${3 + i * 0.5}s ease-in-out infinite alternate`,
                    zIndex: 0, // ADD THIS
                  }}
                >
                  <div
                    className={`h-4 ${isDarkMode ? "bg-slate-700/50" : "bg-gray-200/50"} rounded-t-lg flex items-center px-2`}
                  >
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    </div>
                  </div>
                  <div className="p-2 space-y-1">
                    <div
                      className={`h-2 ${isDarkMode ? "bg-emerald-400/30" : "bg-emerald-600/20"} rounded`}
                    ></div>
                    <div
                      className={`h-1.5 ${isDarkMode ? "bg-emerald-400/20" : "bg-emerald-600/15"} rounded w-3/4`}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="absolute inset-0" style={{ zIndex: 0 }}>
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`absolute w-px h-24 ${isDarkMode ? "bg-gradient-to-b from-emerald-400/50 to-transparent" : "bg-gradient-to-b from-emerald-600/30 to-transparent"}`}
                  style={{
                    left: `${30 + i * 8}%`,
                    top: `${10 + i * 5}%`,
                    transform: `translateY(${mousePosition.y * 20}px)`,
                    animation: `stream ${2 + i * 0.3}s linear infinite`,
                    zIndex: 0, // ADD THIS
                  }}
                />
              ))}
            </div>
          </div>
        );

      case "footer":
        return (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ zIndex: 0 }}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${
                isDarkMode
                  ? "from-gray-950 via-slate-900 to-black"
                  : "from-gray-200 via-slate-100 to-white"
              }`}
              style={{ zIndex: 0 }}
            />

            <div className="absolute inset-0 opacity-5" style={{ zIndex: 0 }}>
              <div
                className={`absolute inset-0 ${isDarkMode ? "border-gray-400" : "border-gray-600"}`}
                style={{
                  backgroundImage: `linear-gradient(${isDarkMode ? "rgba(156, 163, 175, 0.1)" : "rgba(75, 85, 99, 0.1)"} 1px, transparent 1px), linear-gradient(90deg, ${isDarkMode ? "rgba(156, 163, 175, 0.1)" : "rgba(75, 85, 99, 0.1)"} 1px, transparent 1px)`,
                  backgroundSize: "40px 40px",
                  transform: `translate(${mousePosition.x * 3}px, ${mousePosition.y * 3}px)`,
                  zIndex: 0,
                }}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={containerRef}
      className="h-screen w-full overflow-auto relative cursor-pointer"
      onClick={() => handleFeatureClick(currentFeature)}
      style={{ zIndex: 1 }}
    >
      {/* Dynamic background */}
      {renderBackground()}
      {/* Original subtle animated background elements - now more subtle */}
      <div
        className="absolute inset-0 overflow-hidden opacity-15 "
        style={{ zIndex: 1 }}
      >
        <div
          className={`absolute w-96 h-96 ${currentFeature.accentBg} rounded-full blur-3xl transition-all duration-1000`}
          style={{
            top: "20%",
            left: "10%",
            transform: `translate(${mousePosition.x * 30}px, ${mousePosition.y * 20}px)`,
            zIndex: 1,
          }}
        />
        <div
          className={`absolute w-64 h-64 ${currentFeature.accentBg} rounded-full blur-3xl transition-all duration-1000`}
          style={{
            bottom: "20%",
            right: "20%",
            transform: `translate(${mousePosition.x * -20}px, ${mousePosition.y * -30}px)`,
            zIndex: 1,
          }}
        />
      </div>
      {/* Grid pattern overlay - more subtle */}
      <div className={`absolute inset-0 opacity-3`} style={{ zIndex: 1 }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, ${isDarkMode ? "white" : "black"} 1px, transparent 0)`,
            backgroundSize: "60px 60px",
            transform: `translate(${mousePosition.x * 10}px, ${mousePosition.y * 10}px)`,
            zIndex: 1,
          }}
        />
      </div>
      // Replace the Main content section in your Dashboard component (around
      lines 720-800):
      {/* Main content */}
      <div
        className="relative h-full flex items-center justify-center"
        style={{ zIndex: 2 }}
      >
        {currentFeature.isFooter ? (
          // Footer content - About component
          <About isDarkMode={isDarkMode} />
        ) : (
          // Regular feature content
          <div
            className="text-center max-w-4xl mx-auto px-8 transform transition-all duration-700 ease-out"
            style={{
              transform: `translate(${mousePosition.x * 10}px, ${mousePosition.y * 5}px)`,
            }}
          >
            {/* Icon */}
            <div className="flex justify-center mb-12">
              <div className="relative group">
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
                <div className="text-center opacity-60 transition-opacity duration-300">
                  <span
                    className={`text-sm ${isDarkMode ? "text-white/70" : "text-gray-500"} font-light`}
                  >
                    • Login required
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Navigation dots */}
      <div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-4"
        style={{ zIndex: 3 }}
      >
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
    </div>
  );
};

export default Dashboard;
