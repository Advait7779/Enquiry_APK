import React from 'react';
import { Menu, RefreshCw, ShieldCheck } from 'lucide-react';
import { adminApi } from '../api';

import { AdminTab } from './Sidebar';

interface TopBarProps {
  activeTab: AdminTab;
  onOpenMobileSidebar: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onOpenMobileSidebar,
  onRefresh,
  isRefreshing,
}) => {
  const getTabTitle = () => {
    switch (activeTab) {
      case 'overview':
        return 'Revenue & Overview';
      case 'ledger':
        return 'Day / Date / Time Fees Ledger';
      case 'lawyers':
        return 'Junior Lawyers & Task Assignments';
      case 'settings':
        return 'Settings & Integrations';
      default:
        return 'Chamber Portal';
    }
  };

  const getTabSubtitle = () => {
    switch (activeTab) {
      case 'overview':
        return "Live fees collections & junior advocate financial performance";
      case 'ledger':
        return 'Complete chronological audit trail with date, day, time, and lawyer breakdown';
      case 'lawyers':
        return 'Manage junior advocates and assign specialized legal tasks / domains';
      case 'settings':
        return 'Configure SMS, RCS, WhatsApp, and Voice Call notification gateways';
      default:
        return '';
    }
  };

  return (
    <header className="no-print bg-white/95 backdrop-blur-sm border-b border-[#E2E8F0] sticky top-0 z-30 px-3 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex items-center justify-between gap-3 shadow-sm">
      {/* Left: Mobile Menu Toggle + Breadcrumb / Title */}
      <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0 flex-1">
        <button
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation"
          className="lg:hidden p-2 rounded-lg text-[#0F172A] hover:bg-[#F4F6F9] border border-[#CBD5E1] shrink-0"
        >
          <Menu className="w-5 h-5 text-[#0F1E36]" />
        </button>

        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A] tracking-tight truncate">
            {getTabTitle()}
          </h2>
          <p className="text-xs text-[#475569] hidden sm:block truncate">
            {getTabSubtitle()}
          </p>
        </div>
      </div>

      {/* Right: Quick Status & Refresh */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#F4F6F9] border border-[#E2E8F0] text-xs font-semibold text-[#475569]">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>{adminApi.getUsername()} (Admin)</span>
        </div>

        <button
          onClick={onRefresh}
          aria-label="Refresh current chamber data"
          disabled={isRefreshing}
          className="flex items-center justify-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#0F1E36] hover:bg-[#1E293B] text-white text-xs font-bold transition shadow-sm"
          title="Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#C89B3C]' : ''}`} />
          <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
        </button>
      </div>
    </header>
  );
};
