import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = ({ setUser }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // ✅ Auto-redirect if already logged in
  useEffect(() => {
    const checkUser = async () => {
      try {
        const res = await axios.get('http://localhost:8000/me', { withCredentials: true });
        if (res.data?.email) {
          setUser(res.data);
          navigate('/');
        }
      } catch {
        // User not logged in, do nothing
      }
    };
    checkUser();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await axios.post(
        'http://localhost:8000/login',
        { email, password },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true
        }
      );

      setUser(res.data.user); // set user globally
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail ?? "Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleLogin} className="bg-white p-6 rounded shadow-md w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4 text-center">Login</h2>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

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
          className="w-full mb-4 px-3 py-2 border rounded"
        />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          Log In
        </button>
        <p className="text-sm mt-3 text-center">
          Don't have an account? <Link to="/signup" className="text-blue-600 hover:underline">Sign up</Link>
        </p>

        <div className="my-4 flex items-center justify-center">
          <span className="text-gray-400">or</span>
        </div>
        <button
          onClick={() => window.location.href = "http://localhost:8000/login"}
          type="button"
          className="mt-3 flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          <img
            src="https://developers.google.com/identity/images/g-logo.png"
            alt="Google"
            className="w-5 h-5 mr-2"
          />
          Continue with Google
        </button>
      </form>
    </div>
  );
};

export default Login;
