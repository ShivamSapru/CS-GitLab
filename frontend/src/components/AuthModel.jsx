import React from "react";
import { FcGoogle } from "react-icons/fc";

const AuthModal = () => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome</h2>
        <p className="text-gray-600 mb-6">
          Log in or sign up to translate subtitles, save history, and personalize your experience.
        </p>

        <button
          onClick={() => {
            // Redirects user to FastAPI OAuth login
            window.location.href = "http://localhost:8000/login";
          }}
          className="flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <FcGoogle className="w-5 h-5 mr-2" />
          Continue with Google
        </button>

        <p className="text-sm mt-4 text-gray-600">
          <a href="/login" className="text-blue-600 hover:underline">Log in</a> or 
          <a href="/signup" className="text-blue-600 hover:underline ml-1">Sign up</a> with email
        </p>

      </div>
    </div>
  );
};

export default AuthModal;
