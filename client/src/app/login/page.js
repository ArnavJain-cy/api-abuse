"use client"; // Required for handling inputs/clicks in Next.js

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  
  // State for form inputs
  const [formData, setFormData] = useState({ username: '', password: '' });
  
  // State for UI feedback
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Handle typing in inputs
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(''); // Clear error when user starts typing again
  };

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Send credentials to your Backend
      // Ensure NEXT_PUBLIC_API_URL is set in your .env (or use localhost for testing)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const res = await axios.post(`${apiUrl}/api/login`, formData);

      // 2. Success! 
      setSuccess(true);
      
      // Store the token (if your backend sends one)
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
      }

      // 3. Redirect to Dashboard after 1 second
      setTimeout(() => {
        router.push('/balancecheck'); 
      }, 1000);

    } catch (err) {
      // 4. Handle Errors
      if (err.response) {
        // If Backend sends a specific error (like "Attempt 3/5" or "Account Locked")
        setError(err.response.data.error || 'Login failed');
      } else {
        setError('Server error. Is the backend running?');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
      <div className="w-full max-w-md p-8 space-y-6 bg-slate-800 rounded-xl shadow-2xl border border-slate-700">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-400">The Sentinel</h1>
          <p className="text-slate-400 mt-2">Secure Access Portal</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            //   placeholder="admin"
              placeholder="Enter your username"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            //   placeholder="password123"
              placeholder="Enter your password"
              required
            />
          </div>

          {/* Error Message Display */}
          {error && (
            <div className={`p-3 rounded text-sm text-center ${error.includes("Locked") ? "bg-red-900/50 text-red-200 border border-red-700" : "bg-red-500/20 text-red-300"}`}>
              {error}
            </div>
          )}

          {/* Success Message Display */}
          {success && (
            <div className="p-3 bg-green-500/20 text-green-300 rounded text-sm text-center border border-green-700">
              ✅ Login Successful! Redirecting...
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success}
            className={`w-full py-3 px-4 font-semibold rounded-lg transition-all duration-200 
              ${loading ? 'bg-slate-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.5)]'}
            `}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Footer Hint */}
        {/* <div className="text-center text-xs text-slate-500 mt-4">
          <p>Demo Credentials: admin / password123</p>
        </div> */}
      </div>
    </div>
  );
}