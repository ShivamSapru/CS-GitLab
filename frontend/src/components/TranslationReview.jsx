import React, { useState, useEffect, useRef } from "react";
import srtWebVTT from "srt-webvtt";
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

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const convertSrtToVttManual = (srtContent) => {
  console.log("Starting manual SRT to VTT conversion...");

  let vttContent = "WEBVTT\n\n";

  // Split SRT into blocks
  const blocks = srtContent.trim().split(/\n\s*\n/);

  blocks.forEach((block) => {
    const lines = block.trim().split("\n");
    if (lines.length >= 3) {
      // Skip the subtitle number (first line)
      const timeLine = lines[1];
      const textLines = lines.slice(2);

      // Convert SRT timestamp format to VTT format
      // SRT: 00:00:01,000 --> 00:00:04,000
      // VTT: 00:00:01.000 --> 00:00:04.000
      if (timeLine && timeLine.includes("-->")) {
        const vttTimeLine = timeLine.replace(/,/g, ".");
        vttContent += vttTimeLine + "\n";
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
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [maxPlayTime, setMaxPlayTime] = useState(10);
  const [isInitialized, setIsInitialized] = useState(false);

  // Reset initialization when new subtitles are loaded
  useEffect(() => {
    setIsInitialized(false);
  }, [parsedSubtitles]);

  // Auto-initialize video to first subtitle when subtitles are loaded
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !parsedSubtitles.length) return;

    const initializeVideoToFirstSubtitle = () => {
      const firstSubtitle = parsedSubtitles[0];
      if (firstSubtitle && firstSubtitle.startTime >= 0) {
        const startTime = Math.max(0, firstSubtitle.startTime - 1);
        console.log(
          `Initializing video to first subtitle at: ${startTime}s (subtitle starts at ${firstSubtitle.startTime}s)`,
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

    const handleCanPlayThrough = () => {
      if (!isInitialized) {
        setTimeout(initializeVideoToFirstSubtitle, 50);
      }
    };

    const handleLoadedData = () => {
      if (!isInitialized) {
        setTimeout(initializeVideoToFirstSubtitle, 50);
      }
    };

    if (video.readyState >= 2) {
      initializeVideoToFirstSubtitle();
    } else {
      video.addEventListener("canplaythrough", handleCanPlayThrough);
      video.addEventListener("loadeddata", handleLoadedData);
    }

    return () => {
      video.removeEventListener("canplaythrough", handleCanPlayThrough);
      video.removeEventListener("loadeddata", handleLoadedData);
    };
  }, [parsedSubtitles, isInitialized, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);

      const currentIndex = parsedSubtitles.findIndex(
        (sub) => time >= sub.startTime && time <= sub.endTime,
      );
      setCurrentSubtitleIndex(currentIndex);

      if (time >= maxPlayTime) {
        video.pause();
        setIsPlaying(false);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleLoadedMetadata = () => {
      if (!isInitialized && parsedSubtitles.length > 0) {
        const firstSubtitle = parsedSubtitles[0];
        if (firstSubtitle && firstSubtitle.startTime >= 0) {
          const startTime = Math.max(0, firstSubtitle.startTime - 1);
          video.currentTime = startTime;
          setCurrentTime(startTime);
          setMaxPlayTime(Math.min(firstSubtitle.endTime + 3, startTime + 15));
          setIsInitialized(true);
        }
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [
    videoUrl,
    parsedSubtitles,
    maxPlayTime,
    isInitialized,
    videoRef,
    setCurrentSubtitleIndex,
  ]);

  // Handle subtitle track loading
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !convertedVttContent) return;

    const enableSubtitles = () => {
      setTimeout(() => {
        if (video.textTracks && video.textTracks.length > 0) {
          video.textTracks[0].mode = "showing";
          console.log("Subtitles enabled");
        }
      }, 100);
    };

    if (video.readyState >= 1) {
      enableSubtitles();
    } else {
      video.addEventListener("loadedmetadata", enableSubtitles);
      return () => video.removeEventListener("loadedmetadata", enableSubtitles);
    }
  }, [convertedVttContent, videoUrl, videoRef]);

  const createSubtitleTrack = () => {
    try {
      const subtitleContent = convertedVttContent || previewContent;
      if (!subtitleContent) {
        console.log("No subtitle content available for track");
        return null;
      }

      console.log(
        "Raw subtitle content (first 300 chars):",
        subtitleContent.substring(0, 300),
      );
      console.log("Subtitle content length:", subtitleContent.length);

      let vttContent = subtitleContent.trim();

      // Check if content is SRT format and convert it manually
      if (!vttContent.startsWith("WEBVTT") && vttContent.match(/^\d+\s*$/m)) {
        console.log("Converting SRT to VTT manually in createSubtitleTrack");
        vttContent = convertSrtToVttManual(vttContent);
      }

      // Ensure proper VTT format
      if (!vttContent.startsWith("WEBVTT")) {
        console.log("Adding WEBVTT header");
        vttContent = `WEBVTT\n\n${vttContent}`;
      }

      // Ensure proper spacing after WEBVTT
      if (
        vttContent.startsWith("WEBVTT\n") &&
        !vttContent.startsWith("WEBVTT\n\n")
      ) {
        vttContent = vttContent.replace("WEBVTT\n", "WEBVTT\n\n");
      }

      console.log(
        "Final VTT content for track (first 500 chars):",
        vttContent.substring(0, 500),
      );

      const blob = new Blob([vttContent], { type: "text/vtt; charset=utf-8" });
      const url = URL.createObjectURL(blob);

      // Clean up previous URL
      if (window.previousSubtitleUrl) {
        URL.revokeObjectURL(window.previousSubtitleUrl);
      }
      window.previousSubtitleUrl = url;

      console.log("Subtitle track URL created:", url);
      return url;
    } catch (error) {
      console.error("Error creating subtitle track:", error);
      return null;
    }
  };

  // Debug effect to check subtitle content
  useEffect(() => {
    console.log("=== SUBTITLE DEBUG ===");
    console.log("convertedVttContent exists:", !!convertedVttContent);
    console.log("previewContent exists:", !!previewContent);
    console.log(
      "convertedVttContent sample:",
      convertedVttContent?.substring(0, 200),
    );
    console.log("previewContent sample:", previewContent?.substring(0, 200));

    if (convertedVttContent) {
      console.log("Using convertedVttContent for subtitles");
    } else if (previewContent) {
      console.log("Using previewContent for subtitles");
    } else {
      console.log("No subtitle content available");
    }
  }, [convertedVttContent, previewContent]);

  // Add this effect to monitor video track loading
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const checkTracks = () => {
      console.log("Video text tracks:", video.textTracks.length);
      if (video.textTracks.length > 0) {
        const track = video.textTracks[0];
        console.log("Track mode:", track.mode);
        console.log("Track readyState:", track.readyState);
        console.log("Track cues:", track.cues?.length || "not loaded");

        // Force enable the track
        track.mode = "showing";

        // Listen for track load events
        track.addEventListener("load", () => {
          console.log("Track loaded successfully, cues:", track.cues?.length);
        });

        track.addEventListener("error", (e) => {
          console.error("Track loading error:", e);
        });
      }
    };

    // Check immediately and after a delay
    checkTracks();
    setTimeout(checkTracks, 500);
    setTimeout(checkTracks, 1000);
  }, [videoUrl, convertedVttContent, previewContent]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
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
      video.play();
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
        font-size: 18px !important;
        font-family: Arial, sans-serif !important;
        line-height: 1.4 !important;
        padding: 4px 8px !important;
        border-radius: 4px !important;
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
              src={videoUrl}
              className="w-full h-full object-contain"
              controls={false}
              preload="metadata"
              crossOrigin="anonymous"
              onLoadedMetadata={() => {
                console.log("Video metadata loaded");
                const video = videoRef.current;
                if (video && video.textTracks.length > 0) {
                  video.textTracks[0].mode = "showing";
                  console.log("Forced subtitle track to showing mode");

                  setTimeout(() => {
                    if (video.textTracks[0].cues) {
                      console.log(
                        "Subtitle cues loaded:",
                        video.textTracks[0].cues.length,
                      );
                      for (
                        let i = 0;
                        i < Math.min(3, video.textTracks[0].cues.length);
                        i++
                      ) {
                        const cue = video.textTracks[0].cues[i];
                        console.log(
                          `Cue ${i}:`,
                          cue.startTime,
                          "->",
                          cue.endTime,
                          ":",
                          cue.text,
                        );
                      }
                    }
                  }, 500);
                }
              }}
            >
              {(convertedVttContent || previewContent) && (
                <track
                  kind="subtitles"
                  src={createSubtitleTrack()}
                  srcLang={selectedLocale.split("-")[0]}
                  label="Subtitles"
                  default
                  onLoad={() => {
                    console.log("Track element loaded successfully");
                  }}
                  onError={(e) => {
                    console.error("Track element error:", e);
                  }}
                />
              )}
            </video>

            {/* Overlay backup */}
            {currentSubtitleIndex >= 0 &&
              parsedSubtitles[currentSubtitleIndex] && (
                <div className="absolute bottom-20 left-4 right-4 text-center pointer-events-none z-30">
                  <div className="inline-block bg-blue-600/80 text-white px-4 py-2 rounded text-sm font-medium shadow-lg max-w-4xl">
                    <div className="text-xs text-blue-200 mb-1">
                      OVERLAY BACKUP:
                    </div>
                    {parsedSubtitles[currentSubtitleIndex].text}
                  </div>
                </div>
              )}

            {/* Your existing controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
              <div className="flex items-center space-x-3">
                <button
                  onClick={togglePlay}
                  className="text-white hover:text-blue-300 transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                </button>
                <button
                  onClick={resetPlayer}
                  className="text-white hover:text-blue-300 transition-colors"
                  title="Reset to first subtitle"
                >
                  <Undo className="w-5 h-5" />
                </button>
                <div className="flex-1">
                  <div className="bg-white/30 rounded-full h-1">
                    <div
                      className="bg-blue-500 h-1 rounded-full transition-all duration-100"
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
                    isDarkMode ? "text-blue-300" : "text-blue-200"
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

        {/* Current subtitle display */}
        {currentSubtitleIndex >= 0 && parsedSubtitles[currentSubtitleIndex] && (
          <div
            className={`w-full p-3 border rounded-lg transition-colors duration-300 ${
              isDarkMode
                ? "bg-blue-900/30 border-blue-700"
                : "bg-blue-50 border-blue-200"
            }`}
          >
            <div
              className={`text-xs font-medium mb-1 transition-colors duration-300 ${
                isDarkMode ? "text-blue-300" : "text-blue-600"
              }`}
            >
              Currently Playing:
            </div>
            <div
              className={`text-sm transition-colors duration-300 ${
                isDarkMode ? "text-gray-200" : "text-gray-800"
              }`}
            >
              {parsedSubtitles[currentSubtitleIndex].text}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TranscriptionApp = ({ onTranslateTranscription, isDarkMode }) => {
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
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editHistory, setEditHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const previewRef = useRef(null);
  const editTextareaRef = useRef(null);

  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const [videoUrl, setVideoUrl] = useState(null);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const videoRef = useRef(null);

  const [parsedSubtitles, setParsedSubtitles] = useState([]);
  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState(-1);
  const [convertedVttContent, setConvertedVttContent] = useState("");

  // Get API URL - simple approach
  const getApiUrl = () => {
    return BACKEND_URL;
  };

  // Fetch available locales on component mount
  useEffect(() => {
    fetchLocales();
  }, []);

  const fetchLocales = async () => {
    try {
      const baseUrl = getApiUrl();
      console.log("Fetching locales from:", baseUrl); // Debug log

      const response = await fetch(`${baseUrl}/api/locales`);

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

    setIsTranscribing(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("locale", selectedLocale);
    formData.append("max_speakers", maxSpeakers.toString());
    formData.append("censor_profanity", censorProfanity.toString());
    formData.append("output_format", outputFormat);

    try {
      const baseUrl = getApiUrl();
      console.log("Transcribing with URL:", baseUrl); // Debug log
      console.log("Form data:", {
        filename: file.name,
        locale: selectedLocale,
        maxSpeakers,
        censorProfanity,
        outputFormat,
      }); // Debug log

      const response = await fetch(`${baseUrl}/api/transcribe`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setTranscriptionResult(data);
        setActiveTab("result");
        // Reset preview state when new transcription is done
        setShowPreview(false);
        setPreviewContent("");
        setIsEditing(false);
        setEditedContent("");
      } else {
        setError(data.error || "Transcription failed");
      }
    } catch (err) {
      console.error("Transcription error:", err);
      setError(`Network error occurred: ${err.message}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleTranslateTranscription = () => {
    if (!transcriptionResult || !file) return;

    const transcriptionFileData = {
      content: isEditing ? editedContent : previewContent || "",
      filename: transcriptionResult.transcribed_filename,
      originalFilename: file.name,
      format: outputFormat,
    };

    onTranslateTranscription?.(transcriptionFileData);
  };

  const handleDownload = async () => {
    if (!transcriptionResult?.transcribed_filename) return;

    try {
      const baseUrl = getApiUrl();
      const response = await fetch(
        `${baseUrl}/api/download-transcription?filename=${encodeURIComponent(transcriptionResult.transcribed_filename)}`,
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = transcriptionResult.transcribed_filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || "Download failed");
      }
    } catch (err) {
      console.error("Download error:", err);
      setError(`Download error occurred: ${err.message}`);
    }
  };

  const resetForm = () => {
    setFile(null);
    setTranscriptionResult(null);
    setError("");
    setActiveTab("upload");
    setShowPreview(false);
    setPreviewContent("");
    setConvertedVttContent("");
    setIsEditing(false);
    setEditedContent("");
    setEditHistory([]);
    setHistoryIndex(-1);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Preview feature functions
  const handlePreview = async () => {
    if (!transcriptionResult?.transcribed_filename) return;

    setLoadingPreview(true);
    setError("");

    try {
      const baseUrl = getApiUrl();

      // Fetch transcription content
      const transcriptionResponse = await fetch(
        `${baseUrl}/api/download-transcription?filename=${encodeURIComponent(transcriptionResult.transcribed_filename)}`,
      );

      if (transcriptionResponse.ok) {
        const content = await transcriptionResponse.text();
        setPreviewContent(content);

        console.log("=== CONVERSION CHECK ===");
        console.log("outputFormat:", outputFormat);
        console.log("Will convert SRT?", outputFormat === "srt");

        // Convert SRT to VTT for video preview if needed
        if (outputFormat === "srt") {
          try {
            console.log("Starting manual SRT to VTT conversion...");
            console.log(
              "SRT content to convert (first 300 chars):",
              content.substring(0, 300),
            );

            // Use manual conversion instead of npm package
            const vttContentForVideo = convertSrtToVttManual(content);

            console.log(
              "Manual conversion complete. VTT content (first 300 chars):",
              vttContentForVideo.substring(0, 300),
            );
            console.log("VTT content length:", vttContentForVideo.length);

            setConvertedVttContent(vttContentForVideo);
          } catch (conversionError) {
            console.error(
              "Manual SRT to VTT conversion failed:",
              conversionError,
            );
            setError(
              `Failed to convert SRT to VTT for video preview: ${conversionError.message}`,
            );
            setConvertedVttContent("");
          }
        } else {
          // For VTT files, use original content
          console.log(
            "Using original VTT content (first 300 chars):",
            content.substring(0, 300),
          );
          setConvertedVttContent(content);
        }

        setShowPreview(true);

        // Add this after the SRT to VTT conversion in handlePreview
        console.log("=== PREVIEW DEBUG ===");
        console.log("Output format:", outputFormat);
        console.log("Original content sample:", content.substring(0, 200));
        if (outputFormat === "srt") {
          console.log(
            "Converted VTT content sample:",
            convertedVttContent?.substring(0, 200),
          );
        }

        // Parse subtitles for navigation
        const parsed = parseSubtitles(content, outputFormat);
        setParsedSubtitles(parsed);
        setCurrentSubtitleIndex(-1);

        // Create video URL from uploaded file for preview
        if (
          file &&
          (file.type.startsWith("video/") || file.type.startsWith("audio/"))
        ) {
          const videoObjectUrl = URL.createObjectURL(file);
          setVideoUrl(videoObjectUrl);
          setShowVideoPreview(true);
        }

        // Scroll to preview section
        setTimeout(() => {
          if (previewRef.current) {
            previewRef.current.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        }, 100);
      } else {
        throw new Error("Failed to load transcription for preview");
      }
    } catch (err) {
      console.error("Preview error:", err);
      setError(`Preview failed: ${err.message}`);
    } finally {
      setLoadingPreview(false);
    }
  };

  const closePreview = () => {
    setShowPreview(false);
    setPreviewContent("");
    setIsEditing(false);
    setEditedContent("");
    setEditHistory([]);
    setHistoryIndex(-1);
    setShowVideoPreview(false);
    setParsedSubtitles([]);
    setCurrentSubtitleIndex(-1);
    setConvertedVttContent("");

    // Clean up video preview
    setShowVideoPreview(false);
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }

    // Clean up subtitle URL
    if (window.previousSubtitleUrl) {
      URL.revokeObjectURL(window.previousSubtitleUrl);
      window.previousSubtitleUrl = null;
    }
  };

  const startEditing = () => {
    setEditedContent(previewContent);
    setIsEditing(true);
    initializeEditHistory(previewContent);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedContent("");
    setEditHistory([]);
    setHistoryIndex(-1);
  };

  const saveEditedFile = async () => {
    setIsSaving(true);
    try {
      setPreviewContent(editedContent);
      setIsEditing(false);
      setEditedContent("");
    } catch (err) {
      setError(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const downloadEditedFile = async () => {
    try {
      const content = isEditing
        ? editedContent
        : editedContent || previewContent;
      const blob = new Blob([content], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = transcriptionResult.transcribed_filename
        .replace(".srt", "_edited.srt")
        .replace(".vtt", "_edited.vtt");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Download failed: ${err.message}`);
    }
  };

  const initializeEditHistory = (content) => {
    setEditHistory([content]);
    setHistoryIndex(0);
  };

  const addToHistory = (content) => {
    setEditHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(content);
      if (newHistory.length > 50) {
        newHistory.shift();
        setHistoryIndex(Math.min(historyIndex, newHistory.length - 1));
        return newHistory;
      }
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setEditedContent(editHistory[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < editHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setEditedContent(editHistory[newIndex]);
    }
  };

  const handleTextChange = (newContent) => {
    setEditedContent(newContent);
    clearTimeout(window.editHistoryTimeout);
    window.editHistoryTimeout = setTimeout(() => {
      addToHistory(newContent);
    }, 500);
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
    } else if (
      ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Z") ||
      ((e.ctrlKey || e.metaKey) && e.key === "y")
    ) {
      e.preventDefault();
      handleRedo();
    }
  };

  // Parse timestamp to seconds
  const parseTimestamp = (timestamp) => {
    const parts = timestamp.split(":");
    const seconds = parts[2].split(/[,.]/); // Handle both SRT (,) and VTT (.) formats
    return (
      parseInt(parts[0]) * 3600 +
      parseInt(parts[1]) * 60 +
      parseFloat(seconds[0] + "." + seconds[1])
    );
  };

  // Parse SRT format subtitles
  const parseSrtSubtitles = (content) => {
    const blocks = content.trim().split(/\n\s*\n/);
    const subtitles = [];

    blocks.forEach((block) => {
      const lines = block.trim().split("\n");
      if (lines.length >= 3) {
        const timeLine = lines[1];
        const timeMatch = timeLine.match(
          /(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/,
        );

        if (timeMatch) {
          const startTime = parseTimestamp(timeMatch[1]);
          const endTime = parseTimestamp(timeMatch[2]);
          const text = lines.slice(2).join("\n");

          subtitles.push({
            startTime,
            endTime,
            text: text.trim(),
            originalBlock: block,
          });
        }
      }
    });

    return subtitles;
  };

  // Parse VTT format subtitles
  const parseVttSubtitles = (content) => {
    const lines = content.split("\n");
    const subtitles = [];
    let currentSubtitle = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip WEBVTT header and empty lines
      if (line === "WEBVTT" || line === "") continue;

      // Check for timestamp line
      const timeMatch = line.match(
        /(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/,
      );

      if (timeMatch) {
        // If we have a previous subtitle, save it
        if (currentSubtitle) {
          subtitles.push(currentSubtitle);
        }

        // Start new subtitle
        currentSubtitle = {
          startTime: parseTimestamp(timeMatch[1]),
          endTime: parseTimestamp(timeMatch[2]),
          text: "",
          originalBlock: line,
        };
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

    return subtitles;
  };

  // Main parsing function
  const parseSubtitles = (content, format) => {
    if (format === "srt") {
      return parseSrtSubtitles(content);
    } else if (format === "vtt") {
      return parseVttSubtitles(content);
    }
    return [];
  };

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
            AI Transcription
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
                ? "border-b-2 border-blue-500 text-blue-600"
                : isDarkMode
                  ? "text-gray-300 hover:text-blue-400"
                  : "text-gray-600 hover:text-blue-600"
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            Upload & Configure
          </button>
          <button
            onClick={() => setActiveTab("result")}
            className={`px-6 py-3 font-medium transition-colors duration-300 ${
              activeTab === "result"
                ? "border-b-2 border-blue-500 text-blue-600"
                : isDarkMode
                  ? "text-gray-300 hover:text-blue-400"
                  : "text-gray-600 hover:text-blue-600"
            } ${!transcriptionResult ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Results
          </button>
        </div>

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
                      ? "border-gray-600 hover:border-blue-500 bg-gray-800"
                      : "border-gray-300 hover:border-blue-400 bg-white"
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
                      className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300 ${
                        isDarkMode
                          ? "border-gray-600 bg-gray-700 text-gray-200"
                          : "border-gray-300 bg-white text-gray-900"
                      }`}
                    >
                      <option value="vtt">VTT </option>
                      <option value="srt">SRT </option>
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
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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
                    className={`flex items-center space-x-2 font-medium transition-colors duration-300 ${
                      isDarkMode
                        ? "text-blue-400 hover:text-blue-300"
                        : "text-blue-600 hover:text-blue-800"
                    }`}
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
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300 ${
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
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300 ${
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
                      : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                >
                  {isTranscribing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Transcribing...</span>
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
        {activeTab === "result" && transcriptionResult && (
          <div className="p-6">
            <div className="space-y-6">
              {/* Success Message */}
              <div
                className={`border-l-4 border-green-400 p-4 transition-colors duration-300 ${
                  isDarkMode ? "bg-green-900/20" : "bg-green-50"
                }`}
              >
                <div className="flex">
                  <Check className="h-5 w-5 text-green-400" />
                  <div className="ml-3">
                    <p
                      className={`text-sm mt-1 transition-colors duration-300 ${
                        isDarkMode ? "text-green-300" : "text-green-700"
                      }`}
                    >
                      {transcriptionResult.message}
                    </p>
                  </div>
                </div>
              </div>

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
                  <div>
                    <span
                      className={`text-sm font-medium transition-colors duration-300 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      Output File:
                    </span>
                    <p
                      className={`transition-colors duration-300 ${
                        isDarkMode ? "text-gray-200" : "text-gray-900"
                      }`}
                    >
                      {transcriptionResult.transcribed_filename}
                    </p>
                  </div>
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
                  <div>
                    <span
                      className={`text-sm font-medium transition-colors duration-300 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      Max Speakers:
                    </span>
                    <p
                      className={`transition-colors duration-300 ${
                        isDarkMode ? "text-gray-200" : "text-gray-900"
                      }`}
                    >
                      {maxSpeakers}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`text-sm font-medium transition-colors duration-300 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      Profanity Filter:
                    </span>
                    <p
                      className={`transition-colors duration-300 ${
                        isDarkMode ? "text-gray-200" : "text-gray-900"
                      }`}
                    >
                      {censorProfanity ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={handleDownload}
                  className="flex-1 bg-green-500 text-white py-3 px-6 rounded-lg hover:bg-green-600 font-medium transition-colors duration-300 flex items-center justify-center space-x-2"
                >
                  <Download className="w-5 h-5" />
                  <span>Download Transcription</span>
                </button>

                <button
                  onClick={handlePreview}
                  disabled={loadingPreview}
                  className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors duration-300 flex items-center justify-center space-x-2 ${
                    loadingPreview
                      ? isDarkMode
                        ? "bg-gray-600 text-gray-400"
                        : "bg-gray-400 text-gray-600"
                      : "bg-blue-500 text-white hover:bg-blue-600"
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

                <button
                  onClick={handleTranslateTranscription}
                  className="flex-1 bg-purple-500 text-white py-3 px-6 rounded-lg hover:bg-purple-600 font-medium transition-colors duration-300 flex items-center justify-center space-x-2"
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

              {/* Preview Section - Shows below action buttons when loaded */}
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
                        <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                        Transcribed Content ({selectedLocale}) -{" "}
                        {outputFormat.toUpperCase()}
                      </h4>
                      <div className="flex items-center space-x-2">
                        {!isEditing ? (
                          <button
                            onClick={startEditing}
                            className={`text-sm flex items-center space-x-1 px-2 py-1 rounded transition-colors duration-300 ${
                              isDarkMode
                                ? "text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                                : "text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            }`}
                          >
                            <Edit className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={saveEditedFile}
                              disabled={isSaving}
                              className={`text-sm flex items-center space-x-1 px-2 py-1 rounded transition-colors duration-300 ${
                                isDarkMode
                                  ? "text-green-400 hover:text-green-300 hover:bg-green-900/20"
                                  : "text-green-600 hover:text-green-800 hover:bg-green-50"
                              }`}
                            >
                              <Save className="w-4 h-4" />
                              <span>{isSaving ? "Saving..." : "Save"}</span>
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={isSaving}
                              className={`text-sm flex items-center space-x-1 px-2 py-1 rounded transition-colors duration-300 ${
                                isDarkMode
                                  ? "text-gray-400 hover:text-gray-300 hover:bg-gray-700"
                                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                              }`}
                            >
                              <X className="w-4 h-4" />
                              <span>Cancel</span>
                            </button>
                          </div>
                        )}
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
                      />
                    )}
                    {isEditing ? (
                      <div className="space-y-3">
                        {/* Undo/Redo buttons */}
                        <div
                          className={`flex items-center space-x-2 pb-2 border-b transition-colors duration-300 ${
                            isDarkMode ? "border-gray-600" : "border-gray-200"
                          }`}
                        >
                          <button
                            onClick={handleUndo}
                            disabled={historyIndex <= 0}
                            className={`flex items-center space-x-1 px-3 py-1 rounded text-sm transition-colors duration-300 ${
                              historyIndex <= 0
                                ? isDarkMode
                                  ? "bg-gray-700 text-gray-600 cursor-not-allowed"
                                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : isDarkMode
                                  ? "bg-gray-600 text-gray-200 hover:bg-gray-500"
                                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                            title="Undo (Ctrl+Z)"
                          >
                            <Undo className="w-4 h-4" />
                            <span>Undo</span>
                          </button>
                          <button
                            onClick={handleRedo}
                            disabled={historyIndex >= editHistory.length - 1}
                            className={`flex items-center space-x-1 px-3 py-1 rounded text-sm transition-colors duration-300 ${
                              historyIndex >= editHistory.length - 1
                                ? isDarkMode
                                  ? "bg-gray-700 text-gray-600 cursor-not-allowed"
                                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : isDarkMode
                                  ? "bg-gray-600 text-gray-200 hover:bg-gray-500"
                                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                            title="Redo (Ctrl+Shift+Z or Ctrl+Y)"
                          >
                            <Redo className="w-4 h-4" />
                            <span>Redo</span>
                          </button>
                          <div
                            className={`text-xs ml-auto transition-colors duration-300 ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            History: {historyIndex + 1}/{editHistory.length}
                          </div>
                        </div>

                        <textarea
                          ref={editTextareaRef}
                          value={editedContent}
                          onChange={(e) => handleTextChange(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className={`w-full h-96 p-3 border rounded font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300 ${
                            isDarkMode
                              ? "border-gray-600 bg-gray-800 text-gray-200"
                              : "border-gray-300 bg-white text-gray-900"
                          }`}
                          placeholder="Edit your subtitle content here..."
                        />
                        <div
                          className={`flex justify-between text-xs transition-colors duration-300 ${
                            isDarkMode ? "text-gray-500" : "text-gray-400"
                          }`}
                        >
                          <span>Lines: {editedContent.split("\n").length}</span>
                          <span>Characters: {editedContent.length}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="max-h-96 overflow-auto">
                        <pre
                          className={`text-sm whitespace-pre-wrap font-mono leading-relaxed transition-colors duration-300 ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          {previewContent}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Preview Action Buttons */}
                  {showPreview && (
                    <div
                      className={`px-4 py-3 border-t rounded-b-lg transition-colors duration-300 ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          {isEditing && (
                            <div
                              className={`text-sm px-3 py-1 rounded-full transition-colors duration-300 ${
                                isDarkMode
                                  ? "text-orange-300 bg-orange-900/30"
                                  : "text-orange-600 bg-orange-100"
                              }`}
                            >
                              Editing Mode
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              if (editedContent || isEditing) {
                                downloadEditedFile();
                              } else {
                                handleDownload();
                              }
                            }}
                            disabled={isEditing}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-300 ${
                              isEditing
                                ? isDarkMode
                                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : "bg-green-500 text-white hover:bg-green-600"
                            }`}
                          >
                            <Download className="w-4 h-4" />
                            <span>
                              {isEditing
                                ? "Finish Editing First"
                                : editedContent
                                  ? "Download Edited"
                                  : "Download Original"}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TranscriptionApp;
