import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  UserPlus,
  Briefcase,
  Plus,
  X,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  User,
} from 'lucide-react';
import { ILawyer } from '../types';
import { adminApi } from '../api';
import { ConfirmModal } from './ConfirmModal';

const COMMON_LEGAL_TASKS = [
  'Leave and Licence Agreement',
  'Property Title Verification & Sale Deed',
  'Civil Court Matters / Injunctions',
  'Bail Matter / High Court Petition',
  'Criminal Defense & Police Station Visit',
  'Matrimonial / Mutual Divorce Counseling',
  'Contract & Commercial Agreement Drafting',
  'Revenue Office / 7/12 Land Record Search',
  'Affidavits & Notary Documentation',
  'General Legal Consultation',
];

interface LawyersTabProps {
  lawyers: ILawyer[];
  onRefresh: () => void;
}

export const LawyersTab: React.FC<LawyersTabProps> = ({ lawyers, onRefresh }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLawyer, setEditingLawyer] = useState<ILawyer | null>(null);

  // Form states for Add / Edit Lawyer
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [customTaskInput, setCustomTaskInput] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [lawyerToDelete, setLawyerToDelete] = useState<ILawyer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const resetForm = () => {
    setName('');
    setUsername('');
    setPassword('');
    setShowPassword(false);
    setPhone('');
    setEmail('');
    setSelectedTasks([]);
    setCustomTaskInput('');
    setFormError('');
    setEditingLawyer(null);
  };

  const openEditModal = (lawyer: ILawyer) => {
    setEditingLawyer(lawyer);
    setName(lawyer.name);
    setUsername(lawyer.username || '');
    setPassword('');
    setShowPassword(false);
    setPhone(lawyer.phone || '');
    setEmail(lawyer.email || '');
    setSelectedTasks(lawyer.assignedTasks || []);
    setFormError('');
    setShowAddModal(true);
  };

  const generatePassword = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    const bytes = new Uint32Array(16);
    window.crypto.getRandomValues(bytes);
    setPassword(`Aa1!${Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('')}`);
    setShowPassword(false);
  };

  useEffect(() => {
    if (!showAddModal) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        resetForm();
        setShowAddModal(false);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [showAddModal, isSubmitting]);

  const toggleTask = (task: string) => {
    if (selectedTasks.includes(task)) {
      setSelectedTasks(selectedTasks.filter((t) => t !== task));
    } else {
      setSelectedTasks([...selectedTasks, task]);
    }
  };

  const addCustomTask = () => {
    const t = customTaskInput.trim();
    if (t && !selectedTasks.includes(t)) {
      setSelectedTasks([...selectedTasks, t]);
      setCustomTaskInput('');
    }
  };

  const handleSaveLawyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Lawyer name is required.');
      return;
    }

    if (!username.trim()) {
      setFormError('Account username is required.');
      return;
    }
    if (!/^[a-zA-Z0-9._-]{3,50}$/.test(username.trim())) {
      setFormError('Username must be 3-50 characters and use only letters, numbers, dots, underscores, or hyphens.');
      return;
    }
    if (!editingLawyer && !password) {
      setFormError('A password is required for a new junior lawyer.');
      return;
    }
    if (password && (password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^a-zA-Z0-9]/.test(password))) {
      setFormError('Password must be at least 10 characters and include uppercase, lowercase, number, and symbol.');
      return;
    }
    if (phone.trim() && !/^\+?[0-9\s()-]{7,30}$/.test(phone.trim())) {
      setFormError('Enter a valid phone number.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      if (editingLawyer) {
        await adminApi.updateLawyer(editingLawyer.id, {
          name: name.trim(),
          username: username.trim() || undefined,
          password: password.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          assignedTasks: selectedTasks,
        });
      } else {
        await adminApi.createLawyer({
          name: name.trim(),
          username: username.trim(),
          password: password,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          assignedTasks: selectedTasks,
        });
      }
      resetForm();
      setShowAddModal(false);
      setStatusMessage(editingLawyer ? 'Junior lawyer updated successfully.' : 'Junior lawyer created successfully.');
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save lawyer details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLawyer = (lawyer: ILawyer) => {
    setLawyerToDelete(lawyer);
  };

  const handleExecuteDelete = async () => {
    if (!lawyerToDelete) return;
    setIsDeleting(true);
    try {
      await adminApi.deleteLawyer(lawyerToDelete.id);
      setStatusMessage(`${lawyerToDelete.name} was deleted successfully.`);
      if (showAddModal) setShowAddModal(false);
      setLawyerToDelete(null);
      onRefresh();
    } catch (err: any) {
      setStatusMessage('');
      setFormError(err.message || 'Failed to delete lawyer');
      setLawyerToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {statusMessage && (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
          {statusMessage}
        </div>
      )}
      {!showAddModal && formError && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
          {formError}
        </div>
      )}
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-[#E2E8F0] shadow-sm">
        <div>
          <h2 className="text-base font-bold text-[#0F172A] flex items-center space-x-2">
            <Briefcase className="w-5 h-5 text-[#C89B3C] shrink-0" />
            <span>Junior Advocates & Mobile Login Management</span>
          </h2>
          <p className="text-xs text-[#475569] mt-0.5">
            Create junior lawyers, set their mobile login username/password, and assign specialized tasks.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-[#0F1E36] hover:bg-[#1E293B] text-white rounded-lg text-xs font-bold transition shadow-sm shrink-0"
        >
          <UserPlus className="w-4 h-4 text-[#C89B3C]" />
          <span>Add Junior Lawyer</span>
        </button>
      </div>

      {/* Lawyers List Cards - Compact & Clean */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {lawyers.map((lawyer) => (
          <div
            key={lawyer.id}
            className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col justify-between transition-all hover:shadow-md"
          >
            <div className="p-4">
              {/* Header: Avatar, Name, Username, Actions */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-full bg-[#0F1E36] text-[#C89B3C] border border-[#1E293B] flex items-center justify-center font-bold text-xs shrink-0 shadow-inner">
                    {lawyer.name.replace('Adv. ', '').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-[#0F172A] leading-snug truncate" title={lawyer.name}>
                      {lawyer.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-mono text-[#0F1E36] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-semibold truncate max-w-[140px]">
                        @{lawyer.username || 'no-login'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center space-x-0.5 shrink-0">
                  <button
                    onClick={() => openEditModal(lawyer)}
                    className="p-1.5 text-slate-400 hover:text-[#0F1E36] hover:bg-slate-100 rounded-lg transition"
                    title="Edit Lawyer & Password"
                    aria-label={`Edit ${lawyer.name}`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteLawyer(lawyer)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Delete Lawyer"
                    aria-label={`Delete ${lawyer.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Assigned Tasks Tags (Compact) */}
              <div className="mt-3 min-h-[32px]">
                <div className="flex flex-wrap gap-1">
                  {lawyer.assignedTasks && lawyer.assignedTasks.length > 0 ? (
                    lawyer.assignedTasks.map((task) => (
                      <span
                        key={task}
                        className="text-[10px] bg-[#FBF4E6] text-[#B48328] border border-[#C89B3C]/30 px-1.5 py-0.5 rounded font-semibold flex items-center space-x-1"
                        title={task}
                      >
                        <span className="text-[9px]">★</span>
                        <span className="truncate max-w-[140px]">{task}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">No assigned work</span>
                  )}
                </div>
              </div>
            </div>

            {/* Compact Footer */}
            <div className="px-3.5 py-2.5 bg-[#F8FAFC] border-t border-[#E2E8F0] rounded-b-xl flex items-center justify-end text-xs">
              <button
                onClick={() => openEditModal(lawyer)}
                className="text-[11px] text-[#0F1E36] font-bold hover:underline flex items-center gap-1"
              >
                <KeyRound className="w-3 h-3 text-[#C89B3C]" />
                <span>Configure →</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {lawyers.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-white px-6 py-12 text-center">
          <Briefcase className="mx-auto mb-3 h-9 w-9 text-[#94A3B8]" />
          <p className="text-sm font-bold text-[#0F172A]">No junior lawyers added yet</p>
          <p className="mt-1 text-xs text-[#475569]">Use “Add Junior Lawyer” to create the first secure mobile account.</p>
        </div>
      )}

      {/* Add / Edit Lawyer Modal */}
      {showAddModal &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-[#0A1526]/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="lawyer-dialog-title" className="bg-white rounded-2xl max-w-4xl w-full p-4 sm:p-7 md:p-8 shadow-2xl border border-[#CBD5E1] text-[#0F172A] max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E2E8F0]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FBF4E6] border border-[#C89B3C]/30 text-[#C89B3C] flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="lawyer-dialog-title" className="text-base font-bold text-[#0F172A]">
                    {editingLawyer ? `Edit Associate: ${editingLawyer.name}` : 'Add New Junior Lawyer'}
                  </h3>
                  <p className="text-[11px] text-[#475569]">
                    Configure lawyer name, login credentials, and assigned tasks
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  resetForm();
                  setShowAddModal(false);
                }}
                className="text-[#94A3B8] hover:text-[#0F172A] p-1.5 rounded-lg hover:bg-slate-100 transition"
                aria-label="Close lawyer form"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="my-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveLawyer} className="flex-1 flex flex-col min-h-0 pt-3">
              <div className="flex-1 overflow-y-auto px-1 sm:px-2 py-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
                  {/* Left Column: Associate Details & Credentials Card */}
                  <div className="p-4 sm:p-5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] space-y-3.5">
                    <div className="flex items-center space-x-2 text-xs font-bold text-[#0F1E36] pb-2 border-b border-[#E2E8F0]">
                      <User className="w-4 h-4 text-[#C89B3C]" />
                      <span>Associate Profile & App Credentials</span>
                    </div>

                    {/* Lawyer Name */}
                    <div>
                      <label htmlFor="lawyer-name" className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1">
                        Advocate Name *
                      </label>
                      <input
                        id="lawyer-name"
                        autoFocus
                        type="text"
                        placeholder="e.g. Adv. Omkar"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (!editingLawyer && !username) {
                            const autoUser = e.target.value.toLowerCase().replace(/^adv\.\s*/i, '').replace(/[^a-z0-9]/g, '');
                            setUsername(autoUser);
                          }
                        }}
                        className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3.5 py-2 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F1E36]"
                        required
                      />
                    </div>

                    {/* Phone & Email in a compact 2-column row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label htmlFor="lawyer-phone" className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1">
                          Phone (Optional)
                        </label>
                        <input
                          id="lawyer-phone"
                          type="tel"
                          placeholder="e.g. 9876543210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F1E36]"
                        />
                      </div>

                      <div>
                        <label htmlFor="lawyer-email" className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1">
                          Email (Optional)
                        </label>
                        <input
                          id="lawyer-email"
                          type="email"
                          placeholder="e.g. omkar@law.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F1E36]"
                        />
                      </div>
                    </div>

                    {/* Login Credentials Sub-Section */}
                    <div className="pt-2 border-t border-[#E2E8F0] space-y-2.5">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-[#0F1E36]">
                        <KeyRound className="w-3.5 h-3.5 text-[#C89B3C]" />
                        <span>Mobile App Login</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* Account Username */}
                        <div>
                          <label htmlFor="lawyer-username" className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
                            Username *
                          </label>
                          <input
                            id="lawyer-username"
                            type="text"
                            placeholder="e.g. omkar"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            maxLength={50}
                            className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs text-[#0F172A] font-mono focus:outline-none focus:ring-2 focus:ring-[#0F1E36]"
                            required
                          />
                          <p className="mt-1 text-[10px] text-[#94A3B8]">3-50 characters: letters, numbers, . _ -</p>
                        </div>

                        {/* Account Password */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label htmlFor="lawyer-password" className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                              {editingLawyer ? 'New Password' : 'Password *'}
                            </label>
                            <button
                              type="button"
                              onClick={generatePassword}
                              className="text-[10px] text-[#C89B3C] hover:text-[#B48328] font-bold flex items-center gap-1"
                              title="Auto-generate password"
                              aria-label="Generate a secure password"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Generate</span>
                            </button>
                          </div>
                          <div className="relative">
                            <input
                              id="lawyer-password"
                              type={showPassword ? 'text' : 'password'}
                              placeholder={editingLawyer ? 'Leave blank to keep' : 'Min 10 chars'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full bg-white border border-[#CBD5E1] rounded-lg pl-3 pr-8 py-1.5 text-xs text-[#0F172A] font-mono focus:outline-none focus:ring-2 focus:ring-[#0F1E36]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2.5 top-2 text-[#94A3B8] hover:text-[#0F172A]"
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-[#94A3B8] leading-tight">
                        Use at least 10 chars (uppercase, lowercase, number, symbol) for mobile login.
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Assigned Work / Domains Card */}
                  <div className="p-4 sm:p-5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                        <div className="flex items-center space-x-2 text-xs font-bold text-[#0F1E36]">
                          <Briefcase className="w-4 h-4 text-[#C89B3C]" />
                          <span>Assigned Work / Domains</span>
                        </div>
                        <span className="text-[11px] bg-[#FBF4E6] text-[#B48328] border border-[#C89B3C]/40 px-2.5 py-0.5 rounded-full font-bold">
                          {selectedTasks.length} Selected
                        </span>
                      </div>
                      <p className="text-[11px] text-[#475569]">
                        Select legal matters this junior lawyer is authorized to handle:
                      </p>

                      <div className="flex flex-wrap gap-1.5 max-h-[195px] overflow-y-auto pr-1">
                        {COMMON_LEGAL_TASKS.map((task) => {
                          const isSelected = selectedTasks.includes(task);
                          return (
                            <button
                              type="button"
                              key={task}
                              onClick={() => toggleTask(task)}
                              aria-pressed={isSelected}
                              className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold flex items-center space-x-1.5 transition text-left ${
                                isSelected
                                  ? 'bg-[#FBF4E6] text-[#B48328] border-[#C89B3C] shadow-sm'
                                  : 'bg-white text-[#475569] border-[#CBD5E1] hover:border-[#94A3B8]'
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#C89B3C] shrink-0" />}
                              <span>{task}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Add Custom Task Input */}
                    <div className="pt-2.5 border-t border-[#E2E8F0]">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add custom legal task..."
                          value={customTaskInput}
                          onChange={(e) => setCustomTaskInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addCustomTask();
                            }
                          }}
                          className="flex-1 bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F1E36]"
                        />
                        <button
                          type="button"
                          onClick={addCustomTask}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-[#CBD5E1] text-[#0F172A] rounded-lg text-xs font-bold flex items-center space-x-1 transition shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Tag</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Pinned at Bottom */}
              <div className="pt-4 mt-2.5 border-t border-[#E2E8F0] flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 shrink-0 bg-white">
                {editingLawyer ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteLawyer(editingLawyer)}
                    className="w-full sm:w-auto text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center justify-center space-x-1.5 py-2 sm:py-1.5 px-3 rounded-lg hover:bg-rose-50 transition border border-rose-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Associate</span>
                  </button>
                ) : <div className="hidden sm:block" />}

                <div className="flex items-center space-x-2.5 sm:space-x-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setShowAddModal(false);
                    }}
                    className="flex-1 sm:flex-initial px-4 py-2 border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC] rounded-lg text-xs font-semibold transition text-center justify-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-initial px-5 py-2 bg-[#0F1E36] hover:bg-[#1E293B] text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50 text-center justify-center"
                  >
                    {isSubmitting ? 'Saving...' : editingLawyer ? 'Update Associate' : 'Create Associate'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Themed Confirmation Modal */}
      <ConfirmModal
        isOpen={lawyerToDelete !== null}
        onCancel={() => {
          if (!isDeleting) setLawyerToDelete(null);
        }}
        onConfirm={handleExecuteDelete}
        isLoading={isDeleting}
        variant="danger"
        title="Permanently Delete Associate?"
        subtitle="JUNIOR ADVOCATE MANAGEMENT"
        badge={
          lawyerToDelete
            ? {
                text: lawyerToDelete.name,
                subtext: lawyerToDelete.username ? `@${lawyerToDelete.username}` : undefined,
              }
            : undefined
        }
        message={
          lawyerToDelete ? (
            <span>
              Are you sure you want to permanently delete{' '}
              <strong className="text-[#0F172A] font-bold">{lawyerToDelete.name}</strong>? Their mobile
              login access will be removed immediately.
            </span>
          ) : ''
        }
        notice={{
          type: 'safe',
          title: 'Data Preserved Safely',
          text: 'All past client consultations, fee records, and assignment history will be safely preserved in chamber records.',
        }}
        confirmText="Delete Associate"
        cancelText="Cancel"
      />
    </div>
  );
};
