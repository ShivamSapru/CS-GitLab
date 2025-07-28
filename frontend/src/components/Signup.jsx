import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Signup = ({ setUser, onShowLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  // ✅ Redirect if already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await axios.get("http://localhost:8000/me", {
          withCredentials: true,
        });
        if (res.data?.email) {
          setUser(res.data);
          navigate("/");
        }
      } catch {
        // Not logged in — stay on signup
      }
    };
    checkSession();
  }, []);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      // Register
      await axios.post(
        "http://localhost:8000/register",
        {
          email,
          password,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        },
      );

      // Auto-login
      const res = await axios.post(
        "http://localhost:8000/login",
        {
          email,
          password,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        },
      );

      // ✅ Handle 2FA logic
      if (res.data?.setup_2fa_required) {
        setUser(res.data); // Partial user object
        navigate("/setup-2fa");
      } else if (res.data?.twofa_required) {
        setUser(res.data);
        navigate("/verify-2fa");
      } else {
        setUser(res.data.user); // Full user object
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.detail ?? "Registration failed");
    }
  };

  const handleShowLogin = () => {
    if (onShowLogin) {
      onShowLogin();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleSignup}
        className="bg-white p-6 rounded shadow-md w-full max-w-sm"
      >
        <h2 className="text-xl font-bold mb-4 text-center">Sign Up</h2>

        {error &&
          (Array.isArray(error) ? (
            <ul className="text-red-500 text-sm mb-3 list-disc ml-4">
              {error.map((err, idx) => (
                <li key={idx}>{err.msg}</li>
              ))}
            </ul>
          ) : (
            <p className="text-red-500 text-sm mb-3">{error}</p>
          ))}
        {success && <p className="text-green-600 text-sm mb-3">{success}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full mb-3 px-3 py-2 border rounded"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full mb-3 px-3 py-2 border rounded"
        />

        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full mb-4 px-3 py-2 border rounded"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Sign Up
        </button>

        <p className="text-sm mt-3 text-center">
          Already have an account?{" "}
          <button
            type="button"
            onClick={handleShowLogin}
            className="text-blue-600 hover:underline font-medium bg-transparent border-none cursor-pointer"
          >
            Log in
          </button>
        </p>

        <div className="my-4 flex items-center justify-center">
          <span className="text-gray-400">or</span>
        </div>

        <button
          onClick={() => {
            window.location.href = "http://localhost:8000/login";
          }}
          type="button"
          className="flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          <img
            src="https://developers.google.com/identity/images/g-logo.png"
            alt="Google"
            alt="Google"
            className="w-5 h-5 mr-2"
          />
          Continue with Google
        </button>
      </form>
    </div>
  );
};

export default Signup;
