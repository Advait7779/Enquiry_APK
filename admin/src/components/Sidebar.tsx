import React from 'react';
import {
  Scale,
  Users,
  FileSpreadsheet,
  BarChart3,
  Settings,
  LogOut,
  X,
} from 'lucide-react';

export type AdminTab = 'overview' | 'lawyers' | 'ledger' | 'settings';

interface SidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onLogout: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onLogout,
  mobileOpen,
  setMobileOpen,
}) => {
  const navItems = [
    {
      id: 'overview' as const,
      label: 'Overview',
      subtitle: 'Revenue & Analytics',
      icon: BarChart3,
    },
    {
      id: 'ledger' as const,
      label: 'Fees Ledger',
      subtitle: 'Transactions & Audit',
      icon: FileSpreadsheet,
    },
    {
      id: 'lawyers' as const,
      label: 'Lawyers',
      subtitle: 'Team & Tasks',
      icon: Users,
    },
    {
      id: 'settings' as const,
      label: 'Settings',
      subtitle: 'Notifications & Setup',
      icon: Settings,
    },
  ];

  const handleNavClick = (tab: AdminTab) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  React.useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, setMobileOpen]);

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#0A1526]/80 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        aria-label="Chamber Navigation"
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#0F1E36] border-r border-[#1E293B] flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        } no-print`}
      >
        {/* Top: Branding Header */}
        <div className="p-5 border-b border-[#1E293B]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-[#C89B3C]/15 border border-[#C89B3C]/30 flex items-center justify-center text-[#C89B3C] shadow-sm">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] tracking-wider font-extrabold uppercase text-[#C89B3C] block leading-none">
                  LAW CHAMBERS OF
                </span>
                <h1 className="text-base font-extrabold text-white tracking-tight mt-1 leading-snug">
                  Adv. Balasaheb Thopate
                </h1>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E293B]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Middle: Navigation Tabs (Vertical Sidebar) */}
        <div className="flex-1 py-5 px-3 overflow-y-auto space-y-1.5">
          <div className="px-3 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Chamber Management
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full text-left rounded-xl px-3.5 py-3 transition-all flex items-start space-x-3.5 group relative ${
                  isActive
                    ? 'bg-[#1E293B] text-white shadow-md border-l-4 border-[#C89B3C]'
                    : 'text-slate-300 hover:bg-[#1E293B]/60 hover:text-white'
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 transition-colors ${
                    isActive
                      ? 'bg-[#C89B3C]/20 text-[#C89B3C]'
                      : 'bg-[#0A1526] text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm leading-tight ${isActive ? 'font-bold text-white' : 'font-medium'}`}>
                    {item.label}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {item.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom: Sign Out Action */}
        <div className="p-4 border-t border-[#1E293B] bg-[#0A1526]/50">
          <button
            onClick={onLogout}
            aria-label="Sign out of chamber admin"
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 text-xs font-bold text-rose-300 hover:text-rose-200 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/50 rounded-xl transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of Chamber</span>
          </button>
        </div>
      </aside>
    </>
  );
};
