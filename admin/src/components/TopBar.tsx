import React from 'react';
import { Menu } from 'lucide-react';

import { AdminTab } from './Sidebar';

interface TopBarProps {
  activeTab: AdminTab;
  onOpenMobileSidebar: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onOpenMobileSidebar,
}) => {
  const getTabTitle = () => {
    switch (activeTab) {
      case 'overview':
        return 'Overview';
      case 'ledger':
        return 'Fees Ledger';
      case 'lawyers':
        return 'Lawyers';
      case 'settings':
        return 'Settings';
      default:
        return 'Chamber Portal';
    }
  };

  const getTabSubtitle = () => {
    switch (activeTab) {
      case 'overview':
        return 'Live revenue collections & financial performance';
      case 'ledger':
        return 'Detailed audit trail and fee collection records';
      case 'lawyers':
        return 'Manage junior lawyers and task assignments';
      case 'settings':
        return 'Notification channels and system configurations';
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
    </header>
  );
};
