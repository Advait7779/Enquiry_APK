import React from 'react';
import { IndianRupee, Calendar, Users, TrendingUp, Briefcase, ArrowUpRight } from 'lucide-react';
import { FeeSummary } from '../types';

interface OverviewTabProps {
  summary: FeeSummary | null;
  loading: boolean;
  onSelectLawyer: (lawyerId: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ summary, loading, onSelectLawyer }) => {
  if (loading && !summary) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-4 border-[#C89B3C] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-[#475569] text-sm font-medium">Loading chamber revenue summary...</p>
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const todayTotal = summary?.todayCollected || 0;
  const monthTotal = summary?.monthCollected || 0;
  const grandTotal = summary?.totalCollected || 0;
  const associates = (summary?.lawyerBreakdown || []).filter((lawyer) => lawyer.lawyerName !== 'General Advocate Desk');
  const lawyersCount = associates.length;

  return (
    <div className="space-y-6">
      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Today's Collection Card */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-[#E2E8F0] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold text-emerald-800 tracking-wider uppercase bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/80">
              TODAY'S FEES
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight break-words">
              {formatCurrency(todayTotal)}
            </div>
            <p className="text-xs text-[#475569] mt-1">Fees collected by lawyers today</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500"></div>
        </div>

        {/* This Month's Collection */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-[#E2E8F0] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold text-[#B48328] tracking-wider uppercase bg-[#FBF4E6] px-2.5 py-1 rounded-md border border-[#C89B3C]/30">
              THIS MONTH
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#FBF4E6] text-[#C89B3C] flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight break-words">
              {formatCurrency(monthTotal)}
            </div>
            <p className="text-xs text-[#475569] mt-1">Current calendar month total</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#C89B3C]"></div>
        </div>

        {/* All-Time Chamber Collection */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-[#E2E8F0] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold text-[#0F1E36] tracking-wider uppercase bg-slate-100 px-2.5 py-1 rounded-md border border-[#CBD5E1]">
              ALL-TIME REVENUE
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#0F1E36]/10 text-[#0F1E36] flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight break-words">
              {formatCurrency(grandTotal)}
            </div>
            <p className="text-xs text-[#475569] mt-1">Cumulative recorded fees</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#0F1E36]"></div>
        </div>

        {/* Junior Lawyers Count */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-[#E2E8F0] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold text-[#475569] tracking-wider uppercase bg-[#F8FAFC] px-2.5 py-1 rounded-md border border-[#E2E8F0]">
              ASSOCIATES
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#F8FAFC] text-[#475569] flex items-center justify-center border border-[#E2E8F0] shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight break-words">
              {lawyersCount} Lawyers
            </div>
            <p className="text-xs text-[#475569] mt-1">{summary?.totalTransactions || 0} Client Fee Records</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#1E293B]"></div>
        </div>
      </div>

      {/* Lawyers Collection & Assigned Work Cards */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#F8FAFC]">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] flex items-center space-x-2">
              <Briefcase className="w-4 h-4 text-[#C89B3C] shrink-0" />
              <span>Junior Lawyers Collection & Assigned Task Performance</span>
            </h2>
            <p className="text-xs text-[#475569] mt-0.5">
              Live fees collected by each junior lawyer on their designated tasks
            </p>
          </div>
        </div>

        <div className="divide-y divide-[#E2E8F0]">
          {associates.length > 0 ? (
            associates.map((lawyer) => {
              const share = grandTotal > 0 ? ((lawyer.totalCollected / grandTotal) * 100).toFixed(1) : '0';
              return (
                <div
                  key={lawyer.lawyerId}
                  className="p-4 sm:p-5 hover:bg-[#F8FAFC] transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Lawyer Info */}
                  <div className="flex items-start space-x-3 sm:space-x-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#0F1E36] text-white border border-[#1E293B] flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                      {lawyer.lawyerName.replace('Adv. ', '').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-[#0F172A] text-sm sm:text-base">{lawyer.lawyerName}</h3>
                        <span className="text-[10px] sm:text-[11px] bg-slate-100 text-[#475569] px-2 py-0.5 rounded-full font-medium">
                          {lawyer.clientCount} {lawyer.clientCount === 1 ? 'client' : 'clients'}
                        </span>
                      </div>

                      {/* Assigned Tasks Tags */}
                      <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                        <span className="text-[11px] text-[#94A3B8] font-medium">Assigned Work:</span>
                        {lawyer.assignedTasks && lawyer.assignedTasks.length > 0 ? (
                          lawyer.assignedTasks.map((task) => (
                            <span
                              key={task}
                              className="text-xs bg-[#FBF4E6] text-[#B48328] border border-[#C89B3C]/30 px-2 py-0.5 rounded-md font-semibold flex items-center space-x-1"
                            >
                              <span>★</span>
                              <span>{task}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-[#94A3B8] italic">General Legal Matters</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial Stats for this Lawyer */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-3 sm:gap-6 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <div className="text-[10px] font-bold uppercase text-[#94A3B8] tracking-wider">TODAY</div>
                      <div className="text-sm sm:text-base font-extrabold text-emerald-600">
                        {formatCurrency(lawyer.todayCollected)}
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-[10px] font-bold uppercase text-[#94A3B8] tracking-wider">TOTAL FEES</div>
                      <div className="text-sm sm:text-base font-extrabold text-[#0F172A]">
                        {formatCurrency(lawyer.totalCollected)}
                      </div>
                      <div className="text-[10px] text-[#475569]">
                        {share}% of chamber
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectLawyer(lawyer.lawyerId)}
                      className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-[#0F1E36] hover:bg-[#0F1E36] hover:text-white text-xs font-bold transition flex items-center space-x-1 shrink-0 shadow-sm ml-auto sm:ml-0"
                    >
                      <span>Ledger</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-[#94A3B8] text-sm">
              No lawyer records found. Add junior lawyers to begin tracking fees.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
