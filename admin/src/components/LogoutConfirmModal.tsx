import React, { useEffect } from 'react';
import { LogOut, X } from 'lucide-react';
import { adminApi } from '../api';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const currentUsername = adminApi.getUsername() || 'Balasaheb Thopate';

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0A1526]/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
        aria-describedby="logout-confirm-desc"
        className="relative w-full max-w-sm sm:max-w-md bg-[#0F1E36] border border-[#1E293B] rounded-2xl p-6 sm:p-7 shadow-2xl text-white overflow-hidden"
      >
        {/* Subtle Gold Accent Top Border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#C89B3C]/20 via-[#C89B3C] to-[#C89B3C]/20" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close confirmation dialog"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Chamber Icon */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#C89B3C]/15 border border-[#C89B3C]/35 flex items-center justify-center text-[#C89B3C] mx-auto mb-3.5 shadow-inner">
            <LogOut className="w-7 h-7 text-[#C89B3C]" />
          </div>

          <span className="text-[11px] font-extrabold text-[#C89B3C] uppercase tracking-wider block">
            ADVOCATE BALASAHEB THOPATE CHAMBER
          </span>

          <h3 id="logout-confirm-title" className="text-xl font-extrabold text-white mt-1.5 tracking-tight">
            Sign Out of Chamber Admin?
          </h3>

          {/* Active Admin Session Pill */}
          <div className="mt-2.5 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#0A1526] border border-[#1E293B] text-[11px] text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Active Session: <strong className="text-white font-semibold">{currentUsername}</strong>
            </span>
          </div>

          <p id="logout-confirm-desc" className="text-xs text-slate-300 mt-3 leading-relaxed max-w-sm">
            Are you sure you want to end your Chamber Master Admin session? You will need to re-enter your administrator credentials to access financial reports and lawyer management.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition flex items-center justify-center"
          >
            Stay Logged In
          </button>

          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold transition shadow-lg shadow-rose-950/40 flex items-center justify-center space-x-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>Yes, Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
