import React, { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Setup2FA = () => {
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetch2FA = async () => {
      try {
        const res = await axios.get("http://localhost:8000/setup-2fa", {
          withCredentials: true,
        });
        setSecret(res.data.secret);
        setUri(res.data.provisioning_uri);
      } catch (err) {
        setError("Failed to load 2FA setup.");
      }
    };
    fetch2FA();
  }, []);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await axios.post(
        "http://localhost:8000/verify-2fa-setup",
        { otp, secret },
        { withCredentials: true }
      );
      setSuccess("2FA enabled successfully!");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid OTP. Try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-100">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-sm text-center">
        <h2 className="text-xl font-bold mb-4">Set Up 2FA</h2>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        {success && <p className="text-green-600 text-sm mb-3">{success}</p>}

        {uri ? (
          <>
            <p className="text-sm text-gray-600 mb-3">
              Scan this QR code with your Authenticator app (Google, Microsoft, Authy, etc.),
              then enter the 6-digit code below.
            </p>
            <div className="bg-white p-4 rounded mb-4 border inline-block">
              <QRCode value={uri} size={180} />
            </div>
            <form onSubmit={handleVerify}>
              <input
                type="text"
                inputMode="numeric"
                maxLength="6"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-3 py-2 border rounded mb-3"
                required
              />
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                Verify & Enable 2FA
              </button>
            </form>
          </>
        ) : (
          <p className="text-gray-500 text-sm">Loading QR code...</p>
        )}
      </div>
    </div>
  );
};

export default Setup2FA;
