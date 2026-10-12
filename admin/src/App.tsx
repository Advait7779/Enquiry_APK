import { useEffect, useState, useCallback } from 'react';
import { Sidebar, AdminTab } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { OverviewTab } from './components/OverviewTab';
import { LawyersTab } from './components/LawyersTab';
import { LedgerTab } from './components/LedgerTab';
import { SettingsTab } from './components/SettingsTab';
import { LoginModal } from './components/LoginModal';
import { LogoutConfirmModal } from './components/LogoutConfirmModal';
import { adminApi } from './api';
import { FeeSummary, ILawyer } from './types';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  const [summary, setSummary] = useState<FeeSummary | null>(null);
  const [lawyers, setLawyers] = useState<ILawyer[]>([]);
  const [selectedLawyerId, setSelectedLawyerId] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

  // Check existing session
  useEffect(() => {
    adminApi.validateSession().then((valid) => {
      setIsAuthenticated(valid);
      setCheckingAuth(false);
    });
  }, []);

  useEffect(() => {
    const handleExpired = () => setIsAuthenticated(false);
    window.addEventListener('admin-auth-expired', handleExpired);
    return () => window.removeEventListener('admin-auth-expired', handleExpired);
  }, []);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    setLoadError('');
    try {
      const [sum, law] = await Promise.all([
        adminApi.getFeesSummary(),
        adminApi.getLawyers(),
      ]);
      setSummary(sum);
      setLawyers(law);
    } catch (error: any) {
      setLoadError(error.message || 'Could not refresh chamber data.');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey((current) => current + 1);
    loadData(false);
  }, [loadData]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      const interval = setInterval(() => loadData(true), 15000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, loadData]);

  const handleSelectLawyerForLedger = (lawyerId: string) => {
    setSelectedLawyerId(lawyerId);
    setActiveTab('ledger');
  };

  const handleRequestLogout = () => {
    setMobileSidebarOpen(false);
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    adminApi.clearToken();
    setIsAuthenticated(false);
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0A1526] flex items-center justify-center text-white">
        <div className="w-8 h-8 border-4 border-[#C89B3C] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] font-sans text-[#0F172A] flex">
      {/* Left Sidebar (fixed on desktop, slideout on mobile) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        onLogout={handleRequestLogout}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      {/* Main Content Area (offset by sidebar width on large screens) */}
      <div className="admin-main flex-1 flex flex-col min-h-screen lg:pl-72 transition-all">
        {/* Top Content Bar */}
        <TopBar
          activeTab={activeTab}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Tab Body */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          {loadError && (
            <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
              {loadError}
            </div>
          )}
          {activeTab === 'overview' && (
            <OverviewTab
              summary={summary}
              loading={isRefreshing && !summary}
              onSelectLawyer={handleSelectLawyerForLedger}
            />
          )}

          {activeTab === 'ledger' && (
            <LedgerTab
              lawyers={lawyers}
              selectedLawyerId={selectedLawyerId}
              onClearSelectedLawyer={() => setSelectedLawyerId('')}
              refreshKey={refreshKey}
            />
          )}

          {activeTab === 'lawyers' && (
            <LawyersTab
              lawyers={lawyers}
              onRefresh={handleRefresh}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab />
          )}
        </main>

        {/* Footer */}
        <footer className="no-print bg-white border-t border-[#E2E8F0] py-4 text-center text-xs text-[#475569]">
          <p>
            Law Offices of <strong className="text-[#0F1E36]">Adv. Balasaheb Thopate</strong> • Dedicated Chamber Admin & Revenue Management System
          </p>
        </footer>
      </div>

      {/* Login Authentication Modal */}
      <LoginModal
        isOpen={!isAuthenticated}
        onSuccess={() => {
          setIsAuthenticated(true);
          loadData();
        }}
      />

      {/* Sign Out Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
      />
    </div>
  );
}

export default App;
