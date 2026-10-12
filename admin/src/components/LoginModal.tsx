import React, { useState, useRef } from 'react';
import { Scale, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { adminApi } from '../api';

interface LoginModalProps {
  isOpen: boolean;
  onSuccess: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onSuccess }) => {
  const [username, setUsername] = useState('Balasaheb Thopate');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Sync autofill value from the DOM input if the browser populated it without a React synthetic event
  const syncAutofill = () => {
    if (passwordInputRef.current) {
      const domVal = passwordInputRef.current.value;
      if (domVal && domVal !== password) {
        setPassword(domVal);
      }
    }
  };

  const handleTogglePassword = () => {
    syncAutofill();
    setShowPassword((prev) => !prev);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentPass = passwordInputRef.current?.value || password;
    if (!username.trim() || !currentPass) {
      setError('Please enter the administrator username and password.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await adminApi.login(currentPass, username);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0A1526] flex items-center justify-center p-4 selection:bg-[#C89B3C] selection:text-white">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-login-title"
        className="relative bg-[#0F1E36] border border-[#1E293B] rounded-2xl w-full max-w-[370px] py-10 px-6 sm:px-7 shadow-2xl text-white overflow-hidden"
      >
        {/* Subtle Gold Accent Top Border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#C89B3C]/20 via-[#C89B3C] to-[#C89B3C]/20" />

        {/* Branding Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#C89B3C]/15 border border-[#C89B3C]/35 flex items-center justify-center text-[#C89B3C] mx-auto mb-3.5 shadow-inner">
            <Scale className="w-8 h-8" />
          </div>
          <span className="text-[11px] font-extrabold text-[#C89B3C] uppercase tracking-wider block">
            ADVOCATE BALASAHEB THOPATE
          </span>
          <h2 id="admin-login-title" className="text-xl sm:text-2xl font-black text-white mt-1.5 tracking-tight">
            Chamber Admin Portal
          </h2>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            Enter administrator credentials to access lawyer assignments and fees collection control.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-5 bg-rose-950/70 border border-rose-800 text-rose-200 text-xs p-3 rounded-xl flex items-center space-x-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Admin Username Field */}
          <div>
            <label
              htmlFor="admin-username"
              className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
            >
              Admin Username
            </label>
            <input
              id="admin-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              style={{
                backgroundColor: '#0A1526',
                color: '#ffffff',
                WebkitTextFillColor: '#ffffff',
              }}
              className="w-full bg-[#0A1526] border border-[#1E293B] rounded-xl px-3.5 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#C89B3C] transition"
              required
            />
          </div>

          {/* Admin Password Field with Show/Hide Eye Toggle */}
          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
            >
              Admin Password
            </label>
            <div className="relative">
              <input
                ref={passwordInputRef}
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                onFocus={syncAutofill}
                onBlur={syncAutofill}
                autoComplete="current-password"
                style={{
                  backgroundColor: '#0A1526',
                  color: '#ffffff',
                  WebkitTextFillColor: '#ffffff',
                }}
                className="w-full bg-[#0A1526] border border-[#1E293B] rounded-xl pl-3.5 pr-11 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#C89B3C] transition font-mono tracking-wide"
                required
              />
              <button
                type="button"
                onClick={handleTogglePassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-300 hover:text-[#C89B3C] active:text-[#C89B3C] transition rounded-lg focus:outline-none z-10"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#C89B3C] hover:bg-[#B48328] active:bg-[#9E7220] text-white font-extrabold py-3.5 rounded-xl text-sm transition shadow-lg shadow-[#0A1526]/50 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In to Admin Panel</span>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div className="mt-8 pt-5 border-t border-[#1E293B] text-center">
          <p className="text-[11px] text-slate-400 font-medium">
            Dedicated Chamber Admin & Revenue Management
          </p>
        </div>
      </div>
    </div>
  );
};
