import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Trash2, ShieldCheck, Info } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  subtitle?: string;
  message: React.ReactNode;
  confirmText?: string;
  confirmIcon?: React.ReactNode;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'gold';
  badge?: {
    text: string;
    subtext?: string;
    icon?: React.ReactNode;
  };
  notice?: {
    title?: string;
    text: string;
    type?: 'safe' | 'warning' | 'info';
  };
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  title,
  subtitle = 'ADVOCATE BALASAHEB THOPATE CHAMBER',
  message,
  confirmText = 'Confirm',
  confirmIcon,
  cancelText = 'Cancel',
  variant = 'danger',
  badge,
  notice,
  icon,
  isLoading = false,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, isLoading]);

  if (!isOpen) return null;

  // Light / Off-White theme styling helpers
  let topGradient = 'from-rose-500/20 via-rose-500 to-rose-500/20';
  let iconContainer = 'bg-rose-50 border-rose-200 text-rose-600';
  let confirmBtn = 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-sm hover:shadow shadow-rose-600/20';
  let defaultIcon = <Trash2 className="w-7 h-7 text-rose-600" />;

  if (variant === 'warning') {
    topGradient = 'from-amber-500/20 via-amber-500 to-amber-500/20';
    iconContainer = 'bg-amber-50 border-amber-200 text-amber-600';
    confirmBtn = 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-sm hover:shadow shadow-amber-600/20';
    defaultIcon = <AlertTriangle className="w-7 h-7 text-amber-600" />;
  } else if (variant === 'primary' || variant === 'gold') {
    topGradient = 'from-[#C89B3C]/20 via-[#C89B3C] to-[#C89B3C]/20';
    iconContainer = 'bg-[#FBF4E6] border-[#C89B3C]/30 text-[#B48328]';
    confirmBtn = 'bg-[#0F1E36] hover:bg-[#1E293B] active:bg-[#0A1526] text-white shadow-sm hover:shadow';
    defaultIcon = <Info className="w-7 h-7 text-[#B48328]" />;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-[#0A1526]/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onCancel();
        }
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
        className="relative w-full max-w-sm sm:max-w-md bg-white border border-[#CBD5E1] rounded-2xl p-6 sm:p-7 shadow-2xl text-[#0F172A] overflow-hidden"
      >
        {/* Accent Top Border */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${topGradient}`} />

        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-[#0F172A] hover:bg-slate-100 transition disabled:opacity-40"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Themed Icon */}
        <div className="flex flex-col items-center text-center">
          <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto mb-3.5 shadow-sm ${iconContainer}`}>
            {icon || defaultIcon}
          </div>

          <span className="text-[11px] font-extrabold text-[#B48328] uppercase tracking-wider block">
            {subtitle}
          </span>

          <h3 id="confirm-modal-title" className="text-xl font-bold text-[#0F172A] mt-1.5 tracking-tight">
            {title}
          </h3>

          {/* Target Badge / Identity Pill */}
          {badge && (
            <div className="mt-2.5 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#F8FAFC] border border-[#CBD5E1] text-[11px] text-[#475569]">
              {badge.icon}
              <span>
                <strong className="text-[#0F172A] font-semibold">{badge.text}</strong>
                {badge.subtext && <span className="text-[#64748B] ml-1 font-mono text-[10px]">{badge.subtext}</span>}
              </span>
            </div>
          )}

          {/* Main Description */}
          <div id="confirm-modal-desc" className="text-xs text-[#475569] mt-3 leading-relaxed max-w-sm">
            {message}
          </div>

          {/* Reassuring Notice Box (e.g. Data Preservation / Warnings) */}
          {notice && (
            <div
              className={`mt-4 w-full rounded-xl p-3 border flex items-start space-x-2.5 text-left ${
                notice.type === 'safe'
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                  : notice.type === 'warning'
                  ? 'bg-amber-50/80 border-amber-200 text-amber-800'
                  : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#475569]'
              }`}
            >
              {notice.type === 'safe' ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : notice.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 text-[#B48328] shrink-0 mt-0.5" />
              )}
              <div className="text-[11px] leading-relaxed">
                {notice.title && (
                  <strong
                    className={`block font-bold mb-0.5 ${
                      notice.type === 'safe'
                        ? 'text-emerald-950'
                        : notice.type === 'warning'
                        ? 'text-amber-950'
                        : 'text-[#0F172A]'
                    }`}
                  >
                    {notice.title}
                  </strong>
                )}
                <span>{notice.text}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] active:bg-slate-100 text-[#475569] hover:text-[#0F172A] text-xs font-bold transition flex items-center justify-center disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            autoFocus
            className={`w-full sm:flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 disabled:opacity-50 ${confirmBtn}`}
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                {confirmIcon}
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
