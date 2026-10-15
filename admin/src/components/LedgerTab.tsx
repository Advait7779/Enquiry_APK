import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  Clock,
  Briefcase,
  User,
  ChevronDown,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { FeeTransaction, ILawyer } from '../types';
import { adminApi, LedgerFilters } from '../api';
import { createLedgerFilters, LedgerPeriod } from '../utils/ledgerFilters';

interface LedgerTabProps {
  lawyers: ILawyer[];
  selectedLawyerId?: string;
  onClearSelectedLawyer?: () => void;
  refreshKey?: number;
}

export const LedgerTab: React.FC<LedgerTabProps> = ({
  lawyers,
  selectedLawyerId = '',
  onClearSelectedLawyer,
  refreshKey = 0,
}) => {
  const [transactions, setTransactions] = useState<FeeTransaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalFees, setTotalFees] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printRows, setPrintRows] = useState<FeeTransaction[] | null>(null);
  const [totalPages, setTotalPages] = useState(1);

  // Custom themed lawyer dropdown state
  const [lawyerDropdownOpen, setLawyerDropdownOpen] = useState(false);
  const lawyerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (lawyerDropdownRef.current && !lawyerDropdownRef.current.contains(e.target as Node)) {
        setLawyerDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLawyerDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Filters state
  const [periodPreset, setPeriodPreset] = useState<LedgerPeriod>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeLawyerId, setActiveLawyerId] = useState(selectedLawyerId);
  const [taskFilter, setTaskFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const handlePageSizeChange = (newSize: number) => {
    if (pageSize === newSize) return;
    setPageSize(newSize);
    setPage(1);
  };

  const getPaginationItems = (currentPage: number, total: number): (number | 'ellipsis-prev' | 'ellipsis-next')[] => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, 'ellipsis-next', total];
    }
    if (currentPage >= total - 3) {
      return [1, 'ellipsis-prev', total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, 'ellipsis-prev', currentPage - 1, currentPage, currentPage + 1, 'ellipsis-next', total];
  };

  useEffect(() => {
    if (selectedLawyerId) {
      setActiveLawyerId(selectedLawyerId);
      setPeriodPreset('all');
    }
  }, [selectedLawyerId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const buildFilters = useCallback((includePagination: boolean): LedgerFilters => {
    return createLedgerFilters({
      period: periodPreset,
      startDate,
      endDate,
      lawyerId: activeLawyerId,
      purpose: taskFilter,
      search: debouncedSearch,
      page,
      pageSize,
      includePagination,
    });
  }, [activeLawyerId, taskFilter, debouncedSearch, page, pageSize, periodPreset, startDate, endDate]);

  const loadLedger = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await adminApi.getFeesLedger(buildFilters(true));
      setTransactions(res.items);
      setTotalCount(res.total);
      setTotalFees(res.totalFees);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      setLoadError(err.message || 'Could not load the fees ledger.');
    } finally {
      setLoading(false);
    }
  }, [buildFilters, refreshKey]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handleExportCsv = async () => {
    setExporting(true);
    setLoadError('');
    try {
      await adminApi.downloadFeesCsv(buildFilters(false));
    } catch (err: any) {
      setLoadError(err.message || 'Could not export the fees ledger.');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (printRows === null) return;
    const finishPrint = () => setPrintRows(null);
    window.addEventListener('afterprint', finishPrint);
    const timer = window.setTimeout(() => window.print(), 100);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', finishPrint);
    };
  }, [printRows]);

  const handlePrint = async () => {
    setPrinting(true);
    setLoadError('');
    try {
      const filters = buildFilters(false);
      const rows: FeeTransaction[] = [];
      let nextPage = 1;
      while (true) {
        const result = await adminApi.getFeesLedger({ ...filters, page: nextPage, pageSize: 200 });
        rows.push(...result.items);
        if (rows.length >= result.total) break;
        if (result.items.length === 0) throw new Error('The full ledger could not be loaded for printing.');
        nextPage += 1;
      }
      setPrintRows(rows);
    } catch (err: any) {
      setLoadError(err.message || 'Could not prepare the full ledger for printing.');
    } finally {
      setPrinting(false);
    }
  };

  const displayedTransactions = printRows ?? transactions;

  const selectedLawyerObj = lawyers.find((l) => l.id === activeLawyerId);

  return (
    <div className="space-y-5">
      {/* Title & Stats Ribbon */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-[#0F172A] flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-[#C89B3C] shrink-0" />
              <span>Day, Date & Time Fees Collection Ledger</span>
            </h2>
            {activeLawyerId && selectedLawyerObj && (
              <span className="text-xs bg-[#FBF4E6] text-[#B48328] font-bold px-2.5 py-0.5 rounded-full border border-[#C89B3C]/40">
                Filtered: {selectedLawyerObj.name}
              </span>
            )}
          </div>
          <p className="text-xs text-[#475569] mt-1">
            Complete audit trail showing which lawyer collected what fee on which task, stamped with exact day, date, and time.
          </p>
        </div>

        {/* Filter Summary Badge & Export */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between sm:justify-end gap-2.5 w-full md:w-auto">
          {/* Green Total Badge - Same height as Export CSV button (h-10) */}
          <div className="h-10 px-3.5 rounded-lg bg-emerald-50 border border-emerald-300/80 flex items-center justify-between sm:justify-start space-x-2.5 text-emerald-900 shadow-sm w-full sm:w-auto shrink-0">
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                COLLECTED TOTAL:
              </span>
              <span className="text-base font-black text-emerald-700 font-mono tracking-tight">
                {formatCurrency(totalFees)}
              </span>
            </div>
            <div className="h-4 w-px bg-emerald-300/80 hidden sm:block"></div>
            <span className="text-[11px] text-emerald-700 font-semibold hidden sm:inline">
              {totalCount} {totalCount === 1 ? 'consultation' : 'consultations'}
            </span>
          </div>

          <div className="no-print flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={handleExportCsv}
              disabled={exporting}
              className="h-10 flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 text-xs font-bold text-white bg-[#0F1E36] hover:bg-[#1E293B] px-3.5 rounded-lg transition shadow-sm shrink-0"
              title="Download filtered transactions as Excel / CSV"
            >
              <Download className="w-4 h-4 text-[#C89B3C]" />
              <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={printing || loading || totalCount === 0}
              className="h-10 flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 text-xs font-bold text-[#0F1E36] bg-[#F8FAFC] hover:bg-slate-200 border border-[#CBD5E1] px-3.5 rounded-lg transition shrink-0"
              title="Print official chamber fee report"
            >
              <Printer className="w-4 h-4 text-[#475569]" />
              <span>{printing ? 'Preparing...' : 'Print'}</span>
            </button>
          </div>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="no-print rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
          {loadError}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="no-print bg-white rounded-xl border border-[#E2E8F0] p-3.5 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center gap-3">
          {/* Preset Period Buttons */}
          <div className="flex items-center space-x-1 bg-[#F4F6F9] p-1 rounded-lg text-xs font-semibold border border-[#E2E8F0] overflow-x-auto max-w-full">
            <button
              onClick={() => {
                setPeriodPreset('all');
                setPage(1);
              }}
              className={`whitespace-nowrap px-3 py-1.5 rounded-md transition shrink-0 ${
                periodPreset === 'all' ? 'bg-[#0F1E36] text-white shadow-sm font-bold' : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => {
                setPeriodPreset('today');
                setPage(1);
              }}
              className={`whitespace-nowrap px-3 py-1.5 rounded-md transition shrink-0 ${
                periodPreset === 'today' ? 'bg-[#0F1E36] text-white shadow-sm font-bold' : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => {
                setPeriodPreset('yesterday');
                setPage(1);
              }}
              className={`whitespace-nowrap px-3 py-1.5 rounded-md transition shrink-0 ${
                periodPreset === 'yesterday' ? 'bg-[#0F1E36] text-white shadow-sm font-bold' : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => {
                setPeriodPreset('month');
                setPage(1);
              }}
              className={`whitespace-nowrap px-3 py-1.5 rounded-md transition shrink-0 ${
                periodPreset === 'month' ? 'bg-[#0F1E36] text-white shadow-sm font-bold' : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => {
                setPeriodPreset('custom');
                setPage(1);
              }}
              className={`whitespace-nowrap px-3 py-1.5 rounded-md transition shrink-0 ${
                periodPreset === 'custom' ? 'bg-[#0F1E36] text-white shadow-sm font-bold' : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              Custom Date
            </button>
          </div>

          {/* Filter Controls Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 w-full">
            {/* Themed Lawyer Filter Dropdown */}
            <div className="flex items-center space-x-1.5 w-full sm:w-auto">
              <label className="text-xs font-bold text-[#475569] flex items-center space-x-1 shrink-0">
                <User className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span className="hidden sm:inline">Lawyer:</span>
              </label>

              <div ref={lawyerDropdownRef} className="relative flex-1 sm:flex-initial w-full sm:min-w-[165px]">
                <button
                  type="button"
                  onClick={() => setLawyerDropdownOpen((prev) => !prev)}
                  aria-haspopup="listbox"
                  aria-expanded={lawyerDropdownOpen}
                  className="w-full text-xs font-semibold border border-[#CBD5E1] hover:border-[#C89B3C] rounded-lg px-2.5 py-1.5 bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F1E36] flex items-center justify-between gap-1.5 transition shadow-sm"
                >
                  <div className="flex items-center space-x-1.5 truncate">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeLawyerId ? 'bg-[#C89B3C]' : 'bg-slate-300'}`}></span>
                    <span className="truncate">{selectedLawyerObj ? selectedLawyerObj.name : 'All Junior Lawyers'}</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#C89B3C] shrink-0 transition-transform duration-200 ${lawyerDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Custom Themed Options Dropdown Menu - Reduced Width */}
                {lawyerDropdownOpen && (
                  <div
                    role="listbox"
                    className="absolute left-0 top-full mt-1 w-full sm:w-56 z-50 bg-[#0F1E36] border border-[#1E293B] rounded-xl shadow-2xl p-1 text-xs text-white"
                  >
                    <div className="px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-[#C89B3C] border-b border-[#1E293B] flex items-center justify-between">
                      <span>Associates</span>
                      <span className="text-[9px] text-slate-400 font-normal">{lawyers.length} active</span>
                    </div>

                    <div className="py-0.5 max-h-64 overflow-y-auto space-y-0.5">
                      {/* All Junior Lawyers */}
                      <button
                        type="button"
                        role="option"
                        aria-selected={!activeLawyerId}
                        onClick={() => {
                          setActiveLawyerId('');
                          setPage(1);
                          if (onClearSelectedLawyer) onClearSelectedLawyer();
                          setLawyerDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                          !activeLawyerId
                            ? 'bg-[#1E293B] text-[#C89B3C] font-bold shadow-sm'
                            : 'text-slate-300 hover:bg-[#1E293B]/70 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 truncate">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${!activeLawyerId ? 'bg-[#C89B3C]' : 'bg-slate-500'}`}></span>
                          <span className="truncate text-[11px]">All Junior Lawyers</span>
                        </div>
                        {!activeLawyerId && <Check className="w-3 h-3 text-[#C89B3C] shrink-0" />}
                      </button>

                      {/* Each Junior Lawyer */}
                      {lawyers.map((l) => {
                        const isSelected = activeLawyerId === l.id;
                        return (
                          <button
                            key={l.id}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              setActiveLawyerId(l.id);
                              setPage(1);
                              setLawyerDropdownOpen(false);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                              isSelected
                                ? 'bg-[#1E293B] text-[#C89B3C] font-bold shadow-sm'
                                : 'text-slate-300 hover:bg-[#1E293B]/70 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center space-x-1.5 truncate">
                              <div className="w-4 h-4 rounded-full bg-[#0A1526] border border-[#1E293B] text-[8px] font-bold flex items-center justify-center text-slate-300 shrink-0">
                                {l.name.replace('Adv. ', '').slice(0, 2).toUpperCase()}
                              </div>
                              <span className="truncate text-[11px]">{l.name}</span>
                            </div>
                            {isSelected && <Check className="w-3 h-3 text-[#C89B3C] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Task / Work Filter Dropdown */}
            <div className="flex items-center space-x-1.5 w-full sm:w-auto sm:min-w-[140px]">
              <label className="text-xs font-bold text-[#475569] flex items-center space-x-1 shrink-0">
                <Briefcase className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span className="hidden sm:inline">Task:</span>
              </label>
              <input
                type="text"
                placeholder="Filter task/domain..."
                value={taskFilter}
                onChange={(e) => {
                  setTaskFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F1E36]"
              />
            </div>

            {/* Search bar */}
            <div className="relative flex-1 w-full sm:min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search client name or phone..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs pl-8 pr-3 py-1.5 border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F1E36]"
              />
            </div>
          </div>
        </div>

        {/* Custom Date Range Picker when selected */}
        {periodPreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-[#E2E8F0] text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-[#0F172A]">From Date:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-[#CBD5E1] rounded-md px-2 py-1 text-[#0F172A] text-xs"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-[#0F172A]">To Date:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-[#CBD5E1] rounded-md px-2 py-1 text-[#0F172A] text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        {/* Table Top Header: Audit Trail Title + Top-Right Pagination Controls */}
        <div className="no-print px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Audit Trail Records</span>
            {totalCount > 0 && (
              <span className="bg-[#E2E8F0] text-[#334155] text-[11px] font-bold px-2 py-0.5 rounded-full">
                {totalCount} total
              </span>
            )}
          </div>

          {/* Right Top Pagination Controls */}
          <div className="flex items-center space-x-3 ml-auto">
            {/* Page Size Dropdown */}
            <div className="flex items-center space-x-1.5 text-xs text-[#475569]">
              <label htmlFor="ledger-rows-per-page" className="font-semibold text-[11px] text-[#475569]">
                Rows per page:
              </label>
              <div className="relative inline-flex items-center">
                <select
                  id="ledger-rows-per-page"
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="appearance-none bg-white border border-[#CBD5E1] hover:border-[#0F1E36] focus:border-[#0F1E36] text-[#0F172A] text-xs font-bold rounded-lg pl-3 pr-7 py-1 focus:outline-none focus:ring-2 focus:ring-[#0F1E36]/20 shadow-xs cursor-pointer transition"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#64748B] pointer-events-none absolute right-2" />
              </div>
            </div>

            {/* Quick Page Jump Arrows */}
            {totalPages > 1 && (
              <div className="flex items-center space-x-1 text-xs text-[#475569] border-l border-[#CBD5E1] pl-3">
                <span className="font-bold text-[11px] text-[#0F172A] min-w-[44px] text-center">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  title="Previous Page"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1 rounded-md border border-[#CBD5E1] bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-[#0F1E36]" />
                </button>
                <button
                  type="button"
                  title="Next Page"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1 rounded-md border border-[#CBD5E1] bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#0F1E36]" />
                </button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="w-7 h-7 border-4 border-[#C89B3C] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-[#475569] text-xs font-medium">Fetching day/date/time ledger records...</p>
          </div>
        ) : displayedTransactions.length === 0 ? (
          <div className="py-16 text-center text-[#94A3B8]">
            <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 opacity-40 text-[#0F1E36]" />
            <p className="text-sm font-bold text-[#0F172A]">No fee records found for this filter.</p>
            <p className="text-xs text-[#475569] mt-1">Try changing the date filter or selecting a different lawyer.</p>
          </div>
        ) : (
          <div>
            <div className="lg:hidden px-4 py-2 bg-slate-50 border-b border-[#E2E8F0] text-[11px] text-[#64748B] flex items-center justify-between">
              <span>Fees Ledger Audit Trail</span>
              <span className="text-[#C89B3C] font-bold">⇄ Swipe horizontally</span>
            </div>
            <div className="ledger-table-scroll overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[760px]">
              <thead className="bg-[#0F1E36] text-white font-semibold border-b border-[#1E293B] uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Day & Date</th>
                  <th className="py-3 px-3">Time</th>
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4">Legal Work / Task</th>
                  <th className="py-3 px-4">Assigned Lawyer</th>
                  <th className="py-3 px-4 text-right">Fees Received (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] font-medium">
                {displayedTransactions.map((tx, idx) => (
                  <tr
                    key={tx.id}
                    className={`hover:bg-[#F8FAFC] transition ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]/50'}`}
                  >
                    {/* Day & Date */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-[#0F172A]">{tx.date}</div>
                      <div className="text-[11px] text-[#B48328] font-bold">{tx.day}</div>
                    </td>

                    {/* Time */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center space-x-1 text-[#475569] font-mono">
                        <Clock className="w-3 h-3 text-[#94A3B8]" />
                        <span>{tx.time}</span>
                      </div>
                    </td>

                    {/* Client Name */}
                    <td className="py-3 px-4 whitespace-nowrap font-bold text-[#0F172A] text-sm">
                      {tx.clientName}
                    </td>

                    {/* Work / Task Done */}
                    <td className="py-3 px-4">
                      <span className="inline-block bg-[#FBF4E6] text-[#B48328] border border-[#C89B3C]/30 font-semibold px-2 py-0.5 rounded-md text-[11px]">
                        {tx.task}
                      </span>
                    </td>

                    {/* Assigned Lawyer */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-[#0F172A] flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#C89B3C]"></span>
                        <span>{tx.assignedAdvocate}</span>
                      </span>
                    </td>

                    {/* Fees Collected */}
                    <td className="py-3 px-4 whitespace-nowrap text-right font-mono font-black text-sm text-emerald-700">
                      {formatCurrency(tx.feesPaid)}
                    </td>

                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#F8FAFC] border-t-2 border-[#CBD5E1] font-bold text-[#0F172A]">
                <tr>
                  <td colSpan={5} className="py-3.5 px-4 text-right uppercase tracking-wider text-xs">
                    Total Fees Received for Selected View:
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-base font-black text-emerald-700">
                    {formatCurrency(totalFees)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>

      {!loading && totalCount > 0 && (
        <div className="no-print flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-xs shadow-sm">
          {/* Summary / Range text */}
          <div className="text-[#475569] font-medium text-center sm:text-left">
            Showing <span className="font-bold text-[#0F172A]">{(page - 1) * pageSize + 1}</span> to{' '}
            <span className="font-bold text-[#0F172A]">{Math.min(page * pageSize, totalCount)}</span> of{' '}
            <span className="font-bold text-[#0F172A]">{totalCount}</span> records · Page{' '}
            <span className="font-bold text-[#0F172A]">{page}</span> of{' '}
            <span className="font-bold text-[#0F172A]">{totalPages}</span>
          </div>

          {/* Navigation Controls: Multi-page jump arrows, single-page arrows, numbered pages */}
          <div className="flex items-center flex-wrap justify-center gap-1">
            {/* First Page (<<) */}
            <button
              type="button"
              onClick={() => setPage(1)}
              disabled={page <= 1}
              title="First Page"
              className="h-8 min-w-[32px] px-2 rounded-lg border border-[#CBD5E1] bg-white font-bold text-[#0F1E36] hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center justify-center shadow-xs"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Return Multiple (-5) Pages */}
            {totalPages > 5 && (
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 5))}
                disabled={page <= 1}
                title="Return 5 pages"
                className="h-8 px-2 rounded-lg border border-[#CBD5E1] bg-white font-extrabold text-[#0F1E36] hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition text-[11px] shadow-xs"
              >
                -5
              </button>
            )}

            {/* Previous Page (<) */}
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              title="Previous Page"
              className="h-8 min-w-[32px] px-2 rounded-lg border border-[#CBD5E1] bg-white font-bold text-[#0F1E36] hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center justify-center shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Numbered Page Buttons with Ellipsis */}
            <div className="flex items-center gap-1 mx-0.5">
              {getPaginationItems(page, totalPages).map((item, idx) => {
                if (item === 'ellipsis-prev') {
                  return (
                    <button
                      key={`ell-prev-${idx}`}
                      type="button"
                      onClick={() => setPage((current) => Math.max(1, current - 5))}
                      title="Jump back 5 pages"
                      className="h-8 min-w-[32px] px-2 rounded-lg border border-transparent hover:border-[#CBD5E1] bg-transparent hover:bg-slate-100 font-bold text-[#64748B] hover:text-[#0F1E36] transition flex items-center justify-center text-xs"
                    >
                      ...
                    </button>
                  );
                }
                if (item === 'ellipsis-next') {
                  return (
                    <button
                      key={`ell-next-${idx}`}
                      type="button"
                      onClick={() => setPage((current) => Math.min(totalPages, current + 5))}
                      title="Jump forward 5 pages"
                      className="h-8 min-w-[32px] px-2 rounded-lg border border-transparent hover:border-[#CBD5E1] bg-transparent hover:bg-slate-100 font-bold text-[#64748B] hover:text-[#0F1E36] transition flex items-center justify-center text-xs"
                    >
                      ...
                    </button>
                  );
                }
                const isCurrent = item === page;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                    className={`h-8 min-w-[32px] px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center shadow-xs ${
                      isCurrent
                        ? 'bg-[#0F1E36] text-white border border-[#0F1E36] shadow-sm'
                        : 'border border-[#CBD5E1] bg-white text-[#334155] hover:bg-slate-100 hover:text-[#0F172A]'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            {/* Next Page (>) */}
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
              title="Next Page"
              className="h-8 min-w-[32px] px-2 rounded-lg border border-[#CBD5E1] bg-white font-bold text-[#0F1E36] hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center justify-center shadow-xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Advance Multiple (+5) Pages */}
            {totalPages > 5 && (
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 5))}
                disabled={page >= totalPages}
                title="Forward 5 pages"
                className="h-8 px-2 rounded-lg border border-[#CBD5E1] bg-white font-extrabold text-[#0F1E36] hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition text-[11px] shadow-xs"
              >
                +5
              </button>
            )}

            {/* Last Page (>>) */}
            <button
              type="button"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              title="Last Page"
              className="h-8 min-w-[32px] px-2 rounded-lg border border-[#CBD5E1] bg-white font-bold text-[#0F1E36] hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center justify-center shadow-xs"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
