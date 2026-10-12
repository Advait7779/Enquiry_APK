import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, X } from 'lucide-react';

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

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-[#0A1526]/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
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
        className="relative w-full max-w-[340px] sm:max-w-[350px] bg-white border border-[#CBD5E1] rounded-2xl py-8 sm:py-9 px-6 sm:px-7 shadow-2xl text-[#0F172A] overflow-hidden"
      >
        {/* Accent Top Border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500/20 via-rose-500 to-rose-500/20" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-[#0F172A] hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Logout Icon */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto mb-3.5 shadow-sm">
            <LogOut className="w-8 h-8 text-rose-600" />
          </div>

          <span className="text-[11px] font-extrabold text-[#B48328] uppercase tracking-wider block">
            ADVOCATE BALASAHEB THOPATE CHAMBER
          </span>

          <h3 id="logout-confirm-title" className="text-xl font-bold text-[#0F172A] mt-2 tracking-tight">
            Sign Out of Chamber Admin?
          </h3>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col-reverse sm:flex-row items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] active:bg-slate-100 text-[#475569] hover:text-[#0F172A] text-xs font-bold transition flex items-center justify-center"
          >
            Stay Logged In
          </button>

          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold transition shadow-sm hover:shadow shadow-rose-600/20 flex items-center justify-center space-x-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>Yes, Sign Out</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
