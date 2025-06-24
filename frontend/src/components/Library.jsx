import React, { useState } from "react";
import {
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  Calendar,
  Globe,
} from "lucide-react";

const Library = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLanguage, setFilterLanguage] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  // Sample data - replace with real data from your backend
  const [savedTranslations, setSavedTranslations] = useState([
    {
      id: 1,
      filename: "presentation_2024.srt",
      originalLanguage: "English",
      targetLanguage: "Spanish",
      createdAt: "2024-06-10",
      fileSize: "2.5 KB",
      status: "completed",
    },
    {
      id: 2,
      filename: "meeting_notes.vtt",
      originalLanguage: "English",
      targetLanguage: "French",
      createdAt: "2024-06-09",
      fileSize: "1.8 KB",
      status: "completed",
    },
    {
      id: 3,
      filename: "tutorial_video.srt",
      originalLanguage: "Spanish",
      targetLanguage: "German",
      createdAt: "2024-06-08",
      fileSize: "3.2 KB",
      status: "processing",
    },
  ]);

  const handleDelete = (id) => {
    setSavedTranslations(savedTranslations.filter((item) => item.id !== id));
  };

  const handleDownload = (filename) => {
    // Implement download logic here
    console.log(`Downloading: ${filename}`);
  };

  const handlePreview = (filename) => {
    // Implement preview logic here
    console.log(`Previewing: ${filename}`);
  };

  const filteredTranslations = savedTranslations.filter((item) => {
    const matchesSearch =
      item.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.originalLanguage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.targetLanguage.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterLanguage === "all" ||
      item.targetLanguage.toLowerCase() === filterLanguage.toLowerCase();

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">
            Translation Library
          </h2>
          <div className="text-sm text-gray-500">
            {filteredTranslations.length} translation
            {filteredTranslations.length !== 1 ? "s" : ""} found
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search translations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Language Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
            >
              <option value="all">All Languages</option>
              <option value="spanish">Spanish</option>
              <option value="french">French</option>
              <option value="german">German</option>
              <option value="chinese">Chinese</option>
            </select>
          </div>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="language">Sort by Language</option>
            <option value="size">Sort by Size</option>
          </select>
        </div>

        {/* Translation List */}
        {filteredTranslations.length === 0 ? (
          <div className="text-center py-12">
            <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No translations found
            </h3>
            <p className="text-gray-500">
              {searchTerm || filterLanguage !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Start by uploading and translating your first subtitle file"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTranslations.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 min-w-0 mb-4 sm:mb-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {item.filename}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          item.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center text-sm text-gray-500 space-x-4">
                      <span className="flex items-center">
                        <Globe className="w-4 h-4 mr-1" />
                        {item.originalLanguage} → {item.targetLanguage}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {item.createdAt}
                      </span>
                      <span>{item.fileSize}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePreview(item.filename)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDownload(item.filename)}
                      disabled={item.status !== "completed"}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;
