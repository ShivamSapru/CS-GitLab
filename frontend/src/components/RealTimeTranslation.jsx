import React from "react";
import { Wrench, Clock } from "lucide-react";

const TranslationReview = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="bg-blue-100 p-6 rounded-full mb-6">
            <Wrench className="w-16 h-16 text-blue-600" />
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Translation Review
          </h2>

          <div className="flex items-center space-x-2 mb-6">
            <Clock className="w-5 h-5 text-gray-500" />
            <p className="text-lg text-gray-600">
              This feature is currently in development
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 max-w-md text-center">
            <p className="text-gray-700">Stay tuned for updates!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranslationReview;
` `;
