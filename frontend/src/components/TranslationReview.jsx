import React, { useState } from "react";
import { Download, Edit3, Save, Check } from "lucide-react";

const TranslationReview = () => {
  const [subtitles, setSubtitles] = useState([
    {
      id: 1,
      timestamp: "00:00:01,000 --> 00:00:04,000",
      original: "Welcome to our presentation today",
      translation: "Bienvenidos a nuestra presentación de hoy",
      isEditing: false,
      confidence: 95,
    },
    {
      id: 2,
      timestamp: "00:00:05,000 --> 00:00:08,000",
      original: "We will discuss the future of technology",
      translation: "Discutiremos el futuro de la tecnología",
      isEditing: false,
      confidence: 88,
    },
    {
      id: 3,
      timestamp: "00:00:09,000 --> 00:00:12,000",
      original: "This is an important topic for everyone",
      translation: "Este es un tema importante para todos",
      isEditing: false,
      confidence: 92,
    },
  ]);

  const [currentLanguage, setCurrentLanguage] = useState("es");

  const toggleEdit = (id) => {
    setSubtitles(
      subtitles.map((sub) =>
        sub.id === id ? { ...sub, isEditing: !sub.isEditing } : sub,
      ),
    );
  };

  const updateTranslation = (id, newTranslation) => {
    setSubtitles(
      subtitles.map((sub) =>
        sub.id === id
          ? { ...sub, translation: newTranslation, isEditing: false }
          : sub,
      ),
    );
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return "text-green-600 bg-green-100";
    if (confidence >= 75) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-lg mb-6">
        🛠️ <strong>Translation Review is coming soon.</strong> This feature is
        currently under development.
      </div>

      {/* Placeholder UI for future review tools */}
      <div className="text-gray-500 text-center italic mt-8">
        Subtitle review and editing tools will appear here.
      </div>
    </div>
  );
};

export default TranslationReview;
