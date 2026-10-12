import { LedgerFilters } from '../api';

export type LedgerPeriod = 'today' | 'yesterday' | 'month' | 'year' | 'all' | 'custom';

export function createLedgerFilters(options: {
  period: LedgerPeriod;
  startDate: string;
  endDate: string;
  lawyerId: string;
  purpose: string;
  search: string;
  page: number;
  pageSize: number;
  includePagination: boolean;
}): LedgerFilters {
  const filters: LedgerFilters = {
    ...(options.lawyerId ? { lawyerId: options.lawyerId } : {}),
    ...(options.purpose.trim() ? { purpose: options.purpose.trim() } : {}),
    ...(options.search.trim() ? { search: options.search.trim() } : {}),
    ...(options.includePagination ? { page: options.page, pageSize: options.pageSize } : {}),
  };
  if (options.period === 'today' || options.period === 'yesterday' || options.period === 'month' || options.period === 'year') {
    filters.period = options.period;
  } else if (options.period === 'custom' && options.startDate && options.endDate) {
    filters.from = options.startDate;
    filters.to = options.endDate;
  }
  return filters;
}
