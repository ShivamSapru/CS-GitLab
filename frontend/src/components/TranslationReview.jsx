import React, { useState, useEffect, useCallback, useRef } from "react";
import NavigationWarningModal from "./NavigationWarningModal";
import notificationService from "../services/notificationService";
import {
  Upload,
  Download,
  Play,
  Pause,
  FileText,
  Settings,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  X,
  Edit,
  Save,
  Undo,
  Redo,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const convertSrtToVttManual = (srtContent) => {
  console.log("Starting manual SRT to VTT conversion...");

  let vttContent = "WEBVTT\n\n";

  // Split SRT into blocks
  const blocks = srtContent.trim().split(/\n\s*\n/);

  blocks.forEach((block) => {
    const lines = block.trim().split("\n");
    if (lines.length >= 3) {
      // Skip the subtitle number (first line) - this was the problem!
      const timeLine = lines[1];
      const textLines = lines.slice(2); // Get text lines (everything after timestamp)

      // Convert SRT timestamp format to VTT format
      // SRT: 00:00:01,000 --> 00:00:04,000
      // VTT: 00:00:01.000 --> 00:00:04.000
      if (timeLine && timeLine.includes("-->")) {
        const vttTimeLine = timeLine.replace(/,/g, ".");
        vttContent += vttTimeLine + "\n";

        // FIXED: Only add the text lines, don't include sequence numbers
        vttContent += textLines.join("\n") + "\n\n";
      }
    }
  });

  console.log(
    "Manual conversion result (first 300 chars):",
    vttContent.substring(0, 300),
  );
  return vttContent;
};

// Also fix the parseVttSubtitles function to handle this properly:
const parseVttSubtitles = (content) => {
  console.log("🎯 Parsing VTT content, length:", content.length);
  const lines = content.split("\n");
  const subtitles = [];
  let currentSubtitle = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip WEBVTT header and empty lines
    if (line === "WEBVTT" || line === "") continue;

    // Skip sequence numbers (lines that are just digits)
    if (/^\d+$/.test(line)) {
      continue; // ADDED: Skip number-only lines
    }

    // Check for timestamp line
    const timeMatch = line.match(
      /(\d{1,2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}\.\d{3})/,
    );

    if (timeMatch) {
      // If we have a previous subtitle, save it
      if (currentSubtitle) {
        subtitles.push(currentSubtitle);
      }

      // Start new subtitle
      try {
        currentSubtitle = {
          startTime: parseTimestamp(timeMatch[1]),
          endTime: parseTimestamp(timeMatch[2]),
          text: "",
          originalBlock: line,
        };
      } catch (parseError) {
        console.error("❌ Failed to parse VTT timestamp:", parseError);
        currentSubtitle = null;
      }
    } else if (currentSubtitle && line) {
      // Add text to current subtitle (skip empty lines and numbers)
      if (!/^\d+$/.test(line)) {
        // ADDED: Don't add number-only lines to text
        currentSubtitle.text += (currentSubtitle.text ? "\n" : "") + line;
        currentSubtitle.originalBlock += "\n" + line;
      }
    }
  }

  // Don't forget the last subtitle
  if (currentSubtitle) {
    subtitles.push(currentSubtitle);
  }

  console.log("✅ Total parsed VTT subtitles:", subtitles.length);
  return subtitles;
};

const VideoPreviewPlayer = ({
  videoUrl,
  videoRef,
  parsedSubtitles,
  convertedVttContent,
  previewContent,
  selectedLocale,
  isDarkMode,
  currentSubtitleIndex,
  setCurrentSubtitleIndex,
  accentColors,
  file,
  showVideoPreview,
  setVideoUrl,
  setShowVideoPreview,
  setError,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [maxPlayTime, setMaxPlayTime] = useState(10);
  const [isInitialized, setIsInitialized] = useState(false);

  // 1. Initialize video to first subtitle - ONLY when parsedSubtitles change
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !parsedSubtitles.length) {
      setIsInitialized(false);
      return;
    }

    // Prevent re-initialization if already initialized with these subtitles
    if (isInitialized) return;

    const initializeVideoToFirstSubtitle = () => {
      const firstSubtitle = parsedSubtitles[0];
      if (firstSubtitle && firstSubtitle.startTime >= 0) {
        const startTime = Math.max(0, firstSubtitle.startTime - 1);
        console.log(
          `🎬 Initializing video to first subtitle at: ${startTime}s`,
        );

        video.currentTime = startTime;
        setCurrentTime(startTime);
        setMaxPlayTime(Math.min(firstSubtitle.endTime + 3, startTime + 15));
        setIsInitialized(true);
      } else {
        video.currentTime = 0;
        setCurrentTime(0);
        setMaxPlayTime(10);
        setIsInitialized(true);
      }
    };

    if (video.readyState >= 2) {
      initializeVideoToFirstSubtitle();
    } else {
      const handleCanPlay = () => {
        initializeVideoToFirstSubtitle();
        video.removeEventListener("canplaythrough", handleCanPlay);
        video.removeEventListener("loadeddata", handleCanPlay);
      };

      video.addEventListener("canplaythrough", handleCanPlay);
      video.addEventListener("loadeddata", handleCanPlay);

      return () => {
        video.removeEventListener("canplaythrough", handleCanPlay);
        video.removeEventListener("loadeddata", handleCanPlay);
      };
    }
  }, [parsedSubtitles, isInitialized, videoRef]); // Add isInitialized to deps

  // 2. Handle video events - SEPARATE from initialization
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);

      if (parsedSubtitles.length > 0) {
        const currentIndex = parsedSubtitles.findIndex(
          (sub) => time >= sub.startTime && time <= sub.endTime,
        );
        setCurrentSubtitleIndex(currentIndex);
      }

      if (time >= maxPlayTime) {
        video.pause();
        setIsPlaying(false);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [parsedSubtitles, maxPlayTime, setCurrentSubtitleIndex]);

  // 3. Handle subtitle track loading - SEPARATE effect
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !convertedVttContent) return;

    const enableSubtitles = () => {
      if (video.textTracks && video.textTracks.length > 0) {
        video.textTracks[0].mode = "showing";
        console.log("✅ Subtitles enabled");
      }
    };

    // Small delay to ensure track is loaded
    const timer = setTimeout(enableSubtitles, 200);

    return () => clearTimeout(timer);
  }, [convertedVttContent]);

  // 4. Clean up subtitle tracks when content changes
  useEffect(() => {
    console.log("🧹 Safe cleanup triggered", {
      convertedVttLength: convertedVttContent?.length,
      previewContentLength: previewContent?.length,
    });

    // Only clean up subtitle URLs, NOT video URLs
    if (window.previousSubtitleUrl) {
      try {
        URL.revokeObjectURL(window.previousSubtitleUrl);
        console.log("✅ Revoked previous subtitle URL");
      } catch (error) {
        console.log("⚠️ Error revoking subtitle URL:", error);
      }
      window.previousSubtitleUrl = null;
      window.currentSubtitleContent = null;
      window.currentSubtitleHash = null;
    }

    // Reset subtitle-related state only
    setCurrentSubtitleIndex(-1);
    setIsInitialized(false);

    // Disable text tracks without affecting video source
    const video = videoRef.current;
    if (video && video.textTracks) {
      try {
        for (let i = 0; i < video.textTracks.length; i++) {
          if (video.textTracks[i]) {
            video.textTracks[i].mode = "disabled";
          }
        }
        console.log("✅ Disabled all text tracks via API");
      } catch (error) {
        console.log("⚠️ Error disabling tracks:", error);
      }
    }
  }, [convertedVttContent, previewContent, setCurrentSubtitleIndex]);

  const createSubtitleTrack = useCallback(() => {
    try {
      const subtitleContent = convertedVttContent || previewContent;
      if (!subtitleContent || subtitleContent.trim().length === 0) {
        console.log("❌ No subtitle content available for track");
        return null;
      }

      // CRITICAL: Check if this is old content
      if (subtitleContent.includes("So here like I'v")) {
        console.error("🚨 ALERT: Old content detected in createSubtitleTrack!");
        return null;
      }

      // Create unique identifier based on actual content
      const contentHash = btoa(subtitleContent.substring(0, 100)).substring(
        0,
        8,
      );

      // IMPORTANT: Check if we already have this exact content
      if (window.currentSubtitleHash === contentHash) {
        console.log("✅ Using existing subtitle track for same content");
        return window.previousSubtitleUrl;
      }

      console.log(
        "🎯 Creating NEW subtitle track for different content:",
        contentHash,
      );

      let vttContent = subtitleContent.trim();

      // Check if content is SRT format and convert it manually
      if (!vttContent.startsWith("WEBVTT") && vttContent.match(/^\d+\s*$/m)) {
        console.log("🔄 Converting SRT to VTT");
        vttContent = convertSrtToVttManual(vttContent);
      }

      // Ensure proper VTT format
      if (!vttContent.startsWith("WEBVTT")) {
        vttContent = `WEBVTT\n\n${vttContent}`;
      }

      if (
        vttContent.startsWith("WEBVTT\n") &&
        !vttContent.startsWith("WEBVTT\n\n")
      ) {
        vttContent = vttContent.replace("WEBVTT\n", "WEBVTT\n\n");
      }

      // Clean up previous URL only if we're creating a new one
      if (
        window.previousSubtitleUrl &&
        window.currentSubtitleHash !== contentHash
      ) {
        try {
          URL.revokeObjectURL(window.previousSubtitleUrl);
          console.log("✅ Revoked old subtitle URL");
        } catch (error) {
          console.log("⚠️ Error revoking old URL:", error);
        }
      }

      // Create new blob and URL
      const blob = new Blob([vttContent], {
        type: "text/vtt; charset=utf-8",
      });
      const url = URL.createObjectURL(blob);

      // Store for reuse and cleanup
      window.previousSubtitleUrl = url;
      window.currentSubtitleHash = contentHash;

      console.log(
        "✅ NEW subtitle track URL created:",
        url.substring(0, 50) + "...",
      );
      return url;
    } catch (error) {
      console.error("❌ Error creating subtitle track:", error);
      return null;
    }
  }, [convertedVttContent, previewContent]); // Remove convertSrtToVttManual from dependencies

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    console.log("🎬 Enhanced video setup:", {
      videoUrl: videoUrl.substring(0, 100) + "...",
      videoExists: !!video,
      readyState: video.readyState,
    });

    const setupVideo = async () => {
      try {
        // Clear any existing sources
        video.pause();
        video.currentTime = 0;

        // Remove existing text tracks
        if (video.textTracks) {
          for (let i = 0; i < video.textTracks.length; i++) {
            video.textTracks[i].mode = "disabled";
          }
        }

        console.log("🔄 Setting video source:", videoUrl);
        video.src = videoUrl;

        // Set video properties
        video.muted = false;
        video.volume = 1.0;
        video.preload = "metadata";

        // Wait for the video to be ready
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Video load timeout"));
          }, 15000); // 15 second timeout

          const handleCanPlay = () => {
            clearTimeout(timeout);
            video.removeEventListener("canplay", handleCanPlay);
            video.removeEventListener("error", handleError);
            console.log("✅ Video can play");
            resolve();
          };

          const handleError = (e) => {
            clearTimeout(timeout);
            video.removeEventListener("canplay", handleCanPlay);
            video.removeEventListener("error", handleError);
            console.error("❌ Video load error:", e);
            reject(new Error("Video load failed"));
          };

          video.addEventListener("canplay", handleCanPlay);
          video.addEventListener("error", handleError);

          video.load();
        });

        console.log("✅ Video setup completed successfully");
      } catch (error) {
        console.error("❌ Video setup failed:", error);
        setError(`Video setup failed: ${error.message}`);
      }
    };

    setupVideo();

    // Cleanup function
    return () => {
      if (video) {
        video.pause();
        // Don't clear src here as it might be needed
      }
    };
  }, [videoUrl, videoRef, setError]);

  // Also add this enhanced video error handler
  const handleVideoError = (e) => {
    const video = videoRef.current;
    console.error("🎬 Video error event:", e);

    if (video?.error) {
      const errorMessages = {
        1: "Video loading was aborted",
        2: "Network error while loading video",
        3: "Video decoding failed - format may not be supported",
        4: "Video format not supported by browser",
      };

      const errorCode = video.error.code;
      const errorMessage =
        errorMessages[errorCode] || `Unknown video error (code: ${errorCode})`;

      console.error("🎬 Video error details:", {
        code: errorCode,
        message: errorMessage,
        videoSrc: video.src?.substring(0, 100) + "...",
        readyState: video.readyState,
        networkState: video.networkState,
      });

      setError(`Video preview error: ${errorMessage}`);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    console.log("🎬 Setting video source from backend URL:", videoUrl);
    video.src = videoUrl;
    video.load();
  }, [videoUrl, videoRef]);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (isPlaying) {
        video.pause();
        console.log("🔄 Video paused");
      } else {
        if (video.currentTime >= maxPlayTime) {
          const firstSubtitle = parsedSubtitles[0];
          const resetTime =
            firstSubtitle && firstSubtitle.startTime >= 0
              ? Math.max(0, firstSubtitle.startTime - 1)
              : 0;
          video.currentTime = resetTime;
          setCurrentTime(resetTime);

          if (firstSubtitle) {
            const newMaxTime = Math.min(
              firstSubtitle.endTime + 3,
              resetTime + 15,
            );
            setMaxPlayTime(newMaxTime);
          } else {
            setMaxPlayTime(10);
          }
        }

        // Add promise handling for play()
        console.log("▶️ Attempting to play video");
        await video.play();
        console.log("✅ Video playing successfully");
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("⚠️ Play request was interrupted (expected behavior)");
      } else if (error.name === "NotAllowedError") {
        console.log("⚠️ Autoplay prevented by browser policy");
        // User needs to interact with the page first
      } else {
        console.error("❌ Video play error:", error);
      }
    }
  };

  const resetPlayer = () => {
    const video = videoRef.current;
    if (!video) return;

    const firstSubtitle = parsedSubtitles[0];
    const resetTime =
      firstSubtitle && firstSubtitle.startTime >= 0
        ? Math.max(0, firstSubtitle.startTime - 1)
        : 0;

    video.currentTime = resetTime;
    setCurrentTime(resetTime);

    if (firstSubtitle) {
      const newMaxTime = Math.min(firstSubtitle.endTime + 3, resetTime + 15);
      setMaxPlayTime(newMaxTime);
    } else {
      setMaxPlayTime(10);
    }

    video.pause();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const subtitleStyles = `
    video::cue {
      background-color: rgba(0, 0, 0, 0.8) !important;
      color: white !important;
      font-size: 20px !important;
      font-family: Arial, sans-serif !important;
      font-weight: bold !important;
      line-height: 1.4 !important;
      padding: 6px 12px !important;
      border-radius: 6px !important;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8) !important;
    }

    video::cue(.future) {
      color: #cccccc !important;
    }
  `;

  return (
    <div
      className={`rounded-lg p-4 mb-4 transition-colors duration-300 ${
        isDarkMode ? "bg-gray-700" : "bg-gray-50"
      }`}
    >
      <h5
        className={`font-medium mb-3 flex items-center transition-colors duration-300 ${
          isDarkMode ? "text-gray-200" : "text-gray-700"
        }`}
      >
        <Play className="w-4 h-4 mr-2" />
        Video Preview
      </h5>

      <div className="space-y-4">
        <div className="w-full">
          <div
            className="relative bg-black overflow-hidden w-full"
            style={{ aspectRatio: "16/9" }}
          >
            <style>{subtitleStyles}</style>
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              controls={false}
              preload="metadata"
              playsInline={true}
              muted={false}
              onLoadStart={() => console.log("🎬 Video load started")}
              onError={(e) => {
                const video = videoRef.current;
                console.error("🎬 Video error:", {
                  code: video?.error?.code,
                  message: video?.error?.message,
                  networkState: video?.networkState,
                  readyState: video?.readyState,
                });
              }}
              onLoadedMetadata={() => {
                const video = videoRef.current;
                console.log("✅ Video metadata loaded:", {
                  duration: video.duration,
                  width: video.videoWidth,
                  height: video.videoHeight,
                });
              }}
            >
              Your browser does not support the video tag.
            </video>

            {currentSubtitleIndex >= 0 &&
              parsedSubtitles[currentSubtitleIndex] && (
                <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 max-w-[80%] z-10">
                  <div
                    className="bg-black bg-opacity-80 text-white px-4 py-2 rounded-lg text-center"
                    style={{
                      fontSize: "18px",
                      fontWeight: "bold",
                      lineHeight: "1.4",
                      textShadow: "2px 2px 4px rgba(0, 0, 0, 0.8)",
                    }}
                  >
                    {parsedSubtitles[currentSubtitleIndex].text}
                  </div>
                </div>
              )}

            {/* Video Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
              <div className="flex items-center space-x-3">
                <button
                  onClick={togglePlay}
                  className={`text-white transition-colors ${
                    isDarkMode
                      ? "hover:text-orange-300"
                      : "hover:text-orange-200"
                  }`}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                </button>
                <button
                  onClick={resetPlayer}
                  className={`text-white transition-colors ${
                    isDarkMode
                      ? "hover:text-orange-300"
                      : "hover:text-orange-200"
                  }`}
                  title="Reset to first subtitle"
                >
                  <Undo className="w-5 h-5" />
                </button>
                <div className="flex-1">
                  <div className="bg-white/30 rounded-full h-1">
                    <div
                      className={`h-1 rounded-full transition-all duration-100 bg-gradient-to-r ${
                        isDarkMode
                          ? accentColors?.dark ||
                            "from-yellow-600 via-orange-600 to-red-700"
                          : accentColors?.light ||
                            "from-yellow-500 via-orange-500 to-red-500"
                      }`}
                      style={{
                        width: `${Math.max(0, Math.min(100, ((currentTime - (parsedSubtitles[0]?.startTime || 0)) / (maxPlayTime - (parsedSubtitles[0]?.startTime || 0))) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-white text-sm font-mono">
                  {formatTime(currentTime)} / {formatTime(maxPlayTime)}
                </span>
              </div>

              {parsedSubtitles.length > 0 && (
                <div
                  className={`text-xs mt-1 transition-colors duration-300 ${
                    isDarkMode ? "text-orange-300" : "text-orange-200"
                  }`}
                >
                  {parsedSubtitles[0].startTime > 0
                    ? `First subtitle starts at ${formatTime(parsedSubtitles[0].startTime)} (playing from ${formatTime(Math.max(0, parsedSubtitles[0].startTime - 1))})`
                    : "Playing from beginning with subtitles"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TranscriptionApp = ({
  onTranslateTranscription,
  onNavigateAway,
  isDarkMode,
  accentColors,
}) => {
  // File and transcription states
  const [activeTab, setActiveTab] = useState("upload");
  const [file, setFile] = useState(null);
  const [locales, setLocales] = useState({});
  const [selectedLocale, setSelectedLocale] = useState("en-US");
  const [maxSpeakers, setMaxSpeakers] = useState(2);
  const [censorProfanity, setCensorProfanity] = useState(false);
  const [outputFormat, setOutputFormat] = useState("srt");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState(null);
  const [error, setError] = useState("");

  // Preview feature states
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);

  // UI states
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Video preview states
  const [videoUrl, setVideoUrl] = useState(null);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [parsedSubtitles, setParsedSubtitles] = useState([]);
  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState(-1);
  const [convertedVttContent, setConvertedVttContent] = useState("");

  // Polling states
  const [isPolling, setIsPolling] = useState(false);
  const [projectId, setProjectId] = useState(null);

  const [eventSource, setEventSource] = useState(null);
  const [transcriptionStage, setTranscriptionStage] = useState("");
  const [notifications, setNotifications] = useState([]);

  const [showNavigationWarning, setShowNavigationWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  // Refs
  const previewRef = useRef(null);
  const editTextareaRef = useRef(null);
  const videoRef = useRef(null);

  const [hasRestoredState, setHasRestoredState] = useState(false);

  // Save state to sessionStorage
  const saveTranscriptionState = useCallback(() => {
    if (projectId && (isTranscribing || transcriptionResult)) {
      const state = {
        projectId,
        isTranscribing,
        transcriptionResult: {
          ...transcriptionResult,
          // ← NEW: Ensure media_url is saved
          media_url: transcriptionResult?.media_url,
        },
        file: file
          ? {
              name: file.name,
              size: file.size,
              type: file.type,
            }
          : null,
        selectedLocale,
        outputFormat,
        maxSpeakers,
        censorProfanity,
        timestamp: Date.now(),
      };

      sessionStorage.setItem("transcriptionState", JSON.stringify(state));
      console.log("💾 Saved transcription state with media_url:", state);
    }
  }, [
    projectId,
    isTranscribing,
    transcriptionResult,
    file,
    selectedLocale,
    outputFormat,
    maxSpeakers,
    censorProfanity,
  ]);

  const clearBackendCache = async () => {
    if (!projectId) {
      setError("No project ID available");
      return;
    }

    try {
      console.log(
        "🧹 Attempting to clear backend cache for project:",
        projectId,
      );

      // Try to force a fresh transcription status check
      const response = await fetch(
        `${BACKEND_URL}/api/transcription-status-check/${projectId}?force_refresh=true&_=${Date.now()}`,
        {
          credentials: "include",
          cache: "no-cache",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Backend cache refresh response:", data);

        if (data.filename) {
          // Update the transcription result with the fresh filename
          setTranscriptionResult((prev) => ({
            ...prev,
            transcribed_filename: data.filename,
          }));

          console.log("📁 Updated filename to:", data.filename);
          showNotification(
            "Backend cache cleared. Try preview again.",
            "success",
          );
        }
      } else {
        throw new Error(`Cache clear failed: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Failed to clear backend cache:", error);
      setError(`Failed to clear backend cache: ${error.message}`);
    }
  };

  // Add this debug function to your component
  const debugVideoSetup = async () => {
    console.log("🔍 COMPREHENSIVE VIDEO DEBUG:");
    console.log("1. File info:", {
      name: file?.name,
      type: file?.type,
      size: file?.size,
      lastModified: file?.lastModified,
    });

    if (file) {
      try {
        // Test if we can read the file
        const arrayBuffer = await file.arrayBuffer();
        console.log("2. File ArrayBuffer size:", arrayBuffer.byteLength);

        // Test blob URL creation
        const testUrl = URL.createObjectURL(file);
        console.log("3. Test blob URL created:", testUrl);

        // Test if blob URL is accessible
        try {
          const response = await fetch(testUrl);
          console.log("4. Blob URL fetch status:", response.status);
          console.log(
            "5. Blob URL content-type:",
            response.headers.get("content-type"),
          );

          URL.revokeObjectURL(testUrl); // Clean up test URL
        } catch (fetchError) {
          console.error("4. Blob URL fetch failed:", fetchError);
        }
      } catch (fileError) {
        console.error("2. File read failed:", fileError);
      }
    }

    // Check video element state
    const video = videoRef.current;
    if (video) {
      console.log("6. Video element state:", {
        src: video.src,
        readyState: video.readyState,
        networkState: video.networkState,
        error: video.error,
      });
    }
  };

  const debugBackendResponse = async () => {
    const projectId = "5988d15a-6ab0-4abc-9a30-f505c3cdd132"; // Your current project

    console.log("🔍 DIRECT BACKEND TEST:");

    try {
      // Test the status endpoint directly
      const response = await fetch(
        `${BACKEND_URL}/api/transcription-status-check/${projectId}`,
        {
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache",
          },
        },
      );

      console.log("📊 Response status:", response.status);
      console.log(
        "📊 Response headers:",
        Object.fromEntries(response.headers.entries()),
      );

      if (response.ok) {
        const data = await response.json();
        console.log("📊 Response data:", data);
        console.log("📊 Response keys:", Object.keys(data));
        console.log("📊 Has media_url?", "media_url" in data);
        console.log("📊 Media URL value:", data.media_url);
      } else {
        const errorText = await response.text();
        console.log("❌ Error response:", errorText);
      }
    } catch (error) {
      console.log("❌ Request failed:", error);
    }

    // Also test the debug endpoint
    try {
      const debugResponse = await fetch(
        `${BACKEND_URL}/api/debug-project/${projectId}`,
        { credentials: "include" },
      );

      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        console.log("🔍 Debug endpoint data:", debugData);
      }
    } catch (error) {
      console.log("Debug endpoint not available:", error);
    }
  };
  const debugPreviewProcess = async () => {
    console.log("🎬 ENHANCED PREVIEW DEBUG:");

    console.log("1. Initial state:", {
      projectId,
      transcriptionResult,
      hasMediaUrl: !!transcriptionResult?.media_url,
    });

    if (!projectId) {
      console.log("❌ No project ID");
      return;
    }

    // Step 1: Fresh status check
    console.log("2. Fetching fresh status...");
    try {
      const statusResponse = await fetch(
        `${BACKEND_URL}/api/transcription-status-check/${projectId}`,
        {
          credentials: "include",
          headers: { "Cache-Control": "no-cache" },
        },
      );

      console.log("   Status response OK:", statusResponse.ok);

      if (statusResponse.ok) {
        const freshData = await statusResponse.json();
        console.log("   Fresh data:", freshData);
        console.log("   Fresh data keys:", Object.keys(freshData));
        console.log("   Has media_url in response:", "media_url" in freshData);

        if (freshData.media_url) {
          console.log("✅ Found media_url in backend response!");
          console.log(
            "   Media URL:",
            freshData.media_url.substring(0, 100) + "...",
          );

          // Update state
          setTranscriptionResult((prev) => ({
            ...prev,
            ...freshData,
          }));

          // Test media URL accessibility
          try {
            const mediaTest = await fetch(freshData.media_url, {
              method: "HEAD",
              credentials: "include",
            });
            console.log("   Media URL accessible:", mediaTest.ok);
            console.log("   Media URL status:", mediaTest.status);
            console.log(
              "   Content-Type:",
              mediaTest.headers.get("content-type"),
            );

            if (mediaTest.ok) {
              console.log("🎬 Setting up video preview...");
              setVideoUrl(freshData.media_url);
              setShowVideoPreview(true);
              console.log("✅ Video preview should now be visible");
            } else {
              console.log("❌ Media URL not accessible");
            }
          } catch (mediaError) {
            console.log("❌ Media URL test failed:", mediaError);
          }
        } else {
          console.log("❌ No media_url in backend response");
        }
      } else {
        console.log("❌ Status request failed:", statusResponse.status);
      }
    } catch (error) {
      console.log("❌ Status request error:", error);
    }
  };

  // Restore state from sessionStorage
  const restoreTranscriptionState = useCallback(() => {
    const savedState = sessionStorage.getItem("transcriptionState");
    if (savedState && !hasRestoredState) {
      try {
        const state = JSON.parse(savedState);
        console.log("🔄 Restoring transcription state:", state);

        const now = Date.now();
        const stateAge = now - (state.timestamp || 0);
        const maxAge = 2 * 60 * 60 * 1000;

        if (stateAge < maxAge) {
          setProjectId(state.projectId);
          setTranscriptionResult(state.transcriptionResult);
          setSelectedLocale(state.selectedLocale);
          setOutputFormat(state.outputFormat);
          setMaxSpeakers(state.maxSpeakers);
          setCensorProfanity(state.censorProfanity);

          // ← NEW: Restore video URL from media_url if available
          if (state.transcriptionResult?.media_url) {
            console.log(
              "🎬 Restoring video from media_url:",
              state.transcriptionResult.media_url,
            );
            setVideoUrl(state.transcriptionResult.media_url);
            if (
              state.file?.type?.startsWith("video/") ||
              state.file?.type?.startsWith("audio/")
            ) {
              setShowVideoPreview(true);
            }
          }

          if (state.file) {
            const mockFile = new File([""], state.file.name, {
              type: state.file.type,
            });
            Object.defineProperty(mockFile, "size", { value: state.file.size });
            setFile(mockFile);
          }

          checkTranscriptionStatus(state.projectId);
          setHasRestoredState(true);
        } else {
          sessionStorage.removeItem("transcriptionState");
        }
      } catch (error) {
        console.error("Failed to restore transcription state:", error);
        sessionStorage.removeItem("transcriptionState");
      }
    }
  }, [hasRestoredState]);

  useEffect(() => {
    console.log("📄 previewContent changed:", {
      length: previewContent?.length,
      preview: previewContent?.substring(0, 100),
    });
  }, [previewContent]);

  useEffect(() => {
    console.log("📺 convertedVttContent changed:", {
      length: convertedVttContent?.length,
      preview: convertedVttContent?.substring(0, 100),
    });
  }, [convertedVttContent]);

  useEffect(() => {
    console.log("🎬 parsedSubtitles changed:", {
      count: parsedSubtitles?.length,
      firstSubtitle: parsedSubtitles?.[0]?.text?.substring(0, 50),
    });
  }, [parsedSubtitles]);

  useEffect(() => {
    // On component mount, if we have a projectId, always check fresh status
    if (projectId && !hasRestoredState && checkTranscriptionStatus) {
      console.log(
        "🚀 Component mounted, checking fresh status for:",
        projectId,
      );
      setTimeout(() => {
        checkTranscriptionStatus(projectId);
      }, 500);
    }
  }, [projectId, hasRestoredState]);

  // Fetch available locales on component mount
  useEffect(() => {
    fetchLocales();
  }, []);

  const testBackendConnection = async () => {
    try {
      console.log("🔍 Testing backend connection...");
      const response = await fetch(`${BACKEND_URL}/api/locales`, {
        credentials: "include",
      });

      if (response.ok) {
        console.log("✅ Backend is responding");
        const data = await response.json();
        console.log("📊 Locales received:", Object.keys(data).length);
      } else {
        console.error(
          "❌ Backend returned:",
          response.status,
          response.statusText,
        );
      }
    } catch (error) {
      console.error("❌ Backend connection failed:", error);
    }
  };

  const checkTranscriptionStatus = async (projectId) => {
    try {
      console.log("🔍 Checking status for project:", projectId);
      const response = await fetch(
        `${BACKEND_URL}/api/transcription-status-check/${projectId}`, // ← CHANGED: Use new endpoint
        { credentials: "include" },
      );

      if (response.ok) {
        const data = await response.json();
        console.log("📊 Status response:", data);

        if (data.status === "Completed") {
          console.log("✅ Transcription completed, updating UI");
          setIsTranscribing(false);

          // ← NEW: Get media_url from response
          const mediaUrl = data.media_url;
          const filename =
            data.filename || `transcription_${projectId.slice(0, 8)}.srt`;

          setTranscriptionResult((prev) => ({
            ...prev,
            status: "Completed",
            transcribed_filename: filename,
            media_url: mediaUrl, // ← NEW: Store media_url
          }));

          // ← NEW: Set video URL from backend media_url
          if (
            mediaUrl &&
            (file?.type?.startsWith("video/") ||
              file?.type?.startsWith("audio/"))
          ) {
            console.log(
              "🎬 Setting video URL from backend media_url:",
              mediaUrl,
            );
            setVideoUrl(mediaUrl);
            setShowVideoPreview(true);
          }

          setActiveTab("result");
          showNotification("Transcription completed successfully!", "success");

          if (notificationService.isMonitoring(projectId)) {
            notificationService.stopMonitoring(projectId);
          }
        } else if (data.status === "Failed") {
          console.log("❌ Transcription failed");
          setIsTranscribing(false);
          setError(data.message || "Transcription failed");

          if (notificationService.isMonitoring(projectId)) {
            notificationService.stopMonitoring(projectId);
          }
        } else if (data.status === "In Progress") {
          console.log("⏳ Transcription still in progress");
          setIsTranscribing(true);
          if (!isTranscribing) {
            connectToTranscriptionEvents(projectId);
          }
        }
      } else {
        console.error(
          "Status check failed:",
          response.status,
          response.statusText,
        );
      }
    } catch (error) {
      console.error("Status check error:", error);
      setIsTranscribing(false);
    }
  };

  const debugBackendFiles = async () => {
    try {
      console.log("🔍 Debugging backend files...");

      // Try to get a list of available files (if your backend supports this)
      const response = await fetch(
        `${BACKEND_URL}/api/list-files?project_id=${projectId}`,
        {
          credentials: "include",
        },
      );

      if (response.ok) {
        const files = await response.json();
        console.log("📁 Backend files:", files);
      } else {
        console.log("⚠️ Backend file list not available");
      }

      // Also try to get the exact content that the backend thinks it should serve
      if (transcriptionResult?.transcribed_filename) {
        console.log(
          "📄 Trying to fetch:",
          transcriptionResult.transcribed_filename,
        );

        const contentResponse = await fetch(
          `${BACKEND_URL}/api/download-transcription?filename=${encodeURIComponent(transcriptionResult.transcribed_filename)}&debug=true&_=${Date.now()}`,
          { credentials: "include" },
        );

        if (contentResponse.ok) {
          const content = await contentResponse.text();
          console.log("📊 Current backend content length:", content.length);
          console.log(
            "📄 Current backend content preview:",
            content.substring(0, 200),
          );
        }
      }
    } catch (error) {
      console.error("❌ Debug failed:", error);
    }
  };

  const fetchLocales = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/locales`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setLocales(data);
    } catch (err) {
      console.error("Locale fetch error:", err);
      setError(`Failed to fetch available languages: ${err.message}`);
      // Fallback to some common locales if API fails
      setLocales({
        "en-US": "English (United States)",
        "es-ES": "Spanish (Spain)",
        "fr-FR": "French (France)",
        "de-DE": "German (Germany)",
        "it-IT": "Italian (Italy)",
        "pt-BR": "Portuguese (Brazil)",
        "ja-JP": "Japanese (Japan)",
        "ko-KR": "Korean (South Korea)",
        "zh-CN": "Chinese (Simplified)",
      });
    }
  };

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    if (uploadedFile) {
      // Clear previous transcription data when new file is selected
      console.log("🧹 Clearing previous data for new file upload");
      setPreviewContent("");
      setConvertedVttContent("");
      setParsedSubtitles([]);
      setCurrentSubtitleIndex(-1);
      setShowPreview(false);
      setShowVideoPreview(false);
      // Check file type
      const allowedTypes = ["audio/", "video/"];
      const isAllowed = allowedTypes.some((type) =>
        uploadedFile.type.startsWith(type),
      );

      if (isAllowed) {
        setFile(uploadedFile);
        setError("");
      } else {
        setError("Please upload an audio or video file");
      }
    }
  };

  const handleTranscribe = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    // COMPREHENSIVE STATE RESET - Clear ALL previous transcription data
    console.log(
      "🧹 COMPREHENSIVE RESET: Clearing all previous transcription state",
    );

    // Clear preview states
    setShowPreview(false);
    setShowVideoPreview(false);
    setPreviewContent("");
    setConvertedVttContent("");
    setParsedSubtitles([]);
    setCurrentSubtitleIndex(-1);

    // ← SIMPLIFIED: Just clear video URL state, no blob URL cleanup needed
    setVideoUrl(null);

    // Clean up previous subtitle URLs
    if (window.previousSubtitleUrl) {
      URL.revokeObjectURL(window.previousSubtitleUrl);
      window.previousSubtitleUrl = null;
      window.currentSubtitleContent = null;
      window.currentSubtitleHash = null;
    }

    // Clear any existing video subtitle tracks
    const video = videoRef.current;
    if (video && video.textTracks) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = "disabled";
      }
    }

    setIsTranscribing(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("locale", selectedLocale);
    formData.append("max_speakers", maxSpeakers.toString());
    formData.append("censor_profanity", censorProfanity.toString());
    formData.append("output_format", outputFormat);

    try {
      console.log("🚀 Starting transcription...");
      const response = await fetch(`${BACKEND_URL}/api/transcribe`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        console.log("✅ Transcription job started:", data);
        setTranscriptionResult(data);
        setProjectId(data.project_id);

        // Connect to real-time updates
        connectToTranscriptionEvents(data.project_id);

        // Add to background monitoring immediately for navigation away scenarios
        if (typeof window !== "undefined" && window.notificationService) {
          const transcriptionData = {
            projectId: data.project_id,
            filename: file.name,
            originalFilename: file.name,
            format: outputFormat,
            locale: selectedLocale,
            isTranscribing: true,
          };

          console.log(
            "📱 Adding to background monitoring on transcription start:",
            transcriptionData,
          );

          window.notificationService.addBackgroundTranscription(
            data.project_id,
            transcriptionData,
            (completionData) => {
              console.log(
                "🎉 Background transcription completed:",
                completionData,
              );
              // Update the stored state when background completes
              const savedState = sessionStorage.getItem("transcriptionState");
              if (savedState) {
                try {
                  const state = JSON.parse(savedState);
                  state.isTranscribing = false;
                  state.transcriptionResult = {
                    ...state.transcriptionResult,
                    status: "Completed",
                    transcribed_filename: completionData.filename,
                  };
                  sessionStorage.setItem(
                    "transcriptionState",
                    JSON.stringify(state),
                  );
                } catch (e) {
                  console.error("Failed to update stored state:", e);
                }
              }
            },
          );
        }

        // Reset preview state when new transcription is done
        setShowPreview(false);
        setPreviewContent("");
      } else {
        setError(data.error || "Transcription failed");
        setIsTranscribing(false);
      }
    } catch (err) {
      console.error("Transcription error:", err);
      setError(`Network error occurred: ${err.message}`);
      setIsTranscribing(false);
    }
  };

  const handleTranslateTranscription = async () => {
    if (!transcriptionResult || !file) {
      console.error("❌ Missing transcription result or file");
      return;
    }

    console.log("🚀 Processing translation with current content...");

    let actualContent = previewContent;

    // If still no content, try one more backend fetch as fallback
    if (!actualContent && projectId) {
      console.log("📥 Last resort: fetching from backend...");

      try {
        const cacheBuster = Date.now();
        const response = await fetch(
          `${BACKEND_URL}/api/download-transcription/${projectId}?cb=${cacheBuster}`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
            },
          },
        );

        if (response.ok) {
          actualContent = await response.text();
          console.log("✅ Backend fetch successful");
        }
      } catch (fetchError) {
        console.error("❌ Backend fetch failed:", fetchError);
      }
    }

    // Final validation
    if (!actualContent || actualContent.trim().length === 0) {
      console.error("❌ No valid content available");
      alert(
        "No transcription content available. Please ensure the transcription is complete and try again.",
      );
      return;
    }

    console.log("✅ Final content validation passed:", {
      length: actualContent.length,
      preview: actualContent.substring(0, 100),
    });

    const transcriptionFileData = {
      content: actualContent,
      filename: transcriptionResult.transcribed_filename,
      originalFilename: file.name,
      format: outputFormat,
      projectId: projectId,
      timestamp: Date.now(),
    };

    console.log("📤 Sending to translation hub");
    onTranslateTranscription?.(transcriptionFileData);
  };

  // In handleDownload function:
  const handleDownload = async () => {
    if (!projectId) {
      setError("No transcription available for download");
      return;
    }

    try {
      console.log("⬇️ Starting download for project:", projectId);

      const response = await fetch(
        `${BACKEND_URL}/api/download-transcription/${projectId}`,
        {
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache",
          },
        },
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;

        // Generate filename in format: filename_transcribed_.en-US.srt
        let filename = "transcription_transcribed_.en-US.srt"; // default fallback

        if (file?.name) {
          // Remove extension from original file
          const originalName = file.name.replace(/\.[^/.]+$/, "");
          const locale = selectedLocale || "en-US";
          const extension = outputFormat || "srt";

          // Create the custom format: filename_transcribed_.locale.extension
          filename = `${originalName}_transcribed_.${locale}.${extension}`;
        } else if (
          transcriptionResult?.filename &&
          !transcriptionResult.filename.includes("http")
        ) {
          filename = transcriptionResult.filename;
        } else {
          // Fallback with locale
          const locale = selectedLocale || "en-US";
          const extension = outputFormat || "srt";
          filename = `transcription_${projectId.slice(0, 8)}_transcribed_.${locale}.${extension}`;
        }

        // Clean filename to remove any invalid characters but keep dots and hyphens
        filename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        console.log("✅ Download completed:", filename);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Download failed:", response.status, errorData);
        setError(errorData.error || `Download failed: ${response.status}`);
      }
    } catch (err) {
      console.error("❌ Download error:", err);
      setError(`Download error occurred: ${err.message}`);
    }
  };

  const resetForm = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }

    // Clear sessionStorage
    sessionStorage.removeItem("transcriptionState");

    // Stop background monitoring if active
    if (projectId && notificationService.isMonitoring(projectId)) {
      notificationService.stopMonitoring(projectId);
    }

    // Reset all state
    setFile(null);
    setTranscriptionResult(null);
    setError("");
    setActiveTab("upload");
    setShowPreview(false);
    setPreviewContent("");
    setConvertedVttContent("");
    setIsPolling(false);
    setProjectId(null);
    setIsTranscribing(false);
    setHasRestoredState(false);

    // Clean up video preview states
    setVideoUrl(null);
    setShowVideoPreview(false);
    setParsedSubtitles([]);
    setCurrentSubtitleIndex(-1);

    // Clean up subtitle URL
    if (window.previousSubtitleUrl) {
      URL.revokeObjectURL(window.previousSubtitleUrl);
      window.previousSubtitleUrl = null;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const verifyContentFreshness = () => {
    console.log("🔍 Content freshness check:");
    console.log("  Preview content length:", previewContent?.length);
    console.log(
      "  Preview content hash:",
      previewContent
        ? btoa(previewContent.substring(0, 100)).substring(0, 8)
        : "none",
    );
    console.log("  Edited content length:", editedContent?.length);
    console.log("  Converted VTT length:", convertedVttContent?.length);
    console.log("  Is editing:", isEditing);
    console.log("  Project ID:", projectId);

    // Check for old content patterns
    const contentToCheck = isEditing ? editedContent : previewContent;
    if (contentToCheck) {
      const hasOldPatterns = [
        "So here like I'v",
        "recordings, yeah, initially",
        "speech recognition partners",
      ].some((pattern) => contentToCheck.includes(pattern));

      console.log("  Contains old patterns:", hasOldPatterns);

      if (hasOldPatterns) {
        console.warn("⚠️ OLD CONTENT DETECTED!");
        return false;
      }
    }

    return true;
  };

  // Preview feature functions
  const handlePreview = async () => {
    if (!transcriptionResult?.transcribed_filename) return;

    if (loadingPreview) {
      console.log("⚠️ Preview already loading, ignoring request");
      return;
    }

    console.log("🎬 Starting preview with media URL fix");
    setLoadingPreview(true);
    setError("");

    try {
      // Clear previous state
      setShowPreview(false);
      setShowVideoPreview(false);
      setPreviewContent("");
      setConvertedVttContent("");
      setParsedSubtitles([]);
      setCurrentSubtitleIndex(-1);

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Step 1: Get FRESH project status that includes media_url
      let freshTranscriptionResult = transcriptionResult;

      if (projectId) {
        try {
          console.log("📊 Fetching fresh project status for media URL");
          const statusResponse = await fetch(
            `${BACKEND_URL}/api/transcription-status-check/${projectId}`,
            { credentials: "include" },
          );

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            console.log("📊 Fresh status data:", statusData);

            // Update our transcription result with fresh data
            freshTranscriptionResult = {
              ...transcriptionResult,
              ...statusData,
            };

            setTranscriptionResult(freshTranscriptionResult);
            console.log("✅ Updated transcription result with fresh data");
          }
        } catch (statusError) {
          console.warn(
            "⚠️ Status fetch failed, continuing with existing data:",
            statusError,
          );
        }
      }

      // Step 2: Fetch transcription content
      console.log("📥 Fetching transcription content");
      const response = await fetch(
        `${BACKEND_URL}/api/download-transcription/${projectId}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.status}`);
      }

      const freshContent = await response.text();
      console.log(`✅ Got fresh content, length: ${freshContent.length}`);
      setPreviewContent(freshContent);

      // Step 3: Convert to VTT if needed
      let vttContent = "";
      if (outputFormat === "srt") {
        console.log("🔄 Converting SRT to VTT");
        vttContent = convertSrtToVttManual(freshContent);
      } else {
        vttContent = freshContent;
      }
      setConvertedVttContent(vttContent);

      // Step 4: Parse subtitles
      const parsedSubs = parseSubtitles(freshContent, outputFormat);
      console.log("✅ Parsed subtitles count:", parsedSubs.length);
      setParsedSubtitles(parsedSubs);

      // Step 5: Setup video preview with fixed media URL
      const mediaUrl = freshTranscriptionResult.media_url;
      const isMediaFile =
        file?.type?.startsWith("video/") || file?.type?.startsWith("audio/");

      console.log("🎬 Video setup check:", {
        hasMediaUrl: !!mediaUrl,
        isMediaFile,
        fileType: file?.type,
      });

      if (mediaUrl && isMediaFile) {
        console.log(
          "🎬 Setting up video preview with URL:",
          mediaUrl.substring(0, 100) + "...",
        );

        try {
          // Test media URL accessibility
          const testResponse = await fetch(mediaUrl, {
            method: "HEAD",
            credentials: "include",
          });

          if (testResponse.ok) {
            setVideoUrl(mediaUrl);
            setShowVideoPreview(true);
            console.log("✅ Video preview setup successful");
          } else {
            console.warn("⚠️ Media URL not accessible:", testResponse.status);
            setError(`Video preview unavailable (${testResponse.status})`);
          }
        } catch (mediaError) {
          console.warn("⚠️ Media URL test failed:", mediaError);
          setError("Video preview unavailable - connection issue");
        }
      } else {
        console.log("ℹ️ Video preview skipped:", {
          reason: !mediaUrl ? "No media URL" : "Unsupported file type",
          mediaUrl: !!mediaUrl,
          fileType: file?.type,
        });
      }

      setShowPreview(true);

      setTimeout(() => {
        previewRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 300);

      console.log("✅ Preview setup completed");
    } catch (err) {
      console.error("❌ Preview error:", err);
      setError(`Preview failed: ${err.message}`);
    } finally {
      setLoadingPreview(false);
    }
  };

  const closePreview = () => {
    console.log("🧹 Closing preview");

    setShowPreview(false);
    setPreviewContent("");
    setConvertedVttContent("");
    setShowVideoPreview(false);
    setParsedSubtitles([]);
    setCurrentSubtitleIndex(-1);

    // ← SIMPLIFIED: Only clean up subtitle URLs, not video URLs (they come from backend)
    if (window.previousSubtitleUrl) {
      URL.revokeObjectURL(window.previousSubtitleUrl);
      window.previousSubtitleUrl = null;
    }

    const video = videoRef.current;
    if (video && video.textTracks) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = "disabled";
      }
    }
  };

  // Parse timestamp to seconds
  const parseTimestamp = (timestamp) => {
    const parts = timestamp.split(":");
    const seconds = parts[2].split(/[,.]/); // Handle both SRT (,) and VTT (.) formats
    return (
      parseInt(parts[0]) * 3600 +
      parseInt(parts[1]) * 60 +
      parseFloat(seconds[0] + "." + (seconds[1] || "0"))
    );
  };

  // Parse SRT format subtitles - FIXED VERSION
  const parseSrtSubtitles = (content) => {
    console.log("🎯 Parsing SRT content, length:", content.length);
    const blocks = content.trim().split(/\n\s*\n/);
    console.log("📊 Found blocks:", blocks.length);
    const subtitles = [];

    blocks.forEach((block, blockIndex) => {
      const lines = block.trim().split("\n");
      console.log(`Block ${blockIndex}:`, lines);

      if (lines.length >= 3) {
        const timeLine = lines[1];
        const timeMatch = timeLine.match(
          /(\d{1,2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{3})/,
        );

        if (timeMatch) {
          try {
            const startTime = parseTimestamp(timeMatch[1]);
            const endTime = parseTimestamp(timeMatch[2]);
            const text = lines.slice(2).join("\n");

            subtitles.push({
              startTime,
              endTime,
              text: text.trim(),
              originalBlock: block,
            });

            console.log(`✅ Parsed subtitle ${blockIndex}:`, {
              startTime,
              endTime,
              text: text.substring(0, 50),
            });
          } catch (parseError) {
            console.error(
              `❌ Failed to parse block ${blockIndex}:`,
              parseError,
            );
          }
        } else {
          console.log(`⚠️ No time match found in line: "${timeLine}"`);
        }
      } else {
        console.log(
          `⚠️ Block ${blockIndex} has insufficient lines:`,
          lines.length,
        );
      }
    });

    console.log("✅ Total parsed subtitles:", subtitles.length);
    return subtitles;
  };

  // Parse VTT format subtitles - FIXED VERSION
  const parseVttSubtitles = (content) => {
    console.log("🎯 Parsing VTT content, length:", content.length);
    const lines = content.split("\n");
    const subtitles = [];
    let currentSubtitle = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip WEBVTT header and empty lines
      if (line === "WEBVTT" || line === "") continue;

      // Check for timestamp line
      const timeMatch = line.match(
        /(\d{1,2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}\.\d{3})/,
      );

      if (timeMatch) {
        // If we have a previous subtitle, save it
        if (currentSubtitle) {
          subtitles.push(currentSubtitle);
        }

        // Start new subtitle
        try {
          currentSubtitle = {
            startTime: parseTimestamp(timeMatch[1]),
            endTime: parseTimestamp(timeMatch[2]),
            text: "",
            originalBlock: line,
          };
        } catch (parseError) {
          console.error("❌ Failed to parse VTT timestamp:", parseError);
          currentSubtitle = null;
        }
      } else if (currentSubtitle && line) {
        // Add text to current subtitle
        currentSubtitle.text += (currentSubtitle.text ? "\n" : "") + line;
        currentSubtitle.originalBlock += "\n" + line;
      }
    }

    // Don't forget the last subtitle
    if (currentSubtitle) {
      subtitles.push(currentSubtitle);
    }

    console.log("✅ Total parsed VTT subtitles:", subtitles.length);
    return subtitles;
  };

  // Main parsing function - ENHANCED VERSION
  const parseSubtitles = (content, format) => {
    console.log(
      "🚀 parseSubtitles called with format:",
      format,
      "content length:",
      content.length,
    );

    if (!content || content.trim().length === 0) {
      console.log("❌ No content to parse");
      return [];
    }

    let result = [];

    if (
      format === "srt" ||
      (!content.startsWith("WEBVTT") && content.match(/^\d+\s*$/m))
    ) {
      console.log("📝 Parsing as SRT format");
      result = parseSrtSubtitles(content);
    } else if (format === "vtt" || content.startsWith("WEBVTT")) {
      console.log("📺 Parsing as VTT format");
      result = parseVttSubtitles(content);
    } else {
      console.log("⚠️ Unknown format, trying SRT first...");
      result = parseSrtSubtitles(content);
      if (result.length === 0) {
        console.log("⚠️ SRT parsing failed, trying VTT...");
        result = parseVttSubtitles(content);
      }
    }

    console.log("🎬 Final parsing result:", result.length, "subtitles");
    return result;
  };

  const showNotification = (message, type = "info", duration = 5000) => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date(),
    };

    setNotifications((prev) => [...prev, notification]);

    // Auto remove after duration
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    }, duration);
  };

  // Add the main SSE connection function
  // Replace your existing connectToTranscriptionEvents function
  const connectToTranscriptionEvents = (projectId) => {
    console.log(`🔄 Starting smart polling for project: ${projectId}`);

    let pollCount = 0;
    const maxPolls = 120; // 10 minutes max

    const smartPoll = async () => {
      try {
        const response = await fetch(
          `${BACKEND_URL}/api/transcription-status-check/${projectId}`,
          { credentials: "include" },
        );

        if (response.ok) {
          const data = await response.json();
          console.log(`📊 Poll ${pollCount + 1}: ${data.status}`);

          if (data.status === "Completed") {
            console.log("✅ Transcription completed via polling!");
            setIsTranscribing(false);

            const updatedResult = {
              ...transcriptionResult,
              status: "Completed",
              transcribed_filename: data.filename,
            };

            setTranscriptionResult(updatedResult);
            setActiveTab("result");

            // Show success notification
            showNotification(
              "Transcription completed successfully!",
              "success",
            );

            // IMPORTANT: Also emit via notification service for consistency
            notificationService.emit({
              id: `poll-complete-${projectId}`,
              type: "success",
              title: "Transcription Complete!",
              message: `Your transcription has been completed successfully`,
              duration: 8000,
              projectId,
              clickable: false,
            });

            return; // Stop polling
          } else if (data.status === "Failed") {
            console.log("❌ Transcription failed via polling!");
            setIsTranscribing(false);
            setError(data.message || "Transcription failed");
            showNotification(data.message || "Transcription failed", "error");
            return; // Stop polling
          }

          // Continue polling if still in progress
          pollCount++;
          if (pollCount < maxPolls) {
            const delay = Math.min(3000 + pollCount * 200, 10000);
            setTimeout(smartPoll, delay);
          } else {
            setIsTranscribing(false);
            setError("Transcription timed out");
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
        pollCount++;
        if (pollCount < maxPolls && isTranscribing) {
          setTimeout(smartPoll, 5000); // Retry after 5 seconds
        }
      }
    };

    // Start polling immediately
    smartPoll();
  };

  // Add this useEffect to handle navigation from notifications
  useEffect(() => {
    // Check if we should open a specific project from notification click
    const openProjectId = sessionStorage.getItem("openTranscriptionProject");
    if (openProjectId && openProjectId !== projectId) {
      console.log("📱 Opening project from notification:", openProjectId);

      // Clear the flag
      sessionStorage.removeItem("openTranscriptionProject");

      // Check the status of this specific project
      checkTranscriptionStatus(openProjectId);

      // Set this as the current project
      setProjectId(openProjectId);
    }
  }, [projectId]);

  useEffect(() => {
    // Cleanup function for component unmount
    return () => {
      console.log("🧹 Component unmounting, cleaning up resources");

      // Clean up video URL
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }

      // Clean up subtitle URL
      if (window.previousSubtitleUrl) {
        URL.revokeObjectURL(window.previousSubtitleUrl);
        window.previousSubtitleUrl = null;
        window.currentSubtitleHash = null;
      }
    };
  }, []);

  // Add this useEffect before the return statement
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isTranscribing && !showNavigationWarning) {
        e.preventDefault();
        e.returnValue =
          "Your transcription is still in progress. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    const handleNavigationAttempt = (destination) => {
      if (isTranscribing) {
        setShowNavigationWarning(true);
        setPendingNavigation(destination);
        return false; // Prevent navigation
      }
      return true; // Allow navigation
    };

    // Expose navigation handler to parent
    if (onNavigateAway) {
      window.transcriptionNavigationHandler = handleNavigationAttempt;
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (window.transcriptionNavigationHandler) {
        delete window.transcriptionNavigationHandler;
      }
    };
  }, [isTranscribing, showNavigationWarning, onNavigateAway]);

  // Add these functions before the return statement
  const handleNavigationWarningClose = () => {
    setShowNavigationWarning(false);
    setPendingNavigation(null);
  };

  const handleNavigationConfirm = () => {
    console.log("🚀 Confirming navigation - adding to background monitoring");
    console.log("Project ID:", projectId);
    console.log("Transcription Result:", transcriptionResult);
    console.log("File:", file);

    if (projectId && (isTranscribing || transcriptionResult)) {
      // Add to background monitoring
      const transcriptionData = {
        projectId: projectId,
        filename:
          transcriptionResult?.transcribed_filename ||
          file?.name ||
          "Unknown file",
        originalFilename: file?.name || "Unknown file",
        format: outputFormat,
        locale: selectedLocale,
        isTranscribing: isTranscribing,
      };

      console.log("📱 Adding to background monitoring:", transcriptionData);

      notificationService.addBackgroundTranscription(
        projectId,
        transcriptionData,
        (completionData) => {
          console.log("🎉 Background transcription completed:", completionData);
          // Update the stored state when background completes
          const savedState = sessionStorage.getItem("transcriptionState");
          if (savedState) {
            try {
              const state = JSON.parse(savedState);
              state.isTranscribing = false;
              state.transcriptionResult = {
                ...state.transcriptionResult,
                status: "Completed",
                transcribed_filename: completionData.filename,
              };
              sessionStorage.setItem(
                "transcriptionState",
                JSON.stringify(state),
              );
            } catch (e) {
              console.error("Failed to update stored state:", e);
            }
          }
        },
      );

      // Stop the current polling to avoid conflicts
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
    }

    setShowNavigationWarning(false);
    setIsTranscribing(false); // Stop local processing

    // Execute the pending navigation
    if (pendingNavigation && onNavigateAway) {
      onNavigateAway(pendingNavigation);
    }

    setPendingNavigation(null);
  };

  // Add this useEffect after your existing ones
  useEffect(() => {
    // Restore state on component mount
    if (!hasRestoredState) {
      restoreTranscriptionState();
    }
  }, [restoreTranscriptionState, hasRestoredState]);

  useEffect(() => {
    // Save state whenever it changes
    saveTranscriptionState();
  }, [saveTranscriptionState]);

  return (
    <div
      className={`max-w-4xl mx-auto p-6 min-h-screen transition-colors duration-300 ${
        isDarkMode ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <div
        className={`rounded-xl shadow-lg overflow-hidden transition-colors duration-300 ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        }`}
      >
        {/* Header */}
        <div
          className={`p-6 border-b transition-colors duration-300 ${
            isDarkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          }`}
        >
          <h1
            className={`text-2xl font-bold mb-4 sm:mb-0 transition-colors duration-300 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            <span className="flex items-center">
              <div
                className={`w-1 h-8 rounded-full mr-3 bg-gradient-to-b ${
                  isDarkMode
                    ? accentColors?.dark ||
                      "from-yellow-600 via-orange-600 to-red-700"
                    : accentColors?.light ||
                      "from-yellow-500 via-orange-500 to-red-500"
                }`}
              ></div>
              AI Transcription
            </span>
          </h1>
        </div>

        {/* Navigation Tabs */}
        <div
          className={`flex border-b transition-colors duration-300 ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-6 py-3 font-medium transition-colors duration-300 ${
              activeTab === "upload"
                ? `border-b-2 border-orange-500 text-orange-600`
                : isDarkMode
                  ? `text-gray-300 hover:text-orange-400`
                  : `text-gray-600 hover:text-orange-600`
            }`}
          >
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full mr-1 ${
                  activeTab === "upload"
                    ? `bg-gradient-to-r ${
                        isDarkMode
                          ? accentColors?.dark ||
                            "from-yellow-600 via-orange-600 to-red-700"
                          : accentColors?.light ||
                            "from-yellow-500 via-orange-500 to-red-500"
                      }`
                    : "bg-transparent"
                }`}
              ></div>
              <Upload className="w-4 h-4" />
              <span>Upload & Configure</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("result")}
            className={`px-6 py-3 font-medium transition-colors duration-300 ${
              activeTab === "result"
                ? `border-b-2 border-orange-500 text-orange-600`
                : isDarkMode
                  ? `text-gray-300 hover:text-orange-400`
                  : `text-gray-600 hover:text-orange-600`
            } ${!transcriptionResult ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full mr-1 ${
                  activeTab === "result"
                    ? `bg-gradient-to-r ${
                        isDarkMode
                          ? accentColors?.dark ||
                            "from-yellow-600 via-orange-600 to-red-700"
                          : accentColors?.light ||
                            "from-yellow-500 via-orange-500 to-red-500"
                      }`
                    : "bg-transparent"
                }`}
              ></div>
              <FileText className="w-4 h-4" />
              <span>Results</span>
            </div>
          </button>
        </div>

        {/* Notification Display */}
        {notifications.length > 0 && (
          <div className="fixed top-4 right-4 z-50 space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg shadow-lg max-w-sm animate-slide-in ${
                  notification.type === "success"
                    ? "bg-green-500 text-white"
                    : notification.type === "error"
                      ? "bg-red-500 text-white"
                      : notification.type === "warning"
                        ? "bg-yellow-500 text-black"
                        : "bg-blue-500 text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">{notification.message}</span>
                  <button
                    onClick={() =>
                      setNotifications((prev) =>
                        prev.filter((n) => n.id !== notification.id),
                      )
                    }
                    className="ml-2 text-sm opacity-70 hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Progress Indicator for Processing */}
        {isTranscribing && (
          <div
            className={`border-l-4 border-blue-400 p-4 m-6 transition-colors duration-300 ${
              isDarkMode ? "bg-blue-900/20" : "bg-blue-50"
            }`}
          >
            <div className="flex items-center">
              <Loader2 className="h-5 w-5 text-blue-400 animate-spin mr-3" />
              <div>
                <p
                  className={`font-medium transition-colors duration-300 ${
                    isDarkMode ? "text-blue-300" : "text-blue-700"
                  }`}
                >
                  Processing transcription...
                </p>
                <p
                  className={`text-sm mt-1 transition-colors duration-300 ${
                    isDarkMode ? "text-blue-400" : "text-blue-600"
                  }`}
                >
                  {transcriptionStage || "Initializing transcription job..."}
                </p>
                <div className="mt-2 flex items-center text-xs text-blue-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Real-time updates active
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div
            className={`border-l-4 border-red-400 p-4 m-6 transition-colors duration-300 ${
              isDarkMode ? "bg-red-900/20" : "bg-red-50"
            }`}
          >
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p
                  className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? "text-red-300" : "text-red-700"
                  }`}
                >
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upload & Configure Tab */}
        {activeTab === "upload" && (
          <div className="p-6">
            <div className="space-y-6">
              {/* File Upload */}
              <div>
                <label
                  className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                    isDarkMode ? "text-gray-200" : "text-gray-700"
                  }`}
                >
                  Select Audio/Video File
                </label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-300 ${
                    isDarkMode
                      ? `border-gray-600 hover:border-orange-500 bg-gray-800`
                      : `border-gray-300 hover:border-orange-400 bg-white`
                  }`}
                >
                  <input
                    type="file"
                    accept="audio/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload
                      className={`mx-auto h-12 w-12 mb-4 transition-colors duration-300 ${
                        isDarkMode ? "text-gray-500" : "text-gray-400"
                      }`}
                    />
                    <p
                      className={`transition-colors duration-300 ${
                        isDarkMode ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Click to upload or drag and drop
                    </p>
                    <p
                      className={`text-sm mt-1 transition-colors duration-300 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      Supports audio and video files
                    </p>
                  </label>
                </div>
                {file && (
                  <div
                    className={`mt-4 p-4 rounded-lg border transition-colors duration-300 ${
                      isDarkMode
                        ? "bg-green-900/20 border-green-800"
                        : "bg-green-50 border-green-200"
                    }`}
                  >
                    <div className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-2" />
                      <div>
                        <p
                          className={`font-medium transition-colors duration-300 ${
                            isDarkMode ? "text-green-300" : "text-green-800"
                          }`}
                        >
                          {file.name}
                        </p>
                        <p
                          className={`text-sm transition-colors duration-300 ${
                            isDarkMode ? "text-green-400" : "text-green-600"
                          }`}
                        >
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Configuration Options */}
              <div className="space-y-6">
                {/* Basic Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Output Format */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                        isDarkMode ? "text-gray-200" : "text-gray-700"
                      }`}
                    >
                      Output Format
                    </label>
                    <select
                      value={outputFormat}
                      onChange={(e) => setOutputFormat(e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-300 ${
                        isDarkMode
                          ? "border-gray-600 bg-gray-700 text-gray-200"
                          : "border-gray-300 bg-white text-gray-900"
                      }`}
                    >
                      <option value="vtt">VTT</option>
                      <option value="srt">SRT</option>
                    </select>
                  </div>

                  {/* Profanity Filter */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                        isDarkMode ? "text-gray-200" : "text-gray-700"
                      }`}
                    >
                      Content Filtering
                    </label>
                    <div className="flex items-center pt-2">
                      <input
                        type="checkbox"
                        id="censor-profanity"
                        checked={censorProfanity}
                        onChange={(e) => setCensorProfanity(e.target.checked)}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="censor-profanity"
                        className={`ml-2 transition-colors duration-300 ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Censor profanity
                      </label>
                    </div>
                  </div>
                </div>

                {/* Advanced Settings Toggle */}
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setShowAdvancedSettings(!showAdvancedSettings)
                    }
                    className="flex items-center space-x-2 font-medium transition-colors duration-300 text-orange-600 hover:text-orange-800"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Advanced</span>
                    {showAdvancedSettings ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {/* Advanced Settings Panel */}
                  {showAdvancedSettings && (
                    <div
                      className={`mt-4 p-4 rounded-lg border transition-colors duration-300 ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Language Selection */}
                        <div>
                          <label
                            className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                              isDarkMode ? "text-gray-200" : "text-gray-700"
                            }`}
                          >
                            Language
                          </label>
                          <select
                            value={selectedLocale}
                            onChange={(e) => setSelectedLocale(e.target.value)}
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-300 ${
                              isDarkMode
                                ? "border-gray-600 bg-gray-700 text-gray-200"
                                : "border-gray-300 bg-white text-gray-900"
                            }`}
                          >
                            {Object.entries(locales).map(
                              ([locale, language]) => (
                                <option key={locale} value={locale}>
                                  {language}
                                </option>
                              ),
                            )}
                          </select>
                          <p
                            className={`text-xs mt-1 transition-colors duration-300 ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            Auto-detection is used if not specified
                          </p>
                        </div>

                        {/* Max Speakers */}
                        <div>
                          <label
                            className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                              isDarkMode ? "text-gray-200" : "text-gray-700"
                            }`}
                          >
                            Maximum Speakers
                          </label>
                          <select
                            value={maxSpeakers}
                            onChange={(e) =>
                              setMaxSpeakers(parseInt(e.target.value))
                            }
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-300 ${
                              isDarkMode
                                ? "border-gray-600 bg-gray-700 text-gray-200"
                                : "border-gray-300 bg-white text-gray-900"
                            }`}
                          >
                            {[
                              2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
                              16,
                            ].map((num) => (
                              <option key={num} value={num}>
                                {num} {num === 1 ? "Speaker" : "Speakers"}
                              </option>
                            ))}
                          </select>
                          <p
                            className={`text-xs mt-1 transition-colors duration-300 ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            For speaker identification and diarization
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Transcribe Button */}
              <div className="pt-4">
                <button
                  onClick={handleTranscribe}
                  disabled={!file || isTranscribing}
                  className={`w-full py-3 px-6 rounded-lg font-medium transition-colors duration-300 flex items-center justify-center space-x-2 ${
                    !file || isTranscribing
                      ? isDarkMode
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : `bg-gradient-to-r ${
                          isDarkMode
                            ? accentColors?.dark ||
                              "from-yellow-600 via-orange-600 to-red-700"
                            : accentColors?.light ||
                              "from-yellow-500 via-orange-500 to-red-500"
                        } text-white hover:opacity-90`
                  }`}
                >
                  {isTranscribing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{isPolling ? "Processing..." : "Starting..."}</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      <span>Start Transcription</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === "result" && (
          <div className="p-6">
            {transcriptionResult ? (
              <div className="space-y-6">
                {/* Status Message */}
                <div
                  className={`border-l-4 ${
                    transcriptionResult.status === "Completed"
                      ? "border-green-400"
                      : transcriptionResult.status === "Failed"
                        ? "border-red-400"
                        : "border-blue-400"
                  } p-4 transition-colors duration-300 ${
                    isDarkMode
                      ? transcriptionResult.status === "Completed"
                        ? "bg-green-900/20"
                        : transcriptionResult.status === "Failed"
                          ? "bg-red-900/20"
                          : "bg-blue-900/20"
                      : transcriptionResult.status === "Completed"
                        ? "bg-green-50"
                        : transcriptionResult.status === "Failed"
                          ? "bg-red-50"
                          : "bg-blue-50"
                  }`}
                >
                  <div className="flex">
                    {transcriptionResult.status === "Completed" ? (
                      <Check className="h-5 w-5 text-green-400" />
                    ) : transcriptionResult.status === "Failed" ? (
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    ) : (
                      <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                    )}
                    <div className="ml-3">
                      <p
                        className={`text-sm mt-1 transition-colors duration-300 ${
                          isDarkMode
                            ? transcriptionResult.status === "Completed"
                              ? "text-green-300"
                              : transcriptionResult.status === "Failed"
                                ? "text-red-300"
                                : "text-blue-300"
                            : transcriptionResult.status === "Completed"
                              ? "text-green-700"
                              : transcriptionResult.status === "Failed"
                                ? "text-red-700"
                                : "text-blue-700"
                        }`}
                      >
                        {transcriptionResult.status === "Completed"
                          ? "Transcription completed successfully!"
                          : transcriptionResult.status === "Failed"
                            ? "Transcription failed"
                            : "Transcription is being processed..."}
                      </p>
                    </div>
                  </div>
                </div>
                {transcriptionResult && (
                  <button
                    onClick={() => {
                      console.log("🔄 Force refreshing status...");
                      if (projectId) {
                        checkTranscriptionStatus(projectId);
                      }
                    }}
                    className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Refresh
                  </button>
                )}

                {/* File Information */}
                <div
                  className={`rounded-lg p-6 transition-colors duration-300 ${
                    isDarkMode ? "bg-gray-700" : "bg-gray-50"
                  }`}
                >
                  <h3
                    className={`text-lg font-semibold mb-4 transition-colors duration-300 ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Transcription Details
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <span
                        className={`text-sm font-medium transition-colors duration-300 ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        Original File:
                      </span>
                      <p
                        className={`transition-colors duration-300 ${
                          isDarkMode ? "text-gray-200" : "text-gray-900"
                        }`}
                      >
                        {file?.name}
                      </p>
                    </div>
                    <div></div>
                    <div>
                      <span
                        className={`text-sm font-medium transition-colors duration-300 ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        Language:
                      </span>
                      <p
                        className={`transition-colors duration-300 ${
                          isDarkMode ? "text-gray-200" : "text-gray-900"
                        }`}
                      >
                        {locales[selectedLocale]} ({selectedLocale})
                      </p>
                    </div>
                    <div>
                      <span
                        className={`text-sm font-medium transition-colors duration-300 ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        Format:
                      </span>
                      <p
                        className={`transition-colors duration-300 ${
                          isDarkMode ? "text-gray-200" : "text-gray-900"
                        }`}
                      >
                        {outputFormat.toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>
                {/* Action Buttons - Only show when completed */}
                {transcriptionResult.status === "Completed" && (
                  <>
                    {/* Primary Action Row */}
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                      <button
                        onClick={handleDownload}
                        className="flex-1 bg-green-500 text-white py-3 px-6 rounded-lg hover:bg-green-600 font-medium transition-colors duration-300 flex items-center justify-center space-x-2"
                      >
                        <Download className="w-5 h-5" />
                        <span>Download Transcription</span>
                      </button>

                      <div className="flex-1 flex space-x-2">
                        <button
                          onClick={handlePreview}
                          disabled={loadingPreview}
                          className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors duration-300 flex items-center justify-center space-x-2 ${
                            loadingPreview
                              ? isDarkMode
                                ? "bg-gray-600 text-gray-400"
                                : "bg-gray-400 text-gray-600"
                              : `bg-gradient-to-r ${
                                  isDarkMode
                                    ? accentColors?.dark ||
                                      "from-yellow-600 via-orange-600 to-red-700"
                                    : accentColors?.light ||
                                      "from-yellow-500 via-orange-500 to-red-500"
                                } text-white hover:opacity-90`
                          }`}
                        >
                          {loadingPreview ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Loading...</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4" />
                              <span>Load Preview</span>
                            </>
                          )}
                        </button>
                      </div>

                      <button
                        onClick={async () => {
                          console.log(
                            "🚀 Starting intelligent translation process...",
                          );

                          // Step 1: Check if we have fresh content
                          const hasFreshContent =
                            previewContent && previewContent.trim().length > 0;
                          const hasOldPatterns =
                            previewContent &&
                            [
                              "So here like I'v",
                              "recordings, yeah, initially",
                              "speech recognition partners",
                            ].some((pattern) =>
                              previewContent.includes(pattern),
                            );

                          console.log("🔍 Content analysis:", {
                            hasFreshContent,
                            hasOldPatterns,
                            previewLength: previewContent?.length,
                          });

                          // Step 2: Refresh content if needed
                          if (!hasFreshContent || hasOldPatterns) {
                            console.log(
                              "🔄 Content needs refresh, loading fresh content...",
                            );

                            try {
                              // Show loading state (optional - you can add a loading state here)
                              await handlePreview();

                              // Wait for content to be processed
                              await new Promise((resolve) =>
                                setTimeout(resolve, 1500),
                              );

                              console.log(
                                "✅ Content refreshed, proceeding with translation",
                              );
                            } catch (error) {
                              console.error(
                                "❌ Failed to refresh content:",
                                error,
                              );
                              alert(
                                "Failed to refresh transcription content. Please try again.",
                              );
                              return;
                            }
                          } else {
                            console.log(
                              "✅ Content is fresh, proceeding directly to translation",
                            );
                          }

                          // Step 3: Proceed with translation using the enhanced function
                          await handleTranslateTranscription();
                        }}
                        disabled={!transcriptionResult?.transcribed_filename}
                        className="flex-1 bg-purple-500 text-white py-3 px-6 rounded-lg hover:bg-purple-600 font-medium transition-colors duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                        <span>Translate Transcription</span>
                      </button>
                    </div>

                    {/* Preview Section */}
                    {showPreview && (
                      <div
                        ref={previewRef}
                        className={`rounded-lg border shadow-sm transition-colors duration-300 ${
                          isDarkMode
                            ? "bg-gray-800 border-gray-600"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div
                          className={`px-4 py-3 border-b rounded-t-lg transition-colors duration-300 ${
                            isDarkMode
                              ? "bg-gray-700 border-gray-600"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <h4
                              className={`font-medium flex items-center transition-colors duration-300 ${
                                isDarkMode ? "text-gray-200" : "text-gray-700"
                              }`}
                            >
                              <span
                                className={`w-3 h-3 rounded-full mr-2 bg-gradient-to-r ${
                                  isDarkMode
                                    ? accentColors?.dark ||
                                      "from-yellow-600 via-orange-600 to-red-700"
                                    : accentColors?.light ||
                                      "from-yellow-500 via-orange-500 to-red-500"
                                }`}
                              ></span>
                              Transcribed Content ({selectedLocale}) -{" "}
                              {outputFormat.toUpperCase()}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={closePreview}
                                className={`p-1 rounded transition-colors duration-300 ${
                                  isDarkMode
                                    ? "text-gray-500 hover:text-gray-300 hover:bg-gray-700"
                                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                                }`}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="p-4">
                          {/* Video Preview Player */}
                          {showVideoPreview && videoUrl && (
                            <VideoPreviewPlayer
                              videoUrl={videoUrl}
                              videoRef={videoRef}
                              parsedSubtitles={parsedSubtitles}
                              convertedVttContent={convertedVttContent}
                              previewContent={previewContent}
                              selectedLocale={selectedLocale}
                              isDarkMode={isDarkMode}
                              currentSubtitleIndex={currentSubtitleIndex}
                              setCurrentSubtitleIndex={setCurrentSubtitleIndex}
                              accentColors={accentColors}
                              file={file}
                              showVideoPreview={showVideoPreview}
                              setVideoUrl={setVideoUrl}
                              setShowVideoPreview={setShowVideoPreview}
                              setError={setError}
                            />
                          )}

                          {/* Content Display */}
                          <div className="max-h-96 overflow-auto">
                            <pre
                              className={`text-sm whitespace-pre-wrap font-mono leading-relaxed transition-colors duration-300 ${
                                isDarkMode ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              {previewContent}
                            </pre>
                          </div>
                        </div>

                        {/* Preview Action Buttons */}
                        <div
                          className={`px-4 py-3 border-t rounded-b-lg transition-colors duration-300 ${
                            isDarkMode
                              ? "bg-gray-700 border-gray-600"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="flex justify-end">
                            <button
                              onClick={handleDownload}
                              className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-300 bg-green-500 text-white hover:bg-green-600"
                            >
                              <Download className="w-4 h-4" />
                              <span>Download Original</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* New Transcription Button */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                      <button
                        onClick={resetForm}
                        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors duration-300 ${
                          isDarkMode
                            ? "bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                        }`}
                      >
                        <div className="flex items-center justify-center space-x-2">
                          <Upload className="w-4 h-4" />
                          <span>New Transcription</span>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              // No transcription result state
              <div
                className={`text-center py-12 transition-colors duration-300 ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">
                  No transcription results
                </h3>
                <p className="text-sm">
                  Upload a video file to get started with transcription
                </p>
                <button
                  onClick={() => setActiveTab("upload")}
                  className={`mt-4 px-6 py-2 rounded-lg font-medium transition-colors duration-300 ${
                    isDarkMode
                      ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Go to Upload
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer with Reset Option */}
      {transcriptionResult && (
        <div className="mt-6 text-center">
          <button
            onClick={resetForm}
            className={`px-4 py-2 text-sm rounded-lg transition-colors duration-300 ${
              isDarkMode
                ? "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            }`}
          >
            Start New Transcription
          </button>
          {/* Navigation Warning Modal */}
          {showNavigationWarning && (
            <NavigationWarningModal
              isOpen={showNavigationWarning}
              onClose={handleNavigationWarningClose}
              onConfirm={handleNavigationConfirm}
              isDarkMode={isDarkMode}
              transcriptionProgress={
                transcriptionStage || "Processing your transcription..."
              }
            />
          )}
        </div>
      )}
    </div>
  );
};

export default TranscriptionApp;
