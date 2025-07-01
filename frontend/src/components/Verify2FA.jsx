import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Verify2FA = ({ setUser }) => {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post(
        "http://localhost:8000/verify-2fa",
        { otp },
        { withCredentials: true }
      );

      setUser(res.data.user);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid OTP. Try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <form
        onSubmit={handleVerify}
        className="bg-white p-6 rounded-lg shadow-md w-full max-w-sm"
      >
        <h2 className="text-xl font-bold mb-4 text-center">Verify 2FA</h2>
        <p className="text-sm text-gray-600 mb-4">
          Enter the 6-digit code from your Authenticator app.
        </p>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <input
          type="text"
          inputMode="numeric"
          maxLength="6"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="Enter 6-digit OTP"
          required
          className="w-full mb-4 px-3 py-2 border rounded"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Verify
        </button>
      </form>
    </div>
  );
};

export default Verify2FA;
