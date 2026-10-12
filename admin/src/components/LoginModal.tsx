import React, { useState } from 'react';
import { Lock, Scale, AlertCircle } from 'lucide-react';
import { adminApi } from '../api';

interface LoginModalProps {
  isOpen: boolean;
  onSuccess: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onSuccess }) => {
  const [username, setUsername] = useState('Balasaheb Thopate');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter the administrator username and password.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await adminApi.login(password, username);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A1526]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="admin-login-title" className="bg-[#0F1E36] border border-[#1E293B] rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl text-white">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#C89B3C]/15 border border-[#C89B3C]/35 flex items-center justify-center text-[#C89B3C] mx-auto mb-3 shadow-inner">
            <Scale className="w-8 h-8" />
          </div>
          <span className="text-[11px] font-extrabold text-[#C89B3C] uppercase tracking-wider block">
            ADVOCATE BALASAHEB THOPATE
          </span>
          <h2 id="admin-login-title" className="text-xl font-extrabold text-white mt-1 tracking-tight">
            Chamber Admin Portal
          </h2>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
            Enter administrator password to access lawyer assignments and fees collection control.
          </p>
        </div>

        {error && (
          <div role="alert" aria-live="polite" className="mb-4 bg-rose-950/70 border border-rose-800 text-rose-200 text-xs p-3 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-username" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Admin Username
            </label>
            <input
              id="admin-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#0A1526] border border-[#1E293B] rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#C89B3C]"
              required
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Admin Password
            </label>
            <div className="relative">
              <input
                id="admin-password"
                autoFocus
                type="password"
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0A1526] border border-[#1E293B] rounded-lg pl-3.5 pr-10 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#C89B3C]"
                required
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#C89B3C] hover:bg-[#B48328] text-white font-bold py-2.5 rounded-lg text-sm transition shadow-lg shadow-[#0A1526]/50 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Admin Panel'}
          </button>
        </form>
      </div>
    </div>
  );
};
